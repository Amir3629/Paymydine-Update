<?php

declare(strict_types=1);

use App\Services\Workforce\PmdStaffAttendanceSchemaService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$options = getopt('', ['tenant-host:', 'apply']);
$host = strtolower(trim((string)($options['tenant-host'] ?? '')));
$apply = array_key_exists('apply', $options);

$fail = static function (string $message, int $code = 1): void {
    fwrite(STDERR, "ERROR: {$message}\n");
    exit($code);
};

if ($host === '') {
    $fail('Pass --tenant-host=<tenant>.paymydine.com. No tenant is modified without an explicit host.', 2);
}
if (!preg_match('/^[a-z0-9][a-z0-9-]*\.paymydine\.com$/', $host)) {
    $fail('Tenant host must be an explicit *.paymydine.com hostname.', 2);
}

try {
    $tenant = DB::connection('mysql')
        ->table('tenants')
        ->where('domain', $host)
        ->first();
} catch (Throwable $error) {
    $fail('Central tenant registry could not be read: '.get_class($error), 3);
}

if (!$tenant) {
    $fail('Tenant was not found in the central registry.', 4);
}

$database = trim((string)($tenant->database ?? ''));
if ($database === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $database)) {
    $fail('Tenant database identity is missing or invalid.', 5);
}

Config::set('database.connections.tenant.database', $database);
Config::set(
    'database.connections.tenant.host',
    $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST'))
);
Config::set(
    'database.connections.tenant.port',
    $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT'))
);
Config::set(
    'database.connections.tenant.username',
    $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME'))
);
Config::set(
    'database.connections.tenant.password',
    $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD'))
);

DB::purge('tenant');
DB::reconnect('tenant');
DB::setDefaultConnection('tenant');
$app->instance('tenant', $tenant);

$connection = DB::connection('tenant');
$connection->getPdo();
$actualDatabase = trim((string)$connection->getDatabaseName());
if ($actualDatabase === '' || strcasecmp($actualDatabase, $database) !== 0) {
    $fail('Connected tenant database does not match the registry tenant.', 6);
}

/** @var PmdStaffAttendanceSchemaService $schema */
$schema = app(PmdStaffAttendanceSchemaService::class);

try {
    $before = $schema->status('tenant');
} catch (Throwable $error) {
    $fail('Attendance schema status failed: '.get_class($error), 7);
}

echo "====================================================\n";
echo "PMD STAFF ATTENDANCE CANARY\n";
echo "====================================================\n";
echo "TENANT: {$host}\n";
echo "DATABASE: {$before['database']}\n";
echo "PHYSICAL TABLE: {$before['physical_table']}\n";
echo 'MODE: '.($apply ? 'APPLY' : 'READ-ONLY')."\n";
echo 'TABLE EXISTS: '.($before['exists'] ? 'YES' : 'NO')."\n";
echo 'CANONICAL READY: '.($before['ready'] ? 'YES' : 'NO')."\n";
if ($before['missing_columns'] !== []) {
    echo 'MISSING COLUMNS: '.implode(', ', (array)$before['missing_columns'])."\n";
}

if (!$apply) {
    echo "\nREAD-ONLY STATUS COMPLETE.\n";
    echo "Re-run with --apply to create/repair only the attendance schema for this explicit tenant.\n";
    exit(0);
}

try {
    $after = $schema->ensure('tenant');
} catch (Throwable $error) {
    $fail('Attendance schema apply failed: '.$error->getMessage(), 8);
}

if (!$after['ready']) {
    $fail('Attendance schema did not become ready.', 9);
}

$rowCount = (int)DB::connection('tenant')->table('staff_attendance')->count();
$openCount = (int)DB::connection('tenant')->table('staff_attendance')
    ->whereNull('check_out_time')
    ->count();

$linkedStaff = 0;
try {
    $linkedStaff = (int)DB::connection('tenant')
        ->table('pmd_operational_people')
        ->whereNotNull('staff_id')
        ->where('staff_id', '>', 0)
        ->where('is_active', 1)
        ->distinct()
        ->count('staff_id');
} catch (Throwable $ignored) {
}

echo "\n====================================================\n";
echo "APPLY RESULT\n";
echo "====================================================\n";
echo 'CREATED TABLE: '.(!empty($after['created']) ? 'YES' : 'NO')."\n";
echo 'ADDED COLUMNS: '.($after['added_columns'] ? implode(', ', $after['added_columns']) : 'none')."\n";
echo 'CANONICAL READY: '.($after['ready'] ? 'YES' : 'NO')."\n";
echo "ATTENDANCE ROWS: {$rowCount}\n";
echo "OPEN CLOCK SESSIONS: {$openCount}\n";
echo "ACTIVE TEAM LINKS: {$linkedStaff}\n";
echo "HISTORICAL BACKFILL: NONE\n";
echo "\nPMD attendance storage is ready. Actual worked hours begin only from real clock-in/check-out records.\n";
