<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Throwable;

class OrderEtaService
{
    public static function calculate(array $items, int $locationId = 1, array $options = []): array
    {
        $defaultPrep = self::intSetting('eta_default_prep_minutes', 15, 1, 240);
        $show = self::boolSetting('enable_customer_eta', true);
        $smart = self::boolSetting('smart_eta_enabled', true);

        $roundTo = self::intSetting('eta_round_to_nearest_minutes', 5, 1, 60);
        $maxMinutes = self::intSetting('eta_max_minutes', 240, 10, 240);

        $busyItemThreshold = self::intSetting(
            'eta_busy_item_threshold',
            self::intSetting('eta_busy_order_threshold', 10, 1, 500),
            1,
            500
        );

        $veryBusyItemThreshold = self::intSetting(
            'eta_very_busy_item_threshold',
            self::intSetting('eta_very_busy_order_threshold', 25, 1, 1000),
            1,
            1000
        );

        $busyExtra = self::intSetting('eta_busy_extra_minutes', 5, 0, 240);
        $veryBusyExtra = self::intSetting('eta_very_busy_extra_minutes', 10, 0, 240);

        $currentMenuIds = [];
        foreach ($items as $item) {
            $menuId = (int)($item['menu_id'] ?? $item['id'] ?? 0);
            if ($menuId > 0) $currentMenuIds[] = $menuId;
        }

        $prepMap = self::menuPrepMap($currentMenuIds, $defaultPrep);
        $base = 0;
        $totalQty = 0;

        foreach ($items as $item) {
            $menuId = (int)($item['menu_id'] ?? $item['id'] ?? 0);
            $qty = max(1, (int)($item['quantity'] ?? 1));
            $prep = (int)($item['prep_time_minutes'] ?? 0);
            if ($prep <= 0 && $menuId > 0) $prep = (int)($prepMap[$menuId] ?? 0);
            if ($prep <= 0) $prep = $defaultPrep;
            $prep = max(1, min(240, $prep));
            $base = max($base, $prep);
            $totalQty += $qty;
        }

        if ($base <= 0) $base = $defaultPrep;
        $quantityBuffer = min(15, max(0, ($totalQty - 1) * 2));

        $activeOrderCount = 0;
        $activeItemCount = 0;
        $activeWorkloadMinutes = 0;
        $kitchenLoadBuffer = 0;

        if ($smart) {
            $load = self::activeKitchenLoad($locationId, $defaultPrep, (int)($options['exclude_order_id'] ?? 0));
            $activeOrderCount = (int)$load['active_order_count'];
            $activeItemCount = (int)$load['active_item_count'];
            $activeWorkloadMinutes = (int)$load['active_workload_minutes'];
            if ($activeItemCount >= $veryBusyItemThreshold) $kitchenLoadBuffer = $veryBusyExtra;
            elseif ($activeItemCount >= $busyItemThreshold) $kitchenLoadBuffer = $busyExtra;
        }

        $staff = self::staffBuffer($locationId);
        $staffBuffer = (int)$staff['staff_buffer_minutes'];
        $pace = $smart ? self::recentPaceBuffer($locationId) : [
            'pace_buffer_minutes' => 0,
            'pace_sample_count' => 0,
            'pace_p75_error_minutes' => 0,
        ];
        $paceBuffer = (int)$pace['pace_buffer_minutes'];

        $eta = $base + $quantityBuffer + $kitchenLoadBuffer + $staffBuffer + $paceBuffer;
        $eta = max(10, min($maxMinutes, $eta));
        $eta = self::roundUp($eta, $roundTo);

        return [
            'show_customer_eta' => $show,
            'eta_minutes' => $eta,
            'base_minutes' => $base,
            'quantity_buffer_minutes' => $quantityBuffer,
            'kitchen_load_buffer_minutes' => $kitchenLoadBuffer,
            'active_order_count' => $activeOrderCount,
            'active_item_count' => $activeItemCount,
            'active_workload_minutes' => $activeWorkloadMinutes,
            'busy_source' => 'items',
            'smart_eta_enabled' => $smart,
            'checked_in_staff_count' => $staff['checked_in_staff_count'],
            'expected_kitchen_staff' => $staff['expected_kitchen_staff'],
            'staff_buffer_minutes' => $staffBuffer,
            'staff_attendance_enabled' => $staff['staff_attendance_enabled'],
            'staff_source' => $staff['staff_source'],
            'staff_confidence' => $staff['staff_confidence'],
            'staff_missing_count' => $staff['staff_missing_count'],
            'pace_buffer_minutes' => $paceBuffer,
            'pace_sample_count' => (int)$pace['pace_sample_count'],
            'pace_p75_error_minutes' => (int)$pace['pace_p75_error_minutes'],
        ];
    }

