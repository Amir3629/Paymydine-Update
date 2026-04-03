<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

function pmd_fp(?string $v): array {
    $t = trim((string)$v);
    return [
        'len' => strlen($t),
        'prefix12' => $t !== '' ? substr($t, 0, 12) : '',
        'suffix12' => $t !== '' ? substr($t, -12) : '',
    ];
}

$rawBody = file_get_contents('php://input') ?: '';
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$uri = $_SERVER['REQUEST_URI'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
$query = $_GET ?? [];

$headers = [];
foreach ($_SERVER as $k => $v) {
    if (str_starts_with($k, 'HTTP_') || in_array($k, ['CONTENT_TYPE', 'CONTENT_LENGTH'], true)) {
        $headers[$k] = $v;
    }
}

$decoded = null;
if ($rawBody !== '') {
    $tmp = json_decode($rawBody, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $decoded = $tmp;
    }
}

$logPayload = [
    'marker' => 'PMD_R2O_ORDER_PROBE_HIT',
    'time_utc' => gmdate('c'),
    'method' => $method,
    'host' => $host,
    'uri' => $uri,
    'content_type' => $contentType,
    'query' => $query,
    'headers' => $headers,
    'body_len' => strlen($rawBody),
    'body_preview' => substr($rawBody, 0, 4000),
    'json_keys' => is_array($decoded) ? array_keys($decoded) : [],
];

$line = '['.date('Y-m-d H:i:s').'] PMD_R2O_ORDER_PROBE '.json_encode($logPayload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;
@file_put_contents('/var/www/paymydine/storage/logs/system.log', $line, FILE_APPEND);

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok' => true,
    'marker' => 'PMD_R2O_ORDER_PROBE_HIT',
    'method' => $method,
    'host' => $host,
    'uri' => $uri,
    'content_type' => $contentType,
    'body_len' => strlen($rawBody),
    'json_keys' => is_array($decoded) ? array_keys($decoded) : [],
], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
