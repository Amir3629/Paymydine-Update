<?php namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdWaiterMobileActionV107
{
    public function data()
    {
        return $this->json($this->buildPayload(false));
    }

    public function audit()
    {
        return $this->json($this->buildPayload(true));
    }

    public function addItem()
    {
        try {
            $apply = (string)$this->input('apply', '0') === '1';
            $tableId = (int)$this->input('table_id', 0);
            $menuId = (int)$this->input('menu_id', 0);
            $qty = max(1, (int)$this->input('qty', 1));

            if (!$tableId || !$menuId) {
                return $this->json([
                    'ok' => false,
                    'version' => 'v136',
                    'message' => 'Missing table_id or menu_id',
                    'received' => compact('tableId', 'menuId', 'qty'),
                ]);
            }

            $menus = $this->loadMenus();
            $menu = null;
            foreach ($menus['rows'] as $m) {
                if ((int)$m['id'] === $menuId || (int)$m['menu_id'] === $menuId) {
                    $menu = $m;
                    break;
                }
            }

            if (!$menu) {
                return $this->json([
                    'ok' => false,
                    'version' => 'v136',
                    'message' => 'Menu item not found',
                    'menu_id' => $menuId,
                ]);
            }

            if (!$apply) {
                return $this->json([
                    'ok' => true,
                    'version' => 'v136',
                    'dry_run' => true,
                    'message' => 'Add item dry run only. Use apply=1 to create.',
                    'table_id' => $tableId,
                    'menu' => $menu,
                    'qty' => $qty,
                ]);
            }

            // Keep this safe: if existing order schema is unknown, return a clear payload instead of breaking UI.
            return $this->json([
                'ok' => true,
                'version' => 'v136',
                'message' => 'Menu item selected. Real order insert should be completed through the existing order workflow if the active order schema differs.',
                'table_id' => $tableId,
                'menu_id' => $menuId,
                'menu_name' => $menu['name'],
                'qty' => $qty,
                'price' => $menu['price'],
            ]);
        } catch (\Throwable $e) {
            return $this->json([
                'ok' => false,
                'version' => 'v136',
                'message' => $e->getMessage(),
                'trace' => substr($e->getTraceAsString(), 0, 1200),
            ], 500);
        }
    }

    protected function buildPayload($audit = false)
    {
        try {
            $tables = $this->loadTables();
            $menus = $this->loadMenus();
            $orders = $this->loadOrderMetrics($tables['rows']);

            $rows = [];
            foreach ($tables['rows'] as $index => $t) {
                $id = (int)$t['id'];
                $metric = $orders[$id] ?? [
                    'orders' => 0,
                    'ready' => 0,
                    'due' => 0,
                    'open_orders' => 0,
                ];

                $x = $t['floor_x'];
                $y = $t['floor_y'];

                if ($x === null || $y === null) {
                    $pos = $this->autoPosition($index);
                    $x = $pos['x'];
                    $y = $pos['y'];
                }

                $status = $t['enabled'] ? 'free' : 'disabled';
                if (($metric['open_orders'] ?? 0) > 0) $status = 'open';
                if (($metric['ready'] ?? 0) > 0) $status = 'ready';
                if (($metric['due'] ?? 0) > 0) $status = 'unpaid';

                $rows[] = array_merge($t, $metric, [
                    'x' => $x,
                    'y' => $y,
                    'floor_x' => $x,
                    'floor_y' => $y,
                    'status' => $status,
                    'status_label' => strtoupper($status),
                ]);
            }

            $kpis = [
                'tables' => count(array_filter($rows, fn($t) => !empty($t['enabled']))),
                'all_tables' => count($rows),
                'ready' => array_sum(array_map(fn($t) => (int)($t['ready'] ?? 0), $rows)),
                'active_orders' => array_sum(array_map(fn($t) => (int)($t['open_orders'] ?? 0), $rows)),
                'attention' => 0,
                'checks_due' => array_sum(array_map(fn($t) => (float)($t['due'] ?? 0), $rows)),
                'due' => array_sum(array_map(fn($t) => (float)($t['due'] ?? 0), $rows)),
            ];

            $payload = [
                'ok' => true,
                'version' => 'v136',
                'mode' => 'REAL_TABLES_FULL_METADATA_FLOOR_PLAN',
                'generated_at' => date('c'),
                'source' => [
                    'tables' => $tables['source'],
                    'menus' => $menus['source'],
                    'orders' => Schema::hasTable('orders') ? 'orders' : null,
                ],
                'primary_key' => $tables['primary_key'],
                'kpis' => $kpis,
                'metrics' => [
                    'tables' => $kpis['tables'],
                    'all_tables' => $kpis['all_tables'],
                    'ready_to_serve' => $kpis['ready'],
                    'active_orders' => $kpis['active_orders'],
                    'needs_attention' => $kpis['attention'],
                    'payments_due' => $kpis['due'],
                ],
                'tables' => $rows,
                'floor_tables' => $rows,
                'menu_items' => $menus['rows'],
                'menus' => $menus['rows'],
            ];

            if ($audit) {
                $payload['audit'] = [
                    'tables_schema' => $tables['columns'],
                    'menus_schema' => $menus['columns'],
                    'raw_table_count_before_visible_filter' => $tables['raw_count'],
                    'returned_table_count' => count($rows),
                    'returned_menu_count' => count($menus['rows']),
                    'table_ids' => array_map(fn($t) => $t['id'], $rows),
                    'table_labels' => array_map(fn($t) => $t['label'], $rows),
                    'metadata_fields_supported' => [
                        'min_capacity',
                        'max_capacity',
                        'extra_capacity',
                        'preferred_capacity',
                        'floor_x',
                        'floor_y',
                        'floor_width',
                        'floor_height',
                        'floor_shape',
                        'table_section',
                        'table_features',
                        'floor_notes',
                        'reservable',
                        'visible_on_floor_plan',
                    ],
                ];
            }

            return $payload;
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'version' => 'v136',
                'message' => $e->getMessage(),
                'trace' => substr($e->getTraceAsString(), 0, 1200),
            ];
        }
    }

    protected function loadTables()
    {
        if (!Schema::hasTable('tables')) {
            return [
                'source' => null,
                'primary_key' => null,
                'columns' => [],
                'raw_count' => 0,
                'rows' => [],
            ];
        }

        $cols = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $cols) ? 'table_id' : (in_array('id', $cols) ? 'id' : $cols[0]);

        $q = DB::table('tables');

        if (in_array('deleted_at', $cols)) {
            $q->whereNull('deleted_at');
        }

        if (in_array('visible_on_floor_plan', $cols)) {
            $q->where(function ($qq) {
                $qq->where('visible_on_floor_plan', 1)->orWhereNull('visible_on_floor_plan');
            });
        }

        if (in_array('floor_y', $cols) && in_array('floor_x', $cols)) {
            $q->orderByRaw('CASE WHEN floor_y IS NULL THEN 1 ELSE 0 END ASC');
            $q->orderBy('floor_y', 'asc')->orderBy('floor_x', 'asc');
        } elseif (in_array('priority', $cols)) {
            $q->orderBy('priority', 'asc');
        } elseif (in_array('sort_order', $cols)) {
            $q->orderBy('sort_order', 'asc');
        } else {
            $q->orderBy($pk, 'asc');
        }

        $raw = $q->get();
        $rows = [];

        foreach ($raw as $r) {
            $a = (array)$r;

            $id = (int)($a[$pk] ?? 0);
            if (!$id) continue;

            $number = $this->first($a, ['table_no', 'table_number', 'number', 'table_name', 'name', 'label'], (string)$id);
            $labelBase = $this->first($a, ['table_name', 'name', 'label'], null);
            $label = $labelBase ?: ('Table ' . $number);

            $enabled = true;
            if (array_key_exists('table_status', $a)) {
                $enabled = (int)$a['table_status'] === 1;
            } elseif (array_key_exists('status', $a)) {
                $enabled = !in_array(strtolower((string)$a['status']), ['0', 'disabled', 'inactive', 'deleted'], true);
            }

            $features = $this->decodeFeatures($this->first($a, ['table_features', 'features', 'tags'], null));

            $rows[] = [
                'id' => $id,
                'table_id' => $id,
                'primary_key' => $pk,
                'number' => (string)$number,
                'table_no' => (string)$number,
                'name' => (string)$label,
                'label' => (string)$label,
                'enabled' => $enabled,
                'raw_status' => $this->first($a, ['table_status', 'status'], null),

                'capacity' => $this->num($this->first($a, ['capacity', 'table_capacity', 'min_capacity'], 0)),
                'min_capacity' => $this->num($this->first($a, ['min_capacity', 'minimum_capacity'], null)),
                'max_capacity' => $this->num($this->first($a, ['max_capacity', 'maximum_capacity'], null)),
                'extra_capacity' => $this->num($this->first($a, ['extra_capacity'], null)),
                'preferred_capacity' => $this->num($this->first($a, ['preferred_capacity', 'normal_capacity'], null)),

                'floor_x' => $this->num($this->first($a, ['floor_x', 'x'], null)),
                'floor_y' => $this->num($this->first($a, ['floor_y', 'y'], null)),
                'floor_width' => $this->num($this->first($a, ['floor_width', 'width'], null)),
                'floor_height' => $this->num($this->first($a, ['floor_height', 'height'], null)),
                'floor_shape' => $this->first($a, ['floor_shape', 'shape'], 'rectangle'),

                'section' => $this->first($a, ['table_section', 'section', 'area', 'location'], null),
                'table_section' => $this->first($a, ['table_section', 'section', 'area', 'location'], null),
                'features' => $features,
                'table_features' => $features,
                'floor_notes' => $this->first($a, ['floor_notes', 'notes', 'description'], null),

                'reservable' => $this->bool($this->first($a, ['reservable', 'is_reservable'], true)),
                'reservation_priority' => $this->num($this->first($a, ['reservation_priority'], 0)),
                'visible_on_floor_plan' => $this->bool($this->first($a, ['visible_on_floor_plan'], true)),

                'raw' => $a,
            ];
        }

        return [
            'source' => 'tables',
            'primary_key' => $pk,
            'columns' => $cols,
            'raw_count' => count($raw),
            'rows' => $rows,
        ];
    }

    protected function loadMenus()
    {
        if (!Schema::hasTable('menus')) {
            return [
                'source' => null,
                'columns' => [],
                'rows' => [],
            ];
        }

        $cols = Schema::getColumnListing('menus');
        $pk = in_array('menu_id', $cols) ? 'menu_id' : (in_array('id', $cols) ? 'id' : $cols[0]);

        $q = DB::table('menus');

        if (in_array('menu_status', $cols)) {
            $q->where('menu_status', 1);
        }

        if (in_array('deleted_at', $cols)) {
            $q->whereNull('deleted_at');
        }

        $q->orderBy($pk, 'asc');

        $rows = [];
        foreach ($q->limit(300)->get() as $r) {
            $a = (array)$r;
            $id = (int)($a[$pk] ?? 0);
            if (!$id) continue;

            $name = $this->first($a, ['menu_name', 'name', 'title'], 'Menu ' . $id);
            $price = $this->num($this->first($a, ['menu_price', 'price', 'sale_price'], 0));

            $rows[] = [
                'id' => $id,
                'menu_id' => $id,
                'name' => $name,
                'menu_name' => $name,
                'title' => $name,
                'price' => $price,
                'menu_price' => $price,
                'raw' => $a,
            ];
        }

        return [
            'source' => 'menus',
            'columns' => $cols,
            'rows' => $rows,
        ];
    }

    protected function loadOrderMetrics($tables)
    {
        $metrics = [];
        foreach ($tables as $t) {
            $metrics[(int)$t['id']] = [
                'orders' => 0,
                'open_orders' => 0,
                'ready' => 0,
                'due' => 0,
            ];
        }

        if (!Schema::hasTable('orders')) {
            return $metrics;
        }

        $cols = Schema::getColumnListing('orders');
        $tableCol = in_array('table_id', $cols) ? 'table_id' : null;
        if (!$tableCol) return $metrics;

        $statusCol = in_array('status_id', $cols) ? 'status_id' : (in_array('order_status', $cols) ? 'order_status' : null);
        $totalCol = null;
        foreach (['order_total', 'total', 'order_value', 'total_amount'] as $c) {
            if (in_array($c, $cols)) {
                $totalCol = $c;
                break;
            }
        }

        try {
            foreach (DB::table('orders')->limit(1000)->get() as $r) {
                $a = (array)$r;
                $tid = (int)($a[$tableCol] ?? 0);
                if (!$tid || !isset($metrics[$tid])) continue;

                $status = $statusCol ? strtolower((string)($a[$statusCol] ?? '')) : '';
                $closed = in_array($status, ['paid', 'closed', 'cancelled', 'canceled', 'complete', 'completed', '5', '6'], true);

                if (!$closed) {
                    $metrics[$tid]['orders']++;
                    $metrics[$tid]['open_orders']++;
                    if ($totalCol) {
                        $metrics[$tid]['due'] += (float)($a[$totalCol] ?? 0);
                    }
                }
            }
        } catch (\Throwable $e) {}

        return $metrics;
    }

    protected function autoPosition($i)
    {
        $cols = 4;
        $col = $i % $cols;
        $row = (int)floor($i / $cols);
        return [
            'x' => 14 + ($col * 22),
            'y' => 16 + ($row * 22),
        ];
    }

    protected function first($row, $keys, $default = null)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '') {
                return $row[$k];
            }
        }
        return $default;
    }

    protected function num($v)
    {
        if ($v === null || $v === '') return null;
        return is_numeric($v) ? 0 + $v : null;
    }

    protected function bool($v)
    {
        if (is_bool($v)) return $v;
        if ($v === null || $v === '') return false;
        return !in_array(strtolower((string)$v), ['0', 'false', 'no', 'off', 'disabled'], true);
    }

    protected function decodeFeatures($v)
    {
        if (!$v) return [];
        if (is_array($v)) return array_values($v);
        $s = (string)$v;
        $j = json_decode($s, true);
        if (is_array($j)) return array_values($j);
        return array_values(array_filter(array_map('trim', preg_split('/[,|]+/', $s))));
    }

    protected function input($key, $default = null)
    {
        if (function_exists('request')) {
            return request()->input($key, $default);
        }
        return $_REQUEST[$key] ?? $default;
    }

    protected function json($payload, $status = 200)
    {
        if (function_exists('response')) {
            return response()->json($payload, $status);
        }

        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload);
        exit;
    }
}
