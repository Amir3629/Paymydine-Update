<?php

declare(strict_types=1);

/**
 * PayMyDine tenant language metadata repair.
 *
 * Dry-run by default. Nothing is written unless --apply is supplied.
 *
 * Usage:
 *   php scripts/pmd-repair-tenant-language-foundation.php --tenant=mimoza.paymydine.com
 *   php scripts/pmd-repair-tenant-language-foundation.php --tenant=mimoza.paymydine.com --apply
 */

$options = getopt('', ['tenant:', 'apply']);
$tenantDomain = strtolower(trim((string)($options['tenant'] ?? 'mimoza.paymydine.com')));
$apply = array_key_exists('apply', $options);
$root = dirname(__DIR__);

if (!is_file($root.'/vendor/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "ERROR: Invalid PayMyDine root: {$root}\n");
    exit(1);
}

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function pmdOut(string $label, $value): void
{
    if (is_array($value) || is_object($value)) {
        $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    echo $label.'='.$value.PHP_EOL;
}

function pmdConfigureTenant(object $tenant): void
{
    Config::set('database.connections.tenant.database', $tenant->database);
    if (!empty($tenant->db_host)) Config::set('database.connections.tenant.host', $tenant->db_host);
    if (!empty($tenant->db_port)) Config::set('database.connections.tenant.port', $tenant->db_port);
    if (!empty($tenant->db_user)) Config::set('database.connections.tenant.username', $tenant->db_user);
    if (isset($tenant->db_pass) && $tenant->db_pass !== '') Config::set('database.connections.tenant.password', $tenant->db_pass);
    DB::purge('tenant');
    DB::reconnect('tenant');
}

function pmdSettingRow(string $connection, string $item): ?object
{
    if (!Schema::connection($connection)->hasTable('settings')) return null;
    return DB::connection($connection)->table('settings')
        ->where('sort', 'config')
        ->where('item', $item)
        ->first();
}

function pmdSettingDecoded(?object $row)
{
    if (!$row) return null;
    if (!(bool)$row->serialized) return $row->value;
    $decoded = @unserialize((string)$row->value);
    return $decoded === false && $row->value !== 'b:0;' ? $row->value : $decoded;
}

function pmdUpsertSetting(string $connection, string $item, $value, bool $serialized): void
{
    $payload = [
        'value' => $serialized ? serialize($value) : (string)$value,
        'serialized' => $serialized ? 1 : 0,
    ];

    $exists = DB::connection($connection)->table('settings')
        ->where('sort', 'config')
        ->where('item', $item)
        ->exists();

    if ($exists) {
        DB::connection($connection)->table('settings')
            ->where('sort', 'config')
            ->where('item', $item)
            ->update($payload);
    } else {
        DB::connection($connection)->table('settings')->insert($payload + [
            'sort' => 'config',
            'item' => $item,
        ]);
    }
}

function pmdLanguagePayload(object $central, string $code): array
{
    $payload = [
        'code' => $code,
        'name' => $central->name,
        'image' => $central->image,
        'idiom' => $central->idiom,
        'status' => 1,
        'can_delete' => 0,
    ];

    foreach (['original_id', 'version'] as $column) {
        if (property_exists($central, $column)) $payload[$column] = $central->{$column};
    }

    return $payload;
}

$tenant = DB::connection('mysql')->table('tenants')
    ->whereRaw('LOWER(domain) = ?', [$tenantDomain])
    ->first();

if (!$tenant || empty($tenant->database)) {
    fwrite(STDERR, "ERROR: Tenant not found: {$tenantDomain}\n");
    exit(2);
}

pmdConfigureTenant($tenant);

$centralLanguages = [];
foreach (['en', 'de'] as $code) {
    $row = DB::connection('mysql')->table('languages')
        ->whereRaw('BINARY code = ?', [$code])
        ->where('status', 1)
        ->first();
    if (!$row) {
        fwrite(STDERR, "ERROR: Central canonical language missing: {$code}\n");
        exit(3);
    }
    $centralLanguages[$code] = $row;
}

$tenantLanguages = DB::connection('tenant')->table('languages')
    ->orderBy('language_id')->get()->all();
$foldedGerman = DB::connection('tenant')->table('languages')
    ->whereRaw('LOWER(code) = ?', ['de'])
    ->orderByRaw("CASE WHEN LOWER(name) = 'german' THEN 0 ELSE 1 END")
    ->orderBy('language_id')
    ->get()->all();
$exactEnglish = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['en'])->orderBy('language_id')->first();
$exactGerman = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['de'])->orderBy('language_id')->first();

