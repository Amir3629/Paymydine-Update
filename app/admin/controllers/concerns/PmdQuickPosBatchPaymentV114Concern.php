<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Orders_model;
use Admin\Services\CashDrawerService\CashDrawerSettlementBridge;
use App\Services\Fiscal\GermanyFiscalSettlementBridge;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * PMD_QPOS_MULTI_CHECK_PAY_BACKEND_V114
 *
 * One cashier action settles several unpaid checks atomically.
 * Integrated terminal attempts remain single-order by schema, therefore this
 * batch endpoint supports Cash and manually confirmed external terminal only.
 */
trait PmdQuickPosBatchPaymentV114Concern
{
    protected function pmdBatchOrderIdsV114(array $payload): array
    {
        $ids = array_values(array_unique(array_filter(array_map(
            'intval',
            is_array($payload['order_ids'] ?? null)
                ? $payload['order_ids']
                : []
        ))));

        if (count($ids) < 2) {
            throw ValidationException::withMessages([
                'order_ids' => 'Select at least two unpaid orders.',
            ]);
        }

        if (count($ids) > 20) {
            throw ValidationException::withMessages([
                'order_ids' => 'A combined payment can include at most 20 orders.',
            ]);
        }

        sort($ids, SORT_NUMERIC);
        return $ids;
    }

    protected function pmdBatchSummaryV114(
        array $ids,
        bool $insideTransaction = false
    ): array {
        $orders = Orders_model::query()
            ->whereIn('order_id', $ids)
            ->get()
            ->keyBy(fn ($order) => (int)$order->getKey());

        if ($orders->count() !== count($ids)) {
            throw ValidationException::withMessages([
                'order_ids' => 'One or more selected orders no longer exist.',
            ]);
        }

        $rows = [];
        $orderTotal = 0.0;
        $settledTotal = 0.0;
        $remainingTotal = 0.0;

        foreach ($ids as $id) {
            $order = $orders->get($id);
            $summary = $this->buildPaymentSummary(
                $order,
                $insideTransaction
            );

            $remaining = round((float)data_get(
                $summary,
                'settlement.remaining_amount',
                0
            ), 4);

            if ($remaining <= 0.0001) {
                throw ValidationException::withMessages([
                    'order_ids' => 'Order #'.$id.' is already fully paid.',
                ]);
            }

            $total = round((float)data_get(
                $summary,
                'settlement.order_total',
                0
            ), 4);

            $settled = round((float)data_get(
                $summary,
                'settlement.settled_amount',
                0
            ), 4);

            $rows[] = [
                'order_id' => $id,
                'order_total' => $total,
                'settled_amount' => $settled,
                'remaining_amount' => $remaining,
                'updated_at' => (string)($order->updated_at ?? ''),
            ];

            $orderTotal += $total;
            $settledTotal += $settled;
            $remainingTotal += $remaining;
        }

        return [
            'ok' => true,
            'batch_mode' => true,
            'orders' => $rows,
            'order' => [
                'order_id' => 0,
                'updated_at' => hash(
                    'sha256',
                    implode('|', array_map(
                        fn ($row) =>
                            $row['order_id'].':'.$row['updated_at'],
                        $rows
                    ))
                ),
            ],
            'settlement' => [
                'order_total' => round($orderTotal, 4),
                'settled_amount' => round($settledTotal, 4),
                'remaining_amount' => round($remainingTotal, 4),
                'status' => 'unpaid',
                'gross_ratio' => 1,
            ],
            'items' => [],
            'terminal_providers' => [],
        ];
    }

