<?php

declare(strict_types=1);

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

function out(string $key, $value): void
{
    if (is_array($value) || is_object($value)) {
        $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    echo $key.'='.$value.PHP_EOL;
}

function quoteIdentifier(string $identifier): string
{
    return '`'.str_replace('`', '``', $identifier).'`';
}

$targetDatabase = $argv[1] ?? 'tomo';
$targetDatabase = trim((string)$targetDatabase);
if ($targetDatabase === '' || !preg_match('/^[A-Za-z0-9_]{1,64}$/', $targetDatabase)) {
    fwrite(STDERR, "ERROR=Invalid database name\n");
    exit(2);
}

$originalDefault = DB::getDefaultConnection();
$originalTenantConfig = (array)Config::get('database.connections.tenant', []);

try {
    echo "PAYMYDINE TOMO ALLERGEN READ-ONLY AUDIT V11\n";
    echo "==========================================\n";
    out('TARGET_DATABASE', $targetDatabase);

    $tenant = DB::connection('mysql')->table('tenants')
        ->where('database', $targetDatabase)
        ->first();

    if (!$tenant) {
        fwrite(STDERR, "ERROR=Tenant registry row not found for {$targetDatabase}\n");
        exit(3);
    }

    $tenantConfig = $originalTenantConfig;
    $tenantConfig['database'] = $targetDatabase;
    foreach ([
        'host' => 'db_host',
        'port' => 'db_port',
        'username' => 'db_user',
        'password' => 'db_pass',
    ] as $configKey => $tenantKey) {
        $candidate = $tenant->{$tenantKey} ?? null;
        if ($candidate !== null && $candidate !== '') {
            $tenantConfig[$configKey] = $candidate;
        }
    }

    Config::set('database.connections.tenant', $tenantConfig);
    DB::purge('tenant');
    DB::reconnect('tenant');

    $conn = DB::connection('tenant');
    $schema = $conn->getSchemaBuilder();
    out('CONNECTED_DATABASE', $conn->getDatabaseName());

    $hasAllergens = $schema->hasTable('allergens');
    $hasAllergenables = $schema->hasTable('allergenables');
    out('HAS_ALLERGENS_TABLE', $hasAllergens ? 1 : 0);
    out('HAS_ALLERGENABLES_TABLE', $hasAllergenables ? 1 : 0);

    if ($hasAllergens) {
        $hasStatus = $schema->hasColumn('allergens', 'status');
        out('ALLERGENS_HAS_STATUS', $hasStatus ? 1 : 0);
        $total = (int)$conn->table('allergens')->count();
        out('ALLERGENS_TOTAL', $total);
        if ($hasStatus) {
            out('ALLERGENS_ACTIVE', (int)$conn->table('allergens')->where('status', 1)->count());
            out('ALLERGENS_DISABLED', (int)$conn->table('allergens')->where('status', 0)->count());
        }

        $columns = ['allergen_id', 'name'];
        if ($hasStatus) $columns[] = 'status';
        $rows = $conn->table('allergens')
            ->orderBy('allergen_id')
            ->get($columns)
            ->map(static fn ($row) => (array)$row)
            ->all();
        out('ALLERGEN_ROWS', $rows);
    }

    if ($hasAllergenables) {
        out('ALLERGENABLES_TOTAL', (int)$conn->table('allergenables')->count());
        $types = $conn->table('allergenables')
            ->select('allergenable_type', DB::raw('COUNT(*) AS c'), DB::raw('COUNT(DISTINCT allergenable_id) AS ids'))
            ->groupBy('allergenable_type')
            ->orderByDesc('c')
            ->get()
            ->map(static fn ($row) => [
                'type' => (string)$row->allergenable_type,
                'rows' => (int)$row->c,
                'distinct_ids' => (int)$row->ids,
            ])
            ->all();
        out('ALLERGENABLE_TYPES', $types);

        if ($hasAllergens) {
            $orphans = (int)$conn->table('allergenables as aa')
                ->leftJoin('allergens as a', 'a.allergen_id', '=', 'aa.allergen_id')
                ->whereNull('a.allergen_id')
                ->count();
            out('ALLERGENABLE_ORPHAN_ROWS', $orphans);
        }
    }

    try {
        $templateExists = (bool)DB::connection('mysql')->selectOne(
            'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
            ['newtenantdb']
        );
        out('NEWTENANTDB_EXISTS', $templateExists ? 1 : 0);
        if ($templateExists) {
            $tableExists = (bool)DB::connection('mysql')->selectOne(
                'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
                ['newtenantdb', 'allergens']
            );
            out('NEWTENANTDB_HAS_ALLERGENS', $tableExists ? 1 : 0);
            if ($tableExists) {
                $row = DB::connection('mysql')->selectOne(
                    'SELECT COUNT(*) AS total, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active FROM '.quoteIdentifier('newtenantdb').'.'.quoteIdentifier('allergens')
                );
                out('NEWTENANTDB_ALLERGENS_TOTAL', (int)($row->total ?? 0));
                out('NEWTENANTDB_ALLERGENS_ACTIVE', (int)($row->active ?? 0));
            }
        }
    } catch (Throwable $e) {
        out('NEWTENANTDB_AUDIT_WARNING', $e->getMessage());
    }

    out('READ_ONLY_OK', 1);
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR='.$e->getMessage().PHP_EOL);
    exit(1);
} finally {
    try { DB::purge('tenant'); } catch (Throwable $ignored) {}
    Config::set('database.connections.tenant', $originalTenantConfig);
    DB::setDefaultConnection($originalDefault);
}
