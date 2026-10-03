<?php

namespace App\Services\Financial;

use InvalidArgumentException;

final class ServiceChargeCalculator
{
    public static function calculate(int $aggregateGrossCents, string $type, string $configuredValue): int
    {
        if ($aggregateGrossCents < 0 || !preg_match('/^\d+(?:\.\d{1,4})?$/', $configuredValue)) {
            throw new InvalidArgumentException('Invalid service-charge input.');
        }

        if ($type === 'fixed') {
            [$whole, $fraction] = array_pad(explode('.', $configuredValue, 2), 2, '');
            return ((int)$whole * 100) + (int)str_pad(substr($fraction, 0, 2), 2, '0');
        }

        if ($type !== 'percentage') {
            throw new InvalidArgumentException('Unsupported service-charge type.');
        }

        [$whole, $fraction] = array_pad(explode('.', $configuredValue, 2), 2, '');
        $rateTenThousandths = ((int)$whole * 10000) + (int)str_pad(substr($fraction, 0, 4), 4, '0');
        return intdiv(($aggregateGrossCents * $rateTenThousandths) + 500000, 1000000);
    }
}
