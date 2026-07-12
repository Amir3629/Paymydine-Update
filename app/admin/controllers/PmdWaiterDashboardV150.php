<?php

namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Waiter Dashboard V150
 *
 * The tenant orders table does not have a dedicated table_id column. Core and
 * legacy order flows store the table reference in order_type using one of:
 * table primary key, table number, table name, or "Table N". V149 required a
 * physical table column and therefore returned zero order cards. V150 resolves
 * every supported representation without mutating historical orders.
 */
class PmdWaiterDashboardV150 extends PmdWaiterDashboardV149
{
    public function data()
    {
        $payload = $this->payload(false);
        $payload['version'] = '20260712-waiter-dashboard-table-reference-v150';
        $payload['table_reference_mode'] = 'orders.order_type-compatible';

        return $this->json($payload);
    }

    public function audit()
    {
        $payload = $this->payload(true);
        $payload['version'] = '20260712-waiter-dashboard-table-reference-v150';
        $payload['table_reference_mode'] = 'orders.order_type-compatible';

        return $this->json($payload);
    }

    protected function loadTableMetrics($tables)
    {
        $metrics = [];
        foreach ($tables as $table) {
            $metrics[(int)$table['id']] = [
                'open_orders' => 0,
                'ready' => 0,
                'kitchen' => 0,
                'due' => 0,
                'paid_partial' => 0,
                'latest_status' => '',
            ];
        }

        if (!Schema::hasTable('orders') || !$tables) {
            return $metrics;
        }

        $columns = Schema::getColumnListing('orders');
        $primaryKey = $this->firstCol($columns, ['order_id', 'id']);
        $tableColumn = $this->firstCol($columns, [
            'table_id',
            'dining_table_id',
            'location_table_id',
            'table_no',
            'table_name',
            'order_type',
        ]);

        if (!$primaryKey || !$tableColumn) {
            return $metrics;
        }

        $statusColumn = $this->firstCol($columns, [
            'status',
            'order_status',
            'status_name',
            'status_id',
        ]);
        $paymentColumn = $this->firstCol($columns, [
            'payment_status',
            'pay_status',
            'is_paid',
        ]);
        $totalColumn = $this->firstCol($columns, [
            'order_total',
            'total',
            'total_amount',
            'grand_total',
        ]);
        $dateColumn = $this->firstCol($columns, [
            'created_at',
            'order_date',
            'updated_at',
        ]);

        $maps = $this->tableReferenceMaps($tables);
        $statusMap = $this->orderStatusMap();

        $query = DB::table('orders');
        if (in_array('deleted_at', $columns, true)) {
            $query->whereNull('deleted_at');
        }
        if ($dateColumn) {
            $query->orderByDesc($dateColumn);
        } else {
            $query->orderByDesc($primaryKey);
        }

        foreach ($query->limit(800)->get() as $order) {
            $row = (array)$order;
            $table = $this->resolveOrderTable($row, $tableColumn, $maps);
            if (!$table) {
                continue;
            }

            $tableId = (int)$table['id'];
            $status = $this->resolvedOrderStatus($row, $statusColumn, $statusMap);
            $settlement = strtolower(trim((string)($row['settlement_status'] ?? '')));
            $payment = strtolower(trim((string)($paymentColumn ? ($row[$paymentColumn] ?? '') : '')));
            $processed = (int)($row['processed'] ?? 0) === 1;
            $total = (float)($totalColumn ? ($row[$totalColumn] ?? 0) : 0);
            $settled = (float)($row['settled_amount'] ?? 0);

            $closed = $this->orderStatusIsClosed($status, $settlement);
            $paid = in_array($settlement, ['paid', 'settled', 'closed'], true)
                || preg_match('/paid|complete|completed|settled/i', $payment.' '.$status);

            if ($closed && $paid) {
                continue;
            }

            if ($metrics[$tableId]['latest_status'] === '') {
                $metrics[$tableId]['latest_status'] = $status ?: 'open';
            }

            if (!$closed) {
                $metrics[$tableId]['open_orders']++;
            }
            if (preg_match('/ready|serve|served/i', $status)) {
                $metrics[$tableId]['ready']++;
            }
            if (preg_match('/kitchen|prepar|sent|cooking/i', $status)
                || ($processed && preg_match('/received|open|pending/i', $status))) {
                $metrics[$tableId]['kitchen']++;
            }
            if (!$paid && $total > 0) {
                $metrics[$tableId]['due'] += max(0, $total - $settled);
            }
            if ($settlement === 'partial' || preg_match('/partial/i', $payment.' '.$status)) {
                $metrics[$tableId]['paid_partial']++;
            }
        }

        return $metrics;
    }

