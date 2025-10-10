# PayMyDine Deployment Guide

**Last Updated:** 2025-10-09  
**Version:** 1.0  

---

## Overview

This guide provides production-ready deployment configurations for PayMyDine using:
- **Docker Compose** for containerization
- **Caddy** for reverse proxy + automatic TLS
- **MySQL 8.0** for database
- **Redis** for caching + rate limiting
- **Let's Encrypt** for SSL certificates

---

## Architecture Diagram

```
Internet
    ↓
Cloudflare (CDN + DDoS Protection)
    ↓
Caddy (Reverse Proxy + TLS Termination)
    ├─→ Next.js Frontend (Port 3000)
    ├─→ Laravel Backend (Port 8000)
    └─→ PHP-FPM (Port 9000)
    ↓
    ├─→ MySQL (Port 3306)
    ├─→ Redis (Port 6379)
    └─→ Storage (Volumes)
```

---

## Prerequisites

### 1. Server Requirements

**Minimum (Development):**
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disk:** 20 GB SSD
- **OS:** Ubuntu 22.04 LTS

**Recommended (Production):**
- **CPU:** 4+ cores
- **RAM:** 8+ GB
- **Disk:** 100+ GB SSD
- **OS:** Ubuntu 22.04 LTS

---

### 2. Domain Setup

1. **Purchase domain:** paymydine.com
2. **DNS records:**
   ```
   A    @             → YOUR_SERVER_IP
   A    *             → YOUR_SERVER_IP (wildcard for tenants)
   AAAA @             → YOUR_SERVER_IPv6 (optional)
   CNAME www          → paymydine.com
   ```
3. **Cloudflare setup** (recommended):
   - Add site to Cloudflare
   - Enable proxy (orange cloud)
   - Set SSL/TLS mode to "Full (strict)"

---

### 3. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

---

## Docker Compose Configuration

### File: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Caddy - Reverse Proxy + TLS
  caddy:
    image: caddy:2-alpine
    container_name: paymydine_caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - paymydine_network
    depends_on:
      - laravel
      - nextjs

  # Next.js Frontend
  nextjs:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: paymydine_nextjs
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.paymydine.com
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - NEXT_PUBLIC_PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID}
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    networks:
      - paymydine_network
    depends_on:
      - laravel

  # Laravel Backend
  laravel:
    build:
      context: .
      dockerfile: Dockerfile.laravel
    container_name: paymydine_laravel
    restart: unless-stopped
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - APP_KEY=${APP_KEY}
      - DB_CONNECTION=mysql
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_DATABASE=paymydine
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - REDIS_PORT=6379
      - CACHE_DRIVER=redis
      - SESSION_DRIVER=redis
      - QUEUE_CONNECTION=redis
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    volumes:
      - ./:/var/www/html
      - ./storage:/var/www/html/storage
      - ./bootstrap/cache:/var/www/html/bootstrap/cache
    networks:
      - paymydine_network
    depends_on:
      - mysql
      - redis

  # PHP-FPM
  php-fpm:
    build:
      context: .
      dockerfile: Dockerfile.php-fpm
    container_name: paymydine_php_fpm
    restart: unless-stopped
    volumes:
      - ./:/var/www/html
    networks:
      - paymydine_network
    depends_on:
      - mysql

  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: paymydine_mysql
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=paymydine
      - MYSQL_USER=${DB_USERNAME}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - paymydine_network
    command: --default-authentication-plugin=mysql_native_password --max_connections=500

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: paymydine_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - paymydine_network

  # Laravel Queue Worker
  queue:
    build:
      context: .
      dockerfile: Dockerfile.laravel
    container_name: paymydine_queue
    restart: unless-stopped
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
    environment:
      - APP_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    volumes:
      - ./:/var/www/html
    networks:
      - paymydine_network
    depends_on:
      - mysql
      - redis

  # Laravel Scheduler (Cron)
  scheduler:
    build:
      context: .
      dockerfile: Dockerfile.laravel
    container_name: paymydine_scheduler
    restart: unless-stopped
    command: sh -c "while true; do php artisan schedule:run --verbose --no-interaction & sleep 60; done"
    environment:
      - APP_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    volumes:
      - ./:/var/www/html
    networks:
      - paymydine_network
    depends_on:
      - mysql
      - redis