    public function batchPaymentSummary()
    {
        $this->assertPaymentPermission();

        try {
            $ids = $this->pmdBatchOrderIdsV114(
                $this->requestPayload()
            );

            return response()->json(
                $this->pmdBatchSummaryV114($ids)
            );
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'message' =>
                    collect($e->errors())->flatten()->first()
                    ?: 'Combined payment could not be loaded.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'message' =>
                    'Combined payment could not be loaded. '
                    .$e->getMessage(),
            ], 500);
        }
    }

    public function settleBatchPayment()
    {
        $this->assertPaymentPermission();
        $payload = $this->requestPayload();

        try {
            $ids = $this->pmdBatchOrderIdsV114($payload);
            $idempotencyKey = trim((string)(
                $payload['idempotency_key'] ?? ''
            ));

            if ($idempotencyKey === '') {
                throw ValidationException::withMessages([
                    'payment' => 'Missing payment idempotency key.',
                ]);
            }

            $method = strtolower(trim((string)(
                $payload['payment_method'] ?? ''
            )));

            if (!in_array(
                $method,
                ['cash', 'external_terminal', 'manual_card'],
                true
            )) {
                throw ValidationException::withMessages([
                    'payment_method' =>
                        'Combined payment supports Cash or a manually confirmed external terminal.',
                ]);
            }

            $reference = trim((string)(
                $payload['payment_reference'] ?? ''
            ));

            if (in_array(
                $method,
                ['external_terminal', 'manual_card'],
                true
            )) {
                if (empty($payload['external_confirmed'])) {
                    throw ValidationException::withMessages([
                        'external_confirmed' =>
                            'Confirm that the external terminal approved the combined payment.',
                    ]);
                }

                if ($reference === '') {
                    throw ValidationException::withMessages([
                        'payment_reference' =>
                            'Enter the external terminal receipt or approval reference.',
                    ]);
                }
            }

            if (max(0, round((float)($payload['tip_amount'] ?? 0), 4)) > 0.0001) {
                throw ValidationException::withMessages([
                    'tip_amount' =>
                        'Tips are not supported in a combined multi-order payment.',
                ]);
            }

            $keys = array_map(
                fn ($id) => $idempotencyKey.'-order-'.$id,
                $ids
            );

            if (
                Schema::hasTable('order_payment_transactions')
                && Schema::hasColumn(
                    'order_payment_transactions',
                    'idempotency_key'
                )
            ) {
                $existing = (int)DB::table(
                    'order_payment_transactions'
                )
                    ->whereIn('idempotency_key', $keys)
                    ->count();

                if ($existing === count($ids)) {
                    return response()->json([
                        'ok' => true,
                        'duplicate' => true,
                        'message' =>
                            'This combined payment was already recorded.',
                    ]);
                }

                if ($existing > 0) {
                    throw ValidationException::withMessages([
                        'payment' =>
                            'Combined payment is partially recorded and requires reconciliation.',
                    ]);
                }
            }

            $result = DB::transaction(function () use (
                $ids,
                $keys,
                $payload,
                $method,
                $reference
            ) {
                $orders = Orders_model::query()
                    ->whereIn('order_id', $ids)
                    ->orderBy('order_id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy(fn ($order) => (int)$order->getKey());

                if ($orders->count() !== count($ids)) {
                    throw ValidationException::withMessages([
                        'order_ids' =>
                            'One or more selected orders no longer exist.',
                    ]);
                }

                $summaries = [];
                $aggregateRemaining = 0.0;

                foreach ($ids as $id) {
                    $order = $orders->get($id);
                    $summary = $this->buildPaymentSummary(
                        $order,
                        true
                    );

                    $remaining = round((float)data_get(
                        $summary,
                        'settlement.remaining_amount',
                        0
                    ), 4);

                    if ($remaining <= 0.0001) {
                        throw ValidationException::withMessages([
                            'order_ids' =>
                                'Order #'.$id
                                .' was paid while combined payment was open.',
                        ]);
                    }

                    $summaries[$id] = $summary;
                    $aggregateRemaining += $remaining;
                }

                $aggregateRemaining = round(
                    $aggregateRemaining,
                    4
                );

                $expectedRemaining = array_key_exists(
                    'expected_remaining',
                    $payload
                )
                    ? round(
                        (float)$payload['expected_remaining'],
                        4
                    )
                    : null;

                if (
                    $expectedRemaining !== null
                    && abs(
                        $expectedRemaining - $aggregateRemaining
                    ) > 0.02
                ) {
                    throw ValidationException::withMessages([
                        'payment' =>
                            'The combined balance changed. Refresh before collecting money.',
                    ]);
                }

                $cashReceived = null;
                $changeDue = 0.0;

                if ($method === 'cash') {
                    $cashReceived = array_key_exists(
                        'cash_received',
                        $payload
                    )
                        ? round(
                            (float)$payload['cash_received'],
                            4
                        )
                        : $aggregateRemaining;

                    if (
                        $cashReceived + 0.0001
                        < $aggregateRemaining
                    ) {
                        throw ValidationException::withMessages([
                            'cash_received' =>
                                'Cash received is lower than the combined amount due.',
                        ]);
                    }

                    $changeDue = round(
                        max(
                            0,
                            $cashReceived - $aggregateRemaining
                        ),
                        4
                    );
                }

                $transactions = [];
                $first = true;

                foreach ($ids as $index => $id) {
                    $order = $orders->get($id);
                    $summary = $summaries[$id];

                    $remaining = round((float)data_get(
                        $summary,
                        'settlement.remaining_amount',
                        0
                    ), 4);

                    $orderTotal = round((float)data_get(
                        $summary,
                        'settlement.order_total',
                        0
                    ), 4);

                    $allocation =
                        $this->resolvePaymentAllocation(
                            $summary,
                            [
                                'split_mode' => 'full',
                                'amount' => $remaining,
                            ]
                        );

                    $transactionId =
                        $this->insertPaymentTransaction([
                            'order_id' => $id,
                            'payment_method' => $method,
                            'payment_reference' =>
                                $reference !== ''
                                    ? $reference
                                    : null,
                            'amount' => $remaining,
                            'settlement_status' => 'paid',
                            'payer_label' => 'Combined payment',
                            'paid_at' => now(),
                            'tip_amount' => 0,
                            'provider_code' =>
                                in_array(
                                    $method,
                                    [
                                        'external_terminal',
                                        'manual_card',
                                    ],
                                    true
                                )
                                    ? 'external_terminal'
                                    : null,
                            'created_by' => $this->currentUserId(),
                            'notes' =>
                                'Quick POS combined payment: '
                                .implode(',', $ids),
                            'cash_received' =>
                                $first
                                    ? $cashReceived
                                    : null,
                            'change_due' =>
                                $first
                                    ? $changeDue
                                    : 0,
                            'idempotency_key' => $keys[$index],
                        ]);

                    $this->insertPaymentAllocations(
                        $transactionId,
                        $allocation['rows']
                    );

                    if (Schema::hasColumn(
                        'orders',
                        'settlement_status'
                    )) {
                        $order->settlement_status = 'paid';
                    }

                    if (Schema::hasColumn(
                        'orders',
                        'settled_amount'
                    )) {
                        $order->settled_amount = $orderTotal;
                    }

                    if (Schema::hasColumn(
                        'orders',
                        'settlement_method'
                    )) {
                        $order->settlement_method = $method;
                    }

                    if (
                        Schema::hasColumn(
                            'orders',
                            'settlement_reference'
                        )
                        && $reference !== ''
                    ) {
                        $order->settlement_reference = $reference;
                    }

                    if (Schema::hasColumn(
                        'orders',
                        'settled_at'
                    )) {
                        $order->settled_at = now();
                    }

                    if (Schema::hasColumn(
                        'orders',
                        'processed'
                    )) {
                        $order->processed = 1;
                    }

                    $order->save();

                    $transactions[] = [
                        'order_id' => $id,
                        'transaction_id' => $transactionId,
                        'amount' => $remaining,
                    ];

                    $first = false;
                }

                return [
                    'orders' => $orders,
                    'transactions' => $transactions,
                    'cash_received' => $cashReceived,
                    'change_due' => $changeDue,
                    'method' => $method,
                    'reference' => $reference,
                ];
            });

            $cashDrawer = null;

            if (
                $result['method'] === 'cash'
                && !empty($result['transactions'][0])
            ) {
                $firstTx = $result['transactions'][0];
                $firstOrder = $result['orders']->get(
                    (int)$firstTx['order_id']
                );

                if ($firstOrder) {
                    $cashDrawer =
                        CashDrawerSettlementBridge::enqueueAfterSettlement(
                            $firstOrder,
                            (int)$firstTx['transaction_id'],
                            'cash',
                            $payload,
                            $idempotencyKey
                        );
                }
            }

            $fiscalizations = [];

            foreach ($result['transactions'] as $tx) {
                $fiscalizations[] = [
                    'order_id' => (int)$tx['order_id'],
                    'result' =>
                        app(GermanyFiscalSettlementBridge::class)
                            ->finalizeIfEnabled(
                                (int)$tx['order_id'],
                                (string)$result['method'],
                                (string)$result['reference']
                            ),
                ];
            }

            return response()->json([
                'ok' => true,
                'message' =>
                    count($ids).' orders paid together.',
                'orders' => $result['transactions'],
                'cash_received' => $result['cash_received'],
                'change_due' => $result['change_due'],
                'cash_drawer' => $cashDrawer,
                'fiscalizations' => $fiscalizations,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'message' =>
                    collect($e->errors())->flatten()->first()
                    ?: 'Combined payment could not be recorded.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'message' =>
                    'Combined payment could not be recorded. '
                    .$e->getMessage(),
            ], 500);
        }
    }
}
