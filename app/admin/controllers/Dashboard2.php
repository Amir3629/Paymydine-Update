<?php

namespace Admin\Controllers;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dashboard2 uses the final Reservations2 page and floor DOM.
 * This controller owns only the eight real owner KPI data sources.
 */
class Dashboard2 extends Reservations2
{
    public function index()
    {
        if ((string)request()->query('pmd_kpis') === '1') {
            return response()->json([
                'ok' => true,
                'generated_at' => Carbon::now()->toIso8601String(),
                'metrics' => $this->buildDashboard2Kpis(),
            ]);
        }

        parent::index();

        $this->vars['pmdDashboard2Kpis'] = $this->buildDashboard2Kpis();

        return $this->makeView('dashboard2_reservations2_exact');
    }

    protected function buildDashboard2Kpis(): array
    {
        $now = Carbon::now();
        $todayStart = $now->copy()->startOfDay();
        $monthStart = $now->copy()->startOfMonth()->startOfDay();

        return [
            'revenue' => $this->safeMetric(
                'revenue', 'Revenue', 'green', 'money',
                function () use ($todayStart, $monthStart, $now) {
                    $today = $this->revenueForRange($todayStart, $now);
                    $month = $this->revenueForRange($monthStart, $now);
                    return [
                        'value' => $this->money($today['value']),
                        'description' => $this->money($month['value']).' this month',
                        'connected' => $today['connected'] && $month['connected'],
                        'source' => $today['source'].'; '.$month['source'],
                    ];
                }
            ),
            'guests' => $this->safeMetric(
                'guests', 'Guests Served', 'purple', 'users',
                function () use ($todayStart, $monthStart, $now) {
                    $today = $this->guestsForRange($todayStart, $now);
                    $month = $this->guestsForRange($monthStart, $now);
                    return [
                        'value' => $today['connected'] ? (string)$today['value'] : '—',
                        'description' => $month['connected']
                            ? $month['value'].' this month'
                            : 'Guest/covers field unavailable',
                        'connected' => $today['connected'] && $month['connected'],
                        'source' => $today['source'].'; '.$month['source'],
                    ];
                }
            ),
            'turnover' => $this->safeMetric(
                'turnover', 'Table Turnover', 'orange', 'timer',
                function () use ($monthStart, $now) {
                    $result = $this->averageTableMinutes($monthStart, $now);
                    return [
                        'value' => $result['connected'] ? $result['value'].' min' : '—',
                        'description' => $result['connected']
                            ? 'Average completed table time this month'
                            : 'Completed table timestamps unavailable',
                        'connected' => $result['connected'],
                        'source' => $result['source'],
                    ];
                }
            ),
            'channels' => $this->safeMetric(
                'channels', 'Dine In / Take Away', 'blue', 'utensils',
                function () use ($todayStart, $now) {
                    $result = $this->serviceMixForRange($todayStart, $now);
                    return [
                        'value' => $result['dine_in'].' / '.$result['takeaway'],
                        'description' => 'Today · dine in / take away',
                        'connected' => $result['connected'],
                        'source' => $result['source'],
                    ];
                }
            ),
            'kitchen' => $this->safeMetric(
                'kitchen', 'Kitchen Ticket Time', 'orange', 'flame',
                function () use ($monthStart, $now) {
                    $result = $this->averageKitchenMinutes($monthStart, $now);
                    return [
                        'value' => $result['connected'] ? $result['value'].' min' : '—',
                        'description' => $result['connected']
                            ? 'Average order to ready/served this month'
                            : 'Ready/served timestamp unavailable',
                        'connected' => $result['connected'],
                        'source' => $result['source'],
                    ];
                }
            ),
            'occupancy' => $this->safeMetric(
                'occupancy', 'Table Occupancy', 'green', 'table',
                function () {
                    $result = $this->tableOccupancy();
                    $percentage = $result['total'] > 0
                        ? round(($result['occupied'] / $result['total']) * 100)
                        : 0;
                    return [
                        'value' => $percentage.'%',
                        'description' => $result['occupied'].' of '.$result['total'].' tables occupied',
                        'connected' => $result['connected'],
                        'source' => $result['source'],
                    ];
                }
            ),
            'menu' => $this->safeMetric(
                'menu', 'Menu Availability', 'red', 'menu',
                function () {
                    $result = $this->menuAvailability();
                    return [
                        'value' => $result['available'].' / '.$result['total'],
                        'description' => 'Available now / total menu items',
                        'connected' => $result['connected'],
                        'source' => $result['source'],
                    ];
                }
            ),
            'tips' => $this->safeMetric(
                'tips', 'Tips', 'green', 'star',
                function () use ($todayStart, $monthStart, $now) {
                    $today = $this->tipsForRange($todayStart, $now);
                    $month = $this->tipsForRange($monthStart, $now);
                    return [
                        'value' => $today['connected'] ? $this->money($today['value']) : '—',
                        'description' => $month['connected']
                            ? $this->money($month['value']).' this month'
                            : 'Tip rows unavailable',
                        'connected' => $today['connected'] && $month['connected'],
                        'source' => $today['source'].'; '.$month['source'],
                    ];
                }
            ),
        ];
    }

