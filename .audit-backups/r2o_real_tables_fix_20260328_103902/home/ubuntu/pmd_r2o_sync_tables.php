<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

const APP_ENV_FILE = '/var/www/paymydine/.env';
const LOG_FILE = '/var/www/paymydine/storage/logs/system.log';
const CONFIG_ID = 18;

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
    $line = '[' . date('Y-m-d H:i:s') . '] PMD_R2O_TABLE_SYNC ' . $msg;
    if ($ctx) {
        $line .= ' ' . json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $line .= PHP_EOL;
    @file_put_contents(LOG_FILE, $line, FILE_APPEND);
}

function fetchJson(string $url, string $token): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT => 60,
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

    return [$code, $body === false ? '' : $body, $err, $json];
}

function detectTableColumns(PDO $pdo, string $table): array {
    $stmt = $pdo->query("SHOW COLUMNS FROM `$table`");
    $cols = [];
    foreach ($stmt as $row) {
        $cols[] = (string)$row['Field'];
    }
    return $cols;
}

function normalizeTablesPayload($json): array {
    if (!is_array($json)) {
        return [];
    }

    if (isset($json['tables']) && is_array($json['tables'])) {
        return $json['tables'];
    }

    if (array_is_list($json)) {
        return $json;
    }

    return [];
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

/*
 * فقط ستون‌های مطمئن و لازم را enforce می‌کنیم
 * چون جدول mapping قبلاً با ساختار ساده‌تر ساخته شده
 */
$pdo->exec("
CREATE TABLE IF NOT EXISTS ti_pos_table_mappings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    external_table_id VARCHAR(64) DEFAULT NULL,
    external_table_name VARCHAR(255) DEFAULT NULL,
    external_area VARCHAR(255) DEFAULT NULL,
    local_table_id BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_external_table_id (external_table_id),
    KEY idx_local_table_id (local_table_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$mappingCols = detectTableColumns($pdo, 'ti_pos_table_mappings');

$configStmt = $pdo->prepare("
    SELECT url, access_token
    FROM ti_pos_configs
    WHERE config_id = :config_id
    LIMIT 1
");
$configStmt->execute(['config_id' => CONFIG_ID]);
$config = $configStmt->fetch();

if (!$config) {
    throw new RuntimeException('POS config not found: '.CONFIG_ID);
}

$token = trim((string)($config['access_token'] ?? ''));
$base  = rtrim((string)($config['url'] ?? 'https://api.ready2order.com/v1'), '/');

if ($token === '') {
    throw new RuntimeException('ready2order token is empty');
}

$url = $base . '/tables';
[$httpCode, $body, $curlError, $json] = fetchJson($url, $token);

logLine('fetch_tables', [
    'url' => $url,
    'http_code' => $httpCode,
    'curl_error' => $curlError,
    'body_len' => strlen($body),
]);

if ($httpCode !== 200) {
    throw new RuntimeException('ready2order tables endpoint failed. http=' . $httpCode . ' body=' . $body);
}

$tables = normalizeTablesPayload($json);

if (!$tables) {
    throw new RuntimeException('No tables returned from ready2order');
}

$inserted = 0;
$updated = 0;
$skipped = 0;

$findStmt = $pdo->prepare("
    SELECT id
    FROM ti_pos_table_mappings
    WHERE external_table_id = :external_table_id
    LIMIT 1
");

$insertSql = "
    INSERT INTO ti_pos_table_mappings
    (external_table_id, external_table_name, external_area" . (in_array('created_at', $mappingCols, true) ? ", created_at" : "") . ")
    VALUES
    (:external_table_id, :external_table_name, :external_area" . (in_array('created_at', $mappingCols, true) ? ", NOW()" : "") . ")
";

$updateSql = "
    UPDATE ti_pos_table_mappings
    SET external_table_name = :external_table_name,
        external_area = :external_area
    WHERE id = :id
";

$insertStmt = $pdo->prepare($insertSql);
$updateStmt = $pdo->prepare($updateSql);

foreach ($tables as $t) {
    if (!is_array($t)) {
        $skipped++;
        continue;
    }

    $externalId = trim((string)($t['table_id'] ?? $t['id'] ?? ''));
    $name       = trim((string)($t['table_name'] ?? $t['name'] ?? ''));
    $area       = trim((string)($t['area_id'] ?? $t['table_area'] ?? $t['area'] ?? ''));

    if ($externalId === '' || $name === '') {
        $skipped++;
        continue;
    }

    $findStmt->execute(['external_table_id' => $externalId]);
    $existingId = $findStmt->fetchColumn();

    if ($existingId) {
        $updateStmt->execute([
            'external_table_name' => $name,
            'external_area' => $area,
            'id' => $existingId,
        ]);
        $updated++;
    } else {
        $insertStmt->execute([
            'external_table_id' => $externalId,
            'external_table_name' => $name,
            'external_area' => $area,
        ]);
        $inserted++;
    }
}

$result = [
    'success' => true,
    'fetched_total' => count($tables),
    'inserted' => $inserted,
    'updated' => $updated,
    'skipped' => $skipped,
];

logLine('finish', $result);
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
