<?php

namespace Admin\Controllers;

use Admin\Models\Categories_model;
use Admin\Models\Menus_model;
use Admin\Models\Payments_model;
use Admin\Models\Reviews_model;
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

        // PMD_DASHBOARD2_V1382_HOURLY_TODAY_UNTIL_NOW
        // The hourly chart is a live-today timeline, independent
        // from the wider analytics period used by other widgets.
        $hourlyStart = $now->copy()->startOfDay();

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
            'sales_by_hour' => $this->safeAnalytics(fn () => $this->analyticsSalesByHour($hourlyStart, $now)),
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
        $payload['diagnostics'] = $this->analyticsDiagnostics($start, $now, $payload, $period);
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
                    ->whereRaw("`ti_analytics_status`.`status_id` = `ti_orders`.`status_id`")
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
        if ($tips) $query->leftJoinSub($tips, 'analytics_tips', 'orders.order_id', '=', 'analytics_tips.order_id');
        $payment = $authority['payment'] ? 'ti_orders.`'.$authority['payment'].'`' : "''";
        return $query->selectRaw('ti_orders.*, ti_orders.`'.$authority['date'].'` AS effective_at, ti_orders.`'.$authority['amount'].'` AS effective_amount, '.$payment.' AS effective_payment, GREATEST(COALESCE(ti_orders.`'.$authority['amount'].'`,0) - '.($tips ? 'COALESCE(ti_analytics_tips.tip_amount,0)' : '0').',0) AS net_revenue');
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
        $lastHour = (int)$end->format('G');
        $hours = [];
        for ($hour = 0; $hour <= $lastHour; $hour++) {
            $row = $rows->get($hour);
            $hours[] = [
                'hour' => $hour,
                'sales' => (float)($row->sales ?? 0),
                'orders' => (int)($row->orders ?? 0),
            ];
        }
        $samples = array_sum(array_column($hours, 'orders'));
        return [
            'available' => true,
            'empty' => $samples === 0,
            'hours' => $hours,
            'current_hour' => $lastHour,
            'visible_hours' => $lastHour + 1,
            'scope' => 'today_until_now',
            'sample_count' => $samples,
            'reason' => $samples ? null : 'No activity today yet',
            'source_mode' => $authority['mode'],
            'source' => 'today eligible orders from 00:00 until now grouped by hour of '.$authority['date'],
        ];
    }

    protected function analyticsTopItems(Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('order_menus', ['order_id', 'name', 'quantity', 'subtotal'])) return $this->unavailable('order_menus item totals unavailable');
        $authority = $this->analyticsAuthority($start, $end);
        $rows = DB::query()->fromSub($this->analyticsEligibleOrders($start, $end)->select('orders.order_id'), 'paid')
            ->join('order_menus as om', 'om.order_id', '=', 'paid.order_id')->groupBy('om.name')->orderByDesc('quantity')
            ->limit(5)->get(['om.name', DB::raw('SUM(ti_om.quantity) AS quantity'), DB::raw('SUM(ti_om.subtotal) AS revenue')]);
        return ['available' => true, 'empty' => $rows->isEmpty(), 'items' => $rows->map(fn ($row) => ['name' => (string)$row->name, 'quantity' => (int)$row->quantity, 'revenue' => (float)$row->revenue])->all(), 'sample_count' => $rows->count(), 'reason' => $rows->isEmpty() ? 'No items sold in this period' : null, 'source_mode' => $authority['mode'], 'source' => 'eligible orders joined to order_menus'];
    }

    protected function analyticsCategorySales(Carbon $start, Carbon $end): array
    {
        /* PMD_DASHBOARD2_V1422_SOURCE_REPAIR */
        if (
            !$this->hasColumns('order_menus', ['order_id', 'menu_id', 'subtotal'])
            || !Schema::hasTable('menu_categories')
            || !Schema::hasTable('categories')
        ) {
            return $this->unavailable('menu category relation unavailable');
        }

        $locationId = $this->locationId();
        $enabledCategories = collect();

        /*
         * Use the same enabled category model as /admin/categories.
         * A raw fallback keeps the dashboard alive when a location pivot
         * differs between older tenant schemas.
         */
        try {
            $query = Categories_model::query()->isEnabled();

            if ($locationId) {
                $query->whereHasOrDoesntHaveLocation($locationId);
            }

            $enabledCategories = $query
                ->orderBy('priority')
                ->orderBy('category_id')
                ->get()
                ->map(function ($category) {
                    return (object)[
                        'category_id' => (int)$category->category_id,
                        'name' => trim((string)$category->name),
                        'priority' => (int)($category->priority ?? 0),
                    ];
                });
        } catch (\Throwable $error) {
            $columns = $this->columns('categories');
            $nameColumn = $this->firstColumn($columns, ['name', 'category_name']);

            if (!$nameColumn) {
                return $this->unavailable('category display column unavailable');
            }

            $query = DB::table('categories');

            if (in_array('status', $columns, true)) {
                $query->where('status', 1);
            }

            if (in_array('priority', $columns, true)) {
                $query->orderBy('priority');
            }

            $select = ['category_id', $nameColumn];
            if (in_array('priority', $columns, true)) {
                $select[] = 'priority';
            }

            $enabledCategories = $query
                ->orderBy('category_id')
                ->get($select)
                ->map(function ($category) use ($nameColumn) {
                    return (object)[
                        'category_id' => (int)$category->category_id,
                        'name' => trim((string)$category->{$nameColumn}),
                        'priority' => (int)($category->priority ?? 0),
                    ];
                });
        }

        $enabledCategories = $enabledCategories
            ->filter(fn ($category) => $category->category_id > 0 && $category->name !== '')
            ->unique('category_id')
            ->values();

        if ($enabledCategories->isEmpty()) {
            return [
                'available' => true,
                'empty' => true,
                'categories' => [],
                'sample_count' => 0,
                'reason' => 'No enabled menu categories',
                'source_mode' => 'enabled_live_categories',
                'source' => 'enabled categories from /admin/categories',
            ];
        }

        $enabledIds = $enabledCategories
            ->pluck('category_id')
            ->map(fn ($id) => (int)$id)
            ->all();

        $categoryRank = [];
        foreach ($enabledIds as $index => $categoryId) {
            $categoryRank[$categoryId] = $index;
        }

        /*
         * Resolve one primary enabled category per menu in PHP. This avoids
         * raw alias/prefix differences (mc vs ti_mc) across tenant schemas.
         */
        $primaryByMenu = [];
        $assignments = DB::table('menu_categories')
            ->whereIn('category_id', $enabledIds)
            ->get(['menu_id', 'category_id']);

        foreach ($assignments as $assignment) {
            $menuId = (int)$assignment->menu_id;
            $categoryId = (int)$assignment->category_id;

            if ($menuId <= 0 || !isset($categoryRank[$categoryId])) {
                continue;
            }

            if (
                !isset($primaryByMenu[$menuId])
                || $categoryRank[$categoryId] < $categoryRank[$primaryByMenu[$menuId]]
            ) {
                $primaryByMenu[$menuId] = $categoryId;
            }
        }

        if (!$primaryByMenu) {
            return [
                'available' => true,
                'empty' => true,
                'categories' => [],
                'sample_count' => 0,
                'reason' => 'Enabled categories have no menu assignments',
                'source_mode' => 'enabled_live_categories',
                'source' => 'enabled categories from /admin/categories',
            ];
        }

        $orderIds = $this->analyticsEligibleOrders($start, $end)
            ->select('orders.order_id')
            ->pluck('orders.order_id')
            ->map(fn ($id) => (int)$id)
            ->filter()
            ->values()
            ->all();

        $revenueByCategory = array_fill_keys($enabledIds, 0.0);

        if ($orderIds) {
            $soldRows = DB::table('order_menus')
                ->whereIn('order_id', $orderIds)
                ->whereIn('menu_id', array_keys($primaryByMenu))
                ->get(['menu_id', 'subtotal']);

            foreach ($soldRows as $soldRow) {
                $menuId = (int)$soldRow->menu_id;
                $categoryId = $primaryByMenu[$menuId] ?? null;

                if (!$categoryId) {
                    continue;
                }

                $revenueByCategory[$categoryId] += (float)($soldRow->subtotal ?? 0);
            }
        }

        $categories = $enabledCategories
            ->map(function ($category) use ($revenueByCategory) {
                return [
                    'category_id' => (int)$category->category_id,
                    'category' => (string)$category->name,
                    'revenue' => round((float)($revenueByCategory[(int)$category->category_id] ?? 0), 2),
                    'priority' => (int)$category->priority,
                ];
            })
            ->filter(fn ($row) => $row['revenue'] > 0)
            ->sort(function ($left, $right) {
                return ($right['revenue'] <=> $left['revenue'])
                    ?: ($left['priority'] <=> $right['priority']);
            })
            ->take(6)
            ->values();

        return [
            'available' => true,
            'empty' => $categories->isEmpty(),
            'categories' => $categories->map(function ($row) {
                unset($row['priority']);
                return $row;
            })->all(),
            'sample_count' => $categories->count(),
            'reason' => $categories->isEmpty()
                ? 'No enabled categories sold in this period'
                : null,
            'source_mode' => 'top_enabled_live_categories_v1422',
            'source' => 'top six sold categories from enabled /admin/categories records',
        ];
    }

