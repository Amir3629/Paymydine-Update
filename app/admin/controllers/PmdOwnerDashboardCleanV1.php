<?php

namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class PmdOwnerDashboardCleanV1 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function index()
    {
        try {
            return Response::json($this->build());
        } catch (\Throwable $e) {
            return Response::json([
                'ok' => false,
                'version' => 'owner-clean-v23-waiter-interactive-floor',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    public function audit()
    {
        try {
            $data = $this->build();
            return Response::json([
                'ok' => true,
                'version' => 'owner-clean-v23-audit',
                'generated_at' => date('c'),
                'detected_tables' => $data['detected_tables'] ?? [],
                'detected_columns' => $this->detectedColumns($data['detected_tables'] ?? []),
                'metrics' => $data['metrics'] ?? [],
                'notes' => [
                    'This clean dashboard is intentionally owner/admin-first.',
                    'Role dashboards are split; waiter view is now full-width with clickable table/order workspace cards.',
                    'Legacy PMD dashboard assets are disabled by the installer, not deleted from backup.',
                ],
            ]);
        } catch (\Throwable $e) {
            return Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    protected function build()
    {
        $allTables = $this->tables();

        $orders = $this->find($allTables, ['orders', 'restaurant_orders']);
        $orderTotals = $this->find($allTables, ['order_totals']);
        $orderMenus = $this->find($allTables, ['order_menus', 'order_menu_items']);
        $menus = $this->find($allTables, ['menus', 'menu_items']);
        $categories = $this->find($allTables, ['categories']);
        $menuCategories = $this->find($allTables, ['menu_categories']);
        $mediaAttachments = $this->find($allTables, ['media_attachments']);
        $menuImages = $this->find($allTables, ['menu_images']);
        $tableMerges = $this->find($allTables, ['pmd_table_merges']);
        $waiterAssignments = $this->find($allTables, ['pmd_waiter_table_assignments']);
        $reservations = $this->find($allTables, ['reservations']);
        $restaurantTables = $this->find($allTables, ['tables', 'restaurant_tables', 'location_tables']);
        $waiterCalls = $this->find($allTables, ['waiter_calls']);
        $payments = $this->find($allTables, ['order_payment_transactions', 'payment_transactions', 'payments', 'payment_logs', 'payment_attempts']);
        $customers = $this->find($allTables, ['customers']);
        $staffs = $this->find($allTables, ['staffs']);
        $staffRoles = $this->find($allTables, ['staff_roles']);
        $kdsStations = $this->find($allTables, ['kds_stations']);
        $notifications = $this->find($allTables, ['notifications', 'notification_recipients', 'device_notifications']);
        $statuses = $this->find($allTables, ['statuses', 'order_statuses']);
        $reservationTables = $this->find($allTables, ['reservation_tables']);
        $tableNotes = $this->find($allTables, ['table_notes']);
        $valetRequests = $this->find($allTables, ['valet_requests']);
        $paymentAttempts = $this->find($allTables, ['payment_attempts']);
        $cashDrawers = $this->find($allTables, ['cash_drawers']);

        $orderInfo = $this->orderMetrics($orders, $orderTotals);
        $paymentInfo = $this->paymentMetrics($payments, $orders, $orderInfo);
        $reservationInfo = $this->reservationMetrics($reservations);
        $tableInfo = $this->tableMetrics($restaurantTables, $orders);
        $waiterInfo = $this->waiterCallMetrics($waiterCalls);
        $customerInfo = $this->customerMetrics($customers);
        $kitchenInfo = $this->kitchenMetrics($orders, $kdsStations);
        $staffInfo = $this->staffMetrics($staffs, $staffRoles, $orders, $orderTotals);
        $topItems = $this->topItems($orderMenus, $menus, $orders);
        $recentOrders = $this->recentOrders($orders, $orderTotals, $restaurantTables);
        $upcomingReservations = $this->upcomingReservations($reservations);
        $floorPlan = $this->floorPlan($restaurantTables, $orders, $reservations, $waiterCalls, $payments);
        $menuInventory = $this->menuInventory($menus, $categories, $menuCategories, $mediaAttachments, $menuImages, $orderMenus);
        $tableDiagnostics = $this->tableDiagnostics($restaurantTables, $orders, $tableMerges, $waiterAssignments);
        $notificationAudit = $this->notificationAudit($notifications, $orders);
        $alertInfo = $this->alertMetrics($notifications, $waiterInfo, $paymentInfo, $kitchenInfo, $reservationInfo, $tableDiagnostics);
        $snapshot = $this->ownerSnapshot($orderInfo, $paymentInfo, $reservationInfo, $tableInfo, $waiterInfo, $kitchenInfo, $customerInfo, $staffInfo, $menuInventory, $tableDiagnostics);
        $connections = $this->connectionMap([
            'orders' => $orders,
            'order_totals' => $orderTotals,
            'order_items' => $orderMenus,
            'menus' => $menus,
            'categories' => $categories,
            'menu_categories' => $menuCategories,
            'media_attachments' => $mediaAttachments,
            'menu_images' => $menuImages,
            'tables' => $restaurantTables,
            'reservations' => $reservations,
            'payments' => $payments,
            'payment_attempts' => $paymentAttempts,
            'waiter_calls' => $waiterCalls,
            'customers' => $customers,
            'staffs' => $staffs,
            'staff_roles' => $staffRoles,
            'kds_stations' => $kdsStations,
            'notifications' => $notifications,
            'statuses' => $statuses,
            'reservation_tables' => $reservationTables,
            'table_notes' => $tableNotes,
            'valet_requests' => $valetRequests,
            'cash_drawers' => $cashDrawers,
            'table_merges' => $tableMerges,
            'waiter_assignments' => $waiterAssignments,
        ]);

        $avgTicket = $orderInfo['orders_today_raw'] > 0
            ? $orderInfo['revenue_today_raw'] / max(1, $orderInfo['orders_today_raw'])
            : 0;

        return [
            'ok' => true,
            'version' => 'owner-clean-v23-waiter-interactive-floor',
            'generated_at' => date('c'),
            'currency' => '€',
            'detected_tables' => [
                'orders' => $orders,
                'order_totals' => $orderTotals,
                'order_menus' => $orderMenus,
                'menus' => $menus,
                'categories' => $categories,
                'menu_categories' => $menuCategories,
                'media_attachments' => $mediaAttachments,
                'menu_images' => $menuImages,
                'reservations' => $reservations,
                'tables' => $restaurantTables,
                'waiter_calls' => $waiterCalls,
                'payments' => $payments,
                'customers' => $customers,
                'staffs' => $staffs,
                'staff_roles' => $staffRoles,
                'kds_stations' => $kdsStations,
                'notifications' => $notifications,
                'statuses' => $statuses,
                'reservation_tables' => $reservationTables,
                'table_notes' => $tableNotes,
                'valet_requests' => $valetRequests,
                'payment_attempts' => $paymentAttempts,
                'cash_drawers' => $cashDrawers,
            ],
            'metrics' => [
                'revenue_today' => $this->metric('Revenue Today', $this->money($orderInfo['revenue_today_raw']), $orderInfo['revenue_today_raw'], $orderInfo['revenue_source'], 'All-time '.$this->money($orderInfo['total_revenue_raw']).' · '.$orderInfo['total_orders_raw'].' total order(s)'),
                'orders_today' => $this->metric('Orders Today', (string)$orderInfo['orders_today_raw'], $orderInfo['orders_today_raw'], $orderInfo['orders_source'], $orderInfo['total_orders_raw'].' total · last '.$orderInfo['last_order_label']),
                'open_orders' => $this->metric('Open Orders', (string)$orderInfo['open_orders_raw'], $orderInfo['open_orders_raw'], $orderInfo['open_orders_source'], 'Current open checks; status 0/draft rows excluded'),
                'unpaid' => $this->metric('Open / Pending Value', $this->money($paymentInfo['pending_amount_raw']), $paymentInfo['pending_amount_raw'], $paymentInfo['source'], $paymentInfo['pending_count'].' open check(s); payment transactions table is empty'),
                'reservations_today' => $this->metric('Reservations Today', (string)$reservationInfo['today'], $reservationInfo['today'], $reservationInfo['source'], $reservationInfo['upcoming'].' upcoming reservation(s)'),
                'active_tables' => $this->metric('Busy Tables', $tableInfo['active'].' / '.$tableInfo['total'], $tableInfo['active'], $tableInfo['source'], 'Current visible tables with open unpaid checks'),
                'waiter_calls' => $this->metric('Waiter Calls', (string)$waiterInfo['open'], $waiterInfo['open'], $waiterInfo['source'], 'Open customer requests'),
                'kitchen_queue' => $this->metric('Kitchen Queue', (string)$kitchenInfo['preparing'], $kitchenInfo['preparing'], $kitchenInfo['source'], $kitchenInfo['ready'].' ready item/order(s)'),
                'customers_today' => $this->metric('Customers Today', (string)$customerInfo['today'], $customerInfo['today'], $customerInfo['source'], $customerInfo['total'].' total customers'),
                'avg_ticket' => $this->metric('Average Ticket', $this->money($avgTicket), $avgTicket, 'revenue_today / orders_today', 'Average order value today'),
                'alerts' => $this->metric('Live Alerts', (string)$alertInfo['count'], $alertInfo['count'], $alertInfo['source'], 'Payments, kitchen, waiter calls, reservations'),
            ],
            'sections' => [
                'snapshot' => $snapshot,
                'service_mix' => $orderInfo['service_mix'],
                'payment' => $paymentInfo,
                'reservations' => $reservationInfo,
                'tables' => $tableInfo,
                'waiter_calls' => $waiterInfo,
                'kitchen' => $kitchenInfo,
                'customers' => $customerInfo,
                'staff' => $staffInfo,
                'alerts' => $alertInfo,
                'top_items' => $topItems,
                'recent_orders' => $recentOrders,
                'upcoming_reservations' => $upcomingReservations,
                'floor_plan' => $floorPlan,
                'menu_inventory' => $menuInventory,
                'table_diagnostics' => $tableDiagnostics,
                'connections' => $connections,
                'notification_audit' => $notificationAudit,
                'operations' => [
                    'business_day' => date('Y-m-d'),
                    'native_match' => 'deep-investigation-v1 + v22 role dashboard splitter: current floor tables come from ti_tables; orders.order_type matches ti_tables.table_id; floor nodes use table_id as a lookup key',
                    'order_table_link' => 'orders.order_type -> ti_tables.table_id when matched; unmatched order_type refs are reported, not forced onto floor tables',
                    'revenue_source' => $orderInfo['revenue_source'] ?? 'not detected',
                    'payment_source' => $paymentInfo['source'] ?? 'not detected',
                    'floor_source' => $floorPlan['source'] ?? 'not detected',
                    'menu_source' => $menuInventory['source'] ?? 'not detected',
                    'table_diagnostics' => $tableDiagnostics['summary_note'] ?? 'not detected',
                    'notification_source' => $notificationAudit['summary_note'] ?? 'not detected',
                ],
                'role_plan' => [
                    ['role' => 'Owner / Admin', 'status' => 'active now', 'focus' => 'Everything: revenue, orders, payments, reservations, floor, kitchen, staff.'],
                    ['role' => 'Manager', 'status' => 'active now', 'focus' => 'Operations: floor, alerts, open checks, kitchen, reservations, staff pressure.'],
                    ['role' => 'Waiter', 'status' => 'active now', 'focus' => 'Service-only dashboard: tables, open checks, waiter calls, clickable table/order workspace. No sidebar/header.'],
                    ['role' => 'KDS', 'status' => 'active now', 'focus' => 'Kitchen dashboard: queue, delays, ready rows, top open items, KDS station health.'],
                    ['role' => 'Cashier', 'status' => 'active now', 'focus' => 'Checkout dashboard: open checks, payment breakdown, split bill, cash drawer.'],
                    ['role' => 'Reception', 'status' => 'active now', 'focus' => 'Booking dashboard: reservations, walk-ins, calls/messages, table availability.'],
                ],
            ],
        ];
    }

    protected function metric($label, $value, $raw, $source, $note = '')
    {
        return compact('label', 'value', 'raw', 'source', 'note');
    }

    protected function orderMetrics($orders, $orderTotals)
    {
        $out = [
            'revenue_today_raw' => 0,
            'orders_today_raw' => 0,
            'open_orders_raw' => 0,
            'total_orders_raw' => 0,
            'total_revenue_raw' => 0,
            'last_order_id' => null,
            'last_order_total_raw' => 0,
            'last_order_total' => $this->money(0),
            'last_order_date' => null,
            'last_order_label' => 'No orders detected',
            'revenue_source' => 'no orders table',
            'orders_source' => 'no orders table',
            'open_orders_source' => 'no orders table',
            'total_source' => 'no orders table',
            'table_link_source' => 'no table link detected',
            'service_mix' => ['dine_in' => null, 'takeaway' => null, 'delivery' => null, 'cashier' => null, 'unknown' => null],
        ];
        if (!$orders) return $out;

        $cols = $this->cols($orders);
        $id = $this->pick($cols, ['order_id', 'id']);
        $date = $this->orderDateColumn($cols);
        $total = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total', 'payment_total', 'total_price', 'amount']);
        $status = $this->pick($cols, ['status_id', 'order_status_id', 'status', 'status_name', 'order_status', 'state']);
        $type = $this->pick($cols, ['order_type', 'type', 'service_type', 'service']);
        $tableRef = $this->pick($cols, ['order_type', 'table_id', 'location_table_id', 'table_no', 'table_number', 'table']);
        $todayWhere = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';
        $allWhere = '1=1';

        $out['total_orders_raw'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders));
        $out['orders_today_raw'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$todayWhere);
        $out['orders_source'] = $orders.($date ? '.'.$date : ' all rows').' (deep investigation: created_at first because PMD rows can have order_date=0000-00-00)';
        $out['total_source'] = $orders.' all rows';
        if ($tableRef) $out['table_link_source'] = $orders.'.'.$tableRef.' -> ti_tables.table_id when numeric/current; unmapped refs are kept separate';

        $out['revenue_today_raw'] = $this->sumNormalizedOrderRevenue($orders, $orderTotals, $id, $total, $todayWhere);
        $out['total_revenue_raw'] = $this->sumNormalizedOrderRevenue($orders, $orderTotals, $id, $total, $allWhere);
        $out['revenue_source'] = 'normalized per order: order_totals grand/total if >0, otherwise '.$orders.'.'.($total ?: 'order_total fallback');

        if ($status) {
            $openCond = $this->currentOpenOrderCondition('', $status, $cols);
            $out['open_orders_raw'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$openCond);
            $out['open_orders_source'] = $orders.'.'.$status.' current open rows; status 0/paid/closed/cancelled excluded';
        } else {
            $out['open_orders_raw'] = $out['orders_today_raw'];
            $out['open_orders_source'] = $orders.' fallback orders_today';
        }

        if ($id) {
            $selectDate = $date ? $this->q($date) : 'NULL';
            $selectTotal = $total ? $this->q($total) : 'NULL';
            $orderBy = $date ? $this->q($date).' DESC, '.$this->q($id).' DESC' : $this->q($id).' DESC';
            $last = $this->rows('SELECT '.$this->q($id).' id, '.$selectDate.' last_date, '.$selectTotal.' direct_total FROM '.$this->q($orders).' ORDER BY '.$orderBy.' LIMIT 1');
            if ($last) {
                $row = $last[0];
                $lastTotal = $this->normalizedOrderTotal($orders, $orderTotals, $id, $total, $row['id']);
                $out['last_order_id'] = $row['id'];
                $out['last_order_total_raw'] = $lastTotal;
                $out['last_order_total'] = $this->money($lastTotal);
                $out['last_order_date'] = $row['last_date'] ?? null;
                $out['last_order_label'] = '#'.$row['id'].' · '.$this->money($lastTotal);
            }
        }

        if ($type) {
            $qt = $this->q($type);
            // v12: Service Mix must describe the same operational/live orders used by Open Checks.
            // v12 used today-only, which showed all zeros even when open checks existed.
            $serviceWhere = $status ? $this->currentOpenOrderCondition('', $status, $cols) : '1=1';
            $out['service_mix'] = [
                'dine_in' => (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$serviceWhere.' AND (LOWER(COALESCE('.$qt.',"")) IN ("dinein","dine-in","dine in","restaurant","eat-in","eat_in") OR CAST('.$qt.' AS CHAR) REGEXP "^[0-9]+$")'),
                'takeaway' => (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$serviceWhere.' AND LOWER(COALESCE('.$qt.',"")) IN ("takeaway","take-away","pickup","pick-up","collection")'),
                'delivery' => (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$serviceWhere.' AND LOWER(COALESCE('.$qt.',"")) IN ("delivery")'),
                'cashier' => (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$serviceWhere.' AND LOWER(COALESCE('.$qt.',"")) IN ("cashier","counter","pos")'),
                'unknown' => (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$serviceWhere.' AND ('.$qt.' IS NULL OR '.$qt.' = "")'),
            ];
        }

        return $out;
    }


    protected function paymentMetrics($payments, $orders, $orderInfo)
    {
        $out = ['pending_amount_raw' => 0, 'pending_count' => 0, 'paid_today_raw' => 0, 'paid_count_today' => 0, 'paid_total_raw' => 0, 'paid_count_total' => 0, 'source' => 'fallback from orders'];
        $paymentRows = $payments ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($payments)) : 0;
        if ($payments && $paymentRows > 0) {
            $cols = $this->cols($payments);
            $amount = $this->pick($cols, ['amount', 'payment_amount', 'total', 'total_amount', 'transaction_amount', 'paid_amount', 'order_total']);
            $status = $this->pick($cols, ['settlement_status', 'status', 'payment_status', 'status_name', 'state', 'result']);
            $created = $this->pick($cols, ['paid_at', 'created_at', 'date_added', 'created', 'created_on', 'updated_at']);
            $paidAt = $this->pick($cols, ['paid_at', 'settled_at', 'captured_at']);
            $dateWhere = $created ? 'DATE('.$this->q($created).') = CURDATE()' : '1=1';
            $pendingParts = [];
            if ($status) $pendingParts[] = 'LOWER(COALESCE('.$this->q($status).',"")) IN ("pending","unpaid","open","requires_payment","requires_capture","created","processing","authorized","not_paid","")';
            if ($paidAt) $pendingParts[] = $this->q($paidAt).' IS NULL';
            $pendingSql = $pendingParts ? '('.implode(' OR ', $pendingParts).')' : '1=0';
            $out['pending_count'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($payments).' WHERE '.$pendingSql);
            if ($amount) {
                $out['pending_amount_raw'] = (float)$this->scalar('SELECT COALESCE(SUM(CAST('.$this->q($amount).' AS DECIMAL(15,2))),0) v FROM '.$this->q($payments).' WHERE '.$pendingSql);
                $paidCond = $status ? 'LOWER(COALESCE('.$this->q($status).',"")) IN ("paid","settled","complete","completed","succeeded","success","captured")' : ($paidAt ? $this->q($paidAt).' IS NOT NULL' : '1=0');
                $out['paid_today_raw'] = (float)$this->scalar('SELECT COALESCE(SUM(CAST('.$this->q($amount).' AS DECIMAL(15,2))),0) v FROM '.$this->q($payments).' WHERE '.$dateWhere.' AND '.$paidCond);
                $out['paid_count_today'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($payments).' WHERE '.$dateWhere.' AND '.$paidCond);
                $out['paid_total_raw'] = (float)$this->scalar('SELECT COALESCE(SUM(CAST('.$this->q($amount).' AS DECIMAL(15,2))),0) v FROM '.$this->q($payments).' WHERE '.$paidCond);
                $out['paid_count_total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($payments).' WHERE '.$paidCond);
            }
            $out['source'] = $payments.($status ? '.'.$status : ($paidAt ? '.'.$paidAt : ' detected without status')).' current pending + paid totals';
            return $out;
        }

        // Deep investigation found ti_order_payment_transactions can be empty. In that case, unpaid/pending must fall back to open order checks.
        if ($orders) {
            $cols = $this->cols($orders);
            $status = $this->pick($cols, ['status_id', 'order_status_id', 'status', 'status_name', 'order_status', 'state']);
            $id = $this->pick($cols, ['order_id', 'id']);
            $total = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total', 'payment_total']);
            $orderTotals = $this->find($this->tables(), ['order_totals']);
            $open = $status ? $this->currentOpenOrderCondition('', $status, $cols) : '1=1';
            $out['pending_count'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$open);
            $out['pending_amount_raw'] = $this->sumNormalizedOrderRevenue($orders, $orderTotals, $id, $total, $open);
            $out['source'] = 'ti_order_payment_transactions empty; fallback = open '.$orders.' rows with normalized order totals';
        } elseif ($payments) {
            $out['source'] = $payments.' exists but has 0 rows; no order fallback available';
        }
        return $out;
    }


    protected function reservationMetrics($reservations)
    {
        $out = ['today' => 0, 'upcoming' => 0, 'source' => 'no reservations table'];
        if (!$reservations) return $out;
        $cols = $this->cols($reservations);
        $date = $this->pick($cols, ['reserve_date', 'reservation_date', 'date', 'booking_date', 'date_added', 'created_at', 'created']);
        $status = $this->pick($cols, ['status', 'status_name', 'reservation_status', 'state']);
        $base = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';
        $active = $status ? 'LOWER(COALESCE('.$this->q($status).',"")) NOT IN ("cancelled","canceled","no-show","rejected")' : '1=1';
        $out['today'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($reservations).' WHERE '.$base.' AND '.$active);
        $out['upcoming'] = $date ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($reservations).' WHERE DATE('.$this->q($date).') >= CURDATE() AND '.$active) : $out['today'];
        $out['source'] = $reservations.($date ? '.'.$date : ' all rows');
        return $out;
    }

    protected function tableMetrics($tables, $orders)
    {
        $out = ['active' => 0, 'total' => 0, 'visible_total' => 0, 'all_total' => 0, 'service_total' => 0, 'unmatched_open_refs' => 0, 'source' => 'no tables table'];
        if (!$tables) return $out;

        $tc = $this->cols($tables);
        $id = $this->pick($tc, ['table_id', 'id']);
        $name = $this->pick($tc, ['table_name', 'pos_table_label', 'name', 'label']);
        $number = $this->pick($tc, ['table_no', 'table_number', 'number', 'no']);
        $whereCurrent = $this->currentTableWhere('', $tc, true);
        $whereService = $this->serviceTableWhere('', $tc);

        $out['all_total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($tables));
        $out['total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($tables).' WHERE '.$whereCurrent);
        $out['visible_total'] = $out['total'];
        $out['service_total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($tables).' WHERE '.$whereService);
        $out['source'] = $tables.' current visible restaurant tables; Cashier/Delivery service rows are separated';

        $diag = $this->tableDiagnostics($tables, $orders, null, null);
        $out['active'] = (int)($diag['matched_open_current_tables'] ?? 0);
        $out['unmatched_open_refs'] = count($diag['unmatched_open_refs'] ?? []);
        if ($id) $out['source'] .= '; active = open orders where orders.order_type matches '.$tables.'.'.$id;
        return $out;
    }


    protected function waiterCallMetrics($waiterCalls)
    {
        $out = ['open' => 0, 'today' => 0, 'total' => 0, 'source' => 'no waiter_calls table'];
        if (!$waiterCalls) return $out;
        $cols = $this->cols($waiterCalls);
        $date = $this->pick($cols, ['created_at', 'date_added', 'created', 'requested_at']);
        $resolved = $this->pick($cols, ['resolved_at', 'handled_at', 'is_resolved', 'resolved', 'status']);
        $today = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';
        $open = '1=1';
        if ($resolved) {
            if (substr($resolved, -3) === '_at') $open = $this->q($resolved).' IS NULL';
            elseif ($resolved === 'status') $open = 'LOWER(COALESCE('.$this->q($resolved).',"")) NOT IN ("done","resolved","closed","cancelled","canceled")';
            else $open = 'COALESCE('.$this->q($resolved).',0) = 0';
        }
        $out['total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($waiterCalls));
        $out['today'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($waiterCalls).' WHERE '.$today);
        $out['open'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($waiterCalls).' WHERE '.$open);
        $out['source'] = $waiterCalls.($resolved ? '.'.$resolved : ' all rows').' current open';
        return $out;
    }

    protected function kitchenMetrics($orders, $kdsStations)
    {
        $out = ['preparing' => 0, 'ready' => 0, 'stations' => 0, 'delayed' => 0, 'on_time_rate' => 100, 'avg_prep_label' => '—', 'source' => 'orders fallback'];
        if ($kdsStations) {
            $out['stations'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($kdsStations));
        }
        if (!$orders) return $out;
        $cols = $this->cols($orders);
        $status = $this->pick($cols, ['kitchen_status', 'status', 'status_name', 'order_status', 'state', 'status_id', 'order_status_id']);
        if ($status) {
            if (stripos($status, 'id') !== false) {
                $out['preparing'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE COALESCE('.$this->q($status).',0) IN (1,2,3)');
                $out['ready'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE COALESCE('.$this->q($status).',0) IN (4)');
            } else {
                $s = $this->q($status);
                $out['preparing'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE LOWER(COALESCE('.$s.',"")) IN ("new","accepted","preparing","in kitchen","cooking","processing")');
                $out['ready'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE LOWER(COALESCE('.$s.',"")) IN ("ready","ready to serve","prepared")');
            }
            $out['source'] = $orders.'.'.$status.' current kitchen states';
        }
        $created = $this->pick($cols, ['created_at', 'order_time', 'order_date']);
        $prep = $this->pick($cols, ['estimated_prep_minutes', 'prep_time_minutes', 'preparation_time']);
        if ($created && $prep && $status) {
            $open = $this->currentOpenOrderCondition('', $status, $cols);
            $out['delayed'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$open.' AND COALESCE(CAST('.$this->q($prep).' AS SIGNED),0) > 0 AND TIMESTAMPDIFF(MINUTE, '.$this->q($created).', NOW()) > COALESCE(CAST('.$this->q($prep).' AS SIGNED),0)');
            $openCount = max(1, (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.$open));
            $out['on_time_rate'] = max(0, min(100, (int)round((($openCount - $out['delayed']) / $openCount) * 100)));
            $avg = (float)$this->scalar('SELECT COALESCE(AVG(NULLIF(CAST('.$this->q($prep).' AS DECIMAL(15,2)),0)),0) v FROM '.$this->q($orders).' WHERE '.$open);
            if ($avg > 0) $out['avg_prep_label'] = round($avg).'m';
        }
        return $out;
    }

    protected function customerMetrics($customers)
    {
        $out = ['today' => 0, 'total' => 0, 'source' => 'no customers table'];
        if (!$customers) return $out;
        $cols = $this->cols($customers);
        $date = $this->pick($cols, ['date_added', 'created_at', 'created', 'registered_at']);
        $out['total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($customers));
        $out['today'] = $date ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($customers).' WHERE DATE('.$this->q($date).') = CURDATE()') : 0;
        $out['source'] = $customers.($date ? '.'.$date : '');
        return $out;
    }

    protected function staffMetrics($staffs, $staffRoles, $orders = null, $orderTotals = null)
    {
        $out = ['total' => 0, 'roles' => [], 'servers' => [], 'assignment_reliable' => false, 'source' => 'no staffs table'];
        if (!$staffs) return $out;
        $sc = $this->cols($staffs);
        $sid = $this->pick($sc, ['staff_id', 'id']);
        $sname = $this->pick($sc, ['staff_name', 'name', 'full_name']);
        $out['total'] = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($staffs));
        $out['source'] = $staffs;
        if ($staffRoles) {
            $cols = $this->cols($staffRoles);
            $name = $this->pick($cols, ['name', 'role_name', 'code']);
            $id = $this->pick($cols, ['staff_role_id', 'id']);
            if ($name && $id) {
                $out['roles'] = $this->rows('SELECT '.$this->q($name).' label, COUNT(s.staff_id) count FROM '.$this->q($staffRoles).' r LEFT JOIN '.$this->q($staffs).' s ON s.staff_role_id = r.'.$this->q($id).' GROUP BY '.$this->q($name).' ORDER BY count DESC LIMIT 8');
                $out['source'] = $staffs.' + '.$staffRoles;
            }
        }
        if ($orders && $sid && $sname) {
            $oc = $this->cols($orders);
            $oid = $this->pick($oc, ['order_id', 'id']);
            $assignee = $this->pick($oc, ['assignee_id', 'staff_id', 'server_id', 'waiter_id']);
            $directTotal = $this->pick($oc, ['order_total', 'total', 'total_amount', 'grand_total', 'payment_total', 'total_price', 'amount']);
            $status = $this->pick($oc, ['status_id', 'order_status_id', 'status', 'status_name', 'order_status', 'state']);
            if ($oid && $assignee) {
                $open = $status ? $this->currentOpenOrderCondition('o', $status, $oc) : '1=1';
                $expr = $this->normalizedOrderTotalExpr('o', $orders, $orderTotals, $oid, $directTotal);
                $rows = $this->rows('SELECT s.'.$this->q($sname).' label, COUNT(o.'.$this->q($oid).') orders, COALESCE(SUM('.$expr.'),0) total FROM '.$this->q($staffs).' s LEFT JOIN '.$this->q($orders).' o ON o.'.$this->q($assignee).' = s.'.$this->q($sid).' AND '.$open.' GROUP BY s.'.$this->q($sid).', s.'.$this->q($sname).' ORDER BY total DESC, orders DESC, label ASC LIMIT 6');
                foreach ($rows as &$r) { $r['count'] = (int)($r['orders'] ?? 0); $r['total_label'] = $this->money($r['total'] ?? 0); }
                unset($r);
                $sum = 0; foreach ($rows as $r) $sum += (int)($r['orders'] ?? 0);
                if ($sum > 0) {
                    $out['servers'] = $rows;
                    $out['assignment_reliable'] = true;
                    $out['source'] = $staffs.' + '.$orders.'.'.$assignee;
                }
            }
        }
        return $out;
    }

    protected function alertMetrics($notifications, $waiterInfo, $paymentInfo, $kitchenInfo, $reservationInfo, $tableDiagnostics = [])
    {
        $count = 0;
        $sources = [];
        $items = [];
        if (($paymentInfo['pending_count'] ?? 0) > 0) {
            $count += (int)$paymentInfo['pending_count'];
            $items[] = ['level' => 'high', 'title' => 'Open check value', 'value' => (string)$paymentInfo['pending_count'], 'note' => $this->money($paymentInfo['pending_amount_raw'] ?? 0).' open/unpaid checks'];
            $sources[] = $paymentInfo['source'] ?? 'payments';
        }
        $unmappedCount = count($tableDiagnostics['unmatched_open_refs'] ?? []);
        if ($unmappedCount > 0) {
            $count += $unmappedCount;
            $items[] = ['level' => 'medium', 'title' => 'Old table references', 'value' => (string)$unmappedCount, 'note' => 'Some open orders still use legacy table references'];
            $sources[] = 'ti_orders.order_type + ti_tables.table_id';
        }
        if (($waiterInfo['open'] ?? 0) > 0) {
            $count += (int)$waiterInfo['open'];
            $items[] = ['level' => 'medium', 'title' => 'Open waiter calls', 'value' => (string)$waiterInfo['open'], 'note' => 'Customer requests need action'];
            $sources[] = $waiterInfo['source'] ?? 'waiter_calls';
        }
        if (($kitchenInfo['ready'] ?? 0) > 0) {
            $count += (int)$kitchenInfo['ready'];
            $items[] = ['level' => 'medium', 'title' => 'Ready from kitchen', 'value' => (string)$kitchenInfo['ready'], 'note' => 'Ready items/orders should be served'];
            $sources[] = $kitchenInfo['source'] ?? 'orders';
        }
        if (($reservationInfo['today'] ?? 0) > 0) {
            $items[] = ['level' => 'info', 'title' => 'Reservations today', 'value' => (string)$reservationInfo['today'], 'note' => 'Reception flow should prepare tables'];
            $sources[] = $reservationInfo['source'] ?? 'reservations';
        }
        if ($notifications) {
            $cols = $this->cols($notifications);
            $date = $this->pick($cols, ['created_at', 'date_added', 'created']);
            $read = $this->pick($cols, ['read_at', 'is_read', 'seen_at', 'seen', 'status']);
            $today = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';
            $unread = '1=1';
            if ($read) {
                if (substr($read, -3) === '_at') $unread = $this->q($read).' IS NULL';
                elseif ($read === 'status') $unread = 'LOWER(COALESCE('.$this->q($read).',"")) NOT IN ("read","seen","done","resolved")';
                else $unread = 'COALESCE('.$this->q($read).',0) = 0';
            }
            $n = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($notifications).' WHERE '.$today.' AND '.$unread);
            if ($n > 0) {
                $count += $n;
                $items[] = ['level' => 'info', 'title' => 'Unread notifications', 'value' => (string)$n, 'note' => 'System/device notifications'];
                $sources[] = $notifications;
            }
        }
        return ['count' => $count, 'items' => $items, 'source' => $sources ? implode(', ', array_unique($sources)) : 'calculated'];
    }

    protected function topItems($orderMenus, $menus, $orders = null)
    {
        if (!$orderMenus) return [];
        $cols = $this->cols($orderMenus);
        $name = $this->pick($cols, ['name', 'menu_name', 'item_name', 'order_menu_name']);
        $qty = $this->pick($cols, ['quantity', 'qty', 'menu_quantity']);
        $menuId = $this->pick($cols, ['menu_id']);
        $omOrderId = $this->pick($cols, ['order_id']);
        $countExpr = $qty ? 'SUM(CAST(om.'.$this->q($qty).' AS DECIMAL(15,2)))' : 'COUNT(*)';
        $join = '';
        $where = '1=0';
        $scope = 'open_checks';

        // v12: do not call this "today" when Orders Today is 0.
        // Use the same live/open-order condition as the KPI, so draft/test rows with status_id=0 do not generate fake-looking top items.
        if ($orders && $omOrderId) {
            $oc = $this->cols($orders);
            $orderId = $this->pick($oc, ['order_id', 'id']);
            $status = $this->pick($oc, ['status_id', 'order_status_id', 'status', 'status_name', 'order_status', 'state']);
            if ($orderId) {
                $join = ' INNER JOIN '.$this->q($orders).' o ON o.'.$this->q($orderId).' = om.'.$this->q($omOrderId).' ';
                $where = $status ? $this->currentOpenOrderCondition('o', $status, $oc) : '1=1';
            }
        }
        if ($where === '1=0') return [];

        if ($name) {
            return $this->rows(
                'SELECT om.'.$this->q($name).' label, '.$countExpr.' count, "'.$scope.'" scope '.
                'FROM '.$this->q($orderMenus).' om '.$join.
                'WHERE '.$where.' AND om.'.$this->q($name).' IS NOT NULL AND om.'.$this->q($name).' != "" '.
                'GROUP BY om.'.$this->q($name).' ORDER BY count DESC LIMIT 8'
            );
        }

        if ($menuId && $menus) {
            $mc = $this->cols($menus);
            $mid = $this->pick($mc, ['menu_id', 'id']);
            $mname = $this->pick($mc, ['menu_name', 'name', 'item_name']);
            if ($mid && $mname) {
                return $this->rows(
                    'SELECT m.'.$this->q($mname).' label, '.$countExpr.' count, "'.$scope.'" scope '.
                    'FROM '.$this->q($orderMenus).' om '.$join.
                    'LEFT JOIN '.$this->q($menus).' m ON m.'.$this->q($mid).' = om.'.$this->q($menuId).' '.
                    'WHERE '.$where.' AND m.'.$this->q($mname).' IS NOT NULL AND m.'.$this->q($mname).' != "" '.
                    'GROUP BY m.'.$this->q($mname).' ORDER BY count DESC LIMIT 8'
                );
            }
        }
        return [];
    }


    protected function recentOrders($orders, $orderTotals = null, $tables = null)
    {
        if (!$orders) return [];
        $cols = $this->cols($orders);
        $id = $this->pick($cols, ['order_id', 'id']);
        $date = $this->orderDateColumn($cols);
        $time = $this->pick($cols, ['order_time']);
        $total = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total']);
        $status = $this->pick($cols, ['status', 'status_name', 'order_status', 'state', 'status_id']);
        $settlement = $this->pick($cols, ['settlement_status', 'payment_status', 'payment']);
        $table = $this->orderTableRefColumn($cols);
        $first = $this->pick($cols, ['first_name']);
        $last = $this->pick($cols, ['last_name']);
        $email = $this->pick($cols, ['email']);
        $select = [];
        $select[] = $id ? $this->q($id).' id' : 'NULL id';
        $select[] = $date ? $this->q($date).' created_at' : 'NULL created_at';
        $select[] = $time ? $this->q($time).' order_time' : 'NULL order_time';
        $select[] = $total ? $this->q($total).' total' : '0 total';
        $select[] = $status ? $this->q($status).' status' : 'NULL status';
        $select[] = $settlement ? $this->q($settlement).' settlement_status' : 'NULL settlement_status';
        $select[] = $table ? 'CAST('.$this->q($table).' AS CHAR) table_ref' : 'NULL table_ref';
        $select[] = $first ? $this->q($first).' first_name' : 'NULL first_name';
        $select[] = $last ? $this->q($last).' last_name' : 'NULL last_name';
        $select[] = $email ? $this->q($email).' email' : 'NULL email';
        $order = $date ? ' ORDER BY '.$this->q($date).' DESC'.($time ? ', '.$this->q($time).' DESC' : '') : ($id ? ' ORDER BY '.$this->q($id).' DESC' : '');
        $whereLive = $status ? ' WHERE '.$this->currentOpenOrderCondition('', $status, $cols) : '';
        // v12: recent list is operational, so draft/test rows with status_id=0 are excluded.
        $rows = $this->rows('SELECT '.implode(',', $select).' FROM '.$this->q($orders).$whereLive.$order.' LIMIT 8');
        $tableLookup = $this->tableLookup($tables);
        foreach ($rows as &$row) {
            $orderTotal = (float)($row['total'] ?? 0);
            if ($orderTotal <= 0 && !empty($row['id'])) {
                $fromTotals = $this->orderTotalForOrder($orderTotals, $row['id']);
                if ($fromTotals > 0) $orderTotal = $fromTotals;
            }
            $row['total'] = $orderTotal;
            $row['total_label'] = $this->money($orderTotal);
            $row['status_label'] = $this->statusLabel($row['status'] ?? null);
            $row['settlement_label'] = $this->statusLabel($row['settlement_status'] ?? null);
            $customer = trim((string)($row['first_name'] ?? '').' '.(string)($row['last_name'] ?? ''));
            if ($customer === '' && !empty($row['email'])) $customer = (string)$row['email'];
            $row['customer_label'] = $customer !== '' ? $customer : 'Guest';
            $rawRef = strtolower(trim((string)($row['table_ref'] ?? '')));
            if (isset($tableLookup[$rawRef])) {
                $row['table_label'] = $tableLookup[$rawRef];
                $row['table_match'] = 'current';
            } elseif ($rawRef !== '' && !in_array($rawRef, ['cashier','delivery','pickup','takeaway'], true)) {
                $row['table_label'] = 'Old table ref '.$row['table_ref'];
                $row['table_match'] = 'legacy';
            } else {
                $row['table_label'] = ucfirst($rawRef ?: 'No table');
                $row['table_match'] = 'service';
            }
            if (!empty($row['id'])) $row['edit_url'] = '/admin/orders/edit/'.$row['id'];
        }
        unset($row);
        return $rows;
    }

    protected function upcomingReservations($reservations)
    {
        if (!$reservations) return [];
        $cols = $this->cols($reservations);
        $id = $this->pick($cols, ['reservation_id', 'id']);
        $date = $this->pick($cols, ['reserve_date', 'reservation_date', 'date', 'booking_date', 'date_added', 'created_at']);
        $time = $this->pick($cols, ['reserve_time', 'reservation_time', 'time', 'booking_time']);
        $firstName = $this->pick($cols, ['first_name', 'name', 'customer_name', 'guest_name']);
        $lastName = $this->pick($cols, ['last_name', 'surname', 'family_name']);
        $guest = $this->pick($cols, ['guest_num', 'guests', 'covers', 'party_size']);
        $status = $this->pick($cols, ['status', 'status_name', 'reservation_status', 'state']);
        $table = $this->pick($cols, ['table_id', 'location_table_id', 'table_no', 'table_number', 'table']);
        $select = [];
        $select[] = $id ? $this->q($id).' id' : 'NULL id';
        $select[] = $date ? $this->q($date).' reserve_date' : 'NULL reserve_date';
        $select[] = $time ? $this->q($time).' reserve_time' : 'NULL reserve_time';
        $select[] = $firstName ? $this->q($firstName).' first_name' : 'NULL first_name';
        $select[] = $lastName ? $this->q($lastName).' last_name' : 'NULL last_name';
        $select[] = $guest ? $this->q($guest).' guests' : 'NULL guests';
        $select[] = $status ? $this->q($status).' status' : 'NULL status';
        $select[] = $table ? $this->q($table).' table_ref' : 'NULL table_ref';
        $where = $date ? ' WHERE DATE('.$this->q($date).') >= CURDATE()' : '';
        $order = $date ? ' ORDER BY '.$this->q($date).' ASC'.($time ? ', '.$this->q($time).' ASC' : '') : '';
        $rows = $this->rows('SELECT '.implode(',', $select).' FROM '.$this->q($reservations).$where.$order.' LIMIT 8');
        foreach ($rows as &$row) {
            $name = trim((string)($row['first_name'] ?? '').' '.(string)($row['last_name'] ?? ''));
            $row['guest_name'] = $name !== '' ? $name : 'Reservation';
            $row['status_label'] = $this->statusLabel($row['status'] ?? null);
        }
        unset($row);
        return $rows;
    }

    protected function floorPlan($tables, $orders, $reservations, $waiterCalls, $payments)
    {
        $summary = [
            'total' => 0,
            'free' => 0,
            'active' => 0,
            'reserved' => 0,
            'attention' => 0,
            'unpaid' => 0,
            'ready' => 0,
        ];

        if (!$tables) {
            return [
                'ok' => true,
                'source' => 'no tables table detected',
                'floors' => [],
                'tables' => [],
                'default_floor_id' => 'main-floor',
                'summary' => $summary,
                'note' => 'No restaurant table source was detected for the owner floor plan.',
            ];
        }

        $cols = $this->cols($tables);
        $idCol = $this->pick($cols, ['table_id', 'id']);
        if (!$idCol) {
            return [
                'ok' => false,
                'source' => $tables,
                'floors' => [],
                'tables' => [],
                'default_floor_id' => 'main-floor',
                'summary' => $summary,
                'note' => 'Tables source exists but no table id column was detected.',
            ];
        }

        $numberCol = $this->pick($cols, ['table_no', 'table_number', 'number', 'no']);
        $nameCol = $this->pick($cols, ['table_name', 'pos_table_label', 'name', 'label']);
        $statusCol = $this->pick($cols, ['table_status', 'status', 'enabled', 'is_active']);
        $visibleCol = $this->pick($cols, ['visible_on_floor_plan']);
        $priorityCol = $this->pick($cols, ['floor_sort', 'priority', 'sort_order', 'sort']);

        $sql = 'SELECT * FROM '.$this->q($tables);
        $where = [];
        // Native match: /admin/orders/create does not filter by visible_on_floor_plan or table_status.
        // It loads all tables and skips only Cashier/system rows.
        if ($nameCol) {
            $where[] = 'LOWER(TRIM(CAST('.$this->q($nameCol).' AS CHAR))) NOT IN ("cashier","delivery","takeaway","pickup","counter","pos","0")';
        }
        if ($numberCol) {
            $where[] = 'COALESCE(CAST('.$this->q($numberCol).' AS CHAR),"") != "0"';
        }
        if ($where) {
            $sql .= ' WHERE '.implode(' AND ', $where);
        }
        $orderParts = [];
        if ($this->pick($cols, ['floor_sort'])) $orderParts[] = $this->q('floor_sort').' ASC';
        if ($priorityCol && $priorityCol !== 'floor_sort') $orderParts[] = $this->q($priorityCol).' ASC';
        $orderParts[] = $this->q($idCol).' ASC';
        $sql .= ' ORDER BY '.implode(', ', $orderParts).' LIMIT 120';

        $orderMap = $this->floorOrderMap($orders);
        $reservationMap = $this->floorReservationMap($reservations);
        $callMap = $this->floorWaiterCallMap($waiterCalls);
        $dueMap = $this->floorDueMap($orders, $payments);

        $rows = $this->rows($sql);
        $out = [];
        $floorMap = [];
        $i = 0;

        foreach ($rows as $row) {
            $a = (array)$row;
            $id = (int)($a[$idCol] ?? 0);
            if (!$id) continue;

            $number = trim((string)($numberCol ? ($a[$numberCol] ?? '') : ''));
            if ($number === '') $number = (string)$id;

            $rawName = trim((string)($nameCol ? ($a[$nameCol] ?? '') : ''));
            $systemName = strtolower(trim($rawName ?: $number));
            if (in_array($systemName, ['cashier', 'delivery', 'takeaway', 'pickup'], true)) {
                continue;
            }

            $label = $rawName !== '' ? $rawName : ('Table '.$number);
            if (preg_match('/^table\s+/i', $label) && $number !== '') {
                $label = 'Table '.$number;
            }

            $floorName = trim((string)($a['floor_name'] ?? $a['table_floor'] ?? ''));
            if ($floorName === '') $floorName = 'Main Floor';
            $floorId = $this->slug($floorName);
            $floorSort = (int)($a['floor_sort'] ?? 1);
            if ($floorSort <= 0) $floorSort = 1;

            $section = trim((string)($a['table_section'] ?? $a['section'] ?? 'main'));
            if ($section === '') $section = 'main';
            $zone = trim((string)($a['table_zone'] ?? ''));

            $min = (int)($a['min_capacity'] ?? $a['capacity'] ?? $a['table_capacity'] ?? 0);
            $max = (int)($a['max_capacity'] ?? $a['capacity'] ?? $a['table_capacity'] ?? $min);
            $extra = (int)($a['extra_capacity'] ?? 0);
            if ($min <= 0 && $max > 0) $min = $max;
            if ($max <= 0 && $min > 0) $max = $min;
            if ($min <= 0 && $max <= 0) { $min = 2; $max = 2; }

            $shape = strtolower(trim((string)($a['floor_shape'] ?? $a['table_shape'] ?? 'rectangle')));
            if (!in_array($shape, ['rectangle','round','square','booth','bar','counter','roundrect'], true)) {
                $shape = ($max >= 6) ? 'rectangle' : 'roundrect';
            }

            $w = (float)($a['floor_width'] ?? 0);
            $h = (float)($a['floor_height'] ?? 0);
            if ($w <= 0) $w = ($shape === 'round' || $shape === 'square') ? 108 : 150;
            if ($h <= 0) $h = ($shape === 'round' || $shape === 'square') ? 108 : 78;
            $w = max(72, min(260, $w));
            $h = max(58, min(180, $h));

            $x = isset($a['floor_x']) && $a['floor_x'] !== null ? (float)$a['floor_x'] : (58 + (($i % 5) * 178));
            $y = isset($a['floor_y']) && $a['floor_y'] !== null ? (float)$a['floor_y'] : (58 + (floor($i / 5) * 126));
            $x = max(8, min(980 - $w, $x));
            $y = max(8, min(540 - $h, $y));

            // IMPORTANT v12: live order maps are keyed by current ti_tables.table_id
            // because the investigation showed orders.order_type matches table_id for real current floor rows.
            // v10 accidentally checked only table name/number, so the KPI could say 2 matched tables while the floor nodes still looked free.
            $keys = array_values(array_unique(array_filter([
                (string)$id,
                $rawName,
                $number,
                strtolower($label),
                strtolower(str_replace('Table ', '', $label)),
            ], function ($v) { return $v !== ''; })));

            $ordersInfo = $this->firstMapHit($orderMap, $keys, ['open_orders' => 0, 'ready' => 0, 'latest_order' => null]);
            $reservationInfo = $this->firstMapHit($reservationMap, $keys, ['count' => 0, 'next_time' => null, 'guest_name' => null, 'guests' => null]);
            $callInfo = $this->firstMapHit($callMap, $keys, ['count' => 0]);
            $dueInfo = $this->firstMapHit($dueMap, $keys, ['count' => 0, 'amount' => 0]);

            $openOrders = (int)($ordersInfo['open_orders'] ?? 0);
            $ready = (int)($ordersInfo['ready'] ?? 0);
            $reserved = (int)($reservationInfo['count'] ?? 0);
            $calls = (int)($callInfo['count'] ?? 0);
            $dueAmount = (float)($dueInfo['amount'] ?? 0);
            $dueCount = (int)($dueInfo['count'] ?? 0);

            $floorStatus = 'free';
            if ($calls > 0) $floorStatus = 'attention';
            elseif ($ready > 0) $floorStatus = 'ready';
            elseif ($dueAmount > 0 || $dueCount > 0) $floorStatus = 'unpaid';
            elseif ($openOrders > 0) $floorStatus = 'active';
            elseif ($reserved > 0) $floorStatus = 'reserved';

            $summary['total']++;
            if ($floorStatus === 'free') $summary['free']++;
            if ($floorStatus === 'active') $summary['active']++;
            if ($floorStatus === 'reserved') $summary['reserved']++;
            if ($floorStatus === 'attention') $summary['attention']++;
            if ($floorStatus === 'unpaid') $summary['unpaid']++;
            if ($floorStatus === 'ready') $summary['ready']++;

            if (!isset($floorMap[$floorId])) {
                $floorMap[$floorId] = [
                    'id' => $floorId,
                    'label' => $floorName,
                    'sort' => $floorSort,
                    'width' => 1000,
                    'height' => 560,
                    'tables' => 0,
                ];
            }
            $floorMap[$floorId]['tables']++;
            $floorMap[$floorId]['width'] = max($floorMap[$floorId]['width'], (int)ceil($x + $w + 80));
            $floorMap[$floorId]['height'] = max($floorMap[$floorId]['height'], (int)ceil($y + $h + 80));

            $out[] = [
                'id' => $id,
                'table_id' => $id,
                'number' => $number,
                'label' => $label,
                'name' => $label,
                'floor_id' => $floorId,
                'floor_name' => $floorName,
                'floor_sort' => $floorSort,
                'section' => $section,
                'zone' => $zone,
                'shape' => $shape,
                'x' => $x,
                'y' => $y,
                'width' => $w,
                'height' => $h,
                'min_capacity' => $min,
                'max_capacity' => $max,
                'extra_capacity' => $extra,
                'capacity_label' => $this->capacityLabel($min, $max, $extra),
                'status' => $floorStatus,
                'status_label' => strtoupper($floorStatus),
                'open_orders' => $openOrders,
                'ready' => $ready,
                'due_amount' => $dueAmount,
                'due_count' => $dueCount,
                'due_label' => $this->money($dueAmount),
                'waiter_calls' => $calls,
                'reservation' => $reservationInfo,
                'latest_order' => $ordersInfo['latest_order'] ?? null,
                'edit_url' => '/admin/tables/edit/'.$id,
                'create_order_url' => '/admin/orders/create?table_id='.$id,
            ];
            $i++;
        }

        $floors = array_values($floorMap);
        usort($floors, function ($a, $b) {
            return ($a['sort'] <=> $b['sort']) ?: strcmp($a['label'], $b['label']);
        });
        usort($out, function ($a, $b) {
            return ($a['floor_sort'] <=> $b['floor_sort'])
                ?: strcmp($a['floor_name'], $b['floor_name'])
                ?: ((float)$a['y'] <=> (float)$b['y'])
                ?: ((float)$a['x'] <=> (float)$b['x'])
                ?: ((int)$a['number'] <=> (int)$b['number']);
        });

        return [
            'ok' => true,
            'source' => $tables.'.floor_* columns + live order/reservation/call checks when table links exist',
            'floors' => $floors,
            'tables' => $out,
            'default_floor_id' => $floors ? $floors[0]['id'] : 'main-floor',
            'summary' => $summary,
            'note' => 'Uses table coordinates from the same floor metadata columns used by the order-create/table layout work.',
        ];
    }

    protected function floorOrderMap($orders)
    {
        if (!$orders) return [];
        $tables = $this->find($this->tables(), ['tables', 'restaurant_tables', 'location_tables']);
        $cols = $this->cols($orders);
        $table = $this->pick($cols, ['order_type']);
        if (!$table || !$tables) return [];
        $status = $this->pick($cols, ['status_id', 'order_status_id', 'status', 'status_name', 'order_status', 'state']);
        $id = $this->pick($cols, ['order_id', 'id']);
        $open = $status ? $this->currentOpenOrderCondition('o', $status, $cols) : '1=1';
        $ready = $status ? $this->orderReadyCondition('o.'.$status) : '0';
        $idExpr = $id ? 'MAX(o.'.$this->q($id).')' : 'NULL';

        $tc = $this->cols($tables);
        $tableId = $this->pick($tc, ['table_id', 'id']);
        if (!$tableId) return [];
        $whereCurrent = $this->currentTableWhere('t', $tc, true);
        $rows = $this->rows(
            'SELECT CAST(t.'.$this->q($tableId).' AS CHAR) table_ref, COUNT(*) open_orders, '.
            'SUM(CASE WHEN '.$ready.' THEN 1 ELSE 0 END) ready, '.$idExpr.' latest_order '.
            'FROM '.$this->q($tables).' t INNER JOIN '.$this->q($orders).' o '.
            'ON TRIM(CAST(o.'.$this->q($table).' AS CHAR)) = TRIM(CAST(t.'.$this->q($tableId).' AS CHAR)) '.
            'WHERE '.$open.' AND '.$whereCurrent.' GROUP BY CAST(t.'.$this->q($tableId).' AS CHAR)'
        );
        $out = [];
        foreach ($rows as $r) {
            $key = strtolower(trim((string)($r['table_ref'] ?? '')));
            if ($key !== '') $out[$key] = $r;
        }
        return $out;
    }


    protected function floorReservationMap($reservations)
    {
        if (!$reservations) return [];
        $cols = $this->cols($reservations);
        $table = $this->pick($cols, ['table_id', 'location_table_id', 'table_no', 'table_number', 'table']);
        if (!$table) return [];
        $date = $this->pick($cols, ['reserve_date', 'reservation_date', 'date', 'booking_date', 'created_at']);
        $time = $this->pick($cols, ['reserve_time', 'reservation_time', 'time', 'booking_time']);
        $name = $this->pick($cols, ['first_name', 'name', 'customer_name', 'guest_name']);
        $guests = $this->pick($cols, ['guest_num', 'guests', 'covers', 'party_size']);
        $status = $this->pick($cols, ['status', 'status_name', 'reservation_status', 'state']);
        $today = $date ? 'DATE('.$this->q($date).') = CURDATE()' : '1=1';
        $active = $status ? 'LOWER(COALESCE('.$this->q($status).',"")) NOT IN ("cancelled","canceled","no-show","rejected")' : '1=1';
        $select = [
            'CAST('.$this->q($table).' AS CHAR) table_ref',
            'COUNT(*) count',
            $time ? 'MIN('.$this->q($time).') next_time' : 'NULL next_time',
            $name ? 'MAX('.$this->q($name).') guest_name' : 'NULL guest_name',
            $guests ? 'MAX('.$this->q($guests).') guests' : 'NULL guests',
        ];
        $rows = $this->rows('SELECT '.implode(',', $select).' FROM '.$this->q($reservations).' WHERE '.$today.' AND '.$active.' AND '.$this->q($table).' IS NOT NULL AND '.$this->q($table).' != "" GROUP BY '.$this->q($table));
        $out = [];
        foreach ($rows as $r) {
            $key = strtolower(trim((string)($r['table_ref'] ?? '')));
            if ($key !== '') $out[$key] = $r;
        }
        return $out;
    }

    protected function floorWaiterCallMap($waiterCalls)
    {
        if (!$waiterCalls) return [];
        $cols = $this->cols($waiterCalls);
        $table = $this->pick($cols, ['table_id', 'location_table_id', 'table_no', 'table_number', 'table']);
        if (!$table) return [];
        $status = $this->pick($cols, ['resolved_at', 'handled_at', 'is_resolved', 'resolved', 'status']);
        $open = '1=1';
        if ($status) {
            if (substr($status, -3) === '_at') $open = $this->q($status).' IS NULL';
            elseif ($status === 'status') $open = 'LOWER(COALESCE('.$this->q($status).',"")) NOT IN ("done","resolved","closed","cancelled","canceled")';
            else $open = 'COALESCE('.$this->q($status).',0) = 0';
        }
        $rows = $this->rows('SELECT CAST('.$this->q($table).' AS CHAR) table_ref, COUNT(*) count FROM '.$this->q($waiterCalls).' WHERE '.$open.' AND '.$this->q($table).' IS NOT NULL AND '.$this->q($table).' != "" GROUP BY '.$this->q($table));
        $out = [];
        foreach ($rows as $r) {
            $key = strtolower(trim((string)($r['table_ref'] ?? '')));
            if ($key !== '') $out[$key] = $r;
        }
        return $out;
    }

    protected function floorDueMap($orders, $payments)
    {
        if (!$orders) return [];
        $tables = $this->find($this->tables(), ['tables', 'restaurant_tables', 'location_tables']);
        if (!$tables) return [];
        $cols = $this->cols($orders);
        $table = $this->pick($cols, ['order_type']);
        $id = $this->pick($cols, ['order_id', 'id']);
        $total = $this->pick($cols, ['order_total', 'total', 'total_amount', 'grand_total', 'payment_total']);
        $status = $this->pick($cols, ['status_id', 'order_status_id', 'status', 'status_name', 'order_status', 'state']);
        if (!$table) return [];
        $tc = $this->cols($tables);
        $tableId = $this->pick($tc, ['table_id', 'id']);
        if (!$tableId) return [];
        $orderTotals = $this->find($this->tables(), ['order_totals']);
        $normalizedExpr = $this->normalizedOrderTotalExpr('o', $orders, $orderTotals, $id, $total);
        $open = $status ? $this->currentOpenOrderCondition('o', $status, $cols) : '1=1';
        $whereCurrent = $this->currentTableWhere('t', $tc, true);
        $rows = $this->rows(
            'SELECT CAST(t.'.$this->q($tableId).' AS CHAR) table_ref, COUNT(*) count, COALESCE(SUM('.$normalizedExpr.'),0) amount '.
            'FROM '.$this->q($tables).' t INNER JOIN '.$this->q($orders).' o '.
            'ON TRIM(CAST(o.'.$this->q($table).' AS CHAR)) = TRIM(CAST(t.'.$this->q($tableId).' AS CHAR)) '.
            'WHERE '.$open.' AND '.$whereCurrent.' GROUP BY CAST(t.'.$this->q($tableId).' AS CHAR)'
        );
        $out = [];
        foreach ($rows as $r) {
            $key = strtolower(trim((string)($r['table_ref'] ?? '')));
            if ($key !== '') $out[$key] = $r;
        }
        return $out;
    }


    protected function firstMapHit($map, $keys, $default)
    {
        foreach ($keys as $key) {
            $k = strtolower(trim((string)$key));
            if ($k !== '' && isset($map[$k])) return $map[$k];
        }
        return $default;
    }

    protected function capacityLabel($min, $max, $extra)
    {
        $min = (int)$min;
        $max = (int)$max;
        $extra = (int)$extra;
        $label = $min === $max ? $max.' seats' : $min.'-'.$max.' seats';
        if ($extra > 0) $label .= ' +'.$extra;
        return $label;
    }

    protected function slug($v)
    {
        $v = strtolower(trim((string)$v));
        $v = preg_replace('/[^a-z0-9]+/', '-', $v);
        $v = trim($v, '-');
        return $v ?: 'main-floor';
    }

    protected function orderDateColumn($cols)
    {
        // Native admin screens sort and filter closer to created_at/order_id.
        // PMD-created orders can have order_date = 0000-00-00, so order_date-first hides real current orders.
        return $this->pick($cols, ['created_at', 'date_added', 'created', 'created_on', 'order_date', 'updated_at']);
    }

    protected function orderTableRefColumn($cols)
    {
        return $this->pick($cols, ['table_id', 'location_table_id', 'table_no', 'table_number', 'table', 'order_type']);
    }

    protected function tableRefValidCondition($col)
    {
        $q = $this->q($col);
        return $q.' IS NOT NULL AND TRIM(CAST('.$q.' AS CHAR)) != "" AND LOWER(TRIM(CAST('.$q.' AS CHAR))) NOT IN ("cashier","delivery","pickup","pick-up","takeaway","take-away","collection","counter","pos")';
    }


    protected function orderOpenCondition($status)
    {
        return $this->currentOpenOrderCondition('', $status, []);
    }

    protected function nativeOpenOrderCondition($alias, $status, $cols)
    {
        return $this->currentOpenOrderCondition($alias, $status, $cols);
    }

    protected function currentOpenOrderCondition($alias, $status, $cols = [])
    {
        $prefix = $alias ? $alias.'.' : '';
        $s = $prefix.$this->q($status);
        if (stripos($status, 'id') !== false) {
            // Deep investigation used this exact open-order rule. status_id=0 rows are drafts/invalid and must not be treated as open live checks.
            return 'COALESCE('.$s.',0) NOT IN (0,5,6,7,8,9,10)';
        }
        return 'LOWER(COALESCE('.$s.',"")) NOT IN ("","draft","complete","completed","closed","cancelled","canceled","paid","settled","delivered","failed","refunded")';
    }

    protected function paidStatusId()
    {
        static $paid = null;
        if ($paid !== null) return $paid;
        $paid = 10;
        try {
            $statuses = $this->find($this->tables(), ['statuses', 'order_statuses']);
            if ($statuses) {
                $cols = $this->cols($statuses);
                $id = $this->pick($cols, ['status_id', 'id']);
                $name = $this->pick($cols, ['status_name', 'name', 'label']);
                if ($id && $name) {
                    $v = $this->scalar('SELECT '.$this->q($id).' v FROM '.$this->q($statuses).' WHERE LOWER('.$this->q($name).') = "paid" LIMIT 1');
                    if ($v !== null && $v !== '') $paid = (int)$v;
                }
            }
        } catch (\Throwable $e) {}
        return $paid;
    }

    protected function orderReadyCondition($status)
    {
        $s = $this->q($status);
        if (stripos($status, 'id') !== false) {
            return 'COALESCE('.$s.',0) IN (4)';
        }
        return 'LOWER(COALESCE('.$s.',"")) IN ("ready","ready to serve","prepared","done")';
    }

    protected function sumOrderTotalsForOrdersWhere($orderTotals, $orders, $orderId, $where)
    {
        if (!$orderTotals || !$orders || !$orderId) return 0;
        $tc = $this->cols($orderTotals);
        $otOrder = $this->pick($tc, ['order_id']);
        $otValue = $this->pick($tc, ['value', 'amount', 'total']);
        $otCode = $this->pick($tc, ['code']);
        $otTitle = $this->pick($tc, ['title', 'name']);
        if (!$otOrder || !$otValue) return 0;
        $codeWhere = '';
        if ($otCode) {
            $codeWhere = ' AND LOWER(COALESCE(ot.'.$this->q($otCode).',"")) IN ("total","order_total","grand_total")';
        } elseif ($otTitle) {
            $codeWhere = ' AND LOWER(COALESCE(ot.'.$this->q($otTitle).',"")) LIKE "%total%"';
        }
        return (float)$this->scalar(
            'SELECT COALESCE(SUM(CAST(ot.'.$this->q($otValue).' AS DECIMAL(15,2))),0) v FROM '.$this->q($orderTotals).' ot INNER JOIN '.$this->q($orders).' o ON o.'.$this->q($orderId).' = ot.'.$this->q($otOrder).' WHERE '.$this->aliasWhere($where, 'o').$codeWhere
        );
    }

    protected function orderTotalForOrder($orderTotals, $orderId)
    {
        if (!$orderTotals || !$orderId) return 0;
        $tc = $this->cols($orderTotals);
        $otOrder = $this->pick($tc, ['order_id']);
        $otValue = $this->pick($tc, ['value', 'amount', 'total']);
        $otCode = $this->pick($tc, ['code']);
        $otTitle = $this->pick($tc, ['title', 'name']);
        if (!$otOrder || !$otValue) return 0;
        $where = $this->q($otOrder).' = '.(int)$orderId;
        if ($otCode) $where .= ' AND LOWER(COALESCE('.$this->q($otCode).',"")) IN ("total","order_total","grand_total")';
        elseif ($otTitle) $where .= ' AND LOWER(COALESCE('.$this->q($otTitle).',"")) LIKE "%total%"';
        return (float)$this->scalar('SELECT COALESCE(SUM(CAST('.$this->q($otValue).' AS DECIMAL(15,2))),0) v FROM '.$this->q($orderTotals).' WHERE '.$where);
    }

    protected function tableLookup($tables)
    {
        if (!$tables) return [];
        $cols = $this->cols($tables);
        $id = $this->pick($cols, ['table_id', 'id']);
        $num = $this->pick($cols, ['table_no', 'table_number', 'number', 'no']);
        $name = $this->pick($cols, ['table_name', 'pos_table_label', 'name', 'label']);
        if (!$id && !$num) return [];
        $select = [];
        $select[] = $id ? $this->q($id).' id' : 'NULL id';
        $select[] = $num ? $this->q($num).' num' : 'NULL num';
        $select[] = $name ? $this->q($name).' label' : 'NULL label';
        $rows = $this->rows('SELECT '.implode(',', $select).' FROM '.$this->q($tables).' LIMIT 300');
        $out = [];
        foreach ($rows as $r) {
            $label = trim((string)($r['label'] ?? ''));
            if ($label === '') $label = 'Table '.($r['num'] ?? $r['id'] ?? '');
            foreach ([$r['id'] ?? null, $r['num'] ?? null, strtolower($label), strtolower(str_replace('Table ', '', $label))] as $key) {
                $k = strtolower(trim((string)$key));
                if ($k !== '') $out[$k] = $label;
            }
        }
        return $out;
    }

    protected function ownerSnapshot($orderInfo, $paymentInfo, $reservationInfo, $tableInfo, $waiterInfo, $kitchenInfo, $customerInfo, $staffInfo, $menuInventory = [], $tableDiagnostics = [])
    {
        $connectedNow = [
            'total_revenue' => ['label' => 'Total Revenue', 'value' => $this->money($orderInfo['total_revenue_raw'] ?? 0), 'note' => ($orderInfo['total_orders_raw'] ?? 0).' total order(s) · normalized'],
            'total_orders' => ['label' => 'Total Orders', 'value' => (string)($orderInfo['total_orders_raw'] ?? 0), 'note' => 'Last '.$orderInfo['last_order_label']],
            'open_checks' => ['label' => 'Open Checks', 'value' => (string)($orderInfo['open_orders_raw'] ?? 0), 'note' => 'status_id excludes 0/paid/closed'],
            'matched_tables' => ['label' => 'Matched Tables', 'value' => (string)($tableDiagnostics['matched_open_current_tables'] ?? 0), 'note' => 'open orders matched to current floor table_id'],
            'unmapped_refs' => ['label' => 'Unmapped Refs', 'value' => (string)count($tableDiagnostics['unmatched_open_refs'] ?? []), 'note' => 'open order_type refs not in current ti_tables'],
            'pending_now' => ['label' => 'Pending Now', 'value' => $this->money($paymentInfo['pending_amount_raw'] ?? 0), 'note' => ($paymentInfo['pending_count'] ?? 0).' unpaid/open checks'],
            'menu_items' => ['label' => 'Foods', 'value' => (string)($menuInventory['menus_total'] ?? 0), 'note' => ($menuInventory['categories_total'] ?? 0).' categories · '.($menuInventory['media_total'] ?? 0).' media'],
            'tables' => ['label' => 'Busy Tables', 'value' => ($tableInfo['active'] ?? 0).' / '.($tableInfo['total'] ?? 0), 'note' => 'busy/unpaid visible / current visible'],
            'queue' => ['label' => 'Kitchen Queue', 'value' => (string)($kitchenInfo['preparing'] ?? 0), 'note' => ($kitchenInfo['ready'] ?? 0).' ready'],
            'staff' => ['label' => 'Staff', 'value' => (string)($staffInfo['total'] ?? 0), 'note' => 'team members detected'],
            'reservations' => ['label' => 'Reservations', 'value' => (string)($reservationInfo['upcoming'] ?? 0), 'note' => ($reservationInfo['today'] ?? 0).' today'],
            'waiter_calls' => ['label' => 'Waiter Calls', 'value' => (string)($waiterInfo['open'] ?? 0), 'note' => ($waiterInfo['today'] ?? 0).' created today'],
        ];
        return array_values($connectedNow);
    }



    protected function menuInventory($menus, $categories, $menuCategories, $mediaAttachments, $menuImages, $orderMenus)
    {
        $out = [
            'menus_total' => $menus ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($menus)) : 0,
            'categories_total' => $categories ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($categories)) : 0,
            'menu_category_links' => $menuCategories ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($menuCategories)) : 0,
            'media_total' => $mediaAttachments ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($mediaAttachments)) : 0,
            'menu_images_total' => $menuImages ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($menuImages)) : 0,
            'order_item_rows' => $orderMenus ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orderMenus)) : 0,
            'menus' => [],
            'categories' => [],
            'media_samples' => [],
            'source' => 'ti_menus + ti_categories + ti_media_attachments; ti_menu_images is checked but may be empty',
        ];
        if ($menus) {
            $c = $this->cols($menus); $id=$this->pick($c,['menu_id','id']); $name=$this->pick($c,['menu_name','name']); $price=$this->pick($c,['menu_price','price']); $status=$this->pick($c,['menu_status','status']); $stock=$this->pick($c,['is_stock_out','stock_out']); $priority=$this->pick($c,['menu_priority','priority','sort_order']);
            if ($id && $name) {
                $sel = [$this->q($id).' id', $this->q($name).' name', $price?$this->q($price).' price':'NULL price', $status?$this->q($status).' status':'NULL status', $stock?$this->q($stock).' stock_out':'NULL stock_out'];
                $order = $priority ? ' ORDER BY '.$this->q($priority).' ASC, '.$this->q($name).' ASC' : ' ORDER BY '.$this->q($name).' ASC';
                $out['menus'] = $this->rows('SELECT '.implode(',', $sel).' FROM '.$this->q($menus).$order.' LIMIT 24');
            }
        }
        if ($categories) {
            $c = $this->cols($categories); $id=$this->pick($c,['category_id','id']); $name=$this->pick($c,['name','category_name']); $status=$this->pick($c,['status','category_status']); $priority=$this->pick($c,['priority','sort_order']);
            if ($id && $name) {
                $sel = [$this->q($id).' id', $this->q($name).' name', $status?$this->q($status).' status':'NULL status'];
                $order = $priority ? ' ORDER BY '.$this->q($priority).' ASC, '.$this->q($name).' ASC' : ' ORDER BY '.$this->q($name).' ASC';
                $out['categories'] = $this->rows('SELECT '.implode(',', $sel).' FROM '.$this->q($categories).$order.' LIMIT 16');
            }
        }
        if ($mediaAttachments) {
            $c = $this->cols($mediaAttachments); $id=$this->pick($c,['id','attachment_id']); $file=$this->pick($c,['file_name','disk_name','path']);
            if ($file) $out['media_samples'] = $this->rows('SELECT '.($id?$this->q($id).' id,':'NULL id,').$this->q($file).' file_name FROM '.$this->q($mediaAttachments).' WHERE '.$this->q($file).' IS NOT NULL AND CAST('.$this->q($file).' AS CHAR) != "" LIMIT 8');
        }
        return $out;
    }

    protected function tableDiagnostics($tables, $orders, $tableMerges = null, $waiterAssignments = null)
    {
        $out = [
            'current_tables' => [], 'service_tables' => [], 'matched_open_refs' => [], 'unmatched_open_refs' => [],
            'order_type_distribution' => [], 'matched_open_current_tables' => 0, 'current_table_count' => 0,
            'service_table_count' => 0, 'table_merges_count' => $tableMerges ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($tableMerges)) : 0,
            'waiter_assignment_count' => $waiterAssignments ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($waiterAssignments)) : 0,
            'summary_note' => 'no tables/orders detected yet',
        ];
        if ($tables) {
            $tc=$this->cols($tables); $id=$this->pick($tc,['table_id','id']); $num=$this->pick($tc,['table_no','table_number','number','no']); $name=$this->pick($tc,['table_name','pos_table_label','name','label']);
            $select = [($id?$this->q($id):'NULL').' table_id', ($num?$this->q($num):'NULL').' table_no', ($name?$this->q($name):'NULL').' table_name'];
            $whereCurrent=$this->currentTableWhere('', $tc, true); $whereService=$this->serviceTableWhere('', $tc);
            $out['current_tables'] = $this->rows('SELECT '.implode(',', $select).' FROM '.$this->q($tables).' WHERE '.$whereCurrent.' ORDER BY '.($num?$this->q($num):($id?$this->q($id):'1')).' ASC LIMIT 80');
            $out['service_tables'] = $this->rows('SELECT '.implode(',', $select).' FROM '.$this->q($tables).' WHERE '.$whereService.' ORDER BY '.($id?$this->q($id):'1').' ASC LIMIT 40');
            $out['current_table_count'] = count($out['current_tables']);
            $out['service_table_count'] = count($out['service_tables']);
        }
        if ($orders) {
            $oc=$this->cols($orders); $type=$this->pick($oc,['order_type']); $status=$this->pick($oc,['status_id','order_status_id','status','status_name','order_status','state']); $oid=$this->pick($oc,['order_id','id']);
            if ($type) {
                $out['order_type_distribution'] = $this->rows('SELECT CAST('.$this->q($type).' AS CHAR) order_type, COUNT(*) count FROM '.$this->q($orders).' GROUP BY CAST('.$this->q($type).' AS CHAR) ORDER BY count DESC, order_type LIMIT 30');
            }
            if ($tables && $type) {
                $tc=$this->cols($tables); $tid=$this->pick($tc,['table_id','id']); $tnum=$this->pick($tc,['table_no','table_number','number','no']); $tname=$this->pick($tc,['table_name','pos_table_label','name','label']);
                $open = $status ? $this->currentOpenOrderCondition('o', $status, $oc) : '1=1';
                $whereCurrent=$this->currentTableWhere('t', $tc, true);
                if ($tid) {
                    $select = 'CAST(o.'.$this->q($type).' AS CHAR) order_type, COUNT(*) open_orders, MAX(o.'.($oid?$this->q($oid):'NULL').') latest_order, t.'.$this->q($tid).' table_id'.($tnum?', t.'.$this->q($tnum).' table_no':'').($tname?', t.'.$this->q($tname).' table_name':'');
                    $out['matched_open_refs'] = $this->rows('SELECT '.$select.' FROM '.$this->q($orders).' o INNER JOIN '.$this->q($tables).' t ON TRIM(CAST(o.'.$this->q($type).' AS CHAR)) = TRIM(CAST(t.'.$this->q($tid).' AS CHAR)) WHERE '.$open.' AND '.$whereCurrent.' GROUP BY CAST(o.'.$this->q($type).' AS CHAR), t.'.$this->q($tid).' LIMIT 40');
                    $out['matched_open_current_tables'] = count($out['matched_open_refs']);
                    $out['unmatched_open_refs'] = $this->rows('SELECT CAST(o.'.$this->q($type).' AS CHAR) order_type, COUNT(*) open_orders, MAX(o.'.($oid?$this->q($oid):'NULL').') latest_order FROM '.$this->q($orders).' o LEFT JOIN '.$this->q($tables).' t ON TRIM(CAST(o.'.$this->q($type).' AS CHAR)) = TRIM(CAST(t.'.$this->q($tid).' AS CHAR)) AND '.$whereCurrent.' WHERE '.$open.' AND (t.'.$this->q($tid).' IS NULL) GROUP BY CAST(o.'.$this->q($type).' AS CHAR) ORDER BY open_orders DESC, order_type LIMIT 40');
                }
            }
        }
        $out['summary_note'] = 'current tables='.$out['current_table_count'].', service rows='.$out['service_table_count'].', matched open refs='.$out['matched_open_current_tables'].', unmapped open refs='.count($out['unmatched_open_refs']);
        return $out;
    }

    protected function currentTableWhere($alias, $cols, $floorOnly = true)
    {
        $prefix = $alias ? $alias.'.' : '';
        $parts = [];
        $name = $this->pick($cols, ['table_name','pos_table_label','name','label']);
        $num = $this->pick($cols, ['table_no','table_number','number','no']);
        $visible = $this->pick($cols, ['visible_on_floor_plan']);
        $status = $this->pick($cols, ['table_status','status','enabled','is_active']);
        if ($name) $parts[] = 'LOWER(TRIM(CAST('.$prefix.$this->q($name).' AS CHAR))) NOT IN ("cashier","delivery","takeaway","pickup","counter","pos","0","")';
        if ($num) $parts[] = 'COALESCE(CAST('.$prefix.$this->q($num).' AS CHAR),"") != "0"';
        if ($floorOnly && $visible) $parts[] = '('.$prefix.$this->q($visible).' IS NULL OR '.$prefix.$this->q($visible).' = 1)';
        if ($floorOnly && $status) $parts[] = '('.$prefix.$this->q($status).' IS NULL OR '.$prefix.$this->q($status).' = 1 OR LOWER(CAST('.$prefix.$this->q($status).' AS CHAR)) IN ("1","active","enabled","available","open"))';
        return $parts ? implode(' AND ', $parts) : '1=1';
    }

    protected function serviceTableWhere($alias, $cols)
    {
        $prefix = $alias ? $alias.'.' : '';
        $name = $this->pick($cols, ['table_name','pos_table_label','name','label']);
        if ($name) return 'LOWER(TRIM(CAST('.$prefix.$this->q($name).' AS CHAR))) IN ("cashier","delivery","takeaway","pickup","counter","pos","0","")';
        return '1=0';
    }

    protected function normalizedOrderTotalExpr($alias, $orders, $orderTotals, $orderId, $directTotal)
    {
        $prefix = $alias ? $alias.'.' : '';
        $fallback = $directTotal ? 'CAST('.$prefix.$this->q($directTotal).' AS DECIMAL(15,2))' : '0';
        if (!$orderTotals || !$orderId) return $fallback;
        $tc=$this->cols($orderTotals); $otOrder=$this->pick($tc,['order_id']); $otValue=$this->pick($tc,['value','amount','total']); $otCode=$this->pick($tc,['code']); $otTitle=$this->pick($tc,['title','name']);
        if (!$otOrder || !$otValue) return $fallback;
        $filter = '';
        if ($otCode) $filter = ' AND LOWER(COALESCE(ot.'.$this->q($otCode).',"")) IN ("total","order_total","grand_total")';
        elseif ($otTitle) $filter = ' AND LOWER(COALESCE(ot.'.$this->q($otTitle).',"")) LIKE "%total%"';
        $sub = '(SELECT COALESCE(SUM(CAST(ot.'.$this->q($otValue).' AS DECIMAL(15,2))),0) FROM '.$this->q($orderTotals).' ot WHERE ot.'.$this->q($otOrder).' = '.$prefix.$this->q($orderId).$filter.')';
        return '(CASE WHEN '.$sub.' > 0 THEN '.$sub.' ELSE '.$fallback.' END)';
    }

    protected function sumNormalizedOrderRevenue($orders, $orderTotals, $orderId, $directTotal, $where)
    {
        if (!$orders) return 0;
        $expr = $this->normalizedOrderTotalExpr('o', $orders, $orderTotals, $orderId, $directTotal);
        return (float)$this->scalar('SELECT COALESCE(SUM('.$expr.'),0) v FROM '.$this->q($orders).' o WHERE '.$this->aliasWhere($where, 'o'));
    }

    protected function normalizedOrderTotal($orders, $orderTotals, $orderId, $directTotal, $orderIdValue)
    {
        if (!$orders || !$orderId || !$orderIdValue) return 0;
        $expr = $this->normalizedOrderTotalExpr('o', $orders, $orderTotals, $orderId, $directTotal);
        return (float)$this->scalar('SELECT '.$expr.' v FROM '.$this->q($orders).' o WHERE o.'.$this->q($orderId).' = '.(int)$orderIdValue.' LIMIT 1');
    }


    protected function notificationAudit($notifications, $orders)
    {
        $out = ['rows' => [], 'possible_order_numbers' => [], 'matched_orders' => [], 'unmatched_order_numbers' => [], 'summary_note' => 'no notifications table detected'];
        if (!$notifications) return $out;
        $cols = $this->cols($notifications);
        $title = $this->pick($cols, ['title', 'message', 'subject']);
        $payload = $this->pick($cols, ['payload', 'data', 'meta']);
        $created = $this->pick($cols, ['created_at', 'date_added', 'created']);
        $id = $this->pick($cols, ['id', 'notification_id']);
        $select = [];
        $select[] = $id ? $this->q($id).' id' : 'NULL id';
        $select[] = $title ? $this->q($title).' title' : 'NULL title';
        $select[] = $payload ? $this->q($payload).' payload' : 'NULL payload';
        $select[] = $created ? $this->q($created).' created_at' : 'NULL created_at';
        $orderBy = $created ? $this->q($created).' DESC' : ($id ? $this->q($id).' DESC' : '1');
        $rows = $this->rows('SELECT '.implode(',', $select).' FROM '.$this->q($notifications).' ORDER BY '.$orderBy.' LIMIT 20');
        $out['rows'] = $rows;
        $nums = [];
        foreach ($rows as $r) {
            $text = (string)($r['title'] ?? '').' '.(string)($r['payload'] ?? '');
            if (preg_match_all('/#(\d+)/', $text, $m)) {
                foreach ($m[1] as $n) $nums[(string)$n] = true;
            }
            if (preg_match_all('/order[^0-9]{0,10}(\d+)/i', $text, $m2)) {
                foreach ($m2[1] as $n) $nums[(string)$n] = true;
            }
        }
        $out['possible_order_numbers'] = array_keys($nums);
        if ($orders && $out['possible_order_numbers']) {
            $oc = $this->cols($orders);
            $oid = $this->pick($oc, ['order_id', 'id']);
            $external = $this->pick($oc, ['external_order_number', 'order_number', 'order_no']);
            $matched = [];
            foreach ($out['possible_order_numbers'] as $n) {
                $conds = [];
                if ($oid) $conds[] = $this->q($oid).' = '.(int)$n;
                if ($external) $conds[] = 'CAST('.$this->q($external).' AS CHAR) = '.$this->quote($n);
                $exists = $conds ? (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($orders).' WHERE '.implode(' OR ', $conds)) : 0;
                if ($exists > 0) $matched[] = $n; else $out['unmatched_order_numbers'][] = $n;
            }
            $out['matched_orders'] = $matched;
        }
        $out['summary_note'] = 'notifications checked='.count($rows).', possible order numbers='.count($out['possible_order_numbers']).', unmatched='.count($out['unmatched_order_numbers']);
        return $out;
    }

    protected function connectionMap($map)
    {
        $out = [];
        foreach ($map as $label => $table) {
            $count = null;
            if ($table) $count = (int)$this->scalar('SELECT COUNT(*) v FROM '.$this->q($table));
            $out[] = [
                'key' => $label,
                'label' => ucwords(str_replace('_', ' ', $label)),
                'table' => $table ?: null,
                'connected' => (bool)$table,
                'count' => $count,
            ];
        }
        return $out;
    }

    protected function detectedColumns($tables)
    {
        $out = [];
        foreach ($tables as $key => $table) {
            if ($table) $out[$key] = ['table' => $table, 'columns' => $this->cols($table)];
        }
        return $out;
    }

    protected function tables()
    {
        try {
            return array_values(array_filter(array_map(function ($row) {
                $a = (array)$row;
                return (string)reset($a);
            }, DB::select('SHOW TABLES'))));
        } catch (\Throwable $e) {
            return [];
        }
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
            return array_map(function ($row) {
                return $row->Field;
            }, DB::select('SHOW COLUMNS FROM '.$this->q($table)));
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

    protected function rows($sql)
    {
        try {
            return array_map(function ($row) {
                return (array)$row;
            }, DB::select($sql));
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function quote($value)
    {
        return "'" . str_replace("'", "''", (string)$value) . "'";
    }

    protected function q($id)
    {
        return '`'.str_replace('`', '``', $id).'`';
    }

    protected function aliasWhere($where, $alias)
    {
        return preg_replace_callback('/`([^`]+)`/', function ($m) use ($alias) {
            return $alias.'.`'.str_replace('`', '``', $m[1]).'`';
        }, $where);
    }

    protected function statusLabel($status)
    {
        if ($status === null || $status === '') return '—';
        $v = trim((string)$status);
        if ($v === '') return '—';
        if (is_numeric($v)) {
            $map = $this->statusNameMap();
            if (isset($map[(string)(int)$v]) && $map[(string)(int)$v] !== '') return $map[(string)(int)$v];
            // Operational fallback: status_id 0 is draft/test in this PMD DB, status_id 1 is the current open/imported check state.
            if ((int)$v === 0) return 'Draft';
            if ((int)$v === 1) return 'Open';
            return 'Status '.$v;
        }
        $v = str_replace(['_', '-'], ' ', $v);
        return ucwords($v);
    }

    protected function statusNameMap()
    {
        static $map = null;
        if ($map !== null) return $map;
        $map = [];
        try {
            $statuses = $this->find($this->tables(), ['statuses', 'order_statuses']);
            if (!$statuses) return $map;
            $cols = $this->cols($statuses);
            $id = $this->pick($cols, ['status_id', 'id']);
            $name = $this->pick($cols, ['status_name', 'name', 'label']);
            if (!$id || !$name) return $map;
            $rows = $this->rows('SELECT '.$this->q($id).' id, '.$this->q($name).' name FROM '.$this->q($statuses));
            foreach ($rows as $r) {
                $sid = trim((string)($r['id'] ?? ''));
                $label = trim((string)($r['name'] ?? ''));
                if ($sid !== '' && $label !== '') $map[$sid] = ucwords(str_replace(['_', '-'], ' ', $label));
            }
        } catch (\Throwable $e) {}
        return $map;
    }

    protected function money($value)
    {
        return '€'.number_format((float)$value, 2, '.', ',');
    }
}
