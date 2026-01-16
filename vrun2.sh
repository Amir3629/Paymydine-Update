#!/bin/bash

echo "=== IMAGE DIAGNOSTIC ==="
echo ""

# 1. Check storage symlink
echo "1. Storage Symlink:"
if [ -L "public/storage" ]; then
    echo "    EXISTS: $(readlink -f public/storage)"
else
    echo "    MISSING - Run: php artisan storage:link"
fi
echo ""

# 2. Check images in storage
echo "2. Images in storage/app/public:"
IMAGE_COUNT=$(find storage/app/public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null | wc -l)
echo "   Found: $IMAGE_COUNT images"
if [ "$IMAGE_COUNT" -gt 0 ]; then
    echo "   Sample files:"
    find storage/app/public -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | head -3 | sed 's/^/     /'
else
    echo "    NO IMAGES FOUND"
fi
echo ""

# 3. Check Laravel route
echo "3. Laravel /api/media/ route:"
if grep -q "api/media\|Route.*media" routes/api.php 2>/dev/null; then
    echo "    EXISTS in routes/api.php"
    grep -n "api/media\|Route.*media" routes/api.php 2>/dev/null | head -2 | sed 's/^/     /'
else
    echo "    NOT FOUND in routes/api.php"
fi
echo ""

# 4. Check database image paths
echo "4. Database image paths:"
php -r "
require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
try {
    \$attachments = DB::table('media_attachments')
        ->where('attachment_type', 'menus')
        ->where('tag', 'thumb')
        ->limit(5)
        ->get(['id', 'name', 'file_name', 'attachment_id']);
    if (\$attachments->count() > 0) {
        echo '   Found ' . \$attachments->count() . ' menu images:\n';
        foreach (\$attachments as \$att) {
            echo '     Menu ID ' . \$att->attachment_id . ': ' . \$att->name . ' (' . \$att->file_name . ')\n';
        }
    } else {
        echo '    No menu images in media_attachments\n';
    }
} catch (Exception \$e) {
    echo '    Error: ' . \$e->getMessage() . '\n';
}
" 2>/dev/null || echo "    Could not query database"
echo ""

# 5. Test endpoint
echo "5. Testing /api/media/ endpoint:"
DOMAIN=$(hostname -f 2>/dev/null || echo "localhost")
TEST_URL="http://$DOMAIN/api/media/test.png"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" 2>/dev/null)
if [ "$STATUS" = "404" ]; then
    echo "    404 (endpoint exists but file not found)"
elif [ "$STATUS" = "200" ]; then
    echo "    200 OK"
else
    echo "    $STATUS (endpoint may not exist)"
fi
echo ""

# 6. Check where images actually are
echo "6. Searching for image files:"
echo "   Checking assets/media/attachments/public:"
ASSETS_COUNT=$(find assets/media/attachments/public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null | wc -l)
echo "   Found: $ASSETS_COUNT images in assets/media/attachments/public"
if [ "$ASSETS_COUNT" -gt 0 ]; then
    echo "   Sample files:"
    find assets/media/attachments/public -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | head -3 | sed 's/^/     /'
    echo "   Checking nested folder structure:"
    find assets/media/attachments/public -type d -maxdepth 3 2>/dev/null | head -5 | sed 's/^/     /'
fi
echo "   Checking storage/app/media:"
MEDIA_COUNT=$(find storage/app/media -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null | wc -l)
echo "   Found: $MEDIA_COUNT images in storage/app/media"
echo "   Checking public/uploads:"
UPLOAD_COUNT=$(find public/uploads -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | wc -l)
echo "   Found: $UPLOAD_COUNT images in public/uploads"
echo ""

# 7. Check Next.js config
echo "7. Next.js /api/media/ rewrite:"
if [ -f "frontend/next.config.mjs" ] && grep -q "api/media" frontend/next.config.mjs; then
    echo "    CONFIGURED"
else
    echo "    NOT FOUND"
fi
echo ""