$canonicalEnglishId = $exactEnglish->language_id ?? null;
$canonicalGermanCandidate = $exactGerman ?: ($foldedGerman[0] ?? null);
$canonicalGermanId = $canonicalGermanCandidate->language_id ?? null;
$duplicateGermanIds = array_values(array_map(
    fn($row) => (int)$row->language_id,
    array_filter($foldedGerman, fn($row) => (int)$row->language_id !== (int)$canonicalGermanId)
));

$staffMap = Schema::connection('tenant')->hasTable('staffs')
    ? DB::connection('tenant')->table('staffs as s')
        ->leftJoin('languages as l', 'l.language_id', '=', 's.language_id')
        ->orderBy('s.staff_id')
        ->get(['s.staff_id', 's.staff_name', 's.language_id', 'l.code as language_code'])
        ->map(fn($row) => (array)$row)->all()
    : [];

$orphanStaffIds = array_values(array_map(
    fn($row) => (int)$row['staff_id'],
    array_filter($staffMap, fn($row) => !empty($row['language_id']) && empty($row['language_code']))
));

$legacyTranslationCounts = [];
if (Schema::connection('tenant')->hasTable('language_translations')) {
    foreach (['de', 'De', 'DE'] as $locale) {
        $legacyTranslationCounts[$locale] = DB::connection('tenant')
            ->table('language_translations')
            ->whereRaw('BINARY locale = ?', [$locale])
            ->count();
    }
}

pmdOut('MODE', $apply ? 'APPLY' : 'DRY_RUN');
pmdOut('TENANT_DOMAIN', $tenant->domain ?? $tenantDomain);
pmdOut('TENANT_DB', DB::connection('tenant')->getDatabaseName());
pmdOut('TENANT_LANGUAGES_BEFORE', array_map(fn($row) => (array)$row, $tenantLanguages));
pmdOut('CANONICAL_EN_ID_BEFORE', $canonicalEnglishId);
pmdOut('CANONICAL_DE_ID_CANDIDATE', $canonicalGermanId);
pmdOut('DUPLICATE_DE_IDS', $duplicateGermanIds);
pmdOut('ORPHAN_STAFF_IDS', $orphanStaffIds);
pmdOut('SUPPORTED_LANGUAGES_BEFORE', pmdSettingDecoded(pmdSettingRow('tenant', 'supported_languages')));
pmdOut('DEFAULT_LANGUAGE_BEFORE', pmdSettingDecoded(pmdSettingRow('tenant', 'default_language')));
pmdOut('TENANT_TRANSLATION_COUNTS_BEFORE', $legacyTranslationCounts);

$plan = [
    'ensure_exact_active_en' => true,
    'ensure_exact_active_de' => true,
    'disable_duplicate_casefolded_de_ids' => $duplicateGermanIds,
    'map_orphan_staff_to' => 'de',
    'orphan_staff_ids' => $orphanStaffIds,
    'supported_languages' => ['en', 'de'],
    'default_language' => 'de',
    'normalize_translation_locale_De_to_de_without_overwrite' => true,
];
pmdOut('PLAN', $plan);

if (!$apply) {
    echo "DRY_RUN_COMPLETE=No rows changed. Re-run with --apply only after reviewing this plan.\n";
    exit(0);
}

