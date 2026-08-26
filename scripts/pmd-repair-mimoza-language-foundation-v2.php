<?php

declare(strict_types=1);

/**
 * Guarded Mimoza EN/DE language foundation repair.
 *
 * Dry-run by default. Pass --apply to commit. No language rows are deleted.
 */

$options = getopt('', ['apply']);
$apply = array_key_exists('apply', $options);
$root = rtrim((string)(getenv('PMD_ROOT') ?: dirname(__DIR__)), '/');
$tenantDomain = 'mimoza.paymydine.com';

if (!is_file($root.'/vendor/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "ERROR=Invalid PMD_ROOT: {$root}\n");
    exit(1);
}

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function out(string $key, $value): void
{
    if (is_array($value) || is_object($value)) {
        $value = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    echo $key.'='.$value.PHP_EOL;
}

function configureTenant(object $tenant): void
{
    Config::set('database.connections.tenant.database', $tenant->database);
    if (!empty($tenant->db_host)) Config::set('database.connections.tenant.host', $tenant->db_host);
    if (!empty($tenant->db_port)) Config::set('database.connections.tenant.port', $tenant->db_port);
    if (!empty($tenant->db_user)) Config::set('database.connections.tenant.username', $tenant->db_user);
    if (isset($tenant->db_pass) && $tenant->db_pass !== '') Config::set('database.connections.tenant.password', $tenant->db_pass);
    DB::purge('tenant');
    DB::reconnect('tenant');
}

function settingRow(string $item): ?object
{
    return DB::connection('tenant')->table('settings')
        ->where('sort', 'config')->where('item', $item)->first();
}

function decodeSetting(?object $row)
{
    if (!$row) return null;
    if (!(bool)$row->serialized) return $row->value;
    $decoded = @unserialize((string)$row->value);
    return ($decoded === false && $row->value !== 'b:0;') ? $row->value : $decoded;
}

function upsertSetting(string $item, $value, bool $serialized): void
{
    $payload = [
        'value' => $serialized ? serialize($value) : (string)$value,
        'serialized' => $serialized ? 1 : 0,
    ];

    $q = DB::connection('tenant')->table('settings')
        ->where('sort', 'config')->where('item', $item);

    if ($q->exists()) {
        $q->update($payload);
    } else {
        DB::connection('tenant')->table('settings')->insert($payload + [
            'sort' => 'config',
            'item' => $item,
        ]);
    }
}

function languagePayload(object $central, string $code): array
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

$tenant = DB::connection('mysql')->table('tenants')
    ->whereRaw('LOWER(domain) = ?', [$tenantDomain])
    ->where('status', 'active')
    ->first();

if (!$tenant || empty($tenant->database)) {
    fwrite(STDERR, "ERROR=Active Mimoza tenant not found\n");
    exit(2);
}

configureTenant($tenant);

foreach (['languages', 'staffs', 'settings'] as $table) {
    if (!Schema::connection('tenant')->hasTable($table)) {
        fwrite(STDERR, "ERROR=Missing tenant table: {$table}\n");
        exit(3);
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
        exit(4);
    }
}

$languages = DB::connection('tenant')->table('languages')->orderBy('language_id')->get();
$exactEn = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['en'])->orderBy('language_id')->first();
$exactDe = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['de'])->orderBy('language_id')->first();
$foldedDe = DB::connection('tenant')->table('languages')
    ->whereRaw('LOWER(code) = ?', ['de'])
    ->orderByRaw("CASE WHEN LOWER(name) = 'german' THEN 0 ELSE 1 END")
    ->orderBy('language_id')->get();

$canonicalDe = $exactDe ?: $foldedDe->first();
if (!$canonicalDe) {
    fwrite(STDERR, "ERROR=No German language candidate exists in Mimoza\n");
    exit(5);
}

$canonicalEnId = $exactEn ? (int)$exactEn->language_id : null;
$canonicalDeId = (int)$canonicalDe->language_id;
$duplicateDeIds = $foldedDe->pluck('language_id')->map(fn($id) => (int)$id)
    ->filter(fn($id) => $id !== $canonicalDeId)->values()->all();
