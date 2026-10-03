<?php

namespace Admin\Controllers\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Safe V1.2 compatibility layer for the V2.2 waiter operations routes.
 *
 * The original V2.2 route file is already registered in production, but the
 * deployed POS controller did not include its action methods. This concern
 * restores a read-only operational summary and returns explicit JSON for the
 * remaining write endpoints instead of allowing Laravel to throw a fatal 500.
 */
trait PmdWaiterPosOperationsSummaryV12Concern
{
    public function operationsSummaryV22($orderId)
    {
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        $items = [];
        if (Schema::hasTable('order_menus')) {
            $items = DB::table('order_menus')
                ->where('order_id', (int)$order->getKey())
                ->orderBy('order_menu_id')
                ->get()
                ->map(function ($row) {
                    $row = (array)$row;
                    return [
                        'order_menu_id' => (int)($row['order_menu_id'] ?? 0),
                        'menu_id' => (int)($row['menu_id'] ?? 0),
                        'name' => (string)($row['name'] ?? 'Item'),
                        'quantity' => (float)($row['quantity'] ?? 1),
                        'subtotal' => (float)($row['subtotal'] ?? 0),
                        'comment' => (string)($row['comment'] ?? ''),
                    ];
                })
                ->values()
                ->all();
        }

        // PMD_CASHIER_ORDER_CENTER_DETAIL_ENRICH_R37C
        // Read-only enrichment for the existing operational summary.
        $statusName = '';

        if (Schema::hasTable('statuses') && !empty($order->status_id)) {
            try {
                $statusName = (string)(
                    DB::table('statuses')
                        ->where('status_id', (int)$order->status_id)
                        ->value('status_name') ?: ''
                );
            } catch (\Throwable $ignored) {
                $statusName = '';
            }
        }

        $totals = [];

        if (Schema::hasTable('order_totals')) {
            try {
                $totalColumns = Schema::getColumnListing('order_totals');

                $totalQuery = DB::table('order_totals')
                    ->where('order_id', (int)$order->getKey());

                if (in_array('priority', $totalColumns, true)) {
                    $totalQuery->orderBy('priority');
                }

                $totals = $totalQuery
                    ->get()
                    ->map(function ($row) {
                        $row = (array)$row;

                        return [
                            'code' => (string)($row['code'] ?? ''),
                            'title' => (string)(
                                $row['title']
                                ?? $row['code']
                                ?? 'Total'
                            ),
                            'value' => (float)($row['value'] ?? 0),
                            'priority' => (int)($row['priority'] ?? 0),
                            'is_summable' => (int)(
                                $row['is_summable'] ?? 0
                            ),
                        ];
                    })
                    ->values()
                    ->all();
            } catch (\Throwable $ignored) {
                $totals = [];
            }
        }

        $tableId = (int)($order->table_id ?? 0);
        $table = null;
        if ($tableId > 0 && Schema::hasTable('tables')) {
            $columns = Schema::getColumnListing('tables');
            $primary = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
            if ($primary) {
                $table = (array)(DB::table('tables')->where($primary, $tableId)->first() ?: []);
            }
        }

        // PMD_CASHIER_SAFE_ITEM_MUTATION_R39
        // One authority decides whether an existing bill can still mutate.
        $itemMutation = $this->pmdR39ItemMutationState($order);

        return response()->json([
            'ok' => true,
            'version' => 'pmd-waiter-pos-v2.2-compat-r39',
            'order' => [
                'order_id' => (int)$order->getKey(),
                'status_id' => $order->status_id ?? null,
                'status_name' => $statusName,
                'settlement_status' => (string)($order->settlement_status ?? $order->payment_status ?? 'unpaid'),
                'order_total' => (float)($order->order_total ?? $order->total ?? 0),
                'settled_amount' => (float)($order->settled_amount ?? 0),
                'comment' => (string)($order->comment ?? ''),
                'updated_at' => (string)($order->updated_at ?? ''),
            ],
            'table' => [
                'id' => $tableId ?: null,
                'number' => (string)($table['table_no'] ?? $table['table_number'] ?? $tableId ?: ''),
                'name' => (string)($table['table_name'] ?? $table['name'] ?? ($tableId ? 'Table '.$tableId : '')),
            ],
            'items' => $items,
            'totals' => $totals,
            'item_mutation' => $itemMutation,
            'capabilities' => [
                'transfer' => false,
                'merge' => false,
                'move_items' => false,
                'item_service' => false,
                'void_item' => (bool)$itemMutation['allowed'],
                'void_order' => (bool)$itemMutation['allowed'],
                'reopen' => false,
                'print_links' => true,
            ],
        ]);
    }