networks:
  paymydine_network:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
  caddy_data:
  caddy_config:
```

---

## Dockerfiles

### File: `Dockerfile.laravel`

```dockerfile
FROM php:8.1-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    mysql-client \
    nginx

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mysqli zip gd bcmath

# Install Redis extension
RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port
EXPOSE 8000

# Start PHP-FPM and Nginx
CMD php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache && \
    php-fpm
```

---

### File: `Dockerfile.php-fpm`

```dockerfile
FROM php:8.1-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    libpng-dev \
    libzip-dev \
    zip \
    mysql-client

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql zip gd bcmath opcache

# Install Redis extension
RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis

# Configure PHP-FPM
RUN echo "pm = dynamic" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_children = 50" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.start_servers = 10" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.min_spare_servers = 5" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_spare_servers = 20" >> /usr/local/etc/php-fpm.d/www.conf

# Configure PHP for production
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.interned_strings_buffer=8" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.revalidate_freq=2" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.fast_shutdown=1" >> /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
```

---

### File: `frontend/Dockerfile`

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
```

---

## Caddyfile (Reverse Proxy + TLS)

### File: `Caddyfile`

```caddy
# Global options
{
    email admin@paymydine.com
    admin off
}

# Main domain
paymydine.com, www.paymydine.com {
    # Redirect to HTTPS
    redir https://www.paymydine.com{uri} permanent
}

# Frontend (Next.js)
www.paymydine.com {
    reverse_proxy nextjs:3000
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        -X-Powered-By
    }
    
    # Gzip compression
    encode gzip zstd
    
    # Logging
    log {
        output file /var/log/caddy/frontend.log
        format json
    }
}

# API domain
api.paymydine.com {
    reverse_proxy laravel:8000
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        -X-Powered-By
    }
    
    # Rate limiting (global)
    @api path /api/*
    rate_limit @api {
        zone api
        key {remote_host}
        events 60 1m
    }
    
    # Gzip compression
    encode gzip
    
    # Logging
    log {
        output file /var/log/caddy/api.log
        format json
    }
}

# Tenant subdomains (wildcard)
*.paymydine.com {
    # Determine routing based on path
    @frontend path / /table/* /menu/* /checkout/* /_next/* /images/*
    @api path /api/*
    
    # Route frontend requests to Next.js
    handle @frontend {
        reverse_proxy nextjs:3000
    }
    
    # Route API requests to Laravel
    handle @api {
        reverse_proxy laravel:8000
    }
    
    # Default to Next.js
    reverse_proxy nextjs:3000
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
    }
    
    # Gzip compression
    encode gzip
    
    # Logging
    log {
        output file /var/log/caddy/tenants.log
        format json
    }
}

# Admin domain (separate for security)
admin.paymydine.com {
    reverse_proxy laravel:8000
    
    # IP whitelist (optional)
    @blocked not remote_ip 1.2.3.4 5.6.7.8
    respond @blocked "Access denied" 403
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Content-Security-Policy "default-src 'self'; frame-ancestors 'none';"
    }
    
    # Rate limiting (stricter for admin)
    rate_limit {
        zone admin
        key {remote_host}
        events 30 1m
    }
    
    # Logging
    log {
        output file /var/log/caddy/admin.log
        format json
    }
}
```

---

## Environment Configuration

### File: `.env.production`