# 8. Test actual image from database
echo "8. Testing actual image from database:"
php -r "
require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
try {
    \$att = DB::table('media_attachments')
        ->where('attachment_type', 'menus')
        ->where('tag', 'thumb')
        ->first(['name', 'file_name']);
    if (\$att) {
        echo '   Database filename: ' . \$att->name . '\n';
        echo '   Original filename: ' . \$att->file_name . '\n';
        \$testPath = base_path('assets/media/attachments/public/' . \$att->name);
        echo '   Expected path: ' . \$testPath . '\n';
        echo '   File exists: ' . (file_exists(\$testPath) ? 'YES' : 'NO') . '\n';
        if (!file_exists(\$testPath)) {
            \$searchPath = base_path('assets/media/attachments/public');
            \$found = null;
            if (is_dir(\$searchPath)) {
                \$iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator(\$searchPath, RecursiveDirectoryIterator::SKIP_DOTS)
                );
                foreach (\$iterator as \$file) {
                    if (\$file->getFilename() === \$att->name) {
                        \$found = \$file->getPathname();
                        break;
                    }
                }
            }
            if (\$found) {
                echo '   Found at: ' . \$found . '\n';
            } else {
                echo '    NOT FOUND in nested folders\n';
            }
        }
        \$testUrl = 'http://' . gethostname() . '/api/media/' . \$att->name;
        echo '   Test URL: ' . \$testUrl . '\n';
    } else {
        echo '    No images in database\n';
    }
} catch (Exception \$e) {
    echo '    Error: ' . \$e->getMessage() . '\n';
}
" 2>/dev/null
echo ""

# 9. Check file permissions
echo "9. File permissions check:"
if [ -d "assets/media/attachments/public" ]; then
    PERM=$(stat -c "%a" assets/media/attachments/public 2>/dev/null || stat -f "%OLp" assets/media/attachments/public 2>/dev/null)
    OWNER=$(stat -c "%U:%G" assets/media/attachments/public 2>/dev/null || stat -f "%Su:%Sg" assets/media/attachments/public 2>/dev/null)
    echo "   Directory: $PERM ($OWNER)"
    SAMPLE_FILE=$(find assets/media/attachments/public -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | head -1)
    if [ -n "$SAMPLE_FILE" ]; then
        FILE_PERM=$(stat -c "%a" "$SAMPLE_FILE" 2>/dev/null || stat -f "%OLp" "$SAMPLE_FILE" 2>/dev/null)
        FILE_OWNER=$(stat -c "%U:%G" "$SAMPLE_FILE" 2>/dev/null || stat -f "%Su:%Sg" "$SAMPLE_FILE" 2>/dev/null)
        echo "   Sample file: $FILE_PERM ($FILE_OWNER)"
        echo "   File: $(basename "$SAMPLE_FILE")"
    fi
else
    echo "    assets/media/attachments/public does not exist"
fi
echo ""

# 10. Test route directly
echo "10. Testing route with actual file:"
php -r "
require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
try {
    \$att = DB::table('media_attachments')
        ->where('attachment_type', 'menus')
        ->where('tag', 'thumb')
        ->first(['name']);
    if (\$att) {
        \$testFile = base_path('assets/media/attachments/public/' . \$att->name);
        if (file_exists(\$testFile)) {
            echo '    File exists at expected path\n';
        } else {
            \$searchPath = base_path('assets/media/attachments/public');
            \$found = null;
            if (is_dir(\$searchPath)) {
                \$iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator(\$searchPath, RecursiveDirectoryIterator::SKIP_DOTS)
                );
                foreach (\$iterator as \$file) {
                    if (\$file->getFilename() === \$att->name) {
                        \$found = \$file->getPathname();
                        break;
                    }
                }
            }
            if (\$found) {
                echo '    File found in nested folder: ' . \$found . '\n';
                echo '   Route should find it via recursive search\n';
            } else {
                echo '    File NOT FOUND anywhere\n';
            }
        }
    }
} catch (Exception \$e) {
    echo '    ' . \$e->getMessage() . '\n';
}
" 2>/dev/null
echo ""

# 11. Summary
echo "=== SUMMARY ==="
if [ ! -L "public/storage" ]; then
    echo " Run: php artisan storage:link"
fi
if [ "$ASSETS_COUNT" -eq 0 ] && [ "$IMAGE_COUNT" -eq 0 ] && [ "$MEDIA_COUNT" -eq 0 ]; then
    echo " No images found in assets/media, storage/app/public, or storage/app/media"
fi
if [ "$ASSETS_COUNT" -gt 0 ]; then
    echo " Images found in assets/media/attachments/public"
fi
if ! grep -q "api/media" routes/api.php 2>/dev/null; then
    echo " Add /api/media/ route to routes/api.php"
else
    echo " /api/media/ route exists"
fi
echo ""
