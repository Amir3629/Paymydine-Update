<?php


require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== COMBO BACKEND DIAGNOSTIC ===\n\n";

try {
    // 1. Check table prefix
    echo "1️⃣ Checking database connection...\n";
    $p = DB::connection()->getTablePrefix();
    echo "   Table prefix: '{$p}'\n";
    $dbName = DB::connection()->getDatabaseName();
    echo "   Database: {$dbName}\n";
    
    // 2. Check if menu_combos table exists
    echo "\n2️⃣ Checking menu_combos table...\n";
    $tableName = $p . 'menu_combos';
    $tableExists = DB::getSchemaBuilder()->hasTable('menu_combos');
    echo "   Table exists: " . ($tableExists ? "YES ✅" : "NO ❌") . "\n";
    
    if (!$tableExists) {
        echo "   ❌ ERROR: menu_combos table does not exist!\n";
        echo "   Check if table name is correct or if migration was run.\n";
        exit(1);
    }
    
    // 3. Check combos in database
    echo "\n3️⃣ Checking combos in database...\n";
    $totalCombos = DB::table('menu_combos')->count();
    echo "   Total combos in database: {$totalCombos}\n";
    
    $activeCombos = DB::table('menu_combos')
        ->where('combo_status', 1)
        ->count();
    echo "   Active combos (combo_status = 1): {$activeCombos}\n";
    
    if ($activeCombos === 0) {
        echo "   ⚠️  WARNING: No active combos found!\n";
        echo "   Checking all combos regardless of status...\n";
        $allCombos = DB::table('menu_combos')->get();
        echo "   Total combos (all statuses): " . count($allCombos) . "\n";
        
        if (count($allCombos) > 0) {
            echo "\n   Combo details:\n";
            foreach ($allCombos as $combo) {
                echo "   - ID: {$combo->combo_id}, Name: {$combo->combo_name}, Status: {$combo->combo_status}\n";
            }
            echo "\n   💡 TIP: Set combo_status = 1 to make combos active\n";
        }
    } else {
        echo "   ✅ Active combos found!\n";
        $combos = DB::table('menu_combos')
            ->where('combo_status', 1)
            ->get();
        
        echo "\n   Active combo details:\n";
        foreach ($combos as $combo) {
            echo "   - ID: {$combo->combo_id}, Name: {$combo->combo_name}, Price: \${$combo->combo_price}\n";
        }
    }
    
    // 4. Test the exact query used in MenuController
    echo "\n4️⃣ Testing MenuController query...\n";
    try {
        $combosQuery = "
            SELECT 
                mc.combo_id as id,
                mc.combo_name as name,
                mc.combo_description as description,
                CAST(mc.combo_price AS DECIMAL(10,2)) as price,
                'Combos' as category_name,
                ma.name as image
            FROM {$p}menu_combos mc
            LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menu_combos' 
                AND ma.attachment_id = mc.combo_id 
                AND ma.tag = 'thumb'
            WHERE mc.combo_status = 1
            ORDER BY mc.combo_priority ASC, mc.combo_name ASC
        ";
        
        $queryResult = DB::select($combosQuery);
        echo "   Query executed: SUCCESS ✅\n";
        echo "   Results returned: " . count($queryResult) . "\n";
        
        if (count($queryResult) > 0) {
            echo "\n   Query results:\n";
            foreach ($queryResult as $combo) {
                echo "   - {$combo->name} (ID: {$combo->id}, Price: \${$combo->price})\n";
                echo "     Image: " . ($combo->image ?: 'none') . "\n";
            }
        } else {
            echo "   ⚠️  Query returned 0 results even though active combos exist!\n";
            echo "   This might indicate a JOIN issue with media_attachments.\n";
        }
    } catch (\Exception $e) {
        echo "   ❌ Query failed: " . $e->getMessage() . "\n";
        echo "   SQL Error: " . $e->getCode() . "\n";
    }
    
    // 5. Check media_attachments table
    echo "\n5️⃣ Checking media_attachments table...\n";
    $mediaTableExists = DB::getSchemaBuilder()->hasTable('media_attachments');
    echo "   Table exists: " . ($mediaTableExists ? "YES ✅" : "NO ❌") . "\n";
    
    if ($mediaTableExists) {
        $comboMedia = DB::table('media_attachments')
            ->where('attachment_type', 'menu_combos')
            ->count();
        echo "   Combo media attachments: {$comboMedia}\n";
    }
    
    // 6. Check MenuController file
    echo "\n6️⃣ Checking MenuController file...\n";
    $controllerPath = __DIR__ . '/app/Http/Controllers/Api/MenuController.php';
    $fileExists = file_exists($controllerPath);
    echo "   File exists: " . ($fileExists ? "YES ✅" : "NO ❌") . "\n";
    
    if ($fileExists) {
        $fileContent = file_get_contents($controllerPath);
        $hasComboCode = strpos($fileContent, 'menu_combos') !== false;
        echo "   Contains combo code: " . ($hasComboCode ? "YES ✅" : "NO ❌") . "\n";
        
        if (!$hasComboCode) {
            echo "   ❌ ERROR: MenuController.php does not contain combo code!\n";
            echo "   The fix needs to be deployed to production.\n";
        }
    }
    
    // 7. Summary and recommendations
    echo "\n📊 === SUMMARY ===\n";
    echo "   Total combos: {$totalCombos}\n";
    echo "   Active combos: {$activeCombos}\n";
    echo "   Query results: " . (isset($queryResult) ? count($queryResult) : 'N/A') . "\n";
    
    if ($activeCombos === 0) {
        echo "\n   ❌ ISSUE: No active combos in database\n";
        echo "   → Solution: Set combo_status = 1 for combos in admin panel\n";
    } elseif (!isset($queryResult) || count($queryResult) === 0) {
        echo "\n   ❌ ISSUE: Query not returning combos\n";
        echo "   → Check SQL query syntax and table joins\n";
    } elseif (!$fileExists || !$hasComboCode) {
        echo "\n   ❌ ISSUE: MenuController.php missing combo code\n";
        echo "   → Deploy the fixed MenuController.php to production\n";
    } else {
        echo "\n   ✅ Everything looks good!\n";
        echo "   → If combos still not showing, check frontend filtering\n";
    }
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n✅ Diagnostic complete!\n";

