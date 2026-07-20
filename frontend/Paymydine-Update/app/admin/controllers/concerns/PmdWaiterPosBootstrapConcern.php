<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use App\Services\MenuPopularityService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
            'version' => 'pmd-waiter-pos-v2.1',
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
        $with = [
            'categories',
            'menu_options.menu_option_values.option_value',
        ];

        if (Schema::hasTable('allergens') && Schema::hasTable('allergenables')) {
            $with[] = 'allergens';
        }
        if (Schema::hasTable('menu_images')) {
            $with['menu_images'] = function ($query) {
                if (Schema::hasColumn('menu_images', 'sort_order')) {
                    $query->orderBy('sort_order');
                }
                if (Schema::hasColumn('menu_images', 'id')) {
                    $query->orderBy('id');
                }
            };
        }

        $query = Menus_model::with($with)
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
        $bestsellerIds = $this->waiterPosBestsellerIds();

        foreach ($rows as $menu) {
            $price = (float)$menu->menu_price;
            if ($price <= 0) {
                $hiddenZeroPrice++;
                continue;
            }

            $menuCategories = [];
            $categoryNames = [];
            foreach (($menu->categories ?: collect()) as $category) {
                $categoryId = (int)($category->category_id ?? $category->getKey());
                $categoryName = trim((string)($category->name ?? $category->category_name ?? 'Menu'));
                if (!$categoryId) {
                    continue;
                }
                $categories[$categoryId] = ['id' => $categoryId, 'name' => $categoryName ?: 'Menu'];
                $menuCategories[] = $categoryId;
                if ($categoryName !== '') {
                    $categoryNames[] = $categoryName;
                }
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

            $allergens = [];
            if (isset($menu->allergens)) {
                foreach (($menu->allergens ?: collect()) as $allergen) {
                    if (isset($allergen->status) && !(bool)$allergen->status) {
                        continue;
                    }
                    $name = trim((string)($allergen->name ?? $allergen->allergen_name ?? ''));
                    if ($name === '') {
                        continue;
                    }
                    $allergens[] = [
                        'id' => (int)($allergen->allergen_id ?? $allergen->getKey()),
                        'name' => $name,
                        'description' => trim((string)($allergen->description ?? '')),
                    ];
                }
            }

            $images = $this->waiterPosMenuImages($menu);
            $override = strtolower(trim((string)($menu->bestseller_override_mode ?? 'auto')));
            $isBestseller = $override === 'force_on'
                || ($override !== 'force_off' && isset($bestsellerIds[(int)$menu->getKey()]));

            $items[] = [
                'id' => (int)$menu->getKey(),
                'name' => (string)$menu->menu_name,
                'description' => trim(strip_tags((string)($menu->menu_description ?? ''))),
                'price' => $price,
                'category_ids' => $menuCategories,
                'category_names' => array_values(array_unique($categoryNames)),
                'options' => $options,
                'has_options' => count($options) > 0,
                'prep_minutes' => (int)($menu->prep_time_minutes ?? 0),
                'minimum_qty' => max(1, (int)($menu->minimum_qty ?? 1)),
                'image' => $images[0] ?? null,
                'images' => $images,
                'halal' => (bool)($menu->is_halal ?? false),
                'vegetarian' => (bool)($menu->is_vegetarian ?? false),
                'vegan' => (bool)($menu->is_vegan ?? false),
                'allergens' => $allergens,
                'calories' => $this->nullableNumber($menu->calories ?? null, true),
                'protein' => $this->nullableNumber($menu->protein ?? null),
                'carbs' => $this->nullableNumber($menu->carbs ?? null),
                'fat' => $this->nullableNumber($menu->fat ?? null),
                'sugar' => $this->nullableNumber($menu->sugar ?? null),
                'serving_size' => trim((string)($menu->serving_size ?? '')) ?: null,
                'color' => trim((string)($menu->color ?? '')) ?: null,
                'is_chef_recommended' => (bool)($menu->is_chef_recommended ?? false),
                'is_bestseller' => $isBestseller,
                'bestseller_source' => $override === 'force_on' ? 'manual' : ($isBestseller ? 'sales' : null),
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

    protected function nullableNumber($value, bool $integer = false)
    {
        if ($value === null || $value === '') {
            return null;
        }
        return $integer ? (int)$value : round((float)$value, 2);
    }

    protected function waiterPosBestsellerIds(): array
    {
        try {
            if (!class_exists(MenuPopularityService::class)) {
                return [];
            }
            $stats = app(MenuPopularityService::class)->bestsellerStats();
            return array_flip(array_map('intval', (array)($stats['ids'] ?? [])));
        } catch (\Throwable $ignored) {
            return [];
        }
    }

    protected function waiterPosMenuImages(Menus_model $menu): array
    {
        $images = [];

        try {
            if (method_exists($menu, 'getThumb')) {
                $thumb = $menu->getThumb();
                if (is_string($thumb) && trim($thumb) !== '') {
                    $images[] = $this->normalizeWaiterPosImageUrl($thumb, true);
                }
            }
        } catch (\Throwable $ignored) {
        }

        if (isset($menu->menu_images)) {
            foreach (($menu->menu_images ?: collect()) as $row) {
                $path = trim((string)($row->image_path ?? $row->path ?? ''));
                if ($path !== '') {
                    $images[] = $this->normalizeWaiterPosImageUrl($path, false);
                }
            }
        }

        return array_values(array_unique(array_filter($images)));
    }

    protected function normalizeWaiterPosImageUrl(string $url, bool $attachment = false): string
    {
        $url = trim($url);
        if ($url === '' || preg_match('#^https?://#i', $url)) {
            return $url;
        }

        if (strpos($url, '/') === 0) {
            return $url;
        }

        $url = ltrim($url, '/');
        if (strpos($url, 'api/media/') === 0 || strpos($url, 'assets/media/') === 0) {
            return '/'.$url;
        }
        if (strpos($url, 'attachments/public/') === 0) {
            return '/assets/media/'.$url;
        }
        if (strpos($url, 'uploads/') === 0) {
            return '/assets/media/'.$url;
        }

        return $attachment
            ? '/assets/media/attachments/public/'.$url
            : '/assets/media/uploads/'.$url;
    }
}
