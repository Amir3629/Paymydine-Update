<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function log_line(string $msg, array $ctx = []): void {
    $line = '[' . date('Y-m-d H:i:s') . '] R2O_DIRECT_WEBHOOK ' . $msg;
    if ($ctx) {
        $line .= ' ' . json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $line .= PHP_EOL;
    @file_put_contents('/var/www/paymydine/storage/logs/system.log', $line, FILE_APPEND);
}

function parse_env_file(string $path): array {
    $out = [];
    foreach (@file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $pos = strpos($line, '=');
        if ($pos === false) continue;
        $k = trim(substr($line, 0, $pos));
        $v = trim(substr($line, $pos + 1));
        $v = trim($v, "\"'");
        $out[$k] = $v;
    }
    return $out;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $env = parse_env_file('/var/www/paymydine/.env');
    $host = $env['TENANT_DB_HOST'] ?? $env['DB_HOST'] ?? '127.0.0.1';
    $port = $env['TENANT_DB_PORT'] ?? $env['DB_PORT'] ?? '3306';
    $user = $env['TENANT_DB_USERNAME'] ?? $env['DB_USERNAME'] ?? '';
    $pass = $env['TENANT_DB_PASSWORD'] ?? $env['DB_PASSWORD'] ?? '';

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname=mimoza;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    return $pdo;
}

function find_mapping(PDO $pdo, ?string $productId, ?string $productName): ?array {
    if ($productId !== null && trim($productId) !== '') {
        $st = $pdo->prepare("
            SELECT * FROM r2o_product_map
            WHERE is_active = 1 AND r2o_product_id = ?
            ORDER BY is_fallback ASC, id ASC
            LIMIT 1
        ");
        $st->execute([$productId]);
        $row = $st->fetch();
        if ($row) return $row;
    }

    if ($productName !== null && trim($productName) !== '') {
        $st = $pdo->prepare("
            SELECT * FROM r2o_product_map
            WHERE is_active = 1
              AND LOWER(TRIM(COALESCE(r2o_product_name,''))) = LOWER(TRIM(?))
            ORDER BY is_fallback ASC, id ASC
            LIMIT 1
        ");
        $st->execute([$productName]);
        $row = $st->fetch();
        if ($row) return $row;
    }

    $st = $pdo->prepare("
        SELECT * FROM r2o_product_map
        WHERE is_active = 1 AND is_fallback = 1
        ORDER BY id ASC
        LIMIT 1
    ");
    $st->execute();
    return $st->fetch() ?: null;
}

function call_local_order_api(array $payload): array {
    $ch = curl_init('https://mimoza.paymydine.com/api/v1/orders');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 60,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);

    $body = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    return [$code, $err, $body === false ? '' : $body];
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);

log_line('incoming', [
    'method' => $_SERVER['REQUEST_METHOD'] ?? null,
    'uri' => $_SERVER['REQUEST_URI'] ?? null,
    'raw' => $raw,
]);

if (!is_array($data)) {
    out(['error' => 'invalid_json'], 400);
}

$event = (string)($data['event'] ?? '');
$src   = $data['data'] ?? [];

$productId   = (string)($src['product_id'] ?? $src['item_id'] ?? '');
$productName = (string)($src['item_name'] ?? $src['product_name'] ?? '');
$tableId     = (string)($src['table_id'] ?? '');
$orderRef    = (string)($src['order_id'] ?? $src['invoice_id'] ?? '');

$pdo = db();

$st = $pdo->prepare("
    INSERT INTO r2o_event_log
    (event_name, product_id, product_name, table_id, order_ref, raw_json)
    VALUES (?, ?, ?, ?, ?, ?)
");
$st->execute([
    $event !== '' ? $event : null,
    $productId !== '' ? $productId : null,
    $productName !== '' ? $productName : null,
    $tableId !== '' ? $tableId : null,
    $orderRef !== '' ? $orderRef : null,
    $raw,
]);

if ($event === '') {
    log_line('missing_event');
    out(['error' => 'missing_event'], 400);
}

if ($event !== 'orderItem.created' && $event !== 'invoice.created') {
    log_line('captured_unhandled_event', [
        'event' => $event,
        'product_id' => $productId,
        'product_name' => $productName,
        'table_id' => $tableId,
        'order_ref' => $orderRef,
    ]);
    out(['captured' => true, 'handled' => false, 'event' => $event], 200);
}

$quantity = (float)($src['item_quantity'] ?? 1);
$price    = (float)($src['item_price'] ?? $src['invoice_total'] ?? 0);

$map = find_mapping($pdo, $productId, $productName);

if (!$map) {
    $up = $pdo->prepare("
        INSERT INTO r2o_unknown_products
        (product_id, product_name, first_event_name, sample_payload, hits)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            last_seen_at = CURRENT_TIMESTAMP,
            hits = hits + 1,
            sample_payload = VALUES(sample_payload),
            first_event_name = COALESCE(first_event_name, VALUES(first_event_name))
    ");
    $up->execute([
        $productId !== '' ? $productId : null,
        $productName !== '' ? $productName : null,
        $event,
        $raw,
    ]);

    log_line('unknown_product_captured', [
        'event' => $event,
        'product_id' => $productId,
        'product_name' => $productName,
    ]);

    out([
        'captured' => true,
        'handled' => false,
        'reason' => 'unknown_product',
        'event' => $event,
        'product_id' => $productId !== '' ? $productId : null,
        'product_name' => $productName !== '' ? $productName : null,
    ], 202);
}

$menuId = (int)$map['menu_id'];
$usedFallback = (int)$map['is_fallback'] === 1;

$payload = [
    'table_id' => null,
    'table_name' => $tableId !== '' ? ('Table ' . $tableId) : 'Cashier',
    'location_id' => 1,
    'is_codier' => true,
    'items' => [[
        'menu_id' => $menuId,
        'name' => $productName !== '' ? $productName : 'Unknown',
        'quantity' => $quantity > 0 ? $quantity : 1,
        'price' => $price >= 0 ? $price : 0,
        'special_instructions' => '',
        'options' => [],
    ]],
    'customer_name' => $tableId !== '' ? ('R2O Table ' . $tableId) : 'R2O',
    'customer_phone' => '',
    'customer_email' => '',
    'payment_method' => 'card',
    'total_amount' => max(0, $price * max(1, $quantity)),
    'tip_amount' => 0,
    'coupon_code' => null,
    'coupon_discount' => 0,
    'special_instructions' => 'Imported from ready2order'
        . ' | event=' . $event
        . ' | product_id=' . $productId
        . ' | product_name=' . $productName
        . ' | table_id=' . $tableId
        . ' | order_ref=' . $orderRef
        . ($usedFallback ? ' | FALLBACK_MAPPING_USED=1' : ''),
];

log_line('posting_order', [
    'event' => $event,
    'used_fallback' => $usedFallback,
    'menu_id' => $menuId,
    'product_id' => $productId,
    'product_name' => $productName,
]);

[$httpCode, $curlErr, $respBody] = call_local_order_api($payload);

log_line('post_result', [
    'http_code' => $httpCode,
    'curl_error' => $curlErr,
    'body' => $respBody,
]);

if ($httpCode < 200 || $httpCode >= 300) {
    out([
        'error' => 'order_post_failed',
        'http_code' => $httpCode,
        'curl_error' => $curlErr,
        'body' => $respBody,
    ], 500);
}

out([
    'ok' => true,
    'event' => $event,
    'menu_id' => $menuId,
    'used_fallback' => $usedFallback,
    'body' => $respBody,
], 200);
