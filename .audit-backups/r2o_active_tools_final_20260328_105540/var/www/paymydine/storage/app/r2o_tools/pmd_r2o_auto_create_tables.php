<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

const APP_ENV_FILE = '/var/www/paymydine/.env';
const LOG_FILE = '/var/www/paymydine/storage/logs/system.log';

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
    $line = '[' . date('Y-m-d H:i:s') . '] PMD_R2O_AUTO_CREATE_TABLES ' . $msg;
    if ($ctx) {
        $line .= ' ' . json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $line .= PHP_EOL;
    @file_put_contents(LOG_FILE, $line, FILE_APPEND);
}

function normalizeName(string $name): string {
    $name = trim(mb_strtolower($name));
    $name = preg_replace('/\s+/u', ' ', $name);
    return trim((string)$name);
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

$localTables = $pdo->query("
    SELECT table_id, table_name, qr_code, table_no, min_capacity, max_capacity, table_status, extra_capacity, is_joinable, priority
    FROM ti_tables
")->fetchAll();

$localMap = [];
foreach ($localTables as $t) {
    $localMap[normalizeName((string)$t['table_name'])] = $t;
}

$mappings = $pdo->query("
    SELECT id, external_table_id, external_table_name, local_table_id
    FROM ti_pos_table_mappings
    ORDER BY id ASC
")->fetchAll();

$matchedExisting = 0;
$createdNew = 0;
$skipped = 0;
$matchedTables = [];
$createdTables = [];
$unmappedTables = [];

$updateMapStmt = $pdo->prepare("
    UPDATE ti_pos_table_mappings
    SET local_table_id = :local_table_id
    WHERE id = :id
");

$insertTableStmt = $pdo->prepare("
    INSERT INTO ti_tables
    (table_no, table_name, min_capacity, max_capacity, table_status, extra_capacity, is_joinable, priority, created_at, updated_at, qr_code)
    VALUES
    (NULL, :table_name, 1, 10, 1, 0, 1, 0, NOW(), NOW(), NULL)
");

foreach ($mappings as $row) {
    $mappingId = (int)$row['id'];
    $externalTableName = trim((string)$row['external_table_name']);
    $norm = normalizeName($externalTableName);

    if ($externalTableName === '') {
        $skipped++;
        continue;
    }

    if (!empty($row['local_table_id'])) {
        $matchedTables[] = [
            'mapping_id' => $mappingId,
            'external_table_id' => (string)$row['external_table_id'],
            'external_table_name' => $externalTableName,
            'local_table_id' => (int)$row['local_table_id'],
            'status' => 'already_mapped',
        ];
        $matchedExisting++;
        continue;
    }

    if (isset($localMap[$norm])) {
        $local = $localMap[$norm];
        $updateMapStmt->execute([
            'local_table_id' => (int)$local['table_id'],
            'id' => $mappingId,
        ]);

        $matchedExisting++;
        $matchedTables[] = [
            'mapping_id' => $mappingId,
            'external_table_id' => (string)$row['external_table_id'],
            'external_table_name' => $externalTableName,
            'local_table_id' => (int)$local['table_id'],
            'local_table_name' => (string)$local['table_name'],
            'status' => 'matched_existing',
        ];
        continue;
    }

    $insertTableStmt->execute([
        'table_name' => $externalTableName,
    ]);
    $newTableId = (int)$pdo->lastInsertId();

    $updateMapStmt->execute([
        'local_table_id' => $newTableId,
        'id' => $mappingId,
    ]);

    $createdNew++;
    $createdTables[] = [
        'mapping_id' => $mappingId,
        'external_table_id' => (string)$row['external_table_id'],
        'external_table_name' => $externalTableName,
        'local_table_id' => $newTableId,
        'local_table_name' => $externalTableName,
        'status' => 'created_new',
    ];
}

foreach ($pdo->query("
    SELECT id, external_table_id, external_table_name, local_table_id
    FROM ti_pos_table_mappings
    WHERE local_table_id IS NULL
    ORDER BY id ASC
") as $u) {
    $unmappedTables[] = [
        'mapping_id' => (int)$u['id'],
        'external_table_id' => (string)$u['external_table_id'],
        'external_table_name' => (string)$u['external_table_name'],
        'status' => 'unmapped',
    ];
}

$result = [
    'success' => true,
    'matched_existing' => $matchedExisting,
    'created_new_tables' => $createdNew,
    'skipped' => $skipped,
    'matched_tables' => $matchedTables,
    'created_tables' => $createdTables,
    'unmapped_tables' => $unmappedTables,
];

logLine('finish', $result);
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
