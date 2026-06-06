#!/bin/bash
set -Eeuo pipefail

PROJECT_NAME="Paymydine-Local"
REPO_URL="https://github.com/Amir3629/Paymydine-Update.git"

SERVER_USER="ubuntu"
SERVER_HOST="57.129.43.190"
REMOTE_APP_DIR="/var/www/paymydine"

LOCAL_BASE="$HOME/Downloads"
PROJECT_DIR="$LOCAL_BASE/$PROJECT_NAME"

MYSQL_BIN="$(command -v mysql || echo /opt/homebrew/bin/mysql)"

echo "========================================"
echo "PayMyDine local setup"
echo "This will clone GitHub code, install Composer, copy DB/media from VPS, and start localhost."
echo "========================================"

read -s -p "Local MySQL root password: " LOCAL_MYSQL_PASSWORD
echo ""

echo "==> Checking tools"
command -v git >/dev/null 2>&1 || { echo "ERROR: git not found"; exit 1; }
command -v composer >/dev/null 2>&1 || { echo "ERROR: composer not found"; exit 1; }
command -v php >/dev/null 2>&1 || { echo "ERROR: php not found"; exit 1; }
command -v ssh >/dev/null 2>&1 || { echo "ERROR: ssh not found"; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "ERROR: rsync not found"; exit 1; }

if [ ! -x "$MYSQL_BIN" ]; then
  echo "ERROR: mysql client not found"
  echo "Install MySQL client first."
  exit 1
fi

echo "==> Removing old local folder"
rm -rf "$PROJECT_DIR"

echo "==> Cloning GitHub"
git clone "$REPO_URL" "$PROJECT_DIR"

cd "$PROJECT_DIR"

echo "==> Installing Composer dependencies"
composer install

echo "==> Restoring custom PayMyDine files after Composer"
git reset --hard HEAD
git clean -fd app/admin app/main app/system

echo "==> Creating required storage folders"
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/system/cache
mkdir -p storage/logs
mkdir -p storage/temp
mkdir -p storage/app/public
mkdir -p bootstrap/cache
chmod -R u+rwX storage bootstrap/cache

echo "==> Creating local .env"
if [ -f ".env.example" ]; then
  cp .env.example .env
else
  touch .env
fi

python3 <<PY
from pathlib import Path

p = Path(".env")
text = p.read_text() if p.exists() else ""

settings = {
    "APP_ENV": "local",
    "APP_DEBUG": "false",
    "APP_URL": "http://127.0.0.1:8000",
    "DB_CONNECTION": "mysql",
    "DB_HOST": "127.0.0.1",
    "DB_PORT": "3306",
    "DB_DATABASE": "paymydine",
    "DB_USERNAME": "root",
    "DB_PASSWORD": "${LOCAL_MYSQL_PASSWORD}",
    "TENANT_DB_HOST": "127.0.0.1",
    "TENANT_DB_PORT": "3306",
    "TENANT_DB_USERNAME": "root",
    "TENANT_DB_PASSWORD": "${LOCAL_MYSQL_PASSWORD}",
    "CACHE_DRIVER": "file",
    "SESSION_DRIVER": "file",
    "QUEUE_CONNECTION": "sync",
    "BROADCAST_DRIVER": "log",
}

lines = text.splitlines()
seen = set()
out = []

for line in lines:
    if "=" in line and not line.strip().startswith("#"):
        key = line.split("=", 1)[0].strip()
        if key in settings:
            out.append(f"{key}={settings[key]}")
            seen.add(key)
        else:
            out.append(line)
    else:
        out.append(line)

for key, value in settings.items():
    if key not in seen:
        out.append(f"{key}={value}")

p.write_text("\\n".join(out) + "\\n")
PY

echo "==> Testing SSH to VPS"
ssh -o ConnectTimeout=10 "${SERVER_USER}@${SERVER_HOST}" "echo SSH_OK"

echo "==> Dumping production DBs from VPS"
ssh "${SERVER_USER}@${SERVER_HOST}" 'bash -s' <<'REMOTE'
set -Eeuo pipefail

cd /var/www/paymydine

