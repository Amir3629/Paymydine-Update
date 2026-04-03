<?php


require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== COMBO DEPLOYMENT VERIFICATION ===\n\n";

// 1. Check if MenuController has combo code
echo "1️⃣ Checking MenuController.php...\n";
$controllerPath = __DIR__ . '/app/Http/Controllers/Api/MenuController.php';
if (!file_exists($controllerPath)) {
    echo "   ❌ File not found: {$controllerPath}\n";
    exit(1);
}

$fileContent = file_get_contents($controllerPath);
$hasComboQuery = strpos($fileContent, 'menu_combos') !== false;
$hasIsCombo = strpos($fileContent, 'isCombo') !== false;
$hasMergeCombos = strpos($fileContent, 'array_merge($items, $combos)') !== false;

echo "   File exists: YES ✅\n";
echo "   Has menu_combos query: " . ($hasComboQuery ? "YES ✅" : "NO ❌") . "\n";
echo "   Has isCombo flag: " . ($hasIsCombo ? "YES ✅" : "NO ❌") . "\n";
echo "   Has merge logic: " . ($hasMergeCombos ? "YES ✅" : "NO ❌") . "\n";

if (!$hasComboQuery || !$hasIsCombo || !$hasMergeCombos) {
    echo "\n   ❌ ERROR: MenuController.php is missing combo code!\n";
    echo "   → Deploy the fixed MenuController.php file\n";
    exit(1);
}

// 2. Check database for combos
echo "\n2️⃣ Checking database...\n";
$p = DB::connection()->getTablePrefix();
$tableExists = DB::getSchemaBuilder()->hasTable('menu_combos');

if (!$tableExists) {
    echo "   ❌ menu_combos table does not exist!\n";
    exit(1);
}

$totalCombos = DB::table('menu_combos')->count();
$activeCombos = DB::table('menu_combos')->where('combo_status', 1)->count();

echo "   Table exists: YES ✅\n";
echo "   Total combos: {$totalCombos}\n";
echo "   Active combos (status=1): {$activeCombos}\n";

if ($activeCombos === 0) {
    echo "\n   ⚠️  WARNING: No active combos in database!\n";
    echo "   → Go to admin panel and set combo_status = 1 for your combos\n";
    
    // Show all combos
    $allCombos = DB::table('menu_combos')->get();
    if (count($allCombos) > 0) {
        echo "\n   All combos in database:\n";
        foreach ($allCombos as $combo) {
            echo "   - ID: {$combo->combo_id}, Name: {$combo->combo_name}, Status: {$combo->combo_status}\n";
        }
    }
}

// 3. Test the API endpoint
echo "\n3️⃣ Testing API endpoint...\n";
try {
    $request = \Illuminate\Http\Request::create('/api/v1/menu', 'GET');
    $response = app()->handle($request);
    $statusCode = $response->getStatusCode();
    
    echo "   API status: {$statusCode}\n";
    
    if ($statusCode === 200) {
        $data = json_decode($response->getContent(), true);
        $items = $data['data']['items'] ?? [];
        $combos = array_filter($items, function($item) {
            return isset($item['isCombo']) && $item['isCombo'] === true;
        });
        
        echo "   Total items: " . count($items) . "\n";
        echo "   Combos in API: " . count($combos) . "\n";
        
        if (count($combos) > 0) {
            echo "   ✅ SUCCESS! API is returning combos!\n";
            echo "\n   Combos returned:\n";
            foreach ($combos as $combo) {
                echo "   - {$combo['name']} (ID: {$combo['id']}, Price: \${$combo['price']})\n";
            }
        } else {
            echo "   ❌ API is NOT returning combos!\n";
            if ($activeCombos > 0) {
                echo "   → Even though {$activeCombos} active combos exist in database\n";
                echo "   → This means MenuController query is failing\n";
                echo "   → Check for SQL errors in logs\n";
            }
        }
    } else {
        echo "   ❌ API returned error status: {$statusCode}\n";
    }
} catch (\Exception $e) {
    echo "   ❌ Error testing API: " . $e->getMessage() . "\n";
}

// 4. Summary
echo "\n📊 === SUMMARY ===\n";
if ($hasComboQuery && $hasIsCombo && $hasMergeCombos) {
    echo "   ✅ MenuController.php has combo code\n";
} else {
    echo "   ❌ MenuController.php missing combo code\n";
}

if ($activeCombos > 0) {
    echo "   ✅ Active combos exist in database ({$activeCombos})\n";
} else {
    echo "   ❌ No active combos in database\n";
}

echo "\n✅ Verification complete!\n";

