<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdWaiterPosV1 extends AdminController
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);
        if (!$table) {
            return response('Table not found.', 404);
        }

        return view()->file(base_path('app/admin/views/waiter_pos.blade.php'), [
            'bootstrap' => $this->payload($table),
        ]);
    }

    public function data($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);
        if (!$table) {
            return response()->json(['ok' => false, 'message' => 'Table not found.'], 404);
        }

        return response()->json($this->payload($table));
    }

    public function save($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);
        if (!$table) {
            return response()->json(['ok' => false, 'message' => 'Table not found.'], 404);
        }

        $payload = request()->json()->all();
        if (!$payload) {
            $payload = request()->all();
        }

        $mode = strtolower(trim((string)($payload['mode'] ?? 'send')));
        if (!in_array($mode, ['hold', 'send'], true)) {
            $mode = 'send';
        }

        $cart = $payload['items'] ?? [];
        if (!is_array($cart) || count($cart) < 1) {
            return response()->json(['ok' => false, 'message' => 'Add at least one item.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($table, $payload, $cart, $mode) {
                $order = $this->resolveWritableOrder($table, (int)($payload['order_id'] ?? 0));
                $isNew = !$order;

                if (!$order) {
                    $order = new Orders_model();
                    $this->fillNewOrder($order, $table, $payload, $mode);
                    $order->saveOrFail();
                    $this->ensureBaseTotals($order);
                }

                $added = $this->appendItems($order, $cart);
                if ($added < 1) {
                    throw new \RuntimeException('No valid menu items were added.');
                }

                $note = trim((string)($payload['note'] ?? ''));
                if ($note !== '' && Schema::hasColumn('orders', 'comment')) {
                    $existing = trim((string)($order->comment ?? ''));
                    $order->comment = $existing === '' ? $note : ($existing."\n".$note);
                }

                if (Schema::hasColumn('orders', 'guest_count')) {
                    $order->guest_count = max(1, min(99, (int)($payload['guest_count'] ?? 1)));
                }

                $statusId = $this->resolveStatusId($mode);
                if ($statusId && Schema::hasColumn('orders', 'status_id')) {
                    $order->status_id = $statusId;
                }
                if (Schema::hasColumn('orders', 'processed')) {
                    $order->processed = $mode === 'send';
                }
                $order->save();

                $this->recalculateOrder($order);

                if ($statusId && method_exists($order, 'addStatusHistory')) {
                    try {
                        $order->addStatusHistory($statusId, [
                            'comment' => $mode === 'send'
                                ? 'Sent from PayMyDine Waiter POS'
                                : 'Held from PayMyDine Waiter POS',
                            'notify' => false,
                        ]);
                    } catch (\Throwable $ignored) {
                    }
                }

                $order->refresh();

                return [
                    'ok' => true,
                    'version' => 'pmd-waiter-pos-v1',
                    'mode' => $mode,
                    'created' => $isNew,
                    'order_id' => (int)$order->getKey(),
                    'order_total' => (float)($order->order_total ?? 0),
                    'total_items' => (int)($order->total_items ?? 0),
                    'message' => $mode === 'send' ? 'Order sent to kitchen.' : 'Order held.',
                    'urls' => [
                        'edit' => '/admin/orders/edit/'.(int)$order->getKey(),
                        'dashboard' => '/admin/dashboardwaiter',
                        'payment' => '/admin/payments?order_id='.(int)$order->getKey(),
                        'invoice' => '/admin/orders/invoice/'.(int)$order->getKey(),
                    ],
                ];
            });

            return response()->json($result);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'version' => 'pmd-waiter-pos-v1',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    protected function payload(array $table): array
    {
        $orders = $this->openOrdersForTable($table);
        $menu = $this->menuPayload((int)($table['location_id'] ?? 0));
        $user = $this->userPayload();

        return [
            'ok' => true,
            'version' => 'pmd-waiter-pos-v1',
            'table' => $table,
            'user' => $user,
            'open_orders' => $orders,
            'active_order_id' => count($orders) ? (int)$orders[0]['order_id'] : null,
            'categories' => $menu['categories'],
            'menu_items' => $menu['items'],
            'settings' => [
                'currency' => function_exists('currency') ? currency()->getDefault()->currency_symbol : '€',
                'refresh_ms' => 15000,
                'dashboard_url' => '/admin/dashboardwaiter',
                'save_url' => '/admin/pmd-waiter-pos-v1/save/'.(int)$table['id'],
                'data_url' => '/admin/pmd-waiter-pos-v1/data/'.(int)$table['id'],
            ],
        ];
    }

    protected function resolveTable(int $tableId): ?array
    {
        if ($tableId < 1 || !Schema::hasTable('tables')) {
            return null;
        }

        $cols = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $cols, true) ? 'table_id' : (in_array('id', $cols, true) ? 'id' : null);
        if (!$pk) {
            return null;
        }

        // The waiter floor sends the visible table number, not always the DB primary key.
        $numberColumn = in_array('table_no', $cols, true)
            ? 'table_no'
            : (in_array('table_number', $cols, true) ? 'table_number' : null);

        $row = $numberColumn
            ? DB::table('tables')->where($numberColumn, $tableId)->first()
            : null;
        if (!$row) {
            $row = DB::table('tables')->where($pk, $tableId)->first();
        }
        if (!$row) {
            return null;
        }

        $r = (array)$row;
        $number = $r['table_no'] ?? $r['table_number'] ?? $r[$pk] ?? $tableId;
        $name = trim((string)($r['table_name'] ?? $r['name'] ?? $r['label'] ?? ''));
        if ($name === '') {
            $name = 'Table '.$number;
        }

        return [
            'id' => (int)$r[$pk],
            'number' => (string)$number,
            'name' => $name,
            'capacity' => (int)($r['capacity'] ?? $r['table_capacity'] ?? $r['preferred_capacity'] ?? 0),
            'location_id' => (int)($r['location_id'] ?? 0),
            'section' => (string)($r['table_section'] ?? $r['table_zone'] ?? ''),
        ];
    }

    protected function userPayload(): array
    {
        $user = null;
        try {
            $user = AdminAuth::getUser();
        } catch (\Throwable $ignored) {
        }

        return [
            'id' => $user ? (int)$user->getKey() : null,
            'name' => $user ? (string)($user->name ?? $user->username ?? $user->email ?? 'Waiter') : 'Waiter',
        ];
    }

    protected function menuPayload(int $locationId): array
    {
        $query = Menus_model::with(['categories', 'menu_options.menu_option_values.option_value'])
            ->where('menu_status', 1)
            ->orderBy('menu_priority')
            ->orderBy('menu_name');

        if (Schema::hasColumn('menus', 'is_stock_out')) {
            $query->where(function ($q) {
                $q->whereNull('is_stock_out')->orWhere('is_stock_out', 0);
            });
        }

        $rows = $query->limit(500)->get();
        $categories = [];
        $items = [];

        foreach ($rows as $menu) {
            $menuCategories = [];
            foreach (($menu->categories ?: collect()) as $category) {
                $categoryId = (int)($category->category_id ?? $category->getKey());
                $categoryName = trim((string)($category->name ?? $category->category_name ?? 'Menu'));
                if (!$categoryId) {
                    continue;
                }
                $categories[$categoryId] = ['id' => $categoryId, 'name' => $categoryName ?: 'Menu'];
                $menuCategories[] = $categoryId;
            }

            $options = [];
            foreach (($menu->menu_options ?: collect()) as $option) {
                $values = [];
                foreach (($option->menu_option_values ?: collect()) as $value) {
                    $valueId = (int)($value->menu_option_value_id ?? $value->getKey());
                    if (!$valueId) {
                        continue;
                    }
                    $values[] = [
                        'id' => $valueId,
                        'name' => (string)($value->name ?? optional($value->option_value)->value ?? 'Option'),
                        'price' => (float)($value->price ?? $value->new_price ?? 0),
                        'default' => (bool)($value->is_default ?? false),
                    ];
                }
                if ($values) {
                    $options[] = [
                        'id' => (int)($option->menu_option_id ?? $option->getKey()),
                        'name' => (string)($option->option_name ?? optional($option->option)->option_name ?? 'Options'),
                        'required' => (bool)($option->required ?? false),
                        'min' => (int)($option->min_selected ?? 0),
                        'max' => max(1, (int)($option->max_selected ?? 1)),
                        'display_type' => (string)($option->display_type ?? 'radio'),
                        'values' => $values,
                    ];
                }
            }

            $items[] = [
                'id' => (int)$menu->getKey(),
                'name' => (string)$menu->menu_name,
                'description' => trim(strip_tags((string)($menu->menu_description ?? ''))),
                'price' => (float)$menu->menu_price,
                'category_ids' => $menuCategories,
                'options' => $options,
                'has_options' => count($options) > 0,
                'prep_minutes' => (int)($menu->prep_time_minutes ?? 0),
            ];
        }

        if (!$categories) {
            $categories[0] = ['id' => 0, 'name' => 'All items'];
        }

        return [
            'categories' => array_values($categories),
            'items' => $items,
        ];
    }

    protected function openOrdersForTable(array $table): array
    {
        if (!Schema::hasTable('orders')) {
            return [];
        }

        $cols = Schema::getColumnListing('orders');
        $q = DB::table('orders');
        $this->applyTableScope($q, $cols, $table);
        $this->applyOpenScope($q, $cols);

        $rows = $q->orderByDesc(in_array('order_id', $cols, true) ? 'order_id' : 'id')->limit(20)->get();
        $out = [];

        foreach ($rows as $row) {
            $r = (array)$row;
            $id = (int)($r['order_id'] ?? $r['id'] ?? 0);
            $items = [];
            if ($id && Schema::hasTable('order_menus')) {
                $items = DB::table('order_menus')->where('order_id', $id)->get()->map(function ($item) {
                    $i = (array)$item;
                    return [
                        'id' => (int)($i['order_menu_id'] ?? 0),
                        'menu_id' => (int)($i['menu_id'] ?? 0),
                        'name' => (string)($i['name'] ?? 'Item'),
                        'quantity' => (int)($i['quantity'] ?? 1),
                        'subtotal' => (float)($i['subtotal'] ?? 0),
                        'comment' => (string)($i['comment'] ?? ''),
                    ];
                })->values()->all();
            }

            $out[] = [
                'order_id' => $id,
                'status_id' => $r['status_id'] ?? null,
                'total' => (float)($r['order_total'] ?? $r['total'] ?? 0),
                'total_items' => (int)($r['total_items'] ?? 0),
                'created_at' => (string)($r['created_at'] ?? ''),
                'comment' => (string)($r['comment'] ?? ''),
                'items' => $items,
            ];
        }

        return $out;
    }

    protected function resolveWritableOrder(array $table, int $requestedOrderId): ?Orders_model
    {
        if ($requestedOrderId > 0) {
            $order = Orders_model::find($requestedOrderId);
            if ($order && $this->orderBelongsToTable($order, $table) && $this->orderIsOpen($order)) {
                return $order;
            }
        }

        $rows = $this->openOrdersForTable($table);
        if (!$rows) {
            return null;
        }

        return Orders_model::find((int)$rows[0]['order_id']);
    }

    protected function fillNewOrder(Orders_model $order, array $table, array $payload, string $mode): void
    {
        $cols = Schema::getColumnListing('orders');
        $statusId = $this->resolveStatusId($mode);
        $locationId = (int)($table['location_id'] ?: ($payload['location_id'] ?? 0));
        if ($locationId < 1 && Schema::hasTable('locations')) {
            $locationId = (int)(DB::table('locations')->value('location_id') ?: 1);
        }

        $data = [
            'location_id' => $locationId ?: 1,
            'table_id' => (int)$table['id'],
            'order_type' => (string)$table['name'],
            'status_id' => $statusId,
            'payment' => 'cod',
            'order_date' => date('Y-m-d'),
            'order_time' => date('H:i:s'),
            'order_time_is_asap' => 1,
            'processed' => $mode === 'send' ? 1 : 0,
            'first_name' => 'Walk-in',
            'last_name' => '',
            'email' => '',
            'telephone' => '',
            'comment' => trim((string)($payload['note'] ?? '')),
            'total_items' => 0,
            'order_total' => 0,
        ];

        foreach ($data as $key => $value) {
            if (in_array($key, $cols, true) && $value !== null) {
                $order->{$key} = $value;
            }
        }
    }

    protected function appendItems(Orders_model $order, array $cart): int
    {
        $added = 0;
        foreach ($cart as $row) {
            if (!is_array($row)) {
                continue;
            }

            $menuId = (int)($row['menu_id'] ?? $row['id'] ?? 0);
            $qty = max(1, min(99, (int)($row['quantity'] ?? $row['qty'] ?? 1)));
            if ($menuId < 1) {
                continue;
            }

            $menu = Menus_model::with('menu_options.menu_option_values.option_value')->find($menuId);
            if (!$menu || !(bool)$menu->menu_status || (Schema::hasColumn('menus', 'is_stock_out') && (bool)$menu->is_stock_out)) {
                continue;
            }

            $basePrice = (float)$menu->menu_price;
            $optionRows = $this->validatedOptions($menu, $row['options'] ?? [], $qty);
            $optionUnit = array_sum(array_map(function ($option) {
                return (float)$option['price'];
            }, $optionRows));
            $unit = $basePrice + $optionUnit;

            $orderMenuId = DB::table('order_menus')->insertGetId([
                'order_id' => (int)$order->getKey(),
                'menu_id' => $menuId,
                'name' => (string)$menu->menu_name,
                'quantity' => $qty,
                'price' => $unit,
                'subtotal' => $unit * $qty,
                'comment' => trim((string)($row['comment'] ?? '')),
                'option_values' => serialize(array_column($optionRows, 'value_id')),
            ]);

            foreach ($optionRows as $option) {
                DB::table('order_menu_options')->insert([
                    'order_menu_id' => $orderMenuId,
                    'order_id' => (int)$order->getKey(),
                    'menu_id' => $menuId,
                    'order_menu_option_id' => (int)$option['option_id'],
                    'menu_option_value_id' => (int)$option['value_id'],
                    'order_option_name' => (string)$option['name'],
                    'order_option_price' => (float)$option['price'],
                    'quantity' => $qty,
                ]);
            }
            $added++;
        }

        return $added;
    }

    protected function validatedOptions(Menus_model $menu, $selected, int $qty): array
    {
        if (!is_array($selected)) {
            return [];
        }

        $selectedIds = array_values(array_unique(array_filter(array_map('intval', $selected))));
        if (!$selectedIds) {
            return [];
        }

        $out = [];
        foreach (($menu->menu_options ?: collect()) as $option) {
            foreach (($option->menu_option_values ?: collect()) as $value) {
                $valueId = (int)($value->menu_option_value_id ?? $value->getKey());
                if (!in_array($valueId, $selectedIds, true)) {
                    continue;
                }
                $out[] = [
                    'option_id' => (int)($option->menu_option_id ?? $option->getKey()),
                    'value_id' => $valueId,
                    'name' => (string)($value->name ?? optional($value->option_value)->value ?? 'Option'),
                    'price' => (float)($value->price ?? $value->new_price ?? 0),
                ];
            }
        }

        return $out;
    }

    protected function ensureBaseTotals(Orders_model $order): void
    {
        if (!Schema::hasTable('order_totals')) {
            return;
        }

        $this->upsertTotal($order, 'subtotal', 'Subtotal', 0, 10, false);
        $this->upsertTotal($order, 'total', 'Total', 0, 999, false);
    }

    protected function recalculateOrder(Orders_model $order): void
    {
        $subtotal = (float)DB::table('order_menus')->where('order_id', $order->getKey())->sum('subtotal');
        $tax = $this->taxAmount($subtotal);
        if ($tax > 0) {
            $this->upsertTotal($order, 'tax', 'Tax', $tax, 20, true);
        }
        $this->upsertTotal($order, 'subtotal', 'Subtotal', $subtotal, 10, false);
        $this->upsertTotal($order, 'total', 'Total', $subtotal + $tax, 999, false);
        $order->calculateTotals();
    }

    protected function upsertTotal(Orders_model $order, string $code, string $title, float $value, int $priority, bool $summable): void
    {
        if (!Schema::hasTable('order_totals')) {
            return;
        }

        $cols = Schema::getColumnListing('order_totals');
        $data = [
            'title' => $title,
            'value' => $value,
            'priority' => $priority,
            'is_summable' => $summable ? 1 : 0,
        ];
        $data = array_intersect_key($data, array_flip($cols));
        DB::table('order_totals')->updateOrInsert([
            'order_id' => (int)$order->getKey(),
            'code' => $code,
        ], $data);
    }

    protected function taxAmount(float $subtotal): float
    {
        $enabled = (bool)setting('tax_mode', false);
        $percentage = (float)setting('tax_percentage', 0);
        $menuPriceMode = (int)setting('tax_menu_price', 1);
        return $enabled && $percentage > 0 && $menuPriceMode === 1
            ? round($subtotal * ($percentage / 100), 2)
            : 0.0;
    }

    protected function resolveStatusId(string $mode): ?int
    {
        if (!Schema::hasTable('statuses')) {
            return (int)(setting('default_order_status') ?: 0) ?: null;
        }

        $cols = Schema::getColumnListing('statuses');
        $idCol = in_array('status_id', $cols, true) ? 'status_id' : 'id';
        $nameCol = in_array('status_name', $cols, true) ? 'status_name' : (in_array('name', $cols, true) ? 'name' : null);
        $q = DB::table('statuses');
        if (in_array('status_for', $cols, true)) {
            $q->where('status_for', 'order');
        }

        if ($nameCol) {
            $patterns = $mode === 'hold'
                ? ['hold', 'draft', 'pending']
                : ['received', 'accepted', 'confirmed', 'processing'];
            foreach ($patterns as $pattern) {
                $row = (clone $q)->whereRaw('LOWER('.$nameCol.') LIKE ?', ['%'.$pattern.'%'])->first();
                if ($row) {
                    return (int)$row->{$idCol};
                }
            }
        }

        $configured = (int)(setting('default_order_status') ?: 0);
        if ($configured > 0) {
            return $configured;
        }

        $row = $q->orderBy($idCol)->first();
        return $row ? (int)$row->{$idCol} : null;
    }

    protected function applyTableScope($query, array $cols, array $table): void
    {
        $query->where(function ($q) use ($cols, $table) {
            $did = false;
            if (in_array('table_id', $cols, true)) {
                $q->where('table_id', (int)$table['id']);
                $did = true;
            }
            if (in_array('order_type', $cols, true)) {
                $values = array_values(array_unique(array_filter([
                    (string)$table['id'],
                    (string)$table['number'],
                    (string)$table['name'],
                    'Table '.(string)$table['number'],
                ])));
                if ($did) {
                    $q->orWhereIn('order_type', $values);
                } else {
                    $q->whereIn('order_type', $values);
                }
            }
        });
    }

    protected function applyOpenScope($query, array $cols): void
    {
        if (in_array('processed', $cols, true)) {
            $query->where(function ($q) {
                $q->whereNull('processed')->orWhere('processed', 0)->orWhere('processed', 1);
            });
        }

        $closed = array_values(array_filter(array_map('intval', [
            setting('completed_order_status'),
            setting('canceled_order_status'),
        ])));
        if ($closed && in_array('status_id', $cols, true)) {
            $query->whereNotIn('status_id', $closed);
        }
        if (in_array('payment_status', $cols, true)) {
            $query->where(function ($q) {
                $q->whereNull('payment_status')->orWhereNotIn('payment_status', ['paid', 'settled', 'closed']);
            });
        }
    }

    protected function orderBelongsToTable(Orders_model $order, array $table): bool
    {
        if (isset($order->table_id) && (int)$order->table_id === (int)$table['id']) {
            return true;
        }
        $type = strtolower(trim((string)($order->order_type ?? '')));
        $valid = array_map('strtolower', [
            (string)$table['id'],
            (string)$table['number'],
            (string)$table['name'],
            'Table '.(string)$table['number'],
        ]);
        return in_array($type, $valid, true);
    }

    protected function orderIsOpen(Orders_model $order): bool
    {
        $closed = array_values(array_filter(array_map('intval', [
            setting('completed_order_status'),
            setting('canceled_order_status'),
        ])));
        if ($closed && in_array((int)$order->status_id, $closed, true)) {
            return false;
        }
        return !in_array(strtolower((string)($order->payment_status ?? '')), ['paid', 'settled', 'closed'], true);
    }
}
