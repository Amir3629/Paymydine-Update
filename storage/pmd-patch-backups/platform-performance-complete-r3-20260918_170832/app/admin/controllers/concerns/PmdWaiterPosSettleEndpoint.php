<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\TerminalPaymentService;
use Admin\Services\CashDrawerService\CashDrawerSettlementBridge;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

trait PmdWaiterPosSettleEndpoint
{
    public function settlePayment($orderId = null)
    {
        $this->assertPaymentPermission();
        $payload = $this->requestPayload();
        $orderId = (int)$orderId;

        $idempotencyKey = trim((string)($payload['idempotency_key'] ?? ''));
        if ($idempotencyKey === '') {
            return response()->json(['ok' => false, 'message' => 'Missing payment idempotency key.'], 422);
        }

        if (Schema::hasTable('order_payment_transactions') && Schema::hasColumn('order_payment_transactions', 'idempotency_key')) {
            $existing = DB::table('order_payment_transactions')->where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                $fresh = $this->findOrder($orderId);
                $tableRelease = $fresh
                    ? $this->pmdR44ReleaseTableAfterFullSettlement($fresh)
                    : null;
                return response()->json([
                    'ok' => true,
                    'duplicate' => true,
                    'message' => 'This payment was already recorded.',
                    'transaction_id' => (int)$existing->id,
                    'summary' => $fresh ? $this->buildPaymentSummary($fresh) : null,
                    'receipt_url' => '/admin/orders/split-receipt/'.(int)$existing->id,
                    'invoice_url' => '/admin/orders/split-invoice/'.(int)$existing->id,
                    'table_release' => $tableRelease,
                ]);
            }
        }

