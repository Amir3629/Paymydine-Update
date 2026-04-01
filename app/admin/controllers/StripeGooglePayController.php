<?php

namespace Admin\Controllers;

use Admin\Models\Payments_model;
use Illuminate\Http\Request;
use Stripe\StripeClient;
use Throwable;

class StripeGooglePayController extends Controller
{
    public function confirm(Request $request)
    {
        $request->validate([
            'payment_intent_id' => ['nullable', 'string'],
            'client_secret'     => ['nullable', 'string'],
        ]);

        try {
            $secretKey = env('STRIPE_SECRET_KEY');
            if (!$secretKey) {
                $payment = Payments_model::where('code', 'stripe')->first();
                $data = $payment ? (array) $payment->data : [];
                $mode = $data['transaction_mode'] ?? 'test';
                $secretKey = $mode === 'live' ? ($data['live_secret_key'] ?? null) : ($data['test_secret_key'] ?? null);
            }
            if (!$secretKey) {
                return response()->json(['ok' => false, 'status' => false, 'error' => 'Stripe secret key not configured.'], 503);
            }
            $stripe = new StripeClient($secretKey);

            $paymentIntentId = $request->input('payment_intent_id');

            // Se veio client_secret, extraímos o pi_... dele
            if (!$paymentIntentId && $request->filled('client_secret')) {
                // client_secret geralmente: pi_xxx_secret_yyy
                $paymentIntentId = explode('_secret_', $request->input('client_secret'))[0] ?? null;
            }

            if (!$paymentIntentId) {
                return response()->json([
                    'ok' => false,
                    'status' => false,
                    'error' => 'Informe payment_intent_id ou client_secret.',
                ], 422);
            }

            // Só buscar o PI já te dá o status final do Stripe
            $pi = $stripe->paymentIntents->retrieve($paymentIntentId, [
                'expand' => ['payment_method'],
            ]);

            $isGooglePay = false;

            // Detecta Google Pay quando vier como card/wallet.google_pay
            if (!empty($pi->payment_method) && isset($pi->payment_method->type)) {
                if ($pi->payment_method->type === 'card') {
                    $wallet = $pi->payment_method->card->wallet ?? null;
                    $isGooglePay = ($wallet && ($wallet->type ?? null) === 'google_pay');
                }
            }

            return response()->json([
                'ok' => true,
                'status' => $pi->status,              // ex: succeeded, requires_action, processing, requires_payment_method...
                'paid' => (bool) ($pi->status === 'succeeded'),
                'is_google_pay' => $isGooglePay,
                'payment_intent_id' => $pi->id,
                'amount' => $pi->amount,
                'currency' => $pi->currency,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'status' => false,
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
