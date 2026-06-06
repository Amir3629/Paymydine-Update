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
            if ($menuId > 0) {
                $currentMenuIds[] = $menuId;
            }
        }

        $prepMap = self::menuPrepMap($currentMenuIds, $defaultPrep);

        $base = 0;
        $totalQty = 0;

        foreach ($items as $item) {
            $menuId = (int)($item['menu_id'] ?? $item['id'] ?? 0);
            $qty = max(1, (int)($item['quantity'] ?? 1));

            $prep = (int)($item['prep_time_minutes'] ?? 0);
            if ($prep <= 0 && $menuId > 0) {
                $prep = (int)($prepMap[$menuId] ?? 0);
            }
            if ($prep <= 0) {
                $prep = $defaultPrep;
            }

            $prep = max(1, min(240, $prep));
            $base = max($base, $prep);
            $totalQty += $qty;
        }

        if ($base <= 0) {
            $base = $defaultPrep;
        }

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

            if ($activeItemCount >= $veryBusyItemThreshold) {
                $kitchenLoadBuffer = $veryBusyExtra;
            } elseif ($activeItemCount >= $busyItemThreshold) {
                $kitchenLoadBuffer = $busyExtra;
            }
        }

        $staff = self::staffBuffer();
        $staffBuffer = (int)$staff['staff_buffer_minutes'];

        $eta = $base + $quantityBuffer + $kitchenLoadBuffer + $staffBuffer;
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
        ];
    }

    protected static function activeKitchenLoad(int $locationId, int $defaultPrep, int $excludeOrderId = 0): array
    {
        $result = [
            'active_order_count' => 0,
            'active_item_count' => 0,
            'active_workload_minutes' => 0,
        ];

        try {
            if (!self::tableExists('orders') || !self::tableExists('order_menus')) {
                return $result;
            }

            $window = self::intSetting('eta_order_load_window_minutes', 30, 1, 1440);

            $orders = DB::table('orders')
                ->select('order_id');

            if (self::columnExists('orders', 'created_at')) {
                $orders->where('created_at', '>=', now()->subMinutes($window));
            }

            if (self::columnExists('orders', 'location_id')) {
                $orders->where('location_id', $locationId);
            }

            if (self::columnExists('orders', 'status_id')) {
                // Conservative default: exclude common completed/cancelled statuses.
                $orders->whereNotIn('status_id', [3, 5, 6, 7, 8, 9]);
            }

            if ($excludeOrderId > 0) {
                $orders->where('order_id', '!=', $excludeOrderId);
            }

            $orderIds = $orders
                ->orderByDesc('order_id')
                ->limit(200)
                ->pluck('order_id')
                ->map(fn ($v) => (int)$v)
                ->filter()
                ->values()
                ->all();

            $result['active_order_count'] = count($orderIds);

            if (empty($orderIds)) {
                return $result;
            }

            $rows = DB::table('order_menus')
                ->select('order_id', 'menu_id', 'quantity')
                ->whereIn('order_id', $orderIds)
                ->get();

            $menuIds = [];
            foreach ($rows as $row) {
                $menuId = (int)($row->menu_id ?? 0);
                if ($menuId > 0) {
                    $menuIds[] = $menuId;
                }
            }

            $prepMap = self::menuPrepMap($menuIds, $defaultPrep);

            foreach ($rows as $row) {
                $qty = max(1, (int)($row->quantity ?? 1));
                $menuId = (int)($row->menu_id ?? 0);
                $prep = (int)($prepMap[$menuId] ?? $defaultPrep);
                $prep = max(1, min(240, $prep));

                $result['active_item_count'] += $qty;
                $result['active_workload_minutes'] += ($qty * $prep);
            }

            return $result;
        } catch (Throwable $e) {
            \Log::warning('PMD_ORDER_ETA_LOAD_FAILED', [
                'message' => $e->getMessage(),
                'location_id' => $locationId,
                'exclude_order_id' => $excludeOrderId,
            ]);

            return $result;
        }
    }

    protected static function menuPrepMap(array $menuIds, int $defaultPrep): array
    {
        $menuIds = array_values(array_unique(array_filter(array_map('intval', $menuIds))));
        if (empty($menuIds)) {
            return [];
        }

        try {
            if (!self::tableExists('menus') || !self::columnExists('menus', 'prep_time_minutes')) {
                return [];
            }

            return DB::table('menus')
                ->whereIn('menu_id', $menuIds)
                ->pluck('prep_time_minutes', 'menu_id')
                ->mapWithKeys(function ($prep, $menuId) use ($defaultPrep) {
                    $prep = (int)$prep;
                    if ($prep <= 0) {
                        $prep = $defaultPrep;
                    }
                    return [(int)$menuId => max(1, min(240, $prep))];
                })
                ->all();
        } catch (Throwable $e) {
            \Log::warning('PMD_ORDER_ETA_MENU_PREP_FAILED', [
                'message' => $e->getMessage(),
            ]);

            return [];
        }
    }

    protected static function staffBuffer(): array
    {
        $enabled = self::boolSetting('eta_use_staff_attendance', false);
        $expected = self::intSetting('eta_expected_kitchen_staff', 2, 1, 100);
        $extra = self::intSetting('eta_understaffed_extra_minutes', 5, 0, 120);

        $result = [
            'checked_in_staff_count' => null,
            'expected_kitchen_staff' => $expected,
            'staff_buffer_minutes' => 0,
            'staff_attendance_enabled' => false,
        ];

        if (!$enabled) {
            return $result;
        }

        try {
            $candidateTables = [
                'staff_attendances',
                'employee_attendances',
                'attendance_logs',
                'biometric_attendances',
            ];

            foreach ($candidateTables as $table) {
                if (!self::tableExists($table)) {
                    continue;
                }

                $q = DB::table($table);

                if (self::columnExists($table, 'checked_out_at')) {
                    $q->whereNull('checked_out_at');
                } elseif (self::columnExists($table, 'check_out_at')) {
                    $q->whereNull('check_out_at');
                } elseif (self::columnExists($table, 'clock_out_at')) {
                    $q->whereNull('clock_out_at');
                }

                if (self::columnExists($table, 'checked_in_at')) {
                    $q->whereNotNull('checked_in_at');
                } elseif (self::columnExists($table, 'check_in_at')) {
                    $q->whereNotNull('check_in_at');
                } elseif (self::columnExists($table, 'clock_in_at')) {
                    $q->whereNotNull('clock_in_at');
                }

                $count = (int)$q->count();

                $result['checked_in_staff_count'] = $count;
                $result['staff_attendance_enabled'] = true;

                if ($count > 0 && $count < $expected) {
                    $result['staff_buffer_minutes'] = $extra;
                }

                return $result;
            }
        } catch (Throwable $e) {
            \Log::warning('PMD_ORDER_ETA_STAFF_ATTENDANCE_FAILED', [
                'message' => $e->getMessage(),
            ]);
        }

        return $result;
    }

    protected static function intSetting(string $key, int $default, int $min = 0, int $max = 9999): int
    {
        try {
            if (!self::tableExists('settings')) {
                return $default;
            }

            $value = DB::table('settings')
                ->where('item', $key)
                ->orderByDesc(self::columnExists('settings', 'setting_id') ? 'setting_id' : 'item')
                ->value('value');

            if ($value === null || $value === '') {
                return $default;
            }

            return max($min, min($max, (int)$value));
        } catch (Throwable $e) {
            return $default;
        }
    }

    protected static function boolSetting(string $key, bool $default): bool
    {
        try {
            if (!self::tableExists('settings')) {
                return $default;
            }

            $value = DB::table('settings')
                ->where('item', $key)
                ->orderByDesc(self::columnExists('settings', 'setting_id') ? 'setting_id' : 'item')
                ->value('value');

            if ($value === null || $value === '') {
                return $default;
            }

            return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
        } catch (Throwable $e) {
            return $default;
        }
    }

    protected static function tableExists(string $table): bool
    {
        try {
            $prefix = DB::connection()->getTablePrefix();
            $physical = $prefix.$table;
            $row = DB::selectOne('SHOW TABLES LIKE ?', [$physical]);
            return !empty($row);
        } catch (Throwable $e) {
            return false;
        }
    }

    protected static function columnExists(string $table, string $column): bool
    {
        try {
            $prefix = DB::connection()->getTablePrefix();
            $physical = str_replace('`', '``', $prefix.$table);
            $rows = DB::select("SHOW COLUMNS FROM `{$physical}` LIKE ?", [$column]);
            return !empty($rows);
        } catch (Throwable $e) {
            return false;
        }
    }

    protected static function roundUp(int $value, int $nearest): int
    {
        $nearest = max(1, $nearest);
        return (int)(ceil($value / $nearest) * $nearest);
    }
}