/**
     * Resolve the payment method actually used to settle an order.
     *
     * settlement_method is authoritative for new orders.
     * effective_payment is retained as a legacy fallback.
     *
     * Deferred/admin workflow values such as "QR Payment Later"
     * are intentionally excluded because they are not payment methods.
     */
    protected function analyticsPaymentExpressions(
        string $alias,
        array $authority
    ): array {
        $candidates = [];

        if (Schema::hasColumn('orders', 'settlement_method')) {
            $candidates[] =
                "NULLIF(TRIM({$alias}.settlement_method), '')";
        }

        if (!empty($authority['payment'])) {
            $candidates[] =
                "NULLIF(TRIM({$alias}.effective_payment), '')";
        }

        if (!$candidates) {
            return [
                'raw' => "''",
                'normalized' => "''",
                'excluded' => [],
            ];
        }

        $raw = count($candidates) === 1
            ? $candidates[0]
            : 'COALESCE('.implode(', ', $candidates).')';

        $normalized =
            "LOWER(REPLACE(REPLACE(REPLACE(TRIM({$raw}), ".
            "' ', '_'), '-', '_'), '/', '_'))";

        return [
            'raw' => $raw,
            'normalized' => $normalized,
            'excluded' => [
                'qr_payment_later',
                'qr_pay_later',
                'payment_later',
                'pay_later',
                'later',
                'deferred',
                'pending_payment',
                'unpaid',
                'not_paid',
            ],
        ];
    }

    protected function analyticsPaymentLabelExpression(
        string $normalized,
        bool $paymentsJoined
    ): string {
        $configuredName = $paymentsJoined
            ? "NULLIF(TRIM(p.name), '')"
            : 'NULL';

        return
            "CASE ".
            "WHEN {$normalized} IN ('cash','cod') ".
            "THEN 'Cash' ".
            "WHEN {$normalized} IN ".
            "('card','credit_card','debit_card','stripe',".
            "'worldline','sumup','square','vr_payment') ".
            "THEN 'Card' ".
            "WHEN {$normalized} IN ('apple_pay','applepay') ".
            "THEN 'Apple Pay' ".
            "WHEN {$normalized} IN ('google_pay','googlepay') ".
            "THEN 'Google Pay' ".
            "WHEN {$normalized} IN ('paypal','pay_pal') ".
            "THEN 'PayPal' ".
            "WHEN {$normalized} = 'wero' ".
            "THEN 'Wero' ".
            "ELSE COALESCE(".$configuredName.", ".
            "REPLACE({$normalized}, '_', ' ')) END";
    }

