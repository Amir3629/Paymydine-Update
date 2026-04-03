<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

function out(array $data, int $code = 0): void {
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL;
    exit($code);
}

function logx(string $tag, array $ctx = []): void {
    $line = '['.gmdate('Y-m-d H:i:s')."] {$tag} ".json_encode($ctx, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;
    @file_put_contents('/var/www/paymydine/storage/logs/r2o_live_sync.log', $line, FILE_APPEND);
    @file_put_contents('/var/www/paymydine/storage/logs/system.log', $line, FILE_APPEND);
}

function env_read(string $path): array {
    $out = [];
    if (!is_file($path)) return $out;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $p = strpos($line, '=');
        if ($p === false) continue;
        $k = trim(substr($line, 0, $p));
        $v = trim(substr($line, $p + 1));
        $v = trim($v, "\"'");
        $out[$k] = $v;
    }
    return $out;
}

function pdo_connect(string $host, string $port, string $db, string $user, string $pass): PDO {
    return new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}

function table_exists(PDO $pdo, string $table): bool {
    $st = $pdo->prepare("SHOW TABLES LIKE ?");
    $st->execute([$table]);
    return (bool)$st->fetchColumn();
}

function cols(PDO $pdo, string $table): array {
    $st = $pdo->query("SHOW COLUMNS FROM `{$table}`");
    $out = [];
    foreach ($st->fetchAll() as $r) $out[$r['Field']] = $r;
    return $out;
}

function cli_arg(string $name, $default = null) {
    global $argv;
    foreach ($argv as $arg) {
        if (preg_match('/^--'.preg_quote($name, '/').'=(.*)$/', $arg, $m)) return $m[1];
    }
    return $default;
}

function resolve_config_id(): int {
    global $argv;
    $cfg = cli_arg('config-id', null);
    if ($cfg !== null && $cfg !== '') return (int)$cfg;
    if (isset($argv[1]) && preg_match('/^\d+$/', (string)$argv[1])) return (int)$argv[1];
    return 18;
}

function find_tenant_and_config(PDO $central, string $dbHost, string $dbPort, string $dbUser, string $dbPass, int $configId): array {
    $tenantTable = table_exists($central, 'ti_tenants') ? 'ti_tenants' : (table_exists($central, 'tenants') ? 'tenants' : null);
    if (!$tenantTable) throw new RuntimeException('tenant table not found');

    $tenants = $central->query("SELECT * FROM `{$tenantTable}` ORDER BY id ASC")->fetchAll();
    foreach ($tenants as $tenant) {
        $db = (string)($tenant['database'] ?? '');
        if ($db === '') continue;
        try {
            $tpdo = pdo_connect($dbHost, $dbPort, $db, $dbUser, $dbPass);
            foreach (['ti_pos_configs', 'pos_configs'] as $t) {
                if (!table_exists($tpdo, $t)) continue;
                $c = cols($tpdo, $t);
                $pk = isset($c['config_id']) ? 'config_id' : (isset($c['id']) ? 'id' : null);
                if (!$pk) continue;

                $st = $tpdo->prepare("SELECT * FROM `{$t}` WHERE `{$pk}`=? LIMIT 1");
                $st->execute([$configId]);
                $row = $st->fetch();
                if ($row) return [$tenant, $tpdo];
            }
        } catch (Throwable $e) {
        }
    }
    throw new RuntimeException("POS config {$configId} not found in any tenant DB");
}

$configId = resolve_config_id();
$env = env_read('/var/www/paymydine/.env');

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbName = $env['DB_DATABASE'] ?? '';
$dbUser = $env['DB_USERNAME'] ?? '';
$dbPass = $env['DB_PASSWORD'] ?? '';

$central = pdo_connect($dbHost, $dbPort, $dbName, $dbUser, $dbPass);
[$tenant, $tpdo] = find_tenant_and_config($central, $dbHost, $dbPort, $dbUser, $dbPass, $configId);

