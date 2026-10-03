<?php

namespace App\Services\Payments;

/**
 * PMD_PAYMENT_MINOR_UNITS_R1
 *
 * Converts human currency amounts to provider minor units.
 * OMR is special for PMD because 1 Omani Rial = 1000 baisa (3 decimals),
 * while EUR/USD and most existing PMD currencies use 2 decimals.
 */
final class MoneyMinorUnitConverter
{
    private const EXPONENTS = [
        'BHD' => 3,
        'JOD' => 3,
        'KWD' => 3,
        'OMR' => 3,
        'JPY' => 0,
        'KRW' => 0,
    ];

    public function exponent(string $currency): int
    {
        $currency = strtoupper(trim($currency));

        return self::EXPONENTS[$currency] ?? 2;
    }

    /**
     * Convert e.g. 8.500 OMR -> 8500.
     *
     * Values should normally come from a DECIMAL database column or a validated
     * request string. PHP float input is supported as a compatibility fallback.
     */
    public function toMinor(string|int|float $amount, string $currency): int
    {
        $currency = strtoupper(trim($currency));
        $exponent = $this->exponent($currency);
        $factor = 10 ** $exponent;

        if (function_exists('bcmul')) {
            $normalized = $this->normalizeDecimalString($amount);
            $scaled = bcmul($normalized, (string)$factor, 6);

            return (int)round((float)$scaled, 0, PHP_ROUND_HALF_UP);
        }

        return (int)round(((float)$amount) * $factor, 0, PHP_ROUND_HALF_UP);
    }

    public function fromMinor(int $minorAmount, string $currency): string
    {
        $exponent = $this->exponent($currency);
        $factor = 10 ** $exponent;

        return number_format($minorAmount / $factor, $exponent, '.', '');
    }

    private function normalizeDecimalString(string|int|float $amount): string
    {
        if (is_int($amount)) return (string)$amount;

        if (is_float($amount)) {
            // 8 decimal places is comfortably above all PMD settlement precisions.
            return rtrim(rtrim(number_format($amount, 8, '.', ''), '0'), '.');
        }

        $amount = trim(str_replace(',', '.', $amount));
        if ($amount === '' || !preg_match('/^-?\d+(?:\.\d+)?$/', $amount)) {
            throw new \InvalidArgumentException('Invalid monetary amount.');
        }

        return $amount;
    }
}
