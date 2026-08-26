<?php

declare(strict_types=1);

/**
 * Generic PayMyDine tenant EN/DE language-foundation repair.
 *
 * Dry-run by default. Pass --apply to commit.
 * No language rows are deleted.
 *
 * Usage:
 *   PMD_ROOT=/var/www/paymydine php pmd-repair-tenant-en-de-foundation-v3.php --tenant=tomo.paymydine.com
 *   PMD_ROOT=/var/www/paymydine php pmd-repair-tenant-en-de-foundation-v3.php --tenant=tomo.paymydine.com --apply
 */

$options = getopt('', ['tenant:', 'apply']);
$apply = array_key_exists('apply', $options);
$root = rtrim((string)(getenv('PMD_ROOT') ?: dirname(__DIR__)), '/');
$tenantDomain = strtolower(trim((string)($options['tenant'] ?? '')));

if ($tenantDomain === '' || !preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $tenantDomain)) {
    fwrite(STDERR, "ERROR=Pass a valid --tenant=<subdomain>.paymydine.com\n");
    exit(1);
}

if (!is_file($root.'/vendor/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "ERROR=Invalid PMD_ROOT: {$root}\n");
    exit(2);
}

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function pmdOut(string $key, $value): void
{
    if (is_array($value) || is_object($value)) {
        $value = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    echo $key.'='.$value.PHP_EOL;
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

function pmdSettingRow(string $item): ?object
{
    return DB::connection('tenant')->table('settings')
        ->where('sort', 'config')
        ->where('item', $item)
        ->first();
}

function pmdDecodeSetting(?object $row)
{
    if (!$row) return null;
    if (!(bool)$row->serialized) return $row->value;
    $decoded = @unserialize((string)$row->value);
    return ($decoded === false && $row->value !== 'b:0;') ? $row->value : $decoded;
}

function pmdUpsertSetting(string $item, $value, bool $serialized): void
{
    $payload = [
        'value' => $serialized ? serialize($value) : (string)$value,
        'serialized' => $serialized ? 1 : 0,
    ];

    $q = DB::connection('tenant')->table('settings')
        ->where('sort', 'config')
        ->where('item', $item);

    if ($q->exists()) {
        $q->update($payload);
    } else {
        DB::connection('tenant')->table('settings')->insert($payload + [
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
        if (property_exists($central, $column)) {
            $payload[$column] = $central->{$column};
        }
    }

    return $payload;
}

function pmdPickCanonical($rows, string $preferredName): ?object
{
    if ($rows->isEmpty()) return null;

    return $rows->sort(function ($a, $b) use ($preferredName) {
        $aPreferred = strtolower(trim((string)$a->name)) === $preferredName ? 0 : 1;
        $bPreferred = strtolower(trim((string)$b->name)) === $preferredName ? 0 : 1;
        if ($aPreferred !== $bPreferred) return $aPreferred <=> $bPreferred;
        return ((int)$a->language_id) <=> ((int)$b->language_id);
    })->first();
}

$tenant = DB::connection('mysql')->table('tenants')
    ->whereRaw('LOWER(domain) = ?', [$tenantDomain])
    ->where('status', 'active')
    ->first();

if (!$tenant || empty($tenant->database)) {
    fwrite(STDERR, "ERROR=Active tenant not found: {$tenantDomain}\n");
    exit(3);
}

pmdConfigureTenant($tenant);

foreach (['languages', 'staffs', 'settings'] as $table) {
    if (!Schema::connection('tenant')->hasTable($table)) {
        fwrite(STDERR, "ERROR=Missing tenant table: {$table}\n");
        exit(4);
    }
}

$central = [];
foreach (['en', 'de'] as $code) {
    $central[$code] = DB::connection('mysql')->table('languages')
        ->whereRaw('BINARY code = ?', [$code])
        ->where('status', 1)
        ->first();

    if (!$central[$code]) {
        fwrite(STDERR, "ERROR=Central canonical language missing: {$code}\n");
        exit(5);
    }
}

$languages = DB::connection('tenant')->table('languages')->orderBy('language_id')->get();

$foldedEn = DB::connection('tenant')->table('languages')
    ->whereRaw('LOWER(code) = ?', ['en'])
    ->orderBy('language_id')
    ->get();
$foldedDe = DB::connection('tenant')->table('languages')
    ->whereRaw('LOWER(code) = ?', ['de'])
    ->orderBy('language_id')
    ->get();

$exactEn = $foldedEn->first(fn($row) => (string)$row->code === 'en');
$exactDe = $foldedDe->first(fn($row) => (string)$row->code === 'de');

$canonicalEn = $exactEn ?: pmdPickCanonical($foldedEn, 'english');
$canonicalDe = $exactDe ?: pmdPickCanonical($foldedDe, 'german');

$canonicalEnId = $canonicalEn ? (int)$canonicalEn->language_id : null;
$canonicalDeId = $canonicalDe ? (int)$canonicalDe->language_id : null;

$duplicateEnIds = $foldedEn->pluck('language_id')->map(fn($id) => (int)$id)
    ->filter(fn($id) => $canonicalEnId !== null && $id !== $canonicalEnId)->values()->all();
$duplicateDeIds = $foldedDe->pluck('language_id')->map(fn($id) => (int)$id)
    ->filter(fn($id) => $canonicalDeId !== null && $id !== $canonicalDeId)->values()->all();

$activeOtherIds = $languages
    ->filter(fn($row) => (int)$row->status === 1 && !in_array(strtolower((string)$row->code), ['en', 'de'], true))
    ->pluck('language_id')->map(fn($id) => (int)$id)->values()->all();

$orphanStaff = DB::connection('tenant')->table('staffs as s')
    ->leftJoin('languages as l', 'l.language_id', '=', 's.language_id')
    ->whereNotNull('s.language_id')
    ->whereNull('l.language_id')
    ->get(['s.staff_id', 's.staff_name', 's.language_id'])
    ->map(fn($r) => (array)$r)->all();
$orphanStaffIds = array_values(array_map(fn($r) => (int)$r['staff_id'], $orphanStaff));

$otherLanguageStaff = $activeOtherIds
    ? DB::connection('tenant')->table('staffs')->whereIn('language_id', $activeOtherIds)
        ->get(['staff_id', 'staff_name', 'language_id'])->map(fn($r) => (array)$r)->all()
    : [];

$duplicateStaff = array_values(array_unique(array_merge($duplicateEnIds, $duplicateDeIds)));
$staffOnDuplicateRows = $duplicateStaff
    ? DB::connection('tenant')->table('staffs')->whereIn('language_id', $duplicateStaff)
        ->get(['staff_id', 'staff_name', 'language_id'])->map(fn($r) => (array)$r)->all()
    : [];

$translationCounts = ['de' => 0, 'De' => 0, 'DE' => 0];
if (Schema::connection('tenant')->hasTable('language_translations')) {
    foreach (array_keys($translationCounts) as $locale) {
        $translationCounts[$locale] = DB::connection('tenant')->table('language_translations')
            ->whereRaw('BINARY locale = ?', [$locale])->count();
    }
}

pmdOut('MODE', $apply ? 'APPLY' : 'DRY_RUN');
pmdOut('TENANT_DOMAIN', $tenantDomain);
pmdOut('TENANT_DB', DB::connection('tenant')->getDatabaseName());
pmdOut('LANGUAGES_BEFORE', $languages->map(fn($r) => (array)$r)->all());
pmdOut('CANONICAL_EN_ID_BEFORE', $canonicalEnId);
pmdOut('CANONICAL_DE_ID_BEFORE', $canonicalDeId);
pmdOut('WILL_CREATE_EN', $canonicalEnId === null ? 1 : 0);
pmdOut('WILL_CREATE_DE', $canonicalDeId === null ? 1 : 0);
pmdOut('DUPLICATE_EN_IDS', $duplicateEnIds);
pmdOut('DUPLICATE_DE_IDS', $duplicateDeIds);
pmdOut('ACTIVE_OTHER_LANGUAGE_IDS', $activeOtherIds);
pmdOut('STAFF_ON_OTHER_LANGUAGES', $otherLanguageStaff);
pmdOut('STAFF_ON_DUPLICATE_LANGUAGE_ROWS', $staffOnDuplicateRows);
pmdOut('ORPHAN_STAFF', $orphanStaff);
pmdOut('SUPPORTED_LANGUAGES_BEFORE', pmdDecodeSetting(pmdSettingRow('supported_languages')));
pmdOut('DEFAULT_LANGUAGE_BEFORE', pmdDecodeSetting(pmdSettingRow('default_language')));
pmdOut('TRANSLATION_COUNTS_BEFORE', $translationCounts);
pmdOut('PLAN', [
    'ensure_exact_active_en' => true,
    'ensure_exact_active_de' => true,
    'disable_duplicate_en_ids' => $duplicateEnIds,
    'disable_duplicate_de_ids' => $duplicateDeIds,
    'disable_non_en_de_ids' => $activeOtherIds,
    'map_staff_on_duplicate_en_to' => 'en',
    'map_staff_on_duplicate_de_to' => 'de',
    'map_staff_on_other_languages_to' => 'de',
    'map_orphan_staff_to' => 'de',
    'supported_languages' => ['en', 'de'],
    'default_language' => 'de',
    'normalize_de_translation_locale_case' => true,
]);

if (!$apply) {
    pmdOut('DRY_RUN_OK', 1);
    exit(0);
}

DB::connection('tenant')->transaction(function () use (
    $central,
    $canonicalEnId,
    $canonicalDeId,
    $duplicateEnIds,
    $duplicateDeIds,
    $activeOtherIds,
    $orphanStaffIds
) {
    $enId = $canonicalEnId;
    if ($enId === null) {
        $enId = (int)DB::connection('tenant')->table('languages')
            ->insertGetId(pmdLanguagePayload($central['en'], 'en'));
    } else {
        DB::connection('tenant')->table('languages')->where('language_id', $enId)
            ->update(pmdLanguagePayload($central['en'], 'en'));
    }

    $deId = $canonicalDeId;
    if ($deId === null) {
        $deId = (int)DB::connection('tenant')->table('languages')
            ->insertGetId(pmdLanguagePayload($central['de'], 'de'));
    } else {
        DB::connection('tenant')->table('languages')->where('language_id', $deId)
            ->update(pmdLanguagePayload($central['de'], 'de'));
    }

    if ($duplicateEnIds) {
        DB::connection('tenant')->table('staffs')->whereIn('language_id', $duplicateEnIds)
            ->update(['language_id' => $enId]);
    }

    if ($duplicateDeIds) {
        DB::connection('tenant')->table('staffs')->whereIn('language_id', $duplicateDeIds)
            ->update(['language_id' => $deId]);
    }

    if ($activeOtherIds) {
        DB::connection('tenant')->table('staffs')->whereIn('language_id', $activeOtherIds)
            ->update(['language_id' => $deId]);
    }

    if ($orphanStaffIds) {
        DB::connection('tenant')->table('staffs')->whereIn('staff_id', $orphanStaffIds)
            ->update(['language_id' => $deId]);
    }

    $disableIds = array_values(array_unique(array_merge(
        $duplicateEnIds,
        $duplicateDeIds,
        $activeOtherIds
    )));
    $disableIds = array_values(array_filter($disableIds, fn($id) => $id !== $enId && $id !== $deId));

    if ($disableIds) {
        DB::connection('tenant')->table('languages')->whereIn('language_id', $disableIds)
            ->update(['status' => 0]);
    }

    if (Schema::connection('tenant')->hasTable('language_translations')) {
        $legacyRows = DB::connection('tenant')->table('language_translations')
            ->whereRaw('LOWER(locale) = ?', ['de'])
            ->whereRaw('BINARY locale <> ?', ['de'])
            ->orderBy('translation_id')
            ->get();

        foreach ($legacyRows as $row) {
            $collision = DB::connection('tenant')->table('language_translations')
                ->whereRaw('BINARY locale = ?', ['de'])
                ->where('namespace', $row->namespace)
                ->where('group', $row->group)
                ->where('item', $row->item)
                ->exists();

            if ($collision) {
                throw new RuntimeException(
                    'Translation collision while normalizing locale for translation_id='.(int)$row->translation_id
                );
            }

            DB::connection('tenant')->table('language_translations')
                ->where('translation_id', $row->translation_id)
                ->update(['locale' => 'de']);
        }
    }

    pmdUpsertSetting('supported_languages', ['en', 'de'], true);
    pmdUpsertSetting('default_language', 'de', false);
});

$cacheSuffix = sha1(strtolower((string)$tenant->database));
foreach ([
    'igniter.setting.system.tenant.'.$cacheSuffix,
    'igniter.setting.parameters.tenant.'.$cacheSuffix,
] as $cacheKey) {
    app('cache.store')->forget($cacheKey);
    pmdOut('CACHE_FORGOTTEN', $cacheKey);
}

$activeExactEn = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['en'])->where('status', 1)->count();
$activeExactDe = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['de'])->where('status', 1)->count();
$activeOther = DB::connection('tenant')->table('languages')
    ->where('status', 1)
    ->whereRaw('LOWER(code) NOT IN (?, ?)', ['en', 'de'])
    ->count();
$orphanAfter = DB::connection('tenant')->table('staffs as s')
    ->leftJoin('languages as l', 'l.language_id', '=', 's.language_id')
    ->whereNotNull('s.language_id')
    ->whereNull('l.language_id')
    ->count();
$supportedAfter = pmdDecodeSetting(pmdSettingRow('supported_languages'));
$defaultAfter = pmdDecodeSetting(pmdSettingRow('default_language'));
$legacyDeAfter = Schema::connection('tenant')->hasTable('language_translations')
    ? DB::connection('tenant')->table('language_translations')
        ->whereRaw('LOWER(locale) = ?', ['de'])
        ->whereRaw('BINARY locale <> ?', ['de'])
        ->count()
    : 0;

pmdOut('LANGUAGES_AFTER', DB::connection('tenant')->table('languages')->orderBy('language_id')->get()->map(fn($r) => (array)$r)->all());
pmdOut('ACTIVE_EXACT_EN_AFTER', $activeExactEn);
pmdOut('ACTIVE_EXACT_DE_AFTER', $activeExactDe);
pmdOut('ACTIVE_NON_EN_DE_AFTER', $activeOther);
pmdOut('ORPHAN_STAFF_COUNT_AFTER', $orphanAfter);
pmdOut('SUPPORTED_LANGUAGES_AFTER', $supportedAfter);
pmdOut('DEFAULT_LANGUAGE_AFTER', $defaultAfter);
pmdOut('LEGACY_CASED_DE_TRANSLATION_COUNT_AFTER', $legacyDeAfter);

$ok = $activeExactEn === 1
    && $activeExactDe === 1
    && $activeOther === 0
    && $orphanAfter === 0
    && $supportedAfter === ['en', 'de']
    && $defaultAfter === 'de'
    && $legacyDeAfter === 0;

pmdOut('VERIFY_OK', $ok ? 1 : 0);
exit($ok ? 0 : 20);
