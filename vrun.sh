#!/bin/bash
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check Laravel Routes
echo -e "${BLUE}1 CHECKING LARAVEL ROUTES${NC}"
echo "----------------------------------------"
if [ -f "routes/api.php" ]; then
    echo -e "${GREEN}${NC} routes/api.php exists"
    echo "Searching for /api/media route..."
    if grep -q "api/media" routes/api.php; then
        echo -e "${GREEN}${NC} Found /api/media route in routes/api.php"
        grep -n "api/media" routes/api.php | head -5
    else
        echo -e "${RED}${NC} /api/media route NOT found in routes/api.php"
    fi
else
    echo -e "${YELLOW}${NC} routes/api.php not found"
fi

if [ -f "routes/web.php" ]; then
    echo "Searching in routes/web.php..."
    if grep -q "api/media" routes/web.php; then
        echo -e "${GREEN}${NC} Found /api/media route in routes/web.php"
        grep -n "api/media" routes/web.php | head -5
    fi
fi

echo ""

# 2. Check Laravel Storage
echo -e "${BLUE}2 CHECKING LARAVEL STORAGE${NC}"
echo "----------------------------------------"

if [ -d "storage/app/public" ]; then
    echo -e "${GREEN}${NC} storage/app/public exists"
    echo "Checking for image files..."
    IMAGE_COUNT=$(find storage/app/public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" \) 2>/dev/null | wc -l)
    echo "Found $IMAGE_COUNT image files in storage/app/public"
    
    if [ "$IMAGE_COUNT" -gt 0 ]; then
        echo "Sample image files:"
        find storage/app/public -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | head -5
    else
        echo -e "${RED}${NC} No image files found in storage/app/public"
    fi
else
    echo -e "${RED}${NC} storage/app/public directory does not exist"
fi

# Check storage link
echo ""
echo "Checking storage symlink..."
if [ -L "public/storage" ]; then
    echo -e "${GREEN}${NC} public/storage symlink exists"
    echo "Symlink points to: $(readlink -f public/storage)"
else
    echo -e "${RED}${NC} public/storage symlink does NOT exist"
    echo -e "${YELLOW}${NC} Run: php artisan storage:link"
fi

echo ""

# 3. Check File Permissions
echo -e "${BLUE}3 CHECKING FILE PERMISSIONS${NC}"
echo "----------------------------------------"

if [ -d "storage/app/public" ]; then
    STORAGE_PERM=$(stat -c "%a" storage/app/public 2>/dev/null || stat -f "%OLp" storage/app/public 2>/dev/null)
    echo "storage/app/public permissions: $STORAGE_PERM"
    
    if [ -L "public/storage" ]; then
        LINK_PERM=$(stat -c "%a" public/storage 2>/dev/null || stat -f "%OLp" public/storage 2>/dev/null)
        echo "public/storage permissions: $LINK_PERM"
    fi
fi

echo ""

# 4. Check Laravel API Controller
echo -e "${BLUE}4 CHECKING LARAVEL API CONTROLLER${NC}"
echo "----------------------------------------"

# Look for media controller or route handler
if [ -f "app/Http/Controllers/Api/MediaController.php" ]; then
    echo -e "${GREEN}${NC} MediaController.php exists"
elif [ -f "app/Http/Controllers/MediaController.php" ]; then
    echo -e "${GREEN}${NC} MediaController.php exists"
else
    echo -e "${YELLOW}${NC} MediaController.php not found"
    echo "Checking for media route in API routes..."
fi

# Check if there's a route that handles /api/media
echo "Searching for media handling code..."
find app/Http/Controllers -name "*.php" -exec grep -l "api/media\|media.*route\|MediaController" {} \; 2>/dev/null | head -5

echo ""

# 5. Test Backend Endpoints
echo -e "${BLUE}5 TESTING BACKEND ENDPOINTS${NC}"
echo "----------------------------------------"

# Get server hostname
HOSTNAME=$(hostname -f 2>/dev/null || hostname || echo "localhost")
DOMAIN="mimoza.paymydine.com"

echo "Testing API endpoints..."

# Test menu endpoint
echo -n "Testing /api/v1/menu: "
MENU_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/api/v1/menu" 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/v1/menu" 2>/dev/null)
if [ "$MENU_RESPONSE" = "200" ]; then
    echo -e "${GREEN}${NC} $MENU_RESPONSE OK"
else
    echo -e "${RED}${NC} $MENU_RESPONSE"
fi

# Test media endpoint with a sample image
echo -n "Testing /api/media/ (sample): "
MEDIA_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/api/media/test.png" 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/media/test.png" 2>/dev/null)
if [ "$MEDIA_RESPONSE" = "200" ] || [ "$MEDIA_RESPONSE" = "404" ]; then
    echo -e "${YELLOW}${NC} $MEDIA_RESPONSE (expected 404 for test.png, but endpoint exists)"
else
    echo -e "${RED}${NC} $MEDIA_RESPONSE"
fi

