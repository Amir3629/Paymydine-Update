<?php

namespace App\Services\AI;

use Admin\Controllers\Pmdreports;
use Carbon\Carbon;
use InvalidArgumentException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

require_once base_path('app/admin/controllers/Reservations.php');
require_once base_path('app/admin/controllers/Reservations2.php');
require_once base_path('app/admin/controllers/Dashboard2.php');
require_once base_path('app/admin/controllers/Pmdreports.php');

/**
 * Thin, read-only bridge over PMD's existing Dashboard2/Pmdreports authority.
 */
final class PmdReadAuthority extends Pmdreports
{
    private const REPORTS = [
        'sales', 'hourly', 'categories', 'payments', 'transactions',
        'channels', 'tips', 'alerts', 'liveorders', 'topitems', 'reviews',
        'reservations', 'attendance',
    ];

    private const HISTORICAL_REPORTS = [
        'sales', 'hourly', 'categories', 'payments', 'transactions',
        'channels', 'tips', 'topitems', 'reviews', 'reservations', 'attendance',
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

        return $this->reportPayload($report, $start, $now, $period, null);
    }

    public function reportRange(
        string $report,
        string $startDate,
        string $endDate
    ): array {
        $this->assertReport($report, self::HISTORICAL_REPORTS);
        [$start, $end] = $this->validatedRange(
            $startDate,
            $endDate,
            366,
            $report === 'reservations'
        );

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

    /**
     * Reconcile order activity against the main PMD child/settlement sources.
     * This is diagnostic only and never exposes generic SQL to the model.
     */
    public function orderIntegrityRange(string $startDate, string $endDate): array
    {
        [$start, $end] = $this->validatedRange($startDate, $endDate, 366, false);
        $locationId = (int)($this->locationId() ?: 0);

        if ($locationId < 1 || !Schema::hasTable('orders')) {
            return ['available' => false, 'reason' => 'Order source unavailable'];
        }

        $orderColumns = Schema::getColumnListing('orders');
        if (!in_array('order_id', $orderColumns, true)) {
            return ['available' => false, 'reason' => 'Order identity unavailable'];
        }

        $dateColumn = in_array('created_at', $orderColumns, true)
            ? 'created_at'
            : (in_array('order_date', $orderColumns, true) ? 'order_date' : null);
        if (!$dateColumn) {
            return ['available' => false, 'reason' => 'Order date source unavailable'];
        }

        $created = DB::table('orders');
        if (in_array('location_id', $orderColumns, true)) {
            $created->where('location_id', $locationId);
        }
        if ($dateColumn === 'created_at') {
            $created->whereBetween('created_at', [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ]);
        } else {
            $created->whereBetween('order_date', [
                $start->toDateString(),
                $end->toDateString(),
            ]);
        }

        $createdIds = (clone $created)->pluck('order_id')->map('intval')->filter()->values();
        $createdCount = $createdIds->count();
        $createdTotal = in_array('order_total', $orderColumns, true)
            ? round((float)(clone $created)->sum('order_total'), 2)
            : null;

        $settlementStates = [];
        if (in_array('settlement_status', $orderColumns, true)) {
            $stateRows = (clone $created)
                ->selectRaw("COALESCE(NULLIF(LOWER(TRIM(settlement_status)), ''), '(blank)') AS state, COUNT(*) AS orders")
                ->groupByRaw("COALESCE(NULLIF(LOWER(TRIM(settlement_status)), ''), '(blank)')")
                ->orderByDesc('orders')
                ->get();
            foreach ($stateRows as $row) {
                $settlementStates[(string)$row->state] = (int)$row->orders;
            }
        }

        $processed = null;
        if (in_array('processed', $orderColumns, true)) {
            $processed = [
                'yes' => (int)(clone $created)->where('processed', 1)->count(),
                'no' => (int)(clone $created)->where('processed', 0)->count(),
            ];
        }

        $settled = DB::table('orders');
        if (in_array('location_id', $orderColumns, true)) {
            $settled->where('location_id', $locationId);
        }
        if (in_array('processed', $orderColumns, true)) {
            $settled->where('processed', 1);
        }
        if (in_array('settlement_status', $orderColumns, true)) {
            $settled->whereIn(DB::raw('LOWER(TRIM(settlement_status))'), ['paid', 'settled']);
        }
        if (in_array('settled_at', $orderColumns, true)) {
            $settled->whereNotNull('settled_at')->whereBetween('settled_at', [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ]);
        } elseif ($dateColumn === 'created_at') {
            $settled->whereBetween('created_at', [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ]);
        } else {
            $settled->whereBetween('order_date', [$start->toDateString(), $end->toDateString()]);
        }

        $settledIds = (clone $settled)->pluck('order_id')->map('intval')->filter()->values();
        $settledAmountColumn = in_array('settled_amount', $orderColumns, true)
            ? 'settled_amount'
            : (in_array('order_total', $orderColumns, true) ? 'order_total' : null);
        $settledGross = $settledAmountColumn
            ? round((float)(clone $settled)->sum($settledAmountColumn), 2)
            : null;

        $tips = null;
        if ($settledIds->isNotEmpty() && Schema::hasTable('order_totals')) {
            $totalColumns = Schema::getColumnListing('order_totals');
            if (count(array_diff(['order_id', 'code', 'value'], $totalColumns)) === 0) {
                $tips = round((float)DB::table('order_totals')
                    ->whereIn('order_id', $settledIds->all())
                    ->whereRaw("LOWER(TRIM(code)) = 'tip'")
                    ->sum('value'), 2);
            }
        }

        $paymentMethods = [];
        $methodColumn = in_array('settlement_method', $orderColumns, true)
            ? 'settlement_method'
            : (in_array('payment', $orderColumns, true) ? 'payment' : null);
        if ($methodColumn) {
            $methodRows = (clone $settled)
                ->selectRaw("COALESCE(NULLIF(LOWER(TRIM(`{$methodColumn}`)), ''), '(unknown)') AS method, COUNT(*) AS orders")
                ->groupByRaw("COALESCE(NULLIF(LOWER(TRIM(`{$methodColumn}`)), ''), '(unknown)')")
                ->orderByDesc('orders')
                ->get();
            foreach ($methodRows as $row) {
                $paymentMethods[(string)$row->method] = (int)$row->orders;
            }
        }

        $linkage = [
            'orders' => $createdCount,
            'order_menus' => $this->linkedOrderCount('order_menus', $createdIds->all()),
            'order_totals' => $this->linkedOrderCount('order_totals', $createdIds->all()),
            'status_history' => $this->linkedStatusHistoryCount($createdIds->all()),
        ];
        foreach (['order_menus', 'order_totals', 'status_history'] as $key) {
            $value = $linkage[$key];
            $linkage[$key.'_missing'] = $value === null ? null : max(0, $createdCount - $value);
        }

        $itemSubtotal = null;
        if ($createdIds->isNotEmpty() && Schema::hasTable('order_menus')) {
            $menuColumns = Schema::getColumnListing('order_menus');
            if (count(array_diff(['order_id', 'subtotal'], $menuColumns)) === 0) {
                $itemSubtotal = round((float)DB::table('order_menus')
                    ->whereIn('order_id', $createdIds->all())
                    ->sum('subtotal'), 2);
            }
        }

        return [
            'available' => true,
            'range' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'created_activity_date_basis' => $dateColumn,
                'settled_activity_date_basis' => in_array('settled_at', $orderColumns, true) ? 'settled_at' : $dateColumn,
            ],
            'created_activity' => [
                'orders' => $createdCount,
                'order_total' => $createdTotal,
                'item_subtotal' => $itemSubtotal,
                'processed' => $processed,
                'settlement_states' => $settlementStates,
            ],
            'settled_activity' => [
                'orders' => $settledIds->count(),
                'gross' => $settledGross,
                'tips' => $tips,
                'net_after_tips' => ($settledGross !== null && $tips !== null)
                    ? round($settledGross - $tips, 2)
                    : null,
                'payment_methods' => $paymentMethods,
            ],
            'linkage' => $linkage,
            'source' => 'Read-only reconciliation of PMD order, item, total, status-history and settlement sources for the selected location.',
        ];
    }

