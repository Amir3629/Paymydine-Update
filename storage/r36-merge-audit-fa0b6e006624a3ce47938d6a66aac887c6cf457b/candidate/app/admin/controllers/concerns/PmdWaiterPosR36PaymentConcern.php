<?php

namespace Admin\Controllers\Concerns;

use App\Services\Financial\BillingGroupPaymentService;
use App\Services\Financial\BillingGroupService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait PmdWaiterPosR36PaymentConcern
{
    public function paymentSummary($orderId = null)
    {
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        try {
            $summary = $this->buildPaymentSummary($order);
        } catch (\Throwable $e) {
            report($e);
            try {
                $summary = $this->buildPaymentSummaryFallback($order, $e);
            } catch (\Throwable $fallbackError) {
                report($fallbackError);
                return response()->json([
                    'ok' => false,
                    'message' => 'Payment details could not be loaded. The payment window can be retried without leaving the order.',
                    'diagnostic_code' => class_basename($fallbackError),
                ], 503);
            }
        }

        $group = $this->pmdR36GroupForOrder((int)$order->getKey());
        if (!$group) return response()->json($summary);

        return response()->json($this->pmdR36DecorateSummary($summary, $group));
    }

    public function settlePayment($orderId = null)
    {
        $orderId = (int)$orderId;
        $group = $this->pmdR36GroupForOrder($orderId);
        if (!$group) {
            return $this->settlePaymentLegacy($orderId);
        }

        $this->assertPaymentPermission();
        $payload = $this->requestPayload();
        $idempotencyKey = trim((string)($payload['idempotency_key'] ?? ''));
        if ($idempotencyKey === '') {
            return response()->json(['ok' => false, 'message' => 'Missing payment idempotency key.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($orderId, $group, $payload, $idempotencyKey) {
                $order = \Admin\Models\Orders_model::query()
                    ->where('order_id', $orderId)
                    ->lockForUpdate()
                    ->first();
                if (!$order) throw ValidationException::withMessages(['order' => 'Order not found.']);

                $lockedGroup = DB::table('pmd_billing_groups')
                    ->where('id', (int)$group->id)
                    ->lockForUpdate()
                    ->first();
                if (!$lockedGroup || (string)$lockedGroup->mode !== 'r36') {
                    throw ValidationException::withMessages(['payment' => 'Final Bill authority changed. Refresh before collecting payment.']);
                }
                if ((string)$lockedGroup->status !== 'open') {
                    throw ValidationException::withMessages(['payment' => 'This Final Bill is already closed.']);
                }

                $groups = app(BillingGroupService::class);
                $groupSummary = $groups->summaryForPublicId((string)$lockedGroup->public_id);
                if (!$groupSummary) throw ValidationException::withMessages(['payment' => 'Final Bill could not be refreshed.']);
                if (($groupSummary['paymentStatus'] ?? '') === 'reconciliation_required') {
                    throw ValidationException::withMessages(['payment' => 'A provider-confirmed payment requires reconciliation before another payment can be recorded.']);
                }

                $remaining = max(0, ((int)$groupSummary['remainingCents']) / 100);
                if ($remaining <= 0.0001) {
                    return ['already_paid' => true, 'group' => $lockedGroup, 'summary' => $groupSummary];
                }

                $expectedRemaining = array_key_exists('expected_remaining', $payload)
                    ? round((float)$payload['expected_remaining'], 4)
                    : null;
                if ($expectedRemaining !== null && abs($expectedRemaining - $remaining) > 0.02) {
                    throw ValidationException::withMessages(['payment' => 'The Final Bill balance changed. Refresh before collecting money.']);
                }

                $method = strtolower(trim((string)($payload['payment_method'] ?? '')));
                if (!in_array($method, ['cash', 'external_terminal', 'manual_card'], true)) {
                    throw ValidationException::withMessages(['payment_method' => 'Choose Cash or a manually confirmed external terminal payment.']);
                }

                $reference = trim((string)($payload['payment_reference'] ?? ''));
                if (in_array($method, ['external_terminal', 'manual_card'], true)) {
                    if (empty($payload['external_confirmed'])) {
                        throw ValidationException::withMessages(['external_confirmed' => 'Confirm that the external terminal approved the payment.']);
                    }
                    if ($reference === '') {
                        throw ValidationException::withMessages(['payment_reference' => 'Enter the terminal receipt or approval reference.']);
                    }
                }

                $splitMode = strtolower(trim((string)($payload['split_mode'] ?? 'full')));
                $baseAmount = round(max(0, (float)($payload['amount'] ?? $remaining)), 4);
                if ($baseAmount <= 0 || $baseAmount > $remaining + 0.02) {
                    throw ValidationException::withMessages(['amount' => 'Invalid Final Bill payment amount.']);
                }

                $allocations = null;
                if ($splitMode === 'items') {
                    $childSummary = $this->buildPaymentSummary($order, true);
                    $allocation = $this->resolvePaymentAllocation($childSummary, $payload);
                    $baseAmount = round((float)$allocation['gross_amount'], 4);
                    if ($baseAmount <= 0 || $baseAmount > $remaining + 0.02) {
                        throw ValidationException::withMessages(['amount' => 'Invalid selected-item payment amount.']);
                    }
                    $allocations = [[
                        'order_id' => $orderId,
                        'base_cents' => (int)round($baseAmount * 100),
                        'selected_items' => is_array($payload['selected_items'] ?? null) ? $payload['selected_items'] : null,
                    ]];
                }

                $tipAmount = max(0, round((float)($payload['tip_amount'] ?? 0), 4));
                $couponCode = strtoupper(trim((string)($payload['coupon_code'] ?? '')));
                $couponDiscount = 0.0;
                if ($couponCode !== '') {
                    if (abs($baseAmount - $remaining) > 0.02) {
                        throw ValidationException::withMessages(['coupon_code' => 'Coupons can only be applied when paying the full Final Bill balance.']);
                    }
                    $coupon = $this->couponResult($couponCode, $baseAmount);
                    if (!$coupon['ok']) {
                        throw ValidationException::withMessages(['coupon_code' => (string)$coupon['message']]);
                    }
                    $couponDiscount = round((float)$coupon['discount'], 4);
                }

                $payable = round(max(0, $baseAmount + $tipAmount - $couponDiscount), 4);
                if ($payable <= 0) throw ValidationException::withMessages(['amount' => 'Payable amount must be greater than zero.']);

                $cashReceived = null;
                if ($method === 'cash') {
                    $cashReceived = array_key_exists('cash_received', $payload)
                        ? round((float)$payload['cash_received'], 4)
                        : $payable;
                    if ($cashReceived + 0.0001 < $payable) {
                        throw ValidationException::withMessages(['cash_received' => 'Cash received is lower than the amount due.']);
                    }
                }

                $reserve = [
                    'table_id' => (string)$lockedGroup->table_id,
                    'idempotency_key' => $idempotencyKey,
                    'method' => $method,
                    'provider' => trim((string)($payload['provider_code'] ?? '')) ?: ($method === 'cash' ? 'cash' : 'external_terminal'),
                    'principal_cents' => (int)round($baseAmount * 100),
                    'tip_cents' => (int)round($tipAmount * 100),
                    'discount_cents' => (int)round($couponDiscount * 100),
                    'coupon_code' => $couponCode !== '' ? $couponCode : null,
                    'payer_label' => trim((string)($payload['payer_label'] ?? '')) ?: 'Staff payment',
                ];
                if ($allocations) $reserve['allocations'] = $allocations;

                $payments = app(BillingGroupPaymentService::class);
                $reservation = $payments->reserve((string)$lockedGroup->public_id, $reserve);
                $settleInput = [
                    'provider_reference' => $reference !== '' ? $reference : null,
                    'provider_confirmed' => $method !== 'cash',
                    'provider_evidence' => [
                        'source' => 'waiter_pos_r36',
                        'staff_confirmed' => $method !== 'cash',
                    ],
                ];
                if ($cashReceived !== null) {
                    $settleInput['cash_received_cents'] = (int)round($cashReceived * 100);
                }
                $settled = $payments->settle((string)$reservation['paymentId'], $settleInput);

                $freshGroup = $groups->summaryForPublicId((string)$lockedGroup->public_id) ?? $groupSummary;
                $changeDue = $cashReceived === null ? 0 : max(0, round($cashReceived - $payable, 4));

                return [
                    'already_paid' => false,
                    'group' => $lockedGroup,
                    'summary' => $freshGroup,
                    'payment' => $settled,
                    'paid_amount' => $payable,
                    'settled_base_amount' => $baseAmount,
                    'tip_amount' => $tipAmount,
                    'coupon_discount' => $couponDiscount,
                    'cash_received' => $cashReceived,
                    'change_due' => $changeDue,
                ];
            });

            $order = $this->findOrder($orderId);
            $legacySummary = $order ? $this->buildPaymentSummary($order) : ['ok' => true];
            $summary = $this->pmdR36DecorateSummary($legacySummary, $result['group']);

            if (!empty($result['already_paid'])) {
                return response()->json([
                    'ok' => true,
                    'already_paid' => true,
                    'message' => 'Final Bill is already fully paid.',
                    'settlement_status' => 'paid',
                    'remaining_amount' => 0,
                    'summary' => $summary,
                ]);
            }

            $paymentStatus = (string)($result['summary']['paymentStatus'] ?? 'unpaid');
            return response()->json([
                'ok' => true,
                'message' => $paymentStatus === 'paid' ? 'Payment completed. The Final Bill is fully paid.' : 'Partial Final Bill payment recorded.',
                'billing_group_payment_id' => $result['payment']['paymentId'] ?? null,
                'paid_amount' => $result['paid_amount'],
                'settled_base_amount' => $result['settled_base_amount'],
                'tip_amount' => $result['tip_amount'],
                'coupon_discount' => $result['coupon_discount'],
                'cash_received' => $result['cash_received'],
                'change_due' => $result['change_due'],
                'settlement_status' => $paymentStatus === 'paid' ? 'paid' : 'partial',
                'remaining_amount' => max(0, ((int)($result['summary']['remainingCents'] ?? 0)) / 100),
                'summary' => $summary,
                'table_release' => [
                    'released' => false,
                    'reason' => 'manual_table_release_required_r45',
                ],
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

    public function terminalPayment($orderId = null, \App\Services\TerminalPayments\TerminalPaymentService $service = null)
    {
        $group = $this->pmdR36GroupForOrder((int)$orderId);
        if ($group) {
            return response()->json([
                'ok' => false,
                'message' => 'Connected terminal direct-settlement is disabled for R36 Final Bills. Use External terminal (approved reference) or the secure customer checkout so the Billing Group remains atomic.',
                'r36_final_bill' => true,
            ], 422);
        }
        return $this->terminalPaymentLegacy($orderId, $service);
    }

    private function pmdR36GroupForOrder(int $orderId)
    {
        if (!BillingGroupService::schemaReady() || $orderId < 1) return null;
        $link = DB::table('pmd_billing_group_orders')->where('order_id', $orderId)->first();
        if (!$link) return null;
        $group = DB::table('pmd_billing_groups')->where('id', (int)$link->billing_group_id)->first();
        return $group && (string)$group->mode === 'r36' ? $group : null;
    }

    private function pmdR36DecorateSummary(array $summary, $group): array
    {
        $fresh = app(BillingGroupService::class)->summaryForPublicId((string)$group->public_id);
        if (!$fresh) return $summary;

        $component = app(BillingGroupService::class)->componentState((int)$group->id, false);
        $settlement = is_array($summary['settlement'] ?? null) ? $summary['settlement'] : [];
        $settlement['child_order_total'] = $settlement['order_total'] ?? null;
        $settlement['child_remaining_amount'] = $settlement['remaining_amount'] ?? null;
        $settlement['order_total'] = ((int)$fresh['totalCents']) / 100;
        $settlement['settled_amount'] = ((int)$fresh['paidCents']) / 100;
        $settlement['remaining_amount'] = ((int)$fresh['remainingCents']) / 100;
        $settlement['status'] = (string)$fresh['paymentStatus'];
        $summary['settlement'] = $settlement;
        $summary['billing_group'] = [
            'public_id' => (string)$fresh['publicId'],
            'mode' => (string)$fresh['mode'],
            'status' => (string)$fresh['status'],
            'payment_status' => (string)$fresh['paymentStatus'],
            'currency' => (string)$fresh['currency'],
            'subtotal_amount' => ((int)$fresh['subtotalCents']) / 100,
            'service_charge_amount' => ((int)$fresh['serviceChargeCents']) / 100,
            'service_remaining_amount' => ((int)($component['service_component_remaining_cents'] ?? 0)) / 100,
            'total_amount' => ((int)$fresh['totalCents']) / 100,
            'paid_amount' => ((int)$fresh['paidCents']) / 100,
            'remaining_amount' => ((int)$fresh['remainingCents']) / 100,
            'reconciliation_required' => (string)$fresh['paymentStatus'] === 'reconciliation_required',
        ];
        return $summary;
    }
}
