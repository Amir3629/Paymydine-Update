<?php
/**
 * Deep Image Investigation Script
 * 
 * This script performs a comprehensive investigation of the image loading issue
 * from all layers: Database, File System, API, Route Handler, and Frontend
 * 
 * Usage: php deep-image-investigation.php [menu_id]
 * Example: php deep-image-investigation.php 31
 */

require __DIR__ . '/bootstrap/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n";
echo "========================================\n";
echo "  DEEP IMAGE INVESTIGATION REPORT\n";
echo "========================================\n\n";

$menuId = $argv[1] ?? null;

// ============================================================================
// 1. DATABASE LAYER INVESTIGATION
// ============================================================================
echo "1. DATABASE LAYER INVESTIGATION\n";
echo "--------------------------------\n\n";

$p = DB::connection()->getTablePrefix();

if ($menuId) {
    $query = "
        SELECT 
            m.menu_id,
            m.menu_name,
            m.menu_status,
            ma.id as attachment_id,
            ma.disk as image_disk,
            ma.name as image_name,
            ma.file_name,
            ma.attachment_type,
            ma.attachment_id,
            ma.tag
        FROM {$p}menus m
        LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
            AND ma.attachment_id = m.menu_id 
            AND ma.tag = 'thumb'
        WHERE m.menu_id = ?
    ";
    $items = [DB::selectOne($query, [$menuId])];
    echo "Investigating Menu ID: {$menuId}\n\n";
} else {
    $query = "
        SELECT 
            m.menu_id,
            m.menu_name,
            m.menu_status,
            ma.id as attachment_id,
            ma.disk as image_disk,
            ma.name as image_name,
            ma.file_name,
            ma.attachment_type,
            ma.attachment_id,
            ma.tag
        FROM {$p}menus m
        LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
            AND ma.attachment_id = m.menu_id 
            AND ma.tag = 'thumb'
        WHERE m.menu_status = 1
        LIMIT 10
    ";
    $items = DB::select($query);
    echo "Investigating first 10 active menu items\n\n";
}

$dbIssues = [];
foreach ($items as $item) {
    echo "  Menu: {$item->menu_name} (ID: {$item->menu_id})\n";
    
    if (!$item->attachment_id) {
        echo "    ❌ NO ATTACHMENT in database\n";
        $dbIssues[] = "Menu {$item->menu_id} has no media attachment";
        echo "\n";
        continue;
    }
    
    echo "    Attachment ID: {$item->attachment_id}\n";
    echo "    Disk: " . ($item->image_disk ?: 'NULL') . "\n";
    echo "    Name: " . ($item->image_name ?: 'NULL') . "\n";
    echo "    File Name: " . ($item->file_name ?: 'NULL') . "\n";
    echo "    Tag: " . ($item->tag ?: 'NULL') . "\n";
    
    if (!$item->image_disk) {
        echo "    ❌ PROBLEM: disk column is NULL\n";
        $dbIssues[] = "Menu {$item->menu_id} has NULL disk value";
    } elseif (strlen($item->image_disk) < 9) {
        echo "    ⚠️  WARNING: disk value too short (< 9 chars)\n";
        $dbIssues[] = "Menu {$item->menu_id} has short disk value: {$item->image_disk}";
    } else {
        echo "    ✅ Disk value looks valid\n";
    }
    
    echo "\n";
}

// ============================================================================
// 2. FILE SYSTEM LAYER INVESTIGATION
// ============================================================================
echo "\n2. FILE SYSTEM LAYER INVESTIGATION\n";
echo "-----------------------------------\n\n";

$basePath = base_path('assets/media/attachments/public');
echo "Base path: {$basePath}\n";

if (!is_dir($basePath)) {
    echo "❌ CRITICAL: Base directory does not exist!\n";
    exit(1);
}

echo "✅ Base directory exists\n\n";

