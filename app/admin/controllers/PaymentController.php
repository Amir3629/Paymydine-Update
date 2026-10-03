<?php

namespace Admin\Controllers;

use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use Admin\Services\Payments\PaymentOrchestrator;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PaymentController extends Controller
{
    public function createSession(Request $request, PaymentOrchestrator $orchestrator)
    {
        $request->validate([
            'order_id' => ['required', 'integer'],
            // Business payment method, for example card, paypal or wero.
            // Legacy direct provider codes (stripe/paypal/square) remain
            // accepted by PaymentOrchestrator during migration.
            'payment_code' => ['required', 'string'],
            'success_url' => ['required', 'url'],
            'cancel_url' => ['required', 'url'],

            'square.order_type' => ['nullable', 'string'],
            'square.order_fee' => ['nullable', 'numeric'],
        ]);

        $order = Orders_model::findOrFail($request->order_id);
        $order->payment = $request->payment_code;
        $order->save();

        $paymentMethod = Payments_model::where('code', $request->payment_code)
            ->firstOrFail();
        $paymentMethod->applyGatewayClass();

        return $orchestrator->createSession(
            $order,
            $paymentMethod,
            $request
        );
    }
}