    protected function loadOrderCards($tables)
    {
        if (!Schema::hasTable('orders') || !$tables) {
            return [];
        }

        $columns = Schema::getColumnListing('orders');
        $primaryKey = $this->firstCol($columns, ['order_id', 'id']);
        $tableColumn = $this->firstCol($columns, [
            'table_id',
            'dining_table_id',
            'location_table_id',
            'table_no',
            'table_name',
            'order_type',
        ]);

        if (!$primaryKey || !$tableColumn) {
            return [];
        }

        $statusColumn = $this->firstCol($columns, [
            'status',
            'order_status',
            'status_name',
            'status_id',
        ]);
        $totalColumn = $this->firstCol($columns, [
            'order_total',
            'total',
            'total_amount',
            'grand_total',
        ]);
        $dateColumn = $this->firstCol($columns, [
            'created_at',
            'order_date',
            'updated_at',
        ]);

        $maps = $this->tableReferenceMaps($tables);
        $statusMap = $this->orderStatusMap();

        $query = DB::table('orders');
        if (in_array('deleted_at', $columns, true)) {
            $query->whereNull('deleted_at');
        }
        if ($dateColumn) {
            $query->orderByDesc($dateColumn);
        } else {
            $query->orderByDesc($primaryKey);
        }

        $rows = [];
        foreach ($query->limit(160)->get() as $order) {
            $row = (array)$order;
            $table = $this->resolveOrderTable($row, $tableColumn, $maps);
            if (!$table) {
                continue;
            }

            $status = $this->resolvedOrderStatus($row, $statusColumn, $statusMap);
            $settlement = strtolower(trim((string)($row['settlement_status'] ?? '')));
            if ($this->orderStatusIsClosed($status, $settlement)) {
                continue;
            }

            $orderId = (int)($row[$primaryKey] ?? 0);
            if ($orderId < 1) {
                continue;
            }

            $total = (float)($totalColumn ? ($row[$totalColumn] ?? 0) : 0);
            $rows[] = [
                'id' => $orderId,
                'order_id' => $orderId,
                'table_id' => (int)$table['id'],
                'table_number' => (string)$table['number'],
                'table_label' => (string)$table['label'],
                'status' => $status ?: 'open',
                'status_id' => isset($row['status_id']) ? (int)$row['status_id'] : null,
                'processed' => (int)($row['processed'] ?? 0),
                'payment' => (string)($row['payment'] ?? ''),
                'settlement_status' => $settlement ?: 'unpaid',
                'settled_amount' => (float)($row['settled_amount'] ?? 0),
                'total_items' => (int)($row['total_items'] ?? 0),
                'total' => $total,
                'total_label' => $this->money($total),
                'comment' => (string)($row['comment'] ?? ''),
                'edit_url' => '/admin/orders/edit/'.$orderId,
                'payment_url' => '/admin/payments?order_id='.$orderId,
                'created_at' => (string)($dateColumn ? ($row[$dateColumn] ?? '') : ''),
                'order_type_raw' => (string)($row['order_type'] ?? ''),
                'table_reference_source' => $table['_reference_source'] ?? $tableColumn,
            ];

            if (count($rows) >= 60) {
                break;
            }
        }

        $this->attachOrderItems($rows);

        return $rows;
    }

    protected function attachOrderItems(array &$orders): void
    {
        if (!$orders || !Schema::hasTable('order_menus')) {
            return;
        }

        $orderIds = array_values(array_filter(array_map(function ($order) {
            return (int)($order['order_id'] ?? 0);
        }, $orders)));

        if (!$orderIds) {
            return;
        }

        $grouped = [];
        foreach (DB::table('order_menus')->whereIn('order_id', $orderIds)->orderBy('order_menu_id')->get() as $item) {
            $row = (array)$item;
            $orderId = (int)($row['order_id'] ?? 0);
            if (!$orderId) {
                continue;
            }
            $grouped[$orderId][] = [
                'order_menu_id' => (int)($row['order_menu_id'] ?? 0),
                'menu_id' => (int)($row['menu_id'] ?? 0),
                'name' => (string)($row['name'] ?? 'Item'),
                'quantity' => (float)($row['quantity'] ?? 1),
                'price' => (float)($row['price'] ?? 0),
                'subtotal' => (float)($row['subtotal'] ?? 0),
                'comment' => trim((string)($row['comment'] ?? '')),
            ];
        }

        foreach ($orders as &$order) {
            $orderId = (int)($order['order_id'] ?? 0);
            $order['items'] = $grouped[$orderId] ?? [];
            $order['item_notes'] = array_values(array_filter(array_map(function ($item) {
                if (($item['comment'] ?? '') === '') {
                    return null;
                }
                return [
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'comment' => $item['comment'],
                ];
            }, $order['items'])));
        }
        unset($order);
    }