$mappingTable = table_exists($tpdo, 'ti_pos_table_mappings') ? 'ti_pos_table_mappings' : (table_exists($tpdo, 'pos_table_mappings') ? 'pos_table_mappings' : null);
$tablesTable  = table_exists($tpdo, 'ti_tables') ? 'ti_tables' : (table_exists($tpdo, 'tables') ? 'tables' : null);
if (!$mappingTable || !$tablesTable) throw new RuntimeException('mapping or tables table missing');

$mcols = cols($tpdo, $mappingTable);
$tcols = cols($tpdo, $tablesTable);

$tablePk = isset($tcols['table_id']) ? 'table_id' : (isset($tcols['id']) ? 'id' : null);
$mappingPk = isset($mcols['mapping_id']) ? 'mapping_id' : (isset($mcols['id']) ? 'id' : null);
if (!$tablePk || !$mappingPk) throw new RuntimeException('primary key missing');

$maxNo = 0;
foreach (['table_no','number','table_number'] as $nf) {
    if (isset($tcols[$nf])) {
        $maxNo = (int)$tpdo->query("SELECT COALESCE(MAX(CAST(`{$nf}` AS UNSIGNED)),0) FROM `{$tablesTable}`")->fetchColumn();
        break;
    }
}

$rows = $tpdo->query("
    SELECT *
    FROM `{$mappingTable}`
    WHERE external_table_name IS NOT NULL
      AND TRIM(external_table_name) <> ''
    ORDER BY {$mappingPk} ASC
")->fetchAll();

$matchedExisting = 0;
$createdNew = 0;
$renamedLocal = 0;
$matchedTables = [];
$createdTables = [];
$unmappedTables = [];

foreach ($rows as $map) {
    $externalId = trim((string)($map['external_table_id'] ?? ''));
    $externalName = trim((string)($map['external_table_name'] ?? ''));
    if ($externalName === '') continue;

    $localId = isset($map['local_table_id']) && $map['local_table_id'] !== null ? (int)$map['local_table_id'] : null;
    $local = null;

    if ($localId) {
        $st = $tpdo->prepare("SELECT * FROM `{$tablesTable}` WHERE `{$tablePk}`=? LIMIT 1");
        $st->execute([$localId]);
        $local = $st->fetch();
    }

    if (!$local) {
        foreach (['table_name','name'] as $nf) {
            if (isset($tcols[$nf])) {
                $st = $tpdo->prepare("SELECT * FROM `{$tablesTable}` WHERE LOWER(`{$nf}`)=LOWER(?) LIMIT 1");
                $st->execute([$externalName]);
                $local = $st->fetch();
                if ($local) {
                    $localId = (int)$local[$tablePk];
                    break;
                }
            }
        }
    }

    if ($local) {
        $sets = [];
        $vals = [];

        if (isset($tcols['table_name']) && (string)($local['table_name'] ?? '') !== $externalName) {
            $sets[] = "`table_name`=?";
            $vals[] = $externalName;
            $renamedLocal++;
        }
        if (isset($tcols['name']) && (string)($local['name'] ?? '') !== $externalName) {
            $sets[] = "`name`=?";
            $vals[] = $externalName;
        }
        if (isset($tcols['description'])) {
            $sets[] = "`description`=?";
            $vals[] = 'Synced from Ready2Order';
        }
        foreach (['status','status_id'] as $sf) {
            if (isset($tcols[$sf]) && (($local[$sf] ?? null) === null || (string)$local[$sf] === '')) {
                $sets[] = "`{$sf}`=?";
                $vals[] = 1;
            }
        }
        foreach (['is_active','enabled','visible','is_enabled'] as $sf) {
            if (isset($tcols[$sf]) && (($local[$sf] ?? null) === null || (string)$local[$sf] === '')) {
                $sets[] = "`{$sf}`=?";
                $vals[] = 1;
            }
        }
        if (isset($tcols['location_id']) && (($local['location_id'] ?? null) === null || (string)$local['location_id'] === '')) {
            $sets[] = "`location_id`=?";
            $vals[] = 1;
        }
        if (isset($tcols['updated_at'])) {
            $sets[] = "`updated_at`=?";
            $vals[] = gmdate('Y-m-d H:i:s');
        }

        if ($sets) {
            $vals[] = $localId;
            $sql = "UPDATE `{$tablesTable}` SET ".implode(', ', $sets)." WHERE `{$tablePk}`=?";
            $tpdo->prepare($sql)->execute($vals);
        }

        if ($localId && isset($mcols['local_table_id']) && (string)($map['local_table_id'] ?? '') !== (string)$localId) {
            $tpdo->prepare("UPDATE `{$mappingTable}` SET `local_table_id`=? WHERE `{$mappingPk}`=?")->execute([$localId, $map[$mappingPk]]);
        }

        $matchedExisting++;
        $matchedTables[] = [
            'mapping_id' => $map[$mappingPk],
            'external_table_id' => $externalId,
            'external_table_name' => $externalName,
            'local_table_id' => $localId,
            'status' => 'already_mapped',
        ];
        continue;
    }

    $payload = [];
    foreach ([
        'table_name' => $externalName,
        'name' => $externalName,
        'description' => 'Synced from Ready2Order',
        'created_at' => gmdate('Y-m-d H:i:s'),
        'updated_at' => gmdate('Y-m-d H:i:s'),
        'source' => 'ready2order',
        'provider' => 'ready2order',
        'source_key' => 'ready2order-table',
        'location_id' => 1,
        'min_capacity' => 1,
        'max_capacity' => 4,
        'status' => 1,
        'status_id' => 1,
        'is_active' => 1,
        'enabled' => 1,
        'visible' => 1,
        'pos_table_id' => $externalId,
        'external_table_id' => $externalId,
        'remote_id' => $externalId,
        'provider_table_id' => $externalId,
        'r2o_id' => $externalId,
    ] as $k => $v) {
        if (isset($tcols[$k])) $payload[$k] = $v;
    }

    foreach (['table_no','number','table_number'] as $nf) {
        if (isset($tcols[$nf])) {
            $maxNo++;
            $payload[$nf] = (string)$maxNo;
            break;
        }
    }

    $fields = array_keys($payload);
    $marks = implode(',', array_fill(0, count($fields), '?'));
    $sql = "INSERT INTO `{$tablesTable}` (`".implode('`,`', $fields)."`) VALUES ({$marks})";
    $tpdo->prepare($sql)->execute(array_values($payload));
    $newId = (int)$tpdo->lastInsertId();

    if (isset($mcols['local_table_id'])) {
        $tpdo->prepare("UPDATE `{$mappingTable}` SET `local_table_id`=? WHERE `{$mappingPk}`=?")->execute([$newId, $map[$mappingPk]]);
    }

    if (table_exists($tpdo, 'locationables')) {
        $tpdo->prepare("
            INSERT INTO `locationables` (`location_id`,`locationable_id`,`locationable_type`,`created_at`,`updated_at`)
            VALUES (?,?,?,?,?)
        ")->execute([1, $newId, 'tables', gmdate('Y-m-d H:i:s'), gmdate('Y-m-d H:i:s')]);
    }

    $createdNew++;
    $createdTables[] = [
        'mapping_id' => $map[$mappingPk],
        'external_table_id' => $externalId,
        'external_table_name' => $externalName,
        'local_table_id' => $newId,
        'status' => 'created_local_table',
    ];
}

out([
    'success' => true,
    'matched_existing' => $matchedExisting,
    'created_new_tables' => $createdNew,
    'skipped' => 0,
    'matched_tables' => $matchedTables,
    'created_tables' => $createdTables,
    'unmapped_tables' => $unmappedTables,
    'renamed_local_tables' => $renamedLocal,
]);
