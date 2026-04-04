<?php

namespace Admin\Services\Fiskaly;

use Illuminate\Support\Facades\DB;

class FiskalyReceiptDataBuilder
{
    public function buildForOrder(int $orderId): array
    {
        $order = DB::table('orders')->where('order_id', $orderId)->first();
        $items = DB::table('order_menus')->where('order_id', $orderId)->get();

        if (!$order) {
            throw new \RuntimeException("Order not found: {$orderId}");
        }

        if ($items->count() < 1) {
            throw new \RuntimeException("Order has no order_menus rows: {$orderId}");
        }

        $lines = [];
        foreach ($items as $item) {
            $qty = (int)($item->quantity ?? 1);
            $unit = (float)($item->price ?? 0);
            $total = (float)($item->subtotal ?? ($qty * $unit));

            $lines[] = [
                'name' => (string)($item->name ?? 'Item'),
                'quantity' => (string)$qty,
                'unit_price' => number_format($unit, 2, '.', ''),
                'total_price' => number_format($total, 2, '.', ''),
                'vat_rate' => '0',
            ];
        }

        $payment = strtoupper((string)($order->payment ?? 'CASH'));
        if (in_array($payment, ['COD', 'CASH_ON_DELIVERY', 'CASH'], true)) {
            $payment = 'CASH';
        } else {
            $payment = 'CASH';
        }

        $processData = [
            'currency' => 'EUR',
            'payment_type' => $payment,
            'total_amount' => number_format((float)($order->order_total ?? 0), 2, '.', ''),
            'items' => $lines,
        ];

        $json = json_encode($processData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Failed to json_encode process_data');
        }

        $base64 = base64_encode($json);

        return [
            'receipt_type' => 'RECEIPT',
            'schema' => [
                'raw' => [
                    'process_type' => 'RECEIPT',
                    'process_data' => $base64,
                ],
            ],
            'meta' => [
                'order_id' => $orderId,
                'order_total' => (float)($order->order_total ?? 0),
                'payment' => (string)($order->payment ?? ''),
                'items_count' => count($lines),
                'process_data_json' => $json,
            ],
        ];
    }
}
