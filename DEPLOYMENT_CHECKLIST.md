# Deployment Checklist for Image Fix

## ⚠️ CRITICAL: After deploying routes.php, you MUST:

### 1. Clear ALL Laravel Caches
```bash
cd /var/www/paymydine
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### 2. Verify Route is Registered
```bash
php artisan route:list | grep "api/media"
```
Should show: `GET|HEAD api/media/{path}`

### 3. Test the Route Directly
```bash
# Test with a known file
curl -v http://mimoza.paymydine.com/api/media/6933980910771278432906.png
```

### 4. Check Laravel Logs
```bash
tail -f storage/logs/laravel.log
```
Then try accessing an image URL. You should see log entries like:
```
Media route called {"path":"6933980910771278432906.png",...}
```

### 5. If Route Still Returns 404

**Check if nginx is intercepting the request:**
```bash
# Check nginx config
sudo nginx -t
cat /etc/nginx/sites-available/paymydine | grep -A 10 "api/media"
```

**Check if there's a route conflict:**
```bash
php artisan route:list | grep -i media
```

**Verify the file exists:**
```bash
ls -la /var/www/paymydine/assets/media/attachments/public/693/398/091/6933980910771278432906.png
```

### 6. Restart Services (if needed)
```bash
sudo systemctl restart php8.1-fpm  # or your PHP version
sudo systemctl restart nginx
```

## Common Issues:

1. **Route cache not cleared** - Most common issue!
2. **Nginx intercepting** - Check nginx config for `/api/media` rules
3. **File permissions** - Ensure web server can read files
4. **Route not registered** - Check route:list output

## Quick Test Script

Create this on server and run:
```bash
#!/bin/bash
echo "Testing media route..."
curl -I http://mimoza.paymydine.com/api/media/6933980910771278432906.png
echo ""
echo "Checking route list..."
php artisan route:list | grep "api/media"
echo ""
echo "Checking file exists..."
ls -la assets/media/attachments/public/693/398/091/6933980910771278432906.png
```
