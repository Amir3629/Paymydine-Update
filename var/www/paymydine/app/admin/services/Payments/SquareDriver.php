<?php

namespace Admin\Services\Payments;

use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class SquareDriver
{
    public function createSession(Orders_model $order, Payments_model $payment, Request $request): JsonResponse
    {
        $data = (array) $payment->data;
        $mode = $data['transaction_mode'] ?? 'test';

        $accessToken = $mode === 'live'
            ? ($data['live_access_token'] ?? null)
            : ($data['test_access_token'] ?? null);

        $locationId = $mode === 'live'
            ? ($data['live_location_id'] ?? null)
            : ($data['test_location_id'] ?? null);

        if (!$accessToken || !$locationId) {
            $order->logPaymentAttempt('Square not configured', false, [], [
                'missing' => [
                    'access_token' => !$accessToken,
                    'location_id' => !$locationId,
                ],
            ]);
            return response()->json(['success' => false, 'error' => 'Square not configured'], 503);
        }

        $squareBase = $mode === 'live'
            ? 'https://connect.squareup.com'
            : 'https://connect.squareupsandbox.com';

        $currency = strtoupper($data['currency'] ?? 'EUR');

        $orderType = (string) $request->input('square.order_type', '');
        $orderFee  = $request->input('square.order_fee', null); // numeric|null

        try {
            // Monta line_items do order
            $lineItems = [];
            foreach ($order->getOrderMenusWithOptions() as $menu) {
                $lineItems[] = [
                    'name' => (string) $menu->name,
                    'quantity' => (string) ((int) $menu->quantity),
                    'base_price_money' => [
                        'amount' => (int) round(((float) $menu->price) * 100),
                        'currency' => $currency,
                    ],
                ];
            }

            // Se vier order_fee, adiciona como item extra
            if ($orderFee !== null && is_numeric($orderFee) && (float)$orderFee > 0) {
                $lineItems[] = [
                    'name' => 'Order fee',
                    'quantity' => '1',
                    'base_price_money' => [
                        'amount' => (int) round(((float) $orderFee) * 100),
                        'currency' => $currency,
                    ],
                ];
            }

            // Idempotency key (evita duplicar links se o front repetir a request)
            $idempotencyKey = 'order_' . $order->order_id . '_'. md5($request->success_url . '|' . $request->cancel_url);

            $payload = [
                'idempotency_key' => $idempotencyKey,
                'order' => [
                    'location_id' => $locationId,
                    'reference_id' => (string) $order->order_id,
                    'line_items' => $lineItems,
                    'note' => trim('order_type=' . $orderType),
                ],
                'checkout_options' => [
                    // Square precisa de uma URL válida. Você pode mandar o success_url
                    // e tratar o "status" consultando seu backend após webhook.
                    'redirect_url' => $request->success_url,
                ],
            ];

            $resp = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post($squareBase . '/v2/online-checkout/payment-links', $payload);

            if (!$resp->ok()) {
                $order->logPaymentAttempt('Square create payment link failed', false, $payload, [
                    'status' => $resp->status(),
                    'body' => $resp->json(),
                ]);
                return response()->json(['success' => false, 'error' => 'Failed to create Square payment link'], 502);
            }

            $json = $resp->json();
            $paymentLink = $json['payment_link']['url'] ?? null;
            $paymentLinkId = $json['payment_link']['id'] ?? null;

            if (!$paymentLink) {
                $order->logPaymentAttempt('Square payment link url missing', false, $payload, [
                    'body' => $json,
                ]);
                return response()->json(['success' => false, 'error' => 'Square payment link missing'], 502);
            }

            $order->logPaymentAttempt(
                'Square payment link created',
                true,
                [
                    'order_id' => $order->order_id,
                    'square' => [
                        'order_type' => $orderType,
                        'order_fee' => $orderFee,
                    ],
                ],
                [
                    'payment_link_id' => $paymentLinkId,
                    'redirect_url' => $paymentLink,
                ],
                false
            );

            return response()->json([
                'success' => true,
                'provider' => 'square',
                'redirect_url' => $paymentLink,
                'payment_link_id' => $paymentLinkId,
            ]);
        } catch (\Throwable $e) {
            $order->logPaymentAttempt('Square create session exception', false, [], [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'error' => 'Square error'], 500);
        }
    }
}