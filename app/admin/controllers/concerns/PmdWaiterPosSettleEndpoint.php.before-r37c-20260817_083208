<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\TerminalPaymentService;
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
                return response()->json([
                    'ok' => true,
                    'duplicate' => true,
                    'message' => 'This payment was already recorded.',
                    'transaction_id' => (int)$existing->id,
                    'summary' => $fresh ? $this->buildPaymentSummary($fresh) : null,
                    'receipt_url' => '/admin/orders/split-receipt/'.(int)$existing->id,
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
                if (Schema::hasColumn('orders', 'status_id') && $newStatus === 'paid') {
                    $paidStatus = $this->paidStatusId();
                    if ($paidStatus) {
                        $order->status_id = $paidStatus;
                    }
                }
                $order->save();

                $order->refresh();
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
                ];
            });

            if (!empty($result['already_paid'])) {
                return response()->json([
                    'ok' => true,
                    'already_paid' => true,
                    'message' => 'Order is already fully paid.',
                    'summary' => $result['summary'],
                ]);
            }

            return response()->json([
                'ok' => true,
                'message' => $result['settlement_status'] === 'paid'
                    ? 'Payment completed. The order is fully paid.'
                    : 'Partial payment recorded.',
                'transaction_id' => $result['transaction_id'],
                'receipt_url' => '/admin/orders/split-receipt/'.$result['transaction_id'],
                'paid_amount' => $result['paid_amount'],
                'settled_base_amount' => $result['settled_base_amount'],
                'tip_amount' => $result['tip_amount'],
                'coupon_discount' => $result['coupon_discount'],
                'cash_received' => $result['cash_received'],
                'change_due' => $result['change_due'],
                'settlement_status' => $result['settlement_status'],
                'remaining_amount' => $result['remaining_amount'],
                'summary' => $result['summary'],
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

}
