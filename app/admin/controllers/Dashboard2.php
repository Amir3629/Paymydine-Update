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
    private array $analyticsAuthorityCache = [];

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
        return compact('source', 'reason') + [
            'available' => false,
            'empty' => false,
            'value' => null,
            'sample_count' => 0,
            'source_mode' => 'unavailable',
        ];
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
        if (!DB::table('order_totals')->whereRaw("LOWER(code) = 'tip'")->exists()) return null;
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
        $period = in_array($requestedPeriod, ['today', 'week', 'month', 'last30'], true) ? $requestedPeriod : 'today';
        $timezone = $this->restaurantTimezone();
        $currency = $this->currency();
        $now = Carbon::now($timezone);
        $start = $period === 'month' ? $now->copy()->startOfMonth()
            : ($period === 'week' ? $now->copy()->startOfWeek()
                : ($period === 'last30' ? $now->copy()->subDays(30) : $now->copy()->startOfDay()));

        if (!$this->locationId()) {
            return ['success' => false, 'version' => '1.1.0', 'period' => $period,
                'timezone' => $timezone, 'currency' => $currency['code'], 'reason' => 'Authenticated admin location unavailable'];
        }

        $payload = [
            'success' => true,
            'version' => '1.1.0',
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
            'recent_transactions' => $this->safeAnalytics(fn () => $this->analyticsTransactions($start, $now)),
            'alerts' => $this->safeAnalytics(fn () => $this->analyticsAlerts($start, $now)),
            'reviews' => $this->safeAnalytics(fn () => $this->analyticsReviews()),
            'tips' => $this->safeAnalytics(fn () => $this->analyticsTips($start, $now)),
            'calendar_events' => $this->safeAnalytics(fn () => $this->analyticsCalendarEvents($now)),
        ];
        $payload['diagnostics'] = $this->analyticsDiagnostics($start, $now, $period, $payload);
        return $payload;
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

    protected function analyticsAuthority(Carbon $start, Carbon $end): array
    {
        $key = $start->toDateTimeString().'|'.$end->toDateTimeString();
        if (isset($this->analyticsAuthorityCache[$key])) return $this->analyticsAuthorityCache[$key];
        $columns = $this->columns('orders');
        $settlementReady = count(array_diff(['settlement_status','settled_amount','settled_at'], $columns)) === 0
            && $this->orders()->whereIn(DB::raw('LOWER(settlement_status)'), ['paid','settled'])
                ->whereNotNull('settled_at')->where('settled_amount', '>', 0)->exists();
        $date = $settlementReady ? 'settled_at' : $this->firstColumn($columns, ['processed_at','completed_at','updated_at','created_at','date_added','order_date']);
        $amount = $settlementReady ? 'settled_amount' : $this->firstColumn($columns, ['order_total','total','total_amount','grand_total']);
        $mode = $settlementReady ? 'settlement_fields' : 'processed_order_fallback';
        return $this->analyticsAuthorityCache[$key] = compact('date','amount','mode') + [
            'payment' => $this->firstColumn($columns, ['payment','payment_code']),
            'type' => $this->firstColumn($columns, ['order_type','service_type']),
            'available' => (bool)($date && $amount && in_array('processed', $columns, true)),
        ];
    }

    protected function analyticsEligibleOrders(Carbon $start, Carbon $end): Builder
    {
        $authority = $this->analyticsAuthority($start, $end);
        $query = $this->orders();
        if (!$authority['available']) return $query->whereRaw('1=0');
        $this->range($query, $authority['date'], $start, $end);
        $query->where('processed', 1);
        if ($authority['mode'] === 'settlement_fields') {
            $query->whereIn(DB::raw('LOWER(settlement_status)'), ['paid','settled'])->whereNotNull('settled_at');
        }
        if ($this->hasColumns('statuses', ['status_id','status_name']) && Schema::hasColumn('orders', 'status_id')) {
            $query->whereNotExists(function ($excluded) {
                // Query builder prefixes aliases on this tenant connection.
                $excluded->selectRaw('1')->from('statuses as analytics_status')
                    ->whereColumn('ti_analytics_status.status_id', 'ti_orders.status_id')
                    ->whereRaw("LOWER(ti_analytics_status.status_name) REGEXP 'cancel|refund|failed|void'");
            });
        }
        return $query;
    }

    protected function analyticsPaidQuery(Carbon $start, Carbon $end): Builder
    {
        $authority = $this->analyticsAuthority($start, $end);
        $query = $this->analyticsEligibleOrders($start, $end);
        $tips = $this->tipSubquery();
        if ($tips) $query->leftJoinSub($tips, 'analytics_tips', 'ti_orders.order_id', '=', 'ti_analytics_tips.order_id');
        $payment = $authority['payment'] ? 'ti_orders.`'.$authority['payment'].'`' : "''";
        return $query->selectRaw('ti_orders.*, ti_orders.`'.$authority['date'].'` AS effective_at, ti_orders.`'.$authority['amount'].'` AS effective_amount, '.$payment.' AS effective_payment, GREATEST(COALESCE(ti_orders.`'.$authority['amount'].'`, 0) - '.($tips ? 'COALESCE(ti_analytics_tips.tip_amount, 0)' : '0').', 0) AS net_revenue');
    }

    protected function analyticsSalesSeries(Carbon $start, Carbon $end, string $period): array
    {
        $authority = $this->analyticsAuthority($start, $end);
        if (!$authority['available']) return $this->unavailable('eligible processed-order source missing');
        $format = $period === 'today' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d';
        $rows = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')
            ->groupByRaw("DATE_FORMAT(effective_at, '$format')")
            ->orderBy('bucket')->selectRaw("DATE_FORMAT(effective_at, '$format') AS bucket, SUM(net_revenue) AS sales, COUNT(*) AS orders")->get()->keyBy('bucket');
        $cursor = $start->copy(); $step = $period === 'today' ? 'addHour' : 'addDay'; $buckets = [];
        $bucketEnd = $period === 'today' ? $start->copy()->endOfDay()
            : ($period === 'week' ? $start->copy()->addDays(6)->endOfDay() : $end);
        while ($cursor <= $bucketEnd) {
            $key = $period === 'today' ? $cursor->format('Y-m-d H:00:00') : $cursor->format('Y-m-d');
            $row = $rows->get($key); $buckets[] = ['bucket' => $key, 'sales' => (float)($row->sales ?? 0), 'orders' => (int)($row->orders ?? 0)];
            $cursor->{$step}();
        }
        $samples = array_sum(array_column($buckets, 'orders'));
        return ['available' => true, 'empty' => $samples === 0, 'buckets' => $buckets, 'sample_count' => $samples, 'reason' => $samples ? null : 'No activity in this period', 'source_mode' => $authority['mode'], 'source' => 'orders.'.$authority['amount'].' grouped by orders.'.$authority['date'].' minus tips'];
    }

    protected function analyticsSalesByHour(Carbon $start, Carbon $end): array
    {
        $authority = $this->analyticsAuthority($start, $end);
        $rows = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')->groupByRaw('HOUR(effective_at)')
            ->selectRaw('HOUR(effective_at) AS hour, SUM(net_revenue) AS sales, COUNT(*) AS orders')->get()->keyBy('hour');
        $hours = []; for ($hour = 0; $hour < 24; $hour++) { $row = $rows->get($hour); $hours[] = ['hour' => $hour, 'sales' => (float)($row->sales ?? 0), 'orders' => (int)($row->orders ?? 0)]; }
        $samples = array_sum(array_column($hours, 'orders'));
        return ['available' => true, 'empty' => $samples === 0, 'hours' => $hours, 'sample_count' => $samples, 'reason' => $samples ? null : 'No activity in this period', 'source_mode' => $authority['mode'], 'source' => 'eligible orders grouped by hour of '.$authority['date']];
    }

    protected function analyticsTopItems(Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('order_menus', ['order_id', 'name', 'quantity', 'subtotal'])) return $this->unavailable('order_menus item totals unavailable');
        $authority = $this->analyticsAuthority($start, $end);
        $rows = DB::query()->fromSub($this->analyticsEligibleOrders($start, $end)->select('ti_orders.order_id'), 'paid')
            ->join('order_menus as om', 'ti_om.order_id', '=', 'ti_paid.order_id')->groupBy('ti_om.name')->orderByDesc('quantity')
            ->limit(5)->get(['ti_om.name', DB::raw('SUM(ti_om.quantity) AS quantity'), DB::raw('SUM(ti_om.subtotal) AS revenue')]);
        return ['available' => true, 'empty' => $rows->isEmpty(), 'items' => $rows->map(fn ($row) => ['name' => (string)$row->name, 'quantity' => (int)$row->quantity, 'revenue' => (float)$row->revenue])->all(), 'sample_count' => $rows->count(), 'reason' => $rows->isEmpty() ? 'No items sold in this period' : null, 'source_mode' => $authority['mode'], 'source' => 'eligible orders joined to order_menus'];
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
        $authority = $this->analyticsAuthority($start, $end);
        $rows = DB::query()->fromSub($this->analyticsEligibleOrders($start, $end)->select('ti_orders.order_id'), 'paid')
            ->join('order_menus as om', 'ti_om.order_id', '=', 'ti_paid.order_id')->leftJoinSub($primaryCategory, 'mc', 'ti_mc.menu_id', '=', 'ti_om.menu_id')
            ->leftJoin('categories as c', 'ti_c.category_id', '=', 'ti_mc.category_id')->groupBy('ti_c.'.$categoryName)->orderByDesc('revenue')
            ->get([DB::raw("COALESCE(ti_c.`$categoryName`, 'Uncategorized') AS category"), DB::raw('SUM(ti_om.subtotal) AS revenue')]);
        return ['available' => true, 'empty' => $rows->isEmpty(), 'categories' => $rows->map(fn ($r) => ['category' => (string)$r->category, 'revenue' => (float)$r->revenue])->all(), 'sample_count' => $rows->count(), 'reason' => $rows->isEmpty() ? 'No items sold in this period' : null, 'source_mode' => $authority['mode'], 'source' => 'eligible order items joined to menu categories'];
    }

    protected function analyticsPaymentMethods(Carbon $start, Carbon $end): array
    {
        $authority = $this->analyticsAuthority($start, $end);
        if (!$authority['payment']) return $this->unavailable('order payment code unavailable');
        $query = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')
            ->leftJoin('payments as p', 'ti_p.code', '=', 'ti_paid.effective_payment')->groupBy('ti_paid.effective_payment', 'ti_p.name')->orderByDesc('total')
            ->get(['ti_paid.effective_payment AS code', 'ti_p.name AS configured_name', DB::raw('SUM(ti_paid.effective_amount) AS total'), DB::raw('COUNT(*) AS transactions')]);
        $samples = (int)$query->sum('transactions');
        return ['available' => true, 'empty' => $samples === 0, 'methods' => $query->map(fn ($r) => ['code' => (string)$r->code, 'configured_name' => (string)($r->configured_name ?? ''), 'total' => (float)$r->total, 'transactions' => (int)$r->transactions])->all(), 'sample_count' => $samples, 'reason' => $samples ? null : 'No transactions in this period', 'source_mode' => $authority['mode'], 'source' => 'orders.'.$authority['payment'].' joined to configured payments'];
    }

    protected function analyticsChannels(Carbon $start, Carbon $end): array
    {
        $rows = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')->selectRaw("CASE WHEN LOWER(TRIM(order_type))='delivery' THEN 'Delivery' WHEN LOWER(TRIM(order_type)) IN ('collection','takeaway','take-away','pickup') THEN 'Take away' ELSE 'Dine in' END AS channel, COUNT(*) AS orders, SUM(net_revenue) AS revenue")->groupBy('channel')->get()->keyBy('channel');
        $authority = $this->analyticsAuthority($start, $end);
        $channels = collect(['Dine in','Take away','Delivery'])->map(function ($name) use ($rows) { $row = $rows->get($name); return ['channel' => $name, 'name' => $name, 'orders' => (int)($row->orders ?? 0), 'revenue' => (float)($row->revenue ?? 0)]; });
        $samples = (int)$channels->sum('orders');
        return ['available' => true, 'empty' => $samples === 0, 'channels' => $channels->all(), 'sample_count' => $samples, 'reason' => $samples ? null : 'No transactions in this period', 'source_mode' => $authority['mode'], 'source' => 'eligible orders by confirmed order_type mapping'];
    }

    protected function analyticsLiveOperations(Carbon $now): array
    {
        $query = $this->orders()->where('processed', 0)
            ->leftJoin('statuses as s', 'ti_s.status_id', '=', 'ti_orders.status_id')
            ->whereRaw("LOWER(COALESCE(ti_s.status_name,'')) NOT REGEXP 'complete|closed|deliver(ed)?|cancel|refund|failed|void'");
        $count = (clone $query)->count();
        $statusNames = (clone $query)->distinct()->pluck('ti_s.status_name')->filter()->values()->all();
        $amount = $this->firstColumn($this->columns('orders'), ['order_total','settled_amount','total','total_amount']);
        $select = ['ti_orders.order_id', 'ti_orders.order_type', 'ti_orders.created_at', 'ti_s.status_name'];
        if ($amount) $select[] = 'ti_orders.'.$amount.' AS amount';
        $orders = $query->orderByDesc('ti_orders.created_at')->limit(5)->get($select);
        $occupancy = $this->occupancy();
        $totalTables = $occupancy['available_tables'] ?? null;
        $occupiedTables = $occupancy['occupied_tables'] ?? null;
        return ['available' => true, 'live_order_count' => $count, 'orders' => $orders->map(fn ($r) => ['order_id' => (int)$r->order_id, 'channel' => (string)$r->order_type, 'status' => (string)($r->status_name ?: 'Open'), 'opened_at' => (string)$r->created_at, 'elapsed_minutes' => max(0, Carbon::parse($r->created_at, $this->restaurantTimezone())->diffInMinutes($now)), 'amount' => isset($r->amount) ? (float)$r->amount : null])->all(), 'occupied_tables' => $occupiedTables, 'total_tables' => $totalTables, 'available_tables' => $totalTables === null || $occupiedTables === null ? null : max(0, $totalTables - $occupiedTables), 'sample_count' => $count, 'source_mode' => 'open_statuses', 'status_names' => $statusNames, 'oldest_live_at' => (clone $query)->min('ti_orders.created_at'), 'source' => 'unprocessed current-location orders excluding terminal status names'];
    }

    protected function analyticsTransactions(Carbon $start, Carbon $end): array
    {
        $authority = $this->analyticsAuthority($start, $end);
        $rows = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')->leftJoin('payments as p', 'ti_p.code', '=', 'ti_paid.effective_payment')
            ->orderByDesc('ti_paid.effective_at')->limit(10)->get(['ti_paid.order_id', 'ti_paid.effective_amount', 'ti_paid.effective_at', 'ti_paid.effective_payment AS payment_code', 'ti_p.name AS configured_payment_name']);
        return ['available' => true, 'empty' => $rows->isEmpty(), 'transactions' => $rows->map(fn ($r) => ['order_id' => (int)$r->order_id, 'payment_code' => (string)$r->payment_code, 'configured_payment_name' => (string)($r->configured_payment_name ?? ''), 'amount' => (float)$r->effective_amount, 'status' => $authority['mode'] === 'settlement_fields' ? 'paid' : 'processed', 'timestamp' => (string)$r->effective_at])->all(), 'sample_count' => $rows->count(), 'reason' => $rows->isEmpty() ? 'No transactions in this period' : null, 'source_mode' => $authority['mode'], 'source' => 'latest eligible orders by '.$authority['date']];
    }

    protected function analyticsAlerts(Carbon $start, Carbon $end): array
    {
        $failed = $this->range($this->orders(), 'updated_at', $start, $end)->whereIn(DB::raw('LOWER(settlement_status)'), ['failed'])->count();
        $refunds = $this->range($this->orders(), 'updated_at', $start, $end)->whereIn(DB::raw('LOWER(settlement_status)'), ['refunded','refund'])->count();
        $stock = Schema::hasColumn('menus', 'is_stock_out') ? Menus_model::query()->whereHasOrDoesntHaveLocation($this->locationId())->stockOut()->count() : null;
        $negative = Schema::hasTable('reviews') ? DB::table('reviews')->where('location_id', $this->locationId())->whereRaw('(quality + service + delivery) > 0')->whereRaw('(quality + service + delivery) / 3 <= 2')->count() : null;
        return ['available' => true, 'types' => ['failed_payments' => $failed, 'refunds' => $refunds, 'long_open_tables' => null, 'out_of_stock' => $stock, 'negative_reviews' => $negative], 'unavailable' => ['long_open_tables'], 'source' => 'settlement states, stock flags and location reviews; no reliable open-duration alert threshold configured'];
    }

    protected function analyticsReviews(): array
    {
        if (!Schema::hasTable('reviews')) return $this->unavailable('reviews table unavailable');
        $base = DB::table('reviews')->where('location_id', $this->locationId())->where('review_status', 1);
        $rated = (clone $base)->whereRaw('(quality + service + delivery) > 0');
        $summary = (clone $rated)->selectRaw('COUNT(*) AS count, AVG((quality + service + delivery) / 3) AS rating')->first();
        $unrated = (clone $base)->whereRaw('(quality + service + delivery) = 0')->count();
        $latest = $rated->orderByDesc('created_at')->limit(5)->get(['quality','service','delivery','review_text','created_at']);
        return ['available' => true, 'average' => $summary->rating === null ? null : round((float)$summary->rating, 1), 'count' => (int)$summary->count, 'rated_count' => (int)$summary->count, 'unrated_count' => $unrated, 'latest' => $latest->map(fn ($r) => ['rating' => round(((int)$r->quality + (int)$r->service + (int)$r->delivery) / 3, 1), 'comment' => mb_substr(strip_tags((string)$r->review_text), 0, 180), 'date' => (string)$r->created_at])->all(), 'sample_count' => (int)$summary->count, 'source_mode' => 'approved_rated_reviews', 'source' => 'approved current-location reviews excluding zero/unrated rows from average'];
    }

    protected function analyticsTips(Carbon $start, Carbon $end): array
    {
        $tips = $this->tipSubquery();
        if (!$tips) return $this->unavailable('No authoritative tip total code exists');
        $resolve = function (Carbon $from) use ($end, $tips) {
            $row = DB::query()->fromSub($this->analyticsEligibleOrders($from, $end)->select('ti_orders.order_id'), 'paid')
                ->joinSub($tips, 'tips', 'ti_tips.order_id', '=', 'ti_paid.order_id')
                ->selectRaw('COUNT(*) AS samples, COALESCE(SUM(ti_tips.tip_amount),0) AS total')->first();
            return ['value' => (float)$row->total, 'count' => (int)$row->samples];
        };
        $today = $resolve(Carbon::now($this->restaurantTimezone())->startOfDay());
        $month = $resolve(Carbon::now($this->restaurantTimezone())->startOfMonth());
        $selected = $resolve($start); $authority = $this->analyticsAuthority($start, $end);
        return ['available' => true, 'today' => $today['value'], 'month' => $month['value'], 'selected' => $selected['value'], 'tipped_orders' => $selected['count'], 'average_tip' => $selected['count'] ? round($selected['value'] / $selected['count'], 2) : 0, 'sample_count' => $selected['count'], 'source_mode' => 'order_totals', 'source' => 'confirmed order_totals.code=tip joined to '.$authority['mode'].' orders'];
    }

    protected function analyticsCalendarEvents(Carbon $now): array
    {
        return ['available' => false, 'events' => [], 'source' => 'No persistent calendar-event table exists; Reservations2 holidays are client constants and notes are browser-local', 'reason' => 'Source unavailable'];
    }

    protected function analyticsDiagnostics(Carbon $start, Carbon $end, string $period, array $payload): array
    {
        $authority = $this->analyticsAuthority($start, $end);
        $eligible = $authority['available'] ? $this->analyticsEligibleOrders($start, $end) : null;
        $unavailable = []; $empty = [];
        foreach ($payload as $key => $value) {
            if (is_array($value) && array_key_exists('available', $value) && $value['available'] === false) {
                $unavailable[$key] = $value['reason'] ?? $value['source'] ?? 'Unavailable';
            }
            if (is_array($value) && ($value['available'] ?? false) === true && ($value['empty'] ?? false) === true) $empty[] = $key;
        }
        $historicalSettlementCount = $this->hasColumns('orders', ['settlement_status','settled_at'])
            ? $this->orders()->whereIn(DB::raw('LOWER(settlement_status)'), ['paid','settled'])->whereNotNull('settled_at')->count() : 0;
        $historicalProcessedCount = Schema::hasColumn('orders', 'processed') ? $this->orders()->where('processed', 1)->count() : 0;
        $periodCount = $eligible ? (clone $eligible)->count() : 0;
        return [
            'requested_period' => $period,
            'location_id' => (bool)$this->locationId(),
            'eligible_order_source' => $authority['mode'],
            'revenue_column' => $authority['amount'],
            'date_column' => $authority['date'],
            'payment_source' => $authority['payment'] ? 'orders.'.$authority['payment'] : 'unavailable',
            'order_item_table' => Schema::hasTable('order_menus') ? 'order_menus' : 'unavailable',
            'order_item_count' => Schema::hasTable('order_menus') ? DB::table('order_menus')->whereIn('order_id', $eligible ? (clone $eligible)->select('orders.order_id') : [-1])->count() : 0,
            'eligible_order_count' => $periodCount,
            'period_has_orders' => $periodCount > 0,
            'period_eligible_order_count' => $periodCount,
            'historical_settlement_count' => $historicalSettlementCount,
            'historical_processed_count' => $historicalProcessedCount,
            'source_available' => $authority['available'],
            'distinct_channel_count' => $eligible && $authority['type'] ? (clone $eligible)->distinct()->count($authority['type']) : 0,
            'tip_source' => $this->tipSubquery() ? 'order_totals.code=tip' : 'unavailable',
            'empty_widgets' => $empty,
            'unavailable_widgets' => array_keys($unavailable),
            'unavailable_reasons' => $unavailable,
        ];
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
