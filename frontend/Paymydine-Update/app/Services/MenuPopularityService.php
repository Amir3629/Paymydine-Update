<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MenuPopularityService
{
    public function bestsellerStats(int $days = 30, int $topLimit = 5, int $minimumSold = 3): array
    {
        if (!Schema::hasTable('orders') || !Schema::hasTable('order_menus')) {
            return ['ids' => [], 'counts' => []];
        }

        $orderColumns = Schema::getColumnListing('orders');
        $orderMenuColumns = Schema::getColumnListing('order_menus');
        if (!in_array('menu_id', $orderMenuColumns, true) || !in_array('quantity', $orderMenuColumns, true)) {
            return ['ids' => [], 'counts' => []];
        }

        $query = DB::table('order_menus as om')
            ->join('orders as o', 'o.order_id', '=', 'om.order_id')
            ->whereNotNull('om.menu_id')
            ->select('om.menu_id', DB::raw('SUM(COALESCE(om.quantity, 1)) as sold_qty'))
            ->groupBy('om.menu_id')
            ->havingRaw('SUM(COALESCE(om.quantity, 1)) >= ?', [$minimumSold])
            ->orderByDesc('sold_qty')
            ->limit($topLimit);

        if (in_array('created_at', $orderColumns, true)) {
            $query->where('o.created_at', '>=', now()->subDays($days));
        }

        if (Schema::hasTable('statuses') && in_array('status_id', $orderColumns, true)) {
            $statusIds = DB::table('statuses')
                ->where(function ($q) {
                    $q->whereRaw('LOWER(status_name) LIKE ?', ['%paid%'])
                        ->orWhereRaw('LOWER(status_name) LIKE ?', ['%complete%'])
                        ->orWhereRaw('LOWER(status_name) LIKE ?', ['%closed%']);
                })
                ->pluck('status_id')
                ->map(fn ($id) => (int)$id)
                ->all();

            if (!empty($statusIds)) {
                $query->whereIn('o.status_id', $statusIds);
            }
        }

        $rows = $query->get();
        $counts = [];
        foreach ($rows as $row) {
            $counts[(int)$row->menu_id] = (int)$row->sold_qty;
        }

        return ['ids' => array_keys($counts), 'counts' => $counts];
    }
}
