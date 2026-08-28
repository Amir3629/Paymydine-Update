<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PAYMOB_OMAN_FINAL_TOTALS_R11
 *
 * CanonicalProviderSettlementService protects the principal order balance. Once
 * that balance reaches paid, this adapter deterministically rebuilds final tip,
 * coupon and displayed paid total from canonical payment transactions.
 * Re-running it is idempotent.
 */
final class PaymobOmanFinancialAdjustmentService
{
    public function finalizeIfPaid(int $orderId): array
    {
        if ($orderId < 1 || !Schema::hasTable('orders')) return ['ok' => false, 'message' => 'Order is unavailable.'];

        return DB::transaction(function () use ($orderId) {
            $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if (!$order) return ['ok' => false, 'message' => 'Order is unavailable.'];
            if (strtolower(trim((string)($order->settlement_status ?? ''))) !== 'paid') {
                return ['ok' => true, 'adjusted' => false, 'reason' => 'order_not_fully_paid'];
            }
            if (!Schema::hasTable('order_payment_transactions') || !Schema::hasTable('order_totals')) {
                return ['ok' => true, 'adjusted' => false, 'reason' => 'canonical_tables_unavailable'];
            }

            $txColumns = Schema::getColumnListing('order_payment_transactions');
            $query = DB::table('order_payment_transactions')->where('order_id', $orderId);
            if (in_array('settlement_status', $txColumns, true)) {
                $query->whereNotIn('settlement_status', ['failed', 'cancelled', 'canceled']);
            }
            $transactions = $query->get();
            $paidSum = round((float)$transactions->sum(fn ($row) => max(0, (float)($row->amount ?? 0))), 4);
            $tipSum = in_array('tip_amount', $txColumns, true)
                ? round((float)$transactions->sum(fn ($row) => max(0, (float)($row->tip_amount ?? 0))), 4)
                : 0.0;
            $couponSum = in_array('coupon_discount', $txColumns, true)
                ? round((float)$transactions->sum(fn ($row) => max(0, (float)($row->coupon_discount ?? 0))), 4)
                : 0.0;

            $currentTotal = round(max(0, (float)(
                DB::table('order_totals')->where('order_id', $orderId)->where('code', 'total')->value('value')
                ?? $order->order_total
                ?? 0
            )), 4);

            // The authoritative final paid total is the sum of successful canonical
            // payment transactions. This remains correct across partial/mixed-provider
            // payments and avoids re-applying old tip/discount rows on retry.
            $finalTotal = $paidSum > 0 ? $paidSum : $currentTotal;

            if ($tipSum > 0 || DB::table('order_totals')->where('order_id', $orderId)->where('code', 'tip')->exists()) {
                $this->upsertTotal($orderId, 'tip', 'Tip', $tipSum, 3, 1);
            }
            if ($couponSum > 0 || DB::table('order_totals')->where('order_id', $orderId)->whereIn('code', ['discount', 'coupon'])->exists()) {
                $this->upsertTotal($orderId, 'discount', 'Discount', -$couponSum, 4, 1);
            }
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
                'tip_total' => $tipSum,
                'coupon_total' => $couponSum,
                'final_total' => $finalTotal,
                'paid_transaction_sum' => $paidSum,
            ];
        });
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
