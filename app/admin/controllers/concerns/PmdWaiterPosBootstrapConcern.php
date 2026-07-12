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

trait PmdWaiterPosBootstrapConcern
{
    protected function payload(array $table): array
    {
        $orders = $this->openOrdersForTable($table);
        $menu = $this->menuPayload((int)($table['location_id'] ?? 0));
        $user = $this->userPayload();
        $activeOrderId = count($orders) ? (int)$orders[0]['order_id'] : null;

        return [
            'ok' => true,
            'version' => 'pmd-waiter-pos-v2',
            'table' => $table,
            'user' => $user,
            'permissions' => [
                'orders' => true,
                'payments' => $this->canManagePayments(),
            ],
            'open_orders' => $orders,
            'active_order_id' => $activeOrderId,
            'categories' => $menu['categories'],
            'menu_items' => $menu['items'],
            'warnings' => [
                'hidden_zero_price_items' => $menu['hidden_zero_price_items'],
            ],
            'settings' => [
                'currency' => $this->currencySymbol(),
                'currency_code' => $this->currencyCode(),
                'refresh_ms' => 15000,
                'dashboard_url' => '/admin/dashboardwaiter',
                'save_url' => '/admin/pmd-waiter-pos-v1/save/'.(int)$table['id'],
                'data_url' => '/admin/pmd-waiter-pos-v1/data/'.(int)$table['id'],
                'overlay_url' => '/admin/pmd-waiter-pos-v1/overlay/'.rawurlencode((string)$table['number']),
                'payment_summary_url' => '/admin/pmd-waiter-pos-v1/payment-summary/{order}',
                'payment_settle_url' => '/admin/pmd-waiter-pos-v1/payment-settle/{order}',
                'payment_coupon_url' => '/admin/pmd-waiter-pos-v1/payment-coupon/{order}',
                'terminal_payment_url' => '/admin/pmd-waiter-pos-v1/terminal-payment/{order}',
            ],
        ];
    }

    protected function requestPayload(): array
    {
        $payload = request()->json()->all();
        return $payload ?: request()->all();
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

        $numberColumn = in_array('table_no', $cols, true)
            ? 'table_no'
            : (in_array('table_number', $cols, true) ? 'table_number' : null);

        $row = $numberColumn ? DB::table('tables')->where($numberColumn, $tableId)->first() : null;
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

        $locationId = (int)($r['location_id'] ?? 0);
        if ($locationId < 1 && Schema::hasTable('locationables')) {
            try {
                $locationId = (int)(DB::table('locationables')
                    ->where('locationable_id', (int)$r[$pk])
                    ->whereIn('locationable_type', ['tables', 'Admin\\Models\\Tables_model'])
                    ->value('location_id') ?: 0);
            } catch (\Throwable $ignored) {
            }
        }

        return [
            'id' => (int)$r[$pk],
            'number' => (string)$number,
            'name' => $name,
            'capacity' => (int)($r['capacity'] ?? $r['table_capacity'] ?? $r['preferred_capacity'] ?? $r['max_capacity'] ?? 0),
            'location_id' => $locationId,
            'section' => (string)($r['table_section'] ?? $r['table_zone'] ?? ''),
            'qr_code' => (string)($r['qr_code'] ?? ''),
        ];
    }

    protected function userPayload(): array
    {
        $user = $this->currentUser();
        return [
            'id' => $user ? (int)$user->getKey() : null,
            'name' => $user ? (string)($user->name ?? $user->username ?? $user->email ?? 'Waiter') : 'Waiter',
        ];
    }

    protected function currentUser()
    {
        try {
            return AdminAuth::getUser();
        } catch (\Throwable $ignored) {
            return null;
        }
    }

    protected function currentUserId(): ?int
    {
        $user = $this->currentUser();
        return $user ? (int)$user->getKey() : null;
    }

    protected function canManagePayments(): bool
    {
        $user = $this->currentUser();
        if (!$user) {
            return false;
        }
        try {
            return (bool)$user->hasPermission('Admin.Payments');
        } catch (\Throwable $ignored) {
            return false;
        }
    }

    protected function assertPaymentPermission(): void
    {
        if (!$this->canManagePayments()) {
            abort(403, 'Payment permission required.');
        }
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
        $hiddenZeroPrice = 0;

        foreach ($rows as $menu) {
            $price = (float)$menu->menu_price;
            if ($price <= 0) {
                $hiddenZeroPrice++;
                continue;
            }

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
                'price' => $price,
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
            'hidden_zero_price_items' => $hiddenZeroPrice,
        ];
    }

}