$nonEnDeActiveIds = $languages
    ->filter(fn($row) => (int)$row->status === 1 && !in_array(strtolower((string)$row->code), ['en', 'de'], true))
    ->pluck('language_id')->map(fn($id) => (int)$id)->values()->all();

$nonEnDeStaff = $nonEnDeActiveIds
    ? DB::connection('tenant')->table('staffs')->whereIn('language_id', $nonEnDeActiveIds)
        ->get(['staff_id', 'staff_name', 'language_id'])->map(fn($r) => (array)$r)->all()
    : [];

if ($nonEnDeStaff) {
    out('BLOCKING_NON_EN_DE_STAFF', $nonEnDeStaff);
    fwrite(STDERR, "ERROR=Refusing to disable a non-EN/DE language that is still assigned to staff\n");
    exit(6);
}

$orphanStaff = DB::connection('tenant')->table('staffs as s')
    ->leftJoin('languages as l', 'l.language_id', '=', 's.language_id')
    ->whereNotNull('s.language_id')->whereNull('l.language_id')
    ->get(['s.staff_id', 's.staff_name', 's.language_id'])
    ->map(fn($r) => (array)$r)->all();
$orphanStaffIds = array_values(array_map(fn($r) => (int)$r['staff_id'], $orphanStaff));

$defaultBefore = decodeSetting(settingRow('default_language'));
$supportedBefore = decodeSetting(settingRow('supported_languages'));

$translationCounts = ['de' => 0, 'De' => 0, 'DE' => 0];
if (Schema::connection('tenant')->hasTable('language_translations')) {
    foreach (array_keys($translationCounts) as $locale) {
        $translationCounts[$locale] = DB::connection('tenant')->table('language_translations')
            ->whereRaw('BINARY locale = ?', [$locale])->count();
    }
}

out('MODE', $apply ? 'APPLY' : 'DRY_RUN');
out('TENANT_DB', DB::connection('tenant')->getDatabaseName());
out('LANGUAGES_BEFORE', $languages->map(fn($r) => (array)$r)->all());
out('CANONICAL_EN_ID', $canonicalEnId);
out('CANONICAL_DE_ID', $canonicalDeId);
out('DISABLE_DUPLICATE_DE_IDS', $duplicateDeIds);
out('DISABLE_NON_EN_DE_IDS', $nonEnDeActiveIds);
out('ORPHAN_STAFF', $orphanStaff);
out('SUPPORTED_LANGUAGES_BEFORE', $supportedBefore);
out('DEFAULT_LANGUAGE_BEFORE', $defaultBefore);
out('TRANSLATION_COUNTS_BEFORE', $translationCounts);
out('PLAN', [
    'canonical_en' => 'en',
    'canonical_de' => 'de',
    'disable_language_ids' => array_values(array_unique(array_merge($duplicateDeIds, $nonEnDeActiveIds))),
    'map_orphan_staff_ids_to_de' => $orphanStaffIds,
    'supported_languages' => ['en', 'de'],
    'default_language' => 'de',
    'normalize_translation_locale' => 'De -> de',
]);

if (!$apply) {
    out('DRY_RUN_OK', 1);
    exit(0);
}

