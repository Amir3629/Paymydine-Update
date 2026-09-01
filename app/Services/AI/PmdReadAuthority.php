<?php

namespace App\Services\AI;

use Admin\Controllers\Pmdreports;
use Carbon\Carbon;
use InvalidArgumentException;
use Throwable;

// This App service is loaded through Composer PSR-4, while the canonical data
// authorities live in the Admin module controller namespace. Load the complete
// inheritance chain explicitly so service/CLI resolution never depends on a
// controller route having been touched first.
require_once base_path('app/admin/controllers/Reservations.php');
require_once base_path('app/admin/controllers/Reservations2.php');
require_once base_path('app/admin/controllers/Dashboard2.php');
require_once base_path('app/admin/controllers/Pmdreports.php');

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
    private const REPORTS = [
        'sales', 'hourly', 'categories', 'payments', 'transactions',
        'alerts', 'liveorders', 'topitems', 'reviews', 'reservations',
        'attendance',
    ];

    private const HISTORICAL_REPORTS = [
        'sales', 'hourly', 'categories', 'payments', 'transactions',
        'topitems', 'reservations',
    ];

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
        $this->assertReport($report, self::REPORTS);

        $timezone = $this->restaurantTimezone();
        $now = Carbon::now($timezone);
        if ($period === 'month') {
            $start = $now->copy()->startOfMonth();
        } else {
            $period = 'today';
            $start = $now->copy()->startOfDay();
        }

        return $this->reportPayload(
            $report,
            $start,
            $now,
            $period,
            null
        );
    }

    /**
     * Read a canonical PMD report for an explicit restaurant-local date range.
     *
     * This exists so the AI cannot silently relabel the current month as a
     * historical month. Dates are server-validated and never select tenant,
     * database, user or location scope.
     */
    public function reportRange(
        string $report,
        string $startDate,
        string $endDate
    ): array {
        $this->assertReport($report, self::HISTORICAL_REPORTS);

        $timezone = $this->restaurantTimezone();
        $start = $this->parseLocalDate($startDate, $timezone)->startOfDay();
        $end = $this->parseLocalDate($endDate, $timezone)->endOfDay();

        if ($end->lt($start)) {
            throw new InvalidArgumentException(
                'Historical report end_date must be on or after start_date.'
            );
        }

        if ($start->diffInDays($end) > 366) {
            throw new InvalidArgumentException(
                'Historical report range cannot exceed 366 days.'
            );
        }

        $now = Carbon::now($timezone);
        if ($start->gt($now)) {
            throw new InvalidArgumentException(
                'Historical report start_date cannot be in the future.'
            );
        }

        if ($end->gt($now)) {
            $end = $now->copy();
        }

        return $this->reportPayload(
            $report,
            $start,
            $end,
            'custom',
            [
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d'),
            ]
        );
    }

    private function assertReport(string $report, array $allowed): void
    {
        if (!in_array($report, $allowed, true)) {
            throw new InvalidArgumentException('Unsupported PMD report.');
        }
    }

    private function parseLocalDate(string $value, string $timezone): Carbon
    {
        $value = trim($value);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            throw new InvalidArgumentException(
                'Historical report dates must use YYYY-MM-DD.'
            );
        }

        try {
            $date = Carbon::createFromFormat('!Y-m-d', $value, $timezone);
        } catch (Throwable $error) {
            throw new InvalidArgumentException(
                'Historical report date is invalid.'
            );
        }

        if (!$date || $date->format('Y-m-d') !== $value) {
            throw new InvalidArgumentException(
                'Historical report date is invalid.'
            );
        }

        return $date;
    }

    private function reportPayload(
        string $report,
        Carbon $start,
        Carbon $end,
        string $period,
        ?array $range
    ): array {
        $payload = $this->payload($report, $start, $end, $period);
        $generatedAt = Carbon::now($this->restaurantTimezone());

        return [
            'available' => true,
            'report' => $report,
            'period' => $period,
            'range' => $range,
            'generated_at' => $generatedAt->toIso8601String(),
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