    public function transferOrderV22($orderId) { return $this->operationsUnavailableV12('transfer', $orderId); }
    public function mergeOrdersV22($orderId) { return $this->operationsUnavailableV12('merge', $orderId); }
    public function moveItemsV22($orderId) { return $this->operationsUnavailableV12('move-items', $orderId); }
    public function itemServiceV22($orderId) { return $this->operationsUnavailableV12('item-service', $orderId); }
    public function voidItemV22($orderId)
    {
        $payload = $this->requestPayload();

        $itemId = (int)($payload['order_menu_id'] ?? 0);
        $quantity = (int)($payload['quantity'] ?? 0);
        $reason = trim((string)($payload['reason'] ?? ''));

        if ($itemId < 1 || $quantity < 1 || $reason === '') {
            return response()->json([
                'ok' => false,
                'version' => 'pmd-cashier-r39',
                'message' => 'Choose an item, quantity and removal reason.',
            ], 422);
        }

        $reason = function_exists('mb_substr')
            ? mb_substr($reason, 0, 190)
            : substr($reason, 0, 190);

        try {
            $result = DB::transaction(function () use (
                $orderId,
                $itemId,
                $quantity,
                $reason,
                $payload
            ) {
                $order = \Admin\Models\Orders_model::query()
                    ->where('order_id', (int)$orderId)
                    ->lockForUpdate()
                    ->first();

                if (!$order) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'order' => 'Order not found.',
                    ]);
                }

                /*
                 * Financial lock is checked AFTER the order row is locked.
                 * No structural mutation is allowed once payment has started.
                 */
                $this->pmdR39AssertItemMutationAllowed(
                    $order,
                    $payload
                );

                if (!Schema::hasTable('order_menus')) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'item' => 'Order items are unavailable.',
                    ]);
                }

                $row = DB::table('order_menus')
                    ->where('order_id', (int)$order->getKey())
                    ->where('order_menu_id', $itemId)
                    ->lockForUpdate()
                    ->first();

                if (!$row) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'item' => 'Order item was not found.',
                    ]);
                }

                /*
                 * Check payment state a second time while both the order
                 * and item rows are locked.
                 */
                $order->refresh();

                $this->pmdR39AssertItemMutationAllowed(
                    $order,
                    $payload,
                    false
                );

                $data = (array)$row;

                $currentQuantity = max(
                    0,
                    (int)($data['quantity'] ?? 0)
                );

                if ($currentQuantity < 1) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'quantity' => 'This item has already been removed.',
                    ]);
                }

                if ($quantity > $currentQuantity) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'quantity' => 'Removal quantity is higher than the current quantity.',
                    ]);
                }

                $oldSubtotal = (float)($data['subtotal'] ?? 0);

                $unitSubtotal = $currentQuantity > 0
                    ? ($oldSubtotal / $currentQuantity)
                    : (float)($data['price'] ?? 0);

                $remainingQuantity = max(
                    0,
                    $currentQuantity - $quantity
                );

                $newSubtotal = round(
                    $unitSubtotal * $remainingQuantity,
                    4
                );

                $comment = trim(
                    (string)($data['comment'] ?? '')
                );

                $auditEntry = sprintf(
                    '[VOID %d] %s',
                    $quantity,
                    $reason
                );

                $updates = [
                    'quantity' => $remainingQuantity,
                    'subtotal' => $newSubtotal,
                ];

                if (
                    Schema::hasColumn(
                        'order_menus',
                        'comment'
                    )
                ) {
                    $updates['comment'] = trim(
                        $comment === ''
                            ? $auditEntry
                            : ($comment."\n".$auditEntry)
                    );
                }

                DB::table('order_menus')
                    ->where('order_id', (int)$order->getKey())
                    ->where('order_menu_id', $itemId)
                    ->update($updates);


                /*
                 * Keep option quantities synchronized with item quantity.
                 * Mimoza stores option quantity as integer.
                 */
                if (
                    Schema::hasTable('order_menu_options')
                    && Schema::hasColumn(
                        'order_menu_options',
                        'quantity'
                    )
                    && Schema::hasColumn(
                        'order_menu_options',
                        'order_menu_id'
                    )
                ) {
                    $optionColumns = Schema::getColumnListing(
                        'order_menu_options'
                    );

                    $optionPrimary = in_array(
                        'order_option_id',
                        $optionColumns,
                        true
                    )
                        ? 'order_option_id'
                        : (
                            in_array(
                                'id',
                                $optionColumns,
                                true
                            )
                                ? 'id'
                                : null
                        );

                    $optionQuery = DB::table(
                        'order_menu_options'
                    )
                        ->where(
                            'order_menu_id',
                            $itemId
                        );

                    if (
                        in_array(
                            'order_id',
                            $optionColumns,
                            true
                        )
                    ) {
                        $optionQuery->where(
                            'order_id',
                            (int)$order->getKey()
                        );
                    }

                    $optionRows = $optionQuery
                        ->lockForUpdate()
                        ->get();

                    foreach ($optionRows as $optionRow) {
                        $optionData = (array)$optionRow;

                        $oldOptionQuantity = max(
                            0,
                            (int)(
                                $optionData['quantity']
                                ?? $currentQuantity
                            )
                        );

                        if ($remainingQuantity <= 0) {
                            $newOptionQuantity = 0;
                        } elseif ($currentQuantity > 0) {
                            $newOptionQuantity = max(
                                1,
                                (int)round(
                                    $oldOptionQuantity
                                    * (
                                        $remainingQuantity
                                        / $currentQuantity
                                    )
                                )
                            );
                        } else {
                            $newOptionQuantity = 0;
                        }

                        $updateQuery = DB::table(
                            'order_menu_options'
                        );

                        if (
                            $optionPrimary
                            && isset(
                                $optionData[$optionPrimary]
                            )
                        ) {
                            $updateQuery->where(
                                $optionPrimary,
                                $optionData[$optionPrimary]
                            );
                        } else {
                            $updateQuery->where(
                                'order_menu_id',
                                $itemId
                            );
                        }

                        $updateQuery->update([
                            'quantity' => $newOptionQuantity,
                        ]);
                    }
                }


                /*
                 * Preserve explicit void metadata where the tenant
                 * already has the PMD audit table.
                 */
                if (
                    Schema::hasTable(
                        'pmd_waiter_pos_item_meta'
                    )
                ) {
                    $metaColumns = Schema::getColumnListing(
                        'pmd_waiter_pos_item_meta'
                    );

                    $existingMeta = DB::table(
                        'pmd_waiter_pos_item_meta'
                    )
                        ->where(
                            'order_menu_id',
                            $itemId
                        )
                        ->first();

                    $actorId = null;

                    if (
                        method_exists(
                            $this,
                            'currentUserId'
                        )
                    ) {
                        try {
                            $actorId = $this->currentUserId();
                        } catch (\Throwable $ignored) {
                            $actorId = null;
                        }
                    }

                    $meta = [
                        'order_id' => (int)$order->getKey(),
                        'voided_quantity' => round(
                            (float)(
                                $existingMeta->voided_quantity
                                ?? 0
                            )
                            + $quantity,
                            3
                        ),
                        'void_reason' => $reason,
                        'updated_by' => $actorId,
                        'updated_at' => now(),
                    ];

                    if (!$existingMeta) {
                        $meta['created_at'] = now();
                    }

                    $meta = array_intersect_key(
                        $meta,
                        array_flip($metaColumns)
                    );

                    DB::table(
                        'pmd_waiter_pos_item_meta'
                    )->updateOrInsert(
                        [
                            'order_menu_id' => $itemId,
                        ],
                        $meta
                    );
                }


                /*
                 * Operation-level audit log.
                 */
                if (
                    Schema::hasTable(
                        'pmd_waiter_pos_operation_logs'
                    )
                ) {
                    $logColumns = Schema::getColumnListing(
                        'pmd_waiter_pos_operation_logs'
                    );

                    $actorId = null;

                    if (
                        method_exists(
                            $this,
                            'currentUserId'
                        )
                    ) {
                        try {
                            $actorId = $this->currentUserId();
                        } catch (\Throwable $ignored) {
                            $actorId = null;
                        }
                    }

                    $log = [
                        'order_id' => (int)$order->getKey(),
                        'action' => 'void_item',
                        'payload' => json_encode([
                            'order_menu_id' => $itemId,
                            'removed_quantity' => $quantity,
                            'previous_quantity' => $currentQuantity,
                            'remaining_quantity' => $remainingQuantity,
                            'reason' => $reason,
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        'actor_id' => $actorId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    $log = array_intersect_key(
                        $log,
                        array_flip($logColumns)
                    );

                    DB::table(
                        'pmd_waiter_pos_operation_logs'
                    )->insert($log);
                }


                /*
                 * Canonical recalculation authority already used by
                 * the live Waiter POS save/append flow.
                 */
                $this->recalculateOrder($order);

                /*
                 * Guarantee the optimistic-version token changes,
                 * even if calculateTotals() does not touch timestamps.
                 */
                if (
                    Schema::hasColumn(
                        'orders',
                        'updated_at'
                    )
                ) {
                    DB::table('orders')
                        ->where(
                            'order_id',
                            (int)$order->getKey()
                        )
                        ->update([
                            'updated_at' => now(),
                        ]);
                }

                $fresh = \Admin\Models\Orders_model::query()
                    ->where(
                        'order_id',
                        (int)$order->getKey()
                    )
                    ->first();

                return [
                    'ok' => true,
                    'version' => 'pmd-cashier-r39',
                    'order_id' => (int)$order->getKey(),
                    'order_menu_id' => $itemId,
                    'removed_quantity' => $quantity,
                    'remaining_quantity' => $remainingQuantity,
                    'order_total' => (float)(
                        $fresh->order_total ?? 0
                    ),
                    'total_items' => (int)(
                        $fresh->total_items ?? 0
                    ),
                    'updated_at' => (string)(
                        $fresh->updated_at ?? ''
                    ),
                    'message' => $remainingQuantity > 0
                        ? 'Item quantity reduced.'
                        : 'Item removed from the active bill.',
                ];
            });

            return response()->json($result);

        } catch (
            \Illuminate\Validation\ValidationException $e
        ) {
            return response()->json([
                'ok' => false,
                'version' => 'pmd-cashier-r39',
                'message' => collect(
                    $e->errors()
                )->flatten()->first()
                    ?: 'The item could not be changed.',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'version' => 'pmd-cashier-r39',
                'message' =>
                    'The item could not be changed. '
                    .$e->getMessage(),
            ], 500);
        }
    }

    // PMD_CASHIER_R60H_CANCEL_ORDER_OWNER
    // PMD_CASHIER_R60R_CANCEL_DB_OWNER
    public function voidOrderV22($orderId)
    {
        $payload =
            $this->requestPayload();

        $reason = trim(
            (string)(
                $payload['reason']
                ?? ''
            )
        );

        if ($reason === '') {
            return response()->json([
                'ok' => false,
                'message' =>
                    'Choose a cancellation reason.',
            ], 422);
        }

        $reason =
            function_exists('mb_substr')
                ? mb_substr(
                    $reason,
                    0,
                    190
                )
                : substr(
                    $reason,
                    0,
                    190
                );

        try {
            $result = DB::transaction(
                function () use (
                    $orderId,
                    $payload,
                    $reason
                ) {
                    $order =
                        \Admin\Models\Orders_model::query()
                            ->where(
                                'order_id',
                                (int)$orderId
                            )
                            ->lockForUpdate()
                            ->first();

                    if (!$order) {
                        throw
                            \Illuminate\Validation\ValidationException::withMessages([
                                'order' =>
                                    'Order not found.',
                            ]);
                    }

                    /*
                     * Preserve the existing financial safety rule:
                     * once payment has started, this order cannot be
                     * structurally cancelled through this action.
                     */
                    $this->pmdR39AssertItemMutationAllowed(
                        $order,
                        $payload,
                        false
                    );

                    $id =
                        (int)$order->getKey();

                    $orderColumns =
                        Schema::getColumnListing(
                            'orders'
                        );

                    if (
                        !in_array(
                            'status_id',
                            $orderColumns,
                            true
                        )
                    ) {
                        throw
                            \Illuminate\Validation\ValidationException::withMessages([
                                'status' =>
                                    'Order status storage is unavailable.',
                            ]);
                    }

                    /*
                     * Resolve ONLY an Order cancellation/void status.
                     * Never guess a numeric status id.
                     */
                    $cancelStatusId = null;

                    if (
                        Schema::hasTable(
                            'statuses'
                        )
                    ) {
                        $statusColumns =
                            Schema::getColumnListing(
                                'statuses'
                            );

                        $statusIdColumn =
                            in_array(
                                'status_id',
                                $statusColumns,
                                true
                            )
                                ? 'status_id'
                                : (
                                    in_array(
                                        'id',
                                        $statusColumns,
                                        true
                                    )
                                        ? 'id'
                                        : null
                                );

                        $statusNameColumn =
                            in_array(
                                'status_name',
                                $statusColumns,
                                true
                            )
                                ? 'status_name'
                                : (
                                    in_array(
                                        'name',
                                        $statusColumns,
                                        true
                                    )
                                        ? 'name'
                                        : null
                                );

                        if (
                            $statusIdColumn &&
                            $statusNameColumn
                        ) {
                            $base =
                                DB::table(
                                    'statuses'
                                );

                            if (
                                in_array(
                                    'status_for',
                                    $statusColumns,
                                    true
                                )
                            ) {
                                $base->where(
                                    'status_for',
                                    'order'
                                );
                            }

                            foreach (
                                [
                                    'cancelled',
                                    'canceled',
                                    'void',
                                ]
                                as $wanted
                            ) {
                                $candidate =
                                    (clone $base)
                                        ->whereRaw(
                                            'LOWER('
                                            .$statusNameColumn
                                            .') = ?',
                                            [$wanted]
                                        )
                                        ->value(
                                            $statusIdColumn
                                        );

                                if (
                                    (int)$candidate > 0
                                ) {
                                    $cancelStatusId =
                                        (int)$candidate;
                                    break;
                                }
                            }

                            if (
                                !$cancelStatusId
                            ) {
                                foreach (
                                    [
                                        'cancel',
                                        'void',
                                    ]
                                    as $wanted
                                ) {
                                    $candidate =
                                        (clone $base)
                                            ->whereRaw(
                                                'LOWER('
                                                .$statusNameColumn
                                                .') LIKE ?',
                                                [
                                                    '%'
                                                    .$wanted
                                                    .'%',
                                                ]
                                            )
                                            ->value(
                                                $statusIdColumn
                                            );

                                    if (
                                        (int)$candidate > 0
                                    ) {
                                        $cancelStatusId =
                                            (int)$candidate;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (
                        !$cancelStatusId
                    ) {
                        throw
                            \Illuminate\Validation\ValidationException::withMessages([
                                'status' =>
                                    'No Cancelled/Void order status is configured.',
                            ]);
                    }

                    $updates = [
                        'status_id' =>
                            $cancelStatusId,
                    ];

                    if (
                        in_array(
                            'processed',
                            $orderColumns,
                            true
                        )
                    ) {
                        $updates['processed'] = 1;
                    }

                    /*
                     * Reason is durable in the order itself.
                     * History / KDS can read the same audit value.
                     */
                    if (
                        in_array(
                            'comment',
                            $orderColumns,
                            true
                        )
                    ) {
                        $existing =
                            trim(
                                (string)(
                                    $order->comment
                                    ?? ''
                                )
                            );

                        $audit =
                            '[CANCELLED] '
                            .$reason;

                        $updates['comment'] =
                            trim(
                                $existing === ''
                                    ? $audit
                                    : (
                                        $existing
                                        ."\n"
                                        .$audit
                                    )
                            );
                    }

                    /*
                     * Query Builder update deliberately avoids
                     * re-serializing the Orders_model date/time casts.
                     */
                    if (
                        in_array(
                            'updated_at',
                            $orderColumns,
                            true
                        )
                    ) {
                        $updates['updated_at'] =
                            date(
                                'Y-m-d H:i:s'
                            );
                    }

                    DB::table(
                        'orders'
                    )
                        ->where(
                            'order_id',
                            $id
                        )
                        ->update(
                            $updates
                        );

                    /*
                     * Separate operational audit.
                     */
                    if (
                        Schema::hasTable(
                            'pmd_waiter_pos_operation_logs'
                        )
                    ) {
                        $columns =
                            Schema::getColumnListing(
                                'pmd_waiter_pos_operation_logs'
                            );

                        $actorId = null;

                        if (
                            method_exists(
                                $this,
                                'currentUserId'
                            )
                        ) {
                            try {
                                $actorId =
                                    $this->currentUserId();
                            } catch (
                                \Throwable $ignored
                            ) {
                                $actorId = null;
                            }
                        }

                        $log = [
                            'order_id' => $id,
                            'action' =>
                                'cancel_order',
                            'payload' =>
                                json_encode(
                                    [
                                        'reason' =>
                                            $reason,
                                        'status_id' =>
                                            $cancelStatusId,
                                    ],
                                    JSON_UNESCAPED_UNICODE
                                    | JSON_UNESCAPED_SLASHES
                                ),
                            'actor_id' =>
                                $actorId,
                            'created_at' =>
                                date(
                                    'Y-m-d H:i:s'
                                ),
                            'updated_at' =>
                                date(
                                    'Y-m-d H:i:s'
                                ),
                        ];

                        $log =
                            array_intersect_key(
                                $log,
                                array_flip(
                                    $columns
                                )
                            );

                        if (
                            isset(
                                $log['order_id'],
                                $log['action']
                            )
                        ) {
                            DB::table(
                                'pmd_waiter_pos_operation_logs'
                            )->insert(
                                $log
                            );
                        }
                    }

                    /*
                     * IMPORTANT:
                     * Cancellation does NOT free the physical table.
                     * Cashier/Waiter must explicitly Set table free.
                     */
                    return [
                        'ok' => true,
                        'message' =>
                            'Order cancelled.',
                        'order_id' =>
                            $id,
                        'status_id' =>
                            $cancelStatusId,
                        'reason' =>
                            $reason,
                    ];
                }
            );

            return response()->json(
                $result
            );

        } catch (
            \Illuminate\Validation\ValidationException $e
        ) {
            return response()->json([
                'ok' => false,
                'message' =>
                    collect(
                        $e->errors()
                    )
                        ->flatten()
                        ->first()
                    ?: 'Order could not be cancelled.',
                'errors' =>
                    $e->errors(),
            ], 422);

        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'message' =>
                    'Order could not be cancelled. '
                    .$e->getMessage(),
            ], 500);
        }
    }


    public function reopenOrderV22($orderId) { return $this->operationsUnavailableV12('reopen', $orderId); }

    public function printLinksV22($orderId)
    {
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        return response()->json([
            'ok' => true,
            'order_id' => (int)$order->getKey(),
            'invoice_url' => '/admin/orders/invoice/'.rawurlencode((string)$order->getKey()),
            'edit_url' => '/admin/orders/edit/'.rawurlencode((string)$order->getKey()),
        ]);
    }

    protected function pmdR39ItemMutationState($order): array
    {
        $settledAmount = max(
            0,
            (float)($order->settled_amount ?? 0)
        );

        $settlementStatus = strtolower(
            trim(
                (string)(
                    $order->settlement_status
                    ?? $order->payment_status
                    ?? 'unpaid'
                )
            )
        );

        // PMD_CASHIER_R60H_OPERATIONAL_MUTATION_LOCK
        $operationalStatusName =
            '';

        if (
            Schema::hasTable(
                'statuses'
            )
            && !empty(
                $order->status_id
            )
        ) {
            try {
                $operationalStatusName =
                    strtolower(
                        trim(
                            (string)(
                                DB::table('statuses')
                                    ->where(
                                        'status_id',
                                        (int)$order->status_id
                                    )
                                    ->value(
                                        'status_name'
                                    )
                                ?: ''
                            )
                        )
                    );
            } catch (
                \Throwable $ignored
            ) {
                $operationalStatusName =
                    '';
            }
        }

        $operationalLocked =
            (bool)preg_match(
                '/cancel|void|closed|complete|completed/',
                $operationalStatusName
            );

        $hasTransaction = false;

        if (
            Schema::hasTable(
                'order_payment_transactions'
            )
        ) {
            $hasTransaction = DB::table(
                'order_payment_transactions'
            )
                ->where(
                    'order_id',
                    (int)$order->getKey()
                )
                ->exists();
        }

        $lockedStatuses = [
            'partial',
            'paid',
            'settled',
            'closed',
            'cancelled',
            'canceled',
            'refunded',
        ];

        $locked =
            $operationalLocked
            || $settledAmount > 0.0001
            || in_array(
                $settlementStatus,
                $lockedStatuses,
                true
            )
            || $hasTransaction;

        $reason = '';

        if ($locked) {
            if ($operationalLocked) {
                $reason =
                    'This order is cancelled or closed. '
                    .'Order items are locked.';
            } elseif ($hasTransaction) {
                $reason =
                    'Payment history already exists. '
                    .'Order items are locked.';
            } elseif ($settledAmount > 0.0001) {
                $reason =
                    'Payment has already started. '
                    .'Order items are locked.';
            } else {
                $reason =
                    'This bill is no longer financially mutable.';
            }
        }

        return [
            'allowed' => !$locked,
            'locked' => $locked,
            'payment_started' => $locked,
            'settlement_status' => $settlementStatus,
            'settled_amount' => $settledAmount,
            'has_payment_transaction' => $hasTransaction,
            'reason' => $reason,
        ];
    }

    protected function pmdR39AssertItemMutationAllowed(
        $order,
        array $payload,
        bool $checkVersion = true
    ): void {
        if ($checkVersion) {
            $expected = trim(
                (string)(
                    $payload['expected_updated_at']
                    ?? ''
                )
            );

            if (
                $expected !== ''
                && (string)($order->updated_at ?? '')
                    !== $expected
            ) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'order' =>
                        'This order changed on another device. '
                        .'Refresh before changing items.',
                ]);
            }
        }

        $state = $this->pmdR39ItemMutationState(
            $order
        );

        if (!$state['allowed']) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'order' =>
                    $state['reason']
                    ?: 'Order items are locked after payment starts.',
            ]);
        }
    }

    protected function operationsUnavailableV12(string $action, $orderId)
    {
        return response()->json([
            'ok' => false,
            'version' => 'pmd-waiter-pos-v2.2-compat-v1.2',
            'action' => $action,
            'order_id' => (int)$orderId,
            'message' => 'This destructive table operation is not enabled in the safe waiter workstation yet.',
        ], 409);
    }
}
