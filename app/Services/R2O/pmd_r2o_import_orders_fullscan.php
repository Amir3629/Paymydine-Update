<?php
declare(strict_types=1);

const APP_ENV_FILE = '/var/www/paymydine/.env';
const LOG_FILE = '/var/www/paymydine/storage/logs/system.log';
const LOCK_FILE = '/var/www/paymydine/storage/framework/cache/pmd_r2o_import_orders_fullscan.lock';

$lockFp = fopen(LOCK_FILE, 'c+');
if (!$lockFp || !flock($lockFp, LOCK_EX | LOCK_NB)) {
    @file_put_contents(
        LOG_FILE,
        '['.date('Y-m-d H:i:s').'] PMD_R2O_FULLSCAN lock_busy'.PHP_EOL,
        FILE_APPEND
    );
    echo json_encode([
        'success' => true,
        'message' => 'Importer already running, skipped safely'
    ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT).PHP_EOL;
    exit(0);
}

function parseEnvFile(string $path): array {
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

function logLine(string $msg, array $ctx = []): void {
    $line = '[' . date('Y-m-d H:i:s') . '] PMD_R2O_FULLSCAN ' . $msg;
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

    $decoded = null;
    if (is_string($body) && $body !== '') {
        $tmp = json_decode($body, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $decoded = $tmp;
        }
    }

    return [$code, $body === false ? '' : $body, $err, $decoded];
}

function postJson(string $url, array $payload): array {
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT => 60,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
    ]);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    return [$code, $resp === false ? '' : $resp, $err];
}

function normalizeProductName(string $name): string {
    $name = mb_strtolower(trim($name));
    $name = preg_replace('/\s*\(.*?\)\s*/u', ' ', $name);
    $name = preg_replace('/\s+/u', ' ', $name);
    return trim((string)$name);
}

