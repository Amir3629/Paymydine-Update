<?php

declare(strict_types=1);

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$options = getopt('', ['tenant-host:', 'apply', 'confirm:']);
$host = strtolower(trim((string)($options['tenant-host'] ?? '')));
$apply = array_key_exists('apply', $options);
$confirm = (string)($options['confirm'] ?? '');

$fail = static function (string $message, int $code = 1): void {
    fwrite(STDERR, "ERROR: {$message}\n");
    exit($code);
};

if ($host === '' || !preg_match('/^[a-z0-9][a-z0-9-]*\.paymydine\.com$/', $host)) {
    $fail('Pass an explicit --tenant-host=<tenant>.paymydine.com hostname.', 2);
}

$tenant = DB::connection('mysql')
    ->table('tenants')
    ->whereRaw('LOWER(domain) = ?', [$host])
    ->first();

if (!$tenant) {
    $fail('Tenant was not found in the central registry.', 3);
}

$database = trim((string)($tenant->database ?? ''));
if ($database === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $database)) {
    $fail('Tenant database identity is missing or invalid.', 4);
}

Config::set('database.connections.tenant.database', $database);
Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));

DB::purge('tenant');
DB::reconnect('tenant');

$connection = DB::connection('tenant');
$connection->getPdo();
$actualDatabase = trim((string)$connection->getDatabaseName());

if ($actualDatabase === '' || strcasecmp($actualDatabase, $database) !== 0) {
    $fail('Connected database does not match the tenant registry.', 5);
}

$schema = $connection->getSchemaBuilder();

if (!$schema->hasTable('orders')) {
    $fail('Tenant orders table does not exist.', 6);
}

$exists = $schema->hasColumn('orders', 'estimated_prep_minutes');

echo "PayMyDine ETA schema repair R1\n";
echo "==============================\n";
echo "TENANT:   {$host}\n";
echo "DATABASE: {$actualDatabase}\n";
echo 'COLUMN estimated_prep_minutes: '.($exists ? 'PRESENT' : 'MISSING').PHP_EOL;

if ($exists) {
    echo "RESULT: NOTHING TO CHANGE\n";
    exit(0);
}

if (!$apply) {
    echo "PREVIEW ONLY: column would be added as UNSIGNED SMALLINT NULL.\n";
    echo "Run again with --apply --confirm=ADD_ESTIMATED_PREP_MINUTES\n";
    exit(0);
}

if ($confirm !== 'ADD_ESTIMATED_PREP_MINUTES') {
    $fail('Refusing apply without --confirm=ADD_ESTIMATED_PREP_MINUTES.', 7);
}

$schema->table('orders', function (Blueprint $table): void {
    $table->unsignedSmallInteger('estimated_prep_minutes')->nullable();
});

if (!$schema->hasColumn('orders', 'estimated_prep_minutes')) {
    $fail('Column was not visible after ALTER TABLE.', 8);
}

echo "RESULT: ADDED estimated_prep_minutes\n";
