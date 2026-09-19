<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

trait PmdWaiterPosOrderPersistenceConcern
{
    protected function openOrdersForTable(array $table): array
    {
        if (!Schema::hasTable('orders')) {
            return [];
        }

        $cols = Schema::getColumnListing('orders');
        $q = DB::table('orders');
        $this->applyTableScope($q, $cols, $table);
        $this->applyOpenScope($q, $cols);

        $pk = in_array('order_id', $cols, true) ? 'order_id' : 'id';
        $rows = $q->orderByDesc($pk)->limit(20)->get();
        $out = [];

        foreach ($rows as $row) {
            $r = (array)$row;
            $id = (int)($r['order_id'] ?? $r['id'] ?? 0);
            $items = [];
            if ($id && Schema::hasTable('order_menus')) {
                $items = DB::table('order_menus')->where('order_id', $id)->get()->map(function ($item) {
                    $i = (array)$item;
                    $quantity = (float)($i['quantity'] ?? 1);
                    $subtotal = (float)($i['subtotal'] ?? 0);
                    return [
                        'id' => (int)($i['order_menu_id'] ?? 0),
                        'order_menu_id' => (int)($i['order_menu_id'] ?? 0),
                        'menu_id' => (int)($i['menu_id'] ?? 0),
                        'name' => (string)($i['name'] ?? 'Item'),
                        'quantity' => $quantity,
                        'price' => $quantity > 0 ? round($subtotal / $quantity, 4) : (float)($i['price'] ?? 0),
                        'subtotal' => $subtotal,
                        'comment' => (string)($i['comment'] ?? ''),
                    ];
                })->values()->all();
            }

            $statusName = null;
            if (!empty($r['status_id']) && Schema::hasTable('statuses')) {
                $statusName = DB::table('statuses')->where('status_id', (int)$r['status_id'])->value('status_name');
            }

            $out[] = [
                'order_id' => $id,
                'status_id' => $r['status_id'] ?? null,
                'status_name' => (string)($statusName ?? ''),
                'payment' => (string)($r['payment'] ?? ''),
                'settlement_status' => (string)($r['settlement_status'] ?? 'unpaid'),
                'settled_amount' => (float)($r['settled_amount'] ?? 0),
                'total' => (float)($r['order_total'] ?? $r['total'] ?? 0),
                'total_items' => (int)($r['total_items'] ?? 0),
                'created_at' => (string)($r['created_at'] ?? ''),
                'updated_at' => (string)($r['updated_at'] ?? ''),
                'comment' => (string)($r['comment'] ?? ''),
                'items' => $items,
                'urls' => $this->orderUrls($id),
            ];
        }

        return $out;
    }