protected function analyticsPaymentMethods(
        Carbon $start,
        Carbon $end
    ): array {
        /* PMD_DASHBOARD2_V1422_SOURCE_REPAIR */
        $authority = $this->analyticsAuthority($start, $end);

        if (!$authority) {
            return $this->unavailable(
                'No reliable paid-order authority is available'
            );
        }

        $normalize = static function ($value): string {
            $value = strtolower(trim((string)$value));
            return trim(preg_replace('/[^a-z0-9]+/', '_', $value), '_');
        };

        $canonical = static function (string $code): string {
            return match ($code) {
                'cod', 'cash', 'cash_on_delivery' => 'cash',
                'credit_card', 'debit_card', 'stripe', 'worldline',
                'sumup', 'square', 'vr_payment' => 'card',
                'applepay' => 'apple_pay',
                'googlepay' => 'google_pay',
                'pay_pal' => 'paypal',
                default => $code,
            };
        };

        $methodCodes = [
            'card', 'apple_pay', 'google_pay',
            'wero', 'paypal', 'cod', 'cash'
        ];

        /*
         * Payments_model can resolve either payment_methods (id/sort_order/meta)
         * or legacy payments (payment_id/priority/data). Query only columns that
         * physically exist so the Dashboard mirrors /admin/payments safely.
         */
        $paymentModel = new Payments_model();
        $table = $paymentModel->getTable();
        $columns = Schema::getColumnListing($table);

        foreach (['code', 'name', 'status'] as $requiredColumn) {
            if (!in_array($requiredColumn, $columns, true)) {
                return $this->unavailable(
                    'Payment configuration column unavailable: '.$requiredColumn
                );
            }
        }

        $select = array_values(array_intersect(
            [
                $paymentModel->getKeyName(),
                'name', 'code', 'status', 'priority', 'sort_order',
                'provider_code', 'meta', 'data'
            ],
            $columns
        ));

        $configuredRows = DB::table($table)
            ->where('status', 1)
            ->whereIn(DB::raw('LOWER(code)'), $methodCodes)
            ->when(
                in_array('sort_order', $columns, true),
                fn ($query) => $query->orderBy('sort_order')
            )
            ->when(
                !in_array('sort_order', $columns, true)
                    && in_array('priority', $columns, true),
                fn ($query) => $query->orderBy('priority')
            )
            ->orderBy('name')
            ->get($select);

        $configured = collect();

        foreach ($configuredRows as $row) {
            $rawCode = $normalize($row->code ?? null);
            $code = $canonical($rawCode);

            if ($code === '' || !in_array($rawCode, $methodCodes, true)) {
                continue;
            }

            $payload = [];
            foreach (['meta', 'data'] as $payloadColumn) {
                if (!property_exists($row, $payloadColumn)) {
                    continue;
                }

                $value = $row->{$payloadColumn};
                if (is_string($value) && $value !== '') {
                    $decoded = json_decode($value, true);
                    if (is_array($decoded)) {
                        $payload = array_merge($payload, $decoded);
                    }
                } elseif (is_array($value)) {
                    $payload = array_merge($payload, $value);
                }
            }

            $priority = property_exists($row, 'sort_order')
                ? (int)$row->sort_order
                : (property_exists($row, 'priority') ? (int)$row->priority : 0);

            $providerCode = property_exists($row, 'provider_code')
                ? $normalize($row->provider_code)
                : $normalize($payload['provider_code'] ?? null);

            $configured->push([
                'payment_id' => (int)(
                    $row->{$paymentModel->getKeyName()} ?? 0
                ),
                'code' => $code,
                'method' => trim((string)($row->name ?? ''))
                    ?: ucwords(str_replace('_', ' ', $code)),
                'provider_code' => $providerCode ?: null,
                'priority' => $priority,
                'total' => 0.0,
                'transactions' => 0,
                'enabled' => true,
            ]);
        }

        $configured = $configured
            ->sortBy('priority')
            ->unique('code')
            ->values();

        $byCode = $configured->keyBy('code')->all();

        $excluded = [
            '', 'qr_payment_later', 'qr_pay_later', 'payment_later',
            'pay_later', 'later', 'deferred', 'pending_payment',
            'unpaid', 'not_paid', 'not_recorded',
        ];

        $rows = DB::query()
            ->fromSub($this->analyticsPaidQuery($start, $end), 'paid')
            ->get([
                'paid.order_id',
                'paid.net_revenue',
                'paid.effective_payment',
            ]);

        foreach ($rows as $row) {
            $raw = $normalize($row->effective_payment ?? null);

            if (in_array($raw, $excluded, true)) {
                continue;
            }

            $code = $canonical($raw);

            /* The card follows enabled /admin/payments methods only. */
            if (!isset($byCode[$code])) {
                continue;
            }

            $byCode[$code]['total'] += (float)$row->net_revenue;
            $byCode[$code]['transactions']++;
        }

        $methods = collect(array_values($byCode))
            ->sort(function ($left, $right) {
                return ($right['total'] <=> $left['total'])
                    ?: ($right['transactions'] <=> $left['transactions'])
                    ?: ($left['priority'] <=> $right['priority']);
            })
            ->take(6)
            ->values()
            ->map(function ($method) {
                $method['total'] = round((float)$method['total'], 2);
                unset($method['priority']);
                return $method;
            });

        return [
            'available' => true,
            /* Enabled zero-value methods must still render. */
            'empty' => $methods->isEmpty(),
            'methods' => $methods->all(),
            'sample_count' => (int)$methods->sum('transactions'),
            'reason' => $methods->isEmpty()
                ? 'No enabled payment methods in /admin/payments'
                : null,
            'source_mode' => 'enabled_admin_payment_methods_v1422',
            'source' => 'enabled method records from /admin/payments merged with settled order usage',
        ];
    }

