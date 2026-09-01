#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\PlatformLanguageRegistry;
use App\Services\Platform\SuperAdminTenantMarketService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);
$options = getopt('', ['apply', 'domain::', 'help']);

if (isset($options['help'])) {
    echo <<<TXT
Usage:
  php scripts/pmd-sync-oman-customer-languages-r1.php
  php scripts/pmd-sync-oman-customer-languages-r1.php --apply
  php scripts/pmd-sync-oman-customer-languages-r1.php --domain=restaurant.paymydine.com --apply

Without --apply the script is read-only and lists matching Oman tenants.
With --apply it changes only customer-language settings for matching Oman tenants.

TXT;
    exit(0);
}

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apply = isset($options['apply']);
$domain = strtolower(trim((string)($options['domain'] ?? '')));
if ($domain !== '' && !str_contains($domain, '.')) $domain .= '.paymydine.com';

$registry = new CountryPlatformProfileRegistry();
$languageRegistry = new PlatformLanguageRegistry();

if (!$languageRegistry->marketPackReady('ar')) {
    fwrite(STDERR, "[FAIL] Arabic customer language pack is not ready.\n");
    exit(2);
}

if (!Schema::connection('mysql')->hasTable('tenants')) {
    fwrite(STDERR, "[FAIL] Central tenants table is missing.\n");
    exit(2);
}

$query = DB::connection('mysql')->table('tenants');
if ($domain !== '') {
    $query->whereRaw('LOWER(domain) = ?', [$domain]);
}
$rows = $query->orderBy('id')->get();

$targets = [];
foreach ($rows as $tenant) {
    $country = trim((string)($tenant->country ?? ''));
    $profile = $country !== '' ? $registry->profile($country) : null;
    if (!$profile || (string)$profile['country_code'] !== CountryPlatformProfileRegistry::OMAN) {
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
        : "[FAIL] No Oman tenants were found in the central control plane.\n"
    );
    exit(4);
}

echo '[INFO] Mode: '.($apply ? 'APPLY' : 'DRY-RUN').PHP_EOL;
echo '[INFO] Oman tenants matched: '.count($targets).PHP_EOL;
foreach ($targets as $tenant) {
    echo sprintf(
        "  - %s [%s]\n",
        (string)($tenant->domain ?? ''),
        (string)($tenant->database ?? $tenant->database_name ?? '')
    );
}

if (!$apply) {
    echo "\nDRY-RUN COMPLETE. No database writes were made.\n";
    exit(0);
}

$service = new SuperAdminTenantMarketService();
$failures = 0;
$results = [];

foreach ($targets as $tenant) {
    $tenantDomain = (string)($tenant->domain ?? '');
    $database = (string)($tenant->database ?? $tenant->database_name ?? '');

    try {
        $result = $service->syncCustomerLanguagesToTenant($tenant, CountryPlatformProfileRegistry::OMAN);
        $verify = inspectTenantCustomerLanguages($tenant);

        $expected = ['en', 'ar'];
        $actualEnabled = array_values(array_filter(array_map(
            static fn ($value) => strtolower(trim((string)$value)),
            explode(',', (string)($verify['pmd_v2_enabled_languages'] ?? ''))
        )));

        $json = json_decode((string)($verify['pmd_customer_languages_json'] ?? ''), true);
        $jsonEnabled = is_array($json) ? array_values((array)($json['enabled'] ?? [])) : [];

        $ok = (string)($verify['default_language'] ?? '') === 'en'
            && $actualEnabled === $expected
            && $jsonEnabled === $expected
            && (string)($result['country_code'] ?? '') === CountryPlatformProfileRegistry::OMAN;

        if (!$ok) {
            $failures++;
            fwrite(STDERR, "[FAIL] Post-sync verification failed for {$tenantDomain}.\n");
        } else {
            echo "[OK] {$tenantDomain}: customer languages = en,ar; default = en\n";
        }

        $results[] = [
            'domain' => $tenantDomain,
            'database' => $database,
            'ok' => $ok,
            'default_language' => $verify['default_language'] ?? null,
            'customer_languages' => $actualEnabled,
            'warnings' => array_values((array)($result['warnings'] ?? [])),
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
    }
}

echo PHP_EOL.json_encode([
    'operation' => 'pmd-oman-customer-languages-r1',
    'matched' => count($targets),
    'failures' => $failures,
    'expected' => [
        'default' => 'en',
        'enabled' => ['en', 'ar'],
        'arabic_direction' => 'rtl',
    ],
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;

if ($failures > 0) {
    fwrite(STDERR, "OMAN CUSTOMER LANGUAGE SYNC: FAILED\n");
    exit(1);
}

echo "\nOMAN CUSTOMER LANGUAGE SYNC: OK\n";
echo "Only customer-language settings were changed.\n";
echo "No payment/currency/order/reservation/menu/category/business data was changed.\n";

function inspectTenantCustomerLanguages(object $tenant): array
{
    $database = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
    if ($database === '') throw new RuntimeException('Tenant database is missing for verification.');

    $central = (string)Config::get('database.connections.mysql.database');

    try {
        Config::set('database.connections.mysql.database', $database);
        DB::purge('mysql');
        DB::reconnect('mysql');

        if (!Schema::connection('mysql')->hasTable('settings')) {
            throw new RuntimeException('Tenant settings table is missing.');
        }

        $keys = [
            'default_language',
            'pmd_v2_enabled_languages',
            'pmd_customer_default_language',
            'pmd_customer_languages_json',
        ];

        return DB::connection('mysql')->table('settings')
            ->whereIn('item', $keys)
            ->pluck('value', 'item')
            ->map(static fn ($value) => (string)$value)
            ->all();
    } finally {
        Config::set('database.connections.mysql.database', $central);
        DB::purge('mysql');
        DB::reconnect('mysql');
    }
}
