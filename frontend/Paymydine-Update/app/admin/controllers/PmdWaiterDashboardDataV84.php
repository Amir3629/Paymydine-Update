<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class PmdWaiterDashboardDataV84 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    protected $columnsCache = [];
    protected $statusTableCache = null;

    public function index()
    {
        try {
            return Response::json($this->build());
        } catch (\Throwable $e) {
            return Response::json([
                'ok' => false,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    protected function build()
    {
        $tables = $this->tables();
        $orders = $this->find($tables, ['orders']);
        $orderMenus = $this->find($tables, ['order_menus']);
        $tablesTable = $this->find($tables, ['tables']);
        $notifications = $this->find($tables, ['notifications', 'notification_recipients', 'device_notifications']);
        $waiterCalls = $this->find($tables, ['waiter_calls', 'waiter_requests']);
        $payTx = $this->find($tables, ['order_payment_transactions', 'payment_transactions', 'payment_logs', 'payment_attempts', 'payments']);
        $statuses = $this->find($tables, ['statuses']);
        $this->statusTableCache = $statuses;

        $user = $this->currentUserInfo();

        $myTables = $this->myTables($orders, $tablesTable, $user);
        $ready = $this->readyToServe($orders, $orderMenus, $user);
        $activeOrders = $this->activeOrders($orders, $user);
        $attention = $this->needsAttention($notifications, $waiterCalls, $user);
        $checks = $this->checksToClose($orders, $payTx, $user);

        return [
            'ok' => true,
            'version' => 'v84',
            'generated_at' => date('c'),
            'user' => $user,
            'detected_tables' => [
                'orders' => $orders,
                'order_menus' => $orderMenus,
                'tables' => $tablesTable,
                'notifications' => $notifications,
                'waiter_calls' => $waiterCalls,
                'payment_transactions' => $payTx,
                'statuses' => $statuses,
            ],
            'metrics' => [
                'my_tables' => $myTables,
                'ready_to_serve' => $ready,
                'active_orders' => $activeOrders,
                'needs_attention' => $attention,
                'checks_to_close' => $checks,
            ],
        ];
    }

    protected function currentUserInfo()
    {
        $user = null;
        try {
            $user = AdminAuth::getUser();
        } catch (\Throwable $e) {
            try { $user = AdminAuth::user(); } catch (\Throwable $e2) { $user = null; }
        }

        $out = [
            'id' => null,
            'staff_id' => null,
            'user_id' => null,
            'username' => '',
            'email' => '',
            'ids' => [],
            'source' => 'admin auth',
        ];

        if ($user) {
            $arr = is_array($user) ? $user : (array)$user;
            foreach (['staff_id', 'staffId'] as $k) {
                if (isset($arr[$k]) && is_numeric($arr[$k])) $out['staff_id'] = (int)$arr[$k];
            }
            foreach (['id', 'user_id'] as $k) {
                if (isset($arr[$k]) && is_numeric($arr[$k])) $out[$k === 'id' ? 'id' : 'user_id'] = (int)$arr[$k];
            }
            foreach (['username', 'name', 'login'] as $k) {
                if (isset($arr[$k]) && $arr[$k] !== '') { $out['username'] = (string)$arr[$k]; break; }
            }
            foreach (['email'] as $k) {
                if (isset($arr[$k]) && $arr[$k] !== '') { $out['email'] = (string)$arr[$k]; break; }
            }

            foreach ([$out['staff_id'], $out['id'], $out['user_id']] as $id) {
                if ($id !== null && is_numeric($id) && !in_array((int)$id, $out['ids'], true)) $out['ids'][] = (int)$id;
            }
        }

        return $out;
    }

    protected function waiterWhere($cols, $alias, $user)
    {
        $ids = isset($user['ids']) ? $user['ids'] : [];
        if (!count($ids)) return ['1=1', 'all waiters fallback'];

        $staffCols = ['staff_id', 'waiter_id', 'server_id', 'assigned_staff_id', 'assigned_to', 'assignee_id', 'employee_id'];
        $userCols = ['user_id', 'admin_user_id', 'created_by'];
        $all = array_merge($staffCols, $userCols);

        foreach ($all as $col) {
            if (in_array($col, $cols, true)) {
                return [$this->qa($alias, $col).' IN ('.implode(',', array_map('intval', $ids)).')', $col];
            }
        }

        return ['1=1', 'all waiters fallback'];
    }

    protected function todayWhere($cols, $alias)
    {
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on', 'order_date', 'updated_at']);
        if ($date) return ['DATE('.$this->qa($alias, $date).') = CURDATE()', $date];
        return ['1=1', 'no date column'];
    }

    protected function openWhere($cols, $alias)
    {
        $status = $this->pick($cols, ['status_name', 'order_status_name', 'status', 'order_status', 'order_status_id', 'status_id']);
        if (!$status) return ['1=1', 'no status column'];
        return [$this->statusNotMatchesSql($alias, $status, 'complete|completed|closed|cancel|cancelled|paid|served|delivered|done|void|reject'), $status];
    }

    protected function readyWhere($cols, $alias)
    {
        $status = $this->pick($cols, ['status_name', 'order_status_name', 'status', 'order_status', 'order_menu_status', 'kitchen_status', 'order_menu_status_id', 'status_id']);
        if (!$status) return ['1=0', 'no ready status column'];
        $positive = $this->statusMatchesSql($alias, $status, 'ready|complete|completed|prepared|done');
        $negative = $this->statusNotMatchesSql($alias, $status, 'served|delivered|cancel|cancelled|void|reject|paid');
        return ['('.$positive.') AND ('.$negative.')', $status];
    }

    protected function unresolvedWhere($cols, $alias)
    {
        $read = $this->pick($cols, ['resolved_at', 'read_at', 'seen_at', 'is_resolved', 'is_read', 'read', 'seen', 'status']);
        if (!$read) return ['1=1', 'no resolved column'];
        if (substr($read, -3) === '_at') return [$this->qa($alias, $read).' IS NULL', $read];
        if ($read === 'status') return ['LOWER(COALESCE(CAST('.$this->qa($alias, $read).' AS CHAR),"")) NOT REGEXP "done|resolved|closed|cancel|cancelled|served|delivered"', $read];
        return ['COALESCE('.$this->qa($alias, $read).',0) = 0', $read];
    }

    protected function myTables($orders, $tablesTable, $user)
    {
        $out = ['label' => 'MY TABLES', 'value' => '—', 'sub' => 'assigned section', 'count' => 0, 'total' => 0, 'tables' => [], 'source' => 'no orders table'];
        if (!$orders) return $out;

        $oc = $this->cols($orders);
        $tableId = $this->pick($oc, ['table_id', 'location_table_id', 'table_no', 'table_number']);
        if (!$tableId) return $out;

        list($todayWhere, $dateSource) = $this->todayWhere($oc, 'o');
        list($openWhere, $statusSource) = $this->openWhere($oc, 'o');
        list($waiterWhere, $waiterSource) = $this->waiterWhere($oc, 'o', $user);

        $ids = DB::select('SELECT DISTINCT o.'.$this->q($tableId).' v FROM '.$this->q($orders).' o WHERE '.$todayWhere.' AND '.$openWhere.' AND '.$waiterWhere.' AND o.'.$this->q($tableId).' IS NOT NULL LIMIT 12');
        $ids = array_values(array_filter(array_map(function ($row) { $a = (array)$row; return (string)reset($a); }, $ids), function ($v) { return $v !== ''; }));

        $labels = [];
        if ($tablesTable && count($ids)) {
            $tc = $this->cols($tablesTable);
            $tid = $this->pick($tc, ['table_id', 'id']);
            $name = $this->pick($tc, ['table_name', 'name', 'label', 'pos_table_label']);
            $num = $this->pick($tc, ['table_no', 'table_number', 'number']);
            if ($tid) {
                $quoted = array_map(function ($v) { return DB::getPdo()->quote($v); }, $ids);
                $expr = $name ? $this->q($name) : ($num ? $this->q($num) : $this->q($tid));
                $rows = DB::select('SELECT '.$this->q($tid).' id, '.$expr.' label FROM '.$this->q($tablesTable).' WHERE '.$this->q($tid).' IN ('.implode(',', $quoted).') LIMIT 12');
                foreach ($rows as $row) {
                    $a = (array)$row;
                    $lbl = trim((string)($a['label'] ?? ''));
                    if ($lbl !== '') $labels[] = preg_match('/^t/i', $lbl) ? $lbl : 'T'.$lbl;
                }
                $out['total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($tablesTable));
            }
        }

        if (!count($labels)) {
            foreach ($ids as $id) $labels[] = preg_match('/^t/i', $id) ? $id : 'T'.$id;
        }

        $out['count'] = count($labels);
        $out['tables'] = $labels;
        $out['value'] = count($labels) ? implode('/', array_slice($labels, 0, 3)).(count($labels) > 3 ? '/…' : '') : '—';
        $out['sub'] = count($labels) ? 'active assigned tables' : 'no active table';
        $out['source'] = $orders.'.'.$tableId.' / '.$dateSource.' / '.$statusSource.' / '.$waiterSource;
        return $out;
    }

    protected function activeOrders($orders, $user)
    {
        $out = ['label' => 'ACTIVE ORDERS', 'value' => '0', 'sub' => 'my open orders', 'count' => 0, 'source' => 'no orders table'];
        if (!$orders) return $out;
        $oc = $this->cols($orders);
        list($todayWhere, $dateSource) = $this->todayWhere($oc, 'o');
        list($openWhere, $statusSource) = $this->openWhere($oc, 'o');
        list($waiterWhere, $waiterSource) = $this->waiterWhere($oc, 'o', $user);
        $count = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' o WHERE '.$todayWhere.' AND '.$openWhere.' AND '.$waiterWhere);
        $out['value'] = (string)$count;
        $out['count'] = $count;
        $out['source'] = $orders.' / '.$dateSource.' / '.$statusSource.' / '.$waiterSource;
        return $out;
    }

    protected function readyToServe($orders, $orderMenus, $user)
    {
        $out = ['label' => 'READY TO SERVE', 'value' => '0', 'sub' => 'items from kitchen', 'count' => 0, 'source' => 'no ready source'];

        if ($orderMenus) {
            $mc = $this->cols($orderMenus);
            $orderIdM = $this->pick($mc, ['order_id']);
            $qty = $this->pick($mc, ['quantity', 'qty', 'menu_quantity']);
            list($readyWhere, $readySource) = $this->readyWhere($mc, 'm');
            $qtyExpr = $qty ? 'COALESCE(SUM(CAST(m.'.$this->q($qty).' AS DECIMAL(12,2))),0)' : 'COUNT(*)';

            if ($orders && $orderIdM) {
                $oc = $this->cols($orders);
                $orderIdO = $this->pick($oc, ['order_id', 'id']);
                if ($orderIdO) {
                    list($todayWhere, $dateSource) = $this->todayWhere($oc, 'o');
                    list($openWhere, $statusSource) = $this->openWhere($oc, 'o');
                    list($waiterWhere, $waiterSource) = $this->waiterWhere($oc, 'o', $user);
                    $value = (float)$this->scalar('SELECT '.$qtyExpr.' v FROM '.$this->q($orderMenus).' m JOIN '.$this->q($orders).' o ON o.'.$this->q($orderIdO).' = m.'.$this->q($orderIdM).' WHERE '.$todayWhere.' AND '.$openWhere.' AND '.$waiterWhere.' AND '.$readyWhere);
                    $out['count'] = (int)$value;
                    $out['value'] = (string)(int)$value;
                    $out['source'] = $orderMenus.'.'.$readySource.' + '.$orders.' / '.$dateSource.' / '.$waiterSource;
                    return $out;
                }
            }

            $value = (float)$this->scalar('SELECT '.$qtyExpr.' v FROM '.$this->q($orderMenus).' m WHERE '.$readyWhere);
            $out['count'] = (int)$value;
            $out['value'] = (string)(int)$value;
            $out['source'] = $orderMenus.'.'.$readySource;
            return $out;
        }

        if ($orders) {
            $oc = $this->cols($orders);
            list($todayWhere, $dateSource) = $this->todayWhere($oc, 'o');
            list($readyWhere, $readySource) = $this->readyWhere($oc, 'o');
            list($waiterWhere, $waiterSource) = $this->waiterWhere($oc, 'o', $user);
            $count = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' o WHERE '.$todayWhere.' AND '.$waiterWhere.' AND '.$readyWhere);
            $out['count'] = $count;
            $out['value'] = (string)$count;
            $out['source'] = $orders.'.'.$readySource.' / '.$dateSource.' / '.$waiterSource;
        }

        return $out;
    }

    protected function needsAttention($notifications, $waiterCalls, $user)
    {
        $count = 0;
        $sources = [];

        foreach ([['table' => $waiterCalls, 'name' => 'waiter_calls'], ['table' => $notifications, 'name' => 'notifications']] as $item) {
            $table = $item['table'];
            if (!$table) continue;
            $cols = $this->cols($table);
            list($todayWhere, $dateSource) = $this->todayWhere($cols, 'a');
            list($unresolvedWhere, $unresSource) = $this->unresolvedWhere($cols, 'a');
            list($waiterWhere, $waiterSource) = $this->waiterWhere($cols, 'a', $user);
            $type = $this->pick($cols, ['type', 'notification_type', 'event_type']);
            $typeWhere = '1=1';
            if ($type && $item['name'] === 'notifications') {
                $typeWhere = 'LOWER(COALESCE(CAST('.$this->qa('a', $type).' AS CHAR),"")) REGEXP "waiter|note|allergy|request|status|order"';
            }
            $c = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' a WHERE '.$todayWhere.' AND '.$unresolvedWhere.' AND '.$waiterWhere.' AND '.$typeWhere);
            $count += $c;
            $sources[] = $table.' '.$dateSource.' '.$unresSource.' '.$waiterSource;
        }

        return ['label' => 'NEEDS ATTENTION', 'value' => (string)$count, 'sub' => 'calls / notes / allergies', 'count' => $count, 'source' => count($sources) ? implode(' + ', $sources) : 'no alert source'];
    }

    protected function checksToClose($orders, $tx, $user)
    {
        $out = ['label' => 'CHECKS TO CLOSE', 'value' => '€0.00', 'sub' => 'payments pending', 'count' => 0, 'raw' => 0, 'source' => 'no payment source'];
        $amount = 0;
        $count = 0;

        if ($tx) {
            $tc = $this->cols($tx);
            $amt = $this->pick($tc, ['amount', 'payment_amount', 'total', 'total_amount', 'transaction_amount', 'paid_amount', 'order_total']);
            $status = $this->pick($tc, ['status', 'payment_status', 'status_name', 'state']);
            $orderIdT = $this->pick($tc, ['order_id']);
            $paidWhere = $status ? 'LOWER(COALESCE(CAST(t.'.$this->q($status).' AS CHAR),"")) NOT REGEXP "paid|complete|completed|success|succeeded|captured|settled|cancel|failed"' : '1=1';
            $amountExpr = $amt ? 'COALESCE(SUM(CAST(t.'.$this->q($amt).' AS DECIMAL(15,2))),0)' : '0';

            if ($orders && $orderIdT) {
                $oc = $this->cols($orders);
                $orderIdO = $this->pick($oc, ['order_id', 'id']);
                if ($orderIdO) {
                    list($todayWhere, $dateSource) = $this->todayWhere($oc, 'o');
                    list($waiterWhere, $waiterSource) = $this->waiterWhere($oc, 'o', $user);
                    $row = DB::select('SELECT COUNT(*) c, '.$amountExpr.' a FROM '.$this->q($tx).' t JOIN '.$this->q($orders).' o ON o.'.$this->q($orderIdO).' = t.'.$this->q($orderIdT).' WHERE '.$paidWhere.' AND '.$todayWhere.' AND '.$waiterWhere);
                    if ($row) { $a = (array)$row[0]; $count = (int)($a['c'] ?? 0); $amount = (float)($a['a'] ?? 0); }
                    $out['source'] = $tx.' + '.$orders.' / '.$dateSource.' / '.$waiterSource;
                }
            }

            if ($count === 0 && $amount <= 0) {
                $row = DB::select('SELECT COUNT(*) c, '.$amountExpr.' a FROM '.$this->q($tx).' t WHERE '.$paidWhere);
                if ($row) { $a = (array)$row[0]; $count = (int)($a['c'] ?? 0); $amount = (float)($a['a'] ?? 0); }
                $out['source'] = $tx.' fallback';
            }
        } elseif ($orders) {
            $oc = $this->cols($orders);
            $amt = $this->pick($oc, ['order_total', 'total', 'total_amount', 'grand_total']);
            $paid = $this->pick($oc, ['is_paid', 'paid']);
            $paidAt = $this->pick($oc, ['paid_at', 'settled_at']);
            $paymentStatus = $this->pick($oc, ['payment_status', 'settlement_status', 'status']);
            if ($paidAt) $where = 'o.'.$this->q($paidAt).' IS NULL';
            elseif ($paid) $where = 'COALESCE(o.'.$this->q($paid).',0) = 0';
            elseif ($paymentStatus) $where = 'LOWER(COALESCE(CAST(o.'.$this->q($paymentStatus).' AS CHAR),"")) NOT REGEXP "paid|complete|completed|success|settled|cancel|failed"';
            else $where = '1=0';
            list($todayWhere, $dateSource) = $this->todayWhere($oc, 'o');
            list($waiterWhere, $waiterSource) = $this->waiterWhere($oc, 'o', $user);
            $amountExpr = $amt ? 'COALESCE(SUM(CAST(o.'.$this->q($amt).' AS DECIMAL(15,2))),0)' : '0';
            $row = DB::select('SELECT COUNT(*) c, '.$amountExpr.' a FROM '.$this->q($orders).' o WHERE '.$where.' AND '.$todayWhere.' AND '.$waiterWhere);
            if ($row) { $a = (array)$row[0]; $count = (int)($a['c'] ?? 0); $amount = (float)($a['a'] ?? 0); }
            $out['source'] = $orders.' unpaid fallback / '.$dateSource.' / '.$waiterSource;
        }

        $out['count'] = $count;
        $out['raw'] = $amount;
        $out['value'] = $this->money($amount);
        $out['sub'] = $count.' payments pending';
        return $out;
    }

    protected function statusMatchesSql($alias, $statusCol, $pattern)
    {
        $direct = 'LOWER(COALESCE(CAST('.$this->qa($alias, $statusCol).' AS CHAR),"")) REGEXP "'.$pattern.'"';
        $st = $this->statusTableCache;
        if (!$st) return $direct;
        $cols = $this->cols($st);
        $id = $this->pick($cols, ['status_id', 'id']);
        $name = $this->pick($cols, ['status_name', 'name', 'status', 'label']);
        if (!$id || !$name) return $direct;
        return '('.$direct.' OR EXISTS (SELECT 1 FROM '.$this->q($st).' st WHERE st.'.$this->q($id).' = '.$this->qa($alias, $statusCol).' AND LOWER(COALESCE(CAST(st.'.$this->q($name).' AS CHAR),"")) REGEXP "'.$pattern.'"))';
    }

    protected function statusNotMatchesSql($alias, $statusCol, $pattern)
    {
        return 'NOT ('.$this->statusMatchesSql($alias, $statusCol, $pattern).')';
    }

    protected function tables()
    {
        return array_map(function ($row) {
            $a = (array)$row;
            return reset($a);
        }, DB::select('SHOW TABLES'));
    }

    protected function find($tables, $names)
    {
        foreach ($names as $name) {
            foreach (['ti_'.$name, $name] as $candidate) {
                if (in_array($candidate, $tables, true)) return $candidate;
            }
        }
        foreach ($names as $name) {
            foreach ($tables as $table) {
                if ($table === $name || substr($table, -strlen('_'.$name)) === '_'.$name) return $table;
            }
        }
        return null;
    }

    protected function cols($table)
    {
        if (!$table) return [];
        if (isset($this->columnsCache[$table])) return $this->columnsCache[$table];
        try {
            $this->columnsCache[$table] = array_map(function ($row) { return $row->Field; }, DB::select('SHOW COLUMNS FROM '.$this->q($table)));
        } catch (\Throwable $e) {
            $this->columnsCache[$table] = [];
        }
        return $this->columnsCache[$table];
    }

    protected function pick($cols, $names)
    {
        foreach ($names as $name) {
            if (in_array($name, $cols, true)) return $name;
        }
        return null;
    }

    protected function scalar($sql)
    {
        try {
            $rows = DB::select($sql);
            if (!$rows) return 0;
            $a = (array)$rows[0];
            return reset($a);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    protected function q($id)
    {
        return '`'.str_replace('`', '``', $id).'`';
    }

    protected function qa($alias, $id)
    {
        return $alias.'.'.$this->q($id);
    }

    protected function money($value)
    {
        return '€'.number_format((float)$value, 2, '.', ',');
    }
}
