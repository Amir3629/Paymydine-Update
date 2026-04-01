<?php 

namespace Admin\Services\Payments;

use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Stripe\StripeClient;

class StripeDriver
{
    public function createSession(Orders_model $order, Payments_model $payment, Request $request): JsonResponse
    {
        $data = (array) $payment->data;
        $mode = $data['transaction_mode'] ?? 'test';

        $secretKey = $mode === 'live'
            ? ($data['live_secret_key'] ?? null)
            : ($data['test_secret_key'] ?? null);

        if (!$secretKey) {
            $order->logPaymentAttempt('Stripe not configured', false);
            return response()->json(['success' => false, 'error' => 'Stripe not configured'], 503);
        }

        $stripe = new StripeClient($secretKey);

        $lineItems = [];
        foreach ($order->getOrderMenusWithOptions() as $menu) {
            $lineItems[] = [
                'price_data' => [
                    'currency' => 'eur', // ajuste se tiver moeda no order
                    'product_data' => ['name' => $menu->name],
                    'unit_amount' => (int) round($menu->price * 100),
                ],
                'quantity' => (int) $menu->quantity,
            ];
        }

        try {
            $session = $stripe->checkout->sessions->create([
                'mode' => 'payment',
                'line_items' => $lineItems,
                'success_url' => $request->success_url,
                'cancel_url'  => $request->cancel_url,
                'metadata' => [
                    'order_id' => (string) $order->order_id,
                    'payment_code' => $payment->code,
                ],
            ]);

            $order->logPaymentAttempt(
                'Stripe checkout session created',
                true,
                ['order_id' => $order->order_id],
                ['session_id' => $session->id]
            );

            return response()->json([
                'success' => true,
                'provider' => 'stripe',
                'redirect_url' => $session->url,
                'session_id' => $session->id,
            ]);
        } catch (\Throwable $e) {
            $order->logPaymentAttempt('Stripe create session failed', false, [], ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Failed to create Stripe session'], 500);
        }
    }
}