    // PMD_EXPLICIT_ORDER_APPEND_GUARD_R40
    //
    // If Cashier explicitly asks to append to Order #X, never silently
    // fall back to another check and never create a new order because
    // Order #X became financially locked.
    protected function resolveWritableOrder(
        array $table,
        int $requestedOrderId,
        bool $lock = false
    ): ?Orders_model {
        if ($requestedOrderId > 0) {
            $q = Orders_model::query()
                ->where(
                    'order_id',
                    $requestedOrderId
                );

            if ($lock) {
                $q->lockForUpdate();
            }

            $order = $q->first();

            if (!$order) {
                throw ValidationException::withMessages([
                    'order' =>
                        'The selected order no longer exists.',
                ]);
            }

            if (
                !$this->orderBelongsToTable(
                    $order,
                    $table
                )
            ) {
                throw ValidationException::withMessages([
                    'order' =>
                        'The selected order no longer belongs to this table.',
                ]);
            }

            if (
                !$this->orderIsOpen(
                    $order
                )
            ) {
                throw ValidationException::withMessages([
                    'order' =>
                        'This bill can no longer accept item changes because payment has started or the order was cancelled.',
                ]);
            }

            return $order;
        }

        /*
         * Only a brand-new waiter flow with no explicit order id may
         * select the latest open order automatically.
         */
        $rows = $this->openOrdersForTable(
            $table
        );

        if (!$rows) {
            return null;
        }

        $q = Orders_model::query()
            ->where(
                'order_id',
                (int)$rows[0]['order_id']
            );

        if ($lock) {
            $q->lockForUpdate();
        }

        $fallback = $q->first();

        if (
            $fallback
            && $this->orderIsOpen(
                $fallback
            )
        ) {
            return $fallback;
        }

        return null;
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
            'payment' => 'qr_pay_later',
            'settlement_status' => 'unpaid',
            'settled_amount' => 0,
            'order_date' => date('Y-m-d'),
            'order_time' => date('H:i:s'),
            'order_time_is_asap' => 1,
            'processed' => $mode === 'send' ? 1 : 0,
            'first_name' => 'Table',
            'last_name' => 'Guest',
            'email' => '',
            'telephone' => '',
            'comment' => trim((string)($payload['note'] ?? '')),
            'total_items' => 0,
            'order_total' => 0,
            'guest_count' => max(1, min(99, (int)($payload['guest_count'] ?? 1))),
            'ip_address' => request()->ip(),
            'user_agent' => (string)request()->userAgent(),
        ];

