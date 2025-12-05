<?php

echo "=== SETTINGS DISAPPEARING INVESTIGATION ===\n\n";

// Load Laravel
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "1. CHECKING SETTINGS TABLE STRUCTURE:\n";
echo str_repeat("-", 50) . "\n";
try {
    $tableExists = DB::getSchemaBuilder()->hasTable('settings');
    echo "   Settings table exists: " . ($tableExists ? "YES" : "NO") . "\n";
    
    if ($tableExists) {
        $columns = DB::getSchemaBuilder()->getColumnListing('settings');
        echo "   Columns: " . implode(", ", $columns) . "\n";
        
        // Check for unique constraint
        $indexes = DB::select("SHOW INDEXES FROM settings WHERE Key_name = 'ti_settings_sort_item_unique'");
        echo "   Unique constraint (sort, item): " . (count($indexes) > 0 ? "EXISTS" : "MISSING") . "\n";
    }
} catch (\Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

echo "\n2. CHECKING CURRENT SETTINGS IN DATABASE:\n";
echo str_repeat("-", 50) . "\n";
try {
    $totalSettings = DB::table('settings')->count();
    echo "   Total settings: {$totalSettings}\n";
    
    $configSettings = DB::table('settings')->where('sort', 'config')->count();
    echo "   Config settings: {$configSettings}\n";
    
    $prefsSettings = DB::table('settings')->where('sort', 'prefs')->count();
    echo "   Prefs settings: {$prefsSettings}\n";
    
    // Check for logo-related settings
    $logoSettings = DB::table('settings')
        ->where('sort', 'config')
        ->where(function($query) {
            $query->where('item', 'like', '%logo%')
                  ->orWhere('item', 'like', '%restaurant%')
                  ->orWhere('item', 'like', '%site%');
        })
        ->get();
    
    echo "\n   Logo/Restaurant settings found: " . $logoSettings->count() . "\n";
    foreach ($logoSettings as $setting) {
        echo "     - {$setting->item}: " . (strlen($setting->value) > 50 ? substr($setting->value, 0, 50) . "..." : $setting->value) . "\n";
    }
} catch (\Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

echo "\n3. CHECKING DATABASE CONNECTION:\n";
echo str_repeat("-", 50) . "\n";
try {
    $dbName = DB::connection()->getDatabaseName();
    $dbHost = DB::connection()->getConfig('host');
    echo "   Database: {$dbName}\n";
    echo "   Host: {$dbHost}\n";
    echo "   Connection: " . DB::connection()->getName() . "\n";
} catch (\Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

echo "\n4. CHECKING FOR TENANT ISOLATION ISSUES:\n";
echo str_repeat("-", 50) . "\n";
try {
    // Check if we're using tenant connection
    $defaultConnection = config('database.default');
    echo "   Default connection: {$defaultConnection}\n";
    
    // Check if tenant middleware is active
    $tenantConfig = config('database.connections.tenant');
    if ($tenantConfig) {
        echo "   Tenant connection configured: YES\n";
        echo "   Tenant database: " . ($tenantConfig['database'] ?? 'NOT SET') . "\n";
    } else {
        echo "   Tenant connection configured: NO\n";
    }
} catch (\Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

echo "\n5. CHECKING CACHE:\n";
echo str_repeat("-", 50) . "\n";
try {
    $cacheDriver = config('cache.default');
    echo "   Cache driver: {$cacheDriver}\n";
    
    // Try to get settings from cache
    $cacheKey = 'igniter.setting.store';
    $cached = cache()->get($cacheKey);
    echo "   Settings cache key exists: " . ($cached ? "YES" : "NO") . "\n";
} catch (\Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

echo "\n6. CRITICAL BUG IDENTIFIED:\n";
echo str_repeat("-", 50) . "\n";
echo "   ⚠️  ISSUE FOUND IN DatabaseSettingStore::write() method!\n\n";
echo "   The write() method has aggressive deletion logic:\n";
echo "   - When saving settings, it compares ALL existing keys in DB\n";
echo "   - If a key exists in DB but NOT in the save data, it gets DELETED\n";
echo "   - This happens in: vendor/tastyigniter/flame/src/Setting/DatabaseSettingStore.php\n";
echo "   - Lines 160-186 contain the problematic logic\n\n";
echo "   HOW IT HAPPENS:\n";
echo "   1. You save 'general' settings (restaurant name, logos)\n";
echo "   2. Form only includes fields from 'general' tab\n";
echo "   3. write() method gets ALL settings from DB\n";
echo "   4. Any settings NOT in the form data get DELETED\n";
echo "   5. Your logos disappear!\n\n";

echo "7. RECOMMENDED SQL QUERIES TO RUN:\n";
echo str_repeat("-", 50) . "\n";
echo "   -- Check all config settings:\n";
echo "   SELECT * FROM ti_settings WHERE sort = 'config' ORDER BY item;\n\n";
echo "   -- Check for logo settings:\n";
echo "   SELECT * FROM ti_settings WHERE item LIKE '%logo%' OR item LIKE '%restaurant%';\n\n";
echo "   -- Check settings count over time (if you have audit log):\n";
echo "   SELECT COUNT(*) as total, DATE(created_at) as date FROM ti_settings GROUP BY DATE(created_at);\n\n";
echo "   -- Check recent deletions (if you have audit log):\n";
echo "   SELECT * FROM ti_settings WHERE updated_at < DATE_SUB(NOW(), INTERVAL 1 DAY);\n\n";

echo "\n8. HOW TO FIX:\n";
echo str_repeat("-", 50) . "\n";
echo "   The fix requires modifying DatabaseSettingStore::write() method to:\n";
echo "   - Only update/insert settings that are in the save data\n";
echo "   - NOT delete settings that aren't in the save data\n";
echo "   - This prevents accidental deletion of other settings\n\n";

echo "=== END OF INVESTIGATION ===\n";

