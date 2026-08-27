<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$root = getcwd();
if (!is_string($root) || !is_file($root.'/bootstrap/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "ERROR=Run this recovery from the PayMyDine repository root\n");
    exit(2);
}

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function out(string $key, $value): void
{
    if (is_array($value) || is_object($value)) {
        $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    echo $key.'='.$value.PHP_EOL;
}

function tenantConfigFromRegistry(object $tenant, array $base): array
{
    $config = $base;
    $config['database'] = trim((string)$tenant->database);
    foreach ([
        'host' => 'db_host',
        'port' => 'db_port',
        'username' => 'db_user',
        'password' => 'db_pass',
    ] as $configKey => $tenantKey) {
        $candidate = $tenant->{$tenantKey} ?? null;
        if ($candidate !== null && $candidate !== '') {
            $config[$configKey] = $candidate;
        }
    }
    return $config;
}

function useTenantConnection(array $config): void
{
    Config::set('database.connections.tenant', $config);
    DB::purge('tenant');
    DB::reconnect('tenant');
}

function normalizedRows($rows): array
{
    return collect($rows)->map(static function ($row): array {
        $row = (array)$row;
        return [
            'allergen_id' => (int)($row['allergen_id'] ?? 0),
            'name' => trim((string)($row['name'] ?? '')),
            'description' => (string)($row['description'] ?? ''),
            'status' => (int)($row['status'] ?? 0),
        ];
    })->sortBy('allergen_id')->values()->all();
}

function allergenFingerprint(array $rows): string
{
    $fingerprintRows = array_map(static fn (array $row): array => [
        'name' => mb_strtolower(trim((string)$row['name'])),
        'status' => (int)$row['status'],
    ], $rows);

    return hash('sha256', json_encode($fingerprintRows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

$sourceDatabase = trim((string)($argv[1] ?? 'mimoza'));
$targetDatabase = trim((string)($argv[2] ?? 'tomo'));
foreach ([$sourceDatabase, $targetDatabase] as $database) {
    if ($database === '' || !preg_match('/^[A-Za-z0-9_]{1,64}$/', $database)) {
        fwrite(STDERR, "ERROR=Invalid database name\n");
        exit(2);
    }
}
if ($sourceDatabase === $targetDatabase) {
    fwrite(STDERR, "ERROR=Source and target databases must differ\n");
    exit(2);
}

$expectedFingerprint = '3a160ccc59fc90c14c66052d096fdf34f7f0f60a4d58c76127ab0ebc72ba53f6';
$expectedNames = [
    1 => 'Gluten',
    2 => 'Crustaceans',
    3 => 'Eggs',
    4 => 'Fish',
    5 => 'Peanuts',
    6 => 'Soy',
    7 => 'Milk / Lactose',
    8 => 'Nuts',
    9 => 'Celery',
    10 => 'Mustard',
    11 => 'Sesame',
    12 => 'Sulphites',
    13 => 'Lupin',
    14 => 'Molluscs',
];

$originalDefault = DB::getDefaultConnection();
$originalTenantConfig = (array)Config::get('database.connections.tenant', []);
$backupDir = rtrim((string)(getenv('HOME') ?: '/home/ubuntu'), '/').'/pmd-allergen-v13-backups/'.gmdate('Ymd_His');

try {
    echo "PAYMYDINE TOMO ALLERGEN DEFINITION RECOVERY V13\n";
    echo "===============================================\n";
    out('SOURCE_DATABASE', $sourceDatabase);
    out('TARGET_DATABASE', $targetDatabase);

    $central = DB::connection('mysql');
    $sourceTenant = $central->table('tenants')->where('database', $sourceDatabase)->first();
    $targetTenant = $central->table('tenants')->where('database', $targetDatabase)->first();
    if (!$sourceTenant) throw new RuntimeException('Source tenant registry row not found.');
    if (!$targetTenant) throw new RuntimeException('Target tenant registry row not found.');

    $sourceConfig = tenantConfigFromRegistry($sourceTenant, $originalTenantConfig);
    $targetConfig = tenantConfigFromRegistry($targetTenant, $originalTenantConfig);

    echo "[1/5] Validating canonical source...\n";
    useTenantConnection($sourceConfig);
    $source = DB::connection('tenant');
    $sourceSchema = $source->getSchemaBuilder();
    if (!$sourceSchema->hasTable('allergens')) throw new RuntimeException('Source allergens table is missing.');
    foreach (['allergen_id', 'name', 'description', 'status'] as $column) {
        if (!$sourceSchema->hasColumn('allergens', $column)) {
            throw new RuntimeException('Source allergens column missing: '.$column);
        }
    }

    $sourceRows = normalizedRows($source->table('allergens')
        ->orderBy('allergen_id')
        ->get(['allergen_id', 'name', 'description', 'status']));

    if (count($sourceRows) !== 14) throw new RuntimeException('Source must contain exactly 14 allergen definitions.');
    foreach ($sourceRows as $row) {
        $id = $row['allergen_id'];
        if (!isset($expectedNames[$id]) || $expectedNames[$id] !== $row['name'] || $row['status'] !== 1) {
            throw new RuntimeException('Source allergen set does not match the audited canonical IDs/names/statuses.');
        }
    }
    $sourceFingerprint = allergenFingerprint($sourceRows);
    if (!hash_equals($expectedFingerprint, $sourceFingerprint)) {
        throw new RuntimeException('Source allergen fingerprint differs from V12 audited canonical set.');
    }
    out('SOURCE_ALLERGENS_TOTAL', count($sourceRows));
    out('SOURCE_FINGERPRINT', $sourceFingerprint);
    out('SOURCE_CANONICAL_OK', 1);

    echo "[2/5] Guarding target and writing backup...\n";
    useTenantConnection($targetConfig);
    $target = DB::connection('tenant');
    $targetSchema = $target->getSchemaBuilder();
    if (!$targetSchema->hasTable('allergens')) throw new RuntimeException('Target allergens table is missing.');
    if (!$targetSchema->hasTable('allergenables')) throw new RuntimeException('Target allergenables table is missing.');
    foreach (['allergen_id', 'name', 'description', 'status'] as $column) {
        if (!$targetSchema->hasColumn('allergens', $column)) {
            throw new RuntimeException('Target allergens column missing: '.$column);
        }
    }

    $targetRowsBefore = normalizedRows($target->table('allergens')
        ->orderBy('allergen_id')
        ->get(['allergen_id', 'name', 'description', 'status']));
    $targetPivotBefore = $target->table('allergenables')->orderBy('allergen_id')->get()->map(static fn ($row) => (array)$row)->all();

    out('TARGET_ALLERGENS_BEFORE', count($targetRowsBefore));
    out('TARGET_ALLERGENABLES_BEFORE', count($targetPivotBefore));
    if (count($targetRowsBefore) !== 0) throw new RuntimeException('Target allergens is no longer empty; refusing to overwrite live definitions.');
    if (count($targetPivotBefore) !== 0) throw new RuntimeException('Target allergenables is no longer empty; refusing definition-only recovery without review.');

    if (!is_dir($backupDir) && !mkdir($backupDir, 0750, true) && !is_dir($backupDir)) {
        throw new RuntimeException('Unable to create backup directory.');
    }
    $backup = [
        'created_at_utc' => gmdate('c'),
        'source_database' => $sourceDatabase,
        'target_database' => $targetDatabase,
        'source_rows' => $sourceRows,
        'source_fingerprint' => $sourceFingerprint,
        'target_allergens_before' => $targetRowsBefore,
        'target_allergenables_before' => $targetPivotBefore,
    ];
    file_put_contents(
        $backupDir.'/allergen-definition-recovery-before.json',
        json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL,
        LOCK_EX
    );
    out('BACKUP', $backupDir);
    out('TARGET_EMPTY_GUARD_OK', 1);

    echo "[3/5] Restoring definitions only...\n";
    $target->transaction(function () use ($target, $sourceRows): void {
        foreach ($sourceRows as $row) {
            $target->table('allergens')->insert([
                'allergen_id' => $row['allergen_id'],
                'name' => $row['name'],
                'description' => $row['description'],
                'status' => $row['status'],
            ]);
        }
    });
    out('DEFINITIONS_INSERTED', 14);
    out('PIVOTS_COPIED', 0);

    echo "[4/5] Verifying target exactly...\n";
    $targetRowsAfter = normalizedRows($target->table('allergens')
        ->orderBy('allergen_id')
        ->get(['allergen_id', 'name', 'description', 'status']));
    $targetFingerprint = allergenFingerprint($targetRowsAfter);
    $targetPivotsAfter = (int)$target->table('allergenables')->count();

    if ($targetRowsAfter !== $sourceRows) throw new RuntimeException('Post-write target definitions differ from source definitions.');
    if (!hash_equals($expectedFingerprint, $targetFingerprint)) throw new RuntimeException('Post-write target fingerprint mismatch.');
    if ($targetPivotsAfter !== 0) throw new RuntimeException('Unexpected target allergenables rows appeared during definition recovery.');

    out('TARGET_ALLERGENS_AFTER', count($targetRowsAfter));
    out('TARGET_ACTIVE_AFTER', (int)$target->table('allergens')->where('status', 1)->count());
    out('TARGET_FINGERPRINT', $targetFingerprint);
    out('TARGET_ALLERGENABLES_AFTER', $targetPivotsAfter);
    out('TARGET_EXACT_MATCH_OK', 1);

    echo "[5/5] Recovery complete...\n";
    out('TOMO_ALLERGEN_DEFINITIONS_V13_OK', 1);
    out('NOTE', 'Definitions restored only. Existing Tomo food-to-allergen associations were already zero and were not guessed or copied from another restaurant.');
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR='.$e->getMessage().PHP_EOL);
    exit(1);
} finally {
    try { DB::purge('tenant'); } catch (Throwable $ignored) {}
    Config::set('database.connections.tenant', $originalTenantConfig);
    DB::setDefaultConnection($originalDefault);
}