rm -rf /tmp/pmd-local-sync
mkdir -p /tmp/pmd-local-sync

php <<'PHP' > /tmp/pmd_db_creds.env
<?php
function read_env_file($path) {
    $env = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }
        $env[$key] = $value;
    }
    return $env;
}
function shell_value($value) {
    return "'" . str_replace("'", "'\\''", $value) . "'";
}
$env = read_env_file('/var/www/paymydine/.env');
echo "DB_HOST=" . shell_value($env['DB_HOST'] ?? '127.0.0.1') . PHP_EOL;
echo "DB_PORT=" . shell_value($env['DB_PORT'] ?? '3306') . PHP_EOL;
echo "DB_USERNAME=" . shell_value($env['DB_USERNAME'] ?? '') . PHP_EOL;
echo "DB_PASSWORD=" . shell_value($env['DB_PASSWORD'] ?? '') . PHP_EOL;
PHP

source /tmp/pmd_db_creds.env
rm -f /tmp/pmd_db_creds.env

CNF="$(mktemp)"
chmod 600 "$CNF"

cat > "$CNF" <<EOF
[client]
host=$DB_HOST
port=$DB_PORT
user=$DB_USERNAME
password=$DB_PASSWORD
default-character-set=utf8mb4
EOF

trap 'rm -f "$CNF"' EXIT

for db in paymydine mimoza rosana persian; do
  echo "Dumping $db..."
  mysqldump --defaults-extra-file="$CNF" --single-transaction "$db" > "/tmp/pmd-local-sync/$db.sql"
done

tar -czf /tmp/pmd-local-dbs.tar.gz -C /tmp/pmd-local-sync .
REMOTE

echo "==> Downloading DB dumps"
scp "${SERVER_USER}@${SERVER_HOST}:/tmp/pmd-local-dbs.tar.gz" "$LOCAL_BASE/pmd-local-dbs.tar.gz"

echo "==> Extracting DB dumps"
rm -rf "$LOCAL_BASE/pmd-local-dbs"
mkdir -p "$LOCAL_BASE/pmd-local-dbs"
tar -xzf "$LOCAL_BASE/pmd-local-dbs.tar.gz" -C "$LOCAL_BASE/pmd-local-dbs"

echo "==> Creating local databases"
"$MYSQL_BIN" -u root -p"${LOCAL_MYSQL_PASSWORD}" -e "
CREATE DATABASE IF NOT EXISTS paymydine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS mimoza CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS rosana CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS persian CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

echo "==> Importing databases"
"$MYSQL_BIN" -u root -p"${LOCAL_MYSQL_PASSWORD}" paymydine < "$LOCAL_BASE/pmd-local-dbs/paymydine.sql"
"$MYSQL_BIN" -u root -p"${LOCAL_MYSQL_PASSWORD}" mimoza < "$LOCAL_BASE/pmd-local-dbs/mimoza.sql"
"$MYSQL_BIN" -u root -p"${LOCAL_MYSQL_PASSWORD}" rosana < "$LOCAL_BASE/pmd-local-dbs/rosana.sql"
"$MYSQL_BIN" -u root -p"${LOCAL_MYSQL_PASSWORD}" persian < "$LOCAL_BASE/pmd-local-dbs/persian.sql"

echo "==> Syncing media from VPS"
mkdir -p assets/media
mkdir -p storage/app/public

rsync -av --delete \
  --exclude='*.tar' \
  --exclude='*.tar.gz' \
  --exclude='*.zip' \
  "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/assets/media/" \
  "./assets/media/"

rsync -av --delete \
  "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/storage/app/public/" \
  "./storage/app/public/" || true

echo "==> Composer autoload and cache clear"
composer dump-autoload

php artisan config:clear
php artisan cache:clear
php artisan view:clear

echo "==> Verifying important files"
test -f app/admin/models/Fiskaly_configs_model.php
test -f app/admin/assets/css/pmd-admin-theme-v1.css
test -d assets/media/attachments/public

echo "==> Starting server"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo ""
echo "DONE."
echo "Open this URL:"
echo "http://mimoza.lvh.me:8000/admin/menus"
echo ""

php -S 127.0.0.1:8000 server.php