        foreach ($data as $key => $value) {
            if (in_array($key, $cols, true) && $value !== null) {
                $order->{$key} = $value;
            }
        }
    }

    protected function appendItems(Orders_model $order, array $cart): int
    {
        /*
         * PMD_QUICK_POS_BATCH_MENU_HYDRATE_V1
         *
         * The old path performed Menus_model::with(...)->find() once per cart
         * row. On a touch POS that turns a single Send into repeated menu /
         * option queries. Hydrate the base menu rows once, and only load option
         * relations for rows that actually selected options.
         */
        $prepared = [];
        $menuIds = [];

        foreach ($cart as $row) {
            if (!is_array($row)) {
                continue;
            }

            $menuId = (int)($row['menu_id'] ?? $row['id'] ?? 0);
            if ($menuId < 1) {
                continue;
            }

            $prepared[] = [
                'row' => $row,
                'menu_id' => $menuId,
                'quantity' => max(
                    1,
                    min(99, (int)($row['quantity'] ?? $row['qty'] ?? 1))
                ),
            ];
            $menuIds[] = $menuId;
        }

        if (!$prepared) {
            return 0;
        }

        $menuIds = array_values(array_unique($menuIds));
        $menus = Menus_model::query()
            ->whereIn('menu_id', $menuIds)
            ->get()
            ->keyBy(function ($menu) {
                return (int)$menu->getKey();
            });

        $menusHaveStockOut = Schema::hasColumn('menus', 'is_stock_out');

        $orderMenuColumns = Schema::hasTable('order_menus')
            ? Schema::getColumnListing('order_menus')
            : [];
        $orderMenuColumnMap = $orderMenuColumns
            ? array_flip($orderMenuColumns)
            : [];

        $hasOrderMenuOptions = Schema::hasTable('order_menu_options');
        $orderMenuOptionColumns = $hasOrderMenuOptions
            ? Schema::getColumnListing('order_menu_options')
            : [];
        $orderMenuOptionColumnMap = $orderMenuOptionColumns
            ? array_flip($orderMenuOptionColumns)
            : [];

        $added = 0;

        foreach ($prepared as $preparedRow) {
            $row = $preparedRow['row'];
            $menuId = $preparedRow['menu_id'];
            $qty = $preparedRow['quantity'];

            /** @var Menus_model|null $menu */
            $menu = $menus->get($menuId);
            if (!$menu || !(bool)$menu->menu_status) {
                continue;
            }
            if ($menusHaveStockOut && (bool)$menu->is_stock_out) {
                continue;
            }

            $basePrice = (float)$menu->menu_price;
            if ($basePrice <= 0) {
                continue;
            }

            $selectedOptions = $row['options'] ?? [];
            if (is_array($selectedOptions) && count($selectedOptions) > 0) {
                $menu->loadMissing(
                    'menu_options.menu_option_values.option_value'
                );
            }

            $optionRows = $this->validatedOptions(
                $menu,
                $selectedOptions
            );
            $optionUnit = array_sum(array_map(function ($option) {
                return (float)$option['price'];
            }, $optionRows));
            $unit = round($basePrice + $optionUnit, 4);

            $insert = [
                'order_id' => (int)$order->getKey(),
                'menu_id' => $menuId,
                'name' => (string)$menu->menu_name,
                'quantity' => $qty,
                'price' => $unit,
                'subtotal' => round($unit * $qty, 4),
                'comment' => trim((string)($row['comment'] ?? '')),
                'option_values' => serialize(array_column($optionRows, 'value_id')),
            ];

            if ($orderMenuColumnMap) {
                $insert = array_intersect_key($insert, $orderMenuColumnMap);
            }

            $orderMenuId = DB::table('order_menus')->insertGetId($insert);

            if ($hasOrderMenuOptions && $optionRows) {
                foreach ($optionRows as $option) {
                    $optionInsert = [
                        'order_menu_id' => $orderMenuId,
                        'order_id' => (int)$order->getKey(),
                        'menu_id' => $menuId,
                        'order_menu_option_id' => (int)$option['option_id'],
                        'menu_option_value_id' => (int)$option['value_id'],
                        'order_option_name' => (string)$option['name'],
                        'order_option_price' => (float)$option['price'],
                        'quantity' => $qty,
                    ];

                    if ($orderMenuOptionColumnMap) {
                        $optionInsert = array_intersect_key(
                            $optionInsert,
                            $orderMenuOptionColumnMap
                        );
                    }

                    DB::table('order_menu_options')->insert($optionInsert);
                }
            }

            $added++;
        }

        return $added;
    }

    protected function validatedOptions(Menus_model $menu, $selected): array
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
            $groupMatches = [];
            foreach (($option->menu_option_values ?: collect()) as $value) {
                $valueId = (int)($value->menu_option_value_id ?? $value->getKey());
                if (!in_array($valueId, $selectedIds, true)) {
                    continue;
                }
                $groupMatches[] = [
                    'option_id' => (int)($option->menu_option_id ?? $option->getKey()),
                    'value_id' => $valueId,
                    'name' => (string)($value->name ?? optional($value->option_value)->value ?? 'Option'),
                    'price' => (float)($value->price ?? $value->new_price ?? 0),
                ];
            }

            $minimum = max((bool)($option->required ?? false) ? 1 : 0, (int)($option->min_selected ?? 0));
            $maximum = max(1, (int)($option->max_selected ?? 1));
            if (count($groupMatches) < $minimum || count($groupMatches) > $maximum) {
                throw ValidationException::withMessages([
                    'options' => 'Invalid option selection for '.(string)($option->option_name ?? 'menu item').'.',
                ]);
            }
            $out = array_merge($out, $groupMatches);
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
        } elseif (Schema::hasTable('order_totals')) {
            DB::table('order_totals')->where('order_id', $order->getKey())->where('code', 'tax')->delete();
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
            ? round($subtotal * ($percentage / 100), 4)
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

    protected function paidStatusId(): ?int
    {
        if (!Schema::hasTable('statuses')) {
            return null;
        }
        $cols = Schema::getColumnListing('statuses');
        $idCol = in_array('status_id', $cols, true) ? 'status_id' : 'id';
        $nameCol = in_array('status_name', $cols, true) ? 'status_name' : (in_array('name', $cols, true) ? 'name' : null);
        if (!$nameCol) {
            return null;
        }
        $row = DB::table('statuses')->whereRaw('LOWER('.$nameCol.') = ?', ['paid'])->first();
        return $row ? (int)$row->{$idCol} : null;
    }

}