    protected static function activeKitchenLoad(int $locationId, int $defaultPrep, int $excludeOrderId = 0): array
    {
        $result = ['active_order_count' => 0, 'active_item_count' => 0, 'active_workload_minutes' => 0];
        try {
            if (!self::tableExists('orders') || !self::tableExists('order_menus')) return $result;
            $window = self::intSetting('eta_order_load_window_minutes', 30, 1, 1440);
            $orders = DB::table('orders as o')->select('o.order_id');

            if (self::columnExists('orders', 'created_at')) $orders->where('o.created_at', '>=', now()->subMinutes($window));
            if (self::columnExists('orders', 'location_id')) $orders->where('o.location_id', $locationId);
            // Payment-held R60T orders are not kitchen load yet.
            if (self::columnExists('orders', 'processed')) $orders->where('o.processed', 1);
            if (self::tableExists('statuses') && self::columnExists('orders', 'status_id')) {
                $orders->join('statuses as s', 's.status_id', '=', 'o.status_id')
                    ->whereIn(DB::raw('LOWER(s.status_name)'), ['received', 'preparation', 'preparing']);
            } elseif (self::columnExists('orders', 'status_id')) {
                $orders->whereNotIn('o.status_id', [3, 5, 6, 7, 8, 9]);
            }
            if (self::columnExists('orders', 'kitchen_ready_at')) $orders->whereNull('o.kitchen_ready_at');
            if ($excludeOrderId > 0) $orders->where('o.order_id', '!=', $excludeOrderId);

            $orderIds = $orders->orderByDesc('o.order_id')->limit(200)->pluck('o.order_id')
                ->map(fn ($v) => (int)$v)->filter()->values()->all();
            $result['active_order_count'] = count($orderIds);
            if (empty($orderIds)) return $result;

            $rows = DB::table('order_menus')->select('order_id', 'menu_id', 'quantity')->whereIn('order_id', $orderIds)->get();
            $menuIds = [];
            foreach ($rows as $row) {
                $menuId = (int)($row->menu_id ?? 0);
                if ($menuId > 0) $menuIds[] = $menuId;
            }
            $prepMap = self::menuPrepMap($menuIds, $defaultPrep);
            foreach ($rows as $row) {
                $qty = max(1, (int)($row->quantity ?? 1));
                $menuId = (int)($row->menu_id ?? 0);
                $prep = max(1, min(240, (int)($prepMap[$menuId] ?? $defaultPrep)));
                $result['active_item_count'] += $qty;
                $result['active_workload_minutes'] += ($qty * $prep);
            }
            return $result;
        } catch (Throwable $e) {
            \Log::warning('PMD_ORDER_ETA_LOAD_FAILED', [
                'message' => $e->getMessage(), 'location_id' => $locationId, 'exclude_order_id' => $excludeOrderId,
            ]);
            return $result;
        }
    }

    protected static function menuPrepMap(array $menuIds, int $defaultPrep): array
    {
        $menuIds = array_values(array_unique(array_filter(array_map('intval', $menuIds))));
        if (empty($menuIds)) return [];
        try {
            if (!self::tableExists('menus') || !self::columnExists('menus', 'prep_time_minutes')) return [];
            return DB::table('menus')->whereIn('menu_id', $menuIds)->pluck('prep_time_minutes', 'menu_id')
                ->mapWithKeys(function ($prep, $menuId) use ($defaultPrep) {
                    $prep = (int)$prep;
                    if ($prep <= 0) $prep = $defaultPrep;
                    return [(int)$menuId => max(1, min(240, $prep))];
                })->all();
        } catch (Throwable $e) {
            \Log::warning('PMD_ORDER_ETA_MENU_PREP_FAILED', ['message' => $e->getMessage()]);
            return [];
        }
    }

