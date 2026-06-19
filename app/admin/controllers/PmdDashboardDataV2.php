<?php

namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class PmdDashboardDataV2 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function index()
    {
        try {
            return Response::json($this->data());
        } catch (\Throwable $e) {
            return Response::json([
                'ok' => false,
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    protected function data()
    {
        $tables = $this->tables();

        $orders = $this->find($tables, ['orders']);
        $orderTotals = $this->find($tables, ['order_totals']);
        $reservations = $this->find($tables, ['reservations']);
        $tablesTable = $this->find($tables, ['tables']);
        $customers = $this->find($tables, ['customers']);
        $notifications = $this->find($tables, ['notifications', 'notification_recipients', 'device_notifications']);
        $waiterCalls = $this->find($tables, ['waiter_calls']);
        $payTx = $this->find($tables, ['order_payment_transactions', 'payment_transactions', 'payment_logs', 'payment_attempts', 'payments']);
        $orderMenus = $this->find($tables, ['order_menus']);

        $ordersM = $this->orders($orders, $orderTotals);
        $paymentsM = $this->pendingPayments($orders, $payTx);
        $resM = $this->reservations($reservations);
        $tablesM = $this->tablesMetric($tablesTable, $orders);
        $alertsM = $this->alerts($notifications, $waiterCalls);
        $kitchenM = $this->kitchen($orders);
        $customersM = $this->customers($customers);
        $topItems = $this->topItems($orderMenus);

        $avg = $ordersM['count'] > 0 ? ($ordersM['revenue'] / max(1, $ordersM['count'])) : 0;

        return [
            'ok' => true,
            'generated_at' => date('c'),
            'detected_tables' => [
                'orders' => $orders,
                'order_totals' => $orderTotals,
                'payment_transactions' => $payTx,
                'reservations' => $reservations,
                'tables' => $tablesTable,
                'notifications' => $notifications,
                'waiter_calls' => $waiterCalls,
                'customers' => $customers,
                'order_menus' => $orderMenus,
            ],
            'metrics' => [
                'revenue_today' => [
                    'value' => $this->money($ordersM['revenue']),
                    'raw' => $ordersM['revenue'],
                    'source' => $ordersM['revenue_source'],
                ],
                'pending_payments' => [
                    'value' => $this->money($paymentsM['amount']),
                    'raw' => $paymentsM['amount'],
                    'count' => $paymentsM['count'],
                    'source' => $paymentsM['source'],
                ],
                'live_alerts' => [
                    'value' => (string)$alertsM['count'],
                    'raw' => $alertsM['count'],
                    'source' => $alertsM['source'],
                ],
                'active_tables' => [
                    'value' => $tablesM['active'].' / '.$tablesM['total'],
                    'active' => $tablesM['active'],
                    'total' => $tablesM['total'],
                    'source' => $tablesM['source'],
                ],
                'kitchen_status' => [
                    'value' => 'Active',
                    'preparing' => $kitchenM['preparing'],
                    'ready' => $kitchenM['ready'],
                    'completed' => $kitchenM['completed'],
                    'source' => $kitchenM['source'],
                ],
                'orders' => [
                    'value' => (string)$ordersM['count'],
                    'raw' => $ordersM['count'],
                    'dine_in' => $ordersM['dine_in'],
                    'takeaway' => $ordersM['takeaway'],
                    'delivery' => $ordersM['delivery'],
                    'source' => $ordersM['source'],
                ],
                'reservations' => [
                    'value' => (string)$resM['today'],
                    'raw' => $resM['today'],
                    'upcoming' => $resM['upcoming'],
                    'source' => $resM['source'],
                ],
                'reports' => [
                    'value' => $this->money($avg),
                    'raw' => $avg,
                    'source' => 'revenue / orders',
                ],
                'customers' => [
                    'value' => (string)$customersM['total'],
                    'raw' => $customersM['total'],
                    'today' => $customersM['today'],
                    'source' => $customersM['source'],
                ],
                'top_items' => $topItems,
            ],
        ];
    }

    protected function orders($table, $totals)
    {
        $out = [
            'count' => 0,
            'revenue' => 0,
            'dine_in' => null,
            'takeaway' => null,
            'delivery' => null,
            'source' => 'no orders table',
            'revenue_source' => 'no revenue source',
        ];

        if (!$table) return $out;

        $cols = $this->cols($table);
        $id = $this->pick($cols, ['order_id', 'id']);
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on', 'order_date', 'updated_at']);
        $total = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total', 'payment_total', 'total_price', 'amount']);
        $type = $this->pick($cols, ['order_type', 'type', 'service_type']);

        $where = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';

        $out['count'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE '.$where);
        $out['source'] = $table.($date ? '.'.$date : '');

        if ($total) {
            $out['revenue'] = (float)$this->scalar('SELECT COALESCE(SUM(CAST('.$this->q($total).' AS DECIMAL(15,2))),0) v FROM '.$this->q($table).' WHERE '.$where);
            $out['revenue_source'] = $table.'.'.$total;
        } elseif ($totals && $id) {
            $tc = $this->cols($totals);
            $orderId = $this->pick($tc, ['order_id']);
            $val = $this->pick($tc, ['value', 'amount', 'total']);
            $code = $this->pick($tc, ['code']);
            if ($orderId && $val) {
                $codeWhere = $code ? ' AND LOWER(COALESCE(ot.'.$this->q($code).',"")) IN ("total","order_total")' : '';
                $out['revenue'] = (float)$this->scalar(
                    'SELECT COALESCE(SUM(CAST(ot.'.$this->q($val).' AS DECIMAL(15,2))),0) v
                     FROM '.$this->q($totals).' ot
                     JOIN '.$this->q($table).' o ON o.'.$this->q($id).' = ot.'.$this->q($orderId).'
                     WHERE '.str_replace('`', 'o.`', $where).$codeWhere
                );
                $out['revenue_source'] = $totals.'.'.$val;
            }
        }

        if ($type) {
            $qt = $this->q($type);
            $out['dine_in'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE '.$where.' AND LOWER(COALESCE('.$qt.',"")) REGEXP "dine|restaurant|eat"');
            $out['takeaway'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE '.$where.' AND LOWER(COALESCE('.$qt.',"")) REGEXP "take|pick|collection"');
            $out['delivery'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE '.$where.' AND LOWER(COALESCE('.$qt.',"")) REGEXP "delivery"');
        }

        return $out;
    }

    protected function pendingPayments($orders, $tx)
    {
        $out = ['amount' => 0, 'count' => 0, 'source' => 'no payment table'];

        if ($tx) {
            $cols = $this->cols($tx);
            $amount = $this->pick($cols, ['amount', 'payment_amount', 'total', 'total_amount', 'transaction_amount', 'paid_amount', 'order_total']);
            $status = $this->pick($cols, ['status', 'payment_status', 'status_name', 'state']);
            $date = $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on', 'paid_at']);

            $where = [];
            if ($date) $where[] = 'DATE('.$this->q($date).') = CURDATE()';
            if ($status) $where[] = 'LOWER(COALESCE('.$this->q($status).',"")) NOT IN ("paid","completed","complete","succeeded","success","captured","settled","cancelled","canceled","failed")';
            $whereSql = count($where) ? implode(' AND ', $where) : '1=1';

            $out['count'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($tx).' WHERE '.$whereSql);
            if ($amount) {
                $out['amount'] = (float)$this->scalar('SELECT COALESCE(SUM(CAST('.$this->q($amount).' AS DECIMAL(15,2))),0) v FROM '.$this->q($tx).' WHERE '.$whereSql);
            }
            $out['source'] = $tx.($amount ? '.'.$amount : '');
            return $out;
        }

        if ($orders) {
            $cols = $this->cols($orders);
            $amount = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total']);
            $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'order_date']);
            $paid = $this->pick($cols, ['is_paid', 'paid']);
            $paidAt = $this->pick($cols, ['paid_at', 'settled_at']);
            $paymentStatus = $this->pick($cols, ['payment_status', 'settlement_status']);

            $where = [];
            if ($date) $where[] = 'DATE('.$this->q($date).') = CURDATE()';
            if ($paidAt) $where[] = $this->q($paidAt).' IS NULL';
            elseif ($paid) $where[] = 'COALESCE('.$this->q($paid).',0) = 0';
            elseif ($paymentStatus) $where[] = 'LOWER(COALESCE('.$this->q($paymentStatus).',"")) NOT IN ("paid","completed","complete","succeeded","success","captured","settled")';
            else $where[] = '1=0';

            $whereSql = implode(' AND ', $where);
            $out['count'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$whereSql);
            if ($amount) {
                $out['amount'] = (float)$this->scalar('SELECT COALESCE(SUM(CAST('.$this->q($amount).' AS DECIMAL(15,2))),0) v FROM '.$this->q($orders).' WHERE '.$whereSql);
            }
            $out['source'] = $orders.' unpaid fallback';
        }

        return $out;
    }

    protected function reservations($table)
    {
        $out = ['today' => 0, 'upcoming' => 0, 'source' => 'no reservations table'];
        if (!$table) return $out;

        $cols = $this->cols($table);
        $date = $this->pick($cols, ['reserve_date', 'reservation_date', 'booking_date', 'date', 'date_added', 'created_at', 'created_on']);
        if (!$date) {
            $out['today'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table));
            $out['source'] = $table;
            return $out;
        }

        $out['today'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE DATE('.$this->q($date).') = CURDATE()');
        $out['upcoming'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE DATE('.$this->q($date).') >= CURDATE()');
        $out['source'] = $table.'.'.$date;
        return $out;
    }

    protected function tablesMetric($table, $orders)
    {
        $out = ['active' => 0, 'total' => 0, 'source' => 'no tables table'];

        if ($table) {
            $cols = $this->cols($table);
            $name = $this->pick($cols, ['table_name', 'name', 'pos_table_label']);
            $number = $this->pick($cols, ['table_no', 'table_number', 'number']);
            $status = $this->pick($cols, ['table_status', 'status', 'status_id']);

            $where = '1=1';
            if ($name) $where .= ' AND LOWER(COALESCE('.$this->q($name).',"")) NOT LIKE "%cashier%" AND LOWER(COALESCE('.$this->q($name).',"")) NOT LIKE "%delivery%"';
            if ($number) $where .= ' AND '.$this->q($number).' IS NOT NULL';

            $out['total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE '.$where);
            if ($status) {
                $out['active'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE '.$where.' AND COALESCE('.$this->q($status).',0) NOT IN (0,1)');
                $out['source'] = $table.'.'.$status;
            } else {
                $out['source'] = $table;
            }
        }

        if ($orders) {
            $cols = $this->cols($orders);
            $tableId = $this->pick($cols, ['table_id', 'location_table_id']);
            $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'order_date']);
            if ($tableId) {
                $where = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';
                $active = (int)$this->scalar('SELECT COUNT(DISTINCT '.$this->q($tableId).') v FROM '.$this->q($orders).' WHERE '.$where.' AND '.$this->q($tableId).' IS NOT NULL');
                if ($active > $out['active']) {
                    $out['active'] = $active;
                    $out['source'] = $orders.'.'.$tableId;
                }
            }
        }

        return $out;
    }

    protected function alerts($notifications, $waiterCalls)
    {
        $count = 0;
        $sources = [];

        foreach ([$notifications, $waiterCalls] as $table) {
            if (!$table) continue;

            $cols = $this->cols($table);
            $date = $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on']);
            $read = $this->pick($cols, ['read_at', 'is_read', 'read', 'seen', 'seen_at', 'is_resolved', 'resolved_at', 'status']);

            $where = [];
            if ($date) $where[] = 'DATE('.$this->q($date).') = CURDATE()';
            if ($read) {
                if (substr($read, -3) === '_at') $where[] = $this->q($read).' IS NULL';
                elseif ($read === 'status') $where[] = 'LOWER(COALESCE('.$this->q($read).',"")) NOT IN ("done","resolved","closed","cancelled","canceled")';
                else $where[] = 'COALESCE('.$this->q($read).',0) = 0';
            }

            $whereSql = count($where) ? implode(' AND ', $where) : '1=1';
            $count += (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE '.$whereSql);
            $sources[] = $table;
        }

        return ['count' => $count, 'source' => count($sources) ? implode(' + ', $sources) : 'no alert source'];
    }

    protected function kitchen($orders)
    {
        $out = ['preparing' => 0, 'ready' => 0, 'completed' => 0, 'source' => 'no orders table'];
        if (!$orders) return $out;

        $cols = $this->cols($orders);
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'order_date']);
        $status = $this->pick($cols, ['status', 'order_status', 'status_name']);

        $where = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';

        if ($status) {
            $q = $this->q($status);
            $out['preparing'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$where.' AND LOWER(COALESCE('.$q.',"")) REGEXP "pending|prepar|received|process|open"');
            $out['ready'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$where.' AND LOWER(COALESCE('.$q.',"")) REGEXP "ready|served"');
            $out['completed'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$where.' AND LOWER(COALESCE('.$q.',"")) REGEXP "complete|completed|paid|done"');
            $out['source'] = $orders.'.'.$status;
        } else {
            $out['preparing'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$where);
            $out['source'] = $orders.' fallback';
        }

        return $out;
    }

    protected function customers($table)
    {
        $out = ['total' => 0, 'today' => 0, 'source' => 'no customers table'];
        if (!$table) return $out;

        $cols = $this->cols($table);
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'created_on']);

        $out['total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table));
        if ($date) $out['today'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table).' WHERE DATE('.$this->q($date).') = CURDATE()');
        $out['source'] = $table.($date ? '.'.$date : '');

        return $out;
    }

    protected function topItems($table)
    {
        if (!$table) return [];

        $cols = $this->cols($table);
        $name = $this->pick($cols, ['menu_name', 'name', 'order_menu_name', 'item_name']);
        $qty = $this->pick($cols, ['quantity', 'qty', 'menu_quantity']);
        $date = $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on']);

        if (!$name) return [];

        $where = $date ? 'WHERE DATE('.$this->q($date).') = CURDATE()' : '';
        $qtySql = $qty ? 'SUM(CAST('.$this->q($qty).' AS DECIMAL(15,2)))' : 'COUNT(*)';

        $rows = DB::select(
            'SELECT '.$this->q($name).' name, '.$qtySql.' total
             FROM '.$this->q($table).' '.$where.'
             GROUP BY '.$this->q($name).'
             ORDER BY total DESC
             LIMIT 5'
        );

        return array_map(function ($row) {
            $a = (array)$row;
            return ['name' => (string)($a['name'] ?? ''), 'total' => (float)($a['total'] ?? 0)];
        }, $rows);
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
        try {
            return array_map(fn($row) => $row->Field, DB::select('SHOW COLUMNS FROM '.$this->q($table)));
        } catch (\Throwable $e) {
            return [];
        }
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

    protected function money($value)
    {
        return '€'.number_format((float)$value, 2, '.', ',');
    }
}
