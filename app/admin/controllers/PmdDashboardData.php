<?php

namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class PmdDashboardData extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function index()
    {
        try {
            return Response::json($this->buildData());
        } catch (\Throwable $e) {
            return Response::json([
                'ok' => false,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    protected function buildData()
    {
        $tables = $this->tables();

        $orders = $this->findTable($tables, ['orders']);
        $orderTotals = $this->findTable($tables, ['order_totals']);
        $payments = $this->findTable($tables, ['payments', 'payment_logs', 'order_payment_transactions', 'payment_attempts']);
        $paymentTransactions = $this->findTable($tables, ['order_payment_transactions', 'payment_transactions', 'payment_logs']);
        $reservations = $this->findTable($tables, ['reservations']);
        $tablesTable = $this->findTable($tables, ['tables']);
        $notifications = $this->findTable($tables, ['notifications', 'notification_recipients', 'device_notifications']);
        $waiterCalls = $this->findTable($tables, ['waiter_calls']);
        $customers = $this->findTable($tables, ['customers']);
        $orderMenus = $this->findTable($tables, ['order_menus']);

        $orderInfo = $this->orderMetrics($orders, $orderTotals);
        $paymentInfo = $this->paymentMetrics($orders, $payments, $paymentTransactions, $orderInfo);
        $reservationInfo = $this->reservationMetrics($reservations);
        $tableInfo = $this->tableMetrics($tablesTable, $orders);
        $alertInfo = $this->alertMetrics($notifications, $waiterCalls);
        $kitchenInfo = $this->kitchenMetrics($orders);
        $customerInfo = $this->customerMetrics($customers);
        $topItems = $this->topItems($orderMenus);

        $avg = $orderInfo['orders_today_raw'] > 0
            ? $orderInfo['revenue_today_raw'] / max(1, $orderInfo['orders_today_raw'])
            : 0;

        return [
            'ok' => true,
            'generated_at' => date('c'),
            'detected_tables' => [
                'orders' => $orders,
                'order_totals' => $orderTotals,
                'payments' => $payments,
                'payment_transactions' => $paymentTransactions,
                'reservations' => $reservations,
                'tables' => $tablesTable,
                'notifications' => $notifications,
                'waiter_calls' => $waiterCalls,
                'customers' => $customers,
                'order_menus' => $orderMenus,
            ],
            'metrics' => [
                'revenue_today' => [
                    'label' => 'Revenue Today',
                    'value' => $this->money($orderInfo['revenue_today_raw']),
                    'raw' => $orderInfo['revenue_today_raw'],
                    'source' => $orderInfo['revenue_source'],
                ],
                'pending_payments' => [
                    'label' => 'Pending Payments',
                    'value' => $this->money($paymentInfo['pending_amount_raw']),
                    'raw' => $paymentInfo['pending_amount_raw'],
                    'count' => $paymentInfo['pending_count'],
                    'source' => $paymentInfo['source'],
                ],
                'live_alerts' => [
                    'label' => 'Live Alerts',
                    'value' => (string)$alertInfo['count'],
                    'raw' => $alertInfo['count'],
                    'source' => $alertInfo['source'],
                ],
                'active_tables' => [
                    'label' => 'Active Tables',
                    'value' => $tableInfo['active'].' / '.$tableInfo['total'],
                    'active' => $tableInfo['active'],
                    'total' => $tableInfo['total'],
                    'source' => $tableInfo['source'],
                ],
                'kitchen_status' => [
                    'label' => 'Kitchen Status',
                    'value' => $kitchenInfo['status'],
                    'preparing' => $kitchenInfo['preparing'],
                    'ready' => $kitchenInfo['ready'],
                    'completed' => $kitchenInfo['completed'],
                    'source' => $kitchenInfo['source'],
                ],
                'orders' => [
                    'label' => 'Orders',
                    'value' => (string)$orderInfo['orders_today_raw'],
                    'raw' => $orderInfo['orders_today_raw'],
                    'dine_in' => $orderInfo['dine_in'],
                    'takeaway' => $orderInfo['takeaway'],
                    'delivery' => $orderInfo['delivery'],
                    'source' => $orderInfo['orders_source'],
                ],
                'reservations' => [
                    'label' => 'Reservations',
                    'value' => (string)$reservationInfo['today'],
                    'raw' => $reservationInfo['today'],
                    'upcoming' => $reservationInfo['upcoming'],
                    'source' => $reservationInfo['source'],
                ],
                'reports' => [
                    'label' => 'Reports',
                    'value' => $this->money($avg),
                    'raw' => $avg,
                    'source' => 'calculated avg ticket',
                ],
                'customers' => [
                    'label' => 'Customers',
                    'value' => (string)$customerInfo['total'],
                    'raw' => $customerInfo['total'],
                    'today' => $customerInfo['today'],
                    'source' => $customerInfo['source'],
                ],
                'top_items' => $topItems,
            ],
        ];
    }

    protected function orderMetrics($orders, $orderTotals)
    {
        $out = [
            'revenue_today_raw' => 0,
            'orders_today_raw' => 0,
            'dine_in' => null,
            'takeaway' => null,
            'delivery' => null,
            'revenue_source' => 'no orders table',
            'orders_source' => 'no orders table',
        ];

        if (!$orders) return $out;

        $cols = $this->cols($orders);
        $id = $this->pick($cols, ['order_id', 'id']);
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on', 'order_date', 'updated_at']);
        $total = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total', 'payment_total', 'total_price', 'amount']);
        $type = $this->pick($cols, ['order_type', 'type', 'service_type']);

        $whereToday = $date ? 'DATE('.$this->qid($date).') = CURDATE()' : '1=1';

        $out['orders_today_raw'] = (int)$this->scalar(
            'SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday
        );
        $out['orders_source'] = $orders.($date ? '.'.$date : '');

        if ($total) {
            $out['revenue_today_raw'] = (float)$this->scalar(
                'SELECT COALESCE(SUM(CAST('.$this->qid($total).' AS DECIMAL(15,2))),0) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday
            );
            $out['revenue_source'] = $orders.'.'.$total;
        } elseif ($orderTotals && $id) {
            $tc = $this->cols($orderTotals);
            $otOrderId = $this->pick($tc, ['order_id']);
            $otCode = $this->pick($tc, ['code']);
            $otValue = $this->pick($tc, ['value', 'amount', 'total']);
            if ($otOrderId && $otValue) {
                $codeWhere = $otCode ? ' AND LOWER(ot.'.$this->qid($otCode).') IN ("total","order_total")' : '';
                $out['revenue_today_raw'] = (float)$this->scalar(
                    'SELECT COALESCE(SUM(CAST(ot.'.$this->qid($otValue).' AS DECIMAL(15,2))),0) AS v
                     FROM '.$this->qid($orderTotals).' ot
                     INNER JOIN '.$this->qid($orders).' o ON o.'.$this->qid($id).' = ot.'.$this->qid($otOrderId).'
                     WHERE '.$this->prefixAliasWhere($whereToday, 'o').$codeWhere
                );
                $out['revenue_source'] = $orderTotals.'.'.$otValue;
            }
        }

        if ($type) {
            $qt = $this->qid($type);
            $out['dine_in'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday.' AND LOWER('.$qt.') IN ("dinein","dine-in","dine in","restaurant","eat-in","eat_in")');
            $out['takeaway'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday.' AND LOWER('.$qt.') IN ("takeaway","take-away","pickup","pick-up","collection")');
            $out['delivery'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday.' AND LOWER('.$qt.') IN ("delivery")');
        }

        return $out;
    }

    protected function paymentMetrics($orders, $payments, $paymentTransactions, $orderInfo)
    {
        $out = [
            'pending_amount_raw' => 0,
            'pending_count' => 0,
            'source' => 'fallback no payment source',
        ];

        $tx = $paymentTransactions ?: $payments;

        if ($tx) {
            $cols = $this->cols($tx);
            $amount = $this->pick($cols, ['amount', 'payment_amount', 'total', 'total_amount', 'transaction_amount', 'paid_amount', 'order_total']);
            $status = $this->pick($cols, ['status', 'payment_status', 'status_name', 'state']);
            $created = $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on', 'paid_at']);

            $where = [];
            if ($created) $where[] = 'DATE('.$this->qid($created).') = CURDATE()';
            if ($status) {
                $where[] = 'LOWER(COALESCE('.$this->qid($status).',"")) NOT IN ("paid","completed","complete","succeeded","success","captured","settled","cancelled","canceled","failed")';
            }
            $whereSql = count($where) ? implode(' AND ', $where) : '1=1';

            if ($amount) {
                $out['pending_amount_raw'] = (float)$this->scalar(
                    'SELECT COALESCE(SUM(CAST('.$this->qid($amount).' AS DECIMAL(15,2))),0) AS v FROM '.$this->qid($tx).' WHERE '.$whereSql
                );
            }
            $out['pending_count'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($tx).' WHERE '.$whereSql);
            $out['source'] = $tx.($amount ? '.'.$amount : '');
            return $out;
        }

        if ($orders) {
            $cols = $this->cols($orders);
            $total = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total', 'payment_total', 'total_price', 'amount']);
            $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on', 'order_date', 'updated_at']);
            $paidAt = $this->pick($cols, ['paid_at', 'settled_at']);
            $isPaid = $this->pick($cols, ['is_paid', 'paid']);
            $paymentStatus = $this->pick($cols, ['payment_status', 'settlement_status']);

            $where = [];
            if ($date) $where[] = 'DATE('.$this->qid($date).') = CURDATE()';
            if ($paidAt) $where[] = $this->qid($paidAt).' IS NULL';
            elseif ($isPaid) $where[] = 'COALESCE('.$this->qid($isPaid).',0) = 0';
            elseif ($paymentStatus) $where[] = 'LOWER(COALESCE('.$this->qid($paymentStatus).',"")) NOT IN ("paid","completed","complete","succeeded","success","captured","settled")';
            else $where[] = '1=0';

            $whereSql = implode(' AND ', $where);

            if ($total) {
                $out['pending_amount_raw'] = (float)$this->scalar(
                    'SELECT COALESCE(SUM(CAST('.$this->qid($total).' AS DECIMAL(15,2))),0) AS v FROM '.$this->qid($orders).' WHERE '.$whereSql
                );
            }
            $out['pending_count'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereSql);
            $out['source'] = $orders.' unpaid fallback';
        }

        return $out;
    }

    protected function reservationMetrics($reservations)
    {
        $out = ['today' => 0, 'upcoming' => 0, 'source' => 'no reservations table'];

        if (!$reservations) return $out;

        $cols = $this->cols($reservations);
        $date = $this->pick($cols, ['reserve_date', 'reservation_date', 'booking_date', 'date', 'date_added', 'created_at', 'created_on']);

        if (!$date) {
            $out['today'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($reservations));
            $out['source'] = $reservations;
            return $out;
        }

        $out['today'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($reservations).' WHERE DATE('.$this->qid($date).') = CURDATE()');
        $out['upcoming'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($reservations).' WHERE DATE('.$this->qid($date).') >= CURDATE()');
        $out['source'] = $reservations.'.'.$date;

        return $out;
    }

    protected function tableMetrics($tablesTable, $orders)
    {
        $out = ['active' => 0, 'total' => 0, 'source' => 'no tables table'];

        if ($tablesTable) {
            $cols = $this->cols($tablesTable);
            $name = $this->pick($cols, ['table_name', 'name', 'pos_table_label']);
            $number = $this->pick($cols, ['table_no', 'table_number', 'number']);
            $status = $this->pick($cols, ['table_status', 'status', 'status_id']);

            $where = '1=1';
            if ($name) $where .= ' AND LOWER(COALESCE('.$this->qid($name).',"")) NOT LIKE "%cashier%" AND LOWER(COALESCE('.$this->qid($name).',"")) NOT LIKE "%delivery%"';
            if ($number) $where .= ' AND '.$this->qid($number).' IS NOT NULL';

            $out['total'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($tablesTable).' WHERE '.$where);
            if ($status) {
                $out['active'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($tablesTable).' WHERE '.$where.' AND COALESCE('.$this->qid($status).',0) NOT IN (0,1)');
                $out['source'] = $tablesTable.'.'.$status;
            } else {
                $out['source'] = $tablesTable;
            }
        }

        if ($orders) {
            $cols = $this->cols($orders);
            $tableId = $this->pick($cols, ['table_id', 'location_table_id']);
            $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on', 'order_date', 'updated_at']);
            if ($tableId) {
                $whereToday = $date ? 'DATE('.$this->qid($date).') = CURDATE()' : '1=1';
                $active = (int)$this->scalar('SELECT COUNT(DISTINCT '.$this->qid($tableId).') AS v FROM '.$this->qid($orders).' WHERE '.$whereToday.' AND '.$this->qid($tableId).' IS NOT NULL');
                if ($active > $out['active']) {
                    $out['active'] = $active;
                    $out['source'] = $orders.'.'.$tableId;
                }
            }
        }

        return $out;
    }

    protected function alertMetrics($notifications, $waiterCalls)
    {
        $count = 0;
        $sources = [];

        if ($notifications) {
            $cols = $this->cols($notifications);
            $created = $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on']);
            $read = $this->pick($cols, ['read_at', 'is_read', 'read', 'seen', 'seen_at']);

            $where = [];
            if ($created) $where[] = 'DATE('.$this->qid($created).') = CURDATE()';
            if ($read) {
                if (str_ends_with($read, '_at')) $where[] = $this->qid($read).' IS NULL';
                else $where[] = 'COALESCE('.$this->qid($read).',0) = 0';
            }

            $whereSql = count($where) ? implode(' AND ', $where) : '1=1';
            $count += (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($notifications).' WHERE '.$whereSql);
            $sources[] = $notifications;
        }

        if ($waiterCalls) {
            $cols = $this->cols($waiterCalls);
            $created = $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on']);
            $status = $this->pick($cols, ['status', 'call_status', 'is_resolved', 'resolved_at']);

            $where = [];
            if ($created) $where[] = 'DATE('.$this->qid($created).') = CURDATE()';
            if ($status) {
                if ($status === 'resolved_at') $where[] = $this->qid($status).' IS NULL';
                elseif ($status === 'is_resolved') $where[] = 'COALESCE('.$this->qid($status).',0) = 0';
                else $where[] = 'LOWER(COALESCE('.$this->qid($status).',"")) NOT IN ("done","resolved","closed","cancelled","canceled")';
            }

            $whereSql = count($where) ? implode(' AND ', $where) : '1=1';
            $count += (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($waiterCalls).' WHERE '.$whereSql);
            $sources[] = $waiterCalls;
        }

        return ['count' => $count, 'source' => count($sources) ? implode(' + ', $sources) : 'no alert source'];
    }

    protected function kitchenMetrics($orders)
    {
        $out = ['status' => 'Active', 'preparing' => 0, 'ready' => 0, 'completed' => 0, 'source' => 'orders fallback'];

        if (!$orders) return $out;

        $cols = $this->cols($orders);
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on', 'order_date', 'updated_at']);
        $status = $this->pick($cols, ['status', 'order_status', 'status_name']);

        $whereToday = $date ? 'DATE('.$this->qid($date).') = CURDATE()' : '1=1';

        if ($status) {
            $q = $this->qid($status);
            $out['preparing'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday.' AND LOWER(COALESCE('.$q.',"")) REGEXP "pending|prepar|received|process|open"');
            $out['ready'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday.' AND LOWER(COALESCE('.$q.',"")) REGEXP "ready|served"');
            $out['completed'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday.' AND LOWER(COALESCE('.$q.',"")) REGEXP "complete|completed|paid|done"');
            $out['source'] = $orders.'.'.$status;
        } else {
            $out['preparing'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($orders).' WHERE '.$whereToday);
            $out['source'] = $orders.' today count fallback';
        }

        return $out;
    }

    protected function customerMetrics($customers)
    {
        $out = ['total' => 0, 'today' => 0, 'source' => 'no customers table'];

        if (!$customers) return $out;

        $cols = $this->cols($customers);
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on']);

        $out['total'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($customers));
        if ($date) {
            $out['today'] = (int)$this->scalar('SELECT COUNT(*) AS v FROM '.$this->qid($customers).' WHERE DATE('.$this->qid($date).') = CURDATE()');
        }
        $out['source'] = $customers.($date ? '.'.$date : '');

        return $out;
    }

    protected function topItems($orderMenus)
    {
        if (!$orderMenus) return [];

        $cols = $this->cols($orderMenus);
        $name = $this->pick($cols, ['menu_name', 'name', 'order_menu_name', 'item_name']);
        $qty = $this->pick($cols, ['quantity', 'qty', 'menu_quantity']);
        $created = $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on']);

        if (!$name) return [];

        $where = $created ? 'WHERE DATE('.$this->qid($created).') = CURDATE()' : '';
        $qtySql = $qty ? 'SUM(CAST('.$this->qid($qty).' AS DECIMAL(15,2)))' : 'COUNT(*)';

        $rows = DB::select(
            'SELECT '.$this->qid($name).' AS name, '.$qtySql.' AS total
             FROM '.$this->qid($orderMenus).' '.$where.'
             GROUP BY '.$this->qid($name).'
             ORDER BY total DESC
             LIMIT 5'
        );

        return array_map(function ($row) {
            $arr = (array)$row;
            return [
                'name' => (string)($arr['name'] ?? ''),
                'total' => (float)($arr['total'] ?? 0),
            ];
        }, $rows);
    }

    protected function tables()
    {
        $rows = DB::select('SHOW TABLES');
        return array_values(array_map(function ($row) {
            $arr = (array)$row;
            return reset($arr);
        }, $rows));
    }

    protected function findTable($tables, $baseNames)
    {
        $prefix = DB::getTablePrefix() ?: 'ti_';

        foreach ($baseNames as $base) {
            foreach ([$prefix.$base, 'ti_'.$base, $base] as $candidate) {
                if (in_array($candidate, $tables, true)) return $candidate;
            }
        }

        foreach ($baseNames as $base) {
            foreach ($tables as $table) {
                if (str_ends_with($table, '_'.$base) || $table === $base) return $table;
            }
        }

        return null;
    }

    protected function cols($table)
    {
        if (!$table) return [];
        try {
            return array_map(function ($row) {
                return $row->Field;
            }, DB::select('SHOW COLUMNS FROM '.$this->qid($table)));
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function pick($cols, $candidates)
    {
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $cols, true)) return $candidate;
        }
        return null;
    }

    protected function scalar($sql)
    {
        try {
            $rows = DB::select($sql);
            if (!$rows) return 0;
            $arr = (array)$rows[0];
            return reset($arr);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    protected function qid($name)
    {
        return '`'.str_replace('`', '``', $name).'`';
    }

    protected function money($value)
    {
        return '€'.number_format((float)$value, 2, '.', ',');
    }

    protected function prefixAliasWhere($where, $alias)
    {
        return preg_replace('/`([^`]+)`/', $alias.'.`$1`', $where);
    }
}
