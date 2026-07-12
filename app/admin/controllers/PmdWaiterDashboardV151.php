<?php

namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;

/**
 * Waiter Dashboard V151
 *
 * The visible waiter UI still reads /admin/pmd-waiter-dashboard-v9-tenant-data.
 * V150 fixed the canonical order/table resolver but only served the newer data
 * route. V151 exposes the same resolved orders in the exact V9 response shape
 * consumed by the V5 dashboard renderer, so order cards receive table_number.
 */
class PmdWaiterDashboardV151 extends PmdWaiterDashboardV150
{
    public function data()
    {
        return $this->json($this->v9CompatiblePayload());
    }

    public function floorTables()
    {
        $payload = $this->v9CompatiblePayload();
        $tables = $payload['sections']['floor_plan']['tables'] ?? [];

        return $this->json([
            'ok' => true,
            'version' => 'waiter-dashboard-v151-floor-tables',
            'tenant_db' => $payload['tenant_db'] ?? null,
            'count' => count($tables),
            'tables' => $tables,
            'debug' => $payload['debug'] ?? [],
        ]);
    }

    protected function v9CompatiblePayload(): array
    {
        $base = $this->payload(false);
        $tables = array_values((array)($base['tables'] ?? []));
        $orders = array_values((array)($base['orders'] ?? []));

        $busy = count(array_filter($tables, function ($table) {
            return (int)($table['open_orders'] ?? 0) > 0;
        }));

        $pendingTotal = array_sum(array_map(function ($order) {
            $settlement = strtolower(trim((string)($order['settlement_status'] ?? 'unpaid')));
            if (in_array($settlement, ['paid', 'settled', 'closed'], true)) {
                return 0;
            }

            return max(0, (float)($order['total'] ?? 0) - (float)($order['settled_amount'] ?? 0));
        }, $orders));

        $notesCount = count(array_filter($orders, function ($order) {
            if (trim((string)($order['comment'] ?? '')) !== '') {
                return true;
            }

            return !empty($order['item_notes']);
        }));

        $kitchenQueue = count(array_filter($orders, function ($order) {
            $status = strtolower(trim((string)($order['status'] ?? '')));
            return (int)($order['processed'] ?? 0) === 1
                || preg_match('/received|sent|kitchen|prepar|cooking/i', $status);
        }));

        foreach ($orders as &$order) {
            $tableNumber = trim((string)($order['table_number'] ?? $order['table_no'] ?? ''));
            $tableLabel = trim((string)($order['table_label'] ?? $order['table_name'] ?? ''));

            $order['table'] = $tableNumber;
            $order['table_no'] = $tableNumber;
            $order['table_ref'] = $tableNumber;
            $order['table_number'] = $tableNumber;
            $order['table_name'] = $tableLabel;
            $order['table_display'] = $tableLabel;
            $order['table_label'] = $tableLabel;
            $order['status_label'] = $order['status'] ?? 'Received';
            $order['status_raw'] = $order['status_id'] ?? '';
            $order['has_note'] = trim((string)($order['comment'] ?? '')) !== '' || !empty($order['item_notes']);
            $order['note'] = $order['comment'] ?? null;
        }
        unset($order);

        $totalTables = count($tables);
        $free = max(0, $totalTables - $busy);

        return array_merge($base, [
            'ok' => true,
            'version' => 'waiter-dashboard-v151-v9-compatible-table-numbers',
            'tenant_db' => $this->currentDatabaseName(),
            'orders' => $orders,
            'current_orders' => $orders,
            'metrics' => [
                'active_tables' => ['label' => 'Active Tables', 'value' => (string)$busy, 'raw' => $busy],
                'open_orders' => ['label' => 'Active Orders', 'value' => (string)count($orders), 'raw' => count($orders)],
                'pending_value' => ['label' => 'Payment Waiting', 'value' => $this->money((float)$pendingTotal), 'raw' => (float)$pendingTotal],
                'kitchen_queue' => ['label' => 'Kitchen Attention', 'value' => (string)$kitchenQueue, 'raw' => $kitchenQueue],
                'notes_count' => ['label' => 'Notes', 'value' => (string)$notesCount, 'raw' => $notesCount],
            ],
            'sections' => [
                'active_orders' => $orders,
                'open_orders' => $orders,
                'recent_orders' => $orders,
                'orders' => $orders,
                'tables' => $tables,
                'floor_plan' => [
                    'tables' => $tables,
                    'summary' => [
                        'total' => $totalTables,
                        'busy' => $busy,
                        'free' => $free,
                        'active' => $busy,
                    ],
                ],
            ],
            'debug' => [
                'resolver' => 'PmdWaiterDashboardV151',
                'orders_count' => count($orders),
                'orders_with_table_number' => count(array_filter($orders, function ($order) {
                    return trim((string)($order['table_number'] ?? '')) !== '';
                })),
                'tables_count' => $totalTables,
            ],
        ]);
    }

    protected function currentDatabaseName(): ?string
    {
        try {
            return (string)(DB::selectOne('SELECT DATABASE() AS db')->db ?? '');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