DB::connection('tenant')->transaction(function () use (
    $centralLanguages,
    $canonicalEnglishId,
    $canonicalGermanId,
    $duplicateGermanIds,
    $orphanStaffIds
) {
    $enId = $canonicalEnglishId;
    if (!$enId) {
        $enId = DB::connection('tenant')->table('languages')->insertGetId(
            pmdLanguagePayload($centralLanguages['en'], 'en')
        );
    } else {
        DB::connection('tenant')->table('languages')->where('language_id', $enId)
            ->update(pmdLanguagePayload($centralLanguages['en'], 'en'));
    }

    $deId = $canonicalGermanId;
    if (!$deId) {
        $deId = DB::connection('tenant')->table('languages')->insertGetId(
            pmdLanguagePayload($centralLanguages['de'], 'de')
        );
    } else {
        DB::connection('tenant')->table('languages')->where('language_id', $deId)
            ->update(pmdLanguagePayload($centralLanguages['de'], 'de'));
    }

    if ($duplicateGermanIds) {
        DB::connection('tenant')->table('languages')
            ->whereIn('language_id', $duplicateGermanIds)
            ->update(['status' => 0]);

        if (Schema::connection('tenant')->hasTable('staffs')) {
            DB::connection('tenant')->table('staffs')
                ->whereIn('language_id', $duplicateGermanIds)
                ->update(['language_id' => $deId]);
        }
    }

    if ($orphanStaffIds && Schema::connection('tenant')->hasTable('staffs')) {
        DB::connection('tenant')->table('staffs')
            ->whereIn('staff_id', $orphanStaffIds)
            ->update(['language_id' => $deId]);
    }

    if (Schema::connection('tenant')->hasTable('language_translations')) {
        $legacyRows = DB::connection('tenant')->table('language_translations')
            ->whereRaw('BINARY locale = ?', ['De'])
            ->orderBy('translation_id')->get();

        foreach ($legacyRows as $row) {
            $exists = DB::connection('tenant')->table('language_translations')
                ->whereRaw('BINARY locale = ?', ['de'])
                ->where('namespace', $row->namespace)
                ->where('group', $row->group)
                ->where('item', $row->item)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::connection('tenant')->table('language_translations')
                ->where('translation_id', $row->translation_id)
                ->update(['locale' => 'de']);
        }
    }

    pmdUpsertSetting('tenant', 'supported_languages', ['en', 'de'], true);
    pmdUpsertSetting('tenant', 'default_language', 'de', false);
});

pmdOut('APPLY_RESULT', 'COMMITTED');
pmdOut('TENANT_LANGUAGES_AFTER', DB::connection('tenant')->table('languages')->orderBy('language_id')->get()->map(fn($r) => (array)$r)->all());
pmdOut('SUPPORTED_LANGUAGES_AFTER', pmdSettingDecoded(pmdSettingRow('tenant', 'supported_languages')));
pmdOut('DEFAULT_LANGUAGE_AFTER', pmdSettingDecoded(pmdSettingRow('tenant', 'default_language')));

if (Schema::connection('tenant')->hasTable('staffs')) {
    pmdOut('ORPHAN_STAFF_COUNT_AFTER', DB::connection('tenant')->table('staffs as s')
        ->leftJoin('languages as l', 'l.language_id', '=', 's.language_id')
        ->whereNotNull('s.language_id')->whereNull('l.language_id')->count());
}

if (Schema::connection('tenant')->hasTable('language_translations')) {
    pmdOut('DE_TRANSLATION_COUNT_AFTER', DB::connection('tenant')->table('language_translations')
        ->whereRaw('BINARY locale = ?', ['de'])->count());
    pmdOut('LEGACY_De_TRANSLATION_COUNT_AFTER', DB::connection('tenant')->table('language_translations')
        ->whereRaw('BINARY locale = ?', ['De'])->count());
}