protected function analyticsChannels(
        Carbon $start,
        Carbon $end
    ): array {
        $rows = DB::query()
            ->fromSub($this->analyticsPaidQuery($start, $end), 'paid')
            ->selectRaw(
                "CASE " .
                "WHEN LOWER(TRIM(order_type)) IN ('collection','takeaway','take-away','pickup') THEN 'Take away' " .
                "WHEN LOWER(TRIM(order_type)) IN ('delivery','delivered') THEN 'Delivery' " .
                "WHEN LOWER(TRIM(order_type)) IN ('dine_in','dine-in','restaurant','table','') THEN 'Dine in' " .
                "ELSE CONCAT(UCASE(LEFT(REPLACE(order_type, '_', ' '), 1)), " .
                "SUBSTRING(REPLACE(order_type, '_', ' '), 2)) END AS channel, " .
                "COUNT(*) AS orders, SUM(net_revenue) AS revenue"
            )
            ->groupBy('channel')
            ->orderByDesc('revenue')
            ->limit(6)
            ->get();

        $channels = $rows->map(fn ($row) => [
            'channel' => (string)$row->channel,
            'name' => (string)$row->channel,
            'orders' => (int)$row->orders,
            'revenue' => round((float)$row->revenue, 2),
        ])->values();

        $samples = (int)$channels->sum('orders');

        return [
            'available' => true,
            'empty' => $channels->isEmpty(),
            'channels' => $channels->all(),
            'sample_count' => $samples,
            'reason' => $samples ? null : 'No orders in this period',
            'source_mode' => 'top_live_order_channels',
            'source' => 'top six real order_type channels from eligible settled orders',
        ];
    }

    protected function analyticsLiveOperations(Carbon $now): array
    {
        $query = $this->orders()->where('processed', 0)
            ->leftJoin('statuses as s', 's.status_id', '=', 'orders.status_id')
            ->whereRaw("LOWER(COALESCE(ti_s.status_name,'')) NOT REGEXP 'complete|closed|deliver(ed)?|cancel|refund|failed|void'");
        $count = (clone $query)->count();
        $statusNames = (clone $query)->distinct()->pluck('s.status_name')->filter()->values()->all();
        $orders = $query->orderByDesc('orders.created_at')->limit(5)
            ->get(['orders.order_id', 'orders.order_type', 'orders.created_at', 's.status_name']);
        $occupancy = $this->occupancy();
        return ['available' => true, 'live_order_count' => $count, 'orders' => $orders->map(fn ($r) => ['order_id' => (int)$r->order_id, 'channel' => (string)$r->order_type, 'status' => (string)($r->status_name ?: 'Open'), 'opened_at' => (string)$r->created_at])->all(), 'tables' => ['occupied' => $occupancy['occupied_tables'] ?? 0, 'total' => $occupancy['available_tables'] ?? 0], 'sample_count' => $count, 'source_mode' => 'open_statuses', 'status_names' => $statusNames, 'oldest_live_at' => (clone $query)->min('orders.created_at'), 'source' => 'unprocessed current-location orders excluding terminal status names'];
    }

