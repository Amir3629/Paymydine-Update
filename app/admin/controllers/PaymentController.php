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
            'order_id'      => ['required', 'integer'],
            'payment_code'  => ['required', 'string'], // stripe, paypal, square
            'success_url'   => ['required', 'url'],
            'cancel_url'    => ['required', 'url'],

            // Square extras (só usa se payment_code=square)
            'square.order_type' => ['nullable', 'string'],
            'square.order_fee'  => ['nullable', 'numeric'],
        ]);

        $order = Orders_model::findOrFail($request->order_id);

        // Guarda o método escolhido no pedido (se isso fizer sentido no seu fluxo)
        $order->payment = $request->payment_code;
        $order->save();

        $payment = Payments_model::where('code', $request->payment_code)->firstOrFail();
        $payment->applyGatewayClass();

        return $orchestrator->createSession($order, $payment, $request);
    }
}
