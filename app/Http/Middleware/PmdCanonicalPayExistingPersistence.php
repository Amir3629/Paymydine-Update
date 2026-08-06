<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

/**
 * PMD_PAY_EXISTING_CANONICAL_PERSISTENCE_V1
 *
 * Keeps the existing pay-existing endpoint as the payment authority while
 * persisting its tip/coupon/payment result into the canonical order records used
 * by Admin, invoices, and Dashboard2 after tenant resolution.
 */
class PmdCanonicalPayExistingPersistence
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->isMethod('post') || trim($request->path(), '/') !== 'api/v1/orders/pay-existing') {
            return $next($request);
        }

        // Request phase: no database access here. TenantDatabaseMiddleware runs
        // later in the route stack and switches the active restaurant database.
        $request->merge(array_merge(
            $this->normalizeAdjustments($request),
            ['payment_reference' => $this->normalizeReference($request->input('payment_reference'))]
        ));

        $response = $next($request);
        $payload = $this->responsePayload($response);

        if ($response->getStatusCode() >= 400 || !($payload['success'] ?? false) || ($payload['already_paid'] ?? false)) {
            return $response;
        }

        // Response phase: tenant resolution has completed and the default DB
        // connection is the active restaurant. Persist auxiliary accounting
        // data in its own transaction without turning an already successful
        // payment into a retry/double-charge risk.
        try {
            DB::transaction(function () use ($request, $payload) {
                $this->persistCanonicalPayment($request, $payload);
            });
        } catch (\Throwable $e) {
            Log::critical('PMD canonical pay-existing persistence failed after payment success', [
                'order_id' => (int)$request->input('order_id', 0),
                'database' => DB::connection()->getDatabaseName(),
                'message' => $e->getMessage(),
            ]);
        }

        return $response;
    }

    protected function normalizeAdjustments(Request $request): array
    {
        $tipAmount = $this->money($request->input('tip_amount', 0));
        $couponDiscount = $this->money($request->input('coupon_discount', 0));

        if (!$request->filled('amount')) {
            return [
                'tip_amount' => $tipAmount,
                'coupon_discount' => $couponDiscount,
            ];
        }

        $requestedAmount = $this->money($request->input('amount', 0));

        // Reconstruct the item/order principal from the submitted equation:
        // charge = principal + tip - coupon. A coupon may discount principal,
        // but it must never consume a voluntary tip.
        $principalAmount = $this->money(
            $requestedAmount - $tipAmount + $couponDiscount
        );
        $couponDiscount = min($couponDiscount, $principalAmount);
        $payableAmount = $this->money(
            $principalAmount + $tipAmount - $couponDiscount
        );

        return [
            'amount' => $payableAmount > 0 ? $payableAmount : null,
            'tip_amount' => $tipAmount,
            'coupon_discount' => $couponDiscount,
        ];
    }

    protected function responsePayload(Response $response): array
    {
        if ($response instanceof JsonResponse) {
            $data = $response->getData(true);
            return is_array($data) ? $data : [];
        }

        $decoded = json_decode((string)$response->getContent(), true);
        return is_array($decoded) ? $decoded : [];
    }

    protected function normalizeReference($value): ?string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return null;
        }

        $value = trim((string)$value);
        if ($value === '' || in_array(strtolower($value), [
            '[object object]',
            'object object',
            'null',
            'undefined',
        ], true)) {
            return null;
        }

        return mb_substr($value, 0, 255);
    }

    protected function persistCanonicalPayment(Request $request, array $payload): void
    {
        $orderId = (int)($payload['order_id'] ?? $request->input('order_id', 0));
        if ($orderId <= 0) {
            throw new \RuntimeException('Canonical payment persistence requires an order_id.');
        }

        $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
        if (!$order) {
            throw new \RuntimeException('Canonical payment order was not found.');
        }

        $tipAmount = $this->money($payload['tip_amount'] ?? $request->input('tip_amount', 0));
        $couponDiscount = $this->money($payload['coupon_discount'] ?? $request->input('coupon_discount', 0));
        $couponCode = trim((string)$request->input('coupon_code', ''));
        $paymentReference = $this->normalizeReference($request->input('payment_reference'));
        $transactionId = (int)($payload['transaction_id'] ?? 0);

        $baseRow = DB::table('order_totals')
            ->where('order_id', $orderId)
            ->where('code', 'payment_base')
            ->lockForUpdate()
            ->first();

        $totalRow = DB::table('order_totals')
            ->where('order_id', $orderId)
            ->where('code', 'total')
            ->lockForUpdate()
            ->first();

        $baseTotal = $this->money($baseRow->value ?? $totalRow->value ?? $order->order_total ?? 0);
        $this->upsertOrderTotal($orderId, 'payment_base', 'Payment base', $baseTotal, 0, 0);

        $existingTip = $this->money(DB::table('order_totals')
            ->where('order_id', $orderId)
            ->where('code', 'tip')
            ->value('value'));
        $existingCoupon = abs(round((float) DB::table('order_totals')
            ->where('order_id', $orderId)
            ->where('code', 'discount')
            ->sum('value'), 4));

        $aggregateTip = $this->money($existingTip + $tipAmount);
        $aggregateCoupon = $this->money($existingCoupon + $couponDiscount);

        if ($aggregateTip > 0) {
            $this->upsertOrderTotal($orderId, 'tip', 'Tip', $aggregateTip, 3, 1);
        }

        if ($aggregateCoupon > 0) {
            $title = 'Coupon'.($couponCode !== '' ? ' ('.$couponCode.')' : '');
            $this->upsertOrderTotal($orderId, 'discount', $title, -$aggregateCoupon, 4, 1);
        }

        // order_totals.value is decimal; textual references never belong here.
        DB::table('order_totals')
            ->where('order_id', $orderId)
            ->where('code', 'payment_reference')
            ->delete();

        if ($transactionId > 0 && Schema::hasTable('order_payment_transactions')) {
            $transactionUpdate = [];
            if (Schema::hasColumn('order_payment_transactions', 'tip_amount')) {
                $transactionUpdate['tip_amount'] = $tipAmount;
            }
            if (Schema::hasColumn('order_payment_transactions', 'coupon_discount')) {
                $transactionUpdate['coupon_discount'] = $couponDiscount;
            }
            if (Schema::hasColumn('order_payment_transactions', 'coupon_code')) {
                $transactionUpdate['coupon_code'] = $couponCode !== '' ? $couponCode : null;
            }
            if (Schema::hasColumn('order_payment_transactions', 'payment_reference')) {
                $transactionUpdate['payment_reference'] = $paymentReference;
            }
            if (!empty($transactionUpdate)) {
                DB::table('order_payment_transactions')->where('id', $transactionId)->update($transactionUpdate);
            }
        }

        $orderUpdate = [];
        if (Schema::hasColumn('orders', 'settlement_reference')) {
            $orderUpdate['settlement_reference'] = $paymentReference;
        }

        $settlementStatus = strtolower((string)($payload['settlement_status'] ?? ''));
        if ($settlementStatus === 'paid') {
            $finalTotal = $this->money(max(0, $baseTotal + $aggregateTip - $aggregateCoupon));
            $actualPaidTotal = $this->money($payload['paid_amount'] ?? 0);

            if (Schema::hasTable('order_payment_transactions')) {
                $transactionPaidTotal = $this->money(DB::table('order_payment_transactions')
                    ->where('order_id', $orderId)
                    ->whereNotIn('settlement_status', ['failed', 'cancelled'])
                    ->sum('amount'));
                if ($transactionPaidTotal > 0) {
                    $actualPaidTotal = $transactionPaidTotal;
                }
            }

            $this->upsertOrderTotal($orderId, 'total', 'Total', $finalTotal, 99, 0);
            $orderUpdate['order_total'] = $finalTotal;

            if (Schema::hasColumn('orders', 'settled_amount')) {
                $orderUpdate['settled_amount'] = $actualPaidTotal > 0 ? $actualPaidTotal : $finalTotal;
            }
        }

        if (!empty($orderUpdate)) {
            $orderUpdate['updated_at'] = now();
            DB::table('orders')->where('order_id', $orderId)->update($orderUpdate);
        }

        Log::info('PMD canonical pay-existing payment persisted', [
            'order_id' => $orderId,
            'transaction_id' => $transactionId ?: null,
            'tip_amount' => $tipAmount,
            'coupon_discount' => $couponDiscount,
            'settlement_status' => $settlementStatus,
        ]);
    }

    protected function upsertOrderTotal(
        int $orderId,
        string $code,
        string $title,
        float $value,
        int $priority,
        int $isSummable
    ): void {
        $values = [
            'title' => $title,
            'value' => $value,
            'priority' => $priority,
        ];

        if (Schema::hasColumn('order_totals', 'is_summable')) {
            $values['is_summable'] = $isSummable;
        }

        DB::table('order_totals')->updateOrInsert([
            'order_id' => $orderId,
            'code' => $code,
        ], $values);
    }

    protected function money($value): float
    {
        $value = is_numeric($value) ? (float)$value : 0.0;
        return round(max(0, $value), 4);
    }
}
