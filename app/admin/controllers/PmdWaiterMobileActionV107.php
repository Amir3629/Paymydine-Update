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

            $tables = $this->loadTables();
            $menus = $this->loadMenus();

            $table = null;
            foreach ($tables['rows'] as $t) {
                if ((int)$t['id'] === $tableId || (int)$t['table_id'] === $tableId) {
                    $table = $t;
                    break;
                }
            }

            $menu = null;
            foreach ($menus['rows'] as $m) {
                if ((int)$m['id'] === $menuId || (int)$m['menu_id'] === $menuId) {
                    $menu = $m;
                    break;
                }
            }

            if (!$table || !$menu) {
                return $this->json([
                    'ok' => false,
                    'version' => 'v133',
                    'message' => 'Table or menu item was not found from real enabled sources.',
                    'received' => [
                        'table_id' => $tableId,
                        'menu_id' => $menuId,
                        'qty' => $qty
                    ],
                    'table_found' => !!$table,
                    'menu_found' => !!$menu,
                    'real_tables_loaded' => count($tables['rows']),
                    'real_menu_items_loaded' => count($menus['rows'])
                ]);
            }

            if (!$apply) {
                return $this->json([
                    'ok' => true,
                    'version' => 'v133',
                    'dry_run' => true,
                    'message' => 'Dry run only. Add apply=1 to create a real order item.',
                    'table' => $table,
                    'menu' => $menu,
                    'qty' => $qty
                ]);
            }

            $created = $this->createOrderWithItem($table, $menu, $qty);

            return $this->json([
                'ok' => (bool)($created['ok'] ?? false),
                'version' => 'v133',
                'message' => ($created['ok'] ?? false)
                    ? 'Real waiter order item action completed.'
                    : 'Could not create order item. See details.',
                'result' => $created,
                'table' => $table,
                'menu' => $menu,
                'qty' => $qty
            ]);
        } catch (\Throwable $e) {
            return $this->json([
                'ok' => false,
                'version' => 'v133',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ]);
        }
    }

    public function merge()
    {
        return $this->json([
            'ok' => true,
            'version' => 'v133',
            'message' => 'Merge endpoint is alive. Real persistent merge logic can be connected after final floor/table source is confirmed.'
        ]);
    }

    public function clearMerges()
    {
        return $this->json([
            'ok' => true,
            'version' => 'v133',
            'message' => 'Clear merges endpoint is alive.'
        ]);
    }

    protected function buildPayload($withAudit = false)
    {
        try {
            $tables = $this->loadTables();
            $menus = $this->loadMenus();
            $orders = $this->loadOrdersByTable(array_column($tables['rows'], 'id'));

            $rows = [];
            foreach ($tables['rows'] as $i => $t) {
                $id = (int)$t['id'];
                $o = $orders[$id] ?? ['open_orders' => 0, 'ready' => 0, 'due' => 0];

                $status = 'free';
                if (($o['due'] ?? 0) > 0) {
                    $status = 'unpaid';
                } elseif (($o['ready'] ?? 0) > 0) {
                    $status = 'ready';
                } elseif (($o['open_orders'] ?? 0) > 0) {
                    $status = 'open';
                }

                $t['status'] = $status;
                $t['status_label'] = strtoupper($status === 'open' ? 'DINING' : $status);
                $t['orders'] = (int)($o['open_orders'] ?? 0);
                $t['open_orders'] = (int)($o['open_orders'] ?? 0);
                $t['ready'] = (int)($o['ready'] ?? 0);
                $t['due'] = (float)($o['due'] ?? 0);
                $rows[] = $t;
            }

            $kpis = [
                'tables' => count($rows),
                'assigned' => 0,
                'ready' => array_sum(array_map(fn($t) => (int)($t['ready'] ?? 0), $rows)),
                'active_orders' => array_sum(array_map(fn($t) => (int)($t['open_orders'] ?? 0), $rows)),
                'attention' => 0,
                'checks_due' => array_sum(array_map(fn($t) => (float)($t['due'] ?? 0), $rows)),
                'due' => array_sum(array_map(fn($t) => (float)($t['due'] ?? 0), $rows))
            ];

            $payload = [
                'ok' => true,
                'version' => 'v133',
                'mode' => 'REAL_ADMIN_TABLES_REAL_ADMIN_MENUS',
                'generated_at' => date('c'),
                'source' => [
                    'tables' => $tables['source'],
                    'menus' => $menus['source'],
                    'orders' => 'orders'
                ],
                'kpis' => $kpis,
                'metrics' => [
                    'tables' => $kpis['tables'],
                    'assigned_tables' => $kpis['assigned'],
                    'ready_to_serve' => $kpis['ready'],
                    'active_orders' => $kpis['active_orders'],
                    'needs_attention' => $kpis['attention'],
                    'payments_due' => $kpis['due']
                ],
                'tables' => $rows,
                'floor_tables' => $rows,
                'menu_items' => $menus['rows'],
                'menus' => $menus['rows']
            ];

            if ($withAudit) {
                $payload['audit'] = [
                    'tables_source' => $tables,
                    'menus_source' => $menus,
                    'orders_by_table' => $orders,
                    'filtering_note' => 'Only enabled real dining tables are returned. Virtual rows such as cashier, delivery, takeaway, pickup, kitchen, KDS, POS are filtered out.'
                ];
            }

            return $payload;
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'version' => 'v133',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ];
        }
    }

    protected function loadTables()
    {
        $source = $this->firstTable(['tables', 'restaurant_tables', 'igniter_tables', 'pmd_tables']);
        if (!$source) {
            return [
                'source' => null,
                'rows' => [],
                'error' => 'No real tables table was found.'
            ];
        }

        $cols = $this->cols($source);
        $pk = $this->firstCol($cols, ['table_id', 'id']) ?: $this->firstEndingCol($cols, '_id');
        $nameCol = $this->firstCol($cols, ['table_name', 'name', 'label', 'title']);
        $numberCol = $this->firstCol($cols, ['table_no', 'table_number', 'number', 'sort_order', 'id']);
        $statusCol = $this->firstCol($cols, ['table_status', 'status', 'is_enabled', 'enabled', 'active']);
        $capacityCol = $this->firstCol($cols, ['capacity', 'max_capacity', 'min_capacity', 'seats', 'covers']);
        $typeCol = $this->firstCol($cols, ['type', 'table_type', 'service_type', 'area', 'section']);

        $query = DB::table($source);

        if ($statusCol) {
            $query->whereIn($statusCol, [1, '1', true, 'true', 'yes', 'active', 'enabled', 'available']);
        }

        $raw = $query->limit(1000)->get();

        $kept = [];
        $filtered = [];

        foreach ($raw as $row) {
            $id = (int)$this->val($row, $pk, 0);
            if (!$id) continue;

            $name = trim((string)$this->val($row, $nameCol, ''));
            $numRaw = trim((string)$this->val($row, $numberCol, ''));
            $labelBase = $name ?: $numRaw ?: ('Table ' . $id);

            $number = $this->extractTableNumber($numRaw ?: $name ?: (string)$id);
            $label = $this->prettyTableLabel($labelBase, $number);

            $typeText = trim((string)$this->val($row, $typeCol, ''));

            if ($this->isVirtualTable($labelBase, $typeText)) {
                $filtered[] = [
                    'id' => $id,
                    'label' => $labelBase,
                    'type' => $typeText,
                    'reason' => 'virtual/non-dining row'
                ];
                continue;
            }

            $capacity = (int)$this->val($row, $capacityCol, 4);
            if ($capacity <= 0) $capacity = 4;

            $kept[] = [
                'id' => $id,
                'table_id' => $id,
                'number' => $number ?: (string)$id,
                'table_no' => $number ?: (string)$id,
                'name' => $label,
                'label' => $label,
                'capacity' => $capacity,
                'assigned' => false,
                'source_row' => [
                    'pk' => $pk,
                    'name_col' => $nameCol,
                    'number_col' => $numberCol,
                    'status_col' => $statusCol,
                    'raw_label' => $labelBase
                ]
            ];
        }

        usort($kept, function ($a, $b) {
            $an = is_numeric($a['number']) ? (int)$a['number'] : PHP_INT_MAX;
            $bn = is_numeric($b['number']) ? (int)$b['number'] : PHP_INT_MAX;
            if ($an !== $bn) return $an <=> $bn;
            return strnatcasecmp($a['label'], $b['label']);
        });

        $kept = $this->assignFloorPositions($kept);

        return [
            'source' => $source,
            'columns' => $cols,
            'pk' => $pk,
            'name_col' => $nameCol,
            'number_col' => $numberCol,
            'status_col' => $statusCol,
            'capacity_col' => $capacityCol,
            'type_col' => $typeCol,
            'raw_count' => count($raw),
            'kept_count' => count($kept),
            'filtered_count' => count($filtered),
            'filtered' => $filtered,
            'rows' => $kept
        ];
    }

    protected function loadMenus()
    {
        $source = $this->firstTable(['menus', 'menu_items', 'restaurant_menus', 'igniter_menus']);
        if (!$source) {
            return [
                'source' => null,
                'rows' => [],
                'error' => 'No real menu table was found.'
            ];
        }

        $cols = $this->cols($source);
        $pk = $this->firstCol($cols, ['menu_id', 'id']) ?: $this->firstEndingCol($cols, '_id');
        $nameCol = $this->firstCol($cols, ['menu_name', 'name', 'title', 'label']);
        $priceCol = $this->firstCol($cols, ['menu_price', 'price', 'amount', 'cost']);
        $statusCol = $this->firstCol($cols, ['menu_status', 'status', 'is_enabled', 'enabled', 'active']);

        $query = DB::table($source);

        if ($statusCol) {
            $query->whereIn($statusCol, [1, '1', true, 'true', 'yes', 'active', 'enabled', 'available']);
        }

        $raw = $query->limit(500)->get();
        $rows = [];

        foreach ($raw as $row) {
            $id = (int)$this->val($row, $pk, 0);
            if (!$id) continue;

            $name = trim((string)$this->val($row, $nameCol, ''));
            if ($name === '') $name = 'Menu item ' . $id;

            $price = (float)$this->val($row, $priceCol, 0);

            $rows[] = [
                'id' => $id,
                'menu_id' => $id,
                'name' => $name,
                'menu_name' => $name,
                'title' => $name,
                'price' => $price,
                'menu_price' => $price
            ];
        }

        usort($rows, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));

        return [
            'source' => $source,
            'columns' => $cols,
            'pk' => $pk,
            'name_col' => $nameCol,
            'price_col' => $priceCol,
            'status_col' => $statusCol,
            'raw_count' => count($raw),
            'kept_count' => count($rows),
            'rows' => $rows
        ];
    }

    protected function loadOrdersByTable($tableIds)
    {
        $result = [];
        foreach ($tableIds as $id) {
            $result[(int)$id] = [
                'open_orders' => 0,
                'ready' => 0,
                'due' => 0
            ];
        }

        if (!Schema::hasTable('orders') || empty($tableIds)) {
            return $result;
        }

        $cols = $this->cols('orders');
        $tableCol = $this->firstCol($cols, ['table_id', 'dining_table_id', 'restaurant_table_id']);
        if (!$tableCol) return $result;

        $dateCol = $this->firstCol($cols, ['order_date', 'created_at', 'updated_at']);
        $statusCol = $this->firstCol($cols, ['status', 'order_status', 'status_id', 'order_status_id']);
        $totalCol = $this->firstCol($cols, ['order_total', 'total', 'total_amount', 'order_total_value']);
        $paidCol = $this->firstCol($cols, ['is_paid', 'paid', 'payment_status']);

        $query = DB::table('orders')->whereIn($tableCol, $tableIds);

        if ($dateCol) {
            try {
                $query->whereDate($dateCol, date('Y-m-d'));
            } catch (\Throwable $e) {
                // ignore date filter if DB driver does not support it here
            }
        }

        $orders = $query->limit(1000)->get();

        foreach ($orders as $row) {
            $tid = (int)$this->val($row, $tableCol, 0);
            if (!$tid || !isset($result[$tid])) continue;

            if (!$this->isOpenOrder($row, $statusCol)) continue;

            $result[$tid]['open_orders']++;

            $total = (float)$this->val($row, $totalCol, 0);
            $paidRaw = strtolower(trim((string)$this->val($row, $paidCol, '')));
            $isPaid = in_array($paidRaw, ['1', 'true', 'yes', 'paid', 'complete', 'completed'], true);

            if (!$isPaid && $total > 0) {
                $result[$tid]['due'] += $total;
            }
        }

        return $result;
    }

    protected function createOrderWithItem($table, $menu, $qty)
    {
        if (!Schema::hasTable('orders')) {
            return [
                'ok' => false,
                'step' => 'orders',
                'error' => 'orders table was not found'
            ];
        }

        $ordersCols = $this->cols('orders');
        $orderPk = $this->firstCol($ordersCols, ['order_id', 'id']) ?: 'id';

        $price = (float)($menu['price'] ?? $menu['menu_price'] ?? 0);
        $total = $price * $qty;
        $tableId = (int)$table['id'];

        $order = [];
        $put = function ($col, $val) use (&$order, $ordersCols) {
            if (in_array($col, $ordersCols, true) && !array_key_exists($col, $order)) {
                $order[$col] = $val;
            }
        };

        $put('table_id', $tableId);
        $put('dining_table_id', $tableId);
        $put('restaurant_table_id', $tableId);
        $put('location_id', 1);
        $put('order_type', 'dinein');
        $put('type', 'dinein');
        $put('first_name', 'Waiter');
        $put('last_name', 'Order');
        $put('customer_name', 'Waiter Order');
        $put('order_status_id', 1);
        $put('status_id', 1);
        $put('status', 'pending');
        $put('order_total', $total);
        $put('total', $total);
        $put('total_amount', $total);
        $put('order_date', date('Y-m-d'));
        $put('order_time', date('H:i:s'));
        $put('created_at', date('Y-m-d H:i:s'));
        $put('updated_at', date('Y-m-d H:i:s'));

        try {
            if (empty($order)) {
                return [
                    'ok' => false,
                    'step' => 'orders',
                    'error' => 'No compatible order columns were detected.',
                    'orders_columns' => $ordersCols
                ];
            }

            $orderId = DB::table('orders')->insertGetId($order, $orderPk);
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'step' => 'orders',
                'error' => $e->getMessage(),
                'attempted_insert' => $order,
                'orders_columns' => $ordersCols
            ];
        }

        $itemTable = $this->firstTable(['order_menus', 'order_items', 'order_menu_items', 'igniter_order_menus']);
        if (!$itemTable) {
            return [
                'ok' => true,
                'order_created' => true,
                'order_id' => $orderId,
                'item_inserted' => false,
                'warning' => 'Order was created, but no order item table was found.'
            ];
        }

        $itemCols = $this->cols($itemTable);
        $item = [];
        $putItem = function ($col, $val) use (&$item, $itemCols) {
            if (in_array($col, $itemCols, true) && !array_key_exists($col, $item)) {
                $item[$col] = $val;
            }
        };

        $putItem('order_id', $orderId);
        $putItem('menu_id', (int)$menu['id']);
        $putItem('item_id', (int)$menu['id']);
        $putItem('name', $menu['name']);
        $putItem('menu_name', $menu['name']);
        $putItem('quantity', $qty);
        $putItem('qty', $qty);
        $putItem('price', $price);
        $putItem('menu_price', $price);
        $putItem('subtotal', $total);
        $putItem('total', $total);
        $putItem('created_at', date('Y-m-d H:i:s'));
        $putItem('updated_at', date('Y-m-d H:i:s'));

        try {
            DB::table($itemTable)->insert($item);

            return [
                'ok' => true,
                'order_created' => true,
                'order_id' => $orderId,
                'item_inserted' => true,
                'item_table' => $itemTable,
                'inserted_item' => $item
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'order_created' => true,
                'order_id' => $orderId,
                'item_inserted' => false,
                'item_table' => $itemTable,
                'error' => $e->getMessage(),
                'attempted_item_insert' => $item,
                'item_columns' => $itemCols
            ];
        }
    }

    protected function assignFloorPositions($rows)
    {
        $count = count($rows);
        if ($count === 0) return $rows;

        $cols = $count <= 3 ? $count : 4;
        $cols = max(1, min(4, $cols));
        $rowsCount = (int)ceil($count / $cols);

        $xStart = 16;
        $xEnd = 82;
        $yStart = 18;
        $yGap = $rowsCount <= 1 ? 0 : min(30, 62 / max(1, $rowsCount - 1));

        foreach ($rows as $i => &$row) {
            $col = $i % $cols;
            $r = (int)floor($i / $cols);

            $x = $cols === 1 ? 45 : $xStart + (($xEnd - $xStart) * ($col / max(1, $cols - 1)));
            $y = $rowsCount === 1 ? 32 : $yStart + ($r * $yGap);

            $row['x'] = round($x, 2);
            $row['y'] = round($y, 2);
        }

        return $rows;
    }

    protected function isVirtualTable($label, $type = '')
    {
        $text = strtolower(trim($label . ' ' . $type));

        if ($text === '') return false;

        return (bool)preg_match('/\b(cashier|delivery|deliver|takeaway|take\s*away|pickup|pick\s*up|online|kds|kitchen|pos|counter|bar|driver|collection)\b/i', $text);
    }

    protected function isOpenOrder($row, $statusCol)
    {
        if (!$statusCol) return true;

        $v = $this->val($row, $statusCol, null);
        if ($v === null || $v === '') return true;

        $s = strtolower(trim((string)$v));

        if (is_numeric($s)) {
            $n = (int)$s;
            return in_array($n, [0, 1, 2, 3, 4], true);
        }

        if (preg_match('/cancel|complete|closed|paid|refund|void|failed/i', $s)) {
            return false;
        }

        return true;
    }

    protected function extractTableNumber($value)
    {
        $value = trim((string)$value);
        if ($value === '') return '';

        if (preg_match('/\d+/', $value, $m)) {
            return $m[0];
        }

        return $value;
    }

    protected function prettyTableLabel($label, $number)
    {
        $label = trim((string)$label);
        $number = trim((string)$number);

        if ($number !== '' && preg_match('/^\d+$/', $number)) {
            return 'Table ' . $number;
        }

        if ($label !== '') return $label;

        return $number !== '' ? ('Table ' . $number) : 'Table';
    }

    protected function firstTable($candidates)
    {
        foreach ($candidates as $table) {
            try {
                if (Schema::hasTable($table)) return $table;
            } catch (\Throwable $e) {
                // ignore
            }
        }

        return null;
    }

    protected function cols($table)
    {
        try {
            return array_values(Schema::getColumnListing($table));
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function firstCol($cols, $candidates)
    {
        foreach ($candidates as $c) {
            if (in_array($c, $cols, true)) return $c;
        }
        return null;
    }

    protected function firstEndingCol($cols, $ending)
    {
        foreach ($cols as $c) {
            if (substr($c, -strlen($ending)) === $ending) return $c;
        }
        return null;
    }

    protected function val($row, $col, $default = null)
    {
        if (!$col) return $default;
        $arr = (array)$row;
        return array_key_exists($col, $arr) ? $arr[$col] : $default;
    }

    protected function input($key, $default = null)
    {
        try {
            return request()->input($key, $default);
        } catch (\Throwable $e) {
            return $_GET[$key] ?? $_POST[$key] ?? $default;
        }
    }

    protected function json($payload, $status = 200)
    {
        try {
            return response()->json($payload, $status);
        } catch (\Throwable $e) {
            http_response_code($status);
            header('Content-Type: application/json');
            echo json_encode($payload);
            exit;
        }
    }
}
