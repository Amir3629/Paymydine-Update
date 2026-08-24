<?php

declare(strict_types=1);

$root = getenv('PMD_ROOT') ?: '/var/www/paymydine';
$foundationFile = $argv[1] ?? ($root.'/app/Services/PmdCashDrawerFoundationR1.php');
$scopeDomain = trim((string)(getenv('PMD_TENANT_DOMAIN') ?: ''));
$bootstrapDomain = trim((string)(getenv('PMD_BOOTSTRAP_DOMAIN') ?: ''));

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

if (!class_exists(\App\Services\PmdCashDrawerFoundationR1::class, false)) {
    require $foundationFile;
}

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use App\Services\PmdCashDrawerFoundationR1;

$central = DB::connection('mysql');
$query = $central->table('tenants');
if ($scopeDomain !== '') {
    $query->where('domain', $scopeDomain);
}
$tenants = $query->get();
if ($scopeDomain !== '' && $tenants->count() !== 1) {
    fwrite(STDERR, "Tenant not found: {$scopeDomain}\n");
    exit(20);
}

$originalDefault = DB::getDefaultConnection();
$originalTenantConfig = (array)Config::get('database.connections.tenant', []);
$baseTenantConfig = $originalTenantConfig ?: (array)Config::get('database.connections.mysql', []);
$failures = [];
$successes = 0;

foreach ($tenants as $tenant) {
    $domain = trim((string)($tenant->domain ?? ''));
    $database = trim((string)($tenant->database ?? ''));
    if ($database === '') {
        $failures[] = ['domain' => $domain, 'error' => 'missing database'];
        continue;
    }

    $cfg = $baseTenantConfig;
    $cfg['database'] = $database;
    foreach (['host' => 'db_host', 'port' => 'db_port', 'username' => 'db_user', 'password' => 'db_pass'] as $key => $field) {
        if (isset($tenant->{$field}) && $tenant->{$field} !== null && $tenant->{$field} !== '') {
            $cfg[$key] = $tenant->{$field};
        }
    }

    try {
        Config::set('database.connections.tenant', $cfg);
        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');

        $bootstrap = $bootstrapDomain !== '' && strcasecmp($bootstrapDomain, $domain) === 0;
        $report = (new PmdCashDrawerFoundationR1())->repairCurrentTenant($bootstrap);
        $successes++;
        echo json_encode([
            'domain' => $domain,
            'database' => $database,
            'ok' => true,
            'bootstrap' => $bootstrap,
            'created' => $report['created'] ?? [],
            'columns_added' => $report['columns_added'] ?? [],
            'indexes_added' => $report['indexes_added'] ?? [],
            'bootstrap_result' => $report['bootstrap'] ?? null,
        ], JSON_UNESCAPED_SLASHES).PHP_EOL;
    } catch (\Throwable $error) {
        $failures[] = ['domain' => $domain, 'database' => $database, 'error' => $error->getMessage()];
        fwrite(STDERR, json_encode(end($failures), JSON_UNESCAPED_SLASHES).PHP_EOL);
    } finally {
        try { DB::purge('tenant'); } catch (\Throwable $ignored) {}
        Config::set('database.connections.tenant', $originalTenantConfig);
        DB::setDefaultConnection($originalDefault);
    }
}

echo 'TENANTS_OK='.$successes.PHP_EOL;
echo 'TENANTS_FAILED='.count($failures).PHP_EOL;
if ($failures) {
    exit(21);
}
