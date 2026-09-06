<?php

declare(strict_types=1);

use App\Services\AI\AiHealthService;
use App\Services\AI\AiRetentionService;
use App\Services\AI\AiUsageLedger;
use App\Services\AI\PmdAiTenantPolicyService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$options = getopt('', ['tenant-host:']);
$host = strtolower(trim((string)($options['tenant-host'] ?? '')));

$fail = static function (string $message, int $code = 1): void {
    fwrite(STDERR, "ERROR: {$message}\n");
    exit($code);
};

if ($host === '') {
    $fail('Pass --tenant-host=<tenant>.paymydine.com. Maintenance never guesses a tenant.', 2);
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

$health = app(AiHealthService::class)->status();
$retention = app(AiRetentionService::class)->purge();
$usage = app(AiUsageLedger::class)->snapshot();
$policy = app(PmdAiTenantPolicyService::class)->snapshot();

echo "PMD AI MAINTENANCE\n";
echo "==================\n";
echo 'TENANT: '.$host.PHP_EOL;
echo 'DATABASE: '.$actualDatabase.PHP_EOL;
echo 'PROVIDER: '.($health['provider'] ?: '(unset)').PHP_EOL;
echo 'MODEL: '.($health['model'] ?: '(unset)').PHP_EOL;
echo 'CONFIGURED: '.(!empty($health['configured']) ? 'YES' : 'NO').PHP_EOL;
echo 'AVAILABLE_FOR_TRAFFIC: '.(!empty($health['available_for_traffic']) ? 'YES' : 'NO').PHP_EOL;
echo 'HEALTHY: '.($health['healthy'] === null ? 'UNKNOWN' : ($health['healthy'] ? 'YES' : 'NO')).PHP_EOL;
echo 'LAST_SUCCESS_AT: '.($health['last_success_at'] ?? 'none').PHP_EOL;
echo 'LAST_FAILURE_AT: '.($health['last_failure_at'] ?? 'none').PHP_EOL;
echo 'LAST_ERROR_CLASS: '.($health['last_error_class'] ?? 'none').PHP_EOL;
echo 'TENANT_POLICY_SOURCE: '.($policy['source'] ?? 'unknown').PHP_EOL;
echo 'ADMIN_AI_ENABLED: '.(!empty($policy['admin_enabled']) ? 'YES' : 'NO').PHP_EOL;
echo 'GUEST_AI_ENABLED: '.(!empty($policy['guest_enabled']) ? 'YES' : 'NO').PHP_EOL;
echo 'ADMIN_CHAT_ROWS_DELETED: '.(int)($retention['admin_deleted'] ?? 0).PHP_EOL;
echo 'GUEST_CHAT_ROWS_DELETED: '.(int)($retention['guest_deleted'] ?? 0).PHP_EOL;
echo 'USAGE_LEDGER_ROWS_DELETED: '.(int)($retention['usage_deleted'] ?? 0).PHP_EOL;
echo 'USAGE_SURFACES_TODAY: '.implode(',', array_keys($usage)).PHP_EOL;
