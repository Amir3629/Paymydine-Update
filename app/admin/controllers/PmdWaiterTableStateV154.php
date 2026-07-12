<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Independent restaurant state model for the waiter floor.
 *
 * Order status, payment status and physical table status are separate. A paid
 * bill never makes a table available. Only an explicit waiter/host action can
 * move occupied -> cleaning/available and cleaning -> available.
 */
class PmdWaiterTableStateV154 extends PmdWaiterDashboardV151
{
    private const TABLE_STATES = [
        'available' => ['label' => 'Available', 'color' => 'green'],
        'occupied' => ['label' => 'Occupied', 'color' => 'red'],
        'cleaning' => ['label' => 'Needs Cleaning', 'color' => 'orange'],
        'reserved' => ['label' => 'Reserved', 'color' => 'blue'],
    ];

    private const TRANSITIONS = [
        'available' => ['occupied', 'reserved'],
        'occupied' => ['cleaning', 'available'],
        'cleaning' => ['available', 'occupied'],
        'reserved' => ['occupied', 'available'],
    ];

    public function index()
    {
        try {
            return $this->json($this->statePayload());
        } catch (\Throwable $e) {
            report($e);
            return $this->json([
                'ok' => false,
                'version' => 'waiter-table-state-v154',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function update($tableId = null)
    {
        if (!Schema::hasTable('tables') || !Schema::hasColumn('tables', 'operational_status')) {
            return $this->json([
                'ok' => false,
                'message' => 'Operational table status migration is not installed.',
            ], 409);
        }

        $tableId = (int)$tableId;
        $payload = request()->json()->all() ?: request()->all();
        $next = strtolower(trim((string)($payload['status'] ?? '')));
        $reason = trim((string)($payload['reason'] ?? 'manual_waiter_update'));
        $skipCleaning = filter_var($payload['skip_cleaning'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($tableId < 1 || !isset(self::TABLE_STATES[$next])) {
            return $this->json(['ok' => false, 'message' => 'Valid table and status are required.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($tableId, $next, $reason, $skipCleaning) {
                $columns = Schema::getColumnListing('tables');
                $pk = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
                if (!$pk) {
                    abort(500, 'Table primary key not found.');
                }

                $row = DB::table('tables')->where($pk, $tableId)->lockForUpdate()->first();
                if (!$row) {
                    abort(404, 'Table not found.');
                }

                $old = $this->normalizeTableState($row->operational_status ?? 'available');
                if ($old === $next) {
                    return [
                        'ok' => true,
                        'changed' => false,
                        'table_id' => $tableId,
                        'status' => $next,
                        'status_label' => self::TABLE_STATES[$next]['label'],
                    ];
                }

                $allowed = self::TRANSITIONS[$old] ?? [];
                if (!in_array($next, $allowed, true)) {
                    return [
                        'ok' => false,
                        'http_status' => 409,
                        'message' => 'Invalid table transition: '.$old.' → '.$next,
                        'allowed' => $allowed,
                    ];
                }

                if ($old === 'occupied' && $next === 'available' && !$skipCleaning) {
                    return [
                        'ok' => false,
                        'http_status' => 409,
                        'message' => 'Use Customer Left first, or explicitly confirm Skip Cleaning.',
                    ];
                }

                $updates = ['operational_status' => $next];
                if (in_array('operational_status_updated_at', $columns, true)) {
                    $updates['operational_status_updated_at'] = date('Y-m-d H:i:s');
                }
                if (in_array('operational_status_updated_by', $columns, true)) {
                    $updates['operational_status_updated_by'] = $this->actorId();
                }
                if (in_array('updated_at', $columns, true)) {
                    $updates['updated_at'] = date('Y-m-d H:i:s');
                }

                DB::table('tables')->where($pk, $tableId)->update($updates);
                $this->writeHistory($tableId, $old, $next, $reason, null, [
                    'source' => 'waiter_floor_v154',
                    'skip_cleaning' => $skipCleaning,
                ]);

                return [
                    'ok' => true,
                    'changed' => true,
                    'table_id' => $tableId,
                    'old_status' => $old,
                    'status' => $next,
                    'status_label' => self::TABLE_STATES[$next]['label'],
                ];
            });

            $status = (int)($result['http_status'] ?? 200);
            unset($result['http_status']);

            return $this->json(array_merge(['version' => 'waiter-table-state-v154'], $result), $status);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->json(['ok' => false, 'message' => $e->getMessage()], $e->getStatusCode());
        } catch (\Throwable $e) {
            report($e);
            return $this->json(['ok' => false, 'message' => $e->getMessage()], 500);
        }
    }

    protected function statePayload(): array
    {
        $dashboard = $this->v9CompatiblePayload();
        $tables = array_values((array)($dashboard['sections']['floor_plan']['tables'] ?? $dashboard['tables'] ?? []));
        $orders = array_values((array)($dashboard['sections']['active_orders'] ?? $dashboard['orders'] ?? []));

        $tableRows = [];
        if (Schema::hasTable('tables')) {
            $columns = Schema::getColumnListing('tables');
            $pk = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
            if ($pk) {
                foreach (DB::table('tables')->get() as $row) {
                    $a = (array)$row;
                    $tableRows[(int)$a[$pk]] = $a;
                }
            }
        }

        $ordersByTable = [];
        foreach ($orders as $order) {
            $tableId = (int)($order['table_id'] ?? 0);
            $tableNumber = trim((string)($order['table_number'] ?? $order['table_no'] ?? $order['table'] ?? ''));
            $key = $tableId > 0 ? 'id:'.$tableId : 'no:'.strtolower($tableNumber);
            $ordersByTable[$key][] = $order;
        }

        $out = [];
        foreach ($tables as $table) {
            $tableId = (int)($table['id'] ?? $table['table_id'] ?? 0);
            $tableNumber = trim((string)($table['number'] ?? $table['table_number'] ?? $table['table_no'] ?? ''));
            $key = $tableId > 0 ? 'id:'.$tableId : 'no:'.strtolower($tableNumber);
            $tableOrders = array_values($ordersByTable[$key] ?? []);
            $row = $tableRows[$tableId] ?? [];

            $stored = $this->normalizeTableState($row['operational_status'] ?? 'available');
            $effective = $stored;
            $derived = false;

            // Safe compatibility for tables that existed before the migration:
            // an open order means occupied, but payment still cannot free it.
            if ($stored === 'available' && count($tableOrders) > 0) {
                $effective = 'occupied';
                $derived = true;
            }

            $payment = $this->paymentSummary($tableOrders);
            $orderState = $this->orderSummary($tableOrders);

            $out[] = [
                'table_id' => $tableId,
                'table_number' => $tableNumber,
                'table_label' => (string)($table['label'] ?? $table['table_label'] ?? $table['name'] ?? ('Table '.$tableNumber)),
                'table_status' => $effective,
                'table_status_label' => self::TABLE_STATES[$effective]['label'],
                'table_status_color' => self::TABLE_STATES[$effective]['color'],
                'stored_table_status' => $stored,
                'table_status_derived_from_open_order' => $derived,
                'order_status' => $orderState['status'],
                'order_status_label' => $orderState['label'],
                'latest_order_id' => $orderState['latest_order_id'],
                'open_order_count' => count($tableOrders),
                'payment_status' => $payment['status'],
                'payment_status_label' => $payment['label'],
                'order_total' => $payment['total'],
                'settled_amount' => $payment['settled'],
                'amount_due' => $payment['due'],
                'amount_due_label' => $this->money($payment['due']),
                'payment_is_independent' => true,
                'available_transitions' => self::TRANSITIONS[$effective] ?? [],
                'updated_at' => $row['operational_status_updated_at'] ?? null,
            ];
        }

        return [
            'ok' => true,
            'version' => 'waiter-table-state-v154-independent-lifecycles',
            'generated_at' => date('c'),
            'rules' => [
                'payment_does_not_release_table' => true,
                'new_order_occupies_table' => true,
                'occupied_to_cleaning_requires_customer_left' => true,
                'cleaning_to_available_requires_confirmation' => true,
            ],
            'states' => self::TABLE_STATES,
            'tables' => $out,
        ];
    }

    protected function normalizeTableState($status): string
    {
        $status = strtolower(trim((string)$status));
        return isset(self::TABLE_STATES[$status]) ? $status : 'available';
    }

    protected function orderSummary(array $orders): array
    {
        if (!$orders) {
            return ['status' => 'none', 'label' => 'No active order', 'latest_order_id' => null];
        }

        usort($orders, function ($a, $b) {
            return (int)($b['order_id'] ?? $b['id'] ?? 0) <=> (int)($a['order_id'] ?? $a['id'] ?? 0);
        });

        $latest = $orders[0];
        $status = trim((string)($latest['status'] ?? $latest['status_label'] ?? 'Received'));

        return [
            'status' => strtolower(preg_replace('/[^a-z0-9]+/i', '_', $status)),
            'label' => $status ?: 'Received',
            'latest_order_id' => (int)($latest['order_id'] ?? $latest['id'] ?? 0) ?: null,
        ];
    }

    protected function paymentSummary(array $orders): array
    {
        if (!$orders) {
            return ['status' => 'none', 'label' => 'No bill', 'total' => 0.0, 'settled' => 0.0, 'due' => 0.0];
        }

        $total = 0.0;
        $settled = 0.0;
        $hasUnpaid = false;
        $hasPartial = false;
        $hasRefunded = false;

        foreach ($orders as $order) {
            $orderTotal = max(0, (float)($order['total'] ?? $order['order_total'] ?? 0));
            $orderSettled = max(0, (float)($order['settled_amount'] ?? 0));
            $raw = strtolower(trim((string)($order['settlement_status'] ?? $order['payment_status'] ?? '')));

            $total += $orderTotal;
            $settled += min($orderSettled, $orderTotal > 0 ? $orderTotal : $orderSettled);

            if (preg_match('/refund|reversed|chargeback/', $raw)) {
                $hasRefunded = true;
            } elseif (preg_match('/partial|part_paid/', $raw) || ($orderSettled > 0 && $orderSettled + 0.005 < $orderTotal)) {
                $hasPartial = true;
            } elseif (!preg_match('/paid|settled|closed/', $raw) && $orderSettled + 0.005 < $orderTotal) {
                $hasUnpaid = true;
            }
        }

        $due = max(0, $total - $settled);
        if ($hasRefunded) return ['status' => 'refunded', 'label' => 'Refunded', 'total' => $total, 'settled' => $settled, 'due' => $due];
        if ($hasUnpaid) return ['status' => 'unpaid', 'label' => 'Unpaid', 'total' => $total, 'settled' => $settled, 'due' => $due];
        if ($hasPartial || ($settled > 0 && $due > 0.005)) return ['status' => 'partial', 'label' => 'Partial Paid', 'total' => $total, 'settled' => $settled, 'due' => $due];
        if ($total > 0 && $due <= 0.005) return ['status' => 'paid', 'label' => 'Paid', 'total' => $total, 'settled' => $settled, 'due' => 0.0];

        return ['status' => 'unpaid', 'label' => 'Unpaid', 'total' => $total, 'settled' => $settled, 'due' => $due];
    }

    protected function actorId(): ?int
    {
        try {
            $user = AdminAuth::getUser();
            return $user ? (int)$user->getKey() : null;
        } catch (\Throwable $ignored) {
            return null;
        }
    }

    protected function writeHistory(int $tableId, string $old, string $new, string $reason, ?int $orderId, array $context): void
    {
        if (!Schema::hasTable('pmd_table_status_history')) {
            return;
        }

        DB::table('pmd_table_status_history')->insert([
            'table_id' => $tableId,
            'old_status' => $old,
            'new_status' => $new,
            'reason' => substr($reason ?: 'manual_waiter_update', 0, 100),
            'actor_id' => $this->actorId(),
            'order_id' => $orderId,
            'context' => json_encode($context),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
