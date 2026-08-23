<?php

use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

/*
|--------------------------------------------------------------------------
| FORCE MIMOZA
|--------------------------------------------------------------------------
*/

config([
    'database.connections.mysql.database' => 'mimoza',
]);

DB::purge('mysql');
DB::reconnect('mysql');

$db = DB::connection('mysql');
$dbName = $db->getDatabaseName();

echo PHP_EOL;
echo "CONNECTED DATABASE: ".$dbName.PHP_EOL;

if ($dbName !== 'mimoza') {
    echo "ABORTED - WRONG DATABASE".PHP_EOL;
    exit(1);
}

/*
|--------------------------------------------------------------------------
| Tables to empty
|--------------------------------------------------------------------------
|
| Orders:
| - all orders
| - order items/options/totals/notes
| - payment attempts/transactions/logs
|
| Floor/table system:
| - restaurant tables
| - table groups / notes / merges
| - floor plan state
| - waiter/table assignments
| - reservations attached to tables
| - QR/table mappings
|
*/

$tables = [

    // ORDER DATA
    'order_menu_options',
    'order_menus',
    'order_notes',
    'order_payment_transaction_items',
    'order_payment_transactions',
    'order_totals',
    'payment_attempts',
    'payment_logs',
    'payments',
    'status_history',
    'orders',

    // TABLE / FLOOR MAP DEPENDENCIES
    'reservation_tables',
    'table_group_tables',
    'table_groups',
    'table_notes',

    'pmd_table_merges',
    'pmd_table_status_history',
    'pmd_waiter_table_assignments',

    'waiter_calls',
    'waiter_requests',

    // EXTERNAL TABLE MAPPINGS
    'r2o_table_map',

    // QR TABLE DATA
    'qr_code',

    // ACTUAL RESTAURANT TABLES
    'tables',
];


/*
|--------------------------------------------------------------------------
| Show BEFORE counts
|--------------------------------------------------------------------------
*/

echo PHP_EOL;
echo "========== BEFORE ==========".PHP_EOL;

foreach ($tables as $table) {

    if (!$db->getSchemaBuilder()->hasTable($table)) {
        echo str_pad($table, 40)." MISSING - SKIP".PHP_EOL;
        continue;
    }

    try {
        $count = $db->table($table)->count();
        echo str_pad($table, 40)." ".$count.PHP_EOL;
    } catch (Throwable $e) {
        echo str_pad($table, 40)." ERROR: ".$e->getMessage().PHP_EOL;
    }
}


/*
|--------------------------------------------------------------------------
| Floor registry
|--------------------------------------------------------------------------
*/

$floorRegistryCount = 0;

if ($db->getSchemaBuilder()->hasTable('location_options')) {

    $floorRegistryCount = $db
        ->table('location_options')
        ->where('item', 'pmd_shared_floor_registry_v1')
        ->count();

    echo str_pad('FLOOR REGISTRY', 40)." ".$floorRegistryCount.PHP_EOL;
}


/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

echo PHP_EOL;
echo "RESETTING MIMOZA...".PHP_EOL;

try {

    $db->statement('SET FOREIGN_KEY_CHECKS=0');

    /*
     * Remove custom floors + table-to-floor assignments.
     *
     * The application will recreate a clean default Main Floor when needed.
     */
    if ($db->getSchemaBuilder()->hasTable('location_options')) {

        $deletedFloors = $db
            ->table('location_options')
            ->where('item', 'pmd_shared_floor_registry_v1')
            ->delete();

        echo "Floor registry removed: ".$deletedFloors.PHP_EOL;
    }

    /*
     * Empty operational tables.
     */
    foreach ($tables as $table) {

        if (!$db->getSchemaBuilder()->hasTable($table)) {
            continue;
        }

        echo "Clearing ".$table." ... ";

        $physicalTable = $db->getTablePrefix().$table;

        $db->statement(
            'TRUNCATE TABLE `'.str_replace('`', '``', $physicalTable).'`'
        );

        echo "OK".PHP_EOL;
    }

    $db->statement('SET FOREIGN_KEY_CHECKS=1');

} catch (Throwable $e) {

    try {
        $db->statement('SET FOREIGN_KEY_CHECKS=1');
    } catch (Throwable $ignored) {}

    echo PHP_EOL;
    echo "RESET ERROR: ".$e->getMessage().PHP_EOL;
    exit(1);
}


/*
|--------------------------------------------------------------------------
| VERIFY
|--------------------------------------------------------------------------
*/

echo PHP_EOL;
echo "========== AFTER ==========".PHP_EOL;

$remaining = 0;

foreach ($tables as $table) {

    if (!$db->getSchemaBuilder()->hasTable($table)) {
        continue;
    }

    $count = $db->table($table)->count();

    echo str_pad($table, 40)." ".$count.PHP_EOL;

    $remaining += $count;
}

$remainingFloors = 0;

if ($db->getSchemaBuilder()->hasTable('location_options')) {

    $remainingFloors = $db
        ->table('location_options')
        ->where('item', 'pmd_shared_floor_registry_v1')
        ->count();

    echo str_pad('FLOOR REGISTRY', 40)." ".$remainingFloors.PHP_EOL;
}

echo PHP_EOL;

if ($remaining === 0 && $remainingFloors === 0) {

    echo "============================================".PHP_EOL;
    echo "SUCCESS - MIMOZA TEST DATA RESET COMPLETE".PHP_EOL;
    echo "Orders: EMPTY".PHP_EOL;
    echo "Tables: EMPTY".PHP_EOL;
    echo "Floors: RESET".PHP_EOL;
    echo "============================================".PHP_EOL;

} else {

    echo "WARNING - SOME DATA STILL REMAINS".PHP_EOL;
}

