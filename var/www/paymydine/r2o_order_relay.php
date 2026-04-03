<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

$rawBody = file_get_contents('php://input') ?: '';
$contentType = $_SERVER['CONTENT_TYPE'] ?? 'application/json';
$forwardTo = $_GET['forward_to'] ?? '';

$payload = [
    'marker' => 'PMD_R2O_ORDER_RELAY_HIT',
    'time_utc' => gmdate('c'),
    'method' => $_SERVER['REQUEST_METHOD'] ?? '',
    'host' => $_SERVER['HTTP_HOST'] ?? '',
    'uri' => $_SERVER['REQUEST_URI'] ?? '',
    'forward_to' => $forwardTo,
    'body_len' => strlen($rawBody),
    'body_preview' => substr($rawBody, 0, 4000),
];

@file_put_contents(
    '/var/www/paymydine/storage/logs/system.log',
    '['.date('Y-m-d H:i:s').'] PMD_R2O_ORDER_RELAY '.json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL,
    FILE_APPEND
);

$result = [
    'ok' => true,
    'forwarded' => false,
    'forward_to' => $forwardTo,
];

if ($forwardTo !== '') {
    $ch = curl_init($forwardTo);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: '.$contentType],
        CURLOPT_POSTFIELDS => $rawBody,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
    ]);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    $result['forwarded'] = true;
    $result['forward_status'] = $code;
    $result['forward_error'] = $err;
    $result['forward_response_preview'] = is_string($resp) ? substr($resp, 0, 2000) : null;

    @file_put_contents(
        '/var/www/paymydine/storage/logs/system.log',
        '['.date('Y-m-d H:i:s').'] PMD_R2O_ORDER_RELAY_FORWARD '.json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL,
        FILE_APPEND
    );
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
