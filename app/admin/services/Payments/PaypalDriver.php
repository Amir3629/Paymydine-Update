<?php

namespace Admin\Services\Payments;

use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class PaypalDriver
{
    public function createSession(Orders_model $order, Payments_model $payment, Request $request): JsonResponse
    {
        $data = (array) $payment->data;
        $mode = $data['transaction_mode'] ?? 'test';

        $clientId = $mode === 'live'
            ? ($data['live_client_id'] ?? null)
            : ($data['test_client_id'] ?? null);

        $clientSecret = $mode === 'live'
            ? ($data['live_client_secret'] ?? null)
            : ($data['test_client_secret'] ?? null);

        if (!$clientId || !$clientSecret) {
            $order->logPaymentAttempt('PayPal not configured', false, [], [
                'missing' => [
                    'client_id' => !$clientId,
                    'client_secret' => !$clientSecret,
                ],
            ]);
            return response()->json(['success' => false, 'error' => 'PayPal not configured'], 503);
        }

        $baseUrl = $mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        try {
            // 1) Access token
            $tokenResp = Http::asForm()
                ->withBasicAuth($clientId, $clientSecret)
                ->post($baseUrl . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$tokenResp->ok()) {
                $order->logPaymentAttempt('PayPal token request failed', false, [], [
                    'status' => $tokenResp->status(),
                    'body' => $tokenResp->json(),
                ]);
                return response()->json(['success' => false, 'error' => 'Failed to authenticate PayPal'], 502);
            }

            $accessToken = $tokenResp->json('access_token');
            if (!$accessToken) {
                $order->logPaymentAttempt('PayPal token missing in response', false, [], [
                    'body' => $tokenResp->json(),
                ]);
                return response()->json(['success' => false, 'error' => 'Failed to authenticate PayPal'], 502);
            }

            // 2) Create order (Checkout)
            // OBS: PayPal exige string com 2 casas decimais
            $amountValue = number_format((float) $order->order_total, 2, '.', '');
            $currency = strtoupper($data['currency'] ?? 'EUR'); // se você tiver moeda no order, use ela

            $createPayload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'custom_id' => (string) $order->order_id,
                    'description' => 'Order #' . $order->order_id,
                    'amount' => [
                        'currency_code' => $currency,
                        'value' => $amountValue,
                    ],
                ]],
                'application_context' => [
                    'return_url' => $request->success_url,
                    'cancel_url' => $request->cancel_url,
                    'brand_name' => $data['brand_name'] ?? 'Checkout',
                    'user_action' => 'PAY_NOW',
                ],
            ];

            $resp = Http::withToken($accessToken)
                ->acceptJson()
                ->post($baseUrl . '/v2/checkout/orders', $createPayload);

            if (!$resp->ok()) {
                $order->logPaymentAttempt('PayPal create order failed', false, $createPayload, [
                    'status' => $resp->status(),
                    'body' => $resp->json(),
                ]);
                return response()->json(['success' => false, 'error' => 'Failed to create PayPal order'], 502);
            }

            $json = $resp->json();
            $paypalOrderId = $json['id'] ?? null;

            // 3) Get approve link
            $approveUrl = null;
            foreach (($json['links'] ?? []) as $link) {
                if (($link['rel'] ?? '') === 'approve') {
                    $approveUrl = $link['href'] ?? null;
                    break;
                }
            }

            if (!$paypalOrderId || !$approveUrl) {
                $order->logPaymentAttempt('PayPal approve link not found', false, $createPayload, [
                    'body' => $json,
                ]);
                return response()->json(['success' => false, 'error' => 'PayPal approval link missing'], 502);
            }

            // Log: payment initiated
            $order->logPaymentAttempt(
                'PayPal order created',
                true,
                ['order_id' => $order->order_id],
                [
                    'paypal_order_id' => $paypalOrderId,
                    'approve_url' => $approveUrl,
                ],
                false
            );

            return response()->json([
                'success' => true,
                'provider' => 'paypal',
                'redirect_url' => $approveUrl,
                'paypal_order_id' => $paypalOrderId,
            ]);
        } catch (\Throwable $e) {
            $order->logPaymentAttempt('PayPal create session exception', false, [], [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'error' => 'PayPal error'], 500);
        }
    }
}