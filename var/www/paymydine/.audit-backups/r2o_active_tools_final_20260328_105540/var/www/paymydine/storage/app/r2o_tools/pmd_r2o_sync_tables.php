<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

const APP_ENV_FILE = '/var/www/paymydine/.env';
const LOG_FILE = '/var/www/paymydine/storage/logs/system.log';
const CONFIG_ID = 18;
const DEFAULT_BASE = 'https://api.ready2order.com/v1';

function envValue(string $key): ?string {
    foreach (@file(APP_ENV_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (str_starts_with($line, $key.'=')) {
            return trim(substr($line, strlen($key) + 1), "\"'");
        }
    }
    return null;
}

function logLine(string $msg, array $ctx = []): void {
    $line = '['.date('Y-m-d H:i:s').'] PMD_R2O_TABLE_SYNC '.$msg;
    if ($ctx) {
        $line .= ' '.json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $line .= PHP_EOL;
    @file_put_contents(LOG_FILE, $line, FILE_APPEND);
}

function fetchJson(string $url, string $token): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer '.$token,
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT => 90,
    ]);

    $body = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    $json = null;
    if (is_string($body) && $body !== '') {
        $tmp = json_decode($body, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $json = $tmp;
        }
    }

    return [
        'http_code'  => $code,
        'curl_error' => $err,
        'body'       => $body === false ? '' : $body,
        'json'       => $json,
    ];
}

function normalizeBaseUrl(?string $url): string {
    $url = trim((string)$url);
    if ($url === '') return DEFAULT_BASE;
    return rtrim($url, '/');
}

function tryReadConfig(PDO $pdo): array {
    $sqls = [
        "SELECT url, access_token FROM ti_pos_configs WHERE config_id = ".CONFIG_ID." LIMIT 1",
        "SELECT api_url AS url, access_token FROM ti_pos_configs WHERE config_id = ".CONFIG_ID." LIMIT 1",
        "SELECT api_url_sandbox AS url, access_token_sandbox AS access_token FROM ti_pos_configs WHERE config_id = ".CONFIG_ID." LIMIT 1",
        "SELECT url, access_token FROM ti_pos_configs ORDER BY config_id DESC LIMIT 1",
        "SELECT api_url AS url, access_token FROM ti_pos_configs ORDER BY config_id DESC LIMIT 1",
        "SELECT api_url_sandbox AS url, access_token_sandbox AS access_token FROM ti_pos_configs ORDER BY config_id DESC LIMIT 1",
    ];

    foreach ($sqls as $sql) {
        try {
            $row = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                return [
                    'url' => (string)($row['url'] ?? ''),
                    'access_token' => (string)($row['access_token'] ?? ''),
                ];
            }
        } catch (Throwable $e) {
        }
    }

    return ['url' => '', 'access_token' => ''];
}

function hasColumn(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    return (int)$stmt->fetchColumn() > 0;
}

