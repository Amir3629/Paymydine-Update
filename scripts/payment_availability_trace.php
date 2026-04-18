#!/usr/bin/env php
<?php

declare(strict_types=1);

$baseUrl = getenv('PMD_BASE_URL') ?: 'https://mimoza.paymydine.com';
$endpoint = rtrim($baseUrl, '/').'/api/v1/payments/debug/availability-trace';

$ch = curl_init($endpoint);
if ($ch === false) {
    fwrite(STDERR, "Unable to initialize cURL\n");
    exit(2);
}

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
]);

$response = curl_exec($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    fwrite(STDERR, "Request failed: {$error}\n");
    exit(2);
}

$decoded = json_decode($response, true);
if (!is_array($decoded)) {
    fwrite(STDERR, "Invalid JSON response from {$endpoint}\n");
    echo $response."\n";
    exit(2);
}

if ($httpCode >= 400 || empty($decoded['success'])) {
    fwrite(STDERR, "Availability trace endpoint failed with HTTP {$httpCode}\n");
    echo json_encode($decoded, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
    exit(1);
}

echo json_encode($decoded, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
exit(0);
