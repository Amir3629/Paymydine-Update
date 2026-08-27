<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_CANONICAL_PROVIDER_SETTLEMENT_R11
 *
 * One server-side authority for payments that have already been independently
 * verified with a payment provider. Provider callbacks/inquiry may call this;
 * browser redirects may not. Kitchen status and physical table lifecycle are
 * deliberately outside this service.
 */
final class CanonicalProviderSettlementService
{
    public const VERSION = '11.0.0';

    public function settleVerified(array $payment): array
    {
        $orderId = (int)($payment['order_id'] ?? 0);
        $provider = strtolower(trim((string)($payment['provider_code'] ?? '')));
        $method = strtolower(trim((string)($payment['payment_method'] ?? '')));
        $reference = trim((string)($payment['provider_reference'] ?? ''));
        $idempotencyKey = trim((string)($payment['idempotency_key'] ?? ''));
        $currency = strtoupper(trim((string)($payment['currency'] ?? '')));
        $payableAmount = $this->money($payment['payable_amount'] ?? $payment['amount'] ?? 0);
        $principalAmount = $this->money($payment['principal_amount'] ?? $payableAmount);
        $tipAmount = $this->money($payment['tip_amount'] ?? 0);
        $couponDiscount = $this->money($payment['coupon_discount'] ?? 0);
        $couponCode = strtoupper(trim((string)($payment['coupon_code'] ?? '')));
        $splitToken = trim((string)($payment['payment_intent_token'] ?? ''));
        $selectedItems = is_array($payment['selected_items'] ?? null) ? $payment['selected_items'] : [];
        $metadata = is_array($payment['metadata'] ?? null) ? $payment['metadata'] : [];

        if ($orderId < 1) throw new \InvalidArgumentException('Verified settlement requires order_id.');
        if ($provider === '') throw new \InvalidArgumentException('Verified settlement requires provider_code.');
        if ($method === '') throw new \InvalidArgumentException('Verified settlement requires payment_method.');
        if ($reference === '') throw new \InvalidArgumentException('Verified settlement requires provider_reference.');
        if ($idempotencyKey === '') throw new \InvalidArgumentException('Verified settlement requires idempotency_key.');
        if ($payableAmount <= 0 || $principalAmount <= 0) throw new \InvalidArgumentException('Verified settlement amount must be greater than zero.');

        $result = DB::transaction(function () use (
            $orderId,
            $provider,
            $method,
            $reference,
            $idempotencyKey,
            $currency,
            $payableAmount,
            $principalAmount,
            $tipAmount,
            $couponDiscount,
            $couponCode,
            $splitToken,
            $selectedItems,
            $metadata
        ) {
            $existing = $this->existingTransaction($idempotencyKey, $provider, $reference);
            if ($existing) {
                $order = DB::table('orders')->where('order_id', $orderId)->first();
                return $this->resultFromOrder($order, (int)$existing->id, true, $payableAmount);
            }

            $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if (!$order) throw new \RuntimeException('Canonical order was not found.');

            $canonicalTotal = $this->canonicalOrderTotal($orderId, $order);
            $currentSettled = $this->money($order->settled_amount ?? 0);
            $remaining = $this->money(max(0, $canonicalTotal - $currentSettled));
            $currentStatus = strtolower(trim((string)($order->settlement_status ?? 'unpaid')));

            if (in_array($currentStatus, ['cancelled', 'failed'], true)) {
                throw new \RuntimeException('Order is not payable.');
            }

            if ($remaining <= 0.0001 || $currentStatus === 'paid') {
                return $this->resultFromOrder($order, null, true, 0.0);
            }

            $tolerance = $currency === 'OMR' ? 0.002 : 0.02;
            if ($principalAmount > $remaining + $tolerance) {
                throw new \RuntimeException('Verified provider amount exceeds the current canonical order balance.');
            }

            // A normal provider checkout always represents the full remaining
            // balance. Partial provider settlement is accepted only when PMD's
            // existing split-payment reservation is locked to this payment.
            if ($splitToken === '' && abs($principalAmount - $remaining) > $tolerance) {
                throw new \RuntimeException('Canonical order balance changed after provider checkout was created.');
            }

            $splitIntent = null;
            if ($splitToken !== '') {
                $splitIntent = $this->lockSplitIntent($splitToken, $orderId);
                $intentPrincipal = $this->money($splitIntent->principal_amount ?? 0);
                $intentPayable = $this->money($splitIntent->payable_amount ?? 0);
                if (abs($intentPrincipal - $principalAmount) > $tolerance || abs($intentPayable - $payableAmount) > $tolerance) {
                    throw new \RuntimeException('Verified provider amount does not match the reserved split payment.');
                }
            }

            $newSettled = min($canonicalTotal, $this->money($currentSettled + $principalAmount));
            $newRemaining = $this->money(max(0, $canonicalTotal - $newSettled));
            $newStatus = $newRemaining <= 0.0001 ? 'paid' : 'partial';

            $transactionId = $this->insertTransaction([
                'order_id' => $orderId,
                'payment_method' => $method,
                'provider_code' => $provider,
                'payment_reference' => $reference,
                'idempotency_key' => $idempotencyKey,
                'amount' => $payableAmount,
                'tip_amount' => $tipAmount,
                'coupon_discount' => $couponDiscount,
                'coupon_code' => $couponCode !== '' ? $couponCode : null,
                'settlement_status' => $newStatus,
                'payer_label' => 'Verified '.$provider.' payment',
                'created_by' => null,
                'notes' => $metadata ? json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                'cash_received' => null,
                'change_due' => 0,
                'paid_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($selectedItems) {
                $this->insertAllocations($transactionId, $orderId, $selectedItems);
            }

            $updates = [];
            $orderColumns = Schema::getColumnListing('orders');
            if (in_array('settlement_status', $orderColumns, true)) $updates['settlement_status'] = $newStatus;
            if (in_array('settled_amount', $orderColumns, true)) $updates['settled_amount'] = $newSettled;
            if (in_array('settlement_method', $orderColumns, true)) $updates['settlement_method'] = $method;
            if (in_array('settlement_reference', $orderColumns, true)) $updates['settlement_reference'] = $reference;
            if (in_array('settled_at', $orderColumns, true) && $newStatus === 'paid') $updates['settled_at'] = now();
            if (in_array('processed', $orderColumns, true) && $newStatus === 'paid') $updates['processed'] = 1;
            if (in_array('updated_at', $orderColumns, true)) $updates['updated_at'] = now();
            if ($updates) DB::table('orders')->where('order_id', $orderId)->update($updates);

            if ($splitIntent) {
                $intentUpdate = ['status' => 'settled'];
                if (Schema::hasColumn('pmd_guest_payment_intents', 'transaction_id')) $intentUpdate['transaction_id'] = $transactionId;
                if (Schema::hasColumn('pmd_guest_payment_intents', 'updated_at')) $intentUpdate['updated_at'] = now();
                DB::table('pmd_guest_payment_intents')->where('id', (int)$splitIntent->id)->update($intentUpdate);
            }

            $fresh = DB::table('orders')->where('order_id', $orderId)->first();
            return $this->resultFromOrder($fresh, $transactionId, false, $payableAmount, $newRemaining, $newStatus);
        });

        if (!empty($result['settled_now'])) {
            $this->writePaymentLog($orderId, $provider, $method, $reference, $payableAmount, $result, $metadata);
            if (($result['settlement_status'] ?? '') === 'paid') {
                $this->notifyPaymentSuccess($orderId, $provider, $method, $reference, (float)($result['settled_amount'] ?? 0));
            }
        }

        return $result;
    }

    private function existingTransaction(string $idempotencyKey, string $provider, string $reference): ?object
    {
        if (!Schema::hasTable('order_payment_transactions')) {
            throw new \RuntimeException('Canonical order_payment_transactions table is missing.');
        }

        $query = DB::table('order_payment_transactions');
        if (Schema::hasColumn('order_payment_transactions', 'idempotency_key')) {
            $row = (clone $query)->where('idempotency_key', $idempotencyKey)->first();
            if ($row) return $row;
        }

        $query->where('payment_reference', $reference);
        if (Schema::hasColumn('order_payment_transactions', 'provider_code')) $query->where('provider_code', $provider);
        return $query->first();
    }

    private function canonicalOrderTotal(int $orderId, object $order): float
    {
        $value = null;
        if (Schema::hasTable('order_totals')) {
            $value = DB::table('order_totals')->where('order_id', $orderId)->where('code', 'total')->value('value');
        }
        return $this->money($value ?? $order->order_total ?? 0);
    }

    private function lockSplitIntent(string $token, int $orderId): object
    {
        if (!Schema::hasTable('pmd_guest_payment_intents')) {
            throw new \RuntimeException('Split payment reservation table is unavailable.');
        }

        $intent = DB::table('pmd_guest_payment_intents')->where('token', $token)->lockForUpdate()->first();
        if (!$intent || (int)$intent->order_id !== $orderId) {
            throw new \RuntimeException('Split payment reservation was not found.');
        }
        if ((string)($intent->status ?? '') === 'settled') return $intent;
        if (!in_array((string)($intent->status ?? ''), ['pending', 'expired'], true)) {
            throw new \RuntimeException('Split payment reservation is no longer payable.');
        }
        return $intent;
    }

    private function insertTransaction(array $values): int
    {
        if (!Schema::hasTable('order_payment_transactions')) {
            throw new \RuntimeException('Canonical order payment transaction table is missing.');
        }
        $columns = array_flip(Schema::getColumnListing('order_payment_transactions'));
        $insert = array_intersect_key($values, $columns);
        return (int)DB::table('order_payment_transactions')->insertGetId($insert);
    }

    private function insertAllocations(int $transactionId, int $orderId, array $selectedItems): void
    {
        if (!Schema::hasTable('order_payment_transaction_items') || !Schema::hasTable('order_menus')) return;
        $columns = Schema::getColumnListing('order_payment_transaction_items');
        $itemKey = in_array('order_item_id', $columns, true)
            ? 'order_item_id'
            : (in_array('order_menu_id', $columns, true) ? 'order_menu_id' : (in_array('menu_id', $columns, true) ? 'menu_id' : null));
        if (!$itemKey) return;

        foreach ($selectedItems as $selected) {
            if (!is_array($selected)) continue;
            $orderMenuId = (int)($selected['order_menu_id'] ?? 0);
            $qty = round((float)($selected['quantity'] ?? 0), 3);
            if ($orderMenuId < 1 || $qty <= 0) continue;

            $row = DB::table('order_menus')->where('order_id', $orderId)->where('order_menu_id', $orderMenuId)->first();
            if (!$row) continue;
            $orderedQty = max(0.001, (float)($row->quantity ?? 0));
            $qty = min($qty, $orderedQty);
            $unit = $this->money($row->price ?? 0);
            $insert = [
                'transaction_id' => $transactionId,
                $itemKey => $itemKey === 'menu_id' ? (int)($row->menu_id ?? 0) : $orderMenuId,
                'quantity_paid' => $qty,
                'unit_price' => $unit,
                'line_total' => $this->money($unit * $qty),
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $insert = array_intersect_key($insert, array_flip($columns));
            DB::table('order_payment_transaction_items')->insert($insert);
        }
    }

    private function resultFromOrder(?object $order, ?int $transactionId, bool $duplicate, float $paidAmount, ?float $remaining = null, ?string $status = null): array
    {
        if (!$order) throw new \RuntimeException('Canonical order disappeared during settlement.');
        $total = $this->canonicalOrderTotal((int)$order->order_id, $order);
        $settled = $this->money($order->settled_amount ?? 0);
        $remaining = $remaining ?? $this->money(max(0, $total - $settled));
        $status = $status ?? ($remaining <= 0.0001 ? 'paid' : ($settled > 0 ? 'partial' : 'unpaid'));
        return [
            'ok' => true,
            'duplicate' => $duplicate,
            'settled_now' => !$duplicate && $transactionId !== null,
            'order_id' => (int)$order->order_id,
            'transaction_id' => $transactionId,
            'paid_amount' => $paidAmount,
            'order_total' => $total,
            'settled_amount' => $settled,
            'remaining_amount' => $remaining,
            'settlement_status' => $status,
        ];
    }

    private function writePaymentLog(int $orderId, string $provider, string $method, string $reference, float $amount, array $result, array $metadata): void
    {
        try {
            if (!Schema::hasTable('payment_logs')) return;
            $columns = array_flip(Schema::getColumnListing('payment_logs'));
            $values = [
                'order_id' => $orderId,
                'payment_name' => ucfirst($provider).' '.str_replace('_', ' ', $method),
                'message' => 'Verified provider payment received.',
                'request' => json_encode(['provider_reference' => $reference, 'provider' => $provider, 'method' => $method] + $metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'response' => json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'is_success' => 1,
                'payment_code' => $provider,
                'is_refundable' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            DB::table('payment_logs')->insert(array_intersect_key($values, $columns));
        } catch (\Throwable $error) {
            Log::warning('PMD verified provider payment log skipped', ['order_id' => $orderId, 'provider' => $provider, 'message' => $error->getMessage()]);
        }
    }

    private function notifyPaymentSuccess(int $orderId, string $provider, string $method, string $reference, float $settledAmount): void
    {
        try {
            if (!Schema::hasTable('notifications')) return;
            $needle = '\"order_id\":'.$orderId;
            if (DB::table('notifications')->where('type', 'order_payment_success')->where('payload', 'like', '%'.$needle.'%')->exists()) return;
            $order = DB::table('orders')->where('order_id', $orderId)->first();
            $columns = array_flip(Schema::getColumnListing('notifications'));
            $values = [
                'type' => 'order_payment_success',
                'title' => 'Payment received for order #'.$orderId,
                'table_id' => !empty($order->table_id) ? (string)$order->table_id : null,
                'table_name' => (string)($order->order_type ?? ''),
                'payload' => json_encode(['order_id' => $orderId, 'payment_method' => $method, 'provider' => $provider, 'provider_reference' => $reference, 'settled_amount' => $settledAmount], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'status' => 'new',
                'created_at' => now(),
                'updated_at' => now(),
            ];
            DB::table('notifications')->insert(array_intersect_key($values, $columns));
        } catch (\Throwable $error) {
            Log::warning('PMD verified provider payment notification skipped', ['order_id' => $orderId, 'provider' => $provider, 'message' => $error->getMessage()]);
        }
    }

    private function money($value): float
    {
        $value = is_numeric($value) ? (float)$value : 0.0;
        return round(max(0, $value), 4);
    }
}
