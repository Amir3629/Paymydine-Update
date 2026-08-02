<?php

namespace Admin\Controllers;

use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Tables_model;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Aggregate-only data authority for the Dashboard2 owner KPIs.
 *
 * Orders are location-owned rows. Menus and tables use PayMyDine's
 * Locationable relation, so their model scopes must be used instead of an
 * assumed location_id column.
 */
class Dashboard2 extends Reservations2
{
    private const VERSION = '3.0.0';

    public function index()
    {
        if ((string)request()->query('pmd_analytics') === '1') {
            return response()->json($this->analyticsPayload((string)request()->query('period', 'today')));
        }

        if ((string)request()->query('pmd_kpis') === '1') {
            return response()->json($this->kpiPayload());
        }

        parent::index();
        // The browser performs exactly one aggregate request. Do not execute
        // the same eight queries again while rendering the HTML shell.
        $this->vars['pmdDashboard2Kpis'] = $this->cards([], $this->currency());
        $this->vars['pmdDashboard2KpiPayload'] = null;

        return $this->makeView('dashboard2_reservations2_exact');
    }

    protected function kpiPayload(): array
    {
        $timezone = $this->restaurantTimezone();
        $currency = $this->currency();
        $now = Carbon::now($timezone);
        $periods = [
            'today' => [$now->copy()->startOfDay(), $now->copy()],
            'month' => [$now->copy()->startOfMonth(), $now->copy()],
        ];

        $kpis = [
            'revenue' => $this->twoPeriods(fn ($start, $end) => $this->revenue($start, $end), $periods),
            'guests' => $this->twoPeriods(fn ($start, $end) => $this->guests($start, $end), $periods),
            'turnover' => $this->twoPeriods(fn ($start, $end) => $this->turnover($start, $end), $periods),
            'channels' => $this->twoPeriods(fn ($start, $end) => $this->channels($start, $end), $periods),
            'kitchen' => $this->twoPeriods(fn ($start, $end) => $this->kitchenTime($start, $end), $periods),
            'occupancy' => $this->occupancy(),
            'menu' => $this->menuAvailability(),
            'tips' => $this->twoPeriods(fn ($start, $end) => $this->tips($start, $end), $periods),
        ];

        return [
            'success' => true,
            'ok' => true,
            'version' => self::VERSION,
            'endpoint' => '/admin/dashboard2?pmd_kpis=1',
            'timezone' => $timezone,
            'currency' => $currency['code'],
            'currency_symbol' => $currency['symbol'],
            'generated_at' => $now->toIso8601String(),
            'periods' => [
                'today' => $this->periodContract($periods['today']),
                'month' => $this->periodContract($periods['month']),
            ],
            'kpis' => $kpis,
            'cards' => $this->cards($kpis, $currency),
        ];
    }

    protected function twoPeriods(callable $resolver, array $periods): array
    {
        return [
            'today' => $this->safeAggregate(fn () => $resolver(...$periods['today'])),
            'month' => $this->safeAggregate(fn () => $resolver(...$periods['month'])),
        ];
    }

    protected function safeAggregate(callable $resolver): array
    {
        try {
            return $resolver();
        } catch (\Throwable $error) {
            logger()->warning('Dashboard2 KPI aggregate failed', [
                'message' => $error->getMessage(),
                'type' => get_class($error),
                'location_id' => $this->locationId(),
            ]);

            return [
                'available' => false,
                'value' => null,
                'sample_count' => 0,
                'source' => 'runtime query error',
                'reason' => 'Source unavailable',
            ];
        }
    }

