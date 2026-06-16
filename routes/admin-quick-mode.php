<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

Route::middleware(['web'])->get('/admin/quick-mode', function () {
    // Temporary preview protection for meeting/demo.
    // Open with: /admin/quick-mode?preview=pmdquick2026
    if (request()->query('preview') !== 'pmdquick2026') {
        return redirect('/admin');
    }

    $hasTable = function (string $table): bool {
        try {
            return Schema::hasTable($table);
        } catch (\Throwable $e) {
            return false;
        }
    };

    $hasColumn = function (string $table, string $column): bool {
        try {
            return Schema::hasColumn($table, $column);
        } catch (\Throwable $e) {
            return false;
        }
    };

    $pickColumn = function (string $table, array $candidates) use ($hasColumn): ?string {
        foreach ($candidates as $column) {
            if ($hasColumn($table, $column)) {
                return $column;
            }
        }
        return null;
    };

    $countRows = function (string $table, ?callable $callback = null, int $fallback = 0) use ($hasTable): int {
        try {
            if (!$hasTable($table)) return $fallback;
            $q = DB::table($table);
            if ($callback) $callback($q);
            return (int)$q->count();
        } catch (\Throwable $e) {
            return $fallback;
        }
    };

    $today = date('Y-m-d');

    $reservationsToday = $countRows('reservations', function ($q) use ($today) {
        try {
            if (Schema::hasColumn('reservations', 'reserve_date')) {
                $q->whereDate('reserve_date', $today);
            } elseif (Schema::hasColumn('reservations', 'created_at')) {
                $q->whereDate('created_at', $today);
            }
        } catch (\Throwable $e) {}
    }, 0);

    $openOrders = $countRows('orders', function ($q) {
        try {
            if (Schema::hasColumn('orders', 'status_id')) {
                $q->whereNotIn('status_id', [5, 6, 7]);
            } elseif (Schema::hasColumn('orders', 'status')) {
                $q->whereNotIn('status', ['completed', 'cancelled', 'canceled', 'paid', 'closed']);
            }
        } catch (\Throwable $e) {}
    }, 0);

    $unpaidOrders = $countRows('orders', function ($q) {
        try {
            if (Schema::hasColumn('orders', 'payment_status')) {
                $q->where(function ($qq) {
                    $qq->whereNull('payment_status')->orWhere('payment_status', '!=', 'paid');
                });
            } elseif (Schema::hasColumn('orders', 'payment')) {
                $q->where(function ($qq) {
                    $qq->whereNull('payment')->orWhere('payment', '!=', 'paid');
                });
            }
        } catch (\Throwable $e) {}
    }, 0);

    $tables = [];
    $tableSource = $hasTable('tables') ? 'tables' : ($hasTable('location_tables') ? 'location_tables' : null);

    if ($tableSource) {
        try {
            $idCol = $pickColumn($tableSource, ['table_id', 'location_table_id', 'id']);
            $nameCol = $pickColumn($tableSource, ['table_name', 'name', 'table_number', 'label']);
            $capacityCol = $pickColumn($tableSource, ['table_capacity', 'capacity', 'min_capacity', 'max_capacity']);

            $rows = DB::table($tableSource)
                ->limit(80)
                ->get();

            foreach ($rows as $row) {
                $id = $idCol ? ($row->{$idCol} ?? null) : null;
                $name = $nameCol ? ($row->{$nameCol} ?? null) : null;
                $capacity = $capacityCol ? ($row->{$capacityCol} ?? null) : null;

                $tables[] = [
                    'id' => $id ?: count($tables) + 1,
                    'name' => $name ?: 'Table ' . (count($tables) + 1),
                    'capacity' => $capacity ?: null,
                ];
            }
        } catch (\Throwable $e) {}
    }

    if (count($tables) === 0) {
        for ($i = 1; $i <= 18; $i++) {
            $tables[] = ['id' => $i, 'name' => 'Table ' . $i, 'capacity' => null];
        }
    }

    $menuItems = [];
    if ($hasTable('menus')) {
        try {
            $idCol = $pickColumn('menus', ['menu_id', 'id']);
            $nameCol = $pickColumn('menus', ['menu_name', 'name']);
            $priceCol = $pickColumn('menus', ['menu_price', 'price']);
            $statusCol = $pickColumn('menus', ['menu_status', 'status', 'is_enabled']);
            $stockCol = $pickColumn('menus', ['is_stock_out', 'stock_out', 'is_sold_out']);
            $categoryCol = $pickColumn('menus', ['menu_category_id', 'category_id']);

            $q = DB::table('menus')->limit(120);

            if ($statusCol) {
                $q->where(function ($qq) use ($statusCol) {
                    $qq->where($statusCol, 1)->orWhere($statusCol, true)->orWhereNull($statusCol);
                });
            }

            if ($stockCol) {
                $q->where(function ($qq) use ($stockCol) {
                    $qq->whereNull($stockCol)->orWhere($stockCol, 0)->orWhere($stockCol, false);
                });
            }

            $rows = $q->get();

            foreach ($rows as $row) {
                $menuItems[] = [
                    'id' => $idCol ? ($row->{$idCol} ?? count($menuItems) + 1) : count($menuItems) + 1,
                    'name' => $nameCol ? ($row->{$nameCol} ?? 'Menu Item') : 'Menu Item',
                    'price' => $priceCol ? (float)($row->{$priceCol} ?? 0) : 0,
                    'category' => $categoryCol ? ($row->{$categoryCol} ?? 'Menu') : 'Menu',
                ];
            }
        } catch (\Throwable $e) {}
    }

    if (count($menuItems) === 0) {
        $menuItems = [
            ['id' => 1, 'name' => 'Burger', 'price' => 9.90, 'category' => 'Food'],
            ['id' => 2, 'name' => 'Pizza', 'price' => 12.50, 'category' => 'Food'],
            ['id' => 3, 'name' => 'Salad', 'price' => 7.90, 'category' => 'Food'],
            ['id' => 4, 'name' => 'Cola', 'price' => 3.50, 'category' => 'Drinks'],
            ['id' => 5, 'name' => 'Water', 'price' => 2.80, 'category' => 'Drinks'],
            ['id' => 6, 'name' => 'Coffee', 'price' => 3.20, 'category' => 'Drinks'],
        ];
    }

    $quickLinks = [
        [
            'id' => 'order-flow',
            'title' => 'New Order',
            'subtitle' => 'Select table → add items',
            'icon' => '＋',
            'type' => 'action',
        ],
        [
            'id' => 'open-orders',
            'title' => 'Open Orders',
            'subtitle' => $openOrders . ' active',
            'icon' => '☰',
            'url' => '/admin/orders',
        ],
        [
            'id' => 'tables',
            'title' => 'Tables',
            'subtitle' => count($tables) . ' tables',
            'icon' => '□',
            'url' => '/admin/tables',
        ],
        [
            'id' => 'kds',
            'title' => 'KDS',
            'subtitle' => 'Kitchen screen',
            'icon' => '◴',
            'url' => '/admin/kitchendisplay/main-kitchen',
        ],
        [
            'id' => 'payments',
            'title' => 'Payments',
            'subtitle' => $unpaidOrders . ' unpaid',
            'icon' => '€',
            'url' => '/admin/payments',
        ],
        [
            'id' => 'reservations',
            'title' => 'Reservations',
            'subtitle' => $reservationsToday . ' today',
            'icon' => '📅',
            'url' => '/admin/reservations',
        ],
    ];

    return view()->file(base_path('resources/views/admin/quick-mode.blade.php'), [
        'reservationsToday' => $reservationsToday,
        'openOrders' => $openOrders,
        'unpaidOrders' => $unpaidOrders,
        'tables' => $tables,
        'menuItems' => $menuItems,
        'quickLinks' => $quickLinks,
    ]);
})->name('pmd.admin.quick-mode');
