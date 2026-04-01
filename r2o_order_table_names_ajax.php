<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

const APP_ENV_FILE = '/var/www/paymydine/.env';

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

function extractMappedTableName(?string $comment, ?string $firstName): ?string {
    $firstName = trim((string)$firstName);
    $comment = (string)$comment;

    if ($firstName !== '' && !preg_match('/^R2O Invoice Table\s+\d+$/i', $firstName)) {
        return $firstName;
    }

    if ($comment !== '') {
        if (preg_match('/mapped_local_table_name=([^|]+)/u', $comment, $m)) {
            return trim($m[1]);
        }
        if (preg_match('/table_name=([^|]+)/u', $comment, $m)) {
            return trim($m[1]);
        }
        if (preg_match('/table_id=(\d+)/u', $comment, $m)) {
            return 'Table '.$m[1];
        }
    }

    return null;
}

try {
    $pdo = new PDO(
        'mysql:host=127.0.0.1;dbname=mimoza;charset=utf8mb4',
        envValue('DB_USERNAME') ?: envValue('TENANT_DB_USERNAME') ?: '',
        envValue('DB_PASSWORD') ?: envValue('TENANT_DB_PASSWORD') ?: '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $rows = $pdo->query("
        SELECT order_id, first_name, comment, created_at
        FROM ti_orders
        WHERE comment LIKE '%Imported from ready2order invoice%'
        ORDER BY order_id DESC
        LIMIT 1000
    ")->fetchAll();

    $map = [];

    foreach ($rows as $row) {
        $orderId = (int)($row['order_id'] ?? 0);
        if ($orderId <= 0) continue;

        $tableName = extractMappedTableName(
            (string)($row['comment'] ?? ''),
            (string)($row['first_name'] ?? '')
        );

        if ($tableName !== null && $tableName !== '') {
            $map[(string)$orderId] = [
                'table_name' => $tableName,
                'first_name' => (string)($row['first_name'] ?? ''),
                'created_at' => (string)($row['created_at'] ?? ''),
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'count' => count($map),
        'orders' => $map,
    ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}
