<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterRepairV100 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $columnsCache = null;
    protected $tablesCache = null;

    public function dashboardData()
    {
        try {
            $this->ensureAssignmentsTable();

            $user = $this->currentUserInfo();
            $tables = $this->allTables($user);
            $assigned = array_values(array_filter($tables, function ($t) {
                return !empty($t['assigned']);
            }));

            $ready = 0;
            $activeOrders = 0;
            $due = 0.0;
            foreach ($assigned as $t) {
                $ready += (int)($t['ready_count'] ?? 0);
                $activeOrders += (int)($t['open_order_count'] ?? 0);
                $due += (float)($t['due_amount'] ?? 0);
            }

            $attention = $this->attentionCount($user);

            return Response::json([
                'ok' => true,
                'version' => 'v100',
                'compat' => 'v85',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detectedSummary(),
                'detected_tables' => $this->detectedSummary(),
                'assignment_mode' => 'Floor shows all restaurant tables; assigned tables are highlighted only.',
                'assigned_table_ids' => array_values(array_map(function ($t) {
                    return (int)$t['table_id'];
                }, $assigned)),
                'assigned_tables' => $assigned,
                'tables' => $tables,
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
                        'value' => (string)$activeOrders,
                        'sub' => 'my open orders',
                        'count' => $activeOrders,
                        'total' => $activeOrders,
                    ],
                    'needs_attention' => [
                        'label' => 'NEEDS ATTENTION',
                        'value' => (string)$attention,
                        'sub' => 'calls / notes / allergies',
                        'count' => $attention,
                        'total' => $attention,
                    ],
                    'checks_to_close' => [
                        'label' => 'CHECKS TO CLOSE',
                        'value' => $this->money($due),
                        'sub' => $this->paymentCountText($assigned),
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
            $user = $this->currentUserInfo();
            $tables = $this->allTables($user);
            $menu = $this->menuItems();

            return Response::json([
                'ok' => true,
                'version' => 'v100',
                'compat' => 'v92',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detectedSummary(),
                'detected_tables' => $this->detectedSummary(),
                'assigned_table_ids' => array_values(array_map(function ($t) {
                    return (int)$t['table_id'];
                }, array_filter($tables, function ($t) { return !empty($t['assigned']); }))),
                'tables' => $tables,
                'menu_items' => $menu,
                'counts' => [
                    'tables' => count($tables),
                    'assigned_tables' => count(array_filter($tables, function ($t) { return !empty($t['assigned']); })),
                    'menu_items' => count($menu),
                ],
                'message' => 'V100 endpoint repaired: real floor/menu data is available again.',
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function audit()
    {
        try {
            $this->ensureAssignmentsTable();
            $user = $this->currentUserInfo();
            $tables = $this->allTables($user);
            return Response::json([
                'ok' => true,
                'version' => 'v100',
                'user' => $user,
                'detected' => $this->detectedSummary(),
                'tables_count' => count($tables),
                'assigned_count' => count(array_filter($tables, function ($t) { return !empty($t['assigned']); })),
                'tables' => $tables,
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function auto()
    {
        try {
            $this->ensureAssignmentsTable();
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $limit = max(1, min(50, (int)request()->get('tables', 4)));
            $user = $this->currentUserInfo();
            $tables = $this->rawRestaurantTables();
            $selected = array_slice($tables, 0, $limit);
            $changed = 0;

            if ($apply && !empty($user['staff_id'])) {
                foreach ($selected as $table) {
                    $exists = DB::table('pmd_waiter_table_assignments')
                        ->where('staff_id', (int)$user['staff_id'])
                        ->where('table_id', (int)$table['table_id'])
                        ->where('is_active', 1)
                        ->exists();
                    if (!$exists) {
                        DB::table('pmd_waiter_table_assignments')->insert([
                            'staff_id' => (int)$user['staff_id'],
                            'table_id' => (int)$table['table_id'],
                            'location_id' => $table['location_id'] ?? null,
                            'section_name' => 'Auto section',
                            'is_active' => 1,
                            'assigned_by' => !empty($user['id']) ? (int)$user['id'] : null,
                            'notes' => 'Auto-connected by PMD waiter repair v100',
                            'created_at' => date('Y-m-d H:i:s'),
                            'updated_at' => date('Y-m-d H:i:s'),
                        ]);
                        $changed++;
                    }
                }
            }

            return Response::json([
                'ok' => true,
                'version' => 'v100',
                'mode' => $apply ? 'APPLIED' : 'DRY_RUN',
                'changed' => $changed,
                'selected_tables' => $selected,
                'audit' => [
                    'tables_count' => count($this->rawRestaurantTables()),
                    'assigned_count' => count($this->assignedTableIds($user)),
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    protected function allTables($user)
    {
        $assignedIds = $this->assignedTableIds($user);
        $raw = $this->rawRestaurantTables();

        $out = [];
        foreach ($raw as $idx => $t) {
            $id = (int)$t['table_id'];
            $open = $this->openOrderCountForTable($id);
            $ready = $this->readyCountForTable($id);
            $due = $this->dueAmountForTable($id);
            $assigned = in_array($id, $assignedIds, true);

            $floorStatus = 'free';
            if ($ready > 0) $floorStatus = 'ready';
            else if ($open > 0 || $due > 0) $floorStatus = 'active';
            else if ($assigned) $floorStatus = 'assigned';

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
                'floor_status' => $floorStatus,
                'clickable' => true,
            ];
        }
        return $out;
    }

    protected function rawRestaurantTables()
    {
        $tablesTable = $this->findTable(['tables', 'location_tables', 'restaurant_tables', 'dining_tables']);
        if (!$tablesTable) return [];

        $cols = $this->cols($tablesTable);
        $id = $this->pick($cols, ['table_id', 'id', 'location_table_id']);
        if (!$id) return [];

        $name = $this->pick($cols, ['table_name', 'name', 'label', 'pos_table_label', 'title']);
        $number = $this->pick($cols, ['table_no', 'table_number', 'number', 'sort_order']);
        $location = $this->pick($cols, ['location_id']);
        $status = $this->pick($cols, ['table_status', 'status', 'is_active', 'active']);

        $labelExpr = $name ? $this->q($name) : ($number ? $this->q($number) : $this->q($id));
        $where = [];
        if ($status) {
            $where[] = '(COALESCE('.$this->q($status).',1)=1 OR LOWER(COALESCE(CAST('.$this->q($status).' AS CHAR),"")) NOT REGEXP "inactive|disabled|deleted|archived")';
        }
        if ($name) {
            $where[] = 'LOWER(COALESCE(CAST('.$this->q($name).' AS CHAR),"")) NOT REGEXP "cashier|delivery|takeaway|pickup"';
        }

        $orderBy = $number ?: $id;
        $sql = 'SELECT '.$this->q($id).' AS table_id, '.$labelExpr.' AS label'
            .($location ? ', '.$this->q($location).' AS location_id' : ', NULL AS location_id')
            .' FROM '.$this->q($tablesTable)
            .' WHERE '.(count($where) ? implode(' AND ', $where) : '1=1')
            .' ORDER BY '.$this->q($orderBy).' ASC LIMIT 120';

        $rows = DB::select($sql);
        $out = [];
        foreach ($rows as $r) {
            $a = (array)$r;
            $tid = (int)($a['table_id'] ?? 0);
            if ($tid <= 0) continue;
            $label = trim((string)($a['label'] ?? ''));
            if ($label === '') $label = 'Table '.$tid;
            if (preg_match('/^\d+$/', $label)) $label = 'Table '.$label;
            $out[] = [
                'table_id' => $tid,
                'label' => $label,
                'number' => $this->numberFromLabel($label, $tid),
                'location_id' => $a['location_id'] ?? null,
            ];
        }

        return $out;
    }

    protected function menuItems()
    {
        $menuTable = $this->findMenuTable();
        if (!$menuTable) return [];

        $cols = $this->cols($menuTable);
        $id = $this->pick($cols, ['menu_id','id','item_id']);
        $name = $this->pick($cols, ['menu_name','name','item_name','title']);
        if (!$id || !$name) return [];

        $price = $this->pick($cols, ['menu_price','price','item_price','sell_price','sale_price']);
        $status = $this->pick($cols, ['menu_status','status','is_enabled','is_active','active']);
        $cat = $this->pick($cols, ['category_id','menu_category_id','category']);
        $sort = $this->pick($cols, ['priority','sort_order','menu_priority','menu_id','id']);

        $where = [];
        if ($status) {
            $where[] = '(COALESCE('.$this->q($status).',1)=1 OR LOWER(COALESCE(CAST('.$this->q($status).' AS CHAR),"")) NOT REGEXP "disabled|inactive|hidden|deleted|draft")';
        }

        $sql = 'SELECT '.$this->q($id).' AS id, '.$this->q($name).' AS name'
            .($price ? ', '.$this->q($price).' AS price' : ', 0 AS price')
            .($cat ? ', '.$this->q($cat).' AS category_id' : ', NULL AS category_id')
            .' FROM '.$this->q($menuTable)
            .' WHERE '.(count($where) ? implode(' AND ', $where) : '1=1')
            .' ORDER BY '.($sort ? $this->q($sort) : $this->q($id)).' ASC LIMIT 180';

        $out = [];
        foreach (DB::select($sql) as $r) {
            $a = (array)$r;
            $out[] = [
                'id' => (int)$a['id'],
                'menu_id' => (int)$a['id'],
                'name' => (string)$a['name'],
                'price' => (float)($a['price'] ?? 0),
                'price_label' => $this->money((float)($a['price'] ?? 0)),
                'category_id' => $a['category_id'] ?? null,
            ];
        }
        return $out;
    }

    protected function openOrderCountForTable($tableId)
    {
        $orders = $this->findTable(['orders']);
        if (!$orders) return 0;
        $cols = $this->cols($orders);
        $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
        if (!$tableCol) return 0;
        list($open,) = $this->openWhere($cols, 'o');
        return (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->q($orders).' o WHERE '.$open.' AND o.'.$this->q($tableCol).'='.(int)$tableId);
    }

    protected function readyCountForTable($tableId)
    {
        $orders = $this->findTable(['orders']);
        $menus = $this->findTable(['order_menus']);
        if (!$orders || !$menus) return 0;

        $oc = $this->cols($orders);
        $mc = $this->cols($menus);

        $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
        $orderIdO = $this->pick($oc, ['order_id','id']);
        $orderIdM = $this->pick($mc, ['order_id']);
        if (!$tableCol || !$orderIdO || !$orderIdM) return 0;

        list($open,) = $this->openWhere($oc, 'o');
        list($ready,) = $this->readyWhere($mc, 'm');
        $qty = $this->pick($mc, ['quantity','qty','menu_quantity']);
        $qtyExpr = $qty ? 'COALESCE(SUM(CAST(m.'.$this->q($qty).' AS DECIMAL(12,2))),0)' : 'COUNT(*)';

        return (int)((float)$this->scalar(
            'SELECT '.$qtyExpr.' AS v FROM '.$this->q($menus).' m JOIN '.$this->q($orders).' o ON o.'.$this->q($orderIdO).' = m.'.$this->q($orderIdM)
            .' WHERE '.$open.' AND '.$ready.' AND o.'.$this->q($tableCol).'='.(int)$tableId
        ));
    }

    protected function dueAmountForTable($tableId)
    {
        $orders = $this->findTable(['orders']);
        if (!$orders) return 0.0;

        $cols = $this->cols($orders);
        $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
        if (!$tableCol) return 0.0;

        $total = $this->pick($cols, ['order_total','total','total_amount','grand_total']);
        if (!$total) return 0.0;

        list($open,) = $this->openWhere($cols, 'o');
        return (float)$this->scalar('SELECT COALESCE(SUM(CAST(o.'.$this->q($total).' AS DECIMAL(12,2))),0) AS v FROM '.$this->q($orders).' o WHERE '.$open.' AND o.'.$this->q($tableCol).'='.(int)$tableId);
    }

    protected function attentionCount($user)
    {
        $count = 0;

        foreach (['notifications','user_notifications','activities'] as $candidate) {
            $table = $this->findTable([$candidate]);
            if (!$table) continue;
            $cols = $this->cols($table);
            $type = $this->pick($cols, ['type','notification_type','event_type']);
            $read = $this->pick($cols, ['is_read','read_at','viewed','seen']);
            $msg = $this->pick($cols, ['message','body','title']);
            if (!$type && !$msg) continue;
            $where = [];
            if ($type) $where[] = 'LOWER(COALESCE(CAST('.$this->q($type).' AS CHAR),"")) REGEXP "call|note|allerg|request|waiter"';
            if ($msg) $where[] = 'LOWER(COALESCE(CAST('.$this->q($msg).' AS CHAR),"")) REGEXP "call|note|allerg|request|waiter"';
            $unread = '1=1';
            if ($read) {
                if (stripos($read, 'at') !== false) $unread = $this->q($read).' IS NULL';
                else $unread = 'COALESCE('.$this->q($read).',0)=0';
            }
            try {
                $count += (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->q($table).' WHERE ('.implode(' OR ', $where).') AND '.$unread);
            } catch (\Throwable $e) {}
            break;
        }

        return $count;
    }

    protected function paymentCountText($assigned)
    {
        $n = $this->pendingPaymentsCount($assigned);
        return $n.' payments pending';
    }

    protected function pendingPaymentsCount($assigned)
    {
        $n = 0;
        foreach ($assigned as $t) {
            if ((float)($t['due_amount'] ?? 0) > 0) $n++;
        }
        return $n;
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

    protected function currentUserInfo()
    {
        $user = null;
        try { $user = AdminAuth::getUser(); } catch (\Throwable $e) {
            try { $user = AdminAuth::user(); } catch (\Throwable $e2) {}
        }

        $out = [
            'id' => null,
            'user_id' => null,
            'staff_id' => null,
            'username' => '',
            'email' => '',
            'ids' => [],
        ];

        if ($user) {
            $arr = is_object($user) && method_exists($user, 'getAttributes') ? $user->getAttributes() : (array)$user;
            foreach (['id','user_id'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out[$k] = (int)$arr[$k];
            foreach (['staff_id','staffId'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out['staff_id'] = (int)$arr[$k];
            foreach (['username','name','login','staff_name'] as $k) if (!empty($arr[$k])) { $out['username'] = (string)$arr[$k]; break; }
            foreach (['email','staff_email'] as $k) if (!empty($arr[$k])) { $out['email'] = (string)$arr[$k]; break; }
        }

        if (!$out['staff_id']) {
            $out['staff_id'] = $this->resolveStaffId($out);
        }

        foreach ([$out['staff_id'], $out['id'], $out['user_id']] as $id) {
            if ($id !== null && is_numeric($id) && !in_array((int)$id, $out['ids'], true)) $out['ids'][] = (int)$id;
        }

        return $out;
    }

    protected function resolveStaffId($out)
    {
        $users = $this->findTable(['users']);
        if ($users) {
            $uc = $this->cols($users);
            $uid = $this->pick($uc, ['user_id','id']);
            $staff = $this->pick($uc, ['staff_id']);
            if ($uid && $staff && !empty($out['user_id'])) {
                $sid = $this->scalar('SELECT '.$this->q($staff).' AS v FROM '.$this->q($users).' WHERE '.$this->q($uid).'='.(int)$out['user_id'].' LIMIT 1');
                if ($sid) return (int)$sid;
            }
        }

        $staffs = $this->findTable(['staffs']);
        if ($staffs) {
            $sc = $this->cols($staffs);
            $sid = $this->pick($sc, ['staff_id','id']);
            if (!$sid) return null;
            $name = $this->pick($sc, ['staff_name','name','username']);
            $email = $this->pick($sc, ['staff_email','email']);
            $where = [];
            if (!empty($out['username']) && $name) $where[] = 'LOWER('.$this->q($name).') LIKE '.$this->quote('%'.strtolower($out['username']).'%');
            if (!empty($out['email']) && $email) $where[] = 'LOWER('.$this->q($email).') = '.$this->quote(strtolower($out['email']));
            if ($name) $where[] = 'LOWER('.$this->q($name).') LIKE "%waiter%"';
            if ($email) $where[] = 'LOWER('.$this->q($email).') LIKE "%waiter%"';
            $sql = 'SELECT '.$this->q($sid).' AS v FROM '.$this->q($staffs).' WHERE '.(count($where) ? '('.implode(' OR ', $where).')' : '1=1').' ORDER BY '.$this->q($sid).' ASC LIMIT 1';
            $sidVal = $this->scalar($sql);
            if ($sidVal) return (int)$sidVal;
        }

        return null;
    }

    protected function ensureAssignmentsTable()
    {
        if (Schema::hasTable('pmd_waiter_table_assignments')) return;

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

    protected function openWhere($cols, $alias)
    {
        $parts = [];
        foreach (['order_status','status','status_id'] as $col) {
            if (in_array($col, $cols, true)) {
                $parts[] = 'LOWER(COALESCE(CAST('.$this->qa($alias,$col).' AS CHAR),"")) NOT REGEXP "cancel|complete|closed|paid|served|deleted"';
            }
        }
        foreach (['processed','is_completed','is_cancelled','is_closed'] as $col) {
            if (in_array($col, $cols, true)) $parts[] = 'COALESCE('.$this->qa($alias,$col).',0)=0';
        }
        return [count($parts) ? '('.implode(' AND ', $parts).')' : '1=1', 'open'];
    }

    protected function readyWhere($cols, $alias)
    {
        foreach (['kds_status','item_status','status','status_name','order_menu_status','cooking_status'] as $col) {
            if (in_array($col, $cols, true)) {
                return ['LOWER(COALESCE(CAST('.$this->qa($alias,$col).' AS CHAR),"")) REGEXP "ready|complete|completed|done|serve"', $col];
            }
        }
        foreach (['is_ready','ready','completed','is_completed'] as $col) {
            if (in_array($col, $cols, true)) return ['COALESCE('.$this->qa($alias,$col).',0)=1', $col];
        }
        return ['1=0', 'none'];
    }

    protected function findMenuTable()
    {
        foreach (['menus', 'menu_items', 'menuitems'] as $candidate) {
            $t = $this->findTable([$candidate]);
            if ($t) return $t;
        }

        foreach ($this->tablesList() as $table) {
            $cols = $this->cols($table);
            $hasName = $this->pick($cols, ['menu_name','name','item_name','title']);
            $hasPrice = $this->pick($cols, ['menu_price','price','item_price','sell_price','sale_price']);
            if ($hasName && $hasPrice && preg_match('/menu|item|food/i', $table)) return $table;
        }

        return null;
    }

    protected function findTable($candidates)
    {
        $all = $this->tablesList();
        foreach ($candidates as $candidate) if (in_array($candidate, $all, true)) return $candidate;
        foreach ($candidates as $candidate) {
            foreach ($all as $t) {
                if (substr($t, -strlen($candidate)) === $candidate) return $t;
            }
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
        if ($this->columnsCache === null) $this->columnsCache = [];
        if (!array_key_exists($table, $this->columnsCache)) {
            try { $this->columnsCache[$table] = Schema::getColumnListing($table); }
            catch (\Throwable $e) { $this->columnsCache[$table] = []; }
        }
        return $this->columnsCache[$table];
    }

    protected function detectedSummary()
    {
        return [
            'tables' => $this->findTable(['tables', 'location_tables', 'restaurant_tables', 'dining_tables']),
            'orders' => $this->findTable(['orders']),
            'order_menus' => $this->findTable(['order_menus']),
            'menus' => $this->findMenuTable(),
            'assignments' => Schema::hasTable('pmd_waiter_table_assignments') ? 'pmd_waiter_table_assignments' : null,
        ];
    }

    protected function compactTables($tables)
    {
        if (!count($tables)) return '—';
        $parts = [];
        foreach (array_slice($tables, 0, 3) as $t) $parts[] = 'T'.$this->numberFromLabel($t['label'] ?? '', $t['table_id'] ?? 0);
        return implode('/', $parts).(count($tables) > 3 ? '/…' : '');
    }

    protected function pick($cols, $names)
    {
        foreach ($names as $name) if (in_array($name, $cols, true)) return $name;
        return null;
    }

    protected function q($value) { return '`'.str_replace('`','``',$value).'`'; }
    protected function qa($alias, $col) { return $alias.'.'.$this->q($col); }
    protected function quote($value) { return DB::getPdo()->quote((string)$value); }

    protected function scalar($sql)
    {
        $rows = DB::select($sql);
        if (!$rows) return null;
        $a = (array)$rows[0];
        return reset($a);
    }

    protected function money($value)
    {
        return '€'.number_format((float)$value, 2);
    }

    protected function numberFromLabel($label, $fallback)
    {
        if (preg_match('/(\d+)/', (string)$label, $m)) return (string)$m[1];
        return (string)$fallback;
    }

    protected function jsonError($e)
    {
        return Response::json([
            'ok' => false,
            'version' => 'v100',
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
        ], 500);
    }
}
