<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

date_default_timezone_set('UTC');

function pmd_json($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function pmd_log(string $tag, array $data = []): void {
    $line = '['.gmdate('Y-m-d H:i:s')."] {$tag} ".json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL;
    @file_put_contents(__DIR__.'/../storage/logs/r2o_sync_tables_ajax.log', $line, FILE_APPEND);
    @file_put_contents(__DIR__.'/../storage/logs/system.log', '['.gmdate('Y-m-d H:i:s')."] {$tag} ".json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL, FILE_APPEND);
}

function env_read(string $path): array {
    $out = [];
    if (!is_file($path)) return $out;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
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
    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function table_exists(PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$table]);
    return (bool)$stmt->fetchColumn();
}

function get_columns(PDO $pdo, string $table): array {
    $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
    $cols = [];
    foreach ($stmt->fetchAll() as $row) {
        $cols[$row['Field']] = $row;
    }
    return $cols;
}

function pick_first_existing_table(PDO $pdo, array $candidates): ?string {
    foreach ($candidates as $t) {
        if (table_exists($pdo, $t)) return $t;
    }
    return null;
}

function array_deep_find_token($value): ?string {
    if (is_array($value)) {
        foreach ($value as $k => $v) {
            if (is_string($k) && preg_match('/(^|_)(token|jwt|bearer|access_token|api_token|account_token|password)$/i', $k)) {
                if (is_string($v) && trim($v) !== '') return trim($v);
            }
            $found = array_deep_find_token($v);
            if ($found) return $found;
        }
    } elseif (is_object($value)) {
        return array_deep_find_token((array)$value);
    } elseif (is_string($value)) {
        $trim = trim($value);
        if ($trim !== '' && ($trim[0] === '{' || $trim[0] === '[')) {
            $decoded = json_decode($trim, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $found = array_deep_find_token($decoded);
                if ($found) return $found;
            }
        }
    }
    return null;
}

function normalize_base_url(?string $url): string {
    $url = trim((string)$url);
    if ($url === '') return 'https://api.ready2order.com/v1';
    return rtrim($url, '/');
}

function find_pos_config(PDO $pdo, ?int $id = null): array {
    foreach (['pos_configs', 'ti_pos_configs'] as $table) {
        if (!table_exists($pdo, $table)) continue;

        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) return [$table, $row];
        }

        $sql = "SELECT * FROM `{$table}` 
                WHERE 
                    (LOWER(COALESCE(url,'')) LIKE '%ready2order%' OR LOWER(COALESCE(url,'')) LIKE '%api.ready2order.com%')
                 OR (LOWER(COALESCE(name,'')) LIKE '%ready2order%')
                 OR (LOWER(COALESCE(description,'')) LIKE '%ready2order%')
                ORDER BY id DESC LIMIT 5";
        $rows = $pdo->query($sql)->fetchAll();
        foreach ($rows as $row) {
            return [$table, $row];
        }

        $rows = $pdo->query("SELECT * FROM `{$table}` ORDER BY id DESC LIMIT 20")->fetchAll();
        foreach ($rows as $row) {
            $joined = strtolower(json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            if (str_contains($joined, 'ready2order') || str_contains($joined, 'api.ready2order.com')) {
                return [$table, $row];
            }
        }
    }

    throw new RuntimeException('ready2order pos config not found in tenant db');
}

function extract_token_from_config(array $row): ?string {
    foreach ([
        'password','token','api_token','account_token','access_token','jwt','bearer_token',
        'auth_token','secret'
    ] as $key) {
        if (!empty($row[$key]) && is_string($row[$key])) {
            return trim($row[$key]);
        }
    }

    foreach ($row as $k => $v) {
        if (is_string($k) && preg_match('/(^|_)(token|jwt|bearer|access_token|api_token|account_token|password)$/i', $k)) {
            if (is_string($v) && trim($v) !== '') return trim($v);
        }
        $found = array_deep_find_token($v);
        if ($found) return $found;
    }

    return null;
}

