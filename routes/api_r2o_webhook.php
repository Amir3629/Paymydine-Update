<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/r2o/webhook', function (Request $request) {

    @file_put_contents(
        storage_path('logs/r2o_webhook_debug.log'),
        "[" . now()->format('Y-m-d H:i:s') . "] R2O_WEBHOOK_FILE_RAW\n"
        . "HEADERS=" . json_encode($request->headers->all(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n"
        . "PAYLOAD=" . json_encode($request->all(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n"
        . "RAW=" . $request->getContent() . "\n"
        . "----------------------------------------\n",
        FILE_APPEND
    );

    \Log::info('R2O_WEBHOOK_RAW', $request->all());

    $event = $request->input('event');
    $data  = $request->input('data');

    if (!$event) {
        return response()->json(['error' => 'no event'], 400);
    }

    // === ITEM EVENT ===
    if ($event === 'orderItem.created') {

        $payload = [
            "table_id" => null,
            "table_name" => "Table ".($data['table_id'] ?? 0),
            "location_id" => 1,
            "is_codier" => true,
            "items" => [[
                "menu_id" => 67,
                "name" => $data['item_name'] ?? 'Unknown',
                "quantity" => $data['item_quantity'] ?? 1,
                "price" => $data['item_price'] ?? 0,
                "options" => [],
            ]],
            "customer_name" => "R2O",
            "payment_method" => "card",
            "total_amount" => ($data['item_price'] ?? 0) * ($data['item_quantity'] ?? 1),
        ];

    }

    // === FINAL ORDER ===
    elseif ($event === 'invoice.created') {

        $payload = [
            "table_id" => null,
            "table_name" => "FINAL",
            "location_id" => 1,
            "is_codier" => true,
            "items" => [[
                "menu_id" => 67,
                "name" => "FULL ORDER",
                "quantity" => 1,
                "price" => $data['invoice_total'] ?? 0,
                "options" => [],
            ]],
            "customer_name" => "R2O",
            "payment_method" => "card",
            "total_amount" => $data['invoice_total'] ?? 0,
        ];

    } else {
        return response()->json(['ignored' => true]);
    }

    // === SEND TO PAYMYDINE ===
    $ch = curl_init("https://mimoza.paymydine.com/api/v1/orders");

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
    ]);

    $res = curl_exec($ch);
    curl_close($ch);

    @file_put_contents(
        storage_path('logs/r2o_webhook_debug.log'),
        "[" . now()->format('Y-m-d H:i:s') . "] R2O_WEBHOOK_FILE_PUSH_RESULT\n"
        . "RESULT=" . $res . "\n"
        . "----------------------------------------\n",
        FILE_APPEND
    );

    \Log::info('R2O_PUSH_RESULT', ['res' => $res]);

    return response()->json(['ok' => true]);
});
