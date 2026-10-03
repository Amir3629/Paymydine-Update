#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\Platform\CountryPlatformProfileRegistry;
use Igniter\Flame\Setting\DatabaseSettingStore;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);
$options = getopt('', ['apply', 'domain::', 'help']);

if (isset($options['help'])) {
    echo <<<TXT
Usage:
  php scripts/pmd-repair-oman-admin-supported-languages-r8.php
  php scripts/pmd-repair-oman-admin-supported-languages-r8.php --apply
  php scripts/pmd-repair-oman-admin-supported-languages-r8.php --domain=omantest.paymydine.com --apply

Without --apply this is read-only.
With --apply it only replaces the framework config setting family
supported_languages / supported_languages.* for matching Oman tenants with the
canonical Flame dotted representation:
  supported_languages.0 = en
  supported_languages.1 = ar

It then verifies the value twice: once through the tenant database opened as
mysql (deployment path) and once through the tenant connection used by HTTP
TenantDatabaseMiddleware. No payment/currency/order/reservation/menu/category/
business data is changed.

TXT;
    exit(0);
}

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apply = isset($options['apply']);
$domain = strtolower(trim((string)($options['domain'] ?? '')));
if ($domain !== '' && !str_contains($domain, '.')) {
    $domain .= '.paymydine.com';
}

if (!Schema::connection('mysql')->hasTable('tenants')) {
    fwrite(STDERR, "[FAIL] Central tenants table is missing.\n");
    exit(2);
}

$registry = new CountryPlatformProfileRegistry();
$query = DB::connection('mysql')->table('tenants');
if ($domain !== '') {
    $query->whereRaw('LOWER(domain) = ?', [$domain]);
}

$targets = [];
foreach ($query->orderBy('id')->get() as $tenant) {
    $profile = $registry->profile((string)($tenant->country ?? ''));
    if (!$profile || ($profile['country_code'] ?? null) !== CountryPlatformProfileRegistry::OMAN) {
        continue;
    }

    $database = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
    if ($database === '') {
        fwrite(STDERR, '[FAIL] Oman tenant has no database: '.(string)($tenant->domain ?? $tenant->id ?? 'unknown').PHP_EOL);
        exit(3);
    }

    $targets[] = $tenant;
}

if (!$targets) {
    fwrite(STDERR, $domain !== ''
        ? "[FAIL] Requested domain is not an Oman tenant: {$domain}\n"
        : "[FAIL] No Oman tenants were found.\n");
    exit(4);
}

echo '[INFO] Mode: '.($apply ? 'APPLY' : 'DRY-RUN').PHP_EOL;
echo '[INFO] Oman tenants matched: '.count($targets).PHP_EOL;
foreach ($targets as $tenant) {
    echo sprintf("  - %s [%s]\n", (string)$tenant->domain, (string)($tenant->database ?? $tenant->database_name));
}

$originalDefault = DB::getDefaultConnection();
$mysqlOriginal = connectionSnapshot('mysql');
$tenantOriginal = connectionSnapshot('tenant');
$failures = 0;
$results = [];

