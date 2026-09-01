#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\Platform\CountryPlatformProfileRegistry;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);
$options = getopt('', ['apply', 'domain::', 'help']);

if (isset($options['help'])) {
    echo <<<TXT
Usage:
  php scripts/pmd-sync-oman-admin-language-r1.php
  php scripts/pmd-sync-oman-admin-language-r1.php --apply
  php scripts/pmd-sync-oman-admin-language-r1.php --domain=oman.paymydine.com --apply

Without --apply this is read-only.
With --apply it only enables the Arabic Admin language row and the framework
supported_languages setting for matching Oman tenants. English stays default.

TXT;
    exit(0);
}

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apply = isset($options['apply']);
$domain = strtolower(trim((string)($options['domain'] ?? '')));
if ($domain !== '' && !str_contains($domain, '.')) $domain .= '.paymydine.com';

$arCatalogue = base_path('app/admin/i18n/platform/ar.php');
if (!is_file($arCatalogue)) {
    fwrite(STDERR, "[FAIL] Canonical Admin Arabic catalogue is missing: {$arCatalogue}\n");
    exit(2);
}

$arMessages = require $arCatalogue;
$enMessages = require base_path('app/admin/i18n/platform/en.php');
if (!is_array($arMessages) || !is_array($enMessages)) {
    fwrite(STDERR, "[FAIL] Admin language catalogue could not be loaded.\n");
    exit(2);
}
$missingKeys = array_values(array_diff(array_keys($enMessages), array_keys($arMessages)));
if ($missingKeys) {
    fwrite(STDERR, '[FAIL] Arabic Admin catalogue is missing '.count($missingKeys)." canonical key(s).\n");
    exit(2);
}

if (!Schema::connection('mysql')->hasTable('tenants')) {
    fwrite(STDERR, "[FAIL] Central tenants table is missing.\n");
    exit(2);
}

$registry = new CountryPlatformProfileRegistry();
$query = DB::connection('mysql')->table('tenants');
if ($domain !== '') $query->whereRaw('LOWER(domain) = ?', [$domain]);

$targets = [];
foreach ($query->orderBy('id')->get() as $tenant) {
    $profile = $registry->profile((string)($tenant->country ?? ''));
    if (!$profile || ($profile['country_code'] ?? null) !== CountryPlatformProfileRegistry::OMAN) continue;
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

if (!$apply) {
    echo "\nDRY-RUN COMPLETE. No database writes were made.\n";
    exit(0);
}

$centralDatabase = (string)Config::get('database.connections.mysql.database');
$failures = 0;
$results = [];

foreach ($targets as $tenant) {
    $tenantDomain = (string)($tenant->domain ?? '');
    $database = trim((string)($tenant->database ?? $tenant->database_name ?? ''));

    try {
        Config::set('database.connections.mysql.database', $database);
        DB::purge('mysql');
        DB::reconnect('mysql');

        if (!Schema::connection('mysql')->hasTable('languages')) {
            throw new RuntimeException('Tenant languages table is missing.');
        }
        if (!Schema::connection('mysql')->hasTable('settings')) {
            throw new RuntimeException('Tenant settings table is missing.');
        }

        $languageColumns = Schema::connection('mysql')->getColumnListing('languages');
        $payload = [];
        if (in_array('name', $languageColumns, true)) $payload['name'] = 'العربية';
        if (in_array('idiom', $languageColumns, true)) $payload['idiom'] = 'arabic';
        if (in_array('image', $languageColumns, true)) $payload['image'] = '';
        if (in_array('status', $languageColumns, true)) $payload['status'] = 1;
        if (in_array('can_delete', $languageColumns, true)) $payload['can_delete'] = 1;
        if (in_array('updated_at', $languageColumns, true)) $payload['updated_at'] = now();
        if (in_array('created_at', $languageColumns, true)) $payload['created_at'] = now();

        DB::connection('mysql')->table('languages')->updateOrInsert(['code' => 'ar'], $payload);
        if (in_array('status', $languageColumns, true)) {
            DB::connection('mysql')->table('languages')->where('code', 'en')->update(['status' => 1]);
        }

        upsertSetting('supported_languages', ['en', 'ar'], true);
        upsertSetting('default_language', 'en', false);

        $language = DB::connection('mysql')->table('languages')->where('code', 'ar')->first();
        $settings = DB::connection('mysql')->table('settings')
            ->whereIn('item', ['default_language', 'supported_languages'])
            ->pluck('value', 'item')->all();

        $supportedRaw = (string)($settings['supported_languages'] ?? '');
        $supported = @unserialize($supportedRaw);
        if (!is_array($supported)) {
            $decoded = json_decode($supportedRaw, true);
            $supported = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $supportedRaw)));
        }
        $supported = array_values(array_map(static fn ($v) => strtolower((string)$v), $supported));

        $ok = $language
            && (!property_exists($language, 'status') || (int)$language->status === 1)
            && (string)($settings['default_language'] ?? '') === 'en'
            && in_array('en', $supported, true)
            && in_array('ar', $supported, true);

        if (!$ok) throw new RuntimeException('Post-sync Admin Arabic verification failed.');

        echo "[OK] {$tenantDomain}: Admin languages = en,ar; default = en\n";
        $results[] = ['domain' => $tenantDomain, 'database' => $database, 'ok' => true, 'supported_languages' => $supported];
    } catch (Throwable $error) {
        $failures++;
        fwrite(STDERR, "[FAIL] {$tenantDomain}: {$error->getMessage()}\n");
        $results[] = ['domain' => $tenantDomain, 'database' => $database, 'ok' => false, 'error' => $error->getMessage()];
    } finally {
        Config::set('database.connections.mysql.database', $centralDatabase);
        DB::purge('mysql');
        DB::reconnect('mysql');
    }
}

echo PHP_EOL.json_encode([
    'operation' => 'pmd-sync-oman-admin-language-r1',
    'matched' => count($targets),
    'failures' => $failures,
    'expected' => ['default' => 'en', 'supported' => ['en', 'ar'], 'direction' => 'rtl'],
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;

if ($failures) {
    fwrite(STDERR, "OMAN ADMIN ARABIC LANGUAGE SYNC: FAILED\n");
    exit(1);
}

echo "\nOMAN ADMIN ARABIC LANGUAGE SYNC: OK\n";
echo "Only Admin language registry/settings were changed.\n";
echo "No payment/currency/order/reservation/menu/category/business data was changed.\n";

function upsertSetting(string $item, $value, bool $serialized): void
{
    $columns = Schema::connection('mysql')->getColumnListing('settings');
    $where = ['item' => $item];
    if (in_array('sort', $columns, true)) $where['sort'] = 'config';

    $payload = ['value' => $serialized ? serialize($value) : (string)$value];
    if (in_array('serialized', $columns, true)) $payload['serialized'] = $serialized ? 1 : 0;
    if (in_array('sort', $columns, true)) $payload['sort'] = 'config';
    if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();
    if (in_array('date_updated', $columns, true)) $payload['date_updated'] = now();

    DB::connection('mysql')->table('settings')->updateOrInsert($where, $payload);
}