    protected static function staffBuffer(int $locationId): array
    {
        $result = [
            'checked_in_staff_count' => null,
            'expected_kitchen_staff' => null,
            'staff_buffer_minutes' => 0,
            'staff_attendance_enabled' => false,
            'staff_source' => 'unknown',
            'staff_confidence' => 'low',
            'staff_missing_count' => 0,
        ];

        try {
            $snapshot = app(PmdKitchenWorkforceService::class)->snapshot(max(1, $locationId));
            $actual = $snapshot['actual_count'];
            $expected = $snapshot['expected_count'];
            $missing = max(0, (int)($snapshot['missing_count'] ?? 0));
            $result['checked_in_staff_count'] = $actual === null ? null : (int)$actual;
            $result['expected_kitchen_staff'] = $expected === null ? null : (int)$expected;
            $result['staff_attendance_enabled'] = in_array((string)($snapshot['source'] ?? ''), ['confirmed_shift', 'attendance'], true);
            $result['staff_source'] = (string)($snapshot['source'] ?? 'unknown');
            $result['staff_confidence'] = (string)($snapshot['confidence'] ?? 'low');
            $result['staff_missing_count'] = $missing;

            // Never treat a plan/baseline as proven absence. Only confirmed or
            // observed shortages may add a bounded delay.
            if ($missing > 0 && in_array($result['staff_source'], ['confirmed_shift', 'attendance'], true)) {
                $perPerson = self::intSetting('pmd_eta_staff_shortage_minutes_per_person', 4, 1, 15);
                $result['staff_buffer_minutes'] = min(20, $missing * $perPerson);
            }
        } catch (Throwable $e) {
            \Log::warning('PMD_ORDER_ETA_WORKFORCE_FAILED', ['message' => $e->getMessage(), 'location_id' => $locationId]);
        }
        return $result;
    }

    protected static function recentPaceBuffer(int $locationId): array
    {
        $result = ['pace_buffer_minutes' => 0, 'pace_sample_count' => 0, 'pace_p75_error_minutes' => 0];
        try {
            if (!self::tableExists('orders')
                || !self::columnExists('orders', 'kitchen_released_at')
                || !self::columnExists('orders', 'kitchen_ready_at')
                || !self::columnExists('orders', 'eta_initial_minutes')) return $result;

            $rows = DB::table('orders')
                ->where('location_id', $locationId)
                ->whereNotNull('kitchen_released_at')
                ->whereNotNull('kitchen_ready_at')
                ->whereNotNull('eta_initial_minutes')
                ->where('kitchen_ready_at', '>=', now()->subHours(4))
                ->orderByDesc('kitchen_ready_at')->limit(24)
                ->get(['kitchen_released_at', 'kitchen_ready_at', 'eta_initial_minutes']);

            $errors = [];
            foreach ($rows as $row) {
                $initial = max(1, (int)($row->eta_initial_minutes ?? 0));
                $start = strtotime((string)$row->kitchen_released_at);
                $ready = strtotime((string)$row->kitchen_ready_at);
                if (!$start || !$ready || $ready <= $start) continue;
                $actual = (int)ceil(($ready - $start) / 60);
                if ($actual < 1 || $actual > 360) continue;
                $errors[] = $actual - $initial;
            }

            $result['pace_sample_count'] = count($errors);
            if (count($errors) < 5) return $result;
            sort($errors, SORT_NUMERIC);
            $index = (int)floor((count($errors) - 1) * 0.75);
            $p75 = (int)$errors[max(0, min(count($errors) - 1, $index))];
            $result['pace_p75_error_minutes'] = $p75;
            if ($p75 >= 3) $result['pace_buffer_minutes'] = min(15, self::roundUp($p75, 5));
        } catch (Throwable $e) {
            \Log::warning('PMD_ORDER_ETA_RECENT_PACE_FAILED', ['message' => $e->getMessage(), 'location_id' => $locationId]);
        }
        return $result;
    }

    protected static function intSetting(string $key, int $default, int $min = 0, int $max = 9999): int
    {
        try {
            if (!self::tableExists('settings')) return $default;
            $value = DB::table('settings')->where('item', $key)
                ->orderByDesc(self::columnExists('settings', 'setting_id') ? 'setting_id' : 'item')->value('value');
            if ($value === null || $value === '') return $default;
            return max($min, min($max, (int)$value));
        } catch (Throwable $e) { return $default; }
    }

    protected static function boolSetting(string $key, bool $default): bool
    {
        try {
            if (!self::tableExists('settings')) return $default;
            $value = DB::table('settings')->where('item', $key)
                ->orderByDesc(self::columnExists('settings', 'setting_id') ? 'setting_id' : 'item')->value('value');
            if ($value === null || $value === '') return $default;
            return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
        } catch (Throwable $e) { return $default; }
    }

    protected static function tableExists(string $table): bool
    {
        try {
            $prefix = DB::connection()->getTablePrefix();
            return !empty(DB::selectOne('SHOW TABLES LIKE ?', [$prefix.$table]));
        } catch (Throwable $e) { return false; }
    }

    protected static function columnExists(string $table, string $column): bool
    {
        try {
            $prefix = DB::connection()->getTablePrefix();
            $physical = str_replace('`', '``', $prefix.$table);
            return !empty(DB::select("SHOW COLUMNS FROM `{$physical}` LIKE ?", [$column]));
        } catch (Throwable $e) { return false; }
    }

    protected static function roundUp(int $value, int $nearest): int
    {
        $nearest = max(1, $nearest);
        return (int)(ceil($value / $nearest) * $nearest);
    }
}
