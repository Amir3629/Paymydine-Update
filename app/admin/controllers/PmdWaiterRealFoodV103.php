<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterRealFoodV103 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $tablesCache = null;
    protected $colsCache = [];
    protected $metaCache = [];

    public function dashboardData()
    {
        try {
            $this->ensureHelpers();
            $user = $this->currentUser();
            $tables = $this->allTables($user);
            $assigned = array_values(array_filter($tables, function ($t) { return !empty($t['assigned']); }));

            $ready = 0; $open = 0; $due = 0.0;
            foreach ($assigned as $t) {
                $ready += (int)($t['ready_count'] ?? 0);
                $open += (int)($t['open_order_count'] ?? 0);
                $due += (float)($t['due_amount'] ?? 0);
            }

            return Response::json([
                'ok' => true,
                'version' => 'v103',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detected(),
                'detected_tables' => $this->detected(),
                'tables' => $tables,
                'assigned_tables' => $assigned,
                'assigned_table_ids' => array_values(array_map(function ($t) { return (int)$t['table_id']; }, $assigned)),
                'metrics' => [
                    'my_tables' => [
                        'label' => 'MY TABLES',
                        'value' => $this->compactTables($assigned),
                        'sub' => count($assigned).' assigned',
                        'count' => count($assigned),
                        'total' => count($tables),
                        'tables' => $assigned,
                    ],
                    'ready_to_serve' => [
                        'label' => 'READY TO SERVE',
                        'value' => (string)$ready,
                        'sub' => 'items from kitchen',
                        'count' => $ready,
                        'total' => $ready,
                    ],
                    'active_orders' => [
                        'label' => 'ACTIVE ORDERS',
                        'value' => (string)$open,
                        'sub' => 'my open orders',
                        'count' => $open,
                        'total' => $open,
                    ],
                    'needs_attention' => [
                        'label' => 'NEEDS ATTENTION',
                        'value' => '0',
                        'sub' => 'calls / notes / allergies',
                        'count' => 0,
                        'total' => 0,
                    ],
                    'checks_to_close' => [
                        'label' => 'CHECKS TO CLOSE',
                        'value' => $this->money($due),
                        'sub' => $this->pendingPaymentsCount($assigned).' payments pending',
                        'count' => $this->pendingPaymentsCount($assigned),
                        'total' => $due,
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function workspaceData()
    {
        try {
            $this->ensureHelpers();
            $user = $this->currentUser();
            $tables = $this->allTables($user);
            $menu = $this->menuItems(true);

            return Response::json([
                'ok' => true,
                'version' => 'v103',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detected(),
                'detected_tables' => $this->detected(),
                'tables' => $tables,
                'menu_items' => $menu,
                'assigned_table_ids' => array_values(array_map(function ($t) { return (int)$t['table_id']; }, array_filter($tables, function ($t) { return !empty($t['assigned']); }))),
                'counts' => [
                    'tables' => count($tables),
                    'assigned_tables' => count(array_filter($tables, function ($t) { return !empty($t['assigned']); })),
                    'menu_items' => count($menu),
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function audit()
    {
        try {
            $this->ensureHelpers();
            $user = $this->currentUser();
            $realMenu = $this->realMenuItems();
            $fallbackMenu = $this->fallbackMenuItems();
            $tables = $this->restaurantTables();

            return Response::json([
                'ok' => true,
                'version' => 'v103',
                'user' => $user,
                'detected' => $this->detected(),
                'can_seed' => count($tables) > 0 && (bool)$this->findTable(['orders']) && (bool)$this->findTable(['order_menus']),
                'tables_count' => count($tables),
                'real_menu_items_count' => count($realMenu),
                'fallback_menu_items_count' => count($fallbackMenu),
                'menu_items_count' => count($this->menuItems(true)),
                'assigned_table_ids' => $this->assignedTableIds($user),
                'tables_preview' => array_slice($tables, 0, 12),
                'menu_preview' => array_slice($this->menuItems(true), 0, 12),
                'menu_candidates' => $this->menuCandidateTables(),
                'last_seed' => $this->lastSeed($user),
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function setup()
    {
        try {
            $this->ensureHelpers();

            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $force = request()->get('force') == '1' || request()->get('force') === 'true';
            $assignLimit = max(1, min(30, (int)request()->get('tables', 4)));
            $qty = max(1, min(9, (int)request()->get('qty', 1)));

            $user = $this->currentUser();
            $tables = $this->restaurantTables();
            $ordersTable = $this->findTable(['orders']);
            $orderMenusTable = $this->findTable(['order_menus']);

            if (!$ordersTable || !$orderMenusTable) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v103',
                    'error' => 'Could not detect orders/order_menus tables.',
                    'detected' => $this->detected(),
                ], 500);
            }

            if (!count($tables)) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v103',
                    'error' => 'No restaurant tables detected.',
                    'detected' => $this->detected(),
                ], 500);
            }

            if ($apply) $this->ensureFallbackMenu();
            $menuItems = $this->menuItems(true);
            if (!count($menuItems)) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v103',
                    'error' => 'No real or fallback menu items available.',
                    'detected' => $this->detected(),
                    'menu_candidates' => $this->menuCandidateTables(),
                ], 500);
            }

            $existing = $this->lastSeed($user);
            if ($existing && !$force && $apply) {
                return Response::json([
                    'ok' => true,
                    'version' => 'v103',
                    'mode' => 'ALREADY_SEEDED',
                    'message' => 'A v103/v102 test order already exists for this waiter. Use force=1 to create another.',
                    'seed' => $existing,
                ]);
            }

            $assigned = [];
            $selectedTables = array_slice($tables, 0, $assignLimit);
            $targetTable = $selectedTables[0];
            $menu = $menuItems[0];
            $created = null;

            if ($apply) {
                DB::beginTransaction();

                foreach ($selectedTables as $table) {
                    $this->assignTable((int)$user['staff_id'], $table, $user);
                    $assigned[] = $table;
                }

                $orderId = $this->createOrder($ordersTable, $targetTable, $menu, $qty, $user);
                $orderMenuId = $this->createReadyItem($orderMenusTable, $orderId, $targetTable, $menu, $qty, $user);

                DB::table('pmd_waiter_seed_log')->insert([
                    'staff_id' => (int)$user['staff_id'],
                    'user_id' => !empty($user['id']) ? (int)$user['id'] : null,
                    'table_id' => (int)$targetTable['table_id'],
                    'order_id' => (int)$orderId,
                    'order_menu_id' => (int)$orderMenuId,
                    'menu_id' => (int)$menu['id'],
                    'notes' => 'Created by PMD waiter real food v103',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);

                DB::commit();

                $created = [
                    'table' => $targetTable,
                    'menu' => $menu,
                    'qty' => $qty,
                    'order_id' => (int)$orderId,
                    'order_menu_id' => (int)$orderMenuId,
                ];
            }

            return Response::json([
                'ok' => true,
                'version' => 'v103',
                'mode' => $apply ? 'APPLIED' : 'DRY_RUN',
                'message' => $apply
                    ? 'Assigned waiter tables and created one ready food item/order.'
                    : 'Dry run only. Add apply=1 to create the test food.',
                'user' => $user,
                'assigned_tables' => $assigned,
                'target_table' => $targetTable,
                'selected_menu_item' => $menu,
                'created' => $created,
                'detected' => $this->detected(),
                'next_checks' => [
                    "fetch('/admin/pmd-waiter-dashboard-data-v85').then(r=>r.json()).then(console.log)",
                    "fetch('/admin/pmd-waiter-workspace-v92-data').then(r=>r.json()).then(console.log)",
                    "window.PMDWaiterRescueAllTablesV99.refresh(); window.PMDWaiterRescueAllTablesV99.last()",
                ],
            ]);
        } catch (\Throwable $e) {
            try { DB::rollBack(); } catch (\Throwable $ignore) {}
            return $this->jsonError($e);
        }
    }

    public function clear()
    {
        try {
            $this->ensureHelpers();
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $user = $this->currentUser();

            $seeds = DB::table('pmd_waiter_seed_log')
                ->where('staff_id', (int)$user['staff_id'])
                ->orderBy('id', 'desc')
                ->limit(20)
                ->get();

            if (!$apply) {
                return Response::json(['ok' => true, 'version' => 'v103', 'mode' => 'DRY_RUN', 'seeds' => $seeds]);
            }

            $ordersTable = $this->findTable(['orders']);
            $orderMenusTable = $this->findTable(['order_menus']);
            $deleted = ['orders' => 0, 'order_menus' => 0, 'seed_logs' => 0];

            DB::beginTransaction();
            foreach ($seeds as $seed) {
                $s = (array)$seed;
                if ($orderMenusTable && !empty($s['order_menu_id'])) {
                    try {
                        DB::table($orderMenusTable)->where($this->primaryKey($orderMenusTable), (int)$s['order_menu_id'])->delete();
                        $deleted['order_menus']++;
                    } catch (\Throwable $e) {}
                }
                if ($ordersTable && !empty($s['order_id'])) {
                    try {
                        DB::table($ordersTable)->where($this->primaryKey($ordersTable), (int)$s['order_id'])->delete();
                        $deleted['orders']++;
                    } catch (\Throwable $e) {}
                }
                DB::table('pmd_waiter_seed_log')->where('id', (int)$s['id'])->delete();
                $deleted['seed_logs']++;
            }
            DB::commit();

            return Response::json(['ok' => true, 'version' => 'v103', 'mode' => 'APPLIED', 'deleted' => $deleted]);
        } catch (\Throwable $e) {
            try { DB::rollBack(); } catch (\Throwable $ignore) {}
            return $this->jsonError($e);
        }
    }

    protected function allTables($user)
    {
        $assignedIds = $this->assignedTableIds($user);
        $raw = $this->restaurantTables();
        $out = [];

        foreach ($raw as $t) {
            $id = (int)$t['table_id'];
            $open = $this->openOrderCount($id);
            $ready = $this->readyCount($id);
            $due = $this->dueAmount($id);
            $assigned = in_array($id, $assignedIds, true);

            $status = 'free';
            if ($ready > 0) $status = 'ready';
            else if ($open > 0 || $due > 0) $status = 'active';
            else if ($assigned) $status = 'assigned';

            $out[] = [
                'table_id' => $id,
                'id' => $id,
                'label' => $t['label'],
                'number' => $t['number'],
                'location_id' => $t['location_id'] ?? null,
                'assigned' => $assigned,
                'open_order_count' => $open,
                'ready_count' => $ready,
                'due_amount' => $due,
                'due_label' => $this->money($due),
                'floor_status' => $status,
                'clickable' => true,
            ];
        }

        return $out;
    }

    protected function createOrder($table, $targetTable, $menu, $qty, $user)
    {
        $total = ((float)($menu['price'] ?? 0)) * (int)$qty;
        $data = [];

        $this->setAny($data, $table, ['location_id'], $targetTable['location_id'] ?? 1);
        $this->setAny($data, $table, ['table_id','location_table_id','table_no','table_number'], (int)$targetTable['table_id']);
        $this->setAny($data, $table, ['staff_id','waiter_id','assignee_id','assigned_staff_id'], (int)$user['staff_id']);
        $this->setAny($data, $table, ['first_name','customer_name','name'], 'PMD');
        $this->setAny($data, $table, ['last_name'], 'Waiter Test');
        $this->setAny($data, $table, ['email','order_email'], 'pmd-test@example.com');
        $this->setAny($data, $table, ['telephone','phone','phone_number'], '0000000000');
        $this->setAny($data, $table, ['comment','order_comment','notes'], 'PMD_V103_TEST_READY_FOOD');
        $this->setAny($data, $table, ['order_type','type'], 'dinein');
        $this->setAny($data, $table, ['order_status','status'], 'pending');
        $this->setAny($data, $table, ['payment_status'], 'unpaid');
        $this->setAny($data, $table, ['processed','is_completed','is_cancelled','is_closed'], 0);
        $this->setAny($data, $table, ['order_total','total','total_amount','grand_total'], $total);
        $this->setAny($data, $table, ['subtotal','order_subtotal'], $total);
        $this->setAny($data, $table, ['order_date','date'], date('Y-m-d'));
        $this->setAny($data, $table, ['order_time','time'], date('H:i:s'));
        $this->setTimestamps($data, $table);

        return $this->insertFlexible($table, $data);
    }

    protected function createReadyItem($table, $orderId, $targetTable, $menu, $qty, $user)
    {
        $total = ((float)($menu['price'] ?? 0)) * (int)$qty;
        $data = [];

        $this->setAny($data, $table, ['order_id'], (int)$orderId);
        $this->setAny($data, $table, ['menu_id','item_id'], (int)$menu['id']);
        $this->setAny($data, $table, ['menu_name','name','item_name','title'], (string)$menu['name']);
        $this->setAny($data, $table, ['quantity','qty','menu_quantity'], (int)$qty);
        $this->setAny($data, $table, ['price','menu_price','item_price'], (float)$menu['price']);
        $this->setAny($data, $table, ['subtotal','total','menu_total','item_total'], $total);
        $this->setAny($data, $table, ['comment','notes'], 'PMD_V103_TEST_READY_ITEM');
        $this->setAny($data, $table, ['kds_status','item_status','status','status_name','order_menu_status','cooking_status'], 'ready');
        $this->setAny($data, $table, ['is_ready','ready','completed','is_completed'], 1);
        $this->setAny($data, $table, ['served','is_served'], 0);
        $this->setTimestamps($data, $table);

        return $this->insertFlexible($table, $data);
    }

    protected function insertFlexible($table, $data)
    {
        $meta = $this->meta($table);
        $insert = [];

        foreach ($meta as $col => $m) {
            if (!empty($m['auto'])) continue;
            if (array_key_exists($col, $data)) {
                $insert[$col] = $this->cast($data[$col], $m);
                continue;
            }
            if (!$m['nullable'] && !$m['has_default']) {
                $insert[$col] = $this->defaultFor($col, $m);
            }
        }

        if (!count($insert)) throw new \Exception('No insertable columns detected for '.$table);
        return (int)DB::table($table)->insertGetId($insert);
    }

    protected function defaultFor($col, $m)
    {
        $type = strtolower($m['type']);
        $name = strtolower($col);

        if (strpos($type, 'date') !== false || strpos($type, 'time') !== false) {
            if (strpos($type, 'date') !== false && strpos($type, 'time') === false) return date('Y-m-d');
            if (strpos($type, 'time') !== false && strpos($type, 'date') === false) return date('H:i:s');
            return date('Y-m-d H:i:s');
        }

        if (preg_match('/int|decimal|float|double|real|numeric/', $type)) {
            if (preg_match('/status_id|location_id|currency_id/', $name)) return 1;
            return 0;
        }

        if (preg_match('/email/', $name)) return 'pmd-test@example.com';
        if (preg_match('/name/', $name)) return 'PMD Test';
        if (preg_match('/type/', $name)) return 'dinein';
        if (preg_match('/status/', $name)) return 'pending';
        if (preg_match('/comment|note/', $name)) return 'PMD_V103_TEST';
        if (preg_match('/phone|tel/', $name)) return '0000000000';

        return '';
    }

    protected function cast($value, $m)
    {
        if ($value === null) return null;
        $type = strtolower($m['type']);
        if (preg_match('/int/', $type)) return (int)$value;
        if (preg_match('/decimal|float|double|real|numeric/', $type)) return (float)$value;
        return $value;
    }

    protected function restaurantTables()
    {
        $table = $this->findRestaurantTablesTable();
        if (!$table) return [];

        try { $rows = DB::table($table)->limit(200)->get(); }
        catch (\Throwable $e) { return []; }

        $out = [];
        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->firstNumber($r, ['table_id','location_table_id','id','table_no','table_number','number']);
            if (!$id) continue;

            $label = $this->firstString($r, ['table_name','name','label','pos_table_label','title','table_no','table_number','number']);
            if ($label === '') $label = 'Table '.$id;
            if (preg_match('/^\d+$/', $label)) $label = 'Table '.$label;
            if (preg_match('/cashier|delivery|takeaway|pickup|counter|bar/i', strtolower($label))) continue;

            $out[(int)$id] = [
                'table_id' => (int)$id,
                'label' => $label,
                'number' => $this->numberFromLabel($label, (int)$id),
                'location_id' => $this->firstNumber($r, ['location_id']) ?: null,
            ];
        }

        ksort($out);
        return array_values($out);
    }

    protected function menuItems($includeFallback = true)
    {
        $items = $this->realMenuItems();
        if (!count($items) && $includeFallback) $items = $this->fallbackMenuItems();
        return $items;
    }

    protected function realMenuItems()
    {
        $table = $this->findMenuTable();
        if (!$table) return [];

        try { $rows = DB::table($table)->limit(250)->get(); }
        catch (\Throwable $e) { return []; }

        $out = [];
        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->firstNumber($r, ['menu_id','id','item_id','food_id','dish_id','product_id']);
            $name = $this->firstString($r, ['menu_name','name','item_name','title','food_name','dish_name','product_name']);
            if (!$id || $name === '') continue;

            $status = strtolower($this->firstString($r, ['menu_status','status','is_enabled','is_active','active']));
            if (preg_match('/disabled|inactive|hidden|deleted|draft/i', $status)) continue;

            $price = $this->firstDecimal($r, ['menu_price','price','item_price','sell_price','sale_price','cost','amount']);
            $out[] = [
                'id' => (int)$id,
                'menu_id' => (int)$id,
                'name' => $name,
                'price' => $price,
                'price_label' => $this->money($price),
                'source' => $table,
            ];
        }
        return $out;
    }

    protected function fallbackMenuItems()
    {
        try {
            return array_map(function ($row) {
                $r = (array)$row;
                return [
                    'id' => (int)$r['id'],
                    'menu_id' => (int)$r['id'],
                    'name' => (string)$r['name'],
                    'price' => (float)$r['price'],
                    'price_label' => $this->money((float)$r['price']),
                    'source' => 'pmd_waiter_test_menu_items',
                ];
            }, DB::table('pmd_waiter_test_menu_items')->orderBy('id')->get()->all());
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function ensureFallbackMenu()
    {
        if (!Schema::hasTable('pmd_waiter_test_menu_items')) {
            Schema::create('pmd_waiter_test_menu_items', function ($table) {
                $table->increments('id');
                $table->string('name');
                $table->decimal('price', 12, 2)->default(9.90);
                $table->boolean('is_active')->default(1);
                $table->timestamps();
            });
        }

        if (!DB::table('pmd_waiter_test_menu_items')->exists()) {
            DB::table('pmd_waiter_test_menu_items')->insert([
                ['name' => 'PMD Ready Test Food', 'price' => 9.90, 'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
                ['name' => 'PMD Test Drink', 'price' => 4.50, 'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
                ['name' => 'PMD Test Dessert', 'price' => 6.20, 'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')],
            ]);
        }
    }

    protected function openOrderCount($tableId)
    {
        try {
            $orders = $this->findTable(['orders']);
            if (!$orders) return 0;
            $cols = $this->cols($orders);
            $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
            if (!$tableCol) return 0;
            return (int)DB::table($orders)->where($tableCol, $tableId)->count();
        } catch (\Throwable $e) { return 0; }
    }

    protected function readyCount($tableId)
    {
        $n = 0;

        try {
            if (Schema::hasTable('pmd_waiter_seed_log')) {
                $n += (int)DB::table('pmd_waiter_seed_log')->where('table_id', $tableId)->count();
            }
        } catch (\Throwable $e) {}

        try {
            $orders = $this->findTable(['orders']);
            $menus = $this->findTable(['order_menus']);
            if (!$orders || !$menus) return $n;

            $oc = $this->cols($orders);
            $mc = $this->cols($menus);
            $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
            $orderIdO = $this->pick($oc, ['order_id','id']);
            $orderIdM = $this->pick($mc, ['order_id']);
            if (!$tableCol || !$orderIdO || !$orderIdM) return $n;

            $readyCol = $this->pick($mc, ['kds_status','item_status','status','status_name','order_menu_status','cooking_status']);
            $readyBool = $this->pick($mc, ['is_ready','ready','completed','is_completed']);
            if (!$readyCol && !$readyBool) return $n;

            $q = DB::table($menus.' as m')->join($orders.' as o', 'o.'.$orderIdO, '=', 'm.'.$orderIdM)->where('o.'.$tableCol, $tableId);
            if ($readyCol) {
                $q->where(function ($qq) use ($readyCol) {
                    $qq->where('m.'.$readyCol, 'like', '%ready%')
                       ->orWhere('m.'.$readyCol, 'like', '%complete%')
                       ->orWhere('m.'.$readyCol, 'like', '%done%')
                       ->orWhere('m.'.$readyCol, 'like', '%serve%');
                });
            } else {
                $q->where('m.'.$readyBool, 1);
            }
            $n += (int)$q->count();
        } catch (\Throwable $e) {}

        return $n;
    }

    protected function dueAmount($tableId)
    {
        try {
            $orders = $this->findTable(['orders']);
            if (!$orders) return 0.0;
            $cols = $this->cols($orders);
            $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
            $total = $this->pick($cols, ['order_total','total','total_amount','grand_total']);
            if (!$tableCol || !$total) return 0.0;
            return (float)DB::table($orders)->where($tableCol, $tableId)->sum($total);
        } catch (\Throwable $e) { return 0.0; }
    }

    protected function ensureHelpers()
    {
        if (!Schema::hasTable('pmd_waiter_table_assignments')) {
            Schema::create('pmd_waiter_table_assignments', function ($table) {
                $table->increments('id');
                $table->integer('staff_id')->unsigned()->index();
                $table->integer('table_id')->unsigned()->index();
                $table->integer('location_id')->unsigned()->nullable()->index();
                $table->string('section_name')->nullable();
                $table->boolean('is_active')->default(1)->index();
                $table->integer('assigned_by')->unsigned()->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_waiter_seed_log')) {
            Schema::create('pmd_waiter_seed_log', function ($table) {
                $table->increments('id');
                $table->integer('staff_id')->nullable()->index();
                $table->integer('user_id')->nullable()->index();
                $table->integer('table_id')->nullable()->index();
                $table->integer('order_id')->nullable()->index();
                $table->integer('order_menu_id')->nullable()->index();
                $table->integer('menu_id')->nullable()->index();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_waiter_test_menu_items')) {
            Schema::create('pmd_waiter_test_menu_items', function ($table) {
                $table->increments('id');
                $table->string('name');
                $table->decimal('price', 12, 2)->default(9.90);
                $table->boolean('is_active')->default(1);
                $table->timestamps();
            });
        }
    }

    protected function assignTable($staffId, $table, $user)
    {
        if ($staffId <= 0) return;

        $exists = DB::table('pmd_waiter_table_assignments')
            ->where('staff_id', $staffId)
            ->where('table_id', (int)$table['table_id'])
            ->where('is_active', 1)
            ->exists();

        if ($exists) return;

        DB::table('pmd_waiter_table_assignments')->insert([
            'staff_id' => $staffId,
            'table_id' => (int)$table['table_id'],
            'location_id' => $table['location_id'] ?? null,
            'section_name' => 'V103 test section',
            'is_active' => 1,
            'assigned_by' => !empty($user['id']) ? (int)$user['id'] : null,
            'notes' => 'Assigned by PMD waiter real food v103',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    protected function lastSeed($user)
    {
        try {
            if (!Schema::hasTable('pmd_waiter_seed_log')) return null;
            $q = DB::table('pmd_waiter_seed_log')->orderBy('id', 'desc');
            if (!empty($user['staff_id'])) $q->where('staff_id', (int)$user['staff_id']);
            $row = $q->first();
            return $row ? (array)$row : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function currentUser()
    {
        $user = null;
        try { $user = AdminAuth::getUser(); } catch (\Throwable $e) {
            try { $user = AdminAuth::user(); } catch (\Throwable $e2) {}
        }

        $out = ['id'=>null,'user_id'=>null,'staff_id'=>null,'username'=>'','email'=>'','ids'=>[]];

        if ($user) {
            $arr = is_object($user) && method_exists($user, 'getAttributes') ? $user->getAttributes() : (array)$user;
            foreach (['id','user_id'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out[$k] = (int)$arr[$k];
            foreach (['staff_id','staffId'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out['staff_id'] = (int)$arr[$k];
            foreach (['username','name','login','staff_name'] as $k) if (!empty($arr[$k])) { $out['username'] = (string)$arr[$k]; break; }
            foreach (['email','staff_email'] as $k) if (!empty($arr[$k])) { $out['email'] = (string)$arr[$k]; break; }
        }

        if (!$out['staff_id']) $out['staff_id'] = $this->resolveStaffId($out);
        if (!$out['staff_id'] && !empty($out['id'])) $out['staff_id'] = (int)$out['id'];
        if (!$out['staff_id'] && !empty($out['user_id'])) $out['staff_id'] = (int)$out['user_id'];
        if (!$out['staff_id']) $out['staff_id'] = 1;

        foreach ([$out['staff_id'], $out['id'], $out['user_id']] as $id) {
            if ($id !== null && is_numeric($id) && !in_array((int)$id, $out['ids'], true)) $out['ids'][] = (int)$id;
        }

        return $out;
    }

    protected function resolveStaffId($out)
    {
        try {
            $staffs = $this->findTable(['staffs']);
            if (!$staffs) return null;
            $cols = $this->cols($staffs);
            $sid = $this->pick($cols, ['staff_id','id']);
            if (!$sid) return null;

            $name = $this->pick($cols, ['staff_name','name','username']);
            $email = $this->pick($cols, ['staff_email','email']);
            $q = DB::table($staffs);
            if ($email && !empty($out['email'])) $q->orWhere($email, $out['email']);
            if ($name && !empty($out['username'])) $q->orWhere($name, 'like', '%'.$out['username'].'%');
            if ($name) $q->orWhere($name, 'like', '%waiter%');
            if ($email) $q->orWhere($email, 'like', '%waiter%');
            $row = $q->first();
            if (!$row) return null;
            $arr = (array)$row;
            return isset($arr[$sid]) ? (int)$arr[$sid] : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function assignedTableIds($user)
    {
        if (empty($user['staff_id']) || !Schema::hasTable('pmd_waiter_table_assignments')) return [];
        try {
            return array_values(array_unique(array_map('intval', DB::table('pmd_waiter_table_assignments')
                ->where('staff_id', (int)$user['staff_id'])
                ->where('is_active', 1)
                ->pluck('table_id')
                ->all())));
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function menuCandidateTables()
    {
        $out = [];
        foreach ($this->tablesList() as $t) {
            if (preg_match('/order|payment|invoice|staff|user|customer|session|cache|log|setting|permission|role|table|category|option/i', $t)) continue;
            $cols = $this->cols($t);
            $name = $this->pick($cols, ['menu_name','name','item_name','title','food_name','dish_name','product_name']);
            $price = $this->pick($cols, ['menu_price','price','item_price','sell_price','sale_price','cost','amount']);
            $id = $this->pick($cols, ['menu_id','id','item_id','food_id','dish_id','product_id']);
            if ($id && $name) {
                $score = 0;
                if (preg_match('/menu|item|food|dish|product/i', $t)) $score += 20;
                if ($price) $score += 10;
                $out[] = ['table' => $t, 'id' => $id, 'name' => $name, 'price' => $price, 'score' => $score];
            }
        }
        usort($out, function ($a, $b) { return $b['score'] <=> $a['score']; });
        return $out;
    }

    protected function findMenuTable()
    {
        foreach (['menus', 'menu_items', 'menuitems', 'items', 'products', 'dishes', 'foods'] as $candidate) {
            $t = $this->findTable([$candidate]);
            if ($t && $this->pick($this->cols($t), ['menu_name','name','item_name','title','food_name','dish_name','product_name'])) return $t;
        }
        $candidates = $this->menuCandidateTables();
        return count($candidates) ? $candidates[0]['table'] : null;
    }

    protected function findRestaurantTablesTable()
    {
        foreach (['tables', 'location_tables', 'restaurant_tables', 'dining_tables'] as $candidate) {
            $t = $this->findTable([$candidate]);
            if ($t) return $t;
        }
        foreach ($this->tablesList() as $t) {
            if (preg_match('/table/i', $t) && !preg_match('/order|migr|session|permission|assign/i', $t)) return $t;
        }
        return null;
    }

    protected function findTable($candidates)
    {
        $all = $this->tablesList();
        foreach ($candidates as $candidate) if (in_array($candidate, $all, true)) return $candidate;
        foreach ($candidates as $candidate) {
            foreach ($all as $t) if (substr($t, -strlen($candidate)) === $candidate) return $t;
        }
        return null;
    }

    protected function tablesList()
    {
        if ($this->tablesCache !== null) return $this->tablesCache;
        $rows = DB::select('SHOW TABLES');
        $out = [];
        foreach ($rows as $r) {
            $a = array_values((array)$r);
            if (!empty($a[0])) $out[] = (string)$a[0];
        }
        $this->tablesCache = $out;
        return $out;
    }

    protected function cols($table)
    {
        if (!$table) return [];
        if (isset($this->colsCache[$table])) return $this->colsCache[$table];
        try {
            $rows = DB::select('DESCRIBE `'.str_replace('`','``',$table).'`');
            $cols = [];
            foreach ($rows as $r) {
                $a = (array)$r;
                if (!empty($a['Field'])) $cols[] = $a['Field'];
            }
            return $this->colsCache[$table] = $cols;
        } catch (\Throwable $e) {
            try { return $this->colsCache[$table] = Schema::getColumnListing($table); }
            catch (\Throwable $e2) { return $this->colsCache[$table] = []; }
        }
    }

    protected function meta($table)
    {
        if (isset($this->metaCache[$table])) return $this->metaCache[$table];
        $rows = DB::select('DESCRIBE `'.str_replace('`','``',$table).'`');
        $out = [];
        foreach ($rows as $r) {
            $a = (array)$r;
            $field = $a['Field'];
            $out[$field] = [
                'type' => $a['Type'] ?? '',
                'nullable' => strtoupper($a['Null'] ?? 'YES') === 'YES',
                'has_default' => array_key_exists('Default', $a) && $a['Default'] !== null,
                'auto' => stripos($a['Extra'] ?? '', 'auto_increment') !== false,
            ];
        }
        return $this->metaCache[$table] = $out;
    }

    protected function setAny(&$data, $table, $names, $value)
    {
        $cols = $this->cols($table);
        foreach ($names as $name) {
            if (in_array($name, $cols, true)) $data[$name] = $value;
        }
    }

    protected function setTimestamps(&$data, $table)
    {
        foreach (['created_at','updated_at','date_added','date_modified'] as $c) {
            if (in_array($c, $this->cols($table), true)) $data[$c] = date('Y-m-d H:i:s');
        }
    }

    protected function primaryKey($table)
    {
        try {
            $rows = DB::select('SHOW KEYS FROM `'.str_replace('`','``',$table).'` WHERE Key_name = "PRIMARY"');
            if ($rows) {
                $a = (array)$rows[0];
                if (!empty($a['Column_name'])) return $a['Column_name'];
            }
        } catch (\Throwable $e) {}
        $cols = $this->cols($table);
        return in_array('id', $cols, true) ? 'id' : (count($cols) ? $cols[0] : 'id');
    }

    protected function detected()
    {
        return [
            'tables' => $this->findRestaurantTablesTable(),
            'menus' => $this->findMenuTable(),
            'orders' => $this->findTable(['orders']),
            'order_menus' => $this->findTable(['order_menus']),
            'assignments' => Schema::hasTable('pmd_waiter_table_assignments') ? 'pmd_waiter_table_assignments' : null,
            'seed_log' => Schema::hasTable('pmd_waiter_seed_log') ? 'pmd_waiter_seed_log' : null,
            'fallback_menu' => Schema::hasTable('pmd_waiter_test_menu_items') ? 'pmd_waiter_test_menu_items' : null,
        ];
    }

    protected function pendingPaymentsCount($assigned)
    {
        $n = 0;
        foreach ($assigned as $t) if ((float)($t['due_amount'] ?? 0) > 0) $n++;
        return $n;
    }

    protected function compactTables($tables)
    {
        if (!count($tables)) return '—';
        $parts = [];
        foreach (array_slice($tables, 0, 3) as $t) $parts[] = 'T'.$this->numberFromLabel($t['label'] ?? '', $t['table_id'] ?? 0);
        return implode('/', $parts).(count($tables) > 3 ? '/…' : '');
    }

    protected function firstNumber($row, $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '' && is_numeric($row[$k])) return (int)$row[$k];
        }
        return null;
    }

    protected function firstDecimal($row, $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '' && is_numeric($row[$k])) return (float)$row[$k];
        }
        return 0.0;
    }

    protected function firstString($row, $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null && trim((string)$row[$k]) !== '') return trim((string)$row[$k]);
        }
        return '';
    }

    protected function pick($cols, $names)
    {
        foreach ($names as $n) if (in_array($n, $cols, true)) return $n;
        return null;
    }

    protected function numberFromLabel($label, $fallback)
    {
        if (preg_match('/(\d+)/', (string)$label, $m)) return (string)$m[1];
        return (string)$fallback;
    }

    protected function money($v)
    {
        return '€'.number_format((float)$v, 2);
    }

    protected function jsonError($e)
    {
        return Response::json([
            'ok' => false,
            'version' => 'v103',
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'detected' => $this->detected(),
        ], 500);
    }
}
