<?php

namespace Admin\Controllers;

use Admin\Models\Orders_model;
use Admin\Models\Tables_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD Dashboard KPI Repair V1
 *
 * Route-scoped evidence-backed fallbacks for the three operational KPIs that
 * can legitimately have data while Dashboard2's strict settlement/status
 * contracts return an empty sample. No synthetic numbers are produced.
 */
class PmdDashboardKpiRepairV1 extends Dashboard2
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function data()
    {
        $timezone = $this->restaurantTimezone();
        $now = Carbon::now($timezone);
        $start = $now->copy()->startOfDay();

        if (!$this->locationId()) {
            return response()->json([
                'ok' => false,
                'version' => '1.0.0',
                'reason' => 'Authenticated admin location unavailable',
            ], 409);
        }

        try {
            return response()->json([
                'ok' => true,
                'version' => '1.0.0',
                'generated_at' => $now->toIso8601String(),
                'cards' => [
                    'guests' => $this->repairGuests($start, $now),
                    'turnover' => $this->repairTurnover($start, $now),
                    'kitchen' => $this->repairKitchen($start, $now),
                ],
            ]);
        } catch (\Throwable $error) {
            logger()->warning('PMD dashboard KPI repair failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
                'location_id' => $this->locationId(),
            ]);

            return response()->json([
                'ok' => false,
                'version' => '1.0.0',
                'reason' => 'KPI repair source unavailable',
            ], 500);
        }
    }

    public function index()
    {
        return $this->data();
    }

    private function repairGuests(Carbon $start, Carbon $end): array
    {
        $columns = $this->columns('orders');
        $guest = $this->firstColumn($columns, [
            'guest_count',
            'guest_num',
            'covers',
            'party_size',
        ]);

        if (!$guest) {
            return $this->repairCard(false, 0, 0, 'orders guest-count column missing', 'No guest-count source');
        }

        // First choice remains real settled dine-in service.
        if (count(array_diff([
            'settled_at',
            'processed',
            'settlement_status',
            'settled_amount',
            'location_id',
        ], $columns)) === 0) {
            try {
                $settled = $this->dineIn($this->eligiblePaidOrders($start, $end))
                    ->where($guest, '>', 0)
                    ->selectRaw('COUNT(*) AS samples, COALESCE(SUM('.$guest.'), 0) AS aggregate')
                    ->first();

                if ((int)($settled->samples ?? 0) > 0) {
                    return $this->repairCard(
                        true,
                        (int)$settled->aggregate,
                        (int)$settled->samples,
                        'paid dine-in orders.'.$guest.' by settled_at',
                        'Today · served dine-in guests'
                    );
                }
            } catch (\Throwable $error) {
                logger()->debug('PMD guest KPI settled source skipped', ['message' => $error->getMessage()]);
            }
        }

        // Operational fallback: processed dine-in checks with a stored real
        // guest count. This covers live restaurants that have not populated
        // the newer settlement fields consistently yet.
        $date = $this->firstColumn($columns, [
            'processed_at',
            'completed_at',
            'updated_at',
            'created_at',
            'date_added',
            'order_date',
        ]);

        if (!$date || !in_array('location_id', $columns, true)) {
            return $this->repairCard(false, 0, 0, 'orders processed guest source unavailable', 'No guest samples today');
        }

        $query = $this->range($this->orders(), $date, $start, $end)
            ->where($guest, '>', 0);

        if (in_array('order_type', $columns, true)) {
            $query = $this->dineIn($query);
        }
        if (in_array('processed', $columns, true)) {
            $query->where('processed', 1);
        }
        if (in_array('settlement_status', $columns, true)) {
            $query->whereNotIn(DB::raw('LOWER(TRIM(settlement_status))'), [
                'cancelled', 'canceled', 'refunded', 'failed', 'void', 'voided',
            ]);
        }

        $row = $query
            ->selectRaw('COUNT(*) AS samples, COALESCE(SUM('.$guest.'), 0) AS aggregate')
            ->first();

        return $this->repairCard(
            true,
            (int)($row->aggregate ?? 0),
            (int)($row->samples ?? 0),
            'processed dine-in orders.'.$guest.' by '.$date,
            'Today · served dine-in guests'
        );
    }

    private function repairTurnover(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('pmd_table_status_history') || !Schema::hasTable('tables')) {
            return $this->repairCard(false, 0, 0, 'pmd_table_status_history unavailable', 'No completed table visits yet');
        }

        $historyColumns = $this->columns('pmd_table_status_history');
        if (count(array_diff(['id', 'table_id', 'new_status', 'created_at'], $historyColumns)) > 0) {
            return $this->repairCard(false, 0, 0, 'table status history columns unavailable', 'No completed table visits yet');
        }

        $tableIds = Tables_model::query()
            ->whereHasLocation($this->locationId())
            ->isEnabled()
            ->pluck('table_id')
            ->map(static fn ($id) => (int)$id)
            ->filter()
            ->values()
            ->all();

        if (!$tableIds) {
            return $this->repairCard(true, 0, 0, 'manual table lifecycle history', 'No completed table visits yet');
        }

        $openedAlias = $this->sqlAlias('opened');
        $closedAlias = $this->sqlAlias('closed');

        $closures = DB::table('pmd_table_status_history as opened')
            ->join('pmd_table_status_history as closed', function ($join) {
                $join->on('closed.table_id', '=', 'opened.table_id')
                    ->whereColumn('closed.created_at', '>', 'opened.created_at')
                    ->whereIn(DB::raw('LOWER(TRIM(closed.new_status))'), [
                        'available', 'free', 'cleaning',
                    ]);
            })
            ->whereIn(DB::raw('LOWER(TRIM(opened.new_status))'), [
                'occupied', 'busy', 'active', 'open',
            ])
            ->whereIn('opened.table_id', $tableIds)
            ->groupBy('opened.id', 'opened.created_at')
            ->selectRaw(
                "{$openedAlias}.`id`, {$openedAlias}.`created_at` AS opened_at, ".
                "MIN({$closedAlias}.`created_at`) AS closed_at"
            );

        $row = DB::query()
            ->fromSub($closures, 'pmd_visits')
            ->whereBetween('closed_at', [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ])
            ->whereRaw('TIMESTAMPDIFF(MINUTE, opened_at, closed_at) BETWEEN 1 AND 720')
            ->selectRaw('COUNT(*) AS samples, AVG(TIMESTAMPDIFF(SECOND, opened_at, closed_at)) / 60 AS aggregate')
            ->first();

        $samples = (int)($row->samples ?? 0);
        $value = $row->aggregate === null ? 0 : round((float)$row->aggregate, 1);

        return $this->repairCard(
            true,
            $value,
            $samples,
            'manual table lifecycle: occupied -> first cleaning/free/available',
            $samples ? 'Today · explicit table visits' : 'No completed table visits yet'
        );
    }

    private function repairKitchen(Carbon $start, Carbon $end): array
    {
        if (
            !$this->hasColumns('orders', ['order_id', 'created_at', 'location_id'])
            || !$this->hasColumns('status_history', ['object_id', 'status_id', 'created_at'])
            || !$this->hasColumns('statuses', ['status_id', 'status_name'])
        ) {
            return $this->repairCard(false, 0, 0, 'orders/status_history kitchen source unavailable', 'No completed kitchen tickets yet');
        }

        $statusAlias = $this->sqlAlias('s');
        $historyAlias = $this->sqlAlias('sh');
        $ticketAlias = $this->sqlAlias('pmd_kitchen_ticket');
        $startRegex = 'received|preparation|preparing|kitchen|accepted|cooking|sent';
        $endRegex = 'ready|served|delivery|delivered|completed|complete|done';

        $timestamps = DB::table('status_history as sh')
            ->join('statuses as s', 's.status_id', '=', 'sh.status_id')
            ->whereRaw(
                "LOWER({$statusAlias}.`status_name`) REGEXP '".$startRegex.'|'.$endRegex."'"
            )
            ->when(in_array('status_for', $this->columns('statuses'), true), function ($query) {
                $query->where('s.status_for', 'order');
            })
            ->when(in_array('object_type', $this->columns('status_history'), true), function ($query) {
                $query->where('sh.object_type', Orders_model::make()->getMorphClass());
            })
            ->groupBy('sh.object_id')
            ->selectRaw(
                "{$historyAlias}.`object_id`, ".
                "MIN(CASE WHEN LOWER({$statusAlias}.`status_name`) REGEXP '".$startRegex."' THEN {$historyAlias}.`created_at` END) AS kitchen_at, ".
                "MIN(CASE WHEN LOWER({$statusAlias}.`status_name`) REGEXP '".$endRegex."' THEN {$historyAlias}.`created_at` END) AS ready_at"
            );

        $row = $this->orders()
            ->joinSub($timestamps, 'pmd_kitchen_ticket', 'orders.order_id', '=', 'pmd_kitchen_ticket.object_id')
            ->whereBetween('pmd_kitchen_ticket.kitchen_at', [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ])
            ->whereRaw("{$ticketAlias}.`ready_at` > {$ticketAlias}.`kitchen_at`")
            ->whereRaw("TIMESTAMPDIFF(MINUTE, {$ticketAlias}.`kitchen_at`, {$ticketAlias}.`ready_at`) BETWEEN 1 AND 240")
            ->selectRaw("COUNT(*) AS samples, AVG(TIMESTAMPDIFF(SECOND, {$ticketAlias}.`kitchen_at`, {$ticketAlias}.`ready_at`)) / 60 AS aggregate")
            ->first();

        $samples = (int)($row->samples ?? 0);
        $value = $row->aggregate === null ? 0 : round((float)$row->aggregate, 1);
        $source = 'first kitchen/preparing event -> first ready/served/completed event';

        if ($samples === 0) {
            // Real-data fallback for installations where KDS writes only the
            // terminal Ready/Served transition: order creation -> Ready.
            $readyOnly = DB::table('status_history as sh')
                ->join('statuses as s', 's.status_id', '=', 'sh.status_id')
                ->whereRaw("LOWER({$statusAlias}.`status_name`) REGEXP '".$endRegex."'")
                ->when(in_array('status_for', $this->columns('statuses'), true), function ($query) {
                    $query->where('s.status_for', 'order');
                })
                ->when(in_array('object_type', $this->columns('status_history'), true), function ($query) {
                    $query->where('sh.object_type', Orders_model::make()->getMorphClass());
                })
                ->groupBy('sh.object_id')
                ->selectRaw("{$historyAlias}.`object_id`, MIN({$historyAlias}.`created_at`) AS ready_at");

            $fallback = $this->range($this->orders(), 'created_at', $start, $end)
                ->joinSub($readyOnly, 'pmd_kitchen_ticket', 'orders.order_id', '=', 'pmd_kitchen_ticket.object_id')
                ->whereRaw("{$ticketAlias}.`ready_at` > orders.created_at")
                ->whereRaw("TIMESTAMPDIFF(MINUTE, orders.created_at, {$ticketAlias}.`ready_at`) BETWEEN 1 AND 240")
                ->selectRaw("COUNT(*) AS samples, AVG(TIMESTAMPDIFF(SECOND, orders.created_at, {$ticketAlias}.`ready_at`)) / 60 AS aggregate")
                ->first();

            $samples = (int)($fallback->samples ?? 0);
            $value = $fallback->aggregate === null ? 0 : round((float)$fallback->aggregate, 1);
            $source = 'order created_at -> first ready/served/completed status (fallback)';
        }

        return $this->repairCard(
            true,
            $value,
            $samples,
            $source,
            $samples ? 'Today · completed kitchen tickets' : 'No completed kitchen tickets yet'
        );
    }

    private function repairCard(bool $connected, $value, int $samples, string $source, string $description): array
    {
        return [
            'connected' => $connected,
            'value' => $value,
            'sample_count' => $samples,
            'source' => $source,
            'description' => $description,
        ];
    }
}
