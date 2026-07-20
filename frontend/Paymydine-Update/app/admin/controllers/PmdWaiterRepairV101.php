<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterRepairV101 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $tablesCache = null;
    protected $columnsCache = [];

    public function dashboardData()
    {
        try {
            $this->ensureAssignmentsTable();
            $user = $this->currentUserInfo();
            $tables = $this->allTables($user);
            $assigned = array_values(array_filter($tables, function ($t) { return !empty($t['assigned']); }));

            $ready = 0; $orders = 0; $due = 0.0;
            foreach ($assigned as $t) {
                $ready += (int)($t['ready_count'] ?? 0);
                $orders += (int)($t['open_order_count'] ?? 0);
                $due += (float)($t['due_amount'] ?? 0);
            }

            $attention = $this->safeAttentionCount();

            return Response::json([
                'ok' => true,
                'version' => 'v101',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detectedSummary(),
                'detected_tables' => $this->detectedSummary(),
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
                        'value' => (string)$orders,
                        'sub' => 'my open orders',
                        'count' => $orders,
                        'total' => $orders,
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
            $user = $this->currentUserInfo();
            $tables = $this->allTables($user);
            $menu = $this->menuItems();

            return Response::json([
                'ok' => true,
                'version' => 'v101',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detectedSummary(),
                'detected_tables' => $this->detectedSummary(),
                'tables' => $tables,
                'menu_items' => $menu,
                'assigned_table_ids' => array_values(array_map(function ($t) { return (int)$t['table_id']; }, array_filter($tables, function ($t) { return !empty($t['assigned']); }))),
                'counts' => [
                    'tables' => count($tables),
                    'assigned_tables' => count(array_filter($tables, function ($t) { return !empty($t['assigned']); })),
                    'menu_items' => count($menu),
                ],
                'message' => 'V101 safe data repaired: no SQL assumptions about table columns.',
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
                'version' => 'v101',
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
            $user = $this->currentUserInfo();
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $limit = max(1, min(50, (int)request()->get('tables', 4)));
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
                            'notes' => 'Auto-connected by PMD waiter repair v101',
                            'created_at' => date('Y-m-d H:i:s'),
                            'updated_at' => date('Y-m-d H:i:s'),
                        ]);
                        $changed++;
                    }
                }
            }

            return Response::json([
                'ok' => true,
                'version' => 'v101',
                'mode' => $apply ? 'APPLIED' : 'DRY_RUN',
                'changed' => $changed,
                'selected_tables' => $selected,
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

        foreach ($raw as $t) {
            $id = (int)$t['table_id'];
            $open = $this->safeOpenOrderCount($id);
            $ready = $this->safeReadyCount($id);
            $due = $this->safeDueAmount($id);
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

    protected function rawRestaurantTables()
    {
        $table = $this->findRestaurantTablesTable();
        if (!$table) return $this->fallbackTablesFromOrdersAndAssignments();

        try {
            $rows = DB::table($table)->limit(200)->get();
        } catch (\Throwable $e) {
            return $this->fallbackTablesFromOrdersAndAssignments();
        }

        $out = [];
        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->firstNumber($r, ['table_id','location_table_id','id','table_no','table_number','number']);
            if (!$id) continue;

            $label = $this->firstString($r, ['table_name','name','label','pos_table_label','title','table_no','table_number','number']);
            if ($label === '') $label = 'Table '.$id;
            if (preg_match('/^\d+$/', $label)) $label = 'Table '.$label;

            $lower = strtolower($label);
            if (preg_match('/cashier|delivery|takeaway|pickup|counter|bar/i', $lower)) continue;

            $status = strtolower($this->firstString($r, ['table_status','status','active','is_active']));
            if (preg_match('/inactive|disabled|deleted|archived/i', $status)) continue;

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

    protected function fallbackTablesFromOrdersAndAssignments()
    {
        $ids = [];
        if (Schema::hasTable('pmd_waiter_table_assignments')) {
            try {
                foreach (DB::table('pmd_waiter_table_assignments')->pluck('table_id')->all() as $id) {
                    if ((int)$id > 0) $ids[(int)$id] = true;
                }
            } catch (\Throwable $e) {}
        }

        $orders = $this->findTable(['orders']);
        if ($orders) {
            $cols = $this->cols($orders);
            $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
            if ($tableCol) {
                try {
                    foreach (DB::table($orders)->whereNotNull($tableCol)->distinct()->limit(80)->pluck($tableCol)->all() as $id) {
                        if ((int)$id > 0) $ids[(int)$id] = true;
                    }
                } catch (\Throwable $e) {}
            }
        }

        $out = [];
        foreach (array_keys($ids) as $id) {
            $out[] = ['table_id' => (int)$id, 'label' => 'Table '.(int)$id, 'number' => (string)(int)$id, 'location_id' => null];
        }
        usort($out, function ($a, $b) { return $a['table_id'] <=> $b['table_id']; });
        return $out;
    }

    protected function menuItems()
    {
        $table = $this->findMenuTable();
        if (!$table) return [];

        try {
            $rows = DB::table($table)->limit(180)->get();
        } catch (\Throwable $e) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->firstNumber($r, ['menu_id','id','item_id']);
            $name = $this->firstString($r, ['menu_name','name','item_name','title']);
            if (!$id || $name === '') continue;

            $status = strtolower($this->firstString($r, ['menu_status','status','is_enabled','is_active','active']));
            if (preg_match('/disabled|inactive|hidden|deleted|draft/i', $status)) continue;

            $price = (float)($this->firstNumber($r, ['menu_price','price','item_price','sell_price','sale_price']) ?: 0);
            $out[] = [
                'id' => (int)$id,
                'menu_id' => (int)$id,
                'name' => $name,
                'price' => $price,
                'price_label' => $this->money($price),
                'category_id' => $this->firstNumber($r, ['category_id','menu_category_id']) ?: null,
            ];
        }

        return $out;
    }

    protected function safeOpenOrderCount($tableId)
    {
        try {
            $orders = $this->findTable(['orders']);
            if (!$orders) return 0;
            $cols = $this->cols($orders);
            $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
            if (!$tableCol) return 0;

            $q = DB::table($orders)->where($tableCol, $tableId);
            foreach (['processed','is_completed','is_cancelled','is_closed'] as $c) {
                if (in_array($c, $cols, true)) $q->where(function ($qq) use ($c) { $qq->whereNull($c)->orWhere($c, 0); });
            }
            foreach (['order_status','status'] as $c) {
                if (in_array($c, $cols, true)) {
                    $q->where(function ($qq) use ($c) {
                        $qq->whereNull($c)->orWhere(function ($qqq) use ($c) {
                            $qqq->where($c, 'not like', '%cancel%')
                                ->where($c, 'not like', '%complete%')
                                ->where($c, 'not like', '%closed%')
                                ->where($c, 'not like', '%paid%');
                        });
                    });
                    break;
                }
            }
            return (int)$q->count();
        } catch (\Throwable $e) { return 0; }
    }

    protected function safeReadyCount($tableId)
    {
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
            if (!$readyCol && !$readyBool) return 0;

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

            $qty = $this->pick($mc, ['quantity','qty','menu_quantity']);
            if ($qty) return (int)((float)$q->sum('m.'.$qty));
            return (int)$q->count();
        } catch (\Throwable $e) { return 0; }
    }

    protected function safeDueAmount($tableId)
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

    protected function safeAttentionCount()
    {
        try {
            foreach (['notifications','user_notifications','activities'] as $candidate) {
                $table = $this->findTable([$candidate]);
                if (!$table) continue;
                $cols = $this->cols($table);
                $msg = $this->pick($cols, ['message','body','title']);
                $type = $this->pick($cols, ['type','notification_type','event_type']);
                if (!$msg && !$type) return 0;
                $q = DB::table($table);
                $q->where(function ($qq) use ($msg, $type) {
                    if ($msg) $qq->orWhere($msg, 'like', '%call%')->orWhere($msg, 'like', '%note%')->orWhere($msg, 'like', '%allerg%')->orWhere($msg, 'like', '%request%');
                    if ($type) $qq->orWhere($type, 'like', '%call%')->orWhere($type, 'like', '%note%')->orWhere($type, 'like', '%allerg%')->orWhere($type, 'like', '%request%');
                });
                return (int)$q->count();
            }
        } catch (\Throwable $e) {}
        return 0;
    }

    protected function pendingPaymentsCount($assigned)
    {
        $n = 0;
        foreach ($assigned as $t) if ((float)($t['due_amount'] ?? 0) > 0) $n++;
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
        } catch (\Throwable $e) { return []; }
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

    protected function detectedSummary()
    {
        return [
            'tables' => $this->findRestaurantTablesTable(),
            'orders' => $this->findTable(['orders']),
            'order_menus' => $this->findTable(['order_menus']),
            'menus' => $this->findMenuTable(),
            'assignments' => Schema::hasTable('pmd_waiter_table_assignments') ? 'pmd_waiter_table_assignments' : null,
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
            'version' => 'v101',
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'detected' => $this->safeDetected(),
        ], 500);
    }

    protected function safeDetected()
    {
        try { return $this->detectedSummary(); } catch (\Throwable $e) { return ['detect_error' => $e->getMessage()]; }
    }
}