protected function analyticsTransactions(
        Carbon $start,
        Carbon $end
    ): array {
        $authority = $this->analyticsAuthority(
            $start,
            $end
        );

        if (!$authority) {
            return $this->unavailable(
                'No reliable paid-order authority is available'
            );
        }

        $rows = DB::query()
            ->fromSub(
                $this->analyticsPaidQuery($start, $end),
                'paid'
            )
            ->orderByDesc('paid.effective_at')
            ->limit(10)
            ->get([
                'paid.order_id',
                'paid.effective_amount',
                'paid.effective_at',
                'paid.effective_payment',
            ]);

        $excluded = [
            'qr_payment_later',
            'qr_pay_later',
            'payment_later',
            'pay_later',
            'later',
            'deferred',
            'pending_payment',
            'unpaid',
            'not_paid',
        ];

        $normalize = static function ($value): string {
            $value = strtolower(
                trim((string)$value)
            );

            return trim(
                preg_replace(
                    '/[^a-z0-9]+/',
                    '_',
                    $value
                ),
                '_'
            );
        };

        $label = static function (
            string $code
        ): string {
            return match ($code) {
                'cash', 'cod' => 'Cash',

                'card',
                'credit_card',
                'debit_card',
                'stripe',
                'worldline',
                'sumup',
                'square',
                'vr_payment' => 'Card',

                'apple_pay',
                'applepay' => 'Apple Pay',

                'google_pay',
                'googlepay' => 'Google Pay',

                'paypal',
                'pay_pal' => 'PayPal',

                'wero' => 'Wero',

                default => 'Not recorded',
            };
        };

        $transactions = [];

        foreach ($rows as $row) {
            $code = $normalize(
                $row->effective_payment ?? null
            );

            $methodRecorded = (
                $code !== ''
                && !in_array(
                    $code,
                    $excluded,
                    true
                )
            );

            $transactions[] = [
                'order_id' => (int)$row->order_id,
                'method' => $methodRecorded
                    ? $label($code)
                    : null,
                'method_recorded' =>
                    $methodRecorded,
                'amount' =>
                    (float)$row->effective_amount,
                'status' => 'paid',
                'timestamp' =>
                    (string)$row->effective_at,
            ];
        }

        return [
            'available' => true,
            'empty' => count($transactions) === 0,
            'transactions' => $transactions,
            'sample_count' =>
                count($transactions),
            'reason' => $transactions
                ? null
                : 'No settled transactions in this period',
            'source_mode' =>
                'settled_orders_optional_payment_method',
            'source' =>
                'latest settled frontend and admin orders; '.
                'QR Payment Later is not treated as a method',
        ];
    }

