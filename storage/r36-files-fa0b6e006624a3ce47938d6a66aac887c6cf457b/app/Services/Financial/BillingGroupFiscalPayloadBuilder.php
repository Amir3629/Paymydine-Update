<?php

namespace App\Services\Financial;

use InvalidArgumentException;
use RuntimeException;

final class BillingGroupFiscalPayloadBuilder
{
    private const VAT_ORDER = [
        'NORMAL',
        'REDUCED_1',
        'SPECIAL_RATE_1',
        'SPECIAL_RATE_2',
        'NULL',
    ];

    public function vatName(float $rate): string
    {
        $map = [
            19.0 => 'NORMAL',
            7.0 => 'REDUCED_1',
            10.7 => 'SPECIAL_RATE_1',
            5.5 => 'SPECIAL_RATE_2',
            0.0 => 'NULL',
        ];

        foreach ($map as $known => $name) {
            if (abs($rate - (float)$known) < 0.01) return $name;
        }

        throw new InvalidArgumentException(sprintf(
            'Unsupported SIGN DE VAT rate %.4f. Configure one of 19, 7, 10.7, 5.5 or 0.',
            $rate
        ));
    }

    /**
     * @param array<int,array{method:string,amount_cents:int}> $payments
     */
    public function buildReceipt(
        int $childGrossCents,
        float $childVatRate,
        int $serviceGrossCents,
        float $serviceVatRate,
        int $tipGrossCents,
        float $tipVatRate,
        int $discountCents,
        array $payments,
        string $currency = 'EUR'
    ): array {
        foreach ([$childGrossCents, $serviceGrossCents, $tipGrossCents, $discountCents] as $value) {
            if ($value < 0) throw new InvalidArgumentException('Fiscal cent amounts cannot be negative.');
        }
        if ($discountCents > $childGrossCents) {
            throw new InvalidArgumentException('Final Bill discount exceeds the child-order gross amount.');
        }

        $currency = strtoupper(trim($currency));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new InvalidArgumentException('Fiscal currency must be an ISO-4217 three-letter code.');
        }

        $vatBuckets = [];
        $this->addVat($vatBuckets, $this->vatName($childVatRate), $childGrossCents - $discountCents);
        $this->addVat($vatBuckets, $this->vatName($serviceVatRate), $serviceGrossCents);
        $this->addVat($vatBuckets, $this->vatName($tipVatRate), $tipGrossCents);

        $paymentBuckets = ['CASH' => 0, 'NON_CASH' => 0];
        foreach ($payments as $payment) {
            $amount = max(0, (int)($payment['amount_cents'] ?? 0));
            if ($amount < 1) continue;
            $method = strtolower(trim((string)($payment['method'] ?? '')));
            $kind = in_array($method, ['cash', 'bar', 'cash_payment'], true) ? 'CASH' : 'NON_CASH';
            $paymentBuckets[$kind] += $amount;
        }

        $expected = $childGrossCents + $serviceGrossCents + $tipGrossCents - $discountCents;
        $paid = array_sum($paymentBuckets);
        if ($expected < 1) throw new RuntimeException('Fiscal Final Bill total must be greater than zero.');
        if ($paid !== $expected) {
            throw new RuntimeException(sprintf(
                'Fiscal payment total mismatch: expected %d cents, settled payments contain %d cents.',
                $expected,
                $paid
            ));
        }

        $amountsPerVat = [];
        foreach (self::VAT_ORDER as $name) {
            $amount = (int)($vatBuckets[$name] ?? 0);
            if ($amount < 1) continue;
            $amountsPerVat[] = ['vat_rate' => $name, 'amount' => $this->money($amount)];
        }

        $amountsPerPayment = [];
        foreach (['CASH', 'NON_CASH'] as $kind) {
            $amount = (int)$paymentBuckets[$kind];
            if ($amount < 1) continue;
            $amountsPerPayment[] = [
                'payment_type' => $kind,
                'amount' => $this->money($amount),
                'currency_code' => $currency,
            ];
        }

        if (!$amountsPerVat || !$amountsPerPayment) {
            throw new RuntimeException('Fiscal receipt payload is incomplete.');
        }

        return [
            'standard_v1' => [
                'receipt' => [
                    'receipt_type' => 'RECEIPT',
                    'amounts_per_vat_rate' => $amountsPerVat,
                    'amounts_per_payment_type' => $amountsPerPayment,
                ],
            ],
        ];
    }

    private function addVat(array &$buckets, string $name, int $amount): void
    {
        if ($amount < 1) return;
        $buckets[$name] = (int)($buckets[$name] ?? 0) + $amount;
    }

    private function money(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
