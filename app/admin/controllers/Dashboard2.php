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