protected function analyticsAlerts(
        Carbon $start,
        Carbon $end
    ): array {
        /*
         * PMD_DASHBOARD2_V1429_CHART_TOGGLE_AND_TODAY_ALERTS
         *
         * Alerts are always a Today/current-status card.
         * They must not inherit last30, week or month from
         * any other Dashboard2 analytics widget.
         */
        $now = Carbon::now(
            $this->restaurantTimezone()
        );

        $start = $now->copy()->startOfDay();
        $end = $now->copy();

        $failed = 0;
        $refunds = 0;

        if (
            Schema::hasColumn('orders', 'settlement_status')
            && Schema::hasColumn('orders', 'updated_at')
        ) {
            $failed = $this->range(
                $this->orders(),
                'updated_at',
                $start,
                $end
            )->whereIn(
                DB::raw('LOWER(settlement_status)'),
                ['failed']
            )->count();

            $refunds = $this->range(
                $this->orders(),
                'updated_at',
                $start,
                $end
            )->whereIn(
                DB::raw('LOWER(settlement_status)'),
                ['refunded', 'refund']
            )->count();
        }

        $stock = Schema::hasColumn(
            'menus',
            'is_stock_out'
        )
            ? Menus_model::query()
                ->whereHasOrDoesntHaveLocation(
                    $this->locationId()
                )
                ->stockOut()
                ->count()
            : null;

        $negative = null;

        if (
            Schema::hasTable('reviews')
            && Schema::hasColumn('reviews', 'location_id')
        ) {
            $reviewQuery = DB::table('reviews')
                ->where(
                    'location_id',
                    $this->locationId()
                );

            /*
             * Negative-review alert is also Today-only.
             * Prefer created_at, then updated_at, then date_added.
             */
            $reviewColumns = $this->columns('reviews');

            $reviewDateColumn = $this->firstColumn(
                $reviewColumns,
                [
                    'created_at',
                    'updated_at',
                    'date_added',
                ]
            );

            if ($reviewDateColumn) {
                $reviewQuery->whereBetween(
                    $reviewDateColumn,
                    [
                        $start->format('Y-m-d H:i:s'),
                        $end->format('Y-m-d H:i:s'),
                    ]
                );
            }

            if (
                $this->hasColumns(
                    'reviews',
                    ['quality', 'service', 'delivery']
                )
            ) {
                $negative = $reviewQuery
                    ->whereRaw(
                        '(COALESCE(quality,0) + '.
                        'COALESCE(service,0) + '.
                        'COALESCE(delivery,0)) / 3 <= 2'
                    )
                    ->count();
            } elseif (
                Schema::hasColumn('reviews', 'rating')
            ) {
                $negative = $reviewQuery
                    ->where('rating', '<=', 2)
                    ->count();
            }
        }

        $longOpenTables = null;
        $longestOpenMinutes = null;
        $longOpenThreshold = max(15, min(720, (int)setting('pmd_dashboard2_long_open_minutes', 90)));

        if (
            Schema::hasTable('tables')
            && $this->locationId()
        ) {
            $tableIds = Tables_model::query()
                ->whereHasLocation($this->locationId())
                ->isEnabled()
                ->pluck('table_id');

            $statusColumn = Schema::hasColumn(
                'tables',
                'operational_status'
            )
                ? 'operational_status'
                : (
                    Schema::hasColumn(
                        'tables',
                        'table_status'
                    )
                        ? 'table_status'
                        : null
                );

            $updatedColumn = Schema::hasColumn(
                'tables',
                'operational_status_updated_at'
            )
                ? 'operational_status_updated_at'
                : (
                    Schema::hasColumn(
                        'tables',
                        'updated_at'
                    )
                        ? 'updated_at'
                        : null
                );

            if (
                $tableIds->isNotEmpty()
                && $statusColumn
                && $updatedColumn
            ) {
                $threshold = (clone $end)
                    ->subMinutes($longOpenThreshold);

                $openQuery = DB::table('tables')
                    ->whereIn('table_id', $tableIds)
                    ->whereIn(
                        DB::raw(
                            'LOWER(TRIM('.
                            $statusColumn.
                            '))'
                        ),
                        [
                            'occupied',
                            'seated',
                            'in_use',
                            'in-use',
                            'busy',
                        ]
                    )
                    ->whereNotNull($updatedColumn)
                    ->where(
                        $updatedColumn,
                        '<=',
                        $threshold->format(
                            'Y-m-d H:i:s'
                        )
                    );

                $longOpenTables = $openQuery->count();

                $oldest = (clone $openQuery)
                    ->min($updatedColumn);

                if ($oldest) {
                    $longestOpenMinutes = max(
                        0,
                        Carbon::parse($oldest)
                            ->diffInMinutes($end)
                    );
                }
            }
        }

        $unavailable = [];

        if ($longOpenTables === null) {
            $unavailable[] = 'long_open_tables';
        }

        return [
            'available' => true,
            'types' => [
                'failed_payments' => $failed,
                'refunds' => $refunds,
                'long_open_tables' => $longOpenTables,
                'out_of_stock' => $stock,
                'negative_reviews' => $negative,
            ],
            'long_open_threshold_minutes' =>
                $longOpenThreshold,
            'longest_open_minutes' =>
                $longestOpenMinutes,
            'unavailable' => $unavailable,
            'source' =>
                'settlement states, menu stock flags, '.
                'approved location reviews and current '.
                'location table operational status',
        ];
    }

    protected function analyticsReviews(): array
    {
        /* PMD_DASHBOARD2_V1422_SOURCE_REPAIR */
        if (!Schema::hasTable('reviews')) {
            return $this->unavailable('reviews table unavailable');
        }

        $columns = $this->columns('reviews');
        $query = Reviews_model::query();

        if (
            $this->locationId()
            && in_array('location_id', $columns, true)
        ) {
            $query->where('location_id', $this->locationId());
        }

        /*
         * /admin/reviews lists the same model ordered by created_at and does
         * not hide pending rows. Mirror that source so newly created reviews
         * appear on Dashboard2 immediately.
         */
        $orderColumn = in_array('created_at', $columns, true)
            ? 'created_at'
            : 'review_id';

        $rows = $query
            ->orderByDesc($orderColumn)
            ->get();

        $ratingFor = static function ($row) use ($columns): ?float {
            if (
                in_array('quality', $columns, true)
                && in_array('service', $columns, true)
                && in_array('delivery', $columns, true)
            ) {
                $values = [
                    (float)($row->quality ?? 0),
                    (float)($row->service ?? 0),
                    (float)($row->delivery ?? 0),
                ];

                if (array_sum($values) <= 0) {
                    return null;
                }

                return round(array_sum($values) / 3, 1);
            }

            if (in_array('rating', $columns, true)) {
                $rating = (float)($row->rating ?? 0);
                return $rating > 0 ? round($rating, 1) : null;
            }

            return null;
        };

        $commentColumn = $this->firstColumn(
            $columns,
            ['review_text', 'comment', 'review', 'message']
        );

        $rated = $rows
            ->map(function ($row) use ($ratingFor, $commentColumn, $orderColumn, $columns) {
                $rating = $ratingFor($row);

                if ($rating === null) {
                    return null;
                }

                $comment = $commentColumn
                    ? mb_substr(strip_tags((string)($row->{$commentColumn} ?? '')), 0, 180)
                    : '';

                $approved = in_array('review_status', $columns, true)
                    ? (bool)$row->review_status
                    : null;

                $status = in_array('status', $columns, true)
                    ? (string)$row->status
                    : ($approved === true ? 'approved' : ($approved === false ? 'pending' : null));

                return [
                    'review_id' => (int)($row->review_id ?? 0),
                    'rating' => $rating,
                    'comment' => $comment,
                    'date' => (string)($row->{$orderColumn} ?? ''),
                    'approved' => $approved,
                    'status' => $status,
                ];
            })
            ->filter()
            ->values();

        $average = $rated->isEmpty()
            ? null
            : round((float)$rated->avg('rating'), 1);

        return [
            'available' => true,
            'average' => $average,
            'count' => $rated->count(),
            'rated_count' => $rated->count(),
            'unrated_count' => max(0, $rows->count() - $rated->count()),
            'latest' => $rated->take(5)->all(),
            'sample_count' => $rated->count(),
            'source_mode' => 'admin_reviews_exact_model_v1422',
            'source' => '/admin/reviews Reviews_model, current location, newest first',
        ];
    }

    /**
     * PMD_DASHBOARD2_V1431_SAFE_CHANNELS_TIPS
     *
     * Tips are read directly from order_totals.code=tip.
     * No manually written SQL table alias is used, so the
     * active HTTP database prefix is handled by Laravel.
     */
    protected function analyticsTips(
        Carbon $start,
        Carbon $end
    ): array {
        if (
            !$this->hasColumns(
                'order_totals',
                ['order_id', 'code', 'value']
            )
        ) {
            return $this->unavailable(
                'order_totals tip source unavailable'
            );
        }

        $resolve = function (
            Carbon $from,
            Carbon $until
        ): array {
            $eligibleOrderIds = $this
                ->analyticsEligibleOrders($from, $until)
                ->select('orders.order_id');

            $row = DB::table('order_totals')
                ->whereRaw("LOWER(TRIM(code)) = 'tip'")
                ->whereIn('order_id', $eligibleOrderIds)
                ->selectRaw(
                    'COUNT(DISTINCT order_id) AS samples, '.
                    'COALESCE(SUM(value), 0) AS aggregate'
                )
                ->first();

            return [
                'value' => round(
                    (float)($row->aggregate ?? 0),
                    2
                ),
                'count' => (int)($row->samples ?? 0),
            ];
        };

        $now = Carbon::now(
            $this->restaurantTimezone()
        );

        $today = $resolve(
            $now->copy()->startOfDay(),
            $now->copy()
        );

        $month = $resolve(
            $now->copy()->startOfMonth(),
            $now->copy()
        );

        $selected = $resolve(
            $start,
            $end
        );

        return [
            'available' => true,
            'empty' => $selected['count'] === 0,
            'today' => $today['value'],
            'month' => $month['value'],
            'selected' => $selected['value'],
            'tipped_orders' => $selected['count'],
            'average_tip' => $selected['count'] > 0
                ? round(
                    $selected['value']
                    / $selected['count'],
                    2
                )
                : 0,
            'sample_count' => $selected['count'],
            'reason' => $selected['count'] > 0
                ? null
                : 'No tips in this period',
            'source_mode' =>
                'order_totals_tip_prefix_safe_v1431',
            'source' =>
                'order_totals.code=tip for eligible paid orders',
        ];
    }


