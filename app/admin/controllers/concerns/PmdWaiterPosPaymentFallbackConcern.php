<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Orders_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Schema-safe payment summary recovery for older tenant databases.
 *
 * The normal V2 payment summary remains the primary path. This concern is used
 * only when that path throws, so a missing optional column can never collapse
 * the waiter payment modal into an HTTP 500 response.
 */
trait PmdWaiterPosPaymentFallbackConcern
{
    protected function buildPaymentSummaryFallback(Orders_model $order, ?\Throwable $cause = null): array
    {
        $orderId = (int)$order->getKey();
        $items = $this->fallbackOrderItems($orderId);
        $itemSubtotal = array_reduce($items, static function (float $sum, array $item): float {
            return $sum + (float)($item['line_subtotal'] ?? 0);
        }, 0.0);

        $orderTotal = $this->fallbackOrderTotal($order, $itemSubtotal);
        $settledAmount = max(0, round((float)($order->settled_amount ?? 0), 4));
        $remaining = max(0, round($orderTotal - $settledAmount, 4));
        $settlementStatus = strtolower(trim((string)($order->settlement_status ?? '')));

        if (!in_array($settlementStatus, ['unpaid', 'partial', 'paid'], true)) {
            $settlementStatus = $remaining <= 0.0001
                ? 'paid'
                : ($settledAmount > 0 ? 'partial' : 'unpaid');
        }

        $grossRatio = $itemSubtotal > 0
            ? max(0, round($orderTotal / $itemSubtotal, 8))
            : 1.0;

        $paidQty = $this->fallbackPaidQuantities($orderId);
        foreach ($items as &$item) {
            $key = (int)($item['order_menu_id'] ?? 0);
            $quantity = max(0, (float)($item['quantity'] ?? 0));
            $paid = min($quantity, max(0, (float)($paidQty[$key] ?? 0)));
            $unpaid = round(max(0, $quantity - $paid), 3);
            $unit = (float)($item['unit_price'] ?? 0);

            $item['paid_quantity'] = $paid;
            $item['unpaid_quantity'] = $unpaid;
            $item['unpaid_subtotal'] = round($unit * $unpaid, 4);
            $item['unpaid_gross'] = round($unit * $unpaid * $grossRatio, 4);
        }
        unset($item);

        $table = null;
        try {
            $table = $this->tableForOrder($order);
        } catch (\Throwable $ignored) {
        }

        $methods = [];
        try {
            $methods = $this->paymentMethods();
        } catch (\Throwable $ignored) {
        }

        $terminalProviders = [];
        try {
            $terminalProviders = $this->terminalProviders();
        } catch (\Throwable $ignored) {
        }

        $transactions = [];
        try {
            $transactions = $this->paymentTransactions($orderId);
        } catch (\Throwable $ignored) {
        }

        $storage = $this->fallbackPaymentStorageStatus();
        $guestUrl = null;
        if ($table) {
            try {
                $guestUrl = url('/table/'.rawurlencode((string)$table['number']).'/menu').'?'.http_build_query([
                    'source' => 'waiter_pos',
                    'order_id' => $orderId,
                    'table' => $table['number'],
                    'table_id' => $table['id'],
                    'table_no' => $table['number'],
                    'location' => $table['location_id'] ?: null,
                    'qr' => $table['qr_code'] ?: null,
                ]);
            } catch (\Throwable $ignored) {
            }
        }

        return [
            'ok' => true,
            'version' => 'pmd-waiter-pos-v2.1.1-fallback',
            'degraded' => true,
            'warning' => $storage['ready']
                ? 'Payment details were recovered using compatibility mode.'
                : 'Payment storage is incomplete. Run the PayMyDine payment migrations before recording a payment.',
            'diagnostic_code' => $cause ? class_basename($cause) : 'PaymentSummaryFallback',
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
                'can_collect_payment' => $storage['ready'] && $this->canManagePayments(),
                'can_open_guest_checkout' => true,
            ],
            'payment_storage' => $storage,
            'guest_checkout_url' => $guestUrl,
            'currency' => [
                'symbol' => $this->currencySymbol(),
                'code' => $this->currencyCode(),
            ],
        ];
    }

    protected function fallbackOrderTotal(Orders_model $order, float $itemSubtotal): float
    {
        $modelTotal = (float)($order->order_total ?? $order->total ?? 0);
        if ($modelTotal > 0) {
            return round($modelTotal, 4);
        }

        try {
            if (Schema::hasTable('order_totals')) {
                $columns = Schema::getColumnListing('order_totals');
                $valueColumn = $this->fallbackFirstColumn($columns, ['value', 'total', 'amount']);
                if (in_array('order_id', $columns, true) && $valueColumn) {
                    $query = DB::table('order_totals')->where('order_id', (int)$order->getKey());
                    if (in_array('code', $columns, true)) {
                        $query->where('code', 'total');
                    }
                    $value = $query->value($valueColumn);
                    if ($value !== null) {
                        return round((float)$value, 4);
                    }
                }
            }
        } catch (\Throwable $ignored) {
        }

        return round(max(0, $itemSubtotal), 4);
    }

    protected function fallbackOrderItems(int $orderId): array
    {
        try {
            if (!Schema::hasTable('order_menus')) {
                return [];
            }

            $columns = Schema::getColumnListing('order_menus');
            if (!in_array('order_id', $columns, true)) {
                return [];
            }

            $idColumn = $this->fallbackFirstColumn($columns, ['order_menu_id', 'id']);
            $quantityColumn = $this->fallbackFirstColumn($columns, ['quantity', 'qty']);
            $subtotalColumn = $this->fallbackFirstColumn($columns, ['subtotal', 'line_total', 'total']);
            $priceColumn = $this->fallbackFirstColumn($columns, ['price', 'menu_price', 'unit_price']);
            $nameColumn = $this->fallbackFirstColumn($columns, ['name', 'menu_name', 'item_name']);
            $menuColumn = $this->fallbackFirstColumn($columns, ['menu_id', 'item_id']);
            $commentColumn = $this->fallbackFirstColumn($columns, ['comment', 'note']);

            $query = DB::table('order_menus')->where('order_id', $orderId);
            if ($idColumn) {
                $query->orderBy($idColumn);
            }

            return $query->get()->map(function ($row) use (
                $idColumn,
                $quantityColumn,
                $subtotalColumn,
                $priceColumn,
                $nameColumn,
                $menuColumn,
                $commentColumn
            ) {
                $data = (array)$row;
                $quantity = max(0, (float)($quantityColumn ? ($data[$quantityColumn] ?? 0) : 0));
                $price = (float)($priceColumn ? ($data[$priceColumn] ?? 0) : 0);
                $subtotal = (float)($subtotalColumn ? ($data[$subtotalColumn] ?? 0) : 0);
                if ($subtotal <= 0 && $price > 0 && $quantity > 0) {
                    $subtotal = $price * $quantity;
                }
                $unit = $quantity > 0 ? $subtotal / $quantity : $price;
                $orderMenuId = (int)($idColumn ? ($data[$idColumn] ?? 0) : 0);

                return [
                    'order_menu_id' => $orderMenuId,
                    'menu_id' => (int)($menuColumn ? ($data[$menuColumn] ?? 0) : 0),
                    'name' => (string)($nameColumn ? ($data[$nameColumn] ?? 'Item') : ('Item #'.$orderMenuId)),
                    'quantity' => $quantity,
                    'paid_quantity' => 0,
                    'unpaid_quantity' => $quantity,
                    'unit_price' => round((float)$unit, 4),
                    'line_subtotal' => round((float)$subtotal, 4),
                    'unpaid_subtotal' => round((float)$subtotal, 4),
                    'unpaid_gross' => round((float)$subtotal, 4),
                    'comment' => (string)($commentColumn ? ($data[$commentColumn] ?? '') : ''),
                ];
            })->values()->all();
        } catch (\Throwable $ignored) {
            return [];
        }
    }

    protected function fallbackPaidQuantities(int $orderId): array
    {
        try {
            if (!Schema::hasTable('order_payment_transactions') || !Schema::hasTable('order_payment_transaction_items')) {
                return [];
            }

            $txColumns = Schema::getColumnListing('order_payment_transactions');
            $itemColumns = Schema::getColumnListing('order_payment_transaction_items');
            $txId = $this->fallbackFirstColumn($txColumns, ['id', 'transaction_id']);
            $itemTx = $this->fallbackFirstColumn($itemColumns, ['transaction_id', 'payment_transaction_id']);
            $allocation = $this->fallbackFirstColumn($itemColumns, ['order_menu_id', 'order_item_id']);
            $quantity = $this->fallbackFirstColumn($itemColumns, ['quantity_paid', 'quantity', 'qty']);

            if (!$txId || !$itemTx || !$allocation || !$quantity || !in_array('order_id', $txColumns, true)) {
                return [];
            }

            $query = DB::table('order_payment_transactions as tx')
                ->join('order_payment_transaction_items as ti', 'ti.'.$itemTx, '=', 'tx.'.$txId)
                ->where('tx.order_id', $orderId);

            if (in_array('settlement_status', $txColumns, true)) {
                $query->whereNotIn('tx.settlement_status', ['failed', 'cancelled']);
            }

            $rows = $query
                ->selectRaw('ti.'.$allocation.' as alloc_key, SUM(ti.'.$quantity.') as paid_qty')
                ->groupBy('ti.'.$allocation)
                ->get();

            $out = [];
            foreach ($rows as $row) {
                $out[(int)$row->alloc_key] = (float)$row->paid_qty;
            }
            return $out;
        } catch (\Throwable $ignored) {
            return [];
        }
    }

    protected function fallbackPaymentStorageStatus(): array
    {
        try {
            $txTable = Schema::hasTable('order_payment_transactions');
            $itemTable = Schema::hasTable('order_payment_transaction_items');
            $txColumns = $txTable ? Schema::getColumnListing('order_payment_transactions') : [];
            $itemColumns = $itemTable ? Schema::getColumnListing('order_payment_transaction_items') : [];

            $txReady = $txTable
                && in_array('order_id', $txColumns, true)
                && in_array('payment_method', $txColumns, true)
                && in_array('amount', $txColumns, true);

            $itemReady = $itemTable
                && (in_array('transaction_id', $itemColumns, true) || in_array('payment_transaction_id', $itemColumns, true))
                && (in_array('order_menu_id', $itemColumns, true) || in_array('order_item_id', $itemColumns, true))
                && (in_array('quantity_paid', $itemColumns, true) || in_array('quantity', $itemColumns, true));

            return [
                'ready' => $txReady && $itemReady,
                'transactions_table' => $txTable,
                'allocations_table' => $itemTable,
                'transactions_columns_ready' => $txReady,
                'allocations_columns_ready' => $itemReady,
            ];
        } catch (\Throwable $ignored) {
            return [
                'ready' => false,
                'transactions_table' => false,
                'allocations_table' => false,
                'transactions_columns_ready' => false,
                'allocations_columns_ready' => false,
            ];
        }
    }

    protected function fallbackFirstColumn(array $columns, array $candidates): ?string
    {
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $columns, true)) {
                return $candidate;
            }
        }
        return null;
    }
}
