<?php
namespace App\Services\RestaurantGroups;

/** Exact minor-unit arithmetic. Never mix currencies or treat missing data as zero. */
final class ReportMath
{
    private const LIMIT = 9007199254740991;

    public static function minor(string $value, int $decimals): int
    {
        if ($decimals < 0 || $decimals > 4 || !preg_match('/^(-?)([0-9]+)(?:\.([0-9]+))?$/D', $value, $m)) {
            throw new \InvalidArgumentException('Invalid monetary value or precision.');
        }
        $whole = ltrim($m[2], '0');
        if (strlen($whole) > 12) throw new \OverflowException('Amount exceeds the reporting range.');
        $fraction = str_pad($m[3] ?? '', $decimals + 1, '0');
        $amount = (int)$whole * (10 ** $decimals) + (int)substr($fraction, 0, $decimals);
        if ((int)$fraction[$decimals] >= 5) $amount++;
        self::range($amount);
        return $m[1] === '-' ? -$amount : $amount;
    }

    public static function decimal(int $amount, int $decimals): string
    {
        self::range($amount);
        if ($decimals < 0 || $decimals > 4) throw new \InvalidArgumentException('Invalid precision.');
        $value = str_pad((string)abs($amount), $decimals + 1, '0', STR_PAD_LEFT);
        return ($amount < 0 ? '-' : '').($decimals ? substr($value, 0, -$decimals).'.'.substr($value, -$decimals) : $value);
    }

    public static function add(int $left, int $right): int
    {
        self::range($left); self::range($right);
        $result = $left + $right; self::range($result); return $result;
    }

    public static function aggregate(array $rows): array
    {
        $totals = []; $unavailable = [];
        foreach ($rows as $row) {
            if (empty($row['available'])) { $unavailable[] = (int)$row['tenant_id']; continue; }
            if (!preg_match('/^[A-Z]{3}$/D', (string)($row['currency'] ?? ''))
                || !is_int($row['decimals'] ?? null) || $row['decimals'] < 0 || $row['decimals'] > 4) {
                throw new \InvalidArgumentException('A report row has no configured currency.');
            }
            $key = $row['currency'].':'.$row['decimals'];
            if (!isset($totals[$key])) $totals[$key] = [
                'currency' => $row['currency'], 'decimals' => $row['decimals'],
                'revenue_minor' => 0, 'tips_minor' => 0, 'orders' => 0, 'locations' => 0,
            ];
            foreach (['revenue_minor', 'tips_minor', 'orders'] as $metric) {
                if (!is_int($row[$metric] ?? null)) throw new \InvalidArgumentException('Incomplete report row.');
                $totals[$key][$metric] = self::add($totals[$key][$metric], $row[$metric]);
            }
            if ($row['orders'] < 0) throw new \InvalidArgumentException('Negative order count.');
            $totals[$key]['locations']++;
        }
        foreach ($totals as &$total) {
            $count = $total['orders']; $amount = $total['revenue_minor'];
            $total['revenue'] = self::decimal($amount, $total['decimals']);
            $total['tips'] = self::decimal($total['tips_minor'], $total['decimals']);
            $average = $count ? intdiv($amount, $count) : null;
            if ($count && abs($amount % $count) * 2 >= $count) $average += $amount < 0 ? -1 : 1;
            $total['average_order'] = $average === null ? null : self::decimal($average, $total['decimals']);
        }
        unset($total);
        return ['totals' => array_values($totals), 'partial' => (bool)$unavailable,
            'unavailable_tenants' => $unavailable, 'mixed_currency' => count($totals) > 1];
    }

    private static function range(int $value): void
    {
        if ($value > self::LIMIT || $value < -self::LIMIT) throw new \OverflowException('Amount exceeds the exact reporting range.');
    }
}
