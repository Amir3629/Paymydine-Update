<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

const DEFAULT_BASE = 'https://api.ready2order.com/v1';

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

function extract_token(array $row): ?string {
    foreach (['access_token','password','token','api_token','access_token','account_token','jwt','bearer_token','secret'] as $k) {
        if (!empty($row[$k]) && is_string($row[$k])) return trim($row[$k]);
    }
    foreach ($row as $k => $v) {
        if (!is_string($v) || trim($v) === '') continue;
        $j = json_decode($v, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($j)) {
            foreach (['access_token','password','token','api_token','account_token','jwt','bearer_token','secret'] as $kk) {
                if (!empty($j[$kk]) && is_string($j[$kk])) return trim($j[$kk]);
            }
        }
    }
    return null;
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
                if ($row) {
                    return [$tenant, $tpdo, $t, $pk, $row];
                }
            }
        } catch (Throwable $e) {
        }
    }
    throw new RuntimeException("POS config {$configId} not found in any tenant DB");
}

function http_json(string $url, string $token): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Bearer '.$token,
        ],
    ]);
    $body = curl_exec($ch);
    $err  = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    logx('PMD_R2O_TABLE_SYNC fetch_tables', [
        'url' => $url,
        'http_code' => $http,
        'curl_error' => $err,
        'body_len' => is_string($body) ? strlen($body) : 0,
    ]);

    if ($body === false || $err) throw new RuntimeException("curl failed: {$err}");
    if ($http < 200 || $http >= 300) throw new RuntimeException("HTTP {$http} from {$url}");

    $json = json_decode($body, true);
    if (!is_array($json)) throw new RuntimeException("non-json response from {$url}");

    return $json;
}

function collect_live_tables(string $baseUrl, string $token): array {
    $baseUrl = rtrim($baseUrl, '/');
    $tryUrls = [
        $baseUrl.'/tables?limit=500',
        $baseUrl.'/tables',
        $baseUrl.'/table?limit=500',
        $baseUrl.'/table',
    ];

    $picked = [];
    foreach ($tryUrls as $url) {
        try {
            $json = http_json($url, $token);

            $lists = [];
            if (isset($json['data']) && is_array($json['data'])) $lists[] = $json['data'];
            if (isset($json['tables']) && is_array($json['tables'])) $lists[] = $json['tables'];
            if (array_is_list($json)) $lists[] = $json;
            foreach ($json as $v) {
                if (is_array($v) && array_is_list($v) && isset($v[0]) && is_array($v[0])) $lists[] = $v;
            }

            foreach ($lists as $list) {
                foreach ($list as $row) {
                    if (!is_array($row)) continue;

                    $id = $row['id'] ?? $row['table_id'] ?? $row['tableId'] ?? $row['uuid'] ?? null;
                    $name = $row['name'] ?? $row['table_name'] ?? $row['tableName'] ?? $row['label'] ?? $row['title'] ?? null;

                    $area = '';
                    foreach (['area','room','zone','section'] as $ak) {
                        if (isset($row[$ak])) {
                            if (is_array($row[$ak])) {
                                $area = (string)($row[$ak]['name'] ?? $row[$ak]['title'] ?? '');
                            } else {
                                $area = (string)$row[$ak];
                            }
                            break;
                        }
                    }

                    $name = trim((string)$name);
                    if ($name === '') continue;
                    if (mb_strtolower($name) === 'platzhalter') continue;

                    $key = ($id !== null && $id !== '') ? 'id:'.$id : 'name:'.mb_strtolower($name);
                    $picked[$key] = [
                        'external_table_id'   => (string)$id,
                        'external_table_name' => $name,
                        'external_area'       => trim($area),
                        'source'              => 'tables_api',
                    ];
                }
            }

            if ($picked) {
                return array_values($picked);
            }
        } catch (Throwable $e) {
            logx('PMD_R2O_TABLE_SYNC fetch_fail', ['url' => $url, 'message' => $e->getMessage()]);
        }
    }

    throw new RuntimeException('ready2order did not return any tables.');
}

function collect_imported_order_tables(PDO $pdo): array {
    $out = [];
    if (!table_exists($pdo, 'ti_orders')) return [];

    $sql = "SELECT comment FROM `ti_orders` WHERE comment LIKE '%Imported from ready2order invoice%' ORDER BY order_id DESC LIMIT 3000";
    foreach ($pdo->query($sql)->fetchAll() as $row) {
        $comment = (string)($row['comment'] ?? '');
        if ($comment === '') continue;

        $id = null;
        $name = null;

        if (preg_match('/table_id=([0-9]+)/', $comment, $m)) $id = $m[1];
        if (preg_match('/table_name=([^|]+)/', $comment, $m)) $name = trim($m[1]);

        if (!$name) continue;

        $key = ($id ? 'id:'.$id : 'name:'.mb_strtolower($name));
        if (!isset($out[$key])) {
            $out[$key] = [
                'external_table_id'   => (string)$id,
                'external_table_name' => $name,
                'external_area'       => '',
                'source'              => 'imported_orders',
            ];
        }
    }

    return array_values($out);
}

