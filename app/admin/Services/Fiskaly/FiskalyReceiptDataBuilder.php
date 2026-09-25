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

        /* PMD_FISKALY_RECEIPT_BUILDER_V69
         * Keep this legacy builder aligned with the live SIGN DE service.
         * PMD setting semantics: 0=menu price includes VAT, 1=VAT added at checkout.
         */
        $taxEnabled = (string)setting('tax_mode', '0') === '1';
        $taxMenuPrice = (string)setting('tax_menu_price', '1');
        $defaultVat = $taxEnabled
            ? max(0.0, (float)setting('tax_percentage', 0))
            : 0.0;

        $lines = [];

        foreach ($items as $item) {
            $data = (array)$item;
            $qty = max(0.01, (float)($data['quantity'] ?? 1));
            $storedUnit = (float)($data['price'] ?? 0);
            $storedTotal = (float)($data['subtotal'] ?? ($qty * $storedUnit));

            $lineVat = $defaultVat;
            foreach ([
                'tax_rate',
                'tax_percentage',
                'vat_rate',
                'vat_percentage',
                'item_tax_rate',
                'menu_tax_rate',
            ] as $field) {
                if (
                    array_key_exists($field, $data)
                    && $data[$field] !== null
                    && $data[$field] !== ''
                    && is_numeric($data[$field])
                ) {
                    $lineVat = max(0.0, (float)$data[$field]);
                    break;
                }
            }

            if (!$taxEnabled) {
                $lineVat = 0.0;
            }

            $signedTotal = round(
                $taxMenuPrice === '1'
                    ? $storedTotal * (1 + ($lineVat / 100))
                    : $storedTotal,
                2
            );
            $signedUnit = round($signedTotal / $qty, 2);

            $lines[] = [
                'name' => (string)($data['name'] ?? 'Item'),
                'quantity' => number_format($qty, 2, '.', ''),
                'unit_price' => number_format($signedUnit, 2, '.', ''),
                'total_price' => number_format($signedTotal, 2, '.', ''),
                'vat_rate' => number_format($lineVat, 2, '.', ''),
            ];
        }

        $payment = strtolower(trim((string)(
            $order->settlement_method
            ?? $order->payment
            ?? 'card'
        )));

        $paymentType = in_array(
            $payment,
            ['cash', 'bar', 'cash_payment', 'cod', 'cash_on_delivery'],
            true
        )
            ? 'CASH'
            : 'NON_CASH';

        $processData = [
            'currency' => 'EUR',
            'payment_type' => $paymentType,
            'total_amount' => number_format((float)($order->order_total ?? 0), 2, '.', ''),
            'items' => $lines,
        ];

        $json = json_encode(
            $processData,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        if ($json === false) {
            throw new \RuntimeException('Failed to json_encode process_data');
        }

        return [
            'receipt_type' => 'RECEIPT',
            'schema' => [
                'raw' => [
                    'process_type' => 'RECEIPT',
                    'process_data' => base64_encode($json),
                ],
            ],
            'meta' => [
                'order_id' => $orderId,
                'order_total' => (float)($order->order_total ?? 0),
                'payment' => (string)($order->payment ?? ''),
                'payment_type' => $paymentType,
                'tax_menu_price' => $taxMenuPrice,
                'tax_enabled' => $taxEnabled,
                'items_count' => count($lines),
                'process_data_json' => $json,
            ],
        ];
    }
}