```env
# Application
APP_NAME=PayMyDine
APP_ENV=production
APP_KEY=base64:YOUR_32_CHAR_KEY_HERE
APP_DEBUG=false
APP_URL=https://www.paymydine.com

# Frontend
FRONTEND_URL=https://www.paymydine.com

# Database
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=paymydine
DB_USERNAME=paymydine_user
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_PREFIX=ti_

# Tenant Database (main DB)
TENANT_DB_HOST=mysql
TENANT_DB_PORT=3306
TENANT_DB_USERNAME=paymydine_user
TENANT_DB_PASSWORD=STRONG_PASSWORD_HERE

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=STRONG_REDIS_PASSWORD_HERE
REDIS_PORT=6379

# Cache
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Session
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# PayPal
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=YOUR_CLIENT_ID_HERE
PAYPAL_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=YOUR_SENDGRID_API_KEY
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@paymydine.com
MAIL_FROM_NAME=PayMyDine

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error

# Security
SESSION_COOKIE=paymydine_session
SANCTUM_STATEFUL_DOMAINS=www.paymydine.com,*.paymydine.com

# Monitoring
SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
```

---

## Deployment Steps

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/paymydine.git /var/www/paymydine
cd /var/www/paymydine

# Copy environment file
cp .env.production .env

# Generate APP_KEY
docker compose run --rm laravel php artisan key:generate

# Set permissions
sudo chown -R $USER:$USER /var/www/paymydine
chmod -R 755 storage bootstrap/cache
```

---

### 2. Build Containers

```bash
# Build all services
docker compose build

# Pull images
docker compose pull
```

---

### 3. Start Services

```bash
# Start in detached mode
docker compose up -d

# Check logs
docker compose logs -f

# Verify all services running
docker compose ps
```

---

### 4. Run Migrations

```bash
# Main database
docker compose exec laravel php artisan migrate --force

# Create first tenant
docker compose exec laravel php artisan tinker
>>> DB::connection('mysql')->table('ti_tenants')->insert([
    'domain' => 'demo.paymydine.com',
    'database' => 'tenant_demo',
    'db_host' => 'mysql',
    'db_user' => 'paymydine_user',
    'db_pass' => encrypt('STRONG_PASSWORD_HERE'),
    'status' => 'active',
]);

# Create tenant database
docker compose exec mysql mysql -u root -p -e "CREATE DATABASE tenant_demo;"

# Run tenant migrations
docker compose exec laravel php artisan migrate --database=tenant --force
```

---

### 5. Configure Cloudflare

1. Add site to Cloudflare
2. Update nameservers at domain registrar
3. **SSL/TLS Settings:**
   - Mode: "Full (strict)"
   - Minimum TLS: 1.2
   - Always Use HTTPS: ON
   - Automatic HTTPS Rewrites: ON
4. **Speed Settings:**
   - Auto Minify: JS, CSS, HTML
   - Brotli: ON
   - Rocket Loader: OFF (conflicts with Next.js)
5. **Security Settings:**
   - Security Level: Medium
   - Challenge Passage: 30 minutes
   - Browser Integrity Check: ON
   - Bot Fight Mode: ON
6. **Firewall Rules:**
   ```
   (http.request.uri.path contains "/admin" and ip.src ne 1.2.3.4) → Block
   (http.request.uri.path contains "/api" and cf.threat_score gt 10) → Challenge
   ```

---

### 6. Health Checks

```bash
# Test health endpoint
curl -I https://api.paymydine.com/health

# Expected response:
# HTTP/2 200
# content-type: application/json
# strict-transport-security: max-age=31536000

# Test tenant routing
curl -I https://demo.paymydine.com/api/v1/menu

# Test SSL
openssl s_client -connect paymydine.com:443 -servername paymydine.com
```

---

## Monitoring & Logging

### 1. Set Up Sentry (Error Tracking)

```bash
# Install Sentry SDK
composer require sentry/sentry-laravel

# Publish config
php artisan vendor:publish --provider="Sentry\Laravel\ServiceProvider"

# Add to .env
SENTRY_LARAVEL_DSN=https://YOUR_DSN@sentry.io/PROJECT_ID
```

---

### 2. Set Up Datadog (Metrics)

```bash
# Install Datadog Agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=YOUR_API_KEY DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure Laravel integration
# /etc/datadog-agent/conf.d/php_fpm.d/conf.yaml
instances:
  - status_url: http://localhost:9000/status
    ping_url: http://localhost:9000/ping

