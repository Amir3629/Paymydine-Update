<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterAssignmentV85 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $columnsCache = [];
    protected $statusTableCache = null;

    public function audit()
    {
        try {
            $this->ensureAssignmentsTable();
            return Response::json($this->buildAudit(false));
        } catch (\Throwable $e) {
            return $this->error($e);
        }
    }

    public function auto()
    {
        try {
            $this->ensureAssignmentsTable();
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $tablesLimit = max(1, min(20, (int)request()->get('tables', 4)));
            $ordersLimit = max(1, min(100, (int)request()->get('orders', 30)));
            $before = $this->buildAudit(false);
            $result = $this->autoConnect($apply, $tablesLimit, $ordersLimit);
            $after = $this->buildAudit(false);
            return Response::json([
                'ok' => true,
                'version' => 'v85',
                'mode' => $apply ? 'APPLIED' : 'DRY_RUN',
                'message' => $apply
                    ? 'Waiter connection applied and checked.'
                    : 'Dry run only. Add ?apply=1 to apply.',
                'result' => $result,
                'before' => $before,
                'after' => $after,
            ]);
        } catch (\Throwable $e) {
            return $this->error($e);
        }
    }

    public function dashboardData()
    {
        try {
            $this->ensureAssignmentsTable();
            return Response::json($this->buildDashboardData());
        } catch (\Throwable $e) {
            return $this->error($e);
        }
    }

    protected function buildDashboardData()
    {
        $ctx = $this->context();
        $orders = $ctx['tables']['orders'];
        $orderMenus = $ctx['tables']['order_menus'];
        $tablesTable = $ctx['tables']['tables'];
        $notifications = $ctx['tables']['notifications'];
        $waiterCalls = $ctx['tables']['waiter_calls'];
        $payTx = $ctx['tables']['payment_transactions'];
        $this->statusTableCache = $ctx['tables']['statuses'];
        $user = $ctx['user'];
        $assignedTables = $this->assignedTables($user, $tablesTable);
        $assignedTableIds = array_map('intval', array_column($assignedTables, 'table_id'));

        return [
            'ok' => true,
            'version' => 'v85',
            'generated_at' => date('c'),
            'user' => $user,
            'assignment_mode' => 'table/section first, orders inherit from table; direct assignee_id is also respected',
            'detected_tables' => $ctx['tables'],
            'metrics' => [
                'my_tables' => $this->metricMyTables($assignedTables, $tablesTable),
                'ready_to_serve' => $this->metricReadyToServe($orders, $orderMenus, $user, $assignedTableIds),
                'active_orders' => $this->metricActiveOrders($orders, $user, $assignedTableIds),
                'needs_attention' => $this->metricNeedsAttention($notifications, $waiterCalls, $user, $assignedTableIds),
                'checks_to_close' => $this->metricChecksToClose($orders, $payTx, $user, $assignedTableIds),
            ],
            'assigned_tables' => $assignedTables,
            'next_step' => count($assignedTables)
                ? 'Tables are connected. Ready/Active/Payments now follow those assigned tables and direct order assignee fields.'
        ];
    }

    protected function buildAudit($includeSamples = true)
    {
        $ctx = $this->context();
        $user = $ctx['user'];
        $tablesTable = $ctx['tables']['tables'];
        $orders = $ctx['tables']['orders'];
        $orderMenus = $ctx['tables']['order_menus'];
        $assigned = $this->assignedTables($user, $tablesTable);
        $assignedIds = array_map('intval', array_column($assigned, 'table_id'));
        $data = $this->buildDashboardData();

        $openAssignedOrders = $this->countOrders($orders, $user, $assignedIds, true);
        $openUnassignedTableOrders = $this->countUnassignedOrdersOnAssignedTables($orders, $assignedIds);
        $readyAssigned = $this->metricReadyToServe($orders, $orderMenus, $user, $assignedIds);

        return [
            'ok' => true,
            'version' => 'v85',
            'generated_at' => date('c'),
            'user' => $user,
            'detected_tables' => $ctx['tables'],
            'detected_columns' => [
                'orders' => $orders ? $this->cols($orders) : [],
                'order_menus' => $orderMenus ? $this->cols($orderMenus) : [],
                'tables' => $tablesTable ? $this->cols($tablesTable) : [],
                'pmd_waiter_table_assignments' => $this->cols('pmd_waiter_table_assignments'),
            ],
            'connections' => [
                'assigned_tables_count' => count($assigned),
                'assigned_tables' => $assigned,
                'open_orders_connected_to_waiter_or_tables' => $openAssignedOrders,
                'open_unassigned_orders_on_assigned_tables' => $openUnassignedTableOrders,
                'ready_items_connected' => $readyAssigned,
            ],
            'dashboard_data_preview' => $data['metrics'],
            'health' => $this->healthMessage($user, $assigned, $openAssignedOrders, $readyAssigned),
        ];
    }

    protected function autoConnect($apply, $tablesLimit, $ordersLimit)
    {
        $ctx = $this->context();
        $user = $ctx['user'];
        if (empty($user['staff_id'])) {
            return [
                'ok' => false,
                'reason' => 'Could not detect waiter staff_id from current login.',
                'user' => $user,
            ];
        }

        $staffId = (int)$user['staff_id'];
        $tablesTable = $ctx['tables']['tables'];
        $orders = $ctx['tables']['orders'];
        $assignedBefore = $this->assignedTables($user, $tablesTable);
        $alreadyAssignedIds = array_map('intval', array_column($assignedBefore, 'table_id'));

        $candidateTables = $this->candidateTables($tablesTable, $tablesLimit, $alreadyAssignedIds);
        $insertedTables = [];
        if ($apply && count($candidateTables)) {
            foreach ($candidateTables as $t) {
                $exists = DB::table('pmd_waiter_table_assignments')
                    ->where('staff_id', $staffId)
                    ->where('table_id', (int)$t['table_id'])
                    ->where('is_active', 1)
                    ->exists();
                if (!$exists) {
                    DB::table('pmd_waiter_table_assignments')->insert([
                        'staff_id' => $staffId,
                        'table_id' => (int)$t['table_id'],
                        'location_id' => $t['location_id'] ?? null,
                        'section_name' => request()->get('section', 'Main section'),
                        'is_active' => 1,
                        'assigned_by' => $user['id'] ?? null,
                        'notes' => 'PMD v85 auto connect',
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ]);
                    $insertedTables[] = $t;
                }
            }
        }

        $assignedAfterIds = array_values(array_unique(array_merge($alreadyAssignedIds, array_map(function ($t) { return (int)$t['table_id']; }, $candidateTables))));
        $orderPlan = $this->planOrderAssignment($orders, $staffId, $assignedAfterIds, $ordersLimit);
        $updatedOrders = [];
        if ($apply && count($orderPlan['order_ids'])) {
            $oc = $this->cols($orders);
            $orderId = $this->pick($oc, ['order_id', 'id']);
            $updates = [];
            foreach (['assignee_id', 'waiter_id', 'server_id', 'assigned_staff_id', 'assigned_to', 'employee_id'] as $col) {
                if (in_array($col, $oc, true)) { $updates[$col] = $staffId; break; }
            }
            if (in_array('assignee_group_id', $oc, true)) {
                $groupId = $this->staffGroupId($staffId);
                if ($groupId) $updates['assignee_group_id'] = $groupId;
            }
            if (in_array('assignee_updated_at', $oc, true)) $updates['assignee_updated_at'] = date('Y-m-d H:i:s');
            if (in_array('updated_at', $oc, true)) $updates['updated_at'] = date('Y-m-d H:i:s');

            if ($orderId && count($updates)) {
                DB::table($orders)->whereIn($orderId, $orderPlan['order_ids'])->update($updates);
                $updatedOrders = $orderPlan['order_ids'];
            }
        }

        return [
            'ok' => true,
            'apply' => $apply,
            'staff_id' => $staffId,
            'tables_limit' => $tablesLimit,
            'orders_limit' => $ordersLimit,
            'tables_already_assigned' => $assignedBefore,
            'tables_to_assign' => $candidateTables,
            'tables_inserted' => $insertedTables,
            'orders_to_connect' => $orderPlan,
            'orders_updated' => $updatedOrders,
            'note' => 'No fake orders/food created. Existing tables/orders are connected to this waiter where safe.',
        ];
    }

    protected function healthMessage($user, $assigned, $openOrders, $readyMetric)
    {
        if (empty($user['staff_id'])) return 'No staff_id detected for this login. Need to link admin user to staff first.';
        if (!count($assigned)) return 'Waiter user exists, but no tables/section assigned yet.';
        if ($openOrders <= 0 && (int)($readyMetric['count'] ?? 0) <= 0) return 'Tables are assigned, but there are no active/ready items for those tables right now.';
        return 'Connected: waiter has tables and active/ready data can flow into the dashboard.';
    }

    protected function context()
    {
        $all = $this->tables();
        return [
            'user' => $this->currentUserInfo(),
            'tables' => [
                'orders' => $this->find($all, ['orders']),
                'order_menus' => $this->find($all, ['order_menus']),
                'tables' => $this->find($all, ['tables']),
                'notifications' => $this->find($all, ['notifications', 'notification_recipients', 'device_notifications']),
                'waiter_calls' => $this->find($all, ['waiter_calls', 'waiter_requests']),
                'payment_transactions' => $this->find($all, ['order_payment_transactions', 'payment_transactions', 'payment_logs', 'payment_attempts', 'payments']),
                'statuses' => $this->find($all, ['statuses']),
                'assignments' => 'pmd_waiter_table_assignments',
            ],
        ];
    }

    protected function currentUserInfo()
    {
        $user = null;
        try { $user = AdminAuth::getUser(); } catch (\Throwable $e) { try { $user = AdminAuth::user(); } catch (\Throwable $e2) {} }
        $out = ['id'=>null,'user_id'=>null,'staff_id'=>null,'username'=>'','email'=>'','ids'=>[],'source'=>'AdminAuth'];
        if ($user) {
            $arr = is_object($user) && method_exists($user, 'getAttributes') ? $user->getAttributes() : (array)$user;
            foreach (['user_id','id'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) { $out[$k === 'id' ? 'id' : 'user_id'] = (int)$arr[$k]; }
            foreach (['staff_id','staffId'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) { $out['staff_id'] = (int)$arr[$k]; }
            foreach (['username','name','login','staff_name'] as $k) if (!empty($arr[$k])) { $out['username'] = (string)$arr[$k]; break; }
            foreach (['email','staff_email'] as $k) if (!empty($arr[$k])) { $out['email'] = (string)$arr[$k]; break; }
        }

        $users = $this->find($this->tables(), ['users']);
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

        foreach ([$out['staff_id'], $out['id'], $out['user_id']] as $id) {
            if ($id !== null && is_numeric($id) && !in_array((int)$id, $out['ids'], true)) $out['ids'][] = (int)$id;
        }
        return $out;
    }

    protected function findWaiterStaff($hint = [])
    {
        $staffs = $this->find($this->tables(), ['staffs']);
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
            $table->unique(['staff_id','table_id','is_active'], 'pmd_waiter_table_unique_v85');
        });
    }

    protected function assignedTables($user, $tablesTable)
    {
        if (empty($user['staff_id'])) return [];
        $rows = DB::table('pmd_waiter_table_assignments')->where('staff_id', (int)$user['staff_id'])->where('is_active', 1)->orderBy('id')->get();
        if (!$rows || !count($rows)) return [];
        $ids = [];
        foreach ($rows as $r) $ids[] = (int)$r->table_id;
        $labels = $this->tableLabels($tablesTable, $ids);
        $out = [];
        foreach ($rows as $r) {
            $tid = (int)$r->table_id;
            $out[] = [
                'id' => (int)$r->id,
                'staff_id' => (int)$r->staff_id,
                'table_id' => $tid,
                'label' => $labels[$tid] ?? ('T'.$tid),
                'section_name' => $r->section_name ?: 'Main section',
                'location_id' => $r->location_id,
            ];
        }
        return $out;
    }

    protected function candidateTables($tablesTable, $limit, $excludeIds)
    {
        if (!$tablesTable) return [];
        $tc = $this->cols($tablesTable);
        $tid = $this->pick($tc, ['table_id','id']);
        if (!$tid) return [];
        $name = $this->pick($tc, ['table_name','name','label','pos_table_label']);
        $num = $this->pick($tc, ['table_no','table_number','number']);
        $status = $this->pick($tc, ['table_status','status','is_active']);
        $loc = $this->pick($tc, ['location_id']);
        $where = [];
        if ($status) $where[] = 'COALESCE('.$this->q($status).',1)=1';
        if ($name) $where[] = 'LOWER(COALESCE(CAST('.$this->q($name).' AS CHAR),"")) NOT REGEXP "cashier|delivery|takeaway"';
        if (count($excludeIds)) $where[] = $this->q($tid).' NOT IN ('.implode(',', array_map('intval', $excludeIds)).')';
        $expr = $name ? $this->q($name) : ($num ? $this->q($num) : $this->q($tid));
        $select = $this->q($tid).' table_id, '.$expr.' label'.($loc ? ', '.$this->q($loc).' location_id' : ', NULL location_id');
        $order = $this->pick($tc, ['priority','sort_order','table_no','table_id','id']);
        $sql = 'SELECT '.$select.' FROM '.$this->q($tablesTable).' WHERE '.(count($where)?implode(' AND ', $where):'1=1').' ORDER BY '.($order ? $this->q($order) : $this->q($tid)).' ASC LIMIT '.(int)$limit;
        $rows = DB::select($sql);
        $out = [];
        foreach ($rows as $r) {
            $a = (array)$r;
            $lbl = trim((string)($a['label'] ?? ''));
            $out[] = [
                'table_id' => (int)$a['table_id'],
                'label' => $lbl !== '' ? (preg_match('/^t/i', $lbl) ? $lbl : 'T'.$lbl) : 'T'.(int)$a['table_id'],
                'location_id' => $a['location_id'] ?? null,
            ];
        }
        return $out;
    }

    protected function tableLabels($tablesTable, $ids)
    {
        $out = [];
        if (!$tablesTable || !count($ids)) return $out;
        $tc = $this->cols($tablesTable);
        $tid = $this->pick($tc, ['table_id','id']);
        $name = $this->pick($tc, ['table_name','name','label','pos_table_label']);
        $num = $this->pick($tc, ['table_no','table_number','number']);
        if (!$tid) return $out;
        $expr = $name ? $this->q($name) : ($num ? $this->q($num) : $this->q($tid));
        $rows = DB::select('SELECT '.$this->q($tid).' id, '.$expr.' label FROM '.$this->q($tablesTable).' WHERE '.$this->q($tid).' IN ('.implode(',', array_map('intval',$ids)).')');
        foreach ($rows as $r) {
            $a = (array)$r;
            $id = (int)$a['id'];
            $lbl = trim((string)($a['label'] ?? ''));
            $out[$id] = $lbl !== '' ? (preg_match('/^t/i', $lbl) ? $lbl : 'T'.$lbl) : 'T'.$id;
        }
        return $out;
    }

    protected function metricMyTables($assigned, $tablesTable)
    {
        $labels = array_map(function ($r) { return $r['label']; }, $assigned);
        $total = 0;
        if ($tablesTable) $total = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($tablesTable));
        return [
            'label' => 'MY TABLES',
            'value' => count($labels) ? implode('/', array_slice($labels,0,3)).(count($labels)>3?'/…':'') : '—',
            'sub' => count($labels) ? 'assigned section' : 'no tables assigned',
            'count' => count($labels),
            'total' => $total,
            'tables' => $labels,
            'source' => 'pmd_waiter_table_assignments',
        ];
    }

    protected function metricActiveOrders($orders, $user, $assignedTableIds)
    {
        $count = $this->countOrders($orders, $user, $assignedTableIds, true);
        return ['label'=>'ACTIVE ORDERS','value'=>(string)$count,'sub'=>'my open orders','count'=>$count,'source'=>'orders by direct assignee OR assigned table'];
    }

    protected function countOrders($orders, $user, $assignedTableIds, $openOnly)
    {
        if (!$orders) return 0;
        $oc = $this->cols($orders);
        $where = [];
        if ($openOnly) { list($open,) = $this->openWhere($oc, 'o'); $where[] = $open; }
        list($scope,) = $this->waiterScopeWhere($oc, 'o', $user, $assignedTableIds);
        $where[] = $scope;
        return (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' o WHERE '.implode(' AND ', $where));
    }

    protected function countUnassignedOrdersOnAssignedTables($orders, $assignedTableIds)
    {
        if (!$orders || !count($assignedTableIds)) return 0;
        $oc = $this->cols($orders);
        $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
        if (!$tableCol) return 0;
        list($open,) = $this->openWhere($oc, 'o');
        $assignee = $this->pick($oc, ['assignee_id','waiter_id','server_id','assigned_staff_id','assigned_to','employee_id']);
        $unassigned = $assignee ? '(o.'.$this->q($assignee).' IS NULL OR o.'.$this->q($assignee).' = 0)' : '1=1';
        return (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' o WHERE '.$open.' AND '.$unassigned.' AND o.'.$this->q($tableCol).' IN ('.implode(',', array_map('intval',$assignedTableIds)).')');
    }

    protected function metricReadyToServe($orders, $orderMenus, $user, $assignedTableIds)
    {
        $out = ['label'=>'READY TO SERVE','value'=>'0','sub'=>'items from kitchen','count'=>0,'source'=>'no ready source'];
        if (!$orderMenus) return $out;
        $mc = $this->cols($orderMenus);
        $orderIdM = $this->pick($mc, ['order_id']);
        $qty = $this->pick($mc, ['quantity','qty','menu_quantity']);
        list($readyWhere, $readySource) = $this->readyWhere($mc, 'm');
        $qtyExpr = $qty ? 'COALESCE(SUM(CAST(m.'.$this->q($qty).' AS DECIMAL(12,2))),0)' : 'COUNT(*)';
        if ($orders && $orderIdM) {
            $oc = $this->cols($orders);
            $orderIdO = $this->pick($oc, ['order_id','id']);
            if ($orderIdO) {
                list($openWhere,) = $this->openWhere($oc, 'o');
                list($scopeWhere, $scopeSource) = $this->waiterScopeWhere($oc, 'o', $user, $assignedTableIds);
                $value = (float)$this->scalar('SELECT '.$qtyExpr.' v FROM '.$this->q($orderMenus).' m JOIN '.$this->q($orders).' o ON o.'.$this->q($orderIdO).' = m.'.$this->q($orderIdM).' WHERE '.$openWhere.' AND '.$scopeWhere.' AND '.$readyWhere);
                $out['count'] = (int)$value;
                $out['value'] = (string)(int)$value;
                $out['source'] = $orderMenus.'.'.$readySource.' + '.$scopeSource;
                return $out;
            }
        }
        $value = (float)$this->scalar('SELECT '.$qtyExpr.' v FROM '.$this->q($orderMenus).' m WHERE '.$readyWhere);
        $out['count'] = (int)$value;
        $out['value'] = (string)(int)$value;
        $out['source'] = $orderMenus.'.'.$readySource.' fallback no orders join';
        return $out;
    }

    protected function metricNeedsAttention($notifications, $waiterCalls, $user, $assignedTableIds)
    {
        $count = 0; $sources = [];
        foreach ([['table'=>$waiterCalls,'name'=>'waiter_calls'],['table'=>$notifications,'name'=>'notifications']] as $item) {
            if (!$item['table']) continue;
            $cols = $this->cols($item['table']);
            list($unresolved, $unresSource) = $this->unresolvedWhere($cols, 'a');
            list($scope, $scopeSource) = $this->attentionScopeWhere($cols, 'a', $user, $assignedTableIds);
            $type = $this->pick($cols, ['type','notification_type','event_type']);
            $typeWhere = '1=1';
            if ($type && $item['name'] === 'notifications') $typeWhere = 'LOWER(COALESCE(CAST(a.'.$this->q($type).' AS CHAR),"")) REGEXP "waiter|note|allergy|request|status|order"';
            $c = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($item['table']).' a WHERE '.$unresolved.' AND '.$scope.' AND '.$typeWhere);
            $count += $c;
            $sources[] = $item['table'].' '.$unresSource.' '.$scopeSource;
        }
        return ['label'=>'NEEDS ATTENTION','value'=>(string)$count,'sub'=>'calls / notes / allergies','count'=>$count,'source'=>count($sources)?implode(' + ',$sources):'no alert source'];
    }

    protected function metricChecksToClose($orders, $tx, $user, $assignedTableIds)
    {
        $out = ['label'=>'CHECKS TO CLOSE','value'=>'€0.00','sub'=>'0 payments pending','count'=>0,'raw'=>0,'source'=>'orders unpaid fallback'];
        if (!$orders) return $out;
        $oc = $this->cols($orders);
        $amt = $this->pick($oc, ['order_total','total','total_amount','grand_total']);
        $paid = $this->pick($oc, ['is_paid','paid']);
        $paidAt = $this->pick($oc, ['paid_at','settled_at']);
        $paymentStatus = $this->pick($oc, ['payment_status','settlement_status','status']);
        if ($paidAt) $where = 'o.'.$this->q($paidAt).' IS NULL';
        elseif ($paid) $where = 'COALESCE(o.'.$this->q($paid).',0) = 0';
        elseif ($paymentStatus) $where = 'LOWER(COALESCE(CAST(o.'.$this->q($paymentStatus).' AS CHAR),"")) NOT REGEXP "paid|success|settled|cancel|failed"';
        else $where = '1=0';
        list($scope, $scopeSource) = $this->waiterScopeWhere($oc, 'o', $user, $assignedTableIds);
        list($open,) = $this->openWhere($oc, 'o');
        $amountExpr = $amt ? 'COALESCE(SUM(CAST(o.'.$this->q($amt).' AS DECIMAL(15,2))),0)' : '0';
        $row = DB::select('SELECT COUNT(*) c, '.$amountExpr.' a FROM '.$this->q($orders).' o WHERE '.$where.' AND '.$open.' AND '.$scope);
        if ($row) { $a=(array)$row[0]; $out['count']=(int)($a['c']??0); $out['raw']=(float)($a['a']??0); }
        $out['value'] = $this->money($out['raw']);
        $out['sub'] = $out['count'].' payments pending';
        $out['source'] = $scopeSource;
        return $out;
    }

    protected function planOrderAssignment($orders, $staffId, $assignedTableIds, $limit)
    {
        $out = ['possible'=>false,'reason'=>'no orders table or no assignment column','order_ids'=>[]];
        if (!$orders || !count($assignedTableIds)) return $out;
        $oc = $this->cols($orders);
        $orderId = $this->pick($oc, ['order_id','id']);
        $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
        $assignee = $this->pick($oc, ['assignee_id','waiter_id','server_id','assigned_staff_id','assigned_to','employee_id']);
        if (!$orderId || !$tableCol || !$assignee) return $out;
        list($open,) = $this->openWhere($oc, 'o');
        $rows = DB::select('SELECT o.'.$this->q($orderId).' id FROM '.$this->q($orders).' o WHERE '.$open.' AND o.'.$this->q($tableCol).' IN ('.implode(',', array_map('intval',$assignedTableIds)).') AND (o.'.$this->q($assignee).' IS NULL OR o.'.$this->q($assignee).' = 0) ORDER BY o.'.$this->q($orderId).' DESC LIMIT '.(int)$limit);
        $ids = array_map(function($r){ $a=(array)$r; return (int)$a['id']; }, $rows);
        return ['possible'=>true,'assignment_column'=>$assignee,'order_ids'=>$ids,'count'=>count($ids),'reason'=>count($ids)?'unassigned open orders on waiter tables':'nothing to update'];
    }

    protected function waiterScopeWhere($cols, $alias, $user, $assignedTableIds)
    {
        $parts = [];
        $sources = [];
        if (!empty($user['staff_id'])) {
            foreach (['assignee_id','waiter_id','server_id','assigned_staff_id','assigned_to','employee_id','staff_id'] as $col) {
                if (in_array($col, $cols, true)) { $parts[] = $this->qa($alias,$col).' = '.(int)$user['staff_id']; $sources[] = $col.'=staff'; break; }
            }
        }
        $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
        if ($tableCol && count($assignedTableIds)) {
            $parts[] = $this->qa($alias,$tableCol).' IN ('.implode(',', array_map('intval',$assignedTableIds)).')';
            $sources[] = $tableCol.' IN assigned tables';
        }
        if (!count($parts)) return ['1=0', 'no waiter/order/table link detected'];
        return ['('.implode(' OR ', $parts).')', implode(' OR ', $sources)];
    }

    protected function attentionScopeWhere($cols, $alias, $user, $assignedTableIds)
    {
        $parts = [];
        if (!empty($user['staff_id'])) foreach (['staff_id','waiter_id','assignee_id','assigned_to','user_id'] as $col) if (in_array($col,$cols,true)) { $parts[]=$this->qa($alias,$col).'='.(int)$user['staff_id']; break; }
        $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
        if ($tableCol && count($assignedTableIds)) $parts[]=$this->qa($alias,$tableCol).' IN ('.implode(',',array_map('intval',$assignedTableIds)).')';
        if (!count($parts)) return ['1=1', 'no attention scope column; fallback all unresolved'];
        return ['('.implode(' OR ', $parts).')', 'waiter/table scoped'];
    }

    protected function staffGroupId($staffId)
    {
        if (Schema::hasTable('staffs_groups')) {
            $row = DB::table('staffs_groups')->where('staff_id', $staffId)->first();
            if ($row && isset($row->staff_group_id)) return (int)$row->staff_group_id;
        }
        $staffs = $this->find($this->tables(), ['staffs']);
        if ($staffs && in_array('staff_role_id', $this->cols($staffs), true)) return (int)$this->scalar('SELECT staff_role_id v FROM '.$this->q($staffs).' WHERE staff_id='.(int)$staffId.' LIMIT 1');
        return null;
    }

    protected function openWhere($cols, $alias)
    {
        $status = $this->pick($cols, ['status_name','order_status_name','status','order_status','order_status_id','status_id']);
        if (!$status) return ['1=1','no status column'];
        return [$this->statusNotMatchesSql($alias,$status,'complete|completed|closed|cancel|cancelled|paid|served|delivered|done|void|reject'),$status];
    }

    protected function readyWhere($cols, $alias)
    {
        $status = $this->pick($cols, ['status_name','order_status_name','status','order_status','order_menu_status','kitchen_status','order_menu_status_id','status_id']);
        if (!$status) return ['1=0','no ready status column'];
        $positive = $this->statusMatchesSql($alias,$status,'ready|complete|completed|prepared|done');
        $negative = $this->statusNotMatchesSql($alias,$status,'served|delivered|cancel|cancelled|void|reject|paid');
        return ['('.$positive.') AND ('.$negative.')',$status];
    }

    protected function unresolvedWhere($cols, $alias)
    {
        $read = $this->pick($cols, ['resolved_at','read_at','seen_at','is_resolved','is_read','read','seen','status']);
        if (!$read) return ['1=1','no resolved column'];
        if (substr($read,-3)==='_at') return [$this->qa($alias,$read).' IS NULL',$read];
        if ($read === 'status') return ['LOWER(COALESCE(CAST('.$this->qa($alias,$read).' AS CHAR),"")) NOT REGEXP "done|resolved|closed|cancel|cancelled|served|delivered"',$read];
        return ['COALESCE('.$this->qa($alias,$read).',0)=0',$read];
    }

    protected function statusMatchesSql($alias, $statusCol, $pattern)
    {
        $direct = 'LOWER(COALESCE(CAST('.$this->qa($alias,$statusCol).' AS CHAR),"")) REGEXP "'.$pattern.'"';
        $st = $this->statusTableCache ?: $this->find($this->tables(), ['statuses']);
        if (!$st) return $direct;
        $cols = $this->cols($st);
        $id = $this->pick($cols, ['status_id','id']);
        $name = $this->pick($cols, ['status_name','name','status','label']);
        if (!$id || !$name) return $direct;
        return '('.$direct.' OR EXISTS (SELECT 1 FROM '.$this->q($st).' st WHERE st.'.$this->q($id).' = '.$this->qa($alias,$statusCol).' AND LOWER(COALESCE(CAST(st.'.$this->q($name).' AS CHAR),"")) REGEXP "'.$pattern.'"))';
    }
    protected function statusNotMatchesSql($alias,$statusCol,$pattern) { return 'NOT ('.$this->statusMatchesSql($alias,$statusCol,$pattern).')'; }
    protected function tables() { return array_map(function($r){$a=(array)$r;return reset($a);}, DB::select('SHOW TABLES')); }
    protected function find($tables,$names) { foreach($names as $name){ foreach(['ti_'.$name,$name] as $c){ if(in_array($c,$tables,true)) return $c; } } foreach($names as $name){ foreach($tables as $t){ if($t===$name || substr($t,-strlen('_'.$name))==='_'.$name) return $t; } } return null; }
    protected function cols($table) { if(!$table) return []; if(isset($this->columnsCache[$table])) return $this->columnsCache[$table]; try{$this->columnsCache[$table]=array_map(function($r){return $r->Field;}, DB::select('SHOW COLUMNS FROM '.$this->q($table)));}catch(\Throwable $e){$this->columnsCache[$table]=[];} return $this->columnsCache[$table]; }
    protected function pick($cols,$names) { foreach($names as $n) if(in_array($n,$cols,true)) return $n; return null; }
    protected function scalar($sql) { try{$rows=DB::select($sql); if(!$rows) return 0; $a=(array)$rows[0]; return reset($a);}catch(\Throwable $e){return 0;} }
    protected function q($id) { return '`'.str_replace('`','``',$id).'`'; }
    protected function qa($alias,$id) { return $alias.'.'.$this->q($id); }
    protected function quote($v) { return DB::getPdo()->quote((string)$v); }
    protected function money($value) { return '€'.number_format((float)$value,2,'.',','); }
    protected function error(\Throwable $e) { return Response::json(['ok'=>false,'version'=>'v85','error'=>$e->getMessage(),'file'=>$e->getFile(),'line'=>$e->getLine()],500); }
}
