#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * PMD VR Cloud Till capability probe R4.
 *
 * Creates ONE small pending VR test transaction without forcing
 * customersPresence=PHYSICAL_PRESENT, then asks VR which methods are available
 * for integrationMode=terminal.
 *
 * It does NOT call perform-transaction and does NOT settle a PayMyDine order.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

$options = getopt('', ['tenant:', 'amount::', 'help']);
if (isset($options['help'])) {
    echo "Usage:\n";
    echo "  php scripts/pmd-vr-cloud-till-capability-probe-r4.php --tenant=tomo --amount=0.10\n";
    exit(0);
}

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Admin\Classes\VRPaymentGatewayService;
use App\Services\Payments\VrPaymentApiClient;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$tenantDomain = strtolower(trim((string)($options['tenant'] ?? '')));
if ($tenantDomain === '') {
    fwrite(STDERR, "--tenant is required.\n");
    exit(3);
}
if (!str_contains($tenantDomain, '.')) {
    $tenantDomain .= '.paymydine.com';
}

$tenant = DB::connection('mysql')
    ->table('tenants')
    ->whereRaw('LOWER(domain) = ?', [$tenantDomain])
    ->first();

if (!$tenant) {
    fwrite(STDERR, "Tenant not found: {$tenantDomain}\n");
    exit(4);
}

$tenantDb = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
if ($tenantDb === '') {
    fwrite(STDERR, "Tenant database missing for {$tenantDomain}\n");
    exit(5);
}

Config::set('database.connections.mysql.database', $tenantDb);
DB::purge('mysql');
DB::reconnect('mysql');

$service = app(VRPaymentGatewayService::class);
$config = $service->getConfig();

if (strtolower(trim((string)($config['mode'] ?? 'test'))) !== 'test') {
    fwrite(STDERR, "Blocked: VR Payment is not in TEST mode.\n");
    exit(6);
}

$client = new VrPaymentApiClient($config);
$validation = $client->validateConfiguration();
if (!($validation['ok'] ?? false)) {
    fwrite(STDERR, "VR credentials invalid: ".($validation['message'] ?? 'unknown')."\n");
    exit(7);
}

$amount = isset($options['amount']) ? (float)$options['amount'] : 0.10;
$amount = max(0.01, min(1.00, round($amount, 2)));
$ref = 'PMD-VR-CLOUD-TILL-R4-'.gmdate('YmdHis').'-'.random_int(1000, 9999);

$payload = [
    'currency' => strtoupper((string)($config['currency'] ?? 'EUR')) ?: 'EUR',
    'language' => 'de-DE',
    'lineItems' => [[
        'amountIncludingTax' => number_format($amount, 2, '.', ''),
        'name' => 'PayMyDine VR Cloud Till capability probe',
        'quantity' => '1',
        'shippingRequired' => false,
        'sku' => 'pmd-vr-cloud-till-r4',
        'type' => 'PRODUCT',
        'uniqueId' => $ref,
    ]],
    'merchantReference' => $ref,
    'autoConfirmationEnabled' => false,
    'metaData' => [
        'pmd_surface' => 'vr_cloud_till_capability_probe',
        'pmd_probe_version' => 'r4',
    ],
];

$created = $client->createTransaction($payload);
if (!($created['ok'] ?? false) || !is_array($created['data'] ?? null)) {
    echo json_encode([
        'ok' => false,
        'stage' => 'create_transaction',
        'status' => $created['status'] ?? null,
        'message' => $created['message'] ?? null,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n";
    exit(8);
}

$tx = (array)$created['data'];
$txId = (int)($tx['id'] ?? 0);
if ($txId <= 0) {
    fwrite(STDERR, "VR returned no transaction ID.\n");
    exit(9);
}

$possible = $client->availablePaymentMethodConfigurations($txId, 'terminal');
$methods = ($possible['ok'] ?? false)
    ? $client->normalizeMethodConfigurations((array)($possible['data'] ?? []))
    : [];

$read = $client->readTransaction($txId);
$readData = ($read['ok'] ?? false) && is_array($read['data'] ?? null)
    ? (array)$read['data']
    : $tx;

echo json_encode([
    'ok' => true,
    'tenant' => $tenantDomain,
    'space_id' => (int)($config['space_id'] ?? 0),
    'transaction_id' => $txId,
    'merchant_reference' => $ref,
    'amount' => $amount,
    'customers_presence' => $readData['customersPresence'] ?? $tx['customersPresence'] ?? null,
    'transaction_state' => $readData['state'] ?? $tx['state'] ?? null,
    'terminal_mode' => [
        'ok' => (bool)($possible['ok'] ?? false),
        'status' => $possible['status'] ?? null,
        'message' => $possible['message'] ?? null,
        'methods' => $methods,
    ],
    'note' => 'No perform-transaction call was made. This transaction may later time out/close in the VR test dashboard.',
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
