<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterWorkspaceV92 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $columnsCache = [];

    public function data()
    {
        try {
            $this->ensureAssignmentsTable();
            $user = $this->currentUserInfo();
            $tablesTable = $this->findTable(['tables', 'location_tables']);
            $ordersTable = $this->findTable(['orders']);
            $orderMenusTable = $this->findTable(['order_menus']);
            $menuTable = $this->findTable(['menus', 'menu_items', 'menuitems']);

            $assignedIds = $this->assignedTableIds($user);
            $tables = $this->buildTables($tablesTable, $ordersTable, $orderMenusTable, $assignedIds);
            $menuItems = $this->buildMenuItems($menuTable);

            return Response::json([
                'ok' => true,
                'version' => 'v92',
                'generated_at' => date('c'),
                'user' => $user,
                'detected_tables' => [
                    'tables' => $tablesTable,
                    'orders' => $ordersTable,
                    'order_menus' => $orderMenusTable,
                    'menus' => $menuTable,
                    'assignments' => Schema::hasTable('pmd_waiter_table_assignments') ? 'pmd_waiter_table_assignments' : null,
                ],
                'assigned_table_ids' => $assignedIds,
                'tables' => $tables,
                'menu_items' => $menuItems,
                'counts' => [
                    'tables' => count($tables),
                    'assigned_tables' => count(array_filter($tables, function ($t) { return !empty($t['assigned']); })),
                    'menu_items' => count($menuItems),
                ],
                'message' => 'Real tables and real menu items returned for inline waiter floor/menu workspace.',
            ]);
        } catch (\Throwable $e) {
            return Response::json([
                'ok' => false,
                'version' => 'v92',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
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
            $table->unique(['staff_id','table_id','is_active'], 'pmd_waiter_table_unique_v92');
        });
    }

    protected function currentUserInfo()
    {
        $user = null;
        try { $user = AdminAuth::getUser(); } catch (\Throwable $e) { try { $user = AdminAuth::user(); } catch (\Throwable $e2) {} }
        $out = ['id'=>null,'user_id'=>null,'staff_id'=>null,'username'=>'','email'=>'','ids'=>[],'source'=>'AdminAuth'];
        if ($user) {
            $arr = is_object($user) && method_exists($user, 'getAttributes') ? $user->getAttributes() : (array)$user;
            foreach (['user_id','id'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out[$k === 'id' ? 'id' : 'user_id'] = (int)$arr[$k];
            foreach (['staff_id','staffId'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out['staff_id'] = (int)$arr[$k];
            foreach (['username','name','login','staff_name'] as $k) if (!empty($arr[$k])) { $out['username'] = (string)$arr[$k]; break; }
            foreach (['email','staff_email'] as $k) if (!empty($arr[$k])) { $out['email'] = (string)$arr[$k]; break; }
        }
        $users = $this->findTable(['users']);
        if ($users) {
            $uc = $this->cols($users);
            $uid = $this->pick($uc, ['user_id','id']);
            $staffCol = $this->pick($uc, ['staff_id']);
            if (!$out['staff_id'] && $uid && $staffCol && $out['user_id']) {
                $sid = $this->scalar('SELECT '.$this->q($staffCol).' v FROM '.$this->q($users).' WHERE '.$this->q($uid).'='.(int)$out['user_id'].' LIMIT 1');
                if ($sid) $out['staff_id'] = (int)$sid;
            }
            if (!$out['staff_id'] && $staffCol) {
                $where = [];
                if ($out['username'] && in_array('username', $uc, true)) $where[] = $this->q('username').'='.$this->quote($out['username']);
                if ($out['email'] && in_array('email', $uc, true)) $where[] = $this->q('email').'='.$this->quote($out['email']);
                if (count($where)) {
                    $sid = $this->scalar('SELECT '.$this->q($staffCol).' v FROM '.$this->q($users).' WHERE '.implode(' OR ', $where).' LIMIT 1');
                    if ($sid) $out['staff_id'] = (int)$sid;
                }
            }
        }
        if (!$out['staff_id']) {
            $fallback = $this->findWaiterStaff($out);
            if ($fallback) {
                $out['staff_id'] = (int)$fallback['staff_id'];
                if (!$out['username']) $out['username'] = (string)($fallback['staff_name'] ?? 'waiter');
                if (!$out['email']) $out['email'] = (string)($fallback['staff_email'] ?? '');
                $out['source'] = 'fallback waiter staff lookup';
            }
        }
        foreach ([$out['staff_id'], $out['id'], $out['user_id']] as $id) if ($id !== null && is_numeric($id) && !in_array((int)$id, $out['ids'], true)) $out['ids'][] = (int)$id;
        return $out;
    }

    protected function findWaiterStaff($hint = [])
    {
        $staffs = $this->findTable(['staffs']);
        if (!$staffs) return null;
        $sc = $this->cols($staffs);
        $sid = $this->pick($sc, ['staff_id','id']);
        if (!$sid) return null;
        $name = $this->pick($sc, ['staff_name','name','username']);
        $email = $this->pick($sc, ['staff_email','email']);
        $status = $this->pick($sc, ['staff_status','status','is_active']);
        $where = [];
        if (!empty($hint['username']) && $name) $where[] = 'LOWER('.$this->q($name).') LIKE '.$this->quote('%'.strtolower($hint['username']).'%');
        if (!empty($hint['email']) && $email) $where[] = 'LOWER('.$this->q($email).') = '.$this->quote(strtolower($hint['email']));
        if ($name) $where[] = 'LOWER('.$this->q($name).') LIKE "%waiter%"';
        if ($email) $where[] = 'LOWER('.$this->q($email).') LIKE "%waiter%"';
        $active = $status ? ' AND COALESCE('.$this->q($status).',1)=1' : '';
        $select = $this->q($sid).' staff_id'.($name ? ', '.$this->q($name).' staff_name' : ', "" staff_name').($email ? ', '.$this->q($email).' staff_email' : ', "" staff_email');
        $sql = 'SELECT '.$select.' FROM '.$this->q($staffs).' WHERE ('.(count($where) ? implode(' OR ', $where) : '1=1').')'.$active.' ORDER BY '.$this->q($sid).' ASC LIMIT 1';
        $rows = DB::select($sql);
        return $rows ? (array)$rows[0] : null;
    }

    protected function assignedTableIds($user)
    {
        if (empty($user['staff_id']) || !Schema::hasTable('pmd_waiter_table_assignments')) return [];
        $rows = DB::table('pmd_waiter_table_assignments')->where('staff_id', (int)$user['staff_id'])->where('is_active', 1)->pluck('table_id')->all();
        return array_values(array_unique(array_map('intval', $rows)));
    }

    protected function buildTables($tablesTable, $ordersTable, $orderMenusTable, $assignedIds)
    {
        $out = [];
        if (!$tablesTable) return $out;
        $tc = $this->cols($tablesTable);
        $tid = $this->pick($tc, ['table_id','id']);
        if (!$tid) return $out;
        $name = $this->pick($tc, ['table_name','name','label','pos_table_label']);
        $num = $this->pick($tc, ['table_no','table_number','number']);
        $loc = $this->pick($tc, ['location_id']);
        $status = $this->pick($tc, ['table_status','status','is_active']);
        $expr = $name ? $this->q($name) : ($num ? $this->q($num) : $this->q($tid));
        $order = $this->pick($tc, ['priority','sort_order','table_no','table_number','table_id','id']);
        $where = [];
        if ($status) $where[] = '(COALESCE('.$this->q($status).',1)=1 OR LOWER(COALESCE(CAST('.$this->q($status).' AS CHAR),"")) NOT REGEXP "inactive|disabled|deleted")';
        if ($name) $where[] = 'LOWER(COALESCE(CAST('.$this->q($name).' AS CHAR),"")) NOT REGEXP "cashier|delivery|takeaway"';
        $sql = 'SELECT '.$this->q($tid).' table_id, '.$expr.' label'.($loc ? ', '.$this->q($loc).' location_id' : ', NULL location_id').' FROM '.$this->q($tablesTable).' WHERE '.(count($where)?implode(' AND ', $where):'1=1').' ORDER BY '.($order ? $this->q($order) : $this->q($tid)).' ASC LIMIT 80';
        foreach (DB::select($sql) as $r) {
            $a = (array)$r;
            $id = (int)$a['table_id'];
            $label = trim((string)($a['label'] ?? ''));
            if ($label === '') $label = 'Table '.$id;
            if (preg_match('/^\d+$/', $label)) $label = 'Table '.$label;
            $open = $this->openOrderCountForTable($ordersTable, $id);
            $ready = $this->readyCountForTable($ordersTable, $orderMenusTable, $id);
            $assigned = in_array($id, $assignedIds, true);
            $floorStatus = $ready > 0 ? 'ready' : ($open > 0 ? 'active' : ($assigned ? 'assigned' : 'free'));
            $out[] = [
                'table_id' => $id,
                'id' => $id,
                'label' => $label,
                'number' => $this->numberFromLabel($label, $id),
                'location_id' => $a['location_id'] ?? null,
                'assigned' => $assigned,
                'open_order_count' => $open,
                'ready_count' => $ready,
                'floor_status' => $floorStatus,
                'clickable' => true,
            ];
        }
        return $out;
    }

    protected function buildMenuItems($menuTable)
    {
        if (!$menuTable) return [];
        $mc = $this->cols($menuTable);
        $id = $this->pick($mc, ['menu_id','id','item_id']);
        $name = $this->pick($mc, ['menu_name','name','item_name','title']);
        if (!$id || !$name) return [];
        $price = $this->pick($mc, ['menu_price','price','item_price','sell_price']);
        $status = $this->pick($mc, ['menu_status','status','is_enabled','is_active']);
        $cat = $this->pick($mc, ['category_id','menu_category_id','category']);
        $where = [];
        if ($status) $where[] = '(COALESCE('.$this->q($status).',1)=1 OR LOWER(COALESCE(CAST('.$this->q($status).' AS CHAR),"")) NOT REGEXP "disabled|inactive|hidden|deleted|draft")';
        $order = $this->pick($mc, ['priority','sort_order','menu_priority','menu_id','id']);
        $sql = 'SELECT '.$this->q($id).' id, '.$this->q($name).' name'.($price ? ', '.$this->q($price).' price' : ', 0 price').($cat ? ', '.$this->q($cat).' category_id' : ', NULL category_id').' FROM '.$this->q($menuTable).' WHERE '.(count($where)?implode(' AND ', $where):'1=1').' ORDER BY '.($order ? $this->q($order) : $this->q($id)).' ASC LIMIT 120';
        $rows = DB::select($sql);
        $out = [];
        foreach ($rows as $r) {
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

    protected function openOrderCountForTable($ordersTable, $tableId)
    {
        if (!$ordersTable) return 0;
        $oc = $this->cols($ordersTable);
        $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
        if (!$tableCol) return 0;
        list($open,) = $this->openWhere($oc, 'o');
        return (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($ordersTable).' o WHERE '.$open.' AND o.'.$this->q($tableCol).'='.(int)$tableId);
    }

    protected function readyCountForTable($ordersTable, $orderMenusTable, $tableId)
    {
        if (!$ordersTable || !$orderMenusTable) return 0;
        $oc = $this->cols($ordersTable); $mc = $this->cols($orderMenusTable);
        $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
        $orderIdO = $this->pick($oc, ['order_id','id']);
        $orderIdM = $this->pick($mc, ['order_id']);
        if (!$tableCol || !$orderIdO || !$orderIdM) return 0;
        list($open,) = $this->openWhere($oc, 'o');
        list($ready,) = $this->readyWhere($mc, 'm');
        $qty = $this->pick($mc, ['quantity','qty','menu_quantity']);
        $qtyExpr = $qty ? 'COALESCE(SUM(CAST(m.'.$this->q($qty).' AS DECIMAL(12,2))),0)' : 'COUNT(*)';
        return (int)((float)$this->scalar('SELECT '.$qtyExpr.' v FROM '.$this->q($orderMenusTable).' m JOIN '.$this->q($ordersTable).' o ON o.'.$this->q($orderIdO).' = m.'.$this->q($orderIdM).' WHERE '.$open.' AND '.$ready.' AND o.'.$this->q($tableCol).'='.(int)$tableId));
    }

    protected function openWhere($cols, $alias)
    {
        $cancel = [];
        foreach (['order_status','status','status_id'] as $col) if (in_array($col,$cols,true)) $cancel[] = 'LOWER(COALESCE(CAST('.$this->qa($alias,$col).' AS CHAR),"")) NOT REGEXP "cancel|complete|closed|paid|served|deleted"';
        foreach (['processed','is_completed','is_cancelled','is_closed'] as $col) if (in_array($col,$cols,true)) $cancel[] = 'COALESCE('.$this->qa($alias,$col).',0)=0';
        return [count($cancel) ? '('.implode(' AND ',$cancel).')' : '1=1', 'open status fallback'];
    }

    protected function readyWhere($cols, $alias)
    {
        foreach (['kds_status','item_status','status','status_name','order_menu_status','cooking_status'] as $col) {
            if (in_array($col,$cols,true)) return ['LOWER(COALESCE(CAST('.$this->qa($alias,$col).' AS CHAR),"")) REGEXP "ready|complete|completed|done|serve"', $col];
        }
        foreach (['is_ready','ready','completed','is_completed'] as $col) {
            if (in_array($col,$cols,true)) return ['COALESCE('.$this->qa($alias,$col).',0)=1', $col];
        }
        return ['1=0','no ready column'];
    }

    protected function tablesList()
    {
        $rows = DB::select('SHOW TABLES');
        $out = [];
        foreach ($rows as $r) { $a = array_values((array)$r); if (isset($a[0])) $out[] = (string)$a[0]; }
        return $out;
    }

    protected function findTable($candidates)
    {
        $all = $this->tablesList();
        foreach ($candidates as $candidate) if (in_array($candidate, $all, true)) return $candidate;
        foreach ($candidates as $candidate) foreach ($all as $t) if (substr($t, -strlen($candidate)) === $candidate) return $t;
        return null;
    }

    protected function cols($table)
    {
        if (!$table) return [];
        if (!array_key_exists($table, $this->columnsCache)) {
            try { $this->columnsCache[$table] = Schema::getColumnListing($table); }
            catch (\Throwable $e) { $this->columnsCache[$table] = []; }
        }
        return $this->columnsCache[$table];
    }
    protected function pick($cols, $names) { foreach ($names as $n) if (in_array($n, $cols, true)) return $n; return null; }
    protected function q($v) { return '`'.str_replace('`','``',$v).'`'; }
    protected function qa($a,$c) { return $a.'.'.$this->q($c); }
    protected function quote($v) { return DB::getPdo()->quote((string)$v); }
    protected function scalar($sql) { $rows = DB::select($sql); if (!$rows) return null; $a=(array)$rows[0]; return reset($a); }
    protected function money($v) { return '€'.number_format((float)$v, 2); }
    protected function numberFromLabel($label, $id) { if (preg_match('/(\d+)/', (string)$label, $m)) return $m[1]; return (string)$id; }
}
