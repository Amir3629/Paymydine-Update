<?php

namespace Admin\Controllers\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Independent table lifecycle for waiter POS orders.
 *
 * A new/updated order may occupy a table. Payment never frees a table here.
 * Release happens only through the explicit waiter table-status endpoint.
 */
trait PmdWaiterPosTableStateV154Concern
{
    protected function markTableOccupiedForWaiterOrderV154(array $table, $order): void
    {
        if (!Schema::hasTable('tables') || !Schema::hasColumn('tables', 'operational_status')) {
            return;
        }

        $tableId = (int)($table['id'] ?? 0);
        if ($tableId < 1) {
            return;
        }

        $columns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
        if (!$pk) {
            return;
        }

        $row = DB::table('tables')->where($pk, $tableId)->lockForUpdate()->first();
        if (!$row) {
            return;
        }

        $old = strtolower(trim((string)($row->operational_status ?? 'available')));
        if ($old === 'occupied') {
            return;
        }

        $updates = ['operational_status' => 'occupied'];
        if (in_array('operational_status_updated_at', $columns, true)) {
            $updates['operational_status_updated_at'] = date('Y-m-d H:i:s');
        }
        if (in_array('operational_status_updated_by', $columns, true)) {
            $updates['operational_status_updated_by'] = $this->currentUserId();
        }
        if (in_array('updated_at', $columns, true)) {
            $updates['updated_at'] = date('Y-m-d H:i:s');
        }

        DB::table('tables')->where($pk, $tableId)->update($updates);

        if (Schema::hasTable('pmd_table_status_history')) {
            DB::table('pmd_table_status_history')->insert([
                'table_id' => $tableId,
                'old_status' => $old ?: 'available',
                'new_status' => 'occupied',
                'reason' => 'order_created_or_updated',
                'actor_id' => $this->currentUserId(),
                'order_id' => $order ? (int)$order->getKey() : null,
                'context' => json_encode([
                    'source' => 'waiter_pos_v154',
                    'table_number' => (string)($table['number'] ?? ''),
                ]),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }

    // PMD_CASHIER_MANUAL_TABLE_FREE_R45
    // Staff owns physical table release. Payment only makes a table ELIGIBLE;
    // it never changes operational_status by itself. Releasing a table also
    // closes the old QR table session so the next guests start with clean state.
    // PMD_CASHIER_MANUAL_TABLE_FREE_R45C_CONSOLIDATED
    // Staff owns the physical visit lifecycle. Payment does not free the table.
    // Manual FREE is allowed only when every still-unreleased check is financially
    // closed. Stale QR drafts are closed by this action instead of blocking it.
    // The action is idempotent: an already-available table can still finish its
    // QR/session cleanup and record the visit boundary.
    public function markTableFreeV45($tableId)
    {
        $tableId = (int)$tableId;

        if ($tableId < 1) {
            return response()->json([
                'ok' => false,
                'message' => 'A canonical table id is required.',
            ], 422);
        }

        if (!Schema::hasTable('tables') || !Schema::hasTable('orders')) {
            return response()->json([
                'ok' => false,
                'message' => 'Table or order storage is unavailable.',
            ], 422);
        }

        $tableColumns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $tableColumns, true)
            ? 'table_id'
            : (in_array('id', $tableColumns, true) ? 'id' : null);

        if (!$pk || !in_array('operational_status', $tableColumns, true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Operational table status is unavailable.',
            ], 422);
        }

        $rawTable = DB::table('tables')->where($pk, $tableId)->first();

        if (!$rawTable) {
            return response()->json([
                'ok' => false,
                'message' => 'Table not found.',
            ], 404);
        }

        $raw = (array)$rawTable;

        $tableNumber = trim((string)(
            $raw['table_no']
            ?? $raw['table_number']
            ?? ''
        ));

        $tableName = trim((string)(
            $raw['table_name']
            ?? $raw['name']
            ?? $raw['label']
            ?? ''
        ));

        $qr = trim((string)(
            $raw['qr']
            ?? $raw['qr_code']
            ?? ''
        ));

        $tableLabel = $tableName !== ''
            ? $tableName
            : 'Table '.($tableNumber !== '' ? $tableNumber : $tableId);

        try {
            $result = DB::transaction(function () use (
                $tableId,
                $tableColumns,
                $pk,
                $tableNumber,
                $tableName,
                $tableLabel,
                $qr
            ) {
                $lockedTable = DB::table('tables')
                    ->where($pk, $tableId)
                    ->lockForUpdate()
                    ->first();

                if (!$lockedTable) {
                    return [
                        'ok' => false,
                        'status' => 404,
                        'message' => 'Table not found.',
                    ];
                }

                $orderColumns = Schema::getColumnListing('orders');

                $orderPk = in_array('order_id', $orderColumns, true)
                    ? 'order_id'
                    : (in_array('id', $orderColumns, true) ? 'id' : null);

                if (!$orderPk) {
                    return [
                        'ok' => false,
                        'status' => 422,
                        'message' => 'Order identity is unavailable.',
                    ];
                }

                // Previous manual-free visits for this physical table are already
                // finished and must not block a later visit that reuses the table.
                $alreadyReleased = [];

                if (Schema::hasTable('pmd_waiter_pos_operation_logs')) {
                    try {
                        $logColumns = Schema::getColumnListing(
                            'pmd_waiter_pos_operation_logs'
                        );

                        if (
                            in_array('order_id', $logColumns, true)
                            && in_array('action', $logColumns, true)
                        ) {
                            foreach (
                                DB::table('pmd_waiter_pos_operation_logs')
                                    ->where('action', 'cashier_table_free')
                                    ->pluck('order_id')
                                as $releasedId
                            ) {
                                $releasedId = (int)$releasedId;

                                if ($releasedId > 0) {
                                    $alreadyReleased[$releasedId] = true;
                                }
                            }
                        }
                    } catch (\Throwable $ignored) {
                    }
                }

                $ordersQuery = DB::table('orders');

                if (in_array('deleted_at', $orderColumns, true)) {
                    $ordersQuery->whereNull('deleted_at');
                }

                $ordersQuery->where(function ($query) use (
                    $orderColumns,
                    $tableId,
                    $tableNumber,
                    $tableName,
                    $tableLabel
                ) {
                    $added = false;

                    foreach (
                        ['table_id', 'dining_table_id', 'location_table_id']
                        as $column
                    ) {
                        if (!in_array($column, $orderColumns, true)) {
                            continue;
                        }

                        if (!$added) {
                            $query->where($column, $tableId);
                            $added = true;
                        } else {
                            $query->orWhere($column, $tableId);
                        }
                    }

                    if (in_array('order_type', $orderColumns, true)) {
                        $values = array_values(array_unique(array_filter([
                            (string)$tableId,
                            $tableNumber,
                            $tableName,
                            $tableLabel,
                        ], static fn ($value) =>
                            trim((string)$value) !== ''
                        )));

                        foreach ($values as $value) {
                            if (!$added) {
                                $query->where('order_type', $value);
                                $added = true;
                            } else {
                                $query->orWhere('order_type', $value);
                            }
                        }
                    }

                    if (
                        $tableNumber !== ''
                        && in_array('table_no', $orderColumns, true)
                    ) {
                        if (!$added) {
                            $query->where('table_no', $tableNumber);
                            $added = true;
                        } else {
                            $query->orWhere('table_no', $tableNumber);
                        }
                    }

                    if (
                        $tableName !== ''
                        && in_array('table_name', $orderColumns, true)
                    ) {
                        if (!$added) {
                            $query->where('table_name', $tableName);
                            $added = true;
                        } else {
                            $query->orWhere('table_name', $tableName);
                        }
                    }

                    if (!$added) {
                        $query->whereRaw('1 = 0');
                    }
                });

                if ($alreadyReleased) {
                    $ordersQuery->whereNotIn(
                        $orderPk,
                        array_keys($alreadyReleased)
                    );
                }

                $orders = $ordersQuery
                    ->orderByDesc($orderPk)
                    ->limit(500)
                    ->lockForUpdate()
                    ->get();

                $orderIds = [];
                $statusIds = [];

                foreach ($orders as $order) {
                    $orderId = (int)($order->{$orderPk} ?? 0);

                    if ($orderId > 0) {
                        $orderIds[] = $orderId;
                    }

                    $statusId = (int)($order->status_id ?? 0);

                    if ($statusId > 0) {
                        $statusIds[] = $statusId;
                    }
                }

                $statusNames = [];

                if ($statusIds && Schema::hasTable('statuses')) {
                    try {
                        $statusColumns = Schema::getColumnListing('statuses');

                        $statusPk = in_array(
                            'status_id',
                            $statusColumns,
                            true
                        )
                            ? 'status_id'
                            : (
                                in_array('id', $statusColumns, true)
                                    ? 'id'
                                    : null
                            );

                        $statusNameCol = in_array(
                            'status_name',
                            $statusColumns,
                            true
                        )
                            ? 'status_name'
                            : (
                                in_array('name', $statusColumns, true)
                                    ? 'name'
                                    : null
                            );

                        if ($statusPk && $statusNameCol) {
                            foreach (
                                DB::table('statuses')
                                    ->whereIn(
                                        $statusPk,
                                        array_values(
                                            array_unique($statusIds)
                                        )
                                    )
                                    ->get([$statusPk, $statusNameCol])
                                as $statusRow
                            ) {
                                $statusNames[
                                    (int)$statusRow->{$statusPk}
                                ] = strtolower(
                                    trim(
                                        (string)$statusRow->{$statusNameCol}
                                    )
                                );
                            }
                        }
                    } catch (\Throwable $ignored) {
                    }
                }

                // A payment transaction can be the stronger financial truth if
                // a legacy order row did not receive the final settled_amount.
                $transactionPaid = [];

                if (
                    $orderIds
                    && Schema::hasTable('order_payment_transactions')
                ) {
                    try {
                        $txColumns = Schema::getColumnListing(
                            'order_payment_transactions'
                        );

                        if (
                            in_array('order_id', $txColumns, true)
                            && in_array('amount', $txColumns, true)
                        ) {
                            $txQuery = DB::table(
                                'order_payment_transactions'
                            )
                                ->whereIn(
                                    'order_id',
                                    array_values(
                                        array_unique($orderIds)
                                    )
                                );

                            if (
                                in_array(
                                    'settlement_status',
                                    $txColumns,
                                    true
                                )
                            ) {
                                $txQuery->whereNotIn(
                                    'settlement_status',
                                    [
                                        'failed',
                                        'cancelled',
                                        'canceled',
                                        'refunded',
                                        'refund',
                                        'void',
                                        'voided',
                                    ]
                                );
                            }

                            foreach (
                                $txQuery
                                    ->selectRaw(
                                        'order_id, SUM(amount) AS paid_amount'
                                    )
                                    ->groupBy('order_id')
                                    ->get()
                                as $txRow
                            ) {
                                $transactionPaid[
                                    (int)$txRow->order_id
                                ] = (float)($txRow->paid_amount ?? 0);
                            }
                        }
                    } catch (\Throwable $ignored) {
                    }
                }

                $blocking = [];
                $releasedOrderIds = [];

                foreach ($orders as $order) {
                    $orderId = (int)($order->{$orderPk} ?? 0);

                    if ($orderId < 1) {
                        continue;
                    }

                    $total = max(
                        0.0,
                        (float)($order->order_total ?? 0)
                    );

                    $settled = max(
                        0.0,
                        (float)($order->settled_amount ?? 0)
                    );

                    $txPaid = max(
                        0.0,
                        (float)($transactionPaid[$orderId] ?? 0)
                    );

                    $effectivePaid = max($settled, $txPaid);

                    $settlement = strtolower(
                        trim(
                            (string)(
                                $order->settlement_status
                                ?? ''
                            )
                        )
                    );

                    $statusName = $statusNames[
                        (int)($order->status_id ?? 0)
                    ] ?? '';

                    $cancelled =
                        preg_match(
                            '/cancel|void|failed|declin|reject|refund/',
                            $settlement.' '.$statusName
                        ) === 1;

                    $fullyPaid =
                        $cancelled
                        || in_array(
                            $settlement,
                            ['paid', 'settled'],
                            true
                        )
                        || $total <= 0.009
                        || $effectivePaid >= $total - 0.009;

                    if (!$fullyPaid) {
                        $blocking[] = [
                            'order_id' => $orderId,
                            'total' => round($total, 2),
                            'paid' => round($effectivePaid, 2),
                            'due' => round(
                                max(0, $total - $effectivePaid),
                                2
                            ),
                            'settlement_status' =>
                                $settlement ?: 'unpaid',
                        ];
                        continue;
                    }

                    $releasedOrderIds[] = $orderId;
                }

                if ($blocking) {
                    return [
                        'ok' => false,
                        'status' => 422,
                        'message' =>
                            $tableLabel
                            .' still has unpaid or part-paid checks. '
                            .'Finish payment before setting the table free.',
                        'blocking_orders' => $blocking,
                    ];
                }

                // Explicit staff FREE ends the physical visit. Any stale QR
                // draft/submitted round from this visit must not leak to the
                // next guest who scans the same table QR code.
                $closedDrafts = 0;

                if (Schema::hasTable('pmd_table_order_drafts')) {
                    $draftColumns = Schema::getColumnListing(
                        'pmd_table_order_drafts'
                    );

                    if (in_array('id', $draftColumns, true)) {
                        $draftQuery = DB::table(
                            'pmd_table_order_drafts'
                        )->where(function ($query) use (
                            $draftColumns,
                            $tableId,
                            $tableNumber,
                            $tableName,
                            $qr
                        ) {
                            $added = false;

                            if (
                                in_array(
                                    'table_id',
                                    $draftColumns,
                                    true
                                )
                            ) {
                                $query->where(
                                    'table_id',
                                    (string)$tableId
                                );
                                $added = true;

                                if (
                                    $tableNumber !== ''
                                    && $tableNumber !==
                                        (string)$tableId
                                ) {
                                    $query->orWhere(
                                        'table_id',
                                        $tableNumber
                                    );
                                }
                            }

                            if (
                                $tableNumber !== ''
                                && in_array(
                                    'table_no',
                                    $draftColumns,
                                    true
                                )
                            ) {
                                if (!$added) {
                                    $query->where(
                                        'table_no',
                                        $tableNumber
                                    );
                                    $added = true;
                                } else {
                                    $query->orWhere(
                                        'table_no',
                                        $tableNumber
                                    );
                                }
                            }

                            if (
                                $tableName !== ''
                                && in_array(
                                    'table_name',
                                    $draftColumns,
                                    true
                                )
                            ) {
                                if (!$added) {
                                    $query->where(
                                        'table_name',
                                        $tableName
                                    );
                                    $added = true;
                                } else {
                                    $query->orWhere(
                                        'table_name',
                                        $tableName
                                    );
                                }
                            }

                            if (
                                $qr !== ''
                                && in_array(
                                    'qr',
                                    $draftColumns,
                                    true
                                )
                            ) {
                                if (!$added) {
                                    $query->where('qr', $qr);
                                    $added = true;
                                } else {
                                    $query->orWhere('qr', $qr);
                                }
                            }

                            if (!$added) {
                                $query->whereRaw('1 = 0');
                            }
                        });

                        if (
                            in_array('status', $draftColumns, true)
                        ) {
                            $draftQuery->whereIn(
                                'status',
                                ['draft', 'submitted']
                            );
                        }

                        $draftIds = $draftQuery
                            ->pluck('id')
                            ->map(static fn ($id) => (int)$id)
                            ->filter(static fn ($id) => $id > 0)
                            ->values()
                            ->all();

                        if ($draftIds) {
                            $draftUpdate = [];

                            if (
                                in_array(
                                    'status',
                                    $draftColumns,
                                    true
                                )
                            ) {
                                $draftUpdate['status'] = 'closed';
                            }

                            if (
                                in_array(
                                    'closed_at',
                                    $draftColumns,
                                    true
                                )
                            ) {
                                $draftUpdate['closed_at'] = now();
                            }

                            if (
                                in_array(
                                    'updated_at',
                                    $draftColumns,
                                    true
                                )
                            ) {
                                $draftUpdate['updated_at'] = now();
                            }

                            if ($draftUpdate) {
                                $closedDrafts = DB::table(
                                    'pmd_table_order_drafts'
                                )
                                    ->whereIn('id', $draftIds)
                                    ->update($draftUpdate);
                            }
                        }
                    }
                }

                $lockedRaw = (array)$lockedTable;

                $oldStatus = strtolower(
                    trim(
                        (string)(
                            $lockedRaw['operational_status']
                            ?? 'available'
                        )
                    )
                );

                $tableUpdate = [
                    'operational_status' => 'available',
                ];

                if (
                    in_array(
                        'operational_status_updated_at',
                        $tableColumns,
                        true
                    )
                ) {
                    $tableUpdate[
                        'operational_status_updated_at'
                    ] = now();
                }

                if (
                    in_array(
                        'operational_status_updated_by',
                        $tableColumns,
                        true
                    )
                ) {
                    $tableUpdate[
                        'operational_status_updated_by'
                    ] = $this->currentUserId();
                }

                if (in_array('updated_at', $tableColumns, true)) {
                    $tableUpdate['updated_at'] = now();
                }

                DB::table('tables')
                    ->where($pk, $tableId)
                    ->update($tableUpdate);

                $releasedOrderIds = array_values(
                    array_unique(
                        array_filter(
                            array_map(
                                'intval',
                                $releasedOrderIds
                            ),
                            static fn ($id) => $id > 0
                        )
                    )
                );

                // Durable visit boundary, reusing an existing audit table.
                // No schema change is introduced.
                if (
                    $releasedOrderIds
                    && Schema::hasTable(
                        'pmd_waiter_pos_operation_logs'
                    )
                ) {
                    $logColumns = Schema::getColumnListing(
                        'pmd_waiter_pos_operation_logs'
                    );

                    if (
                        in_array(
                            'order_id',
                            $logColumns,
                            true
                        )
                        && in_array(
                            'action',
                            $logColumns,
                            true
                        )
                    ) {
                        foreach ($releasedOrderIds as $orderId) {
                            $exists = DB::table(
                                'pmd_waiter_pos_operation_logs'
                            )
                                ->where('order_id', $orderId)
                                ->where(
                                    'action',
                                    'cashier_table_free'
                                )
                                ->exists();

                            if ($exists) {
                                continue;
                            }

                            $log = [
                                'order_id' => $orderId,
                                'action' => 'cashier_table_free',
                            ];

                            if (
                                in_array(
                                    'payload',
                                    $logColumns,
                                    true
                                )
                            ) {
                                $log['payload'] = json_encode([
                                    'source' => 'cashierlab',
                                    'table_id' => $tableId,
                                    'table_no' => $tableNumber,
                                    'table_name' => $tableLabel,
                                    'previous_operational_status' =>
                                        $oldStatus,
                                    'closed_qr_drafts' =>
                                        $closedDrafts,
                                ], JSON_UNESCAPED_UNICODE |
                                   JSON_UNESCAPED_SLASHES);
                            }

                            if (
                                in_array(
                                    'actor_id',
                                    $logColumns,
                                    true
                                )
                            ) {
                                $log['actor_id'] =
                                    $this->currentUserId();
                            }

                            if (
                                in_array(
                                    'created_at',
                                    $logColumns,
                                    true
                                )
                            ) {
                                $log['created_at'] = now();
                            }

                            if (
                                in_array(
                                    'updated_at',
                                    $logColumns,
                                    true
                                )
                            ) {
                                $log['updated_at'] = now();
                            }

                            DB::table(
                                'pmd_waiter_pos_operation_logs'
                            )->insert($log);
                        }
                    }
                }

                if (Schema::hasTable('pmd_table_status_history')) {
                    try {
                        $historyColumns = Schema::getColumnListing(
                            'pmd_table_status_history'
                        );

                        $history = [];
                        $candidateValues = [
                            'table_id' => $tableId,
                            'old_status' =>
                                $oldStatus ?: 'available',
                            'new_status' => 'available',
                            'reason' => 'cashier_manual_free',
                            'actor_id' => $this->currentUserId(),
                            'order_id' => $releasedOrderIds
                                ? max($releasedOrderIds)
                                : null,
                            'context' => json_encode([
                                'source' => 'cashierlab',
                                'table_number' => $tableNumber,
                                'released_order_ids' =>
                                    $releasedOrderIds,
                                'closed_qr_drafts' =>
                                    $closedDrafts,
                            ], JSON_UNESCAPED_UNICODE |
                               JSON_UNESCAPED_SLASHES),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];

                        foreach (
                            $candidateValues
                            as $column => $value
                        ) {
                            if (
                                in_array(
                                    $column,
                                    $historyColumns,
                                    true
                                )
                            ) {
                                $history[$column] = $value;
                            }
                        }

                        if (
                            $history
                            && isset($history['table_id'])
                        ) {
                            DB::table(
                                'pmd_table_status_history'
                            )->insert($history);
                        }
                    } catch (\Throwable $ignored) {
                    }
                }

                return [
                    'ok' => true,
                    'status' => 200,
                    'message' => $tableLabel.' is now free.',
                    'tenant_database' =>
                        DB::connection()->getDatabaseName(),
                    'table_id' => $tableId,
                    'table' => [
                        'id' => $tableId,
                        'table_id' => $tableId,
                        'number' => $tableNumber,
                        'table_no' => $tableNumber,
                        'name' => $tableLabel,
                        'table_name' => $tableLabel,
                        'operational_status' => 'available',
                    ],
                    'released_order_ids' =>
                        $releasedOrderIds,
                    'closed_qr_drafts' => $closedDrafts,
                    'already_available' => in_array(
                        $oldStatus,
                        ['available', 'free'],
                        true
                    ),
                ];
            });

            $status = (int)($result['status'] ?? 200);
            unset($result['status']);

            return response()->json($result, $status);
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'message' =>
                    'Table could not be set free. '
                    .$error->getMessage(),
            ], 500);
        }
    }

}
