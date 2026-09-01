<?php

namespace App\Services\AI;

use Admin\Controllers\Pmdreports;
use Carbon\Carbon;
use InvalidArgumentException;

/**
 * Thin, read-only bridge over PMD's existing Dashboard2/Pmdreports authority.
 *
 * The constructor intentionally does not call Pmdreports::__construct(). This
 * class is never rendered as an Admin page; skipping the parent UI constructor
 * prevents Reservations/Dashboard/Reports assets from being registered on the
 * PMD Intelligence workspace while preserving the proven protected data
 * methods inherited from Pmdreports/Dashboard2.
 */
final class PmdReadAuthority extends Pmdreports
{
    public function __construct()
    {
        // Data bridge only. No Admin page/UI constructor side effects.
    }

    public function canonicalLocationId(): ?int
    {
        return $this->locationId();
    }

    public function canonicalTimezone(): string
    {
        return $this->restaurantTimezone();
    }

    public function ownerKpis(): array
    {
        return $this->kpiPayload();
    }

    public function reportSnapshot(string $report, string $period): array
    {
        $allowed = [
            'sales', 'hourly', 'categories', 'payments', 'transactions',
            'alerts', 'liveorders', 'topitems', 'reviews', 'reservations',
            'attendance',
        ];

        if (!in_array($report, $allowed, true)) {
            throw new InvalidArgumentException('Unsupported PMD report.');
        }

        $timezone = $this->restaurantTimezone();
        $now = Carbon::now($timezone);
        if ($period === 'month') {
            $start = $now->copy()->startOfMonth();
        } else {
            $period = 'today';
            $start = $now->copy()->startOfDay();
        }

        $payload = $this->payload($report, $start, $now, $period);

        return [
            'available' => true,
            'report' => $report,
            'period' => $period,
            'generated_at' => $now->toIso8601String(),
            'location_id' => $this->locationId(),
            'stats' => $payload['stats'] ?? [],
            'chart' => $payload['chart'] ?? null,
            'columns' => $payload['columns'] ?? [],
            'rows' => array_slice((array)($payload['rows'] ?? []), 0, 50),
            'empty' => (bool)($payload['empty'] ?? false),
            'source' => $payload['source'] ?? 'PMD canonical report authority',
        ];
    }
}
