<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$root = getcwd();
if (!is_string($root) || !is_file($root.'/bootstrap/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "ERROR=Run this audit from the PayMyDine repository root\n");
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

$originalDefault = DB::getDefaultConnection();
$originalTenantConfig = (array)Config::get('database.connections.tenant', []);
$best = null;

try {
    echo "PAYMYDINE ALL-TENANT ALLERGEN READ-ONLY AUDIT V12\n";
    echo "================================================\n";

    $central = DB::connection('mysql');
    $tenants = $central->table('tenants')
        ->orderBy('database')
        ->get();

    out('TENANTS_REGISTERED', count($tenants));

    try {
        $schemas = $central->select(
            "SELECT TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'allergens' ORDER BY TABLE_SCHEMA"
        );
        out('SCHEMAS_WITH_ALLERGENS_TABLE', array_values(array_map(
            static fn ($row) => (string)$row->TABLE_SCHEMA,
            $schemas
        )));
    } catch (Throwable $e) {
        out('INFORMATION_SCHEMA_WARNING', $e->getMessage());
    }

    foreach ($tenants as $tenant) {
        $database = trim((string)($tenant->database ?? ''));
        if ($database === '' || !preg_match('/^[A-Za-z0-9_]{1,64}$/', $database)) {
            out('TENANT_SKIPPED_INVALID_DATABASE', $database);
            continue;
        }

        $tenantConfig = $originalTenantConfig;
        $tenantConfig['database'] = $database;
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

        try {
            Config::set('database.connections.tenant', $tenantConfig);
            DB::purge('tenant');
            DB::reconnect('tenant');

            $conn = DB::connection('tenant');
            $schema = $conn->getSchemaBuilder();
            $hasAllergens = $schema->hasTable('allergens');
            $hasAllergenables = $schema->hasTable('allergenables');

            $report = [
                'database' => $database,
                'domain' => (string)($tenant->domain ?? ''),
                'registry_status' => (string)($tenant->status ?? ''),
                'has_allergens_table' => $hasAllergens,
                'has_allergenables_table' => $hasAllergenables,
                'allergens_total' => 0,
                'allergens_active' => 0,
                'allergens_disabled' => 0,
                'allergenables_total' => 0,
                'allergenable_types' => [],
                'rows' => [],
            ];

            if ($hasAllergens) {
                $hasStatus = $schema->hasColumn('allergens', 'status');
                $report['allergens_total'] = (int)$conn->table('allergens')->count();
                $report['allergens_active'] = $hasStatus
                    ? (int)$conn->table('allergens')->where('status', 1)->count()
                    : $report['allergens_total'];
                $report['allergens_disabled'] = $hasStatus
                    ? (int)$conn->table('allergens')->where('status', 0)->count()
                    : 0;

                $columns = ['allergen_id', 'name'];
                if ($schema->hasColumn('allergens', 'description')) $columns[] = 'description';
                if ($hasStatus) $columns[] = 'status';

                if ($report['allergens_total'] <= 100) {
                    $report['rows'] = $conn->table('allergens')
                        ->orderBy('allergen_id')
                        ->get($columns)
                        ->map(static fn ($row) => (array)$row)
                        ->all();
                }
            }

            if ($hasAllergenables) {
                $report['allergenables_total'] = (int)$conn->table('allergenables')->count();
                $report['allergenable_types'] = $conn->table('allergenables')
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
            }

            if ($report['rows']) {
                $fingerprintRows = array_map(static function (array $row): array {
                    return [
                        'name' => mb_strtolower(trim((string)($row['name'] ?? ''))),
                        'status' => isset($row['status']) ? (int)$row['status'] : 1,
                    ];
                }, $report['rows']);
                $report['allergen_set_sha256'] = hash('sha256', json_encode($fingerprintRows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            } else {
                $report['allergen_set_sha256'] = null;
            }

            out('TENANT', $report);

            if (
                $report['allergens_active'] > 0
                && (
                    $best === null
                    || $report['allergens_active'] > $best['allergens_active']
                    || (
                        $report['allergens_active'] === $best['allergens_active']
                        && $report['allergenables_total'] > $best['allergenables_total']
                    )
                )
            ) {
                $best = $report;
            }
        } catch (Throwable $e) {
            out('TENANT_ERROR', [
                'database' => $database,
                'domain' => (string)($tenant->domain ?? ''),
                'error' => $e->getMessage(),
            ]);
        } finally {
            try { DB::purge('tenant'); } catch (Throwable $ignored) {}
            Config::set('database.connections.tenant', $originalTenantConfig);
        }
    }

    if ($best !== null) {
        out('CANONICAL_CANDIDATE_DATABASE', $best['database']);
        out('CANONICAL_CANDIDATE_DOMAIN', $best['domain']);
        out('CANONICAL_CANDIDATE_ACTIVE', $best['allergens_active']);
        out('CANONICAL_CANDIDATE_PIVOTS', $best['allergenables_total']);
        out('CANONICAL_CANDIDATE_SHA256', $best['allergen_set_sha256']);
        out('CANONICAL_CANDIDATE_ROWS', $best['rows']);
    } else {
        out('CANONICAL_CANDIDATE_DATABASE', 'NONE');
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