$fsIssues = [];
foreach ($items as $item) {
    if (!$item->attachment_id || !$item->image_disk) {
        continue;
    }
    
    $disk = $item->image_disk;
    echo "  Checking file for Menu {$item->menu_id} (Disk: {$disk})\n";
    
    // Build expected path
    $p1 = substr($disk, 0, 3);
    $p2 = substr($disk, 3, 3);
    $p3 = substr($disk, 6, 3);
    $expectedDir = $basePath . '/' . $p1 . '/' . $p2 . '/' . $p3 . '/';
    $expectedPath = "{$p1}/{$p2}/{$p3}/{$disk}";
    
    echo "    Expected directory: {$expectedDir}\n";
    
    if (!is_dir($expectedDir)) {
        echo "    ❌ Directory does not exist\n";
        $fsIssues[] = "Menu {$item->menu_id}: Directory {$expectedPath} does not exist";
    } else {
        echo "    ✅ Directory exists\n";
        
        // Check for file with various extensions
        $extensions = ['webp', 'jpg', 'jpeg', 'png'];
        $found = false;
        foreach ($extensions as $ext) {
            $filePath = $expectedDir . $disk . '.' . $ext;
            if (file_exists($filePath)) {
                echo "    ✅ File found: {$disk}.{$ext}\n";
                echo "    Full path: {$filePath}\n";
                
                // Check permissions
                $perms = substr(sprintf('%o', fileperms($filePath)), -4);
                $readable = is_readable($filePath);
                echo "    Permissions: {$perms}\n";
                echo "    Readable: " . ($readable ? 'YES ✅' : 'NO ❌') . "\n";
                
                if (!$readable) {
                    $fsIssues[] = "Menu {$item->menu_id}: File exists but not readable";
                }
                
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            echo "    ❌ File not found with any extension\n";
            echo "    Files in directory:\n";
            $files = glob($expectedDir . '*');
            foreach ($files as $file) {
                echo "      - " . basename($file) . "\n";
            }
            $fsIssues[] = "Menu {$item->menu_id}: File not found in {$expectedPath}";
        }
    }
    
    echo "\n";
}

// ============================================================================
// 3. API LAYER INVESTIGATION
// ============================================================================
echo "\n3. API LAYER INVESTIGATION\n";
echo "--------------------------\n\n";

echo "Testing API endpoint: /api/v1/menu\n";
echo "Simulating API response construction...\n\n";

$apiQuery = "
    SELECT 
        m.menu_id as id,
        m.menu_name as name,
        m.menu_description as description,
        CAST(m.menu_price AS DECIMAL(10,2)) as price,
        COALESCE(c.name, 'Main') as category_name,
        ma.name as image,
        ma.disk as image_disk
    FROM {$p}menus m
    LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
    LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
    LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
        AND ma.attachment_id = m.menu_id 
        AND ma.tag = 'thumb'
    WHERE m.menu_status = 1
    " . ($menuId ? "AND m.menu_id = {$menuId}" : "") . "
    LIMIT 5
";

$apiItems = DB::select($apiQuery);
$apiIssues = [];

foreach ($apiItems as &$apiItem) {
    echo "  Menu: {$apiItem->name} (ID: {$apiItem->id})\n";
    
    if ($apiItem->image_disk && strlen($apiItem->image_disk) >= 9) {
        $disk = $apiItem->image_disk;
        $p1 = substr($disk, 0, 3);
        $p2 = substr($disk, 3, 3);
        $p3 = substr($disk, 6, 3);
        $basePath = base_path('assets/media/attachments/public/' . $p1 . '/' . $p2 . '/' . $p3 . '/');
        $extensions = ['webp', 'jpg', 'jpeg', 'png'];
        $resolved = null;
        
        foreach ($extensions as $ext) {
            $candidate = $basePath . $disk . '.' . $ext;
            if (file_exists($candidate)) {
                $resolved = $p1 . '/' . $p2 . '/' . $p3 . '/' . $disk . '.' . $ext;
                break;
            }
        }
        
        if ($resolved) {
            $apiItem->image = "/api/media/" . $resolved;
            echo "    ✅ API will return: {$apiItem->image}\n";
        } else {
            $apiItem->image = "/api/media/" . $disk . ".png";
            echo "    ⚠️  API will return (fallback): {$apiItem->image}\n";
            $apiIssues[] = "Menu {$apiItem->id}: File not found, using fallback";
        }
    } elseif ($apiItem->image) {
        $apiItem->image = "/api/media/" . $apiItem->image;
        echo "    ⚠️  API will return (name-based): {$apiItem->image}\n";
        $apiIssues[] = "Menu {$apiItem->id}: Using name instead of disk";
    } else {
        $apiItem->image = '/images/pasta.png';
        echo "    ⚠️  API will return (default): {$apiItem->image}\n";
        $apiIssues[] = "Menu {$apiItem->id}: No image, using default";
    }
    
    echo "\n";
}

// ============================================================================
// 4. ROUTE HANDLER INVESTIGATION
// ============================================================================
echo "\n4. ROUTE HANDLER INVESTIGATION\n";
echo "-------------------------------\n\n";

echo "Testing route handler logic...\n\n";

$routeIssues = [];
foreach ($apiItems as $apiItem) {
    if (!$apiItem->image || $apiItem->image === '/images/pasta.png') {
        continue;
    }
    
    // Extract path from API response
    $apiPath = str_replace('/api/media/', '', $apiItem->image);
    echo "  Testing path: {$apiPath}\n";
    echo "  (From API response: {$apiItem->image})\n";
    
    // Simulate route handler
    $path = explode('?', $apiPath)[0];
    $mediaPath = base_path('assets/media/attachments/public/' . $path);
    
    if (file_exists($mediaPath)) {
        echo "    ✅ Route handler would find file directly\n";
        echo "    Path: {$mediaPath}\n";
    } else {
        echo "    ⚠️  Direct path not found, route handler would search...\n";
        
        $filename = basename($path);
        $pathWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
        
        if (strlen($pathWithoutExt) >= 9 && ctype_alnum($pathWithoutExt)) {
            $disk = $pathWithoutExt;
            $p1 = substr($disk, 0, 3);
            $p2 = substr($disk, 3, 3);
            $p3 = substr($disk, 6, 3);
            $extensions = ['webp', 'jpg', 'jpeg', 'png'];
            $found = false;
            
            foreach ($extensions as $ext) {
                $candidate = base_path('assets/media/attachments/public/' . $p1 . '/' . $p2 . '/' . $p3 . '/' . $disk . '.' . $ext);
                if (file_exists($candidate)) {
                    echo "    ✅ Route handler would find file via disk-based search\n";
                    echo "    Found at: {$candidate}\n";
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                echo "    ❌ Route handler would NOT find file\n";
                $routeIssues[] = "Menu {$apiItem->id}: Route handler cannot find file for path {$apiPath}";
            }
        } else {
            echo "    ❌ Path does not look like valid disk hash\n";
            $routeIssues[] = "Menu {$apiItem->id}: Invalid path format: {$apiPath}";
        }
    }
    
    echo "\n";
}

// ============================================================================
// 5. ROUTE REGISTRATION CHECK
// ============================================================================
echo "\n5. ROUTE REGISTRATION CHECK\n";
echo "---------------------------\n\n";

try {
    $routes = \Illuminate\Support\Facades\Route::getRoutes();
    $mediaRoute = null;
    
    foreach ($routes as $route) {
        if (strpos($route->uri(), 'api/media') !== false) {
            $mediaRoute = $route;
            break;
        }
    }
    
    if ($mediaRoute) {
        echo "✅ Route found: {$mediaRoute->uri()}\n";
        echo "   Methods: " . implode(', ', $mediaRoute->methods()) . "\n";
        echo "   Action: " . (is_string($mediaRoute->getActionName()) ? $mediaRoute->getActionName() : 'Closure') . "\n";
    } else {
        echo "❌ CRITICAL: /api/media route not found!\n";
        echo "   Route may not be registered or route cache needs clearing\n";
    }
} catch (\Exception $e) {
    echo "⚠️  Could not check routes: " . $e->getMessage() . "\n";
}

// ============================================================================
// 6. SUMMARY REPORT
// ============================================================================
echo "\n\n========================================\n";
echo "  SUMMARY REPORT\n";
echo "========================================\n\n";

$totalIssues = count($dbIssues) + count($fsIssues) + count($apiIssues) + count($routeIssues);

if ($totalIssues === 0) {
    echo "✅ NO ISSUES FOUND!\n";
    echo "\nAll layers appear to be working correctly.\n";
    echo "If images still don't show, check:\n";
    echo "  1. Route cache: php artisan route:clear\n";
    echo "  2. Nginx configuration\n";
    echo "  3. Browser cache\n";
    echo "  4. Laravel logs: tail -f storage/logs/laravel.log\n";
} else {
    echo "❌ FOUND {$totalIssues} ISSUE(S):\n\n";
    
    if (count($dbIssues) > 0) {
        echo "Database Issues (" . count($dbIssues) . "):\n";
        foreach ($dbIssues as $issue) {
            echo "  - {$issue}\n";
        }
        echo "\n";
    }
    
    if (count($fsIssues) > 0) {
        echo "File System Issues (" . count($fsIssues) . "):\n";
        foreach ($fsIssues as $issue) {
            echo "  - {$issue}\n";
        }
        echo "\n";
    }
    
    if (count($apiIssues) > 0) {
        echo "API Issues (" . count($apiIssues) . "):\n";
        foreach ($apiIssues as $issue) {
            echo "  - {$issue}\n";
        }
        echo "\n";
    }
    
    if (count($routeIssues) > 0) {
        echo "Route Handler Issues (" . count($routeIssues) . "):\n";
        foreach ($routeIssues as $issue) {
            echo "  - {$issue}\n";
        }
        echo "\n";
    }
}

echo "\n========================================\n";
echo "Investigation Complete\n";
echo "========================================\n\n";
