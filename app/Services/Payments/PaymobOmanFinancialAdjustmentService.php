<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PAYMOB_OMAN_FINAL_TOTALS_R11
 *
 * Applies the Paymob attempt's tip/coupon contribution exactly once per PMD
 * order, including partial payments. When the order is fully paid, the final
 * displayed total is the sum of successful canonical payment transactions.
 */
final class PaymobOmanFinancialAdjustmentService
{
    public function finalizeIfPaid(int $orderId, ?int $attemptId = null): array
    {
        if ($orderId < 1 || !Schema::hasTable('orders')) return ['ok' => false, 'message' => 'Order is unavailable.'];
        if (!Schema::hasTable('order_payment_transactions') || !Schema::hasTable('order_totals')) {
            return ['ok' => true, 'adjusted' => false, 'reason' => 'canonical_tables_unavailable'];
        }

        return DB::transaction(function () use ($orderId, $attemptId) {
            $attempt = null;
            $adjustmentState = [];
            $stateKey = (string)$orderId;

            if ($attemptId !== null && $attemptId > 0 && Schema::hasTable(PaymobOmanPaymentAttemptService::TABLE)) {
                $attempt = DB::table(PaymobOmanPaymentAttemptService::TABLE)
                    ->where('id', $attemptId)
                    ->lockForUpdate()
                    ->first();
                if (!$attempt) return ['ok' => false, 'adjusted' => false, 'reason' => 'attempt_not_found'];

                $decoded = json_decode((string)($attempt->financial_adjustment_state ?? ''), true);
                $adjustmentState = is_array($decoded) ? $decoded : [];
                if (($adjustmentState[$stateKey]['applied'] ?? false) === true) {
                    return [
                        'ok' => true,
                        'adjusted' => false,
                        'reason' => 'already_applied',
                        'order_id' => $orderId,
                        'attempt_id' => $attemptId,
                    ];
                }
            }

            $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if (!$order) return ['ok' => false, 'message' => 'Order is unavailable.'];

            [$attemptTip, $attemptCoupon] = $this->attemptAdjustmentForOrder($attempt, $orderId);
            $existingTip = round(max(0, (float)(DB::table('order_totals')
                ->where('order_id', $orderId)->where('code', 'tip')->value('value') ?? 0)), 4);
            // Do not fold a legacy `coupon` row into the `discount` row; preserving
            // separate existing order discounts avoids double-rendering historical data.
            $existingDiscount = round(abs((float)(DB::table('order_totals')
                ->where('order_id', $orderId)->where('code', 'discount')->value('value') ?? 0)), 4);

            if ($attemptTip > 0) {
                $this->upsertTotal($orderId, 'tip', 'Tip', round($existingTip + $attemptTip, 4), 3, 1);
            }
            if ($attemptCoupon > 0) {
                $this->upsertTotal($orderId, 'discount', 'Discount', -round($existingDiscount + $attemptCoupon, 4), 4, 1);
            }

            if ($attempt) {
                $adjustmentState[$stateKey] = [
                    'applied' => true,
                    'tip_amount' => $attemptTip,
                    'coupon_discount' => $attemptCoupon,
                    'applied_at' => now()->toIso8601String(),
                ];
                DB::table(PaymobOmanPaymentAttemptService::TABLE)->where('id', (int)$attempt->id)->update([
                    'financial_adjustment_state' => json_encode($adjustmentState, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                ]);
            }

            $settlementStatus = strtolower(trim((string)($order->settlement_status ?? 'unpaid')));
            if ($settlementStatus !== 'paid') {
                return [
                    'ok' => true,
                    'adjusted' => $attemptTip > 0 || $attemptCoupon > 0,
                    'order_id' => $orderId,
                    'attempt_id' => $attemptId,
                    'settlement_status' => $settlementStatus,
                    'tip_added' => $attemptTip,
                    'coupon_added' => $attemptCoupon,
                    'final_total_changed' => false,
                ];
            }

            $txColumns = Schema::getColumnListing('order_payment_transactions');
            $query = DB::table('order_payment_transactions')->where('order_id', $orderId);
            if (in_array('settlement_status', $txColumns, true)) {
                $query->whereNotIn('settlement_status', ['failed', 'cancelled', 'canceled']);
            }
            $paidSum = round((float)$query->get()->sum(fn ($row) => max(0, (float)($row->amount ?? 0))), 4);
            $currentTotal = round(max(0, (float)(
                DB::table('order_totals')->where('order_id', $orderId)->where('code', 'total')->value('value')
                ?? $order->order_total
                ?? 0
            )), 4);
            $finalTotal = $paidSum > 0 ? $paidSum : $currentTotal;
            $this->upsertTotal($orderId, 'total', 'Total', $finalTotal, 99, 0);

            $orderColumns = Schema::getColumnListing('orders');
            $update = [];
            if (in_array('order_total', $orderColumns, true)) $update['order_total'] = $finalTotal;
            if (in_array('settled_amount', $orderColumns, true)) $update['settled_amount'] = $finalTotal;
            if (in_array('settlement_status', $orderColumns, true)) $update['settlement_status'] = 'paid';
            if (in_array('updated_at', $orderColumns, true)) $update['updated_at'] = now();
            if ($update) DB::table('orders')->where('order_id', $orderId)->update($update);

            return [
                'ok' => true,
                'adjusted' => true,
                'order_id' => $orderId,
                'attempt_id' => $attemptId,
                'settlement_status' => 'paid',
                'tip_added' => $attemptTip,
                'coupon_added' => $attemptCoupon,
                'final_total' => $finalTotal,
                'paid_transaction_sum' => $paidSum,
                'final_total_changed' => true,
            ];
        });
    }

    private function attemptAdjustmentForOrder(?object $attempt, int $orderId): array
    {
        if (!$attempt) return [0.0, 0.0];

        $allocations = json_decode((string)($attempt->order_allocations ?? ''), true);
        if (is_array($allocations) && $allocations) {
            foreach ($allocations as $allocation) {
                if (!is_array($allocation) || (int)($allocation['order_id'] ?? 0) !== $orderId) continue;
                return [
                    round(max(0, (float)($allocation['tip_amount'] ?? 0)), 4),
                    round(max(0, (float)($allocation['coupon_discount'] ?? 0)), 4),
                ];
            }
        }

        if ((int)($attempt->order_id ?? 0) === $orderId) {
            return [
                round(max(0, (float)($attempt->tip_amount ?? 0)), 4),
                round(max(0, (float)($attempt->coupon_discount ?? 0)), 4),
            ];
        }

        return [0.0, 0.0];
    }

    private function upsertTotal(
        int $orderId,
        string $code,
        string $title,
        float $value,
        int $priority,
        int $isSummable
    ): void {
        $columns = Schema::getColumnListing('order_totals');
        $values = [
            'title' => $title,
            'value' => round($value, 4),
            'priority' => $priority,
        ];
        if (in_array('is_summable', $columns, true)) $values['is_summable'] = $isSummable;
        if (in_array('updated_at', $columns, true)) $values['updated_at'] = now();

        $existing = DB::table('order_totals')->where('order_id', $orderId)->where('code', $code)->first();
        if ($existing) {
            DB::table('order_totals')->where('order_id', $orderId)->where('code', $code)
                ->update(array_intersect_key($values, array_flip($columns)));
            return;
        }

        $insert = ['order_id' => $orderId, 'code' => $code] + $values;
        if (in_array('created_at', $columns, true)) $insert['created_at'] = now();
        DB::table('order_totals')->insert(array_intersect_key($insert, array_flip($columns)));
    }
}
