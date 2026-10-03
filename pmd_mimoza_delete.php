<?php

use Illuminate\Support\Facades\DB;
use Admin\Models\Menus_model;
use Admin\Models\Menu_combos_model;

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

/*
|--------------------------------------------------------------------------
| FORCE MIMOZA DATABASE
|--------------------------------------------------------------------------
*/

config([
    'database.connections.mysql.database' => 'mimoza',
    'database.connections.tenant.database' => 'mimoza',
]);

DB::purge('mysql');
DB::purge('tenant');

DB::reconnect('mysql');

$dbName = DB::connection('mysql')->getDatabaseName();

echo "CONNECTED DATABASE: {$dbName}".PHP_EOL;

if ($dbName !== 'mimoza') {
    echo "ABORTED: NOT CONNECTED TO MIMOZA".PHP_EOL;
    exit(1);
}

/*
|--------------------------------------------------------------------------
| Targets
|--------------------------------------------------------------------------
*/

$foodNames = [
    'Buddha Bowl',
    'Ghormeh Sabzi',
    'Jackfruit Tacos',
    'Joojeh Kebab',
    'Koobideh Kebab',
    'Mushroom Risotto',
    'Nigiri Selection',
    'Ramen',
    'Schnitzel',
    'Schweinshaxe',
    'Green Smoothie',
    'Matcha Tea',
    'Matcha Latte',
    'Persian Bastani',
    'Cheesecake',
    'Mochi',
    'Apple Strudel',
    'Fluffy Pancakes',
    'Cola',
    'Avocado Toast',
    'Butter Croissant',
    'new test march',
    'Cola Bacardi',
    'Deposit',
    'Spritzer 0,25l',
    'ad^',
    'Soda Lemon',
    'Kashke Bademjan',
    'Beet Hummus',
    'Edamame',
    'Gyoza',
    'Mast-o Khiar',
    'Deposit return',
    'Cola (incl. bottle deposit)',
    'Steak',
    'Spaghetti',
    'TEst ermzutpia',
    'TEST here 123',
    'kebab',
    'pizza',
    'jooje',
    'Amir Test',
];

$comboNames = [
    'testcombo',
    'Combain',
    'qwe',
    'Amircombo',
];

/*
|--------------------------------------------------------------------------
| Force models to mysql connection now pointing to mimoza
|--------------------------------------------------------------------------
*/

$foodModel = new Menus_model;
$foodModel->setConnection('mysql');

$comboModel = new Menu_combos_model;
$comboModel->setConnection('mysql');

$foods = $foodModel->newQuery()
    ->whereIn('menu_name', $foodNames)
    ->get();

$combos = $comboModel->newQuery()
    ->whereIn('combo_name', $comboNames)
    ->get();

echo "FOUND FOODS: ".$foods->count().PHP_EOL;
foreach ($foods as $food) {
    echo "FOOD #{$food->menu_id} | {$food->menu_name}".PHP_EOL;
}

echo "FOUND COMBOS: ".$combos->count().PHP_EOL;
foreach ($combos as $combo) {
    echo "COMBO #{$combo->combo_id} | {$combo->combo_name}".PHP_EOL;
}

/*
|--------------------------------------------------------------------------
| Safety backup to JSON
|--------------------------------------------------------------------------
*/

$backup = [
    'database' => $dbName,
    'created_at' => date('c'),
    'foods' => $foods->toArray(),
    'combos' => $combos->toArray(),
];

$backupFile = __DIR__.'/storage/mimoza_menu_delete_backup_'.date('Ymd_His').'.json';

file_put_contents(
    $backupFile,
    json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

echo "BACKUP: {$backupFile}".PHP_EOL;

/*
|--------------------------------------------------------------------------
| Delete
|--------------------------------------------------------------------------
*/

DB::connection('mysql')->beginTransaction();

try {

    foreach ($combos as $combo) {
        $combo->setConnection('mysql');
        echo "Deleting combo: {$combo->combo_name} ... ";
        $combo->delete();
        echo "OK".PHP_EOL;
    }

    foreach ($foods as $food) {
        $food->setConnection('mysql');
        echo "Deleting food: {$food->menu_name} ... ";
        $food->delete();
        echo "OK".PHP_EOL;
    }

    DB::connection('mysql')->commit();

} catch (Throwable $e) {

    DB::connection('mysql')->rollBack();

    echo "ERROR: ".$e->getMessage().PHP_EOL;
    echo "ROLLED BACK".PHP_EOL;

    exit(1);
}

/*
|--------------------------------------------------------------------------
| Verify
|--------------------------------------------------------------------------
*/

$remainingFoods = $foodModel->newQuery()
    ->whereIn('menu_name', $foodNames)
    ->count();

$remainingCombos = $comboModel->newQuery()
    ->whereIn('combo_name', $comboNames)
    ->count();

echo PHP_EOL;
echo "REMAINING FOODS: {$remainingFoods}".PHP_EOL;
echo "REMAINING COMBOS: {$remainingCombos}".PHP_EOL;

if ($remainingFoods === 0 && $remainingCombos === 0) {
    echo "SUCCESS: CLEANUP COMPLETE".PHP_EOL;
} else {
    echo "WARNING: SOME RECORDS STILL REMAIN".PHP_EOL;
}