# Test with actual image from database
echo ""
echo "Testing with actual image from menu..."
if [ -f "storage/app/public" ]; then
    FIRST_IMAGE=$(find storage/app/public -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | head -1)
    if [ -n "$FIRST_IMAGE" ]; then
        IMAGE_NAME=$(basename "$FIRST_IMAGE")
        echo "Testing: /api/media/$IMAGE_NAME"
        IMAGE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/api/media/$IMAGE_NAME" 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/media/$IMAGE_NAME" 2>/dev/null)
        if [ "$IMAGE_RESPONSE" = "200" ]; then
            echo -e "${GREEN}${NC} $IMAGE_RESPONSE OK - Image accessible!"
        else
            echo -e "${RED}${NC} $IMAGE_RESPONSE - Image not accessible"
        fi
    fi
fi

echo ""

# 6. Check Database Image Paths
echo -e "${BLUE}6 CHECKING DATABASE IMAGE PATHS${NC}"
echo "----------------------------------------"

if command -v php &> /dev/null; then
    echo "Checking menu items with images in database..."
    php -r "
    require 'vendor/autoload.php';
    \$app = require_once 'bootstrap/app.php';
    \$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    try {
        \$items = DB::table('menus')->whereNotNull('image')->limit(5)->get(['id', 'name', 'image']);
        if (\$items->count() > 0) {
            echo 'Found ' . \$items->count() . ' menu items with images:\n';
            foreach (\$items as \$item) {
                echo '  ID: ' . \$item->id . ' - ' . \$item->name . '\n';
                echo '    Image: ' . \$item->image . '\n';
            }
        } else {
            echo 'No menu items with images found in database\n';
        }
    } catch (Exception \$e) {
        echo 'Could not query database: ' . \$e->getMessage() . '\n';
    }
    " 2>/dev/null || echo "Could not query database (Laravel not accessible or DB not configured)"
else
    echo "PHP not found, skipping database check"
fi

echo ""

# 7. Check Next.js Configuration
echo -e "${BLUE}7 CHECKING NEXT.JS CONFIGURATION${NC}"
echo "----------------------------------------"

if [ -f "frontend/next.config.mjs" ]; then
    echo -e "${GREEN}${NC} next.config.mjs exists"
    echo "Checking for /api/media rewrite..."
    if grep -q "api/media" frontend/next.config.mjs; then
        echo -e "${GREEN}${NC} Found /api/media in next.config.mjs"
        echo "Rewrite configuration:"
        grep -A 2 "api/media" frontend/next.config.mjs | head -5
    else
        echo -e "${RED}${NC} /api/media rewrite NOT found in next.config.mjs"
    fi
else
    echo -e "${YELLOW}${NC} frontend/next.config.mjs not found"
fi

echo ""

# 8. Check Nginx/Apache Configuration
echo -e "${BLUE}8 CHECKING WEB SERVER CONFIG${NC}"
echo "----------------------------------------"

if [ -f "/etc/nginx/sites-available/default" ] || [ -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "Nginx configuration found"
    NGINX_CONF=$(find /etc/nginx -name "*.conf" -o -name "*paymydine*" 2>/dev/null | head -1)
    if [ -n "$NGINX_CONF" ]; then
        echo "Checking: $NGINX_CONF"
        if grep -q "api/media\|location.*media" "$NGINX_CONF" 2>/dev/null; then
            echo -e "${GREEN}${NC} Found media location in nginx config"
            grep -A 5 "api/media\|location.*media" "$NGINX_CONF" 2>/dev/null | head -10
        else
            echo -e "${YELLOW}${NC} No specific media location found in nginx config"
        fi
    fi
elif [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
    echo "Apache configuration found"
    if grep -q "api/media" /etc/apache2/sites-available/000-default.conf 2>/dev/null; then
        echo -e "${GREEN}${NC} Found media configuration in Apache"
    fi
else
    echo "Web server config not found in standard locations"
fi

echo ""

# 9. Check Laravel Logs
echo -e "${BLUE}9 CHECKING LARAVEL LOGS${NC}"
echo "----------------------------------------"

if [ -f "storage/logs/laravel.log" ]; then
    echo "Recent errors in Laravel log (last 10 lines with 'media' or '404'):"
    grep -i "media\|404" storage/logs/laravel.log 2>/dev/null | tail -10 || echo "No recent media/404 errors"
else
    echo "Laravel log file not found"
fi

echo ""

# 10. Summary and Recommendations
echo -e "${BLUE} SUMMARY & RECOMMENDATIONS${NC}"
echo "=========================================="
echo ""

echo -e "${YELLOW}Common Issues to Check:${NC}"
echo "1. Laravel route for /api/media/ must exist"
echo "2. Storage symlink: php artisan storage:link"
echo "3. Image files must exist in storage/app/public"
echo "4. File permissions: storage should be readable (755 or 775)"
echo "5. Next.js rewrites must proxy /api/media/ to Laravel backend"
echo "6. Web server (nginx/apache) must allow access to /api/media/"
echo ""

echo -e "${YELLOW}Quick Fixes to Try:${NC}"
echo "1. Run: php artisan storage:link"
echo "2. Check: ls -la public/storage"
echo "3. Verify: php artisan route:list | grep media"
echo "4. Test: curl http://your-domain/api/media/[image-filename]"
echo "5. Check Laravel routes/api.php for /api/media route definition"
echo ""

echo "=========================================="
echo ""
echo "=========================================="