        try {
            $result = DB::transaction(function () use ($orderId, $payload, $idempotencyKey) {
                $order = Orders_model::query()->where('order_id', $orderId)->lockForUpdate()->first();
                if (!$order) {
                    throw ValidationException::withMessages(['order' => 'Order not found.']);
                }

                $summary = $this->buildPaymentSummary($order, true);
                $remaining = (float)$summary['settlement']['remaining_amount'];
                if ($remaining <= 0.0001) {
                    return [
                        'already_paid' => true,
                        'order' => $order,
                        'summary' => $summary,
                    ];
                }

                $expectedRemaining = array_key_exists('expected_remaining', $payload)
                    ? round((float)$payload['expected_remaining'], 4)
                    : null;
                if ($expectedRemaining !== null && abs($expectedRemaining - $remaining) > 0.02) {
                    throw ValidationException::withMessages([
                        'order' => 'The balance changed. Refresh the payment screen before collecting money.',
                    ]);
                }

                $expectedUpdatedAt = trim((string)($payload['expected_updated_at'] ?? ''));
                if ($expectedUpdatedAt !== '' && $order->updated_at && (string)$order->updated_at !== $expectedUpdatedAt) {
                    throw ValidationException::withMessages([
                        'order' => 'The order changed while payment was open. Refresh before collecting money.',
                    ]);
                }

                $method = strtolower(trim((string)($payload['payment_method'] ?? '')));
                if (!in_array($method, ['cash', 'external_terminal', 'manual_card'], true)) {
                    throw ValidationException::withMessages([
                        'payment_method' => 'Choose Cash or a manually confirmed external terminal payment.',
                    ]);
                }

                $reference = trim((string)($payload['payment_reference'] ?? ''));
                if (in_array($method, ['external_terminal', 'manual_card'], true)) {
                    if (empty($payload['external_confirmed'])) {
                        throw ValidationException::withMessages([
                            'external_confirmed' => 'Confirm that the external terminal approved the payment.',
                        ]);
                    }
                    if ($reference === '') {
                        throw ValidationException::withMessages([
                            'payment_reference' => 'Enter the terminal receipt or approval reference.',
                        ]);
                    }
                }

                $allocation = $this->resolvePaymentAllocation($summary, $payload);
                $settledBaseAmount = round((float)$allocation['gross_amount'], 4);
                if ($settledBaseAmount <= 0 || $settledBaseAmount > $remaining + 0.02) {
                    throw ValidationException::withMessages(['amount' => 'Invalid payment amount.']);
                }

                $tipAmount = max(0, round((float)($payload['tip_amount'] ?? 0), 4));
                $couponCode = strtoupper(trim((string)($payload['coupon_code'] ?? '')));
                $couponDiscount = 0.0;
                if ($couponCode !== '') {
                    if (abs($settledBaseAmount - $remaining) > 0.02) {
                        throw ValidationException::withMessages([
                            'coupon_code' => 'Coupons can only be applied when paying the full remaining balance.',
                        ]);
                    }
                    $coupon = $this->couponResult($couponCode, $settledBaseAmount);
                    if (!$coupon['ok']) {
                        throw ValidationException::withMessages([
                            'coupon_code' => (string)$coupon['message'],
                        ]);
                    }
                    $couponDiscount = round((float)$coupon['discount'], 4);
                }

                $payableAmount = round(max(0, $settledBaseAmount + $tipAmount - $couponDiscount), 4);
                if ($payableAmount <= 0) {
                    throw ValidationException::withMessages(['amount' => 'Payable amount must be greater than zero.']);
                }

                $cashReceived = null;
                $changeDue = 0.0;
                if ($method === 'cash') {
                    $cashReceived = array_key_exists('cash_received', $payload)
                        ? round((float)$payload['cash_received'], 4)
                        : $payableAmount;
                    if ($cashReceived + 0.0001 < $payableAmount) {
                        throw ValidationException::withMessages([
                            'cash_received' => 'Cash received is lower than the amount due.',
                        ]);
                    }
                    $changeDue = round(max(0, $cashReceived - $payableAmount), 4);
                }

                $currentSettled = max(0, round((float)($order->settled_amount ?? 0), 4));
                $orderTotal = (float)$summary['settlement']['order_total'];
                $newSettled = min($orderTotal, round($currentSettled + $settledBaseAmount, 4));
                $newRemaining = max(0, round($orderTotal - $newSettled, 4));
                $newStatus = $newRemaining <= 0.0001 ? 'paid' : 'partial';

                $transactionId = $this->insertPaymentTransaction([
                    'order_id' => (int)$order->getKey(),
                    'payment_method' => $method,
                    'payment_reference' => $reference !== '' ? $reference : null,
                    'amount' => $payableAmount,
                    'settlement_status' => $newStatus,
                    'payer_label' => trim((string)($payload['payer_label'] ?? '')) ?: null,
                    'paid_at' => now(),
                    'tip_amount' => $tipAmount,
                    'coupon_discount' => $couponDiscount,
                    'coupon_code' => $couponCode !== '' ? $couponCode : null,
                    'provider_code' => trim((string)($payload['provider_code'] ?? '')) ?: null,
                    'created_by' => $this->currentUserId(),
                    'notes' => trim((string)($payload['notes'] ?? '')) ?: null,
                    'cash_received' => $cashReceived,
                    'change_due' => $changeDue,
                    'idempotency_key' => $idempotencyKey,
                ]);

                $this->insertPaymentAllocations($transactionId, $allocation['rows']);

                if (Schema::hasColumn('orders', 'settlement_status')) {
                    $order->settlement_status = $newStatus;
                }
                if (Schema::hasColumn('orders', 'settled_amount')) {
                    $order->settled_amount = $newSettled;
                }
                if (Schema::hasColumn('orders', 'settlement_method')) {
                    $order->settlement_method = $method;
                }
                if (Schema::hasColumn('orders', 'settlement_reference') && $reference !== '') {
                    $order->settlement_reference = $reference;
                }
                if (Schema::hasColumn('orders', 'settled_at') && $newStatus === 'paid') {
                    $order->settled_at = now();
                }
                if (Schema::hasColumn('orders', 'processed') && $newStatus === 'paid') {
                    $order->processed = 1;
                }
                // PMD_PAYMENT_LIFECYCLE_SEPARATION_R37C
                // Full settlement updates settlement fields only.
                // Kitchen/order status remains independently controlled.
                $order->save();

                $order->refresh();

                // PMD_CASH_DRAWER_SETTLEMENT_R1
                // Hardware failure never rolls back a valid payment. The
                // bridge only queues a short-lived deduplicated cash command.
                $cashDrawerResult = CashDrawerSettlementBridge::enqueueAfterSettlement(
                    $order,
                    (int)$transactionId,
                    $method,
                    $payload,
                    $idempotencyKey
                );

                $freshSummary = $this->buildPaymentSummary($order, true);

                return [
                    'already_paid' => false,
                    'order' => $order,
                    'summary' => $freshSummary,
                    'transaction_id' => $transactionId,
                    'paid_amount' => $payableAmount,
                    'settled_base_amount' => $settledBaseAmount,
                    'tip_amount' => $tipAmount,
                    'coupon_discount' => $couponDiscount,
                    'cash_received' => $cashReceived,
                    'change_due' => $changeDue,
                    'settlement_status' => $newStatus,
                    'remaining_amount' => $newRemaining,
                    'cash_drawer' => $cashDrawerResult,
                ];
            });

            $tableRelease = !empty($result['order'])
                ? $this->pmdR44ReleaseTableAfterFullSettlement($result['order'])
                : null;

            if (!empty($result['already_paid'])) {
                return response()->json([
                    'ok' => true,
                    'already_paid' => true,
                    'message' => 'Order is already fully paid.',
                    'summary' => $result['summary'],
                    'table_release' => $tableRelease,
                ]);
            }

            return response()->json([
                'ok' => true,
                'message' => $result['settlement_status'] === 'paid'
                    ? 'Payment completed. The order is fully paid.'
                    : 'Partial payment recorded.',
                'transaction_id' => $result['transaction_id'],
                'receipt_url' => '/admin/orders/split-receipt/'.$result['transaction_id'],
                'invoice_url' => '/admin/orders/split-invoice/'.$result['transaction_id'],
                'paid_amount' => $result['paid_amount'],
                'settled_base_amount' => $result['settled_base_amount'],
                'tip_amount' => $result['tip_amount'],
                'coupon_discount' => $result['coupon_discount'],
                'cash_received' => $result['cash_received'],
                'change_due' => $result['change_due'],
                'settlement_status' => $result['settlement_status'],
                'remaining_amount' => $result['remaining_amount'],
                'cash_drawer' => $result['cash_drawer'] ?? null,
                'summary' => $result['summary'],
                'table_release' => $tableRelease,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'message' => collect($e->errors())->flatten()->first() ?: 'Payment could not be recorded.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'message' => 'Payment could not be recorded. '.$e->getMessage(),
            ], 500);
        }
    }


    // PMD_FULL_PAYMENT_TABLE_RELEASE_R44
    // Financial completion makes the physical table available only when this
    // was the last financially-open check on that canonical table. Kitchen
    // status remains independent; this changes table lifecycle only.
    protected function pmdR44ReleaseTableAfterFullSettlement($order): array
    {
        // PMD_MANUAL_TABLE_LIFECYCLE_R45
        // Financial settlement and physical occupancy are separate authorities.
        // Payment must NEVER make a table green. Only the explicit staff
        // "Set table free" action may release it after server-side checks.
        return [
            'released' => false,
            'table_id' => null,
            'reason' => 'manual_table_release_required_r45',
        ];

        $result = [
            'released' => false,
            'table_id' => null,
            'reason' => 'not_applicable',
        ];

        try {
            if (!$order || !Schema::hasTable('tables')) {
                return $result;
            }

            $total = max(0, (float)($order->order_total ?? 0));
            $settled = max(0, (float)($order->settled_amount ?? 0));
            $status = strtolower(trim((string)($order->settlement_status ?? '')));

            $fullyPaid = in_array($status, ['paid', 'settled'], true)
                || ($total > 0 && $settled >= $total - 0.0001);

            if (!$fullyPaid) {
                $result['reason'] = 'not_fully_paid';
                return $result;
            }

            $orderColumns = Schema::getColumnListing('orders');
            $tableId = 0;

            if (
                in_array('table_id', $orderColumns, true)
                && (int)($order->table_id ?? 0) > 0
            ) {
                $tableId = (int)$order->table_id;
            }

            if ($tableId < 1) {
                $rawOrderType = trim((string)($order->order_type ?? ''));
                if (ctype_digit($rawOrderType)) {
                    $tableId = (int)$rawOrderType;
                }
            }

            if ($tableId < 1) {
                $result['reason'] = 'canonical_table_not_resolved';
                return $result;
            }

            $result['table_id'] = $tableId;
            $tableColumns = Schema::getColumnListing('tables');
            $pk = in_array('table_id', $tableColumns, true)
                ? 'table_id'
                : (in_array('id', $tableColumns, true) ? 'id' : null);

            if (!$pk || !in_array('operational_status', $tableColumns, true)) {
                $result['reason'] = 'table_status_columns_unavailable';
                return $result;
            }

            return DB::transaction(function () use (
                $order,
                $orderColumns,
                $tableColumns,
                $pk,
                $tableId,
                $result
            ) {
                $table = DB::table('tables')
                    ->where($pk, $tableId)
                    ->lockForUpdate()
                    ->first();

                if (!$table) {
                    $result['reason'] = 'table_not_found';
                    return $result;
                }

                $identityColumns = [];
                if (in_array('table_id', $orderColumns, true)) {
                    $identityColumns[] = 'table_id';
                }
                if (in_array('order_type', $orderColumns, true)) {
                    $identityColumns[] = 'order_type';
                }

                if (!$identityColumns) {
                    $result['reason'] = 'order_table_reference_unavailable';
                    return $result;
                }

                $other = DB::table('orders')
                    ->where('order_id', '!=', (int)$order->getKey())
                    ->where(function ($query) use ($identityColumns, $tableId) {
                        foreach ($identityColumns as $column) {
                            $query->orWhere($column, (string)$tableId);
                        }
                    });

                if (in_array('settlement_status', $orderColumns, true)) {
                    $other->where(function ($query) {
                        $query
                            ->whereNull('settlement_status')
                            ->orWhereNotIn('settlement_status', [
                                'paid',
                                'settled',
                                'cancelled',
                                'canceled',
                                'failed',
                            ]);
                    });
                }

                if (
                    in_array('settled_amount', $orderColumns, true)
                    && in_array('order_total', $orderColumns, true)
                ) {
                    $other->whereRaw(
                        'COALESCE(settled_amount, 0) < COALESCE(order_total, 0) - 0.0001'
                    );
                }

                if ($other->exists()) {
                    $result['reason'] = 'another_open_check_exists';
                    return $result;
                }

                $old = strtolower(trim((string)($table->operational_status ?? 'available')));
                if ($old === 'available') {
                    $result['reason'] = 'already_available';
                    return $result;
                }

                $updates = ['operational_status' => 'available'];

                if (in_array('operational_status_updated_at', $tableColumns, true)) {
                    $updates['operational_status_updated_at'] = now();
                }
                if (in_array('operational_status_updated_by', $tableColumns, true)) {
                    $updates['operational_status_updated_by'] = $this->currentUserId();
                }
                if (in_array('updated_at', $tableColumns, true)) {
                    $updates['updated_at'] = now();
                }

                DB::table('tables')->where($pk, $tableId)->update($updates);

                if (Schema::hasTable('pmd_table_status_history')) {
                    $historyColumns = Schema::getColumnListing('pmd_table_status_history');
                    $history = [
                        'table_id' => $tableId,
                        'old_status' => $old ?: 'occupied',
                        'new_status' => 'available',
                        'reason' => 'full_payment_completed',
                        'actor_id' => $this->currentUserId(),
                        'order_id' => (int)$order->getKey(),
                        'context' => json_encode([
                            'source' => 'cashier_payment_r44',
                            'settlement_status' => (string)($order->settlement_status ?? ''),
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    $history = array_intersect_key(
                        $history,
                        array_flip($historyColumns)
                    );

                    if ($history) {
                        DB::table('pmd_table_status_history')->insert($history);
                    }
                }

                $result['released'] = true;
                $result['reason'] = 'last_open_check_fully_paid';
                return $result;
            });
        } catch (\Throwable $error) {
            logger()->warning('R44 table release after settlement failed', [
                'order_id' => $order ? (int)$order->getKey() : null,
                'message' => $error->getMessage(),
            ]);

            $result['reason'] = 'release_failed';
            return $result;
        }
    }

}
