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

trait PmdWaiterPosPaymentSummaryConcern
{
    protected function buildPaymentSummary(Orders_model $order, bool $insideTransaction = false): array
    {
        $orderId = (int)$order->getKey();
        $rawItems = Schema::hasTable('order_menus')
            ? DB::table('order_menus')->where('order_id', $orderId)->orderBy('order_menu_id')->get()
            : collect();

        $itemSubtotal = 0.0;
        foreach ($rawItems as $row) {
            $itemSubtotal += (float)($row->subtotal ?? 0);
        }

        $canonicalTotal = null;
        if (Schema::hasTable('order_totals')) {
            $canonicalTotal = DB::table('order_totals')->where('order_id', $orderId)->where('code', 'total')->value('value');
        }
        $orderTotal = round((float)($canonicalTotal ?? $order->order_total ?? $itemSubtotal), 4);
        $grossRatio = $itemSubtotal > 0 ? max(0, round($orderTotal / $itemSubtotal, 8)) : 1.0;

        $paidQtyByItem = [];
        if (Schema::hasTable('order_payment_transactions') && Schema::hasTable('order_payment_transaction_items')) {
            $allocationColumn = Schema::hasColumn('order_payment_transaction_items', 'order_menu_id')
                ? 'order_menu_id'
                : (Schema::hasColumn('order_payment_transaction_items', 'order_item_id') ? 'order_item_id' : null);
            if ($allocationColumn) {
                $paidRows = DB::table('order_payment_transactions as tx')
                    ->join('order_payment_transaction_items as ti', 'ti.transaction_id', '=', 'tx.id')
                    ->where('tx.order_id', $orderId)
                    ->whereNotIn('tx.settlement_status', ['failed', 'cancelled'])
                    ->selectRaw('ti.'.$allocationColumn.' as alloc_key, SUM(ti.quantity_paid) as paid_qty')
                    ->groupBy('ti.'.$allocationColumn)
                    ->get();
                foreach ($paidRows as $paidRow) {
                    $paidQtyByItem[(int)$paidRow->alloc_key] = (float)$paidRow->paid_qty;
                }
            }
        }

        $items = [];
        foreach ($rawItems as $row) {
            $quantity = max(0, (float)($row->quantity ?? 0));
            $subtotal = (float)($row->subtotal ?? 0);
            $unit = $quantity > 0 ? round($subtotal / $quantity, 4) : (float)($row->price ?? 0);
            $orderMenuId = (int)($row->order_menu_id ?? 0);
            $paidQty = min($quantity, max(0, (float)($paidQtyByItem[$orderMenuId] ?? 0)));
            $unpaidQty = round(max(0, $quantity - $paidQty), 3);
            $items[] = [
                'order_menu_id' => $orderMenuId,
                'menu_id' => (int)($row->menu_id ?? 0),
                'name' => (string)($row->name ?? 'Item'),
                'quantity' => $quantity,
                'paid_quantity' => $paidQty,
                'unpaid_quantity' => $unpaidQty,
                'unit_price' => $unit,
                'line_subtotal' => round($subtotal, 4),
                'unpaid_subtotal' => round($unit * $unpaidQty, 4),
                'unpaid_gross' => round($unit * $unpaidQty * $grossRatio, 4),
                'comment' => (string)($row->comment ?? ''),
            ];
        }

        $settledAmount = Schema::hasColumn('orders', 'settled_amount')
            ? max(0, round((float)($order->settled_amount ?? 0), 4))
            : 0.0;
        $remaining = max(0, round($orderTotal - $settledAmount, 4));
        $settlementStatus = strtolower(trim((string)($order->settlement_status ?? '')));
        if (!in_array($settlementStatus, ['unpaid', 'partial', 'paid'], true)) {
            $settlementStatus = $remaining <= 0.0001 ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid');
        }

        $transactions = $this->paymentTransactions($orderId);
        $table = $this->tableForOrder($order);
        $methods = $this->paymentMethods();
        $terminalProviders = $this->terminalProviders();

        $guestUrl = null;
        if ($table) {
            $guestUrl = url('/table/'.rawurlencode((string)$table['number']).'/menu').'?'.http_build_query([
                'source' => 'waiter_pos',
                'order_id' => $orderId,
                'table' => $table['number'],
                'table_id' => $table['id'],
                'table_no' => $table['number'],
                'location' => $table['location_id'] ?: null,
                'qr' => $table['qr_code'] ?: null,
            ]);
        }

        return [
            'ok' => true,
            'version' => 'pmd-waiter-pos-v2',
            'order' => [
                'order_id' => $orderId,
                'status_id' => (int)($order->status_id ?? 0),
                'payment' => (string)($order->payment ?? ''),
                'updated_at' => (string)($order->updated_at ?? ''),
                'comment' => (string)($order->comment ?? ''),
            ],
            'table' => $table,
            'items' => $items,
            'settlement' => [
                'order_total' => $orderTotal,
                'settled_amount' => $settledAmount,
                'remaining_amount' => $remaining,
                'status' => $settlementStatus,
                'gross_ratio' => $grossRatio,
            ],
            'methods' => $methods,
            'terminal_providers' => $terminalProviders,
            'transactions' => $transactions,
            'permissions' => [
                'can_collect_payment' => $this->canManagePayments(),
                'can_open_guest_checkout' => true,
            ],
            'guest_checkout_url' => $guestUrl,
            'currency' => [
                'symbol' => $this->currencySymbol(),
                'code' => $this->currencyCode(),
            ],
        ];
    }

