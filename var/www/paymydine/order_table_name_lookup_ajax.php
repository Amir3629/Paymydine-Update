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

function looksLikeCustomerName(string $value): bool {
    $v = trim(mb_strtolower($value));
    if ($v === '') return false;

    $bad = [
        'customer',
        'guest',
        'walk in',
        'walk-in',
        'cashier',
        'cashier order',
    ];

    foreach ($bad as $x) {
        if ($v === $x) return true;
    }

    if (preg_match('/^r2o invoice table\s+\d+$/i', $value)) return true;
    if (preg_match('/^table\s+\d+$/i', $value)) return false;

    return false;
}

function firstNonEmpty(...$values): ?string {
    foreach ($values as $v) {
        $v = trim((string)$v);
        if ($v !== '') return $v;
    }
    return null;
}

function extractFromComment(string $comment): array {
    $out = [
        'table_name' => null,
        'table_id' => null,
    ];

    if ($comment === '') return $out;

    if (preg_match('/mapped_local_table_name=([^|]+)/u', $comment, $m)) {
        $out['table_name'] = trim($m[1]);
    }

    if (!$out['table_name'] && preg_match('/table_name=([^|]+)/u', $comment, $m)) {
        $out['table_name'] = trim($m[1]);
    }

    if (preg_match('/mapped_local_table_id=(\d+)/u', $comment, $m)) {
        $out['table_id'] = (int)$m[1];
    }

    if (!$out['table_id'] && preg_match('/(?:^|\|)\s*table_id=(\d+)/u', $comment, $m)) {
        $out['table_id'] = (int)$m[1];
    }

    return $out;
}

function extractFromJsonish(string $text): array {
    $out = [
        'table_name' => null,
        'table_id' => null,
    ];

    $text = trim($text);
    if ($text === '') return $out;

    $decoded = json_decode($text, true);
    if (is_array($decoded)) {
        $candidates = [
            $decoded,
            $decoded['table'] ?? null,
            $decoded['meta'] ?? null,
            $decoded['options'] ?? null,
        ];

        foreach ($candidates as $row) {
            if (!is_array($row)) continue;

            $name = $row['table_name'] ?? $row['tableName'] ?? $row['name'] ?? null;
            $id   = $row['table_id'] ?? $row['tableId'] ?? $row['id'] ?? null;

            if ($name && trim((string)$name) !== '') {
                $out['table_name'] = trim((string)$name);
            }
            if ($id !== null && $id !== '') {
                $out['table_id'] = (int)$id;
            }

            if ($out['table_name'] || $out['table_id']) {
                return $out;
            }
        }
    }

    if (preg_match('/"table_name"\s*:\s*"([^"]+)"/u', $text, $m)) {
        $out['table_name'] = trim($m[1]);
    }
    if (preg_match('/"table_id"\s*:\s*"?(\\d+)"?/u', $text, $m)) {
        $out['table_id'] = (int)$m[1];
    }

    return $out;
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

    $idsRaw = $_GET['ids'] ?? '';
    $ids = array_values(array_unique(array_filter(array_map('intval', explode(',', (string)$idsRaw)))));

    if (!$ids) {
        echo json_encode(['success' => false, 'message' => 'No ids given'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        exit;
    }

    $in = implode(',', array_fill(0, count($ids), '?'));

    $sql = "
        SELECT
            order_id,
            first_name,
            last_name,
            comment,
            delivery_comment,
            cart,
            order_type
        FROM ti_orders
        WHERE order_id IN ($in)
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($ids);
    $rows = $stmt->fetchAll();

    $tableById = [];
    foreach ($pdo->query("SELECT table_id, table_name FROM ti_tables") as $t) {
        $tableById[(int)$t['table_id']] = (string)$t['table_name'];
    }

    $out = [];

    foreach ($rows as $row) {
        $orderId = (int)$row['order_id'];

        $commentInfo = extractFromComment((string)($row['comment'] ?? ''));
        $deliveryInfo = extractFromJsonish((string)($row['delivery_comment'] ?? ''));
        $cartInfo = extractFromJsonish((string)($row['cart'] ?? ''));

        $firstName = trim((string)($row['first_name'] ?? ''));
        $orderType = trim((string)($row['order_type'] ?? ''));

        $orderTypeTableName = null;
        if ($orderType !== '' && ctype_digit($orderType)) {
            $orderTypeId = (int)$orderType;
            if (isset($tableById[$orderTypeId])) {
                $orderTypeTableName = $tableById[$orderTypeId];
            }
        }

        $resolvedName = firstNonEmpty(
            $commentInfo['table_name'] ?? null,
            $deliveryInfo['table_name'] ?? null,
            $cartInfo['table_name'] ?? null,
            $orderTypeTableName,
            (!looksLikeCustomerName($firstName) ? $firstName : null)
        );

        $resolvedTableId = firstNonEmpty(
            $commentInfo['table_id'] ?? null,
            $deliveryInfo['table_id'] ?? null,
            $cartInfo['table_id'] ?? null,
            (ctype_digit($orderType) ? (int)$orderType : null)
        );

        if ((!$resolvedName || trim((string)$resolvedName) === '') && $resolvedTableId !== null) {
            $resolvedName = $tableById[(int)$resolvedTableId] ?? ('Table '.$resolvedTableId);
        }

        if (!$resolvedName) {
            $resolvedName = '—';
        }

        $out[$orderId] = [
            'table_name' => $resolvedName,
            'resolved_table_id' => $resolvedTableId,
            'first_name' => $firstName,
            'order_type' => $orderType,
        ];
    }

    echo json_encode([
        'success' => true,
        'count' => count($out),
        'orders' => $out,
    ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}
