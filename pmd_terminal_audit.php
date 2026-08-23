<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

config([
    'database.connections.mysql.database' => 'mimoza',
]);

DB::purge('mysql');
DB::reconnect('mysql');
DB::setDefaultConnection('mysql');

$db = DB::connection('mysql');

echo PHP_EOL;
echo "========================================".PHP_EOL;
echo " PMD TERMINAL AUDIT".PHP_EOL;
echo "========================================".PHP_EOL;
echo "DATABASE: ".$db->getDatabaseName().PHP_EOL;

if ($db->getDatabaseName() !== 'mimoza') {
    echo "ABORT: WRONG DATABASE".PHP_EOL;
    exit(1);
}

$schema = $db->getSchemaBuilder();

$tables = [
    'terminal_devices',
    'terminal_devices_platform',
    'pos_devices',
    'pos_configs',
    'payment_methods',
    'payment_providers',
    'payment_attempts',
];

echo PHP_EOL."--- TABLE STATUS ---".PHP_EOL;

foreach ($tables as $table) {
    if (!$schema->hasTable($table)) {
        echo str_pad($table, 30)." MISSING".PHP_EOL;
        continue;
    }

    echo str_pad($table, 30)." ".$db->table($table)->count()." rows".PHP_EOL;
}

echo PHP_EOL."--- PHYSICAL TERMINAL TABLES ---".PHP_EOL;

foreach ($db->select("SHOW TABLES") as $row) {
    $name = array_values((array)$row)[0];

    if (
        stripos($name, 'terminal') !== false ||
        stripos($name, 'payment_attempt') !== false
    ) {
        echo $name.PHP_EOL;
    }
}

function printSafeRows($db, $schema, $table, array $wanted)
{
    if (!$schema->hasTable($table)) return;

    $columns = $schema->getColumnListing($table);
    $fields = array_values(array_intersect($wanted, $columns));

    echo PHP_EOL."--- {$table} ---".PHP_EOL;
    echo "COLUMNS: ".implode(', ', $columns).PHP_EOL;

    if (!$fields) return;

    foreach ($db->table($table)->select($fields)->limit(50)->get() as $row) {
        echo json_encode(
            $row,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ).PHP_EOL;
    }
}

printSafeRows($db, $schema, 'terminal_devices', [
    'terminal_device_id',
    'provider_code',
    'location_id',
    'reader_id',
    'reader_label',
    'pairing_state',
    'terminal_status',
    'is_active',
    'created_at',
    'updated_at',
]);

printSafeRows($db, $schema, 'terminal_devices_platform', [
    'id',
    'name',
    'status',
    'model',
    'connection_type',
    'location',
    'last_active',
    'last_sync',
]);

printSafeRows($db, $schema, 'pos_devices', [
    'device_id',
    'name',
    'code',
    'device_type',
    'is_local_terminal',
    'device_status',
    'last_seen_at',
]);

printSafeRows($db, $schema, 'pos_configs', [
    'config_id',
    'device_id',
    'url',
    'exists_webhook',
    'created_at',
    'updated_at',
]);

printSafeRows($db, $schema, 'payment_methods', [
    'id',
    'payment_id',
    'code',
    'name',
    'provider_code',
    'status',
    'priority',
]);

if ($schema->hasTable('payment_attempts')) {
    echo PHP_EOL."--- PAYMENT ATTEMPT STATUS ---".PHP_EOL;

    $groups = $db->table('payment_attempts')
        ->select('provider_code', 'status', DB::raw('COUNT(*) AS total'))
        ->groupBy('provider_code', 'status')
        ->get();

    foreach ($groups as $row) {
        echo json_encode($row).PHP_EOL;
    }
}

if ($schema->hasTable('migrations')) {
    echo PHP_EOL."--- TERMINAL/PAYMENT MIGRATIONS ---".PHP_EOL;

    foreach (
        $db->table('migrations')
            ->where(function ($q) {
                $q->where('migration', 'like', '%terminal%')
                  ->orWhere('migration', 'like', '%payment_attempt%')
                  ->orWhere('migration', 'like', '%sumup%');
            })
            ->orderBy('id')
            ->get(['migration', 'batch']) as $row
    ) {
        echo $row->migration." | batch ".$row->batch.PHP_EOL;
    }
}

echo PHP_EOL."AUDIT COMPLETE - NOTHING CHANGED".PHP_EOL;