function ensureMappingTable(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ti_pos_table_mappings (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            external_table_id VARCHAR(64) DEFAULT NULL,
            external_table_name VARCHAR(255) DEFAULT NULL,
            external_area VARCHAR(255) DEFAULT NULL,
            local_table_id BIGINT UNSIGNED DEFAULT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_external_table_id (external_table_id),
            KEY idx_local_table_id (local_table_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    if (!hasColumn($pdo, 'ti_pos_table_mappings', 'created_at')) {
        $pdo->exec("ALTER TABLE ti_pos_table_mappings ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (!hasColumn($pdo, 'ti_pos_table_mappings', 'updated_at')) {
        $pdo->exec("ALTER TABLE ti_pos_table_mappings ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
}

function extractTablesFromTablesApi($json): array {
    $out = [];
    if (!is_array($json)) return $out;

    $rows = $json;
    if (isset($json['data']) && is_array($json['data'])) $rows = $json['data'];
    if (isset($json['tables']) && is_array($json['tables'])) $rows = $json['tables'];

    foreach ($rows as $row) {
        if (!is_array($row)) continue;

        $id   = $row['table_id'] ?? $row['id'] ?? null;
        $name = $row['table_name'] ?? $row['name'] ?? null;
        $area = $row['table_area_name'] ?? $row['area_name'] ?? '';

        if ($id === null || trim((string)$name) === '') continue;

        $out[(string)$id] = [
            'external_table_id'   => (string)$id,
            'external_table_name' => trim((string)$name),
            'external_area'       => trim((string)$area),
            'source'              => 'tables_api',
        ];
    }

    return $out;
}

function extractTablesFromInvoices($json): array {
    $out = [];
    if (!is_array($json)) return $out;

    $rows = $json;
    if (isset($json['data']) && is_array($json['data'])) $rows = $json['data'];
    if (isset($json['invoices']) && is_array($json['invoices'])) $rows = $json['invoices'];
    if (isset($json['documents']) && is_array($json['documents'])) $rows = $json['documents'];

    foreach ($rows as $row) {
        if (!is_array($row)) continue;

        $candidates = [
            [
                'id'   => $row['table_id'] ?? null,
                'name' => $row['table_name'] ?? null,
            ],
            [
                'id'   => $row['tableId'] ?? null,
                'name' => $row['tableName'] ?? null,
            ],
            [
                'id'   => $row['table']['table_id'] ?? null,
                'name' => $row['table']['table_name'] ?? null,
            ],
            [
                'id'   => $row['table']['id'] ?? null,
                'name' => $row['table']['name'] ?? null,
            ],
        ];

        foreach ($candidates as $c) {
            $id = $c['id'];
            $name = trim((string)($c['name'] ?? ''));
            if ($id !== null && $id !== '' && $name !== '') {
                $out[(string)$id] = [
                    'external_table_id'   => (string)$id,
                    'external_table_name' => $name,
                    'external_area'       => '',
                    'source'              => 'invoice_api',
                ];
                break;
            }
        }
    }

    return $out;
}

function extractTablesFromImportedOrders(PDO $pdo): array {
    $out = [];

    $stmt = $pdo->query("
        SELECT order_id, first_name, comment, created_at
        FROM ti_orders
        WHERE comment LIKE '%Imported from ready2order invoice%'
        ORDER BY order_id DESC
        LIMIT 500
    ");

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $comment = (string)($row['comment'] ?? '');
        $firstName = trim((string)($row['first_name'] ?? ''));

        $tableId = null;
        $tableName = null;

        if (preg_match('/(?:^|\|)\s*table_id=(\d+)/u', $comment, $m)) {
            $tableId = trim($m[1]);
        }

        if (preg_match('/(?:^|\|)\s*mapped_local_table_name=([^|]+)/u', $comment, $m)) {
            $tableName = trim($m[1]);
        } elseif (preg_match('/(?:^|\|)\s*table_name=([^|]+)/u', $comment, $m)) {
            $tableName = trim($m[1]);
        } elseif ($firstName !== '' && !preg_match('/^R2O Invoice Table\s+\d+$/iu', $firstName)) {
            $tableName = $firstName;
        }

        if ($tableId && $tableName) {
            $out[(string)$tableId] = [
                'external_table_id'   => (string)$tableId,
                'external_table_name' => $tableName,
                'external_area'       => '',
                'source'              => 'imported_orders',
            ];
        }
    }

    return $out;
}

function findLocalTableIdByName(PDO $pdo, string $name): ?int {
    $stmt = $pdo->prepare("SELECT table_id FROM ti_tables WHERE table_name = ? LIMIT 1");
    $stmt->execute([$name]);
    $id = $stmt->fetchColumn();
    return $id !== false ? (int)$id : null;
}

function createLocalTable(PDO $pdo, string $name): int {
    $stmt = $pdo->prepare("
        INSERT INTO ti_tables
            (table_name, min_capacity, max_capacity, table_status, extra_capacity, is_joinable, priority, created_at, updated_at)
        VALUES
            (?, 1, 8, 1, 0, 1, 0, NOW(), NOW())
    ");
    $stmt->execute([$name]);
    return (int)$pdo->lastInsertId();
}

$pdo = new PDO(
    'mysql:host=127.0.0.1;dbname=mimoza;charset=utf8mb4',
    envValue('DB_USERNAME') ?: envValue('TENANT_DB_USERNAME') ?: '',
    envValue('DB_PASSWORD') ?: envValue('TENANT_DB_PASSWORD') ?: '',
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);

ensureMappingTable($pdo);

$config = tryReadConfig($pdo);
$baseUrl = normalizeBaseUrl($config['url'] ?? '');
$token   = trim((string)($config['access_token'] ?? ''));

if ($token === '') {
    throw new RuntimeException('ready2order access token not found in POS config');
}

$allTables = [];
$fromTablesApi = 0;
$fromInvoices = 0;
$fromImportedOrders = 0;

$tablesApi = fetchJson($baseUrl.'/tables', $token);
if ($tablesApi['http_code'] === 200 && is_array($tablesApi['json'])) {
    $rows = extractTablesFromTablesApi($tablesApi['json']);
    $fromTablesApi = count($rows);
    $allTables = $rows + $allTables;
}

$dateFrom = date('Y-m-d', strtotime('-2 days'));
$dateTo   = date('Y-m-d');

$invoiceUrl = $baseUrl.'/document/invoice?dateFrom='.$dateFrom.'&dateTo='.$dateTo.'&items=true&payments=true&limit=200&offset=0';
$invoiceApi = fetchJson($invoiceUrl, $token);
if ($invoiceApi['http_code'] === 200 && is_array($invoiceApi['json'])) {
    $rows = extractTablesFromInvoices($invoiceApi['json']);
    $fromInvoices = count($rows);
    foreach ($rows as $k => $v) {
        if (!isset($allTables[$k])) $allTables[$k] = $v;
    }
}

$importedRows = extractTablesFromImportedOrders($pdo);
$fromImportedOrders = count($importedRows);
foreach ($importedRows as $k => $v) {
    if (!isset($allTables[$k])) $allTables[$k] = $v;
}

ksort($allTables, SORT_NATURAL);

$inserted = 0;
$updated = 0;
$skipped = 0;
$renamedLocalTables = 0;
$renamedLocalTableDetails = [];
$tablesOut = [];
$createdLocalTables = [];

$hasUpdatedAt = hasColumn($pdo, 'ti_pos_table_mappings', 'updated_at');

foreach ($allTables as $extId => $row) {
    $extId  = trim((string)$row['external_table_id']);
    $name   = trim((string)$row['external_table_name']);
    $area   = trim((string)($row['external_area'] ?? ''));
    $source = trim((string)($row['source'] ?? 'unknown'));

    if ($extId === '' || $name === '') {
        $skipped++;
        continue;
    }

    $stmt = $pdo->prepare("SELECT * FROM ti_pos_table_mappings WHERE external_table_id = ? LIMIT 1");
    $stmt->execute([$extId]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($hasUpdatedAt) {
            $stmt = $pdo->prepare("
                UPDATE ti_pos_table_mappings
                SET external_table_name = ?, external_area = ?, updated_at = NOW()
                WHERE external_table_id = ?
            ");
            $stmt->execute([$name, $area, $extId]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE ti_pos_table_mappings
                SET external_table_name = ?, external_area = ?
                WHERE external_table_id = ?
            ");
            $stmt->execute([$name, $area, $extId]);
        }

        $localTableId = isset($existing['local_table_id']) && $existing['local_table_id'] !== null
            ? (int)$existing['local_table_id']
            : null;

        if ($localTableId) {
            $stmtLocal = $pdo->prepare("SELECT table_name FROM ti_tables WHERE table_id = ? LIMIT 1");
            $stmtLocal->execute([$localTableId]);
            $localName = $stmtLocal->fetchColumn();

            if ($localName !== false && trim((string)$localName) !== $name) {
                $stmtRename = $pdo->prepare("UPDATE ti_tables SET table_name = ?, updated_at = NOW() WHERE table_id = ?");
                $stmtRename->execute([$name, $localTableId]);

                $renamedLocalTables++;
                $renamedLocalTableDetails[] = [
                    'local_table_id' => $localTableId,
                    'old_name' => (string)$localName,
                    'new_name' => $name,
                    'external_table_id' => $extId,
                ];
            }
        }

        $updated++;
        $syncStatus = 'updated';
    } else {
        $localTableId = findLocalTableIdByName($pdo, $name);
        if (!$localTableId) {
            $localTableId = createLocalTable($pdo, $name);
            $createdLocalTables[] = [
                'local_table_id' => $localTableId,
                'table_name' => $name,
                'external_table_id' => $extId,
            ];
        }

        $stmt = $pdo->prepare("
            INSERT INTO ti_pos_table_mappings
                (external_table_id, external_table_name, external_area, local_table_id, created_at".($hasUpdatedAt ? ", updated_at" : "").")
            VALUES
                (?, ?, ?, ?, NOW()".($hasUpdatedAt ? ", NOW()" : "").")
        ");
        $stmt->execute([$extId, $name, $area, $localTableId]);

        $inserted++;
        $syncStatus = 'inserted';
    }

    $tablesOut[] = [
        'external_table_id'   => is_numeric($extId) ? (int)$extId : $extId,
        'external_table_name' => $name,
        'external_area'       => $area,
        'sync_status'         => $syncStatus,
        'source'              => $source,
    ];
}

$result = [
    'success' => true,
    'fetched_total' => count($allTables),
    'from_tables_api' => $fromTablesApi,
    'discovered_from_invoices' => $fromInvoices,
    'discovered_from_imported_orders' => $fromImportedOrders,
    'inserted' => $inserted,
    'updated' => $updated,
    'skipped' => $skipped,
    'renamed_local_tables' => $renamedLocalTables,
    'renamed_local_table_details' => $renamedLocalTableDetails,
    'created_local_tables' => $createdLocalTables,
    'tables' => $tablesOut,
];

logLine('finish', $result);

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
