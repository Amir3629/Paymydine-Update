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

    /**
     * Split an integer cent total by non-negative integer weights.
     * Remainder cents are assigned by largest fractional remainder, then by
     * original index, so retries always produce the same allocation.
     *
     * @param int[] $weights
     * @return int[]
     */
    public static function weighted(int $totalCents, array $weights): array
    {
        if ($totalCents < 0 || !$weights) {
            throw new InvalidArgumentException('Weighted split requires a non-negative total and at least one weight.');
        }

        $normalized = [];
        foreach ($weights as $weight) {
            if (!is_int($weight) && !ctype_digit((string)$weight)) {
                throw new InvalidArgumentException('Weighted split values must be non-negative integers.');
            }
            $value = (int)$weight;
            if ($value < 0) {
                throw new InvalidArgumentException('Weighted split values must be non-negative integers.');
            }
            $normalized[] = $value;
        }

        $weightTotal = array_sum($normalized);
        if ($weightTotal < 1) {
            if ($totalCents === 0) {
                return array_fill(0, count($normalized), 0);
            }
            throw new InvalidArgumentException('At least one weighted split value must be positive.');
        }

        $shares = [];
        $remainders = [];
        $allocated = 0;

        foreach ($normalized as $index => $weight) {
            $numerator = $totalCents * $weight;
            $share = intdiv($numerator, $weightTotal);
            $shares[$index] = $share;
            $remainders[$index] = $numerator % $weightTotal;
            $allocated += $share;
        }

        $left = $totalCents - $allocated;
        if ($left > 0) {
            $order = array_keys($normalized);
            usort($order, static function (int $a, int $b) use ($remainders): int {
                if ($remainders[$a] === $remainders[$b]) {
                    return $a <=> $b;
                }
                return $remainders[$b] <=> $remainders[$a];
            });

            for ($i = 0; $i < $left; $i++) {
                $shares[$order[$i % count($order)]]++;
            }
        }

        ksort($shares);
        return array_values($shares);
    }
}