protected function analyticsCalendarEvents(
        Carbon $now
    ): array {
        if (
            !Schema::hasTable('reservations')
            || !$this->hasColumns(
                'reservations',
                [
                    'reservation_id',
                    'location_id',
                    'reserve_date',
                    'reserve_time',
                    'guest_num',
                ]
            )
        ) {
            return $this->unavailable(
                'Reservations source unavailable'
            );
        }

        $query = DB::table(
            'reservations as r'
        )
            ->where(
                'r.location_id',
                $this->locationId()
            )
            ->whereDate(
                'r.reserve_date',
                '>=',
                $now->toDateString()
            )
            ->orderBy('r.reserve_date')
            ->orderBy('r.reserve_time')
            ->limit(100);

        $hasStatuses =
            Schema::hasTable('statuses')
            && Schema::hasColumn(
                'reservations',
                'status_id'
            )
            && $this->hasColumns(
                'statuses',
                ['status_id', 'status_name']
            );

        if ($hasStatuses) {
            $query->leftJoin(
                'statuses as s',
                's.status_id',
                '=',
                'r.status_id'
            );
        }

        $select = [
            'r.reservation_id',
            'r.reserve_date',
            'r.reserve_time',
            'r.guest_num',
        ];

        if ($hasStatuses) {
            $select[] = 's.status_name';
        }

        $rows = $query->get($select);

        $excludedStatuses = [
            'cancelled',
            'canceled',
            'rejected',
            'declined',
            'no show',
            'no-show',
            'completed',
            'closed',
        ];

        $events = [];

        foreach ($rows as $row) {
            $date = trim(
                (string)$row->reserve_date
            );

            $time = trim(
                (string)$row->reserve_time
            );

            if ($time === '') {
                $time = '00:00:00';
            }

            try {
                $reservationAt = Carbon::parse(
                    $date.' '.$time,
                    $this->restaurantTimezone()
                );
            } catch (\Throwable $error) {
                continue;
            }

            if ($reservationAt->lt($now)) {
                continue;
            }

            $statusName = $hasStatuses
                ? trim(
                    (string)(
                        $row->status_name ?? ''
                    )
                )
                : '';

            if (
                in_array(
                    strtolower($statusName),
                    $excludedStatuses,
                    true
                )
            ) {
                continue;
            }

            $guests = max(
                0,
                (int)$row->guest_num
            );

            $events[] = [
                'reservation_id' =>
                    (int)$row->reservation_id,
                'title' =>
                    'Reservation #'.
                    (int)$row->reservation_id.
                    ' · '.
                    $guests.
                    ($guests === 1
                        ? ' guest'
                        : ' guests'),
                'date' =>
                    $reservationAt->format(
                        'Y-m-d H:i'
                    ),
                'guests' => $guests,
                'status' =>
                    $statusName ?: 'Upcoming',
                'source' => 'reservation',
            ];

            if (count($events) >= 10) {
                break;
            }
        }

        return [
            'available' => true,
            'empty' => count($events) === 0,
            'events' => $events,
            'sample_count' => count($events),
            'reason' => $events
                ? null
                : 'No upcoming reservations',
            'source_mode' =>
                'location_upcoming_reservations',
            'source' =>
                'future frontend and admin reservations '.
                'for the authenticated restaurant location',
        ];
    }

    protected function analyticsDiagnostics(
        Carbon $start,
        Carbon $end,
        array $payload,
        string $period
    ): array
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