    protected function tableReferenceMaps(array $tables): array
    {
        $maps = [
            'id' => [],
            'number' => [],
            'label' => [],
        ];

        foreach ($tables as $table) {
            $id = trim((string)($table['id'] ?? ''));
            $number = trim((string)($table['number'] ?? ''));
            $label = trim((string)($table['label'] ?? $table['name'] ?? ''));

            if ($id !== '') {
                $maps['id'][$this->normaliseTableReference($id)] = $table;
            }
            if ($number !== '') {
                $maps['number'][$this->normaliseTableReference($number)] = $table;
                $maps['label'][$this->normaliseTableReference('Table '.$number)] = $table;
            }
            if ($label !== '') {
                $maps['label'][$this->normaliseTableReference($label)] = $table;
            }
        }

        return $maps;
    }

    protected function resolveOrderTable(array $order, ?string $tableColumn, array $maps): ?array
    {
        $candidates = [];

        foreach (array_unique(array_filter([
            $tableColumn,
            'table_id',
            'dining_table_id',
            'location_table_id',
            'table_no',
            'table_name',
            'order_type',
        ])) as $column) {
            if (!array_key_exists($column, $order)) {
                continue;
            }
            $value = trim((string)$order[$column]);
            if ($value !== '') {
                $candidates[] = ['source' => $column, 'value' => $value];
            }
        }

        $comment = (string)($order['comment'] ?? '');
        if (preg_match('/Table\s*ID\s*:\s*([^|]+)/i', $comment, $match)) {
            $candidates[] = ['source' => 'comment_table_id', 'value' => trim($match[1])];
        }
        if (preg_match('/(?:^|\|)\s*Table\s*:\s*([^|]+)/i', $comment, $match)) {
            $candidates[] = ['source' => 'comment_table_name', 'value' => trim($match[1])];
        }

        foreach ($candidates as $candidate) {
            $key = $this->normaliseTableReference($candidate['value']);
            if ($key === '') {
                continue;
            }

            $source = $candidate['source'];
            $table = null;

            if (in_array($source, ['table_id', 'dining_table_id', 'location_table_id', 'comment_table_id'], true)) {
                $table = $maps['id'][$key] ?? $maps['number'][$key] ?? $maps['label'][$key] ?? null;
            } elseif ($source === 'table_no') {
                $table = $maps['number'][$key] ?? $maps['label'][$key] ?? $maps['id'][$key] ?? null;
            } elseif ($source === 'order_type' && ctype_digit($key)) {
                // Core PMD/TastyIgniter table orders store the table primary key in order_type.
                $table = $maps['id'][$key] ?? $maps['number'][$key] ?? null;
            } else {
                $table = $maps['label'][$key] ?? $maps['number'][$key] ?? $maps['id'][$key] ?? null;
            }

            if (!$table && preg_match('/(?:table\s*)?#?\s*(\d+)$/i', $candidate['value'], $match)) {
                $numberKey = $this->normaliseTableReference($match[1]);
                $table = $maps['number'][$numberKey] ?? null;
            }

            if ($table) {
                $table['_reference_source'] = $source;
                return $table;
            }
        }

        return null;
    }

    protected function normaliseTableReference($value): string
    {
        $value = html_entity_decode((string)$value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $value = preg_replace('/\x{00A0}/u', ' ', $value);
        $value = strtolower(trim(preg_replace('/\s+/u', ' ', $value)));
        $value = trim($value, " \t\n\r\0\x0B#");

        return $value;
    }

    protected function orderStatusMap(): array
    {
        if (!Schema::hasTable('statuses')) {
            return [];
        }

        $columns = Schema::getColumnListing('statuses');
        $idColumn = $this->firstCol($columns, ['status_id', 'id']);
        $nameColumn = $this->firstCol($columns, ['status_name', 'name', 'title']);
        if (!$idColumn || !$nameColumn) {
            return [];
        }

        return DB::table('statuses')->pluck($nameColumn, $idColumn)->mapWithKeys(function ($name, $id) {
            return [(string)$id => strtolower(trim((string)$name))];
        })->all();
    }

    protected function resolvedOrderStatus(array $order, ?string $statusColumn, array $statusMap): string
    {
        if (!$statusColumn) {
            return 'open';
        }

        $raw = trim((string)($order[$statusColumn] ?? ''));
        if ($statusColumn === 'status_id' && isset($statusMap[$raw])) {
            return $statusMap[$raw];
        }

        return strtolower($raw ?: 'open');
    }

    protected function orderStatusIsClosed(string $status, string $settlement): bool
    {
        if (in_array($settlement, ['paid', 'settled', 'closed', 'cancelled', 'canceled', 'failed'], true)) {
            return true;
        }

        return (bool)preg_match('/cancel|void|paid|complete|completed|closed|finished|erledigt/i', $status);
    }
}
