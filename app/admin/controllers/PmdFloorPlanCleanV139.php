<?php namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdFloorPlanCleanV139
{
    public function data()
    {
        return $this->json($this->payload(false));
    }

    public function audit()
    {
        return $this->json($this->payload(true));
    }

    protected function payload($audit = false)
    {
        $warnings = [];
        $tables = $this->loadTables($warnings);
        $menus = $this->loadMenus($warnings);

        $payload = [
            'ok' => true,
            'version' => 'v139-clean-stable',
            'role' => $this->detectRole(),
            'generated_at' => date('c'),
            'tables' => $tables,
            'menu_items' => $menus,
            'menus' => $menus,
            'kpis' => [
                'tables' => count($tables),
                'assigned' => 0,
                'ready' => array_sum(array_map(fn($t) => (int)($t['order']['ready_items'] ?? 0), $tables)),
                'active_orders' => array_sum(array_map(fn($t) => (int)($t['order']['open_orders'] ?? 0), $tables)),
                'attention' => array_sum(array_map(fn($t) => !empty($t['alerts']['waiter_call']) || !empty($t['alerts']['guest_note']) ? 1 : 0, $tables)),
                'checks_due' => array_sum(array_map(fn($t) => (float)($t['order']['due'] ?? 0) > 0 ? 1 : 0, $tables)),
            ],
            'sources' => [
                'tables' => 'tables',
                'menus' => $this->detectMenuTable(),
                'orders' => $this->detectExistingTable(['orders', 'ti_orders', 'order_menus', 'ti_order_menus']),
                'reservations' => $this->detectExistingTable(['reservations', 'ti_reservations', 'reservation_tables']),
                'waiter_calls' => $this->detectExistingTable(['pmd_waiter_calls', 'waiter_calls', 'guest_notes', 'notifications']),
            ],
            'endpoints' => [
                'data' => '/admin/pmd-floor-plan-data',
                'audit' => '/admin/pmd-floor-plan-audit',
                'add_item' => '/admin/pmd-floor-plan-add-item',
                'legacy_add_item' => '/admin/pmd-waiter-floor-v107-add-item',
            ],
            'warnings' => $warnings,
        ];

        if ($audit) {
            $payload['audit'] = [
                'schema' => [
                    'tables_columns' => Schema::hasTable('tables') ? Schema::getColumnListing('tables') : [],
                    'menu_table' => $this->detectMenuTable(),
                ],
                'counts' => [
                    'enabled_visible_tables' => count($tables),
                    'enabled_menu_items' => count($menus),
                ],
                'warnings' => $warnings,
            ];
        }

        return $payload;
    }

    protected function loadTables(&$warnings)
    {
        if (!Schema::hasTable('tables')) {
            $warnings[] = 'Missing tables table.';
            return [];
        }

        $cols = Schema::getColumnListing('tables');
        $has = fn($c) => in_array($c, $cols, true);

        $q = DB::table('tables');

        if ($has('table_status')) {
            $q->where('table_status', 1);
        }

        if ($has('visible_on_floor_plan')) {
            $q->where(function ($x) {
                $x->where('visible_on_floor_plan', 1)->orWhereNull('visible_on_floor_plan');
            });
        }

        if ($has('priority')) {
            $q->orderBy('priority');
        }

        if ($has('table_no')) {
            $q->orderByRaw('CAST(table_no AS UNSIGNED) ASC');
        }

        $rows = $q->get();

        $out = [];
        $autoIndex = 0;

        foreach ($rows as $row) {
            $a = (array)$row;

            $id = (int)($a['table_id'] ?? $a['id'] ?? 0);
            if (!$id) continue;

            $nameRaw = trim((string)($a['table_name'] ?? $a['pos_table_label'] ?? ''));
            $nameLower = strtolower($nameRaw);
            $qr = strtolower(trim((string)($a['qr_code'] ?? '')));

            if (in_array($nameLower, ['cashier', 'delivery'], true) || in_array($qr, ['cashier', 'delivery'], true)) {
                continue;
            }

            $number = $a['table_no'] ?? null;
            $name = $nameRaw ?: ($number ? 'Table '.$number : 'Table '.$id);
            $label = trim((string)($a['pos_table_label'] ?? '')) ?: $name;

            $min = $this->num($a['min_capacity'] ?? null);
            $max = $this->num($a['max_capacity'] ?? null);
            $extra = $this->num($a['extra_capacity'] ?? null);

            if ($min !== null && $max !== null && $min > $max) {
                $warnings[] = "Capacity warning: table {$id} has min_capacity {$min} greater than max_capacity {$max}. Displaying raw values.";
            }

            $floorX = $this->num($a['floor_x'] ?? null);
            $floorY = $this->num($a['floor_y'] ?? null);
            $floorW = $this->num($a['floor_width'] ?? null) ?: 170;
            $floorH = $this->num($a['floor_height'] ?? null) ?: 88;

            if ($floorX === null || $floorY === null) {
                $col = $autoIndex % 4;
                $r = intdiv($autoIndex, 4);
                $floorX = 40 + ($col * 230);
                $floorY = 40 + ($r * 130);
                $warnings[] = "Auto layout used for table {$id}; set floor_x/floor_y in /admin/tables for exact position.";
            }

            $features = $this->parseFeatures($a['table_features'] ?? null);

            $out[] = [
                'id' => $id,
                'table_id' => $id,
                'number' => $number,
                'table_no' => $number,
                'name' => $name,
                'label' => $label,
                'enabled' => true,
                'visible_on_floor_plan' => true,
                'section' => $a['table_section'] ?? 'main',
                'min_capacity' => $min,
                'max_capacity' => $max,
                'extra_capacity' => $extra,
                'preferred_capacity' => $this->num($a['preferred_capacity'] ?? null),
                'capacity_label' => $this->capacityLabel($min, $max, $extra),
                'features' => $features,
                'notes' => $a['floor_notes'] ?? null,
                'reservable' => (bool)($a['reservable'] ?? true),
                'reservation_priority' => (int)($a['reservation_priority'] ?? 0),
                'floor' => [
                    'x' => $floorX,
                    'y' => $floorY,
                    'w' => $floorW,
                    'h' => $floorH,
                    'shape' => $a['floor_shape'] ?? 'rectangle',
                ],
                'reservation' => [
                    'status' => 'none',
                    'next_time' => null,
                    'guest_name' => null,
                    'party_size' => null,
                    'notes' => null,
                ],
                'order' => [
                    'status' => 'free',
                    'open_orders' => 0,
                    'ready_items' => 0,
                    'due' => 0,
                    'last_order_time' => null,
                    'order_ids' => [],
                ],
                'waiter' => [
                    'assigned_to_me' => false,
                    'assigned_waiter_id' => null,
                    'assigned_waiter_name' => null,
                ],
                'alerts' => [
                    'waiter_call' => false,
                    'guest_note' => false,
                    'allergy' => false,
                    'payment_pending' => false,
                ],
            ];

            $autoIndex++;
        }

        return $out;
    }

    protected function loadMenus(&$warnings)
    {
        $table = $this->detectMenuTable();

        if (!$table) {
            $warnings[] = 'No menu source table detected.';
            return [];
        }

        $cols = Schema::getColumnListing($table);
        $has = fn($c) => in_array($c, $cols, true);

        $q = DB::table($table);

        foreach (['menu_status', 'status', 'enabled', 'is_enabled'] as $c) {
            if ($has($c)) {
                $q->where($c, 1);
                break;
            }
        }

        $rows = $q->limit(80)->get();
        $out = [];

        foreach ($rows as $row) {
            $a = (array)$row;
            $id = $a['menu_id'] ?? $a['id'] ?? null;
            if (!$id) continue;

            $name = $a['menu_name'] ?? $a['name'] ?? $a['title'] ?? ('Menu '.$id);
            $price = $a['menu_price'] ?? $a['price'] ?? $a['sale_price'] ?? 0;

            $out[] = [
                'id' => (int)$id,
                'menu_id' => (int)$id,
                'name' => (string)$name,
                'title' => (string)$name,
                'price' => (float)$price,
            ];
        }

        return $out;
    }

    protected function detectMenuTable()
    {
        foreach (['menus', 'menu_items', 'ti_menus', 'ti_menu_items'] as $table) {
            if (Schema::hasTable($table)) return $table;
        }

        return null;
    }

    protected function detectExistingTable($names)
    {
        foreach ($names as $table) {
            if (Schema::hasTable($table)) return $table;
        }

        return null;
    }

    protected function detectRole()
    {
        try {
            if (class_exists('\\AdminAuth') && \AdminAuth::isLogged()) {
                $user = \AdminAuth::getUser();
                $role = strtolower((string)($user->role->code ?? $user->role->name ?? $user->username ?? 'admin'));

                if (str_contains($role, 'kds') || str_contains($role, 'kitchen')) return 'kds';
                if (str_contains($role, 'waiter')) return 'waiter';
                if (str_contains($role, 'manager')) return 'manager';
                if (str_contains($role, 'owner')) return 'owner';
            }
        } catch (\Throwable $e) {}

        return 'admin';
    }

    protected function parseFeatures($raw)
    {
        if (!$raw) return [];

        if (is_array($raw)) return array_values(array_filter($raw));

        $s = trim((string)$raw);
        if ($s === '') return [];

        $json = json_decode($s, true);
        if (is_array($json)) return array_values(array_filter($json));

        return array_values(array_filter(array_map('trim', preg_split('/[,|]/', $s))));
    }

    protected function capacityLabel($min, $max, $extra)
    {
        $bits = [];

        if ($min !== null && $max !== null) {
            if ($min <= $max) $bits[] = $min.'-'.$max;
            else $bits[] = 'min '.$min.' / max '.$max;
        } elseif ($max !== null) {
            $bits[] = 'cap '.$max;
        } elseif ($min !== null) {
            $bits[] = 'min '.$min;
        }

        if ($extra !== null && $extra > 0) {
            $bits[] = '+'.$extra;
        }

        return $bits ? implode(' ', $bits) : 'capacity n/a';
    }

    protected function num($v)
    {
        if ($v === null || $v === '') return null;
        if (!is_numeric($v)) return null;
        return $v + 0;
    }

    protected function json($payload)
    {
        return response()->json($payload);
    }
}
