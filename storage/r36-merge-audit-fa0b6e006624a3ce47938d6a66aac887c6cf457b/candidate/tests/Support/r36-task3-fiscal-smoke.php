<?php

declare(strict_types=1);

require_once __DIR__.'/../../app/Services/Financial/BillingGroupFiscalPayloadBuilder.php';

use App\Services\Financial\BillingGroupFiscalPayloadBuilder;

$builder = new BillingGroupFiscalPayloadBuilder();
$schema = $builder->buildReceipt(
    10000,
    19.0,
    1000,
    19.0,
    500,
    0.0,
    100,
    [
        ['method' => 'cash', 'amount_cents' => 5000],
        ['method' => 'card', 'amount_cents' => 6400],
    ],
    'EUR'
);

$receipt = $schema['standard_v1']['receipt'] ?? null;
if (!is_array($receipt) || ($receipt['receipt_type'] ?? null) !== 'RECEIPT') {
    fwrite(STDERR, "Missing SIGN DE standard_v1 receipt.\n");
    exit(2);
}

$vat = [];
foreach ($receipt['amounts_per_vat_rate'] ?? [] as $row) {
    $vat[(string)$row['vat_rate']] = (string)$row['amount'];
}
if (($vat['NORMAL'] ?? null) !== '109.00' || ($vat['NULL'] ?? null) !== '5.00') {
    fwrite(STDERR, 'Unexpected VAT buckets: '.json_encode($vat)."\n");
    exit(3);
}

$payments = [];
foreach ($receipt['amounts_per_payment_type'] ?? [] as $row) {
    $payments[(string)$row['payment_type']] = [(string)$row['amount'], (string)($row['currency_code'] ?? '')];
}
if (($payments['CASH'] ?? null) !== ['50.00', 'EUR'] || ($payments['NON_CASH'] ?? null) !== ['64.00', 'EUR']) {
    fwrite(STDERR, 'Unexpected payment buckets: '.json_encode($payments)."\n");
    exit(4);
}

try {
    $builder->buildReceipt(10000, 19.0, 0, 19.0, 0, 0.0, 0, [
        ['method' => 'card', 'amount_cents' => 9999],
    ]);
    fwrite(STDERR, "Expected payment-total mismatch to fail.\n");
    exit(5);
} catch (RuntimeException $expected) {
}

try {
    $builder->vatName(8.0);
    fwrite(STDERR, "Expected unsupported VAT rate to fail.\n");
    exit(6);
} catch (InvalidArgumentException $expected) {
}

echo "R36 Task 3 fiscal payload smoke: PASS\n";