# Restart agent
sudo systemctl restart datadog-agent
```

---

### 3. Log Aggregation

```bash
# Install Promtail (ships logs to Grafana Loki)
wget https://github.com/grafana/loki/releases/download/v2.8.0/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail

# Configure Promtail
# /etc/promtail/config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: https://YOUR_LOKI_URL/loki/api/v1/push

scrape_configs:
  - job_name: laravel
    static_configs:
      - targets:
          - localhost
        labels:
          job: laravel
          __path__: /var/www/paymydine/storage/logs/*.log

# Start Promtail
sudo systemctl start promtail
```

---

## Backup & Disaster Recovery

### 1. Automated Backups

**File:** `backup.sh`

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/var/backups/paymydine"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup main database
docker compose exec -T mysql mysqldump \
    -u root -p$MYSQL_ROOT_PASSWORD \
    paymydine \
    > $BACKUP_DIR/main_db_$DATE.sql

# Backup tenant databases
for db in $(docker compose exec -T mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT database FROM ti_tenants" -N); do
    docker compose exec -T mysql mysqldump \
        -u root -p$MYSQL_ROOT_PASSWORD \
        $db \
        > $BACKUP_DIR/tenant_${db}_$DATE.sql
done

# Backup uploaded files
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/paymydine/storage/app

# Upload to S3
aws s3 sync $BACKUP_DIR s3://paymydine-backups/$(date +%Y/%m/%d)/

# Clean old backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

**Cron Job:**

```bash
# /etc/cron.d/paymydine-backup
0 2 * * * root /var/www/paymydine/backup.sh >> /var/log/paymydine-backup.log 2>&1
```

---

### 2. Disaster Recovery Plan

**RTO (Recovery Time Objective):** 1 hour  
**RPO (Recovery Point Objective):** 24 hours

**Recovery Steps:**

```bash
# 1. Provision new server (use Terraform/Ansible for automation)
# 2. Install Docker + Docker Compose
# 3. Clone repository
git clone https://github.com/your-org/paymydine.git /var/www/paymydine

# 4. Restore environment file
aws s3 cp s3://paymydine-secrets/.env /var/www/paymydine/.env

# 5. Download latest backup
aws s3 sync s3://paymydine-backups/$(date +%Y/%m/%d)/ /tmp/backup/

# 6. Start services
cd /var/www/paymydine
docker compose up -d

# 7. Restore databases
docker compose exec -T mysql mysql -u root -p$MYSQL_ROOT_PASSWORD paymydine < /tmp/backup/main_db_latest.sql

for db in /tmp/backup/tenant_*.sql; do
    db_name=$(basename $db | sed 's/tenant_\(.*\)_[0-9]*.sql/\1/')
    docker compose exec -T mysql mysql -u root -p$MYSQL_ROOT_PASSWORD $db_name < $db
done

# 8. Restore files
tar -xzf /tmp/backup/uploads_latest.tar.gz -C /var/www/paymydine/storage/app

# 9. Update DNS
# Point paymydine.com to new server IP

# 10. Verify
curl https://api.paymydine.com/health
```

---

## Scaling Strategies

### Horizontal Scaling (Multiple Servers)

```
Load Balancer (Nginx/HAProxy)
    ├─→ Server 1 (Laravel + Next.js)
    ├─→ Server 2 (Laravel + Next.js)
    └─→ Server 3 (Laravel + Next.js)
    ↓
    ├─→ MySQL (Primary-Replica)
    └─→ Redis Cluster
```

**Load Balancer Config (Nginx):**

```nginx
upstream backend {
    least_conn;
    server server1.paymydine.com:443 max_fails=3 fail_timeout=30s;
    server server2.paymydine.com:443 max_fails=3 fail_timeout=30s;
    server server3.paymydine.com:443 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name paymydine.com;
    
    ssl_certificate /etc/ssl/certs/paymydine.crt;
    ssl_certificate_key /etc/ssl/private/paymydine.key;
    
    location / {
        proxy_pass https://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Vertical Scaling (Bigger Server)

```bash
# Increase PHP-FPM workers
# /etc/php/8.1/fpm/pool.d/www.conf
pm.max_children = 100
pm.start_servers = 20
pm.min_spare_servers = 10
pm.max_spare_servers = 30

# Increase MySQL connections
# /etc/mysql/my.cnf
max_connections = 1000
innodb_buffer_pool_size = 4G

# Increase Redis memory
# docker-compose.yml
command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

---

## Zero-Downtime Deployment

### Blue-Green Deployment

```bash
#!/bin/bash
# deploy.sh

# Pull latest code
git pull origin main

# Build new containers (green)
docker compose -f docker-compose.green.yml build

# Run database migrations
docker compose -f docker-compose.green.yml run --rm laravel php artisan migrate --force

# Start green environment
docker compose -f docker-compose.green.yml up -d

# Health check
sleep 10
if curl -f http://localhost:8001/api/health; then
    echo "Green environment healthy"
    
    # Switch traffic to green
    docker compose -f docker-compose.yml stop
    docker compose -f docker-compose.green.yml start
    
    # Remove old containers (blue)
    docker compose -f docker-compose.yml down
    
    # Rename green to blue
    mv docker-compose.green.yml docker-compose.yml
else
    echo "Green environment unhealthy, rolling back"
    docker compose -f docker-compose.green.yml down
    exit 1
fi
```

---

## Security Hardening

### 1. Firewall (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

---

### 2. Fail2Ban (Brute Force Protection)

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure
# /etc/fail2ban/jail.local
[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/caddy/*.log
maxretry = 10
bantime = 3600

# Restart
sudo systemctl restart fail2ban
```

---

### 3. OS Hardening

```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password authentication (use SSH keys only)
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Summary Checklist

### Pre-Deployment
- [ ] Domain purchased & DNS configured
- [ ] SSL certificates obtained (Let's Encrypt via Caddy)
- [ ] Server provisioned (4 CPU, 8 GB RAM, 100 GB SSD)
- [ ] Docker & Docker Compose installed
- [ ] Environment variables configured (.env.production)
- [ ] Stripe & PayPal accounts set up
- [ ] Database backups configured
- [ ] Monitoring set up (Sentry, Datadog)

### Deployment
- [ ] Build Docker containers
- [ ] Start services
- [ ] Run migrations
- [ ] Verify health endpoints
- [ ] Configure Cloudflare
- [ ] Test tenant routing
- [ ] Test payment processing
- [ ] Load testing (Apache Bench, Locust)

### Post-Deployment
- [ ] Set up automated backups (cron job)
- [ ] Configure log rotation
- [ ] Set up alerts (PagerDuty, Slack)
- [ ] Run security scan (OWASP ZAP)
- [ ] Penetration testing
- [ ] Performance tuning (query optimization)
- [ ] Documentation updated

---

## Troubleshooting

### Issue: Container won't start

```bash
# Check logs
docker compose logs laravel

# Common fixes:
# 1. Permission issues
sudo chown -R www-data:www-data storage bootstrap/cache

# 2. Missing .env file
cp .env.production .env

# 3. Database connection failed
docker compose exec mysql mysql -u root -p -e "SHOW DATABASES;"
```

---

### Issue: Slow API responses

```bash
# Enable query logging
# config/database.php
'mysql' => [
    'options' => [
        PDO::ATTR_EMULATE_PREPARES => true,
    ],
],

# Check slow queries
docker compose exec mysql mysql -u root -p -e "SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;"

# Add indexes (see DATA_MODEL.md)
```

---

### Issue: Redis connection refused

```bash
# Check Redis status
docker compose exec redis redis-cli ping

# If authentication required:
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping

# Clear Redis cache
docker compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

---

**End of DEPLOYMENT.md**

