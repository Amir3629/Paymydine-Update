<?php
declare(strict_types=1);

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
    $line = '['.date('Y-m-d H:i:s').'] PMD_R2O_STATEFUL '.$msg;
    if ($ctx) {
        $line .= ' '.json_encode($ctx, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    }
    $line .= PHP_EOL;
    @file_put_contents('/var/www/paymydine/storage/logs/system.log', $line, FILE_APPEND);
}

function fetchJson(string $url, string $token): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer '.$token,
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

        logLine('fetch_page', [
            'url' => $url,
            'http_code' => $httpCode,
            'curl_error' => $curlError,
            'count' => $count,
            'offset' => $offset,
            'body_len' => strlen($body),
        ]);

        if ($httpCode !== 200 || !is_array($json) || !isset($json['invoices']) || !is_array($json['invoices'])) {
            break;
        }

        foreach ($json['invoices'] as $invoice) {
            if (is_array($invoice)) $all[] = $invoice;
        }

        if ($count < $limit) {
            break;
        }

        $offset += $limit;
    } while (true);

    return $all;
}

function normalizeInvoices(array $invoices): array {
    $out = [];
    foreach ($invoices as $invoice) {
        $items = [];
        foreach (($invoice['items'] ?? []) as $item) {
            if (!is_array($item)) continue;
            $items[] = [
                'product_id' => (string)($item['product_id'] ?? ''),
                'name' => (string)($item['item_name'] ?? $item['item_product_name'] ?? ''),
                'qty' => (float)($item['item_quantity'] ?? $item['item_qty'] ?? 0),
                'total' => round((float)($item['item_total'] ?? $item['item_product_price'] ?? 0), 4),
            ];
        }

        usort($items, function ($a, $b) {
            return strcmp(json_encode($a), json_encode($b));
        });

        $out[] = [
            'source_key' => 'r2o-invoice|'.(string)($invoice['invoice_id'] ?? ''),
            'invoice_id' => (string)($invoice['invoice_id'] ?? ''),
            'invoice_number' => (string)($invoice['invoice_numberFull'] ?? $invoice['invoice_number'] ?? ''),
            'table_id' => (string)($invoice['table_id'] ?? ''),
            'created_at' => (string)($invoice['invoice_timestamp'] ?? ''),
            'total_gross' => round((float)($invoice['invoice_total'] ?? 0), 4),
            'total_net' => round((float)($invoice['invoice_totalNet'] ?? 0), 4),
            'total_vat' => round((float)($invoice['invoice_totalVat'] ?? 0), 4),
            'items' => $items,
        ];
    }

    usort($out, function ($a, $b) {
        return strcmp((string)$b['created_at'], (string)$a['created_at']);
    });

    return $out;
}

$env = parseEnvFile('/var/www/paymydine/.env');

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

$stmt = $pdo->prepare("
SELECT config_id, url, access_token
FROM ti_pos_configs
WHERE config_id = 18
LIMIT 1
");
$stmt->execute();
$config = $stmt->fetch();

if (!$config) {
    logLine('config_not_found');
    fwrite(STDERR, "Config 18 not found\n");
    exit(1);
}

$token = trim((string)($config['access_token'] ?? ''));
$base  = rtrim((string)($config['url'] ?? 'https://api.ready2order.com/v1'), '/');

$stateDir = '/var/www/paymydine/storage/app/r2o_stateful';
@mkdir($stateDir, 0775, true);

$dateFrom = date('Y-m-d');
$dateTo   = date('Y-m-d');

logLine('start', [
    'mode' => 'invoice',
    'date_from' => $dateFrom,
    'date_to' => $dateTo,
]);

$invoices = fetchInvoices($base, $token, $dateFrom, $dateTo, 200);
$normalized = normalizeInvoices($invoices);

file_put_contents(
    $stateDir.'/last_rows.json',
    json_encode($normalized, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)
);

$summary = [
    'groups_count' => count($normalized),
    'latest' => array_slice($normalized, 0, 20),
];

file_put_contents(
    $stateDir.'/summary.json',
    json_encode($summary, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)
);

logLine('finish', [
    'groups_count' => count($normalized),
    'latest_source_key' => $normalized[0]['source_key'] ?? null,
]);