function fetch_r2o_tables(string $baseUrl, string $token): array {
    $url = rtrim($baseUrl, '/') . '/tables';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Bearer '.$token,
        ],
    ]);

    $body = curl_exec($ch);
    $err = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    pmd_log('PMD_R2O_TABLE_SYNC_FETCH', [
        'url' => $url,
        'http_code' => $http,
        'curl_error' => $err,
        'body_len' => is_string($body) ? strlen($body) : 0,
    ]);

    if ($body === false || $err) {
        throw new RuntimeException('curl failed: '.$err);
    }
    if ($http < 200 || $http >= 300) {
        throw new RuntimeException("ready2order /tables failed with HTTP {$http}");
    }

    $json = json_decode($body, true);
    if (!is_array($json)) {
        throw new RuntimeException('ready2order /tables returned non-json');
    }

    $candidates = [];
    if (isset($json['data']) && is_array($json['data'])) $candidates = $json['data'];
    elseif (isset($json['tables']) && is_array($json['tables'])) $candidates = $json['tables'];
    elseif (array_is_list($json)) $candidates = $json;
    else {
        foreach ($json as $v) {
            if (is_array($v) && array_is_list($v) && isset($v[0]) && is_array($v[0])) {
                $candidates = $v;
                break;
            }
        }
    }

    $out = [];
    foreach ($candidates as $row) {
        if (!is_array($row)) continue;

        $id = $row['id'] ?? $row['tableId'] ?? $row['table_id'] ?? $row['uuid'] ?? null;
        $name = $row['name'] ?? $row['label'] ?? $row['title'] ?? $row['tableName'] ?? $row['table_name'] ?? null;
        $number = $row['number'] ?? $row['tableNumber'] ?? $row['table_number'] ?? null;
        $active = $row['active'] ?? $row['isActive'] ?? $row['enabled'] ?? 1;

        if (($name === null || $name === '') && $number !== null && $number !== '') {
            $name = 'Table '.$number;
        }
        if ($name === null || trim((string)$name) === '') continue;

        if (($number === null || $number === '') && preg_match('/(\d+)/', (string)$name, $m)) {
            $number = $m[1];
        }

        $out[] = [
            'remote_id' => (string)$id,
            'name' => trim((string)$name),
            'number' => $number !== null ? trim((string)$number) : null,
            'active' => (int)(bool)$active,
            'raw' => $row,
        ];
    }

    return $out;
}

