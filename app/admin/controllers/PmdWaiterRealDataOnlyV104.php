<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterRealDataOnlyV104 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $tablesCache = null;
    protected $colsCache = [];
    protected $metaCache = [];

    public function dashboardData()
    {
        try {
            $this->ensureAssignmentsTable();
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
                'version' => 'v104',
                'mode' => 'REAL_DATA_ONLY',
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
                        'value' => (string)$this->attentionCount(),
                        'sub' => 'calls / notes / allergies',
                        'count' => $this->attentionCount(),
                        'total' => $this->attentionCount(),
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
            $this->ensureAssignmentsTable();
            $user = $this->currentUser();
            $tables = $this->allTables($user);
            $menu = $this->realMenuItems();

            return Response::json([
                'ok' => true,
                'version' => 'v104',
                'mode' => 'REAL_DATA_ONLY',
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
                'real_menu_source' => $this->bestMenuCandidate(),
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function audit()
    {
        try {
            $this->ensureAssignmentsTable();
            $user = $this->currentUser();
            $tables = $this->restaurantTables();
            $menu = $this->realMenuItems();

            return Response::json([
                'ok' => true,
                'version' => 'v104',
                'mode' => 'REAL_DATA_ONLY',
                'user' => $user,
                'detected' => $this->detected(),
                'can_create_real_test_order' => count($tables) > 0 && count($menu) > 0 && (bool)$this->findTable(['orders']) && (bool)$this->findTable(['order_menus']),
                'tables_count' => count($tables),
                'real_menu_items_count' => count($menu),
                'assigned_table_ids' => $this->assignedTableIds($user),
                'tables_preview' => array_slice($tables, 0, 12),
                'menu_preview' => array_slice($menu, 0, 12),
                'best_menu_source' => $this->bestMenuCandidate(),
                'menu_candidates' => $this->menuCandidateTables(),
                'important_note' => 'v104 never uses pmd_waiter_test_menu_items or fake PMD menu items.',
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function setup()
    {
        try {
            $this->ensureAssignmentsTable();

            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $force = request()->get('force') == '1' || request()->get('force') === 'true';
            $assignOnly = request()->get('assign_only') == '1' || request()->get('assign_only') === 'true';
            $assignLimit = max(1, min(30, (int)request()->get('tables', 4)));
            $qty = max(1, min(9, (int)request()->get('qty', 1)));

            $user = $this->currentUser();
            $tables = $this->restaurantTables();
            $menu = $this->realMenuItems();
            $ordersTable = $this->findTable(['orders']);
            $orderMenusTable = $this->findTable(['order_menus']);

            if (!count($tables)) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v104',
                    'error' => 'No real restaurant tables detected.',
                    'detected' => $this->detected(),
                ], 500);
            }

            if (!$assignOnly && !count($menu)) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v104',
                    'error' => 'No REAL menu items detected. Fake PMD test items are disabled. Send this audit output so we can map the correct backend menu source.',
                    'detected' => $this->detected(),
                    'menu_candidates' => $this->menuCandidateTables(),
                    'all_tables_hint' => array_slice($this->tablesList(), 0, 80),
                    'tip' => 'Run fetch("/admin/pmd-waiter-real-v104-audit").then(r=>r.json()).then(console.log) and expand menu_candidates.',
                ], 500);
            }

            if (!$assignOnly && (!$ordersTable || !$orderMenusTable)) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v104',
                    'error' => 'orders/order_menus tables not detected, so v104 will not create fake test orders.',
                    'detected' => $this->detected(),
                ], 500);
            }

            $selectedTables = array_slice($tables, 0, $assignLimit);
            $assigned = [];
            $created = null;

            if ($apply) {
                DB::beginTransaction();

                foreach ($selectedTables as $table) {
                    $this->assignTable((int)$user['staff_id'], $table, $user);
                    $assigned[] = $table;
                }

                if (!$assignOnly) {
                    $existing = $this->lastSeed($user);
                    if ($existing && !$force) {
                        DB::commit();
                        return Response::json([
                            'ok' => true,
                            'version' => 'v104',
                            'mode' => 'ALREADY_HAS_REAL_TEST_ORDER',
                            'message' => 'Existing v104/v103/v102 seed log found. Use force=1 to create another real-menu test order.',
                            'seed' => $existing,
                            'assigned_tables' => $assigned,
                        ]);
                    }

                    $targetTable = $selectedTables[0];
                    $targetMenu = $menu[0];
                    $orderId = $this->createOrder($ordersTable, $targetTable, $targetMenu, $qty, $user);
                    $orderMenuId = $this->createReadyItem($orderMenusTable, $orderId, $targetTable, $targetMenu, $qty, $user);

                    $this->ensureSeedLogTable();
                    DB::table('pmd_waiter_seed_log')->insert([
                        'staff_id' => (int)$user['staff_id'],
                        'user_id' => !empty($user['id']) ? (int)$user['id'] : null,
                        'table_id' => (int)$targetTable['table_id'],
                        'order_id' => (int)$orderId,
                        'order_menu_id' => (int)$orderMenuId,
                        'menu_id' => (int)$targetMenu['id'],
                        'notes' => 'Created by PMD waiter real data only v104 with REAL menu item',
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ]);

                    $created = [
                        'table' => $targetTable,
                        'menu' => $targetMenu,
                        'qty' => $qty,
                        'order_id' => (int)$orderId,
                        'order_menu_id' => (int)$orderMenuId,
                    ];
                }

                DB::commit();
            }

            return Response::json([
                'ok' => true,
                'version' => 'v104',
                'mode' => $apply ? 'APPLIED_REAL_ONLY' : 'DRY_RUN_REAL_ONLY',
                'message' => $apply
                    ? ($assignOnly ? 'Assigned real tables only.' : 'Assigned real tables and created one ready order using a REAL menu item.')
                    : 'Dry run only. Add apply=1.',
                'user' => $user,
                'assigned_tables' => $assigned,
                'created' => $created,
                'detected' => $this->detected(),
            ]);
        } catch (\Throwable $e) {
            try { DB::rollBack(); } catch (\Throwable $ignore) {}
            return $this->jsonError($e);
        }
    }

    public function cleanFake()
    {
        try {
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';

            if (!$apply) {
                return Response::json([
                    'ok' => true,
                    'version' => 'v104',
                    'mode' => 'DRY_RUN',
                    'message' => 'Use apply=1 to remove helper fake PMD menu table only.',
                    'fake_table_exists' => Schema::hasTable('pmd_waiter_test_menu_items'),
                ]);
            }

            if (Schema::hasTable('pmd_waiter_test_menu_items')) {
                Schema::drop('pmd_waiter_test_menu_items');
            }

            return Response::json([
                'ok' => true,
                'version' => 'v104',
                'mode' => 'APPLIED',
                'removed' => ['pmd_waiter_test_menu_items'],
                'message' => 'Fake PMD fallback menu removed. Real menu only now.',
            ]);
        } catch (\Throwable $e) {
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

    protected function realMenuItems()
    {
        $candidate = $this->bestMenuCandidate();
        if (!$candidate || empty($candidate['table'])) return [];

        $table = $candidate['table'];
        $idCol = $candidate['id'];
        $nameCol = $candidate['name'];
        $priceCol = $candidate['price'];

        try { $rows = DB::table($table)->limit(300)->get(); }
        catch (\Throwable $e) { return []; }

        $out = [];
        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->fieldNumber($r, $idCol);
            $name = $this->fieldString($r, $nameCol);
            if (!$id || $name === '') continue;

            $statusText = strtolower($this->firstString($r, ['menu_status','status','is_enabled','is_active','active','available','is_available']));
            if (preg_match('/disabled|inactive|hidden|deleted|draft|unavailable/i', $statusText)) continue;

            $price = $priceCol ? $this->fieldDecimal($r, $priceCol) : 0.0;
            $out[] = [
                'id' => (int)$id,
                'menu_id' => (int)$id,
                'name' => $name,
                'price' => $price,
                'price_label' => $this->money($price),
                'source' => $table,
                'source_id_column' => $idCol,
                'source_name_column' => $nameCol,
                'source_price_column' => $priceCol,
            ];
        }

        return $out;
    }

    protected function menuCandidateTables()
    {
        $out = [];

        foreach ($this->tablesList() as $table) {
            if ($this->isDefinitelyNotMenuTable($table)) continue;

            $cols = $this->cols($table);
            if (!count($cols)) continue;

            $idCols = $this->matchingCols($cols, '/^(menu_id|item_id|food_id|dish_id|product_id|id)$/i');
            $nameCols = $this->matchingCols($cols, '/(^name$|menu_name|item_name|food_name|dish_name|product_name|title|label|description)/i');
            $priceCols = $this->matchingCols($cols, '/(price|amount|cost|rate|value)/i');

            if (!count($idCols) || !count($nameCols)) continue;

            $best = null;
            foreach ($idCols as $idCol) {
                foreach ($nameCols as $nameCol) {
                    $prices = count($priceCols) ? $priceCols : [null];
                    foreach ($prices as $priceCol) {
                        $score = $this->scoreMenuCandidate($table, $idCol, $nameCol, $priceCol);
                        if (!$best || $score['score'] > $best['score']) $best = $score;
                    }
                }
            }

            if ($best && $best['valid_rows'] > 0) $out[] = $best;
        }

        usort($out, function ($a, $b) { return $b['score'] <=> $a['score']; });
        return $out;
    }

    protected function scoreMenuCandidate($table, $idCol, $nameCol, $priceCol)
    {
        $score = 0;
        $valid = 0;
        $priced = 0;
        $sample = [];

        try { $rows = DB::table($table)->limit(60)->get(); }
        catch (\Throwable $e) { $rows = []; }

        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->fieldNumber($r, $idCol);
            $name = $this->fieldString($r, $nameCol);
            $price = $priceCol ? $this->fieldDecimal($r, $priceCol) : 0.0;

            if ($id && $name !== '' && strlen($name) >= 2 && !preg_match('/^\d+$/', $name)) {
                $valid++;
                if ($priceCol && $price > 0) $priced++;
                if (count($sample) < 3) $sample[] = ['id' => $id, 'name' => $name, 'price' => $price];
            }
        }

        $score += $valid * 10;
        $score += $priced * 20;
        if (preg_match('/menu/i', $table)) $score += 100;
        if (preg_match('/item|food|dish|product/i', $table)) $score += 40;
        if (preg_match('/^(menus|menu_items|items|products|dishes|foods)$/i', $table)) $score += 120;
        if ($priceCol) $score += 50;
        if (preg_match('/^(menu_name|item_name|food_name|dish_name|product_name|name|title)$/i', $nameCol)) $score += 20;
        if (preg_match('/^(menu_price|price|item_price|sell_price|sale_price)$/i', (string)$priceCol)) $score += 20;

        return [
            'table' => $table,
            'id' => $idCol,
            'name' => $nameCol,
            'price' => $priceCol,
            'score' => $score,
            'valid_rows' => $valid,
            'priced_rows' => $priced,
            'sample' => $sample,
        ];
    }

    protected function bestMenuCandidate()
    {
        $candidates = $this->menuCandidateTables();
        return count($candidates) ? $candidates[0] : null;
    }

    protected function isDefinitelyNotMenuTable($table)
    {
        if (preg_match('/^pmd_waiter_test_menu_items$/i', $table)) return true;
        if (preg_match('/seed|assignment|migration|cache|session|password|permission|role|user|staff|customer|notification|activity|log|mail|media|image|file|setting|country|currency|language|status/i', $table)) return true;
        if (preg_match('/order|invoice|payment|transaction|reservation|booking|location|address|table|kds|kitchen|option|category|review|coupon|discount|tax/i', $table)) return true;
        return false;
    }

    protected function createOrder($table, $targetTable, $menu, $qty, $user)
    {
        $total = ((float)($menu['price'] ?? 0)) * (int)$qty;
        $data = [];

        $this->setAny($data, $table, ['location_id'], $targetTable['location_id'] ?? 1);
        $this->setAny($data, $table, ['table_id','location_table_id','table_no','table_number'], (int)$targetTable['table_id']);
        $this->setAny($data, $table, ['staff_id','waiter_id','assignee_id','assigned_staff_id'], (int)$user['staff_id']);
        $this->setAny($data, $table, ['first_name','customer_name','name'], 'PMD');
        $this->setAny($data, $table, ['last_name'], 'Real Menu Test');
        $this->setAny($data, $table, ['email','order_email'], 'pmd-real-test@example.com');
        $this->setAny($data, $table, ['telephone','phone','phone_number'], '0000000000');
        $this->setAny($data, $table, ['comment','order_comment','notes'], 'PMD_V104_REAL_MENU_TEST');
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
        $this->setAny($data, $table, ['comment','notes'], 'PMD_V104_REAL_MENU_READY_ITEM');
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

        if (preg_match('/email/', $name)) return 'pmd-real-test@example.com';
        if (preg_match('/name/', $name)) return 'PMD Real Menu Test';
        if (preg_match('/type/', $name)) return 'dinein';
        if (preg_match('/status/', $name)) return 'pending';
        if (preg_match('/comment|note/', $name)) return 'PMD_V104_REAL_MENU_TEST';
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
            $orders = $this->findTable(['orders']);
            $menus = $this->findTable(['order_menus']);
            if (!$orders || !$menus) return 0;

            $oc = $this->cols($orders);
            $mc = $this->cols($menus);
            $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
            $orderIdO = $this->pick($oc, ['order_id','id']);
            $orderIdM = $this->pick($mc, ['order_id']);
            if (!$tableCol || !$orderIdO || !$orderIdM) return 0;

            $readyCol = $this->pick($mc, ['kds_status','item_status','status','status_name','order_menu_status','cooking_status']);
            $readyBool = $this->pick($mc, ['is_ready','ready','completed','is_completed']);

            $q = DB::table($menus.' as m')->join($orders.' as o', 'o.'.$orderIdO, '=', 'm.'.$orderIdM)->where('o.'.$tableCol, $tableId);
            if ($readyCol) {
                $q->where(function ($qq) use ($readyCol) {
                    $qq->where('m.'.$readyCol, 'like', '%ready%')
                       ->orWhere('m.'.$readyCol, 'like', '%complete%')
                       ->orWhere('m.'.$readyCol, 'like', '%done%')
                       ->orWhere('m.'.$readyCol, 'like', '%serve%');
                });
            } elseif ($readyBool) {
                $q->where('m.'.$readyBool, 1);
            } else {
                return 0;
            }

            $n = (int)$q->count();
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

    protected function attentionCount()
    {
        return 0;
    }

    protected function ensureAssignmentsTable()
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
    }

    protected function ensureSeedLogTable()
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
            'section_name' => 'Real section',
            'is_active' => 1,
            'assigned_by' => !empty($user['id']) ? (int)$user['id'] : null,
            'notes' => 'Assigned by PMD waiter real data only v104',
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
            'orders' => $this->findTable(['orders']),
            'order_menus' => $this->findTable(['order_menus']),
            'real_menu_source' => $this->bestMenuCandidate(),
            'assignments' => Schema::hasTable('pmd_waiter_table_assignments') ? 'pmd_waiter_table_assignments' : null,
            'fake_menu_removed_from_data' => true,
        ];
    }

    protected function matchingCols($cols, $regex)
    {
        $out = [];
        foreach ($cols as $c) if (preg_match($regex, $c)) $out[] = $c;
        return $out;
    }

    protected function fieldNumber($row, $key)
    {
        return ($key && array_key_exists($key, $row) && is_numeric($row[$key])) ? (int)$row[$key] : null;
    }

    protected function fieldString($row, $key)
    {
        return ($key && array_key_exists($key, $row)) ? trim((string)$row[$key]) : '';
    }

    protected function fieldDecimal($row, $key)
    {
        return ($key && array_key_exists($key, $row) && is_numeric($row[$key])) ? (float)$row[$key] : 0.0;
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
            'version' => 'v104',
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'detected' => $this->detected(),
            'menu_candidates' => $this->menuCandidateTables(),
        ], 500);
    }
}
