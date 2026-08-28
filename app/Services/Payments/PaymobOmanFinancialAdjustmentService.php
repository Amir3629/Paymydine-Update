<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PAYMOB_OMAN_FINAL_TOTALS_R11
 *
 * CanonicalProviderSettlementService protects the principal order balance. Once
 * that balance reaches paid, this adapter deterministically rebuilds final tip,
 * coupon, paid transaction sum and displayed order total from canonical payment
 * transactions. Re-running it is idempotent.
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

            $totalRow = DB::table('order_totals')->where('order_id', $orderId)->where('code', 'total')->first();
            $currentTotal = round(max(0, (float)($totalRow->value ?? $order->order_total ?? 0)), 4);
            $existingTip = round(max(0, (float)(DB::table('order_totals')->where('order_id', $orderId)->where('code', 'tip')->value('value') ?? 0)), 4);
            $existingCoupon = round((float)DB::table('order_totals')->where('order_id', $orderId)
                ->whereIn('code', ['discount', 'coupon'])
                ->get()
                ->sum(fn ($row) => abs((float)($row->value ?? 0))), 4);

            // If this function already adjusted the order, remove the old derived
            // rows first to recover the original base total. Otherwise both are 0.
            $baseTotal = round(max(0, $currentTotal - $existingTip + $existingCoupon), 4);
            $finalTotal = round(max(0, $baseTotal + $tipSum - $couponSum), 4);

            $this->upsertTotal($orderId, 'tip', 'Tip', $tipSum, 960);
            $this->upsertTotal($orderId, 'discount', 'Discount', -$couponSum, 970);
            $this->upsertTotal($orderId, 'total', 'Total', $finalTotal, 999);

            $orderColumns = Schema::getColumnListing('orders');
            $update = [];
            if (in_array('order_total', $orderColumns, true)) $update['order_total'] = $finalTotal;
            if (in_array('settled_amount', $orderColumns, true)) $update['settled_amount'] = $paidSum > 0 ? $paidSum : $finalTotal;
            if (in_array('settlement_status', $orderColumns, true)) $update['settlement_status'] = 'paid';
            if (in_array('updated_at', $orderColumns, true)) $update['updated_at'] = now();
            if ($update) DB::table('orders')->where('order_id', $orderId)->update($update);

            return [
                'ok' => true,
                'adjusted' => true,
                'base_total' => $baseTotal,
                'tip_total' => $tipSum,
                'coupon_total' => $couponSum,
                'final_total' => $finalTotal,
                'paid_transaction_sum' => $paidSum,
            ];
        });
    }

    private function upsertTotal(int $orderId, string $code, string $title, float $value, int $priority): void
    {
        $columns = Schema::getColumnListing('order_totals');
        $values = [
            'title' => $title,
            'value' => round($value, 4),
            'priority' => $priority,
        ];
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