    protected function safeMetric(
        string $key,
        string $title,
        string $tone,
        string $icon,
        callable $resolver
    ): array {
        try {
            $resolved = $resolver();
            return array_merge([
                'key' => $key,
                'title' => $title,
                'tone' => $tone,
                'icon' => $icon,
                'value' => '—',
                'description' => 'No data available',
                'connected' => false,
                'source' => 'not detected',
                'error' => null,
            ], is_array($resolved) ? $resolved : []);
        } catch (\Throwable $error) {
            logger()->warning('Dashboard2 KPI failed', [
                'metric' => $key,
                'message' => $error->getMessage(),
                'type' => get_class($error),
            ]);

            return [
                'key' => $key,
                'title' => $title,
                'tone' => $tone,
                'icon' => $icon,
                'value' => '—',
                'description' => 'Data source error',
                'connected' => false,
                'source' => 'runtime error',
                'error' => $error->getMessage(),
            ];
        }
    }

    protected function columns(string $table): array
    {
        return Schema::hasTable($table)
            ? Schema::getColumnListing($table)
            : [];
    }

    protected function firstColumn(array $columns, array $candidates): ?string
    {
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $columns, true)) {
                return $candidate;
            }
        }
        return null;
    }

    protected function q(string $column): string
    {
        return '`'.str_replace('`', '``', $column).'`';
    }

    protected function locationId(): ?int
    {
        try {
            $id = \Admin\Facades\AdminLocation::getId();
            if ($id) return (int)$id;
        } catch (\Throwable $error) {
        }

        $id = session('location_id') ?: session('admin_location_id');
        return $id ? (int)$id : null;
    }

    protected function baseQuery(string $table)
    {
        $query = DB::table($table);
        $columns = $this->columns($table);
        $locationId = $this->locationId();

        if ($locationId && in_array('location_id', $columns, true)) {
            $query->where('location_id', $locationId);
        }

        return $query;
    }

    protected function dateColumn(array $columns): ?string
    {
        return $this->firstColumn($columns, [
            'created_at', 'date_added', 'created', 'created_on',
            'order_date', 'updated_at'
        ]);
    }

    protected function applyRange($query, string $column, Carbon $start, Carbon $end): void
    {
        if (preg_match('/(^|_)date$/', $column) && !preg_match('/_at$/', $column)) {
            $query->whereDate($column, '>=', $start->format('Y-m-d'))
                ->whereDate($column, '<=', $end->format('Y-m-d'));
            return;
        }

        $query->whereBetween($column, [
            $start->format('Y-m-d H:i:s'),
            $end->format('Y-m-d H:i:s'),
        ]);
    }

    protected function statusIds(array $needles): array
    {
        if (!Schema::hasTable('statuses')) return [];

        $columns = $this->columns('statuses');
        $id = $this->firstColumn($columns, ['status_id', 'id']);
        $name = $this->firstColumn($columns, ['status_name', 'name', 'label']);
        if (!$id || !$name) return [];

        $query = DB::table('statuses');
        if (in_array('status_for', $columns, true)) {
            $query->where('status_for', 'order');
        }

        $query->where(function ($builder) use ($name, $needles) {
            foreach ($needles as $index => $needle) {
                $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';
                $builder->{$method}('LOWER('.$this->q($name).') LIKE ?', ['%'.strtolower($needle).'%']);
            }
        });

        return $query->pluck($id)
            ->map(function ($value) { return (int)$value; })
            ->filter()
            ->values()
            ->all();
    }

    protected function revenueForRange(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('orders')) {
            return ['value' => 0.0, 'connected' => false, 'source' => 'orders table missing'];
        }

        $columns = $this->columns('orders');
        $date = $this->dateColumn($columns);
        $settled = $this->firstColumn($columns, ['settled_amount', 'paid_amount']);
        $total = $this->firstColumn($columns, ['order_total', 'total', 'total_amount', 'grand_total']);
        if (!$date || (!$settled && !$total)) {
            return ['value' => 0.0, 'connected' => false, 'source' => 'orders date/total column missing'];
        }

        $query = $this->baseQuery('orders');
        $this->applyRange($query, $date, $start, $end);

        if (in_array('processed', $columns, true)) {
            $query->where('processed', 1);
        }

        $status = $this->firstColumn($columns, ['status_id', 'order_status_id']);
        $excluded = $this->statusIds(['cancel', 'refund', 'failed']);
        if ($status && $excluded) {
            $query->whereNotIn($status, $excluded);
        }

        if (in_array('settlement_status', $columns, true)) {
            $query->whereRaw(
                "LOWER(COALESCE(".$this->q('settlement_status').", '')) NOT IN ('cancelled','canceled','failed','refunded')"
            );
        }

        if ($settled && $total) {
            $expression = 'CASE WHEN COALESCE('.$this->q($settled).',0) > 0 THEN '
                .$this->q($settled).' ELSE COALESCE('.$this->q($total).',0) END';
            $sourceColumn = $settled.' with '.$total.' fallback';
        } elseif ($settled) {
            $expression = 'COALESCE('.$this->q($settled).',0)';
            $sourceColumn = $settled;
        } else {
            $expression = 'COALESCE('.$this->q($total).',0)';
            $sourceColumn = $total;
        }

        $sum = $query
            ->selectRaw('COALESCE(SUM('.$expression.'),0) AS aggregate')
            ->value('aggregate');

        return [
            'value' => (float)($sum ?: 0),
            'connected' => true,
            'source' => 'orders '.$sourceColumn.' grouped by '.$date,
        ];
    }

    protected function guestsForRange(Carbon $start, Carbon $end): array
    {
        if (Schema::hasTable('orders')) {
            $columns = $this->columns('orders');
            $guest = $this->firstColumn($columns, ['guest_num', 'guest_count', 'guests', 'covers', 'party_size']);
            $date = $this->dateColumn($columns);
            if ($guest && $date) {
                $query = $this->baseQuery('orders');
                $this->applyRange($query, $date, $start, $end);
                if (in_array('processed', $columns, true)) $query->where('processed', 1);
                return [
                    'value' => (int)round((float)($query->sum($guest) ?: 0)),
                    'connected' => true,
                    'source' => 'orders.'.$guest.' grouped by '.$date,
                ];
            }
        }

        return [
            'value' => 0,
            'connected' => false,
            'source' => 'no served guest/covers column on orders',
        ];
    }

    protected function averageTableMinutes(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('orders')) {
            return ['value' => 0, 'connected' => false, 'source' => 'orders table missing'];
        }

        $columns = $this->columns('orders');
        $opened = $this->firstColumn($columns, ['opened_at', 'seated_at', 'created_at', 'date_added']);
        $closed = $this->firstColumn($columns, ['settled_at', 'closed_at', 'completed_at', 'status_updated_at']);
        $date = $this->dateColumn($columns);
        $type = $this->firstColumn($columns, ['order_type', 'service_type', 'type']);

        if (!$opened || !$closed || !$date) {
            return ['value' => 0, 'connected' => false, 'source' => 'opened/closed order timestamps missing'];
        }

        $query = $this->baseQuery('orders');
        $this->applyRange($query, $date, $start, $end);
        $query->whereNotNull($opened)->whereNotNull($closed);

        if ($type) {
            $qt = $this->q($type);
            $query->whereRaw(
                "(CAST($qt AS CHAR) REGEXP '^[0-9]+$' OR LOWER(COALESCE($qt,'')) REGEXP 'table|dine[ _-]?in|restaurant|eat[ _-]?in')"
            );
        }

        $qo = $this->q($opened);
        $qc = $this->q($closed);
        $average = $query
            ->whereRaw($qc.' > '.$qo)
            ->whereRaw('TIMESTAMPDIFF(MINUTE, '.$qo.', '.$qc.') BETWEEN 1 AND 720')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, '.$qo.', '.$qc.')) AS average_minutes')
            ->value('average_minutes');

        return $average === null
            ? ['value' => 0, 'connected' => false, 'source' => 'no completed dine-in orders in selected month']
            : ['value' => (int)round((float)$average), 'connected' => true, 'source' => 'orders '.$opened.' -> '.$closed];
    }

    protected function serviceMixForRange(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('orders')) {
            return ['dine_in' => 0, 'takeaway' => 0, 'connected' => false, 'source' => 'orders table missing'];
        }

        $columns = $this->columns('orders');
        $type = $this->firstColumn($columns, ['order_type', 'service_type', 'type']);
        $date = $this->dateColumn($columns);
        if (!$type || !$date) {
            return ['dine_in' => 0, 'takeaway' => 0, 'connected' => false, 'source' => 'order type/date column missing'];
        }

        $query = $this->baseQuery('orders');
        $this->applyRange($query, $date, $start, $end);

        $dineIn = 0;
        $takeAway = 0;
        foreach ($query->pluck($type) as $value) {
            $normalized = strtolower(trim((string)$value));
            if (
                preg_match('/^\d+$/', $normalized)
                || preg_match('/table\s*\d+/', $normalized)
                || preg_match('/dine[ _-]?in|restaurant|eat[ _-]?in/', $normalized)
            ) {
                $dineIn++;
            } elseif (preg_match('/take[ _-]?away|pickup|pick-up|collection/', $normalized)) {
                $takeAway++;
            }
        }

        return [
            'dine_in' => $dineIn,
            'takeaway' => $takeAway,
            'connected' => true,
            'source' => 'orders.'.$type.' grouped by '.$date,
        ];
    }

    protected function averageKitchenMinutes(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('orders')) {
            return ['value' => 0, 'connected' => false, 'source' => 'orders table missing'];
        }

        $orderColumns = $this->columns('orders');
        $id = $this->firstColumn($orderColumns, ['order_id', 'id']);
        $created = $this->dateColumn($orderColumns);
        if (!$id || !$created) {
            return ['value' => 0, 'connected' => false, 'source' => 'order id/start timestamp missing'];
        }

        $servedIds = $this->statusIds(['ready', 'served', 'delivery', 'complete']);
        if ($servedIds && Schema::hasTable('status_history')) {
            $historyColumns = $this->columns('status_history');
            $objectId = $this->firstColumn($historyColumns, ['object_id', 'order_id']);
            $historyStatus = $this->firstColumn($historyColumns, ['status_id']);
            $historyDate = $this->firstColumn($historyColumns, ['created_at', 'date_added']);

            if ($objectId && $historyStatus && $historyDate) {
                $orders = $this->baseQuery('orders');
                $this->applyRange($orders, $created, $start, $end);
                $rows = $orders->select([$id.' as pmd_id', $created.' as pmd_started'])->limit(3000)->get();
                $ids = $rows->pluck('pmd_id')->map(function ($value) { return (int)$value; })->filter()->values();

                if ($ids->isNotEmpty()) {
                    $historyQuery = DB::table('status_history')
                        ->select([$objectId, $historyDate])
                        ->whereIn($objectId, $ids->all())
                        ->whereIn($historyStatus, $servedIds);

                    if (in_array('object_type', $historyColumns, true)) {
                        $historyQuery->where('object_type', 'like', '%Orders_model%');
                    }

                    $history = $historyQuery
                        ->orderBy($historyDate)
                        ->get()
                        ->groupBy($objectId);

                    $durations = [];
                    foreach ($rows as $order) {
                        $matches = $history->get((int)$order->pmd_id);
                        $first = $matches ? $matches->first() : null;
                        if (!$first || !$order->pmd_started) continue;
                        $endValue = $first->{$historyDate} ?? null;
                        if (!$endValue) continue;
                        $minutes = Carbon::parse($order->pmd_started)
                            ->diffInMinutes(Carbon::parse($endValue), false);
                        if ($minutes >= 1 && $minutes <= 240) $durations[] = $minutes;
                    }

                    if ($durations) {
                        return [
                            'value' => (int)round(array_sum($durations) / count($durations)),
                            'connected' => true,
                            'source' => 'orders.'.$created.' -> status_history.'.$historyDate.' ready/served status',
                        ];
                    }
                }
            }
        }

        $finished = $this->firstColumn($orderColumns, ['served_at', 'ready_at', 'completed_at', 'settled_at']);
        if ($finished) {
            $query = $this->baseQuery('orders');
            $this->applyRange($query, $created, $start, $end);
            $qc = $this->q($created);
            $qf = $this->q($finished);
            $average = $query
                ->whereNotNull($finished)
                ->whereRaw($qf.' > '.$qc)
                ->whereRaw('TIMESTAMPDIFF(MINUTE, '.$qc.', '.$qf.') BETWEEN 1 AND 240')
                ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, '.$qc.', '.$qf.')) AS average_minutes')
                ->value('average_minutes');
            if ($average !== null) {
                return [
                    'value' => (int)round((float)$average),
                    'connected' => true,
                    'source' => 'orders.'.$created.' -> '.$finished,
                ];
            }
        }

        return ['value' => 0, 'connected' => false, 'source' => 'no ready/served timestamp records'];
    }

    protected function tableOccupancy(): array
    {
        if (!Schema::hasTable('tables')) {
            return ['occupied' => 0, 'total' => 0, 'connected' => false, 'source' => 'tables table missing'];
        }

        $tableColumns = $this->columns('tables');
        $tableId = $this->firstColumn($tableColumns, ['table_id', 'id']);
        if (!$tableId) {
            return ['occupied' => 0, 'total' => 0, 'connected' => false, 'source' => 'table primary key missing'];
        }

        $tables = $this->baseQuery('tables');
        if (in_array('table_status', $tableColumns, true)) $tables->where('table_status', 1);
        if (in_array('visible_on_floor_plan', $tableColumns, true)) $tables->where('visible_on_floor_plan', 1);

        $tableNo = $this->firstColumn($tableColumns, ['table_no', 'table_number', 'number']);
        if ($tableNo) $tables->where($tableNo, '>', 0);

        $tableIds = $tables->pluck($tableId)
            ->map(function ($value) { return (int)$value; })
            ->filter()->unique()->values();

        if ($tableIds->isEmpty()) {
            return ['occupied' => 0, 'total' => 0, 'connected' => true, 'source' => 'tables current visible rows'];
        }

        if (!Schema::hasTable('orders')) {
            return ['occupied' => 0, 'total' => $tableIds->count(), 'connected' => false, 'source' => 'orders table missing'];
        }

        $orderColumns = $this->columns('orders');
        $tableRef = $this->firstColumn($orderColumns, ['table_id', 'location_table_id', 'order_type']);
        if (!$tableRef) {
            return ['occupied' => 0, 'total' => $tableIds->count(), 'connected' => false, 'source' => 'order table reference missing'];
        }

        $orders = $this->baseQuery('orders');
        $status = $this->firstColumn($orderColumns, ['status_id', 'order_status_id']);
        $closed = $this->statusIds(['paid', 'complete', 'closed', 'cancel', 'refund', 'delivery']);
        if ($status) {
            $orders->where($status, '>', 0);
            if ($closed) $orders->whereNotIn($status, $closed);
        }
        if (in_array('settlement_status', $orderColumns, true)) {
            $orders->whereRaw(
                "LOWER(COALESCE(".$this->q('settlement_status').", '')) NOT IN ('paid','settled','closed','cancelled','canceled','refunded')"
            );
        }

        $valid = array_flip($tableIds->all());
        $occupied = [];
        foreach ($orders->pluck($tableRef) as $reference) {
            $text = trim((string)$reference);
            $resolved = ctype_digit($text)
                ? (int)$text
                : (preg_match('/(?:table\s*)?(\d+)/i', $text, $match) ? (int)$match[1] : 0);
            if ($resolved > 0 && isset($valid[$resolved])) $occupied[$resolved] = true;
        }

        return [
            'occupied' => count($occupied),
            'total' => $tableIds->count(),
            'connected' => true,
            'source' => 'open orders matched to current visible tables',
        ];
    }

    protected function menuAvailability(): array
    {
        if (!Schema::hasTable('menus')) {
            return ['available' => 0, 'total' => 0, 'connected' => false, 'source' => 'menus table missing'];
        }

        $columns = $this->columns('menus');
        $total = $this->baseQuery('menus');
        $available = $this->baseQuery('menus');
        if (in_array('menu_status', $columns, true)) $available->where('menu_status', 1);
        if (in_array('is_stock_out', $columns, true)) {
            $available->where(function ($query) {
                $query->whereNull('is_stock_out')->orWhere('is_stock_out', 0);
            });
        }

        return [
            'available' => (int)$available->count(),
            'total' => (int)$total->count(),
            'connected' => true,
            'source' => 'menus.menu_status and menus.is_stock_out',
        ];
    }

    protected function tipsForRange(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('order_totals') || !Schema::hasTable('orders')) {
            return ['value' => 0.0, 'connected' => false, 'source' => 'orders/order_totals table missing'];
        }

        $totalsColumns = $this->columns('order_totals');
        $orderColumns = $this->columns('orders');
        $totalOrderId = $this->firstColumn($totalsColumns, ['order_id']);
        $code = $this->firstColumn($totalsColumns, ['code']);
        $value = $this->firstColumn($totalsColumns, ['value', 'amount', 'total']);
        $orderId = $this->firstColumn($orderColumns, ['order_id', 'id']);
        $date = $this->dateColumn($orderColumns);

        if (!$totalOrderId || !$code || !$value || !$orderId || !$date) {
            return ['value' => 0.0, 'connected' => false, 'source' => 'tip/order relation columns missing'];
        }

        $query = DB::table('order_totals as ot')
            ->join('orders as o', 'ot.'.$totalOrderId, '=', 'o.'.$orderId)
            ->whereRaw("LOWER(COALESCE(ot.".$this->q($code).", '')) = 'tip'");

        if (preg_match('/(^|_)date$/', $date) && !preg_match('/_at$/', $date)) {
            $query->whereDate('o.'.$date, '>=', $start->format('Y-m-d'))
                ->whereDate('o.'.$date, '<=', $end->format('Y-m-d'));
        } else {
            $query->whereBetween('o.'.$date, [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ]);
        }

        $locationId = $this->locationId();
        if ($locationId && in_array('location_id', $orderColumns, true)) {
            $query->where('o.location_id', $locationId);
        }

        $sum = $query
            ->selectRaw('COALESCE(SUM(CAST(ot.'.$this->q($value).' AS DECIMAL(15,2))),0) AS aggregate')
            ->value('aggregate');

        return [
            'value' => (float)($sum ?: 0),
            'connected' => true,
            'source' => 'order_totals code=tip joined to orders.'.$date,
        ];
    }

    protected function money(float $value): string
    {
        return '€'.number_format($value, 2, '.', ',');
    }
}