    protected function periodContract(array $period): array
    {
        return ['start' => $period[0]->toIso8601String(), 'end' => $period[1]->toIso8601String()];
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

    protected function restaurantTimezone(): string
    {
        $timezone = (string)setting('timezone', config('app.timezone', 'UTC'));
        return in_array($timezone, timezone_identifiers_list(), true) ? $timezone : 'UTC';
    }

    protected function currency(): array
    {
        $code = strtoupper((string)setting('default_currency_code', ''));
        $row = null;
        if ($code !== '' && Schema::hasTable('currencies')) {
            $row = DB::table('currencies')->where('currency_code', $code)->first();
        }

        return [
            'code' => $row && $row->currency_code ? (string)$row->currency_code : ($code ?: 'EUR'),
            'symbol' => $row && $row->currency_symbol ? (string)$row->currency_symbol : ($code === 'EUR' ? '€' : $code.' '),
        ];
    }

    protected function columns(string $table): array
    {
        return Schema::hasTable($table) ? Schema::getColumnListing($table) : [];
    }

    protected function hasColumns(string $table, array $columns): bool
    {
        $actual = $this->columns($table);
        return count(array_diff($columns, $actual)) === 0;
    }

    protected function firstColumn(array $columns, array $candidates): ?string
    {
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $columns, true)) return $candidate;
        }
        return null;
    }

    protected function orders(): Builder
    {
        $query = DB::table('orders');
        $locationId = $this->locationId();
        // No location means no safe tenant aggregate; never fall back to all rows.
        if (!$locationId) return $query->whereRaw('1 = 0');
        return $query->where('location_id', $locationId);
    }

    protected function range(Builder $query, string $column, Carbon $start, Carbon $end): Builder
    {
        return $query->whereBetween($column, [
            $start->format('Y-m-d H:i:s'),
            $end->format('Y-m-d H:i:s'),
        ]);
    }

    protected function eligiblePaidOrders(Carbon $start, Carbon $end): Builder
    {
        $query = $this->range($this->orders(), 'settled_at', $start, $end)
            ->where('processed', 1)
            ->whereNotNull('settled_at')
            ->where('settled_amount', '>=', 0);

        $query->whereIn(DB::raw('LOWER(settlement_status)'), ['paid', 'settled']);
        if ($this->hasColumns('statuses', ['status_id', 'status_name']) && Schema::hasColumn('orders', 'status_id')) {
            $query->whereNotExists(function ($excluded) {
                $excluded->selectRaw('1')->from('statuses as pmd_status')
                    ->whereColumn('pmd_status.status_id', 'orders.status_id')
                    ->whereRaw("LOWER(pmd_status.status_name) REGEXP 'cancel|refund|failed|void'");
            });
        }

        return $query;
    }

    protected function unavailable(string $source, string $reason = 'Source unavailable'): array
    {
        return compact('source', 'reason') + ['available' => false, 'value' => null, 'sample_count' => 0];
    }

    protected function revenue(Carbon $start, Carbon $end): array
    {
        if (!$this->locationId()) return $this->unavailable('authenticated admin location missing');
        if (!$this->hasColumns('orders', ['order_id', 'location_id', 'processed', 'settlement_status', 'settled_amount', 'settled_at'])) {
            return $this->unavailable('orders settlement fields missing');
        }

        $tips = $this->tipSubquery();
        $query = $this->eligiblePaidOrders($start, $end);
        if ($tips) {
            $query->leftJoinSub($tips, 'pmd_tips', 'orders.order_id', '=', 'pmd_tips.order_id');
        }
        $tipExpression = $tips ? 'COALESCE(pmd_tips.tip_amount, 0)' : '0';
        $row = $query->selectRaw(
            'COUNT(*) AS samples, COALESCE(SUM(GREATEST(orders.settled_amount - '.$tipExpression.', 0)), 0) AS aggregate'
        )->first();

        return [
            'available' => true,
            'value' => (float)$row->aggregate,
            'sample_count' => (int)$row->samples,
            'source' => 'paid orders.settled_amount minus order_totals.tip, grouped by orders.settled_at',
            'reason' => null,
        ];
    }

    protected function guests(Carbon $start, Carbon $end): array
    {
        if (!$this->locationId()) return $this->unavailable('authenticated admin location missing');
        $columns = $this->columns('orders');
        $guest = $this->firstColumn($columns, ['guest_num', 'guest_count', 'covers', 'party_size']);
        if (!$guest || !$this->hasColumns('orders', ['settled_at', 'order_type', 'location_id'])) {
            return $this->unavailable(
                'orders served-cover field missing',
                'Source unavailable: no served cover/guest column is stored on orders'
            );
        }

        $row = $this->dineIn($this->eligiblePaidOrders($start, $end))
            ->where($guest, '>', 0)
            ->selectRaw('COUNT(*) AS samples, COALESCE(SUM('.$guest.'), 0) AS aggregate')
            ->first();

        return ['available' => true, 'value' => (int)$row->aggregate, 'sample_count' => (int)$row->samples,
            'source' => 'paid dine-in orders.'.$guest.' grouped by settled_at', 'reason' => null];
    }

    protected function turnover(Carbon $start, Carbon $end): array
    {
        if (!$this->locationId()) return $this->unavailable('authenticated admin location missing');
        $history = $this->tableTurnoverFromStateHistory($start, $end);
        if ($history !== null) return $history;
        if (!$this->hasColumns('orders', ['created_at', 'settled_at', 'order_type', 'location_id'])) {
            return $this->unavailable('orders.created_at/settled_at/order_type missing');
        }
        $query = $this->dineIn($this->eligiblePaidOrders($start, $end))
            ->whereRaw('settled_at > created_at')
            ->whereRaw('TIMESTAMPDIFF(MINUTE, created_at, settled_at) BETWEEN 1 AND 720');
        $row = $query->selectRaw(
            'COUNT(*) AS samples, AVG(TIMESTAMPDIFF(SECOND, created_at, settled_at)) / 60 AS aggregate'
        )->first();

        return ['available' => true, 'value' => $row->aggregate === null ? null : round((float)$row->aggregate, 1),
            'sample_count' => (int)$row->samples, 'source' => 'paid dine-in orders created_at -> settled_at (1-720 min)',
            'reason' => $row->samples ? null : 'No completed table visits'];
    }

    protected function tableTurnoverFromStateHistory(Carbon $start, Carbon $end): ?array
    {
        if (!$this->hasColumns('pmd_table_status_history', ['id', 'table_id', 'new_status', 'created_at']) ||
            !Schema::hasTable('tables')) return null;
        $tableIds = Tables_model::query()->whereHasLocation($this->locationId())->isEnabled()
            ->pluck('table_id')->map(fn ($id) => (int)$id)->all();
        if (!$tableIds) {
            return ['available' => true, 'value' => null, 'sample_count' => 0,
                'source' => 'pmd_table_status_history occupied -> cleaning/available', 'reason' => 'No completed table visits'];
        }

        $closures = DB::table('pmd_table_status_history as opened')
            ->join('pmd_table_status_history as closed', function ($join) {
                $join->on('closed.table_id', '=', 'opened.table_id')
                    ->whereColumn('closed.created_at', '>', 'opened.created_at')
                    ->whereIn('closed.new_status', ['cleaning', 'available']);
            })
            ->where('opened.new_status', 'occupied')
            ->whereIn('opened.table_id', $tableIds)
            ->groupBy('opened.id', 'opened.created_at')
            ->selectRaw('opened.id, opened.created_at AS opened_at, MIN(closed.created_at) AS closed_at');

        $row = DB::query()->fromSub($closures, 'visits')
            ->whereBetween('closed_at', [$start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s')])
            ->whereRaw('TIMESTAMPDIFF(MINUTE, opened_at, closed_at) BETWEEN 1 AND 720')
            ->selectRaw('COUNT(*) AS samples, AVG(TIMESTAMPDIFF(SECOND, opened_at, closed_at)) / 60 AS aggregate')
            ->first();

        return ['available' => true, 'value' => $row->aggregate === null ? null : round((float)$row->aggregate, 1),
            'sample_count' => (int)$row->samples,
            'source' => 'pmd_table_status_history occupied -> first cleaning/available (1-720 min)',
            'reason' => $row->samples ? null : 'No completed table visits'];
    }

    protected function channels(Carbon $start, Carbon $end): array
    {
        if (!$this->locationId()) return $this->unavailable('authenticated admin location missing');
        if (!$this->hasColumns('orders', ['order_type', 'settled_at', 'location_id'])) {
            return $this->unavailable('orders.order_type/settled_at missing');
        }
        $row = $this->eligiblePaidOrders($start, $end)->selectRaw(
            "SUM(CASE WHEN LOWER(TRIM(order_type)) NOT IN ('delivery','collection','takeaway','take-away','pickup','cashier') THEN 1 ELSE 0 END) AS dine_in, ".
            "SUM(CASE WHEN LOWER(TRIM(order_type)) IN ('collection','takeaway','take-away','pickup') THEN 1 ELSE 0 END) AS takeaway"
        )->first();

        return ['available' => true, 'value' => ['dine_in' => (int)$row->dine_in, 'takeaway' => (int)$row->takeaway],
            'sample_count' => (int)$row->dine_in + (int)$row->takeaway,
            'source' => 'paid orders.order_type; delivery and cashier excluded', 'reason' => null];
    }

    protected function dineIn(Builder $query): Builder
    {
        return $query->whereNotIn(DB::raw('LOWER(TRIM(order_type))'), [
            'delivery', 'collection', 'takeaway', 'take-away', 'pickup', 'cashier',
        ]);
    }

    protected function kitchenTime(Carbon $start, Carbon $end): array
    {
        if (!$this->locationId()) return $this->unavailable('authenticated admin location missing');
        if (!$this->hasColumns('orders', ['order_id', 'created_at', 'location_id']) ||
            !$this->hasColumns('status_history', ['object_id', 'status_id', 'created_at']) ||
            !$this->hasColumns('statuses', ['status_id', 'status_name'])) {
            return $this->unavailable('orders/status_history ready timestamp relation missing');
        }

        $timestamps = DB::table('status_history as sh')
            ->join('statuses as s', 's.status_id', '=', 'sh.status_id')
            ->whereRaw("LOWER(s.status_name) REGEXP 'received|preparation|ready|served|delivery'")
            ->when(in_array('status_for', $this->columns('statuses'), true), function ($query) {
                $query->where('s.status_for', 'order');
            })
            ->when(in_array('object_type', $this->columns('status_history'), true), function ($query) {
                $query->where('sh.object_type', Orders_model::make()->getMorphClass());
            })
            ->groupBy('sh.object_id')
            ->selectRaw("sh.object_id, ".
                "MIN(CASE WHEN LOWER(s.status_name) REGEXP 'received|preparation' THEN sh.created_at END) AS kitchen_at, ".
                "MIN(CASE WHEN LOWER(s.status_name) REGEXP 'ready|served|delivery' THEN sh.created_at END) AS ready_at");

        $row = $this->orders()
            ->joinSub($timestamps, 'pmd_kds', 'orders.order_id', '=', 'pmd_kds.object_id')
            ->whereBetween('pmd_kds.kitchen_at', [$start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s')])
            ->whereRaw('pmd_kds.ready_at > pmd_kds.kitchen_at')
            ->whereRaw('TIMESTAMPDIFF(MINUTE, pmd_kds.kitchen_at, pmd_kds.ready_at) BETWEEN 1 AND 240')
            ->selectRaw('COUNT(*) AS samples, AVG(TIMESTAMPDIFF(SECOND, pmd_kds.kitchen_at, pmd_kds.ready_at)) / 60 AS aggregate')
            ->first();

        return ['available' => true, 'value' => $row->aggregate === null ? null : round((float)$row->aggregate, 1),
            'sample_count' => (int)$row->samples,
            'source' => 'first Received/Preparation -> first Ready/Served/Delivery status history (1-240 min)',
            'reason' => $row->samples ? null : 'No completed kitchen tickets'];
    }

    protected function occupancy(): array
    {
        $locationId = $this->locationId();
        if (!$locationId || !Schema::hasTable('tables') || !Schema::hasTable('orders')) {
            return $this->unavailable('location-scoped tables/open orders unavailable');
        }
        $tables = Tables_model::query()->whereHasLocation($locationId)->isEnabled();
        if (Schema::hasColumn('tables', 'visible_on_floor_plan')) $tables->where('visible_on_floor_plan', 1);
        $rows = $tables->get(['table_id', 'table_no', 'table_name', 'operational_status']);
        $total = $rows->count();
        $occupiedIds = $rows
            ->filter(fn ($table) => strtolower((string)$table->operational_status) === 'occupied')
            ->pluck('table_id')->map(fn ($id) => (int)$id)->flip()->all();
        if ($total && $this->hasColumns('orders', ['order_type', 'location_id', 'settlement_status'])) {
            $references = $this->orders()
                ->whereNotIn(DB::raw('LOWER(settlement_status)'), ['paid', 'settled', 'closed', 'cancelled', 'canceled', 'refunded'])
                ->pluck('order_type');
            $referenceMap = [];
            foreach ($rows as $table) {
                foreach ([$table->table_id, $table->table_no, $table->table_name, 'Table '.$table->table_no] as $reference) {
                    $normalized = strtolower(trim((string)$reference));
                    if ($normalized !== '') $referenceMap[$normalized] = (int)$table->table_id;
                }
            }
            foreach ($references as $reference) {
                $normalized = strtolower(trim((string)$reference));
                if (isset($referenceMap[$normalized])) $occupiedIds[$referenceMap[$normalized]] = true;
            }
        }
        $occupied = count($occupiedIds);

        return ['available' => true, 'value' => $total ? round($occupied / $total * 100) : 0,
            'occupied_tables' => $occupied, 'available_tables' => $total, 'sample_count' => $total,
            'source' => 'enabled visible location tables; operational_status occupied plus unique active-order table references', 'reason' => null];
    }

    protected function menuAvailability(): array
    {
        $locationId = $this->locationId();
        if (!$locationId || !Schema::hasTable('menus')) return $this->unavailable('location-scoped menus unavailable');
        $total = Menus_model::query()->whereHasOrDoesntHaveLocation($locationId)->count();
        $available = Menus_model::query()->whereHasOrDoesntHaveLocation($locationId)->isEnabled();
        if (Schema::hasColumn('menus', 'is_stock_out')) $available->inStock();

        return ['available' => true, 'value' => ['available_now' => (int)$available->count(), 'total' => (int)$total],
            'sample_count' => (int)$total, 'source' => 'customer menu scope: location/global, enabled, in stock', 'reason' => null];
    }

    protected function tipSubquery(): ?Builder
    {
        if (!$this->hasColumns('order_totals', ['order_id', 'code', 'value'])) return null;
        return DB::table('order_totals')->whereRaw("LOWER(code) = 'tip'")
            ->groupBy('order_id')->selectRaw('order_id, SUM(value) AS tip_amount');
    }

    protected function tips(Carbon $start, Carbon $end): array
    {
        if (!$this->locationId()) return $this->unavailable('authenticated admin location missing');
        $tips = $this->tipSubquery();
        if (!$tips || !$this->hasColumns('orders', ['order_id', 'settled_at', 'location_id'])) {
            return $this->unavailable('order_totals.code=tip relation missing');
        }
        $row = $this->eligiblePaidOrders($start, $end)
            ->joinSub($tips, 'pmd_tips', 'orders.order_id', '=', 'pmd_tips.order_id')
            ->selectRaw('COUNT(*) AS samples, COALESCE(SUM(pmd_tips.tip_amount), 0) AS aggregate')->first();

        return ['available' => true, 'value' => (float)$row->aggregate, 'sample_count' => (int)$row->samples,
            'source' => 'order_totals.code=tip joined once per paid order, grouped by orders.settled_at', 'reason' => null];
    }

    protected function analyticsPayload(string $requestedPeriod): array
    {
        $period = in_array($requestedPeriod, ['today', 'week', 'month'], true) ? $requestedPeriod : 'today';
        $timezone = $this->restaurantTimezone();
        $currency = $this->currency();
        $now = Carbon::now($timezone);
        $start = $period === 'month' ? $now->copy()->startOfMonth()
            : ($period === 'week' ? $now->copy()->startOfWeek() : $now->copy()->startOfDay());

        if (!$this->locationId()) {
            return ['success' => false, 'version' => '1.0.0', 'period' => $period,
                'timezone' => $timezone, 'currency' => $currency['code'], 'reason' => 'Authenticated admin location unavailable'];
        }

        return [
            'success' => true,
            'version' => '1.0.0',
            'timezone' => $timezone,
            'timezone_source' => "setting('timezone')",
            'currency' => $currency['code'],
            'currency_symbol' => $currency['symbol'],
            'generated_at' => $now->toIso8601String(),
            'period' => $period,
            'range' => ['start' => $start->toIso8601String(), 'end' => $now->toIso8601String()],
            'sales_over_time' => $this->safeAnalytics(fn () => $this->analyticsSalesSeries($start, $now, $period)),
            'sales_by_hour' => $this->safeAnalytics(fn () => $this->analyticsSalesByHour($start, $now)),
            'top_items' => $this->safeAnalytics(fn () => $this->analyticsTopItems($start, $now)),
            'sales_by_category' => $this->safeAnalytics(fn () => $this->analyticsCategorySales($start, $now)),
            'payment_methods' => $this->safeAnalytics(fn () => $this->analyticsPaymentMethods($start, $now)),
            'channels' => $this->safeAnalytics(fn () => $this->analyticsChannels($start, $now)),
            'live_operations' => $this->safeAnalytics(fn () => $this->analyticsLiveOperations($now)),
            'recent_transactions' => $this->safeAnalytics(fn () => $this->analyticsTransactions()),
            'alerts' => $this->safeAnalytics(fn () => $this->analyticsAlerts($start, $now)),
            'reviews' => $this->safeAnalytics(fn () => $this->analyticsReviews()),
            'tips' => $this->safeAnalytics(fn () => $this->analyticsTips($start, $now)),
            'calendar_events' => $this->safeAnalytics(fn () => $this->analyticsCalendarEvents($now)),
        ];
    }

    protected function safeAnalytics(callable $resolver): array
    {
        try {
            return $resolver();
        } catch (\Throwable $error) {
            logger()->warning('Dashboard2 analytics source failed', [
                'type' => get_class($error),
                'location_id' => $this->locationId(),
            ]);
            return $this->unavailable('Analytics source unavailable');
        }
    }

    protected function analyticsPaidQuery(Carbon $start, Carbon $end): Builder
    {
        $query = $this->eligiblePaidOrders($start, $end);
        $tips = $this->tipSubquery();
        if ($tips) $query->leftJoinSub($tips, 'analytics_tips', 'orders.order_id', '=', 'analytics_tips.order_id');
        return $query->selectRaw('orders.*, GREATEST(orders.settled_amount - '.($tips ? 'COALESCE(analytics_tips.tip_amount,0)' : '0').',0) AS net_revenue');
    }

    protected function analyticsSalesSeries(Carbon $start, Carbon $end, string $period): array
    {
        if (!$this->hasColumns('orders', ['settled_at', 'settled_amount'])) return $this->unavailable('paid order settlement source missing');
        $format = $period === 'today' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d';
        $rows = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')
            ->groupByRaw("DATE_FORMAT(settled_at, '$format')")
            ->orderBy('bucket')->selectRaw("DATE_FORMAT(settled_at, '$format') AS bucket, SUM(net_revenue) AS sales, COUNT(*) AS orders")->get()->keyBy('bucket');
        $cursor = $start->copy(); $step = $period === 'today' ? 'addHour' : 'addDay'; $buckets = [];
        while ($cursor <= $end) {
            $key = $period === 'today' ? $cursor->format('Y-m-d H:00:00') : $cursor->format('Y-m-d');
            $row = $rows->get($key); $buckets[] = ['bucket' => $key, 'sales' => (float)($row->sales ?? 0), 'orders' => (int)($row->orders ?? 0)];
            $cursor->{$step}();
        }
        return ['available' => true, 'buckets' => $buckets, 'source' => 'net paid revenue grouped by settlement time'];
    }

    protected function analyticsSalesByHour(Carbon $start, Carbon $end): array
    {
        $rows = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')->groupByRaw('HOUR(settled_at)')
            ->selectRaw('HOUR(settled_at) AS hour, SUM(net_revenue) AS sales, COUNT(*) AS orders')->get()->keyBy('hour');
        $hours = []; for ($hour = 0; $hour < 24; $hour++) { $row = $rows->get($hour); $hours[] = ['hour' => $hour, 'sales' => (float)($row->sales ?? 0), 'orders' => (int)($row->orders ?? 0)]; }
        return ['available' => true, 'hours' => $hours, 'source' => 'net paid revenue grouped by local settlement hour'];
    }

    protected function analyticsTopItems(Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('order_menus', ['order_id', 'name', 'quantity', 'subtotal'])) return $this->unavailable('order_menus item totals unavailable');
        $rows = DB::query()->fromSub($this->eligiblePaidOrders($start, $end)->select('orders.order_id'), 'paid')
            ->join('order_menus as om', 'om.order_id', '=', 'paid.order_id')->groupBy('om.name')->orderByDesc('quantity')
            ->limit(5)->get(['om.name', DB::raw('SUM(om.quantity) AS quantity'), DB::raw('SUM(om.subtotal) AS revenue')]);
        return ['available' => true, 'items' => $rows->map(fn ($row) => ['name' => (string)$row->name, 'quantity' => (int)$row->quantity, 'revenue' => (float)$row->revenue])->all(), 'source' => 'paid order_menus grouped by product name'];
    }

    protected function analyticsCategorySales(Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('order_menus', ['order_id', 'menu_id', 'subtotal']) || !Schema::hasTable('menu_categories') || !Schema::hasTable('categories')) return $this->unavailable('menu category relation unavailable');
        $categoryName = $this->firstColumn($this->columns('categories'), ['name', 'category_name']);
        if (!$categoryName) return $this->unavailable('category display column unavailable');
        // A menu may be assigned to multiple categories. Use its primary
        // (lowest id) category once so item revenue is never multiplied.
        $primaryCategory = DB::table('menu_categories')->groupBy('menu_id')
            ->selectRaw('menu_id, MIN(category_id) AS category_id');
        $rows = DB::query()->fromSub($this->eligiblePaidOrders($start, $end)->select('orders.order_id'), 'paid')
            ->join('order_menus as om', 'om.order_id', '=', 'paid.order_id')->leftJoinSub($primaryCategory, 'mc', 'mc.menu_id', '=', 'om.menu_id')
            ->leftJoin('categories as c', 'c.category_id', '=', 'mc.category_id')->groupBy('c.'.$categoryName)->orderByDesc('revenue')
            ->get([DB::raw("COALESCE(c.`$categoryName`, 'Uncategorized') AS category"), DB::raw('SUM(om.subtotal) AS revenue')]);
        return ['available' => true, 'categories' => $rows->map(fn ($r) => ['category' => (string)$r->category, 'revenue' => (float)$r->revenue])->all(), 'source' => 'paid order items joined to menu categories'];
    }

    protected function analyticsPaymentMethods(Carbon $start, Carbon $end): array
    {
        $query = DB::query()->fromSub($this->eligiblePaidOrders($start, $end)->select(['orders.payment', 'orders.settled_amount']), 'paid')
            ->leftJoin('payments as p', 'p.code', '=', 'paid.payment')->groupBy('paid.payment', 'p.name')->orderByDesc('total')
            ->get([DB::raw("COALESCE(p.name, paid.payment, 'Other') AS method"), DB::raw('SUM(paid.settled_amount) AS total'), DB::raw('COUNT(*) AS transactions')]);
        return ['available' => true, 'methods' => $query->map(fn ($r) => ['method' => (string)$r->method, 'total' => (float)$r->total, 'transactions' => (int)$r->transactions])->all(), 'source' => 'successful order settlement method joined to configured payments'];
    }

    protected function analyticsChannels(Carbon $start, Carbon $end): array
    {
        $rows = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')->selectRaw("CASE WHEN LOWER(TRIM(order_type))='delivery' THEN 'Delivery' WHEN LOWER(TRIM(order_type)) IN ('collection','takeaway','take-away','pickup') THEN 'Take away' ELSE 'Dine in' END AS channel, COUNT(*) AS orders, SUM(net_revenue) AS revenue")->groupBy('channel')->get();
        return ['available' => true, 'channels' => $rows->map(fn ($r) => ['channel' => $r->channel, 'orders' => (int)$r->orders, 'revenue' => (float)$r->revenue])->all(), 'source' => 'eligible paid orders by confirmed order_type mapping'];
    }

    protected function analyticsLiveOperations(Carbon $now): array
    {
        $closed = ['paid','settled','closed','cancelled','canceled','refunded'];
        $query = $this->orders()->whereNotIn(DB::raw('LOWER(settlement_status)'), $closed);
        $count = (clone $query)->count();
        $orders = $query->leftJoin('statuses as s', 's.status_id', '=', 'orders.status_id')->orderByDesc('orders.created_at')->limit(5)
            ->get(['orders.order_id', 'orders.order_type', 'orders.created_at', 's.status_name']);
        $occupancy = $this->occupancy();
        return ['available' => true, 'live_order_count' => $count, 'orders' => $orders->map(fn ($r) => ['order_id' => (int)$r->order_id, 'channel' => (string)$r->order_type, 'status' => (string)($r->status_name ?: 'Open'), 'opened_at' => (string)$r->created_at])->all(), 'tables' => ['occupied' => $occupancy['occupied_tables'] ?? 0, 'total' => $occupancy['available_tables'] ?? 0], 'source' => 'current location open orders and operational table states'];
    }

    protected function analyticsTransactions(): array
    {
        $start = Carbon::create(1970, 1, 1, 0, 0, 0, $this->restaurantTimezone());
        $rows = $this->eligiblePaidOrders($start, Carbon::now($this->restaurantTimezone()))->leftJoin('payments as p', 'p.code', '=', 'orders.payment')
            ->orderByDesc('orders.settled_at')->limit(10)->get(['orders.order_id', 'orders.settled_amount', 'orders.settlement_status', 'orders.settled_at', DB::raw('COALESCE(p.name, orders.payment) AS payment_method')]);
        return ['available' => true, 'transactions' => $rows->map(fn ($r) => ['order_id' => (int)$r->order_id, 'method' => (string)$r->payment_method, 'amount' => (float)$r->settled_amount, 'status' => (string)$r->settlement_status, 'timestamp' => (string)$r->settled_at])->all(), 'source' => 'latest successful current-location order settlements'];
    }

    protected function analyticsAlerts(Carbon $start, Carbon $end): array
    {
        $failed = $this->range($this->orders(), 'updated_at', $start, $end)->whereIn(DB::raw('LOWER(settlement_status)'), ['failed'])->count();
        $refunds = $this->range($this->orders(), 'updated_at', $start, $end)->whereIn(DB::raw('LOWER(settlement_status)'), ['refunded','refund'])->count();
        $stock = Schema::hasColumn('menus', 'is_stock_out') ? Menus_model::query()->whereHasOrDoesntHaveLocation($this->locationId())->stockOut()->count() : null;
        $negative = Schema::hasTable('reviews') ? DB::table('reviews')->where('location_id', $this->locationId())->whereRaw('(quality + service + delivery) / 3 <= 2')->count() : null;
        return ['available' => true, 'types' => ['failed_payments' => $failed, 'refunds' => $refunds, 'long_open_tables' => null, 'out_of_stock' => $stock, 'negative_reviews' => $negative], 'unavailable' => ['long_open_tables'], 'source' => 'settlement states, stock flags and location reviews; no reliable open-duration alert threshold configured'];
    }

    protected function analyticsReviews(): array
    {
        if (!Schema::hasTable('reviews')) return $this->unavailable('reviews table unavailable');
        $base = DB::table('reviews')->where('location_id', $this->locationId())->where('review_status', 1);
        $summary = (clone $base)->selectRaw('COUNT(*) AS count, AVG((quality + service + delivery) / 3) AS rating')->first();
        $latest = $base->orderByDesc('created_at')->limit(5)->get(['quality','service','delivery','review_text','created_at']);
        return ['available' => true, 'average' => $summary->rating === null ? null : round((float)$summary->rating, 1), 'count' => (int)$summary->count, 'latest' => $latest->map(fn ($r) => ['rating' => round(((int)$r->quality + (int)$r->service + (int)$r->delivery) / 3, 1), 'comment' => mb_substr(strip_tags((string)$r->review_text), 0, 180), 'date' => (string)$r->created_at])->all(), 'source' => 'approved current-location reviews'];
    }

    protected function analyticsTips(Carbon $start, Carbon $end): array
    {
        $today = $this->tips(Carbon::now($this->restaurantTimezone())->startOfDay(), $end); $month = $this->tips(Carbon::now($this->restaurantTimezone())->startOfMonth(), $end); $selected = $this->tips($start, $end);
        return ['available' => $selected['available'], 'today' => $today['value'], 'month' => $month['value'], 'selected' => $selected['value'], 'tipped_orders' => $selected['sample_count'], 'average_tip' => $selected['sample_count'] ? round($selected['value'] / $selected['sample_count'], 2) : 0, 'source' => $selected['source']];
    }

    protected function analyticsCalendarEvents(Carbon $now): array
    {
        return ['available' => false, 'events' => [], 'source' => 'No persistent calendar-event table exists; Reservations2 holidays are client constants and notes are browser-local', 'reason' => 'Source unavailable'];
    }

    protected function cards(array $kpis, array $currency): array
    {
        $definitions = [
            'revenue' => ['Revenue', 'green', 'money', 'money'],
            'guests' => ['Guests Served', 'purple', 'users', 'number'],
            'turnover' => ['Table Turnover', 'orange', 'timer', 'minutes'],
            'channels' => ['Dine In / Take Away', 'blue', 'utensils', 'channels'],
            'kitchen' => ['Kitchen Ticket Time', 'orange', 'flame', 'minutes'],
            'occupancy' => ['Table Occupancy', 'green', 'table', 'percent'],
            'menu' => ['Menu Availability', 'red', 'menu', 'menu'],
            'tips' => ['Tips', 'green', 'star', 'money'],
        ];
        $cards = [];
        foreach ($definitions as $key => [$title, $tone, $icon, $format]) {
            $empty = $this->unavailable('KPI payload pending', 'Loading');
            $periods = in_array($key, ['occupancy', 'menu'], true)
                ? $empty
                : ['today' => $empty, 'month' => $empty];
            $cards[$key] = compact('key', 'title', 'tone', 'icon', 'format') + [
                'periods' => $kpis[$key] ?? $periods,
                'currency' => $currency,
            ];
        }
        return $cards;
    }
}
