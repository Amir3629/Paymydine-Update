<?php

namespace App\Services\Financial;

use InvalidArgumentException;

final class DeterministicSplit
{
    /** @return int[] */
    public static function equal(int $baseCents, int $people): array
    {
        if ($baseCents < 0 || $people < 1) {
            throw new InvalidArgumentException('Split base must be non-negative and people must be positive.');
        }

        $share = intdiv($baseCents, $people);
        $remainder = $baseCents % $people;

        return array_map(static function (int $index) use ($share, $remainder): int {
            return $share + ($index < $remainder ? 1 : 0);
        }, range(0, $people - 1));
    }

    public static function percentage(int $baseCents, int $basisPoints): int
    {
        if ($baseCents < 0 || $basisPoints < 0 || $basisPoints > 10000) {
            throw new InvalidArgumentException('Percentage must be between 0 and 10000 basis points.');
        }

        return intdiv(($baseCents * $basisPoints) + 5000, 10000);
    }
}
