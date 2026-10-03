<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterSeedReadyV102 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $tablesCache = null;
    protected $columnsCache = [];
    protected $metaCache = [];

    public function audit()
    {
        try {
            $this->ensureHelperTables();

            $user = $this->currentUserInfo();
            $tables = $this->restaurantTables();
            $menus = $this->menuItems();
            $orders = $this->findTable(['orders']);
            $orderMenus = $this->findTable(['order_menus']);

            return Response::json([
                'ok' => true,
                'version' => 'v102',
                'user' => $user,
                'detected' => $this->detected(),
                'can_seed' => (bool)($orders && $orderMenus && count($tables) && count($menus)),
                'tables_count' => count($tables),
                'menu_items_count' => count($menus),
                'assigned_table_ids' => $this->assignedTableIds($user),
                'tables_preview' => array_slice($tables, 0, 10),
                'menu_preview' => array_slice($menus, 0, 10),
                'order_columns' => $orders ? $this->cols($orders) : [],
                'order_menu_columns' => $orderMenus ? $this->cols($orderMenus) : [],
                'last_seed' => $this->lastSeed($user),
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function setup()
    {
        try {
            $this->ensureHelperTables();

            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $force = request()->get('force') == '1' || request()->get('force') === 'true';
            $assignLimit = max(1, min(30, (int)request()->get('tables', 4)));
            $itemQty = max(1, min(9, (int)request()->get('qty', 1)));

            $user = $this->currentUserInfo();
            $tables = $this->restaurantTables();
            $menus = $this->menuItems();
            $ordersTable = $this->findTable(['orders']);
            $orderMenusTable = $this->findTable(['order_menus']);

            if (!$ordersTable || !$orderMenusTable) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v102',
                    'error' => 'Could not detect orders/order_menus tables.',
                    'detected' => $this->detected(),
                ], 500);
            }

            if (!count($tables)) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v102',
                    'error' => 'No restaurant tables detected.',
                    'detected' => $this->detected(),
                ], 500);
            }

            if (!count($menus)) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v102',
                    'error' => 'No menu items detected.',
                    'detected' => $this->detected(),
                ], 500);
            }

            $existing = $this->lastSeed($user);
            if ($existing && !$force && $apply) {
                return Response::json([
                    'ok' => true,
                    'version' => 'v102',
                    'mode' => 'ALREADY_SEEDED',
                    'message' => 'A v102 test order already exists for this waiter. Use force=1 to create another.',
                    'seed' => $existing,
                    'refresh' => [
                        '/admin/pmd-waiter-dashboard-data-v85',
                        '/admin/pmd-waiter-workspace-v92-data',
                    ],
                ]);
            }

            $assigned = [];
            $selectedTables = array_slice($tables, 0, $assignLimit);

            if ($apply && !empty($user['staff_id'])) {
                foreach ($selectedTables as $table) {
                    $this->assignTableToWaiter((int)$user['staff_id'], $table, $user);
                    $assigned[] = $table;
                }
            }

            $targetTable = null;
            if (request()->get('table')) {
                foreach ($tables as $t) {
                    if ((int)$t['table_id'] === (int)request()->get('table') || (string)$t['number'] === (string)request()->get('table')) {
                        $targetTable = $t;
                        break;
                    }
                }
            }
            if (!$targetTable) $targetTable = count($assigned) ? $assigned[0] : $tables[0];

            $menu = $menus[0];
            if (request()->get('menu')) {
                foreach ($menus as $m) {
                    if ((int)$m['id'] === (int)request()->get('menu')) {
                        $menu = $m;
                        break;
                    }
                }
            }

            $created = null;
            if ($apply) {
                DB::beginTransaction();

                $orderId = $this->createTestOrder($ordersTable, $targetTable, $menu, $itemQty, $user);
                $orderMenuId = $this->createReadyOrderMenu($orderMenusTable, $ordersTable, $orderId, $targetTable, $menu, $itemQty, $user);

                DB::table('pmd_waiter_seed_log')->insert([
                    'staff_id' => !empty($user['staff_id']) ? (int)$user['staff_id'] : null,
                    'user_id' => !empty($user['id']) ? (int)$user['id'] : null,
                    'table_id' => (int)$targetTable['table_id'],
                    'order_id' => (int)$orderId,
                    'order_menu_id' => (int)$orderMenuId,
                    'menu_id' => (int)$menu['id'],
                    'notes' => 'Created by PMD waiter seed ready v102',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);

                DB::commit();

                $created = [
                    'table' => $targetTable,
                    'menu' => $menu,
                    'qty' => $itemQty,
                    'order_id' => (int)$orderId,
                    'order_menu_id' => (int)$orderMenuId,
                ];
            }

            return Response::json([
                'ok' => true,
                'version' => 'v102',
                'mode' => $apply ? 'APPLIED' : 'DRY_RUN',
                'message' => $apply
                    ? 'Assigned waiter tables and created one ready test food item/order.'
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
            $this->ensureHelperTables();
            $user = $this->currentUserInfo();
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';

            $seeds = DB::table('pmd_waiter_seed_log')
                ->when(!empty($user['staff_id']), function ($q) use ($user) {
                    return $q->where('staff_id', (int)$user['staff_id']);
                })
                ->orderBy('id', 'desc')
                ->limit(20)
                ->get();

            if (!$apply) {
                return Response::json([
                    'ok' => true,
                    'version' => 'v102',
                    'mode' => 'DRY_RUN',
                    'message' => 'Use apply=1 to delete v102 seed rows.',
                    'seeds' => $seeds,
                ]);
            }

            $ordersTable = $this->findTable(['orders']);
            $orderMenusTable = $this->findTable(['order_menus']);
            $deleted = ['orders' => 0, 'order_menus' => 0, 'seed_logs' => 0];

            DB::beginTransaction();
            foreach ($seeds as $seed) {
                $s = (array)$seed;
                if ($orderMenusTable && !empty($s['order_menu_id'])) {
                    try {
                        $pk = $this->primaryKey($orderMenusTable);
                        DB::table($orderMenusTable)->where($pk, (int)$s['order_menu_id'])->delete();
                        $deleted['order_menus']++;
                    } catch (\Throwable $e) {}
                }
                if ($ordersTable && !empty($s['order_id'])) {
                    try {
                        $pk = $this->primaryKey($ordersTable);
                        DB::table($ordersTable)->where($pk, (int)$s['order_id'])->delete();
                        $deleted['orders']++;
                    } catch (\Throwable $e) {}
                }
                DB::table('pmd_waiter_seed_log')->where('id', (int)$s['id'])->delete();
                $deleted['seed_logs']++;
            }
            DB::commit();

            return Response::json([
                'ok' => true,
                'version' => 'v102',
                'mode' => 'APPLIED',
                'deleted' => $deleted,
            ]);
        } catch (\Throwable $e) {
            try { DB::rollBack(); } catch (\Throwable $ignore) {}
            return $this->jsonError($e);
        }
    }

    protected function createTestOrder($ordersTable, $table, $menu, $qty, $user)
    {
        $price = (float)($menu['price'] ?? 0);
        $total = $price * (int)$qty;
        $data = [];

        $this->setAny($data, $ordersTable, ['location_id'], $table['location_id'] ?? 1);
        $this->setAny($data, $ordersTable, ['table_id','location_table_id','table_no','table_number'], (int)$table['table_id']);
        $this->setAny($data, $ordersTable, ['user_id','customer_id'], 0);
        $this->setAny($data, $ordersTable, ['staff_id','waiter_id','assignee_id','assigned_staff_id'], !empty($user['staff_id']) ? (int)$user['staff_id'] : 0);
        $this->setAny($data, $ordersTable, ['first_name','customer_name','name'], 'PMD');
        $this->setAny($data, $ordersTable, ['last_name'], 'Waiter Test');
        $this->setAny($data, $ordersTable, ['email','order_email'], 'pmd-test@example.com');
        $this->setAny($data, $ordersTable, ['telephone','phone','phone_number'], '0000000000');
        $this->setAny($data, $ordersTable, ['comment','order_comment','notes'], 'PMD_V102_TEST_READY_FOOD');
        $this->setAny($data, $ordersTable, ['order_type','type'], 'dinein');
        $this->setAny($data, $ordersTable, ['order_status','status'], 'pending');
        $this->setAny($data, $ordersTable, ['payment_status'], 'unpaid');
        $this->setAny($data, $ordersTable, ['processed','is_completed','is_cancelled','is_closed'], 0);
        $this->setAny($data, $ordersTable, ['order_total','total','total_amount','grand_total'], $total);
        $this->setAny($data, $ordersTable, ['subtotal','order_subtotal'], $total);
        $this->setAny($data, $ordersTable, ['order_date','date'], date('Y-m-d'));
        $this->setAny($data, $ordersTable, ['order_time','time'], date('H:i:s'));
        $this->setTimestamps($data, $ordersTable);

        return $this->insertFlexible($ordersTable, $data);
    }

    protected function createReadyOrderMenu($orderMenusTable, $ordersTable, $orderId, $table, $menu, $qty, $user)
    {
        $price = (float)($menu['price'] ?? 0);
        $total = $price * (int)$qty;
        $data = [];

        $orderIdCol = $this->pick($this->cols($orderMenusTable), ['order_id']);
        if ($orderIdCol) $data[$orderIdCol] = (int)$orderId;

        $this->setAny($data, $orderMenusTable, ['menu_id','item_id'], (int)$menu['id']);
        $this->setAny($data, $orderMenusTable, ['menu_name','name','item_name','title'], (string)$menu['name']);
        $this->setAny($data, $orderMenusTable, ['quantity','qty','menu_quantity'], (int)$qty);
        $this->setAny($data, $orderMenusTable, ['price','menu_price','item_price'], $price);
        $this->setAny($data, $orderMenusTable, ['subtotal','total','menu_total','item_total'], $total);
        $this->setAny($data, $orderMenusTable, ['comment','notes'], 'PMD_V102_TEST_READY_ITEM');
        $this->setAny($data, $orderMenusTable, ['kds_status','item_status','status','status_name','order_menu_status','cooking_status'], 'ready');
        $this->setAny($data, $orderMenusTable, ['is_ready','ready','completed','is_completed'], 1);
        $this->setAny($data, $orderMenusTable, ['served','is_served'], 0);
        $this->setTimestamps($data, $orderMenusTable);

        return $this->insertFlexible($orderMenusTable, $data);
    }

    protected function insertFlexible($table, $data)
    {
        $meta = $this->meta($table);
        $insert = [];

        foreach ($meta as $col => $m) {
            if (!empty($m['auto'])) continue;
            if (array_key_exists($col, $data)) {
                $insert[$col] = $this->castForColumn($data[$col], $m);
                continue;
            }

            $mustFill = !$m['nullable'] && !$m['has_default'];
            if ($mustFill) $insert[$col] = $this->defaultForColumn($col, $m);
        }

        if (!count($insert)) throw new \Exception('No insertable columns detected for '.$table);

        return (int)DB::table($table)->insertGetId($insert);
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
        $cols = $this->cols($table);
        foreach (['created_at','updated_at','date_added','date_modified'] as $c) {
            if (in_array($c, $cols, true)) $data[$c] = date('Y-m-d H:i:s');
        }
    }

    protected function defaultForColumn($col, $m)
    {
        $type = strtolower($m['type']);
        $name = strtolower($col);

        if (strpos($type, 'date') !== false || strpos($type, 'time') !== false) {
            if (strpos($type, 'date') !== false && strpos($type, 'time') === false) return date('Y-m-d');
            if (strpos($type, 'time') !== false && strpos($type, 'date') === false) return date('H:i:s');
            return date('Y-m-d H:i:s');
        }

        if (preg_match('/int|decimal|float|double|real|numeric/', $type)) {
            if (preg_match('/status_id|location_id/', $name)) return 1;
            return 0;
        }

        if (preg_match('/email/', $name)) return 'pmd-test@example.com';
        if (preg_match('/name/', $name)) return 'PMD Test';
        if (preg_match('/type/', $name)) return 'dinein';
        if (preg_match('/status/', $name)) return 'pending';
        if (preg_match('/comment|note/', $name)) return 'PMD_V102_TEST';
        if (preg_match('/phone|tel/', $name)) return '0000000000';

        return '';
    }

    protected function castForColumn($value, $m)
    {
        $type = strtolower($m['type']);
        if ($value === null) return null;
        if (preg_match('/int/', $type)) return (int)$value;
        if (preg_match('/decimal|float|double|real|numeric/', $type)) return (float)$value;
        return $value;
    }

    protected function ensureHelperTables()
    {
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
    }

    protected function assignTableToWaiter($staffId, $table, $user)
    {
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
            'section_name' => 'V102 test section',
            'is_active' => 1,
            'assigned_by' => !empty($user['id']) ? (int)$user['id'] : null,
            'notes' => 'Assigned by PMD waiter seed ready v102',
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

    protected function menuItems()
    {
        $table = $this->findMenuTable();
        if (!$table) return [];

        try { $rows = DB::table($table)->limit(180)->get(); }
        catch (\Throwable $e) { return []; }

        $out = [];
        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->firstNumber($r, ['menu_id','id','item_id']);
            $name = $this->firstString($r, ['menu_name','name','item_name','title']);
            if (!$id || $name === '') continue;

            $price = (float)($this->firstNumber($r, ['menu_price','price','item_price','sell_price','sale_price']) ?: 0);
            $out[] = [
                'id' => (int)$id,
                'menu_id' => (int)$id,
                'name' => $name,
                'price' => $price,
                'price_label' => $this->money($price),
            ];
        }

        return $out;
    }

    protected function currentUserInfo()
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
        } catch (\Throwable $e) { return null; }
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
        } catch (\Throwable $e) { return []; }
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

    protected function findMenuTable()
    {
        foreach (['menus', 'menu_items', 'menuitems'] as $candidate) {
            $t = $this->findTable([$candidate]);
            if ($t) return $t;
        }
        foreach ($this->tablesList() as $t) {
            if (preg_match('/menu|item|food/i', $t) && !preg_match('/order|option|category/i', $t)) return $t;
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
        if (isset($this->columnsCache[$table])) return $this->columnsCache[$table];
        try {
            $rows = DB::select('DESCRIBE `'.str_replace('`','``',$table).'`');
            $cols = [];
            foreach ($rows as $r) {
                $a = (array)$r;
                if (!empty($a['Field'])) $cols[] = $a['Field'];
            }
            return $this->columnsCache[$table] = $cols;
        } catch (\Throwable $e) {
            try { return $this->columnsCache[$table] = Schema::getColumnListing($table); }
            catch (\Throwable $e2) { return $this->columnsCache[$table] = []; }
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
        ];
    }

    protected function firstNumber($row, $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '' && is_numeric($row[$k])) return (int)$row[$k];
        }
        return null;
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
            'version' => 'v102',
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'detected' => $this->detected(),
        ], 500);
    }
}