function build_local_row(array $cols, array $remote, int $seq): array {
    $row = [];

    $name = $remote['name'];
    $number = $remote['number'] !== null && $remote['number'] !== '' ? $remote['number'] : (string)$seq;
    $now = gmdate('Y-m-d H:i:s');

    $map = [
        'name' => $name,
        'table_name' => $name,
        'title' => $name,
        'description' => 'Synced from Ready2Order',
        'table_no' => $number,
        'table_number' => $number,
        'number' => $number,
        'min_capacity' => 1,
        'max_capacity' => 4,
        'capacity' => 4,
        'status' => 1,
        'status_id' => 1,
        'is_active' => $remote['active'] ? 1 : 0,
        'enabled' => $remote['active'] ? 1 : 0,
        'provider' => 'ready2order',
        'source' => 'ready2order',
        'source_key' => 'ready2order-table',
        'external_id' => $remote['remote_id'],
        'provider_table_id' => $remote['remote_id'],
        'pos_table_id' => $remote['remote_id'],
        'r2o_id' => $remote['remote_id'],
        'remote_id' => $remote['remote_id'],
        'meta' => json_encode($remote['raw'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'data' => json_encode($remote['raw'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'created_at' => $now,
        'updated_at' => $now,
    ];

    foreach ($map as $k => $v) {
        if (isset($cols[$k])) $row[$k] = $v;
    }

    return $row;
}

function find_existing_local(PDO $pdo, string $table, array $cols, array $remote): ?array {
    foreach (['r2o_id','pos_table_id','provider_table_id','external_id','remote_id'] as $key) {
        if (isset($cols[$key]) && $remote['remote_id'] !== '') {
            $stmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `{$key}` = ? LIMIT 1");
            $stmt->execute([$remote['remote_id']]);
            $row = $stmt->fetch();
            if ($row) return $row;
        }
    }

    foreach (['table_name','name','title'] as $key) {
        if (isset($cols[$key])) {
            $stmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE LOWER(`{$key}`) = LOWER(?) LIMIT 1");
            $stmt->execute([$remote['name']]);
            $row = $stmt->fetch();
            if ($row) return $row;
        }
    }

    foreach (['table_no','table_number','number'] as $key) {
        if (isset($cols[$key]) && $remote['number'] !== null && $remote['number'] !== '') {
            $stmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `{$key}` = ? LIMIT 1");
            $stmt->execute([$remote['number']]);
            $row = $stmt->fetch();
            if ($row) return $row;
        }
    }

    return null;
}

function save_local_table(PDO $pdo, string $table, array $cols, array $remote, int $seq): array {
    $existing = find_existing_local($pdo, $table, $cols, $remote);
    $row = build_local_row($cols, $remote, $seq);

    if ($existing) {
        $idField = isset($cols['table_id']) ? 'table_id' : (isset($cols['id']) ? 'id' : array_key_first($cols));
        if (!$idField || !isset($existing[$idField])) {
            throw new RuntimeException("cannot determine primary key for {$table}");
        }

        $update = $row;
        unset($update['created_at']);

        if (!$update) {
            return ['action' => 'matched', 'id' => $existing[$idField]];
        }

        $sets = [];
        $vals = [];
        foreach ($update as $k => $v) {
            if (!isset($cols[$k])) continue;
            $sets[] = "`{$k}` = ?";
            $vals[] = $v;
        }
        $vals[] = $existing[$idField];

        if ($sets) {
            $sql = "UPDATE `{$table}` SET ".implode(', ', $sets)." WHERE `{$idField}` = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($vals);
        }

        return ['action' => 'updated', 'id' => $existing[$idField]];
    }

    $fields = [];
    $marks = [];
    $vals = [];
    foreach ($row as $k => $v) {
        if (!isset($cols[$k])) continue;
        $fields[] = "`{$k}`";
        $marks[] = '?';
        $vals[] = $v;
    }

    if (!$fields) {
        throw new RuntimeException("no compatible columns found in {$table}");
    }

    $sql = "INSERT INTO `{$table}` (".implode(', ', $fields).") VALUES (".implode(', ', $marks).")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);
    $newId = (int)$pdo->lastInsertId();

    return ['action' => 'inserted', 'id' => $newId];
}

function link_to_location_if_possible(PDO $pdo, int $tableId): void {
    if (!table_exists($pdo, 'locationables')) return;
    $cols = get_columns($pdo, 'locationables');

    if (!isset($cols['location_id'], $cols['locationable_id'], $cols['locationable_type'])) return;

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `locationables` WHERE location_id = ? AND locationable_id = ? AND locationable_type = ?");
    $stmt->execute([1, $tableId, 'tables']);
    $exists = (int)$stmt->fetchColumn() > 0;
    if ($exists) return;

    $fields = ['location_id','locationable_id','locationable_type'];
    $vals = [1, $tableId, 'tables'];

    if (isset($cols['created_at'])) {
        $fields[] = 'created_at';
        $vals[] = gmdate('Y-m-d H:i:s');
    }
    if (isset($cols['updated_at'])) {
        $fields[] = 'updated_at';
        $vals[] = gmdate('Y-m-d H:i:s');
    }

    $marks = implode(',', array_fill(0, count($fields), '?'));
    $stmt = $pdo->prepare("INSERT INTO `locationables` (`".implode('`,`', $fields)."`) VALUES ({$marks})");
    $stmt->execute($vals);
}

try {
    $appRoot = realpath(__DIR__.'/..');
    if (!$appRoot) {
        throw new RuntimeException('app root not found');
    }

    $env = env_read($appRoot.'/.env');

    $dbHost = $env['DB_HOST'] ?? '127.0.0.1';
    $dbPort = $env['DB_PORT'] ?? '3306';
    $dbName = $env['DB_DATABASE'] ?? '';
    $dbUser = $env['DB_USERNAME'] ?? '';
    $dbPass = $env['DB_PASSWORD'] ?? '';

    if ($dbName === '' || $dbUser === '') {
        throw new RuntimeException('central DB credentials missing in .env');
    }

    $host = $_SERVER['HTTP_HOST'] ?? ($_GET['host'] ?? $_POST['host'] ?? '');
    $host = strtolower(trim(preg_replace('/:\d+$/', '', (string)$host)));
    if ($host === '') {
        throw new RuntimeException('HTTP_HOST missing');
    }

    $central = pdo_connect($dbHost, $dbPort, $dbName, $dbUser, $dbPass);

    $tenantTable = table_exists($central, 'ti_tenants') ? 'ti_tenants' : (table_exists($central, 'tenants') ? 'tenants' : null);
    if (!$tenantTable) {
        throw new RuntimeException('tenant table not found');
    }

    $stmt = $central->prepare("SELECT * FROM `{$tenantTable}` WHERE LOWER(domain) = LOWER(?) LIMIT 1");
    $stmt->execute([$host]);
    $tenant = $stmt->fetch();
    if (!$tenant || empty($tenant['database'])) {
        throw new RuntimeException("tenant not found for host {$host}");
    }

    $tenantDb = (string)$tenant['database'];
    $tenantPdo = pdo_connect($dbHost, $dbPort, $tenantDb, $dbUser, $dbPass);

    $configId = isset($_REQUEST['config_id']) && is_numeric($_REQUEST['config_id']) ? (int)$_REQUEST['config_id'] : null;
    [$posTable, $config] = find_pos_config($tenantPdo, $configId);
    $token = extract_token_from_config($config);
    $baseUrl = normalize_base_url($config['url'] ?? 'https://api.ready2order.com/v1');

    if (!$token) {
        throw new RuntimeException('ready2order token not found in pos config');
    }

    $remoteTables = fetch_r2o_tables($baseUrl, $token);
    $localTable = pick_first_existing_table($tenantPdo, ['tables', 'ti_tables']);

    if (!$localTable) {
        throw new RuntimeException('local tables table not found (tables / ti_tables)');
    }

    $localCols = get_columns($tenantPdo, $localTable);

    $inserted = 0;
    $updated = 0;
    $matched = 0;
    $resultRows = [];
    $seq = 1;

    foreach ($remoteTables as $remote) {
        $res = save_local_table($tenantPdo, $localTable, $localCols, $remote, $seq++);
        if ($res['action'] === 'inserted') $inserted++;
        elseif ($res['action'] === 'updated') $updated++;
        else $matched++;

        if (($res['action'] === 'inserted' || $res['action'] === 'updated') && isset($res['id']) && $res['id']) {
            link_to_location_if_possible($tenantPdo, (int)$res['id']);
        }

        $resultRows[] = [
            'remote_id' => $remote['remote_id'],
            'name' => $remote['name'],
            'number' => $remote['number'],
            'action' => $res['action'],
            'local_id' => $res['id'] ?? null,
        ];
    }

    pmd_log('PMD_R2O_SYNC_TABLES_FIXED', [
        'tenant_domain' => $host,
        'tenant_db' => $tenantDb,
        'pos_table' => $posTable,
        'local_table' => $localTable,
        'fetched_total' => count($remoteTables),
        'inserted' => $inserted,
        'updated' => $updated,
        'matched_existing' => $matched,
    ]);

    pmd_json([
        'success' => true,
        'message' => 'ready2order tables synced successfully',
        'tenant_domain' => $host,
        'tenant_db' => $tenantDb,
        'pos_config_table' => $posTable,
        'pos_config_id' => $config['id'] ?? null,
        'base_url' => $baseUrl,
        'local_table' => $localTable,
        'fetched_total' => count($remoteTables),
        'inserted' => $inserted,
        'updated' => $updated,
        'matched_existing' => $matched,
        'tables' => $resultRows,
    ]);
} catch (Throwable $e) {
    pmd_log('PMD_R2O_SYNC_TABLES_FIXED_ERROR', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);

    pmd_json([
        'success' => false,
        'message' => $e->getMessage(),
    ], 500);
}