foreach ($targets as $tenant) {
    $tenantDomain = (string)($tenant->domain ?? '');
    $database = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
    $cacheKey = 'igniter.setting.system.tenant.'.sha1(strtolower($database));

    try {
        configureConnectionForTenant('mysql', $tenant, $database);
        DB::purge('mysql');
        DB::reconnect('mysql');
        DB::setDefaultConnection('mysql');

        if (!Schema::connection('mysql')->hasTable('settings')) {
            throw new RuntimeException('Tenant settings table is missing.');
        }
        if (!Schema::connection('mysql')->hasTable('languages')) {
            throw new RuntimeException('Tenant languages table is missing.');
        }

        $settingsColumns = Schema::connection('mysql')->getColumnListing('settings');
        if (!in_array('item', $settingsColumns, true) || !in_array('value', $settingsColumns, true)) {
            throw new RuntimeException('Tenant settings table does not expose item/value columns.');
        }

        $beforeRows = supportedLanguageRows('mysql', $settingsColumns);
        $languageRows = DB::connection('mysql')->table('languages')
            ->whereIn('code', ['en', 'ar'])
            ->orderBy('code')
            ->get()
            ->map(static fn ($row) => (array)$row)
            ->all();

        $activeCodes = [];
        foreach ($languageRows as $row) {
            $statusOk = !array_key_exists('status', $row) || (int)$row['status'] === 1;
            if ($statusOk) {
                $activeCodes[] = strtolower(trim((string)($row['code'] ?? '')));
            }
        }
        $activeCodes = normalizeLocales($activeCodes);
        if (!in_array('en', $activeCodes, true) || !in_array('ar', $activeCodes, true)) {
            throw new RuntimeException('Enabled tenant language rows are not en,ar; refusing setting-only repair.');
        }

        if (!$apply) {
            echo "[DRY] {$tenantDomain}: supported_languages rows = ".json_encode($beforeRows, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;
            $results[] = [
                'domain' => $tenantDomain,
                'database' => $database,
                'ok' => true,
                'mode' => 'dry-run',
                'active_language_rows' => $activeCodes,
                'supported_language_rows_before' => $beforeRows,
                'setting_cache_key' => $cacheKey,
            ];
            continue;
        }

        DB::connection('mysql')->transaction(function () use ($settingsColumns): void {
            $query = DB::connection('mysql')->table('settings');
            if (in_array('sort', $settingsColumns, true)) {
                $query->where('sort', 'config');
            }
            $query->where(function ($inner) {
                $inner->where('item', 'supported_languages')
                    ->orWhere('item', 'like', 'supported_languages.%');
            })->delete();

            insertSettingRow('mysql', $settingsColumns, 'supported_languages.0', 'en');
            insertSettingRow('mysql', $settingsColumns, 'supported_languages.1', 'ar');
        });

        $afterRows = supportedLanguageRows('mysql', $settingsColumns);
        $expectedRows = [
            ['item' => 'supported_languages.0', 'value' => 'en'],
            ['item' => 'supported_languages.1', 'value' => 'ar'],
        ];
        $normalizedAfterRows = array_map(static fn (array $row): array => [
            'item' => (string)($row['item'] ?? ''),
            'value' => (string)($row['value'] ?? ''),
        ], $afterRows);
        if ($normalizedAfterRows !== $expectedRows) {
            throw new RuntimeException('Canonical dotted supported_languages rows were not persisted exactly.');
        }

        $mysqlRuntime = verifyStoreOnConnection('mysql', $cacheKey);
        $mysqlSupported = normalizeLocales($mysqlRuntime['supported_languages'] ?? []);
        if ($mysqlSupported !== ['en', 'ar']) {
            throw new RuntimeException('Deployment-path setting store did not resolve supported_languages=en,ar.');
        }

        configureConnectionForTenant('tenant', $tenant, $database);
        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');

        $httpRuntime = verifyStoreOnConnection('tenant', $cacheKey);
        $httpSupported = normalizeLocales($httpRuntime['supported_languages'] ?? []);
        if ($httpSupported !== ['en', 'ar']) {
            throw new RuntimeException('HTTP tenant setting store did not resolve supported_languages=en,ar.');
        }

        foreach (['system.setting', 'system.parameter', 'setting.manager', 'translator.localization'] as $abstract) {
            app()->forgetInstance($abstract);
        }

        echo "[OK] {$tenantDomain}: canonical rows=en,ar; mysql-store=en,ar; HTTP-tenant-store=en,ar\n";
        $results[] = [
            'domain' => $tenantDomain,
            'database' => $database,
            'ok' => true,
            'active_language_rows' => $activeCodes,
            'supported_language_rows_before' => $beforeRows,
            'supported_language_rows_after' => $afterRows,
            'mysql_store_supported_languages' => $mysqlSupported,
            'http_tenant_store_supported_languages' => $httpSupported,
            'setting_cache_key' => $cacheKey,
        ];
    } catch (Throwable $error) {
        $failures++;
        fwrite(STDERR, "[FAIL] {$tenantDomain}: {$error->getMessage()}\n");
        $results[] = [
            'domain' => $tenantDomain,
            'database' => $database,
            'ok' => false,
            'error' => $error->getMessage(),
        ];
    } finally {
        DB::setDefaultConnection($originalDefault);
        restoreConnection('mysql', $mysqlOriginal);
        restoreConnection('tenant', $tenantOriginal);
        DB::purge('mysql');
        DB::purge('tenant');
        DB::reconnect('mysql');
    }
}

echo PHP_EOL.json_encode([
    'operation' => 'pmd-repair-oman-admin-supported-languages-r8',
    'matched' => count($targets),
    'failures' => $failures,
    'expected_supported_languages' => ['en', 'ar'],
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;

if ($failures) {
    fwrite(STDERR, "OMAN ADMIN SUPPORTED LANGUAGES R8: FAILED\n");
    exit(1);
}

if ($apply) {
    echo "\nOMAN ADMIN SUPPORTED LANGUAGES R8: OK\n";
    echo "Canonical Flame dotted settings were written and verified through the HTTP tenant connection.\n";
    echo "Only supported_languages setting rows and their tenant-scoped cache were changed.\n";
    echo "No payment/currency/order/reservation/menu/category/business data was changed.\n";
} else {
    echo "\nDRY-RUN COMPLETE. No database writes or cache changes were made.\n";
}

function connectionSnapshot(string $name): array
{
    $prefix = 'database.connections.'.$name.'.';
    return [
        'database' => Config::get($prefix.'database'),
        'host' => Config::get($prefix.'host'),
        'port' => Config::get($prefix.'port'),
        'username' => Config::get($prefix.'username'),
        'password' => Config::get($prefix.'password'),
    ];
}

function restoreConnection(string $name, array $snapshot): void
{
    $prefix = 'database.connections.'.$name.'.';
    foreach ($snapshot as $key => $value) {
        Config::set($prefix.$key, $value);
    }
}

function configureConnectionForTenant(string $name, object $tenant, string $database): void
{
    $prefix = 'database.connections.'.$name.'.';
    Config::set($prefix.'database', $database);

    $mapping = [
        'host' => 'db_host',
        'port' => 'db_port',
        'username' => 'db_user',
        'password' => 'db_pass',
    ];
    foreach ($mapping as $configKey => $tenantKey) {
        $value = $tenant->{$tenantKey} ?? null;
        if ($value !== null && $value !== '') {
            Config::set($prefix.$configKey, $value);
        }
    }
}

function supportedLanguageRows(string $connection, array $columns): array
{
    $query = DB::connection($connection)->table('settings');
    if (in_array('sort', $columns, true)) {
        $query->where('sort', 'config');
    }
    $query->where(function ($inner) {
        $inner->where('item', 'supported_languages')
            ->orWhere('item', 'like', 'supported_languages.%');
    });

    $select = ['item', 'value'];
    if (in_array('serialized', $columns, true)) {
        $select[] = 'serialized';
    }

    return $query->orderBy('item')->get($select)
        ->map(static fn ($row) => (array)$row)
        ->all();
}

function insertSettingRow(string $connection, array $columns, string $item, string $value): void
{
    $payload = ['item' => $item, 'value' => $value];
    if (in_array('sort', $columns, true)) $payload['sort'] = 'config';
    if (in_array('serialized', $columns, true)) $payload['serialized'] = 0;
    if (in_array('created_at', $columns, true)) $payload['created_at'] = now();
    if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();
    if (in_array('date_added', $columns, true)) $payload['date_added'] = now();
    if (in_array('date_updated', $columns, true)) $payload['date_updated'] = now();

    DB::connection($connection)->table('settings')->insert($payload);
}

function verifyStoreOnConnection(string $connection, string $cacheKey): array
{
    DB::setDefaultConnection($connection);
    $cache = app('cache.store');
    $cache->forget($cacheKey);

    foreach (['system.setting', 'system.parameter', 'setting.manager', 'translator.localization'] as $abstract) {
        app()->forgetInstance($abstract);
    }

    $store = new DatabaseSettingStore(app('db'), $cache);
    $store->setCacheKey($cacheKey);
    $store->setExtraColumns(['sort' => 'config']);

    return [
        'supported_languages' => $store->get('supported_languages', []),
    ];
}

function normalizeLocales($value): array
{
    if (is_string($value)) {
        $decoded = @unserialize($value);
        if (is_array($decoded)) {
            $value = $decoded;
        } else {
            $json = json_decode($value, true);
            $value = is_array($json) ? $json : explode(',', $value);
        }
    }

    if (!is_array($value)) return [];

    return array_values(array_unique(array_filter(array_map(
        static fn ($locale) => strtolower(trim((string)$locale)),
        $value
    ))));
}