function upsert_mapping(PDO $pdo, string $table, array $item): array {
    $c = cols($pdo, $table);
    $pk = isset($c['mapping_id']) ? 'mapping_id' : (isset($c['id']) ? 'id' : null);
    if (!$pk) throw new RuntimeException('mapping primary key not found');

    $find = null;
    if ($item['external_table_id'] !== '' && isset($c['external_table_id'])) {
        $st = $pdo->prepare("SELECT * FROM `{$table}` WHERE `external_table_id`=? LIMIT 1");
        $st->execute([$item['external_table_id']]);
        $find = $st->fetch();
    }
    if (!$find && isset($c['external_table_name'])) {
        $st = $pdo->prepare("SELECT * FROM `{$table}` WHERE LOWER(`external_table_name`)=LOWER(?) LIMIT 1");
        $st->execute([$item['external_table_name']]);
        $find = $st->fetch();
    }

    $payload = [];
    foreach ([
        'external_table_id'   => $item['external_table_id'],
        'external_table_name' => $item['external_table_name'],
        'external_area'       => $item['external_area'],
        'source'              => $item['source'],
        'provider'            => 'ready2order',
        'updated_at'          => gmdate('Y-m-d H:i:s'),
    ] as $k => $v) {
        if (isset($c[$k])) $payload[$k] = $v;
    }
    if (!$find && isset($c['created_at'])) $payload['created_at'] = gmdate('Y-m-d H:i:s');

    if ($find) {
        $sets = [];
        $vals = [];
        foreach ($payload as $k => $v) {
            $sets[] = "`{$k}`=?";
            $vals[] = $v;
        }
        $vals[] = $find[$pk];
        $sql = "UPDATE `{$table}` SET ".implode(', ', $sets)." WHERE `{$pk}`=?";
        $pdo->prepare($sql)->execute($vals);
        return ['sync_status' => 'updated'] + $item;
    }

    $fields = array_keys($payload);
    $marks  = implode(',', array_fill(0, count($fields), '?'));
    $sql = "INSERT INTO `{$table}` (`".implode('`,`', $fields)."`) VALUES ({$marks})";
    $pdo->prepare($sql)->execute(array_values($payload));

    return ['sync_status' => 'inserted'] + $item;
}

$configId = resolve_config_id();
$env = env_read('/var/www/paymydine/.env');

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbName = $env['DB_DATABASE'] ?? '';
$dbUser = $env['DB_USERNAME'] ?? '';
$dbPass = $env['DB_PASSWORD'] ?? '';

$central = pdo_connect($dbHost, $dbPort, $dbName, $dbUser, $dbPass);
[$tenant, $tpdo, $posTable, $posPk, $configRow] = find_tenant_and_config($central, $dbHost, $dbPort, $dbUser, $dbPass, $configId);

$token = extract_token($configRow);
if (!$token) throw new RuntimeException('ready2order access token not found in POS config');

$baseUrl = rtrim((string)($configRow['url'] ?? DEFAULT_BASE), '/');
$mappingTable = table_exists($tpdo, 'ti_pos_table_mappings') ? 'ti_pos_table_mappings' : (table_exists($tpdo, 'pos_table_mappings') ? 'pos_table_mappings' : null);
if (!$mappingTable) throw new RuntimeException('pos table mappings table not found');

$apiTables = collect_live_tables($baseUrl, $token);
$imported  = collect_imported_order_tables($tpdo);

$merged = [];
foreach ($apiTables as $row) {
    $key = $row['external_table_id'] !== '' ? 'id:'.$row['external_table_id'] : 'name:'.mb_strtolower($row['external_table_name']);
    $merged[$key] = $row;
}
foreach ($imported as $row) {
    $key = $row['external_table_id'] !== '' ? 'id:'.$row['external_table_id'] : 'name:'.mb_strtolower($row['external_table_name']);
    if (!isset($merged[$key])) $merged[$key] = $row;
}

$resultRows = [];
$inserted = 0;
$updated  = 0;

foreach (array_values($merged) as $item) {
    $res = upsert_mapping($tpdo, $mappingTable, $item);
    $resultRows[] = $res;
    if ($res['sync_status'] === 'inserted') $inserted++;
    else $updated++;
}

out([
    'success' => true,
    'fetched_total' => count($resultRows),
    'from_tables_api' => count($apiTables),
    'discovered_from_invoices' => 0,
    'discovered_from_imported_orders' => count($imported),
    'inserted' => $inserted,
    'updated' => $updated,
    'skipped' => 0,
    'renamed_local_tables' => 0,
    'renamed_local_table_details' => [],
    'created_local_tables' => [],
    'tables' => $resultRows,
]);