function resolveLocalMenuId(PDO $pdo, string $externalProductId, string $name): ?int {
    if ($externalProductId !== '') {
        $stmt = $pdo->prepare("
            SELECT local_menu_id
            FROM ti_pos_product_mappings
            WHERE provider = 'ready2order'
              AND external_product_id = :external_product_id
              AND is_active = 1
            LIMIT 1
        ");
        $stmt->execute(['external_product_id' => $externalProductId]);
        $mapped = $stmt->fetchColumn();
        if ($mapped) {
            return (int)$mapped;
        }
    }

    $stmt = $pdo->prepare("
        SELECT menu_id
        FROM ti_menus
        WHERE TRIM(LOWER(menu_name)) = TRIM(LOWER(:name))
        LIMIT 1
    ");
    $stmt->execute(['name' => $name]);
    $menuId = $stmt->fetchColumn();
    if ($menuId) {
        return (int)$menuId;
    }

    $normalized = normalizeProductName($name);

    $stmt = $pdo->query("SELECT menu_id, menu_name FROM ti_menus");
    foreach ($stmt as $menu) {
        if (normalizeProductName((string)$menu['menu_name']) === $normalized) {
            return (int)$menu['menu_id'];
        }
    }

    return null;
}

function resolveLocalTable(PDO $pdo, ?string $externalTableId, ?string $tableName): array {
    $externalTableId = trim((string)$externalTableId);
    $tableName = trim((string)$tableName);

    if ($externalTableId !== '') {
        $stmt = $pdo->prepare("
            SELECT local_table_id, external_table_name
            FROM ti_pos_table_mappings
            WHERE external_table_id = :external_table_id
            LIMIT 1
        ");
        $stmt->execute(['external_table_id' => $externalTableId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['local_table_id'])) {
            return [
                'table_id' => (int)$row['local_table_id'],
                'table_name' => (string)($row['external_table_name'] ?? $tableName),
            ];
        }
    }

    if ($tableName !== '') {
        $stmt = $pdo->prepare("
            SELECT local_table_id, external_table_name
            FROM ti_pos_table_mappings
            WHERE LOWER(TRIM(external_table_name)) = LOWER(TRIM(:table_name))
            LIMIT 1
        ");
        $stmt->execute(['table_name' => $tableName]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['local_table_id'])) {
            return [
                'table_id' => (int)$row['local_table_id'],
                'table_name' => (string)($row['external_table_name'] ?? $tableName),
            ];
        }
    }

    return [
        'table_id' => null,
        'table_name' => $tableName !== '' ? $tableName : 'Cashier',
    ];
}

function ensureImportTables(PDO $pdo): void {
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS ti_pos_order_imports (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        provider VARCHAR(64) NOT NULL DEFAULT 'ready2order',
        source_key VARCHAR(255) NOT NULL,
        external_order_number VARCHAR(64) DEFAULT NULL,
        external_table_id VARCHAR(64) DEFAULT NULL,
        source_table_id BIGINT DEFAULT NULL,
        external_order_group VARCHAR(64) DEFAULT NULL,
        external_created_at DATETIME DEFAULT NULL,
        local_order_id BIGINT DEFAULT NULL,
        import_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        total_gross DECIMAL(15,4) DEFAULT 0.0000,
        total_net DECIMAL(15,4) DEFAULT 0.0000,
        total_vat DECIMAL(15,4) DEFAULT 0.0000,
        lines_count INT NOT NULL DEFAULT 0,
        payload_json LONGTEXT DEFAULT NULL,
        error_message TEXT DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_source_key (source_key),
        KEY idx_status (import_status),
        KEY idx_local_order_id (local_order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
    CREATE TABLE IF NOT EXISTS ti_pos_order_import_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        import_id BIGINT UNSIGNED NOT NULL,
        source_key VARCHAR(255) NOT NULL,
        external_order_id VARCHAR(64) DEFAULT NULL,
        external_product_id VARCHAR(64) DEFAULT NULL,
        external_product_name VARCHAR(255) DEFAULT NULL,
        quantity DECIMAL(15,4) DEFAULT 0.0000,
        price_gross DECIMAL(15,4) DEFAULT 0.0000,
        price_net DECIMAL(15,4) DEFAULT 0.0000,
        vat_amount DECIMAL(15,4) DEFAULT 0.0000,
        vat_rate DECIMAL(15,4) DEFAULT 0.0000,
        raw_json LONGTEXT DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_import_id (import_id),
        KEY idx_source_key (source_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
    CREATE TABLE IF NOT EXISTS ti_pos_product_mappings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        provider VARCHAR(64) NOT NULL,
        external_product_id VARCHAR(64) NOT NULL,
        external_product_name VARCHAR(255) DEFAULT NULL,
        local_menu_id BIGINT UNSIGNED NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_provider_external_product (provider, external_product_id),
        KEY idx_local_menu_id (local_menu_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
}

function mapPaymentMethod(array $invoice): string {
    $name = mb_strtolower(trim((string)($invoice['payment'][0]['billPayment_name'] ?? '')));
    if (str_contains($name, 'bar')) return 'cash';
    if (str_contains($name, 'kart')) return 'cash';
    if (str_contains($name, 'card')) return 'cash';
    return 'cash';
}

function fetchInvoices(string $base, string $token, string $dateFrom, string $dateTo, int $limit = 200): array {
    $offset = 0;
    $all = [];

    do {
        $url = $base.'/document/invoice?dateFrom='.rawurlencode($dateFrom)
            .'&dateTo='.rawurlencode($dateTo)
            .'&items=true&payments=true'
            .'&limit='.$limit
            .'&offset='.$offset;

        [$httpCode, $body, $curlError, $json] = fetchJson($url, $token);

        $count = (is_array($json) && isset($json['invoices']) && is_array($json['invoices']))
            ? count($json['invoices'])
            : 0;

        logLine('page_fetch', [
            'url' => $url,
            'http_code' => $httpCode,
            'curl_error' => $curlError,
            'body_len' => strlen($body),
            'row_count' => $count,
            'offset' => $offset,
        ]);

        if ($httpCode !== 200 || !is_array($json) || !isset($json['invoices']) || !is_array($json['invoices'])) {
            break;
        }

        foreach ($json['invoices'] as $invoice) {
            if (is_array($invoice)) {
                $all[] = $invoice;
            }
        }

        if ($count < $limit) {
            break;
        }

        $offset += $limit;
    } while (true);

    return $all;
}

function buildInvoiceGroups(array $invoices): array {
    $groups = [];

    foreach ($invoices as $invoice) {
        $invoiceId = (string)($invoice['invoice_id'] ?? '');
        if ($invoiceId === '') continue;

        $tableName = '';
        if (!empty($invoice['items']) && is_array($invoice['items'])) {
            foreach ($invoice['items'] as $it) {
                if (!empty($it['table_name'])) {
                    $tableName = (string)$it['table_name'];
                    break;
                }
            }
        }

        $groups[] = [
            'source_key' => 'r2o-invoice|'.$invoiceId,
            'invoice_id' => $invoiceId,
            'invoice_number' => (string)($invoice['invoice_numberFull'] ?? $invoice['invoice_number'] ?? ''),
            'table_id' => (string)($invoice['table_id'] ?? ''),
            'table_name' => $tableName,
            'invoice_timestamp' => (string)($invoice['invoice_timestamp'] ?? ''),
            'invoice_total' => (float)($invoice['invoice_total'] ?? 0),
            'invoice_total_net' => (float)($invoice['invoice_totalNet'] ?? 0),
            'invoice_total_vat' => (float)($invoice['invoice_totalVat'] ?? 0),
            'payment_method' => mapPaymentMethod($invoice),
            'items' => is_array($invoice['items'] ?? null) ? $invoice['items'] : [],
            'raw_invoice' => $invoice,
        ];
    }

    usort($groups, function ($a, $b) {
        return strcmp((string)$b['invoice_timestamp'], (string)$a['invoice_timestamp']);
    });

    return $groups;
}

function buildPayload(PDO $pdo, array $group): array {
    $items = [];
    $totalGross = 0.0;
    $totalNet = 0.0;
    $totalVat = 0.0;
    $tableName = trim((string)($group['table_name'] ?? ''));

    foreach ($group['items'] as $item) {
        if (!is_array($item)) continue;

        $name = (string)($item['item_name'] ?? $item['item_product_name'] ?? 'Unknown');
        $qty  = (float)($item['item_quantity'] ?? $item['item_qty'] ?? 0);
        $unitGross = (float)($item['item_price'] ?? $item['item_product_pricePerUnit'] ?? 0);
        $lineGross = (float)($item['item_total'] ?? $item['item_product_price'] ?? 0);
        $lineNet   = (float)($item['item_totalNet'] ?? $item['item_product_priceNet'] ?? 0);
        $lineVat   = (float)($item['item_vat'] ?? $item['item_product_vat'] ?? 0);
        $externalProductId = (string)($item['product_id'] ?? '');

        if (!empty($item['table_name'])) {
            $tableName = (string)$item['table_name'];
        }

        $menuId = resolveLocalMenuId($pdo, $externalProductId, $name);
        if (!$menuId) {
            throw new RuntimeException(
                'Local menu not found for invoice item: '.$name.' | external_product_id='.$externalProductId
            );
        }

        $items[] = [
            'menu_id' => (int)$menuId,
            'name' => $name,
            'quantity' => $qty > 0 ? $qty : 1,
            'price' => round($unitGross, 4),
            'special_instructions' => '',
            'options' => [],
        ];

        $totalGross += $lineGross;
        $totalNet   += $lineNet;
        $totalVat   += $lineVat;
    }

    if ($totalGross <= 0 && isset($group['invoice_total'])) {
        $totalGross = (float)$group['invoice_total'];
        $totalNet   = (float)($group['invoice_total_net'] ?? 0);
        $totalVat   = (float)($group['invoice_total_vat'] ?? 0);
    }

    $resolvedTable = resolveLocalTable(
        $pdo,
        (string)($group['table_id'] ?? ''),
        $tableName
    );

    $niceTableName = trim((string)($resolvedTable['table_name'] ?? $tableName));
    if ($niceTableName === '') {
        $niceTableName = 'Cashier';
    }

    $specialInstructions = implode(' | ', [
        'Imported from ready2order invoice',
        'invoice_id='.$group['invoice_id'],
        'invoice_number='.$group['invoice_number'],
        'table_id='.$group['table_id'],
        'table_name='.$niceTableName,
        'mapped_local_table_id='.(string)($resolvedTable['table_id'] ?? ''),
        'mapped_local_table_name='.$niceTableName,
        'created_at='.$group['invoice_timestamp'],
        'source_key='.$group['source_key'],
        'gross='.number_format($totalGross, 2, '.', ''),
        'net='.number_format($totalNet, 2, '.', ''),
        'vat='.number_format($totalVat, 2, '.', ''),
    ]);

    return [[
        'table_id' => null,
        'table_name' => $niceTableName,
        'location_id' => 1,
        'is_codier' => true,
        'items' => $items,
        'customer_name' => $niceTableName,
        'customer_phone' => '',
        'customer_email' => '',
        'payment_method' => $group['payment_method'] ?? 'cash',
        'total_amount' => round($totalGross, 2),
        'tip_amount' => 0,
        'coupon_code' => null,
        'coupon_discount' => 0,
        'special_instructions' => $specialInstructions,
        'resolved_table' => $resolvedTable,
    ], $totalGross, $totalNet, $totalVat, $resolvedTable];
}

$env = parseEnvFile(APP_ENV_FILE);

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

ensureImportTables($pdo);

$stmt = $pdo->prepare("
    SELECT config_id, url, access_token
    FROM ti_pos_configs
    WHERE config_id = 18
    LIMIT 1
");
$stmt->execute();
$config = $stmt->fetch();

if (!$config) {
    throw new RuntimeException('Config 18 not found');
}

$token = trim((string)($config['access_token'] ?? ''));
$base  = rtrim((string)($config['url'] ?? 'https://api.ready2order.com/v1'), '/');

if ($token === '') {
    throw new RuntimeException('Empty token');
}

$dateFrom = $argv[1] ?? date('Y-m-d');
$dateTo   = $argv[2] ?? date('Y-m-d');

logLine('start', [
    'base' => $base,
    'mode' => 'invoice',
    'date_from' => $dateFrom,
    'date_to' => $dateTo,
]);

$scanDir = '/var/www/paymydine/storage/app/r2o_fullscan';
if (!is_dir($scanDir)) {
    @mkdir($scanDir, 0775, true);
}

$invoices = fetchInvoices($base, $token, $dateFrom, $dateTo, 200);

file_put_contents(
    $scanDir.'/all_rows.json',
    json_encode($invoices, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)
);

$groups = buildInvoiceGroups($invoices);

$result = [
    'rows_total' => count($invoices),
    'groups_total' => count($groups),
    'latest_created_at' => $groups[0]['invoice_timestamp'] ?? null,
    'latest_source_key' => $groups[0]['source_key'] ?? null,
    'imported' => 0,
    'skipped_existing' => 0,
    'failed' => 0,
    'details' => [],
];

foreach ($groups as $group) {
    $sourceKey = (string)$group['source_key'];

    try {
        $stmt = $pdo->prepare("
            SELECT id, local_order_id, import_status
            FROM ti_pos_order_imports
            WHERE source_key = :source_key
            LIMIT 1
        ");
        $stmt->execute(['source_key' => $sourceKey]);
        $existing = $stmt->fetch();

        if ($existing && in_array((string)$existing['import_status'], ['imported', 'posted'], true)) {
            $result['skipped_existing']++;
            $result['details'][] = [
                'source_key' => $sourceKey,
                'status' => 'skipped_existing',
                'local_order_id' => $existing['local_order_id'] ?? null,
            ];
            continue;
        }

        [$payload, $totalGross, $totalNet, $totalVat, $resolvedTable] = buildPayload($pdo, $group);

        $payloadJson = json_encode($group['raw_invoice'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

        if ($existing) {
            $stmt = $pdo->prepare("
                UPDATE ti_pos_order_imports
                SET provider='ready2order',
                    external_order_number=:external_order_number,
                    external_table_id=:external_table_id,
                    source_table_id=:source_table_id,
                    external_order_group=:external_order_group,
                    external_created_at=:external_created_at,
                    total_gross=:total_gross,
                    total_net=:total_net,
                    total_vat=:total_vat,
                    lines_count=:lines_count,
                    payload_json=:payload_json,
                    import_status='pending',
                    error_message=NULL
                WHERE id=:id
            ");
            $stmt->execute([
                'external_order_number' => $group['invoice_number'],
                'external_table_id' => $group['table_id'],
                'source_table_id' => $resolvedTable['table_id'],
                'external_order_group' => 'invoice',
                'external_created_at' => $group['invoice_timestamp'],
                'total_gross' => $totalGross,
                'total_net' => $totalNet,
                'total_vat' => $totalVat,
                'lines_count' => count($group['items']),
                'payload_json' => $payloadJson,
                'id' => $existing['id'],
            ]);
            $importId = (int)$existing['id'];

            $pdo->prepare("DELETE FROM ti_pos_order_import_items WHERE import_id = :import_id")
                ->execute(['import_id' => $importId]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO ti_pos_order_imports
                (provider, source_key, external_order_number, external_table_id, source_table_id, external_order_group, external_created_at,
                 total_gross, total_net, total_vat, lines_count, payload_json, import_status)
                VALUES
                ('ready2order', :source_key, :external_order_number, :external_table_id, :source_table_id, :external_order_group, :external_created_at,
                 :total_gross, :total_net, :total_vat, :lines_count, :payload_json, 'pending')
            ");
            $stmt->execute([
                'source_key' => $sourceKey,
                'external_order_number' => $group['invoice_number'],
                'external_table_id' => $group['table_id'],
                'source_table_id' => $resolvedTable['table_id'],
                'external_order_group' => 'invoice',
                'external_created_at' => $group['invoice_timestamp'],
                'total_gross' => $totalGross,
                'total_net' => $totalNet,
                'total_vat' => $totalVat,
                'lines_count' => count($group['items']),
                'payload_json' => $payloadJson,
            ]);
            $importId = (int)$pdo->lastInsertId();
        }

        $itemStmt = $pdo->prepare("
            INSERT INTO ti_pos_order_import_items
            (import_id, source_key, external_order_id, external_product_id, external_product_name,
             quantity, price_gross, price_net, vat_amount, vat_rate, raw_json)
            VALUES
            (:import_id, :source_key, :external_order_id, :external_product_id, :external_product_name,
             :quantity, :price_gross, :price_net, :vat_amount, :vat_rate, :raw_json)
        ");

        foreach ($group['items'] as $item) {
            $itemStmt->execute([
                'import_id' => $importId,
                'source_key' => $sourceKey,
                'external_order_id' => (string)($group['invoice_id'] ?? ''),
                'external_product_id' => (string)($item['product_id'] ?? ''),
                'external_product_name' => (string)($item['item_name'] ?? $item['item_product_name'] ?? ''),
                'quantity' => (float)($item['item_quantity'] ?? $item['item_qty'] ?? 0),
                'price_gross' => (float)($item['item_total'] ?? $item['item_product_price'] ?? 0),
                'price_net' => (float)($item['item_totalNet'] ?? $item['item_product_priceNet'] ?? 0),
                'vat_amount' => (float)($item['item_vat'] ?? $item['item_product_vat'] ?? 0),
                'vat_rate' => (float)($item['item_vatRate'] ?? $item['item_product_vatRate'] ?? 0),
                'raw_json' => json_encode($item, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
            ]);
        }

        logLine('posting_order', [
            'source_key' => $sourceKey,
            'payload' => $payload,
        ]);

        [$postCode, $postBody, $postError] = postJson(
            'https://mimoza.paymydine.com/api/v1/orders',
            $payload
        );

        logLine('post_result', [
            'source_key' => $sourceKey,
            'http_code' => $postCode,
            'curl_error' => $postError,
            'body' => $postBody,
        ]);

        $localOrderId = null;
        $postJsonResp = json_decode($postBody, true);
        if (is_array($postJsonResp) && !empty($postJsonResp['order_id'])) {
            $localOrderId = (int)$postJsonResp['order_id'];
        }

        if ($postCode === 200 && $localOrderId) {
            $stmt = $pdo->prepare("
                UPDATE ti_pos_order_imports
                SET local_order_id=:local_order_id,
                    import_status='imported',
                    error_message=NULL
                WHERE id=:id
            ");
            $stmt->execute([
                'local_order_id' => $localOrderId,
                'id' => $importId,
            ]);

            $result['imported']++;
            $result['details'][] = [
                'source_key' => $sourceKey,
                'status' => 'imported',
                'local_order_id' => $localOrderId,
                'total_gross' => round($totalGross, 2),
                'total_net' => round($totalNet, 2),
                'total_vat' => round($totalVat, 2),
                'items_count' => count($group['items']),
                'mapped_table_id' => $resolvedTable['table_id'],
                'mapped_table_name' => $resolvedTable['table_name'],
            ];
        } else {
            $stmt = $pdo->prepare("
                UPDATE ti_pos_order_imports
                SET import_status='failed',
                    error_message=:error_message
                WHERE id=:id
            ");
            $stmt->execute([
                'error_message' => 'post_failed http='.$postCode.' curl='.$postError.' body='.$postBody,
                'id' => $importId,
            ]);

            $result['failed']++;
            $result['details'][] = [
                'source_key' => $sourceKey,
                'status' => 'failed',
                'http_code' => $postCode,
                'curl_error' => $postError,
                'body' => $postBody,
            ];
        }
    } catch (Throwable $e) {
        logLine('group_failed', [
            'source_key' => $sourceKey,
            'error' => $e->getMessage(),
        ]);

        $result['failed']++;
        $result['details'][] = [
            'source_key' => $sourceKey,
            'status' => 'failed',
            'error' => $e->getMessage(),
        ];
    }
}

file_put_contents(
    $scanDir.'/summary.json',
    json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)
);

logLine('finish', $result);
echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT).PHP_EOL;