    /**
     * Return schedule/attendance counts only. Employee names are intentionally
     * omitted from the AI tool output.
     */
    public function workforceScheduleRange(string $startDate, string $endDate): array
    {
        [$start, $end] = $this->validatedRange($startDate, $endDate, 90, true);
        $locationId = (int)($this->locationId() ?: 0);

        if (
            $locationId < 1
            || !Schema::hasTable('pmd_operational_shifts')
            || !Schema::hasTable('pmd_operational_shift_people')
        ) {
            return ['available' => false, 'reason' => 'Workforce schedule unavailable'];
        }

        $shifts = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereBetween('shift_date', [$start->toDateString(), $end->toDateString()])
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->orderBy('shift_date')
            ->orderBy('starts_at')
            ->limit(100)
            ->get();

        $rows = [];
        foreach ($shifts as $shift) {
            $people = DB::table('pmd_operational_shift_people')
                ->where('shift_id', (int)$shift->id)
                ->get();

            $planned = $people->filter(fn ($row) => empty($row->is_replacement));
            $present = $people->filter(fn ($row) => in_array(
                strtolower(trim((string)$row->attendance_status)),
                ['present', 'replacement'],
                true
            ));

            $plannedKitchen = $planned->filter(fn ($row) => strtolower((string)$row->department_snapshot) === 'kitchen');
            $presentKitchen = $present->filter(fn ($row) => strtolower((string)$row->department_snapshot) === 'kitchen');

            $rows[] = [
                'date' => (string)$shift->shift_date,
                'label' => (string)$shift->label,
                'starts_at' => $shift->starts_at ? substr((string)$shift->starts_at, 0, 5) : null,
                'ends_at' => $shift->ends_at ? substr((string)$shift->ends_at, 0, 5) : null,
                'status' => (string)$shift->status,
                'confirmed' => !empty($shift->confirmed_at) || strtolower((string)$shift->status) === 'confirmed',
                'planned_people' => $planned->count(),
                'present_people' => $present->count(),
                'kitchen_expected' => $plannedKitchen->count(),
                'kitchen_present' => $presentKitchen->count(),
                'kitchen_missing' => max(0, $plannedKitchen->count() - $presentKitchen->count()),
                'planned_roles' => $this->assignmentRoleCounts($planned),
                'present_roles' => $this->assignmentRoleCounts($present),
            ];
        }

        $roster = [];
        if (Schema::hasTable('pmd_operational_people')) {
            $rosterRows = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('is_active', 1)
                ->selectRaw("COALESCE(NULLIF(LOWER(TRIM(department)), ''), 'other') AS department, COUNT(*) AS people")
                ->groupByRaw("COALESCE(NULLIF(LOWER(TRIM(department)), ''), 'other')")
                ->get();
            foreach ($rosterRows as $row) {
                $roster[(string)$row->department] = (int)$row->people;
            }
        }

        return [
            'available' => true,
            'range' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString()],
            'active_roster_by_department' => $roster,
            'shifts' => $rows,
            'source' => 'PMD operational roster and shift assignment counts; employee names omitted.',
        ];
    }

    private function linkedOrderCount(string $table, array $orderIds): ?int
    {
        if (!$orderIds || !Schema::hasTable($table)) return $orderIds ? null : 0;
        $columns = Schema::getColumnListing($table);
        if (!in_array('order_id', $columns, true)) return null;
        return (int)DB::table($table)->whereIn('order_id', $orderIds)->distinct()->count('order_id');
    }

    private function linkedStatusHistoryCount(array $orderIds): ?int
    {
        if (!$orderIds || !Schema::hasTable('status_history')) return $orderIds ? null : 0;
        $columns = Schema::getColumnListing('status_history');
        if (!in_array('object_id', $columns, true)) return null;

        $query = DB::table('status_history')->whereIn('object_id', $orderIds);
        if (in_array('object_type', $columns, true)) {
            $query->where(function ($q) {
                $q->where('object_type', 'like', '%Orders_model%')
                    ->orWhereRaw("LOWER(TRIM(object_type)) = 'orders'");
            });
        }
        return (int)$query->distinct()->count('object_id');
    }

    private function assignmentRoleCounts($rows): array
    {
        $counts = [];
        foreach ($rows as $row) {
            $role = trim((string)($row->job_role_snapshot ?? '')) ?: 'Other';
            $counts[$role] = ($counts[$role] ?? 0) + 1;
        }
        ksort($counts);
        return $counts;
    }

    private function assertReport(string $report, array $allowed): void
    {
        if (!in_array($report, $allowed, true)) {
            throw new InvalidArgumentException('Unsupported PMD report.');
        }
    }

    private function validatedRange(
        string $startDate,
        string $endDate,
        int $maxDays,
        bool $allowFuture
    ): array {
        $timezone = $this->restaurantTimezone();
        $start = $this->parseLocalDate($startDate, $timezone)->startOfDay();
        $end = $this->parseLocalDate($endDate, $timezone)->endOfDay();

        if ($end->lt($start)) {
            throw new InvalidArgumentException(
                'Date range end_date must be on or after start_date.'
            );
        }

        if ($start->diffInDays($end) > $maxDays) {
            throw new InvalidArgumentException('Date range is too large.');
        }

        $now = Carbon::now($timezone);
        if (!$allowFuture && $start->gt($now)) {
            throw new InvalidArgumentException('Historical report start_date cannot be in the future.');
        }
        if (!$allowFuture && $end->gt($now)) {
            $end = $now->copy();
        }

        return [$start, $end];
    }

    private function parseLocalDate(string $value, string $timezone): Carbon
    {
        $value = trim($value);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            throw new InvalidArgumentException('Report dates must use YYYY-MM-DD.');
        }

        try {
            $date = Carbon::createFromFormat('!Y-m-d', $value, $timezone);
        } catch (Throwable $error) {
            throw new InvalidArgumentException('Report date is invalid.');
        }

        if (!$date || $date->format('Y-m-d') !== $value) {
            throw new InvalidArgumentException('Report date is invalid.');
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