    protected function paymentMethods(): array
    {
        try {
            $rows = Payments_model::query()->where('status', 1)->orderBy('priority')->get();
        } catch (\Throwable $e) {
            $rows = collect();
        }

        $allowed = ['card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod', 'cash'];
        $methods = [];
        foreach ($rows as $row) {
            $code = strtolower((string)$row->code);
            if ($code === 'stripe') {
                $code = 'card';
            }
            if (!in_array($code, $allowed, true)) {
                continue;
            }
            $normalizedCode = in_array($code, ['cod', 'cash'], true) ? 'cash' : $code;
            $methods[$normalizedCode] = [
                'code' => $normalizedCode,
                'name' => $normalizedCode === 'cash' ? 'Cash' : ((string)$row->name ?: ucwords(str_replace('_', ' ', $normalizedCode))),
                'provider_code' => $normalizedCode === 'cash' ? null : ($row->provider_code ?: null),
                'kind' => $normalizedCode === 'cash' ? 'staff' : 'online',
                'priority' => (int)($row->priority ?? 100),
            ];
        }

        if (!isset($methods['cash'])) {
            $methods['cash'] = [
                'code' => 'cash',
                'name' => 'Cash',
                'provider_code' => null,
                'kind' => 'staff',
                'priority' => 999,
            ];
        }

        uasort($methods, fn ($a, $b) => ($a['priority'] <=> $b['priority']));
        return array_values($methods);
    }

    protected function terminalProviders(): array
    {
        try {
            return Payments_model::query()
                ->where('status', 1)
                ->whereIn('code', ['worldline', 'vr_payment'])
                ->orderBy('priority')
                ->get()
                ->map(function ($row) {
                    $code = strtolower((string)$row->code);
                    return [
                        'provider_code' => $code,
                        'name' => (string)($row->name ?: strtoupper(str_replace('_', ' ', $code))),
                    ];
                })
                ->values()
                ->all();
        } catch (\Throwable $ignored) {
            return [];
        }
    }

    protected function paymentTransactions(int $orderId): array
    {
        if (!Schema::hasTable('order_payment_transactions')) {
            return [];
        }
        $columns = Schema::getColumnListing('order_payment_transactions');
        $rows = DB::table('order_payment_transactions')->where('order_id', $orderId)->orderByDesc('id')->limit(50)->get();
        return $rows->map(function ($row) use ($columns) {
            $r = (array)$row;
            $out = [
                'id' => (int)($r['id'] ?? 0),
                'payment_method' => (string)($r['payment_method'] ?? ''),
                'payment_reference' => (string)($r['payment_reference'] ?? ''),
                'amount' => (float)($r['amount'] ?? 0),
                'settlement_status' => (string)($r['settlement_status'] ?? ''),
                'payer_label' => (string)($r['payer_label'] ?? ''),
                'paid_at' => (string)($r['paid_at'] ?? $r['created_at'] ?? ''),
                'receipt_url' => '/admin/orders/split-receipt/'.(int)($r['id'] ?? 0),
            ];
            foreach (['tip_amount', 'coupon_discount', 'coupon_code', 'provider_code', 'notes', 'cash_received', 'change_due'] as $field) {
                if (in_array($field, $columns, true)) {
                    $out[$field] = in_array($field, ['tip_amount', 'coupon_discount', 'cash_received', 'change_due'], true)
                        ? (float)($r[$field] ?? 0)
                        : (string)($r[$field] ?? '');
                }
            }
            return $out;
        })->values()->all();
    }

}
