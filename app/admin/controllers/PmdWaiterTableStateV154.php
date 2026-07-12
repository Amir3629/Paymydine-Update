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

                $storedOld = $this->normalizeTableState($row->operational_status ?? 'available');
                $effectiveOld = $storedOld;
                $derivedOccupied = false;
                $activeOrders = $this->activeOrdersForTable($tableId);

                // Existing tables receive the migration default "available".
                // During compatibility rollout, an order created after the last
                // explicit table update still means the effective state is occupied.
                // An explicit waiter release remains authoritative for older open
                // bills, so payment collection never re-occupies a released table.
                if ($storedOld === 'available' && $this->shouldDeriveOccupied($row, $activeOrders)) {
                    $effectiveOld = 'occupied';
                    $derivedOccupied = true;
                }

                if ($effectiveOld === $next) {
                    return [
                        'ok' => true,
                        'changed' => false,
                        'table_id' => $tableId,
                        'status' => $next,
                        'status_label' => self::TABLE_STATES[$next]['label'],
                    ];
                }

                $allowed = self::TRANSITIONS[$effectiveOld] ?? [];
                if ($effectiveOld !== $next && !in_array($next, $allowed, true)) {
                    return [
                        'ok' => false,
                        'http_status' => 409,
                        'message' => 'Invalid table transition: '.$effectiveOld.' → '.$next,
                        'allowed' => $allowed,
                    ];
                }

                if ($effectiveOld === 'occupied' && $next === 'available' && !$skipCleaning) {
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
                $this->writeHistory($tableId, $effectiveOld, $next, $reason, null, [
                    'source' => 'waiter_floor_v154',
                    'stored_old_status' => $storedOld,
                    'derived_occupied' => $derivedOccupied,
                    'skip_cleaning' => $skipCleaning,
                ]);

                return [
                    'ok' => true,
                    'changed' => true,
                    'table_id' => $tableId,
                    'old_status' => $effectiveOld,
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
        $activeOrders = array_values((array)($dashboard['sections']['active_orders'] ?? $dashboard['orders'] ?? []));
        $recentOrdersByTable = $this->loadRecentOrdersIncludingPaid($tables);

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

        $activeByTable = [];
        foreach ($activeOrders as $order) {
            $tableId = (int)($order['table_id'] ?? 0);
            $tableNumber = trim((string)($order['table_number'] ?? $order['table_no'] ?? $order['table'] ?? ''));
            $key = $tableId > 0 ? 'id:'.$tableId : 'no:'.strtolower($tableNumber);
            $activeByTable[$key][] = $order;
        }

        $out = [];
        foreach ($tables as $table) {
            $tableId = (int)($table['id'] ?? $table['table_id'] ?? 0);
            $tableNumber = trim((string)($table['number'] ?? $table['table_number'] ?? $table['table_no'] ?? ''));
            $key = $tableId > 0 ? 'id:'.$tableId : 'no:'.strtolower($tableNumber);
            $tableActiveOrders = array_values($activeByTable[$key] ?? []);
            $row = $tableRows[$tableId] ?? [];

            $stored = $this->normalizeTableState($row['operational_status'] ?? 'available');
            $effective = $stored;
            $derived = false;

            if ($stored === 'available' && $this->shouldDeriveOccupied((object)$row, $tableActiveOrders)) {
                $effective = 'occupied';
                $derived = true;
            }

            $displayOrders = $tableActiveOrders;
            if (!$displayOrders && in_array($effective, ['occupied', 'cleaning'], true)) {
                $recent = array_values($recentOrdersByTable[$tableId] ?? []);
                $since = trim((string)($row['operational_status_updated_at'] ?? ''));

                if ($since !== '') {
                    $sinceTs = strtotime($since) ?: 0;
                    $recent = array_values(array_filter($recent, function ($order) use ($sinceTs) {
                        $ts = strtotime((string)($order['created_at'] ?? '')) ?: 0;
                        return $ts >= $sinceTs;
                    }));
                } elseif ($recent) {
                    $recent = [reset($recent)];
                }

                $displayOrders = $recent;
            }

            $payment = $this->paymentSummary($displayOrders);
            $orderState = $this->orderSummary($displayOrders);

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
                'open_order_count' => count($tableActiveOrders),
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

    protected function loadRecentOrdersIncludingPaid(array $tables): array
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

        $statusColumn = $this->firstCol($columns, ['status', 'order_status', 'status_name', 'status_id']);
        $totalColumn = $this->firstCol($columns, ['order_total', 'total', 'total_amount', 'grand_total']);
        $dateColumn = $this->firstCol($columns, ['created_at', 'order_date', 'updated_at']);
        $maps = $this->tableReferenceMaps($tables);
        $statusMap = $this->orderStatusMap();

        $query = DB::table('orders');
        if (in_array('deleted_at', $columns, true)) {
            $query->whereNull('deleted_at');
        }
        $query->orderByDesc($dateColumn ?: $primaryKey);

        $grouped = [];
        foreach ($query->limit(400)->get() as $order) {
            $row = (array)$order;
            $table = $this->resolveOrderTable($row, $tableColumn, $maps);
            if (!$table) {
                continue;
            }

            $tableId = (int)$table['id'];
            $orderId = (int)($row[$primaryKey] ?? 0);
            if ($tableId < 1 || $orderId < 1) {
                continue;
            }

            $grouped[$tableId][] = [
                'id' => $orderId,
                'order_id' => $orderId,
                'table_id' => $tableId,
                'table_number' => (string)$table['number'],
                'status' => $this->resolvedOrderStatus($row, $statusColumn, $statusMap) ?: 'open',
                'payment' => (string)($row['payment'] ?? ''),
                'payment_status' => (string)($row['payment_status'] ?? ''),
                'settlement_status' => strtolower(trim((string)($row['settlement_status'] ?? ''))),
                'settled_amount' => (float)($row['settled_amount'] ?? 0),
                'total' => (float)($totalColumn ? ($row[$totalColumn] ?? 0) : 0),
                'created_at' => (string)($dateColumn ? ($row[$dateColumn] ?? '') : ''),
            ];
        }

        return $grouped;
    }

    protected function activeOrdersForTable(int $tableId): array
    {
        $dashboard = $this->v9CompatiblePayload();
        $orders = array_values((array)($dashboard['sections']['active_orders'] ?? $dashboard['orders'] ?? []));

        return array_values(array_filter($orders, function ($order) use ($tableId) {
            return (int)($order['table_id'] ?? 0) === $tableId;
        }));
    }

    /**
     * Compatibility rule for tables that received the migration default.
     *
     * With no manual operational timestamp, an open order derives Occupied.
     * Once a waiter explicitly releases the table, only an order created after
     * that release may derive Occupied again. Waiter POS also writes Occupied
     * directly for every new/updated order when the migration is installed.
     */
    protected function shouldDeriveOccupied($tableRow, array $orders): bool
    {
        if (!$orders) {
            return false;
        }

        $row = (array)$tableRow;
        $updatedAt = strtotime((string)($row['operational_status_updated_at'] ?? '')) ?: 0;
        if ($updatedAt < 1) {
            return true;
        }

        foreach ($orders as $order) {
            $orderTime = strtotime((string)($order['created_at'] ?? $order['order_date'] ?? '')) ?: 0;
            // The database timestamps are second-precision. Equality must keep
            // the explicit waiter release authoritative; Waiter POS writes the
            // Occupied state directly when a genuinely new order is placed.
            if ($orderTime > $updatedAt) {
                return true;
            }
        }

        return false;
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
            $raw = strtolower(trim(implode(' ', [
                (string)($order['settlement_status'] ?? ''),
                (string)($order['payment_status'] ?? ''),
                (string)($order['payment'] ?? ''),
                (string)($order['status'] ?? ''),
            ])));

            $isRefunded = (bool)preg_match('/refund|reversed|chargeback/', $raw);
            $isPaid = !$isRefunded && (bool)preg_match('/\bpaid\b|settled|payment complete|fully paid|completed/', $raw);

            if ($isPaid && $orderTotal > 0 && $orderSettled + 0.005 < $orderTotal) {
                $orderSettled = $orderTotal;
            }

            $total += $orderTotal;
            $settled += min($orderSettled, $orderTotal > 0 ? $orderTotal : $orderSettled);

            if ($isRefunded) {
                $hasRefunded = true;
            } elseif (preg_match('/partial|part_paid|partially/', $raw) || ($orderSettled > 0 && $orderSettled + 0.005 < $orderTotal)) {
                $hasPartial = true;
            } elseif (!$isPaid && $orderSettled + 0.005 < $orderTotal) {
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