DB::connection('tenant')->transaction(function () use (
    $central,
    $canonicalEnId,
    $canonicalDeId,
    $duplicateDeIds,
    $nonEnDeActiveIds,
    $orphanStaffIds
) {
    $enId = $canonicalEnId;
    if ($enId) {
        DB::connection('tenant')->table('languages')->where('language_id', $enId)
            ->update(languagePayload($central['en'], 'en'));
    } else {
        $enId = DB::connection('tenant')->table('languages')
            ->insertGetId(languagePayload($central['en'], 'en'));
    }

    DB::connection('tenant')->table('languages')->where('language_id', $canonicalDeId)
        ->update(languagePayload($central['de'], 'de'));

    $disableIds = array_values(array_unique(array_merge($duplicateDeIds, $nonEnDeActiveIds)));
    if ($disableIds) {
        DB::connection('tenant')->table('languages')->whereIn('language_id', $disableIds)
            ->update(['status' => 0]);
    }

    if ($duplicateDeIds) {
        DB::connection('tenant')->table('staffs')->whereIn('language_id', $duplicateDeIds)
            ->update(['language_id' => $canonicalDeId]);
    }

    if ($orphanStaffIds) {
        DB::connection('tenant')->table('staffs')->whereIn('staff_id', $orphanStaffIds)
            ->update(['language_id' => $canonicalDeId]);
    }

    if (Schema::connection('tenant')->hasTable('language_translations')) {
        $legacyRows = DB::connection('tenant')->table('language_translations')
            ->whereRaw('BINARY locale = ?', ['De'])->orderBy('translation_id')->get();

        foreach ($legacyRows as $row) {
            $collision = DB::connection('tenant')->table('language_translations')
                ->whereRaw('BINARY locale = ?', ['de'])
                ->where('namespace', $row->namespace)
                ->where('group', $row->group)
                ->where('item', $row->item)
                ->exists();

            if ($collision) {
                throw new RuntimeException('Translation collision while normalizing De to de for translation_id='.$row->translation_id);
            }

            DB::connection('tenant')->table('language_translations')
                ->where('translation_id', $row->translation_id)
                ->update(['locale' => 'de']);
        }
    }

    upsertSetting('supported_languages', ['en', 'de'], true);
    upsertSetting('default_language', 'de', false);
});

// Invalidate only the new tenant-scoped settings cache used by the runtime patch.
$tenantCacheKey = 'igniter.setting.system.tenant.'.sha1(strtolower((string)$tenant->database));
app('cache.store')->forget($tenantCacheKey);
out('TENANT_SETTINGS_CACHE_FORGOTTEN', $tenantCacheKey);

$activeExactEn = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['en'])->where('status', 1)->count();
$activeExactDe = DB::connection('tenant')->table('languages')
    ->whereRaw('BINARY code = ?', ['de'])->where('status', 1)->count();
$activeOther = DB::connection('tenant')->table('languages')
    ->where('status', 1)->whereRaw('LOWER(code) NOT IN (?, ?)', ['en', 'de'])->count();
$orphanAfter = DB::connection('tenant')->table('staffs as s')
    ->leftJoin('languages as l', 'l.language_id', '=', 's.language_id')
    ->whereNotNull('s.language_id')->whereNull('l.language_id')->count();
$supportedAfter = decodeSetting(settingRow('supported_languages'));
$defaultAfter = decodeSetting(settingRow('default_language'));
$deCountAfter = Schema::connection('tenant')->hasTable('language_translations')
    ? DB::connection('tenant')->table('language_translations')->whereRaw('BINARY locale = ?', ['de'])->count()
    : 0;
$legacyCountAfter = Schema::connection('tenant')->hasTable('language_translations')
    ? DB::connection('tenant')->table('language_translations')->whereRaw('BINARY locale = ?', ['De'])->count()
    : 0;

out('LANGUAGES_AFTER', DB::connection('tenant')->table('languages')->orderBy('language_id')->get()->map(fn($r) => (array)$r)->all());
out('ACTIVE_EXACT_EN_AFTER', $activeExactEn);
out('ACTIVE_EXACT_DE_AFTER', $activeExactDe);
out('ACTIVE_NON_EN_DE_AFTER', $activeOther);
out('ORPHAN_STAFF_COUNT_AFTER', $orphanAfter);
out('SUPPORTED_LANGUAGES_AFTER', $supportedAfter);
out('DEFAULT_LANGUAGE_AFTER', $defaultAfter);
out('DE_TRANSLATION_COUNT_AFTER', $deCountAfter);
out('LEGACY_De_TRANSLATION_COUNT_AFTER', $legacyCountAfter);

$ok = $activeExactEn === 1
    && $activeExactDe === 1
    && $activeOther === 0
    && $orphanAfter === 0
    && $supportedAfter === ['en', 'de']
    && $defaultAfter === 'de'
    && $legacyCountAfter === 0;

out('VERIFY_OK', $ok ? 1 : 0);
exit($ok ? 0 : 20);
