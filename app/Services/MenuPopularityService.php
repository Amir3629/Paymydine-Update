<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MenuPopularityService
{
    /**
     * Return recent top-selling menu ids ranked by sold quantity.
     *
     * When a location is supplied this intentionally mirrors the modern
     * Dashboard2/Pmdreports settled-order contract closely enough for the
     * public Bestseller badge and Guest AI to agree with the owner-facing
     * Top-selling items report without exposing any order/customer rows.
     * Existing callers that omit location keep the historical tenant-wide
     * behaviour for backwards compatibility.
     */
    public function bestsellerStats(
        int $days = 30,
        int $topLimit = 5,
        int $minimumSold = 3,
        ?int $locationId = null
    ): array {
        $days = max(1, min(366, $days));
        $topLimit = max(1, min(250, $topLimit));
        $minimumSold = max(1, $minimumSold);
        $locationId = ($locationId ?? 0) > 0 ? (int)$locationId : null;

        if (!Schema::hasTable('orders') || !Schema::hasTable('order_menus')) {
            return $this->emptyStats($days, $locationId, 'unavailable');
        }

        $orderColumns = Schema::getColumnListing('orders');
        $orderMenuColumns = Schema::getColumnListing('order_menus');
        if (
            !in_array('order_id', $orderColumns, true)
            || !in_array('order_id', $orderMenuColumns, true)
            || !in_array('menu_id', $orderMenuColumns, true)
            || !in_array('quantity', $orderMenuColumns, true)
        ) {
            return $this->emptyStats($days, $locationId, 'unavailable');
        }

        // A requested location is a hard boundary. Never silently fall back to
        // tenant-wide popularity when the schema cannot enforce it.
        if ($locationId !== null && !in_array('location_id', $orderColumns, true)) {
            return $this->emptyStats($days, $locationId, 'location_unavailable');
        }

        $query = DB::table('order_menus as om')
            ->join('orders as o', 'o.order_id', '=', 'om.order_id')
            ->whereNotNull('om.menu_id');

        if ($locationId !== null) {
            $query->where('o.location_id', $locationId);
        }

        $basis = 'created_at';
        if (in_array('settled_at', $orderColumns, true)) {
            $basis = 'settled_at';
            $query
                ->whereNotNull('o.settled_at')
                ->where('o.settled_at', '>=', now()->subDays($days));

            if (in_array('processed', $orderColumns, true)) {
                $query->where('o.processed', 1);
            }
            if (in_array('settlement_status', $orderColumns, true)) {
                $query->whereIn(
                    DB::raw('LOWER(TRIM(settlement_status))'),
                    ['paid', 'settled']
                );
            }
            if (in_array('settled_amount', $orderColumns, true)) {
                $query->where('o.settled_amount', '>=', 0);
            }
        } elseif (in_array('created_at', $orderColumns, true)) {
            $query->where('o.created_at', '>=', now()->subDays($days));
        }

        if (Schema::hasTable('statuses') && in_array('status_id', $orderColumns, true)) {
            $statusColumns = Schema::getColumnListing('statuses');
            if (in_array('status_id', $statusColumns, true) && in_array('status_name', $statusColumns, true)) {
                $excludedStatusIds = DB::table('statuses')
                    ->where(function ($q) {
                        $q->whereRaw('LOWER(status_name) LIKE ?', ['%cancel%'])
                            ->orWhereRaw('LOWER(status_name) LIKE ?', ['%refund%'])
                            ->orWhereRaw('LOWER(status_name) LIKE ?', ['%failed%'])
                            ->orWhereRaw('LOWER(status_name) LIKE ?', ['%void%']);
                    })
                    ->pluck('status_id')
                    ->map(fn ($id) => (int)$id)
                    ->filter()
                    ->values()
                    ->all();

                if ($excludedStatusIds) {
                    $query->whereNotIn('o.status_id', $excludedStatusIds);
                }

                // Legacy schemas without settlement_status still need a
                // positive completion boundary rather than every created order.
                if (!in_array('settlement_status', $orderColumns, true)) {
                    $positiveStatusIds = DB::table('statuses')
                        ->where(function ($q) {
                            $q->whereRaw('LOWER(status_name) LIKE ?', ['%paid%'])
                                ->orWhereRaw('LOWER(status_name) LIKE ?', ['%complete%'])
                                ->orWhereRaw('LOWER(status_name) LIKE ?', ['%closed%']);
                        })
                        ->pluck('status_id')
                        ->map(fn ($id) => (int)$id)
                        ->filter()
                        ->values()
                        ->all();

                    if ($positiveStatusIds) {
                        $query->whereIn('o.status_id', $positiveStatusIds);
                    }
                }
            }
        }

        $rows = $query
            ->select('om.menu_id', DB::raw('SUM(COALESCE(om.quantity, 1)) as sold_qty'))
            ->groupBy('om.menu_id')
            ->havingRaw('SUM(COALESCE(om.quantity, 1)) >= ?', [$minimumSold])
            ->orderByDesc('sold_qty')
            ->limit($topLimit)
            ->get();

        $counts = [];
        foreach ($rows as $row) {
            $menuId = (int)$row->menu_id;
            if ($menuId > 0) {
                $counts[$menuId] = (int)$row->sold_qty;
            }
        }

        return [
            'ids' => array_keys($counts),
            'counts' => $counts,
            'window_days' => $days,
            'location_id' => $locationId,
            'basis' => $basis,
        ];
    }

    private function emptyStats(int $days, ?int $locationId, string $basis): array
    {
        return [
            'ids' => [],
            'counts' => [],
            'window_days' => $days,
            'location_id' => $locationId,
            'basis' => $basis,
        ];
    }
}
