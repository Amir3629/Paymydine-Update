<?php

namespace App\Support\Payments;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class PaymentVerificationService
{
    public function verify(string $method, array $payload): array
    {
        $normalizedMethod = PaymentMethodNormalizer::normalizeMethod($method);

        return match ($normalizedMethod) {
            PaymentMethodNormalizer::METHOD_CARD => $this->verifyStripe($payload),
            PaymentMethodNormalizer::METHOD_PAYPAL => $this->verifyPayPal($payload),
            PaymentMethodNormalizer::METHOD_CASH => [
                'verified' => true,
                'provider' => 'cod',
                'reference' => null,
                'error' => null,
            ],
            default => [
                'verified' => false,
                'provider' => null,
                'reference' => null,
                'error' => 'Unsupported payment method for verification.',
            ],
        };
    }

    public function isVerificationPathReady(string $provider, string $method): bool
    {
        $provider = strtolower(trim($provider));
        $method = PaymentMethodNormalizer::normalizeMethod($method) ?? strtolower(trim($method));

        return ($provider === 'stripe' && $method === PaymentMethodNormalizer::METHOD_CARD)
            || ($provider === 'paypal' && $method === PaymentMethodNormalizer::METHOD_PAYPAL);
    }

    protected function verifyStripe(array $payload): array
    {
        $paymentIntentId = trim((string)($payload['stripe_payment_intent_id'] ?? ''));
        if ($paymentIntentId === '') {
            return [
                'verified' => false,
                'provider' => 'stripe',
                'reference' => null,
                'error' => 'Missing stripe_payment_intent_id for card payment verification.',
            ];
        }

        $payment = DB::table('payments')
            ->where('code', 'stripe')
            ->where('status', 1)
            ->orderByDesc('payment_id')
            ->first();

        if (!$payment) {
            return [
                'verified' => false,
                'provider' => 'stripe',
                'reference' => $paymentIntentId,
                'error' => 'Stripe gateway is not enabled.',
            ];
        }

        $data = json_decode((string)($payment->data ?? '{}'), true);
        if (!is_array($data)) {
            $data = [];
        }

        $mode = (string)($data['transaction_mode'] ?? 'test');
        $secretKey = $mode === 'live'
            ? (string)($data['live_secret_key'] ?? '')
            : (string)($data['test_secret_key'] ?? '');

        if ($secretKey === '') {
            return [
                'verified' => false,
                'provider' => 'stripe',
                'reference' => $paymentIntentId,
                'error' => 'Stripe secret key is missing for verification.',
            ];
        }

        try {
            \Stripe\Stripe::setApiKey($secretKey);
            $intent = \Stripe\PaymentIntent::retrieve($paymentIntentId, []);
            $status = (string)($intent->status ?? '');

            if ($status !== 'succeeded') {
                return [
                    'verified' => false,
                    'provider' => 'stripe',
                    'reference' => $paymentIntentId,
                    'error' => 'Stripe payment intent is not in succeeded state.',
                    'status' => $status,
                ];
            }

            return [
                'verified' => true,
                'provider' => 'stripe',
                'reference' => $paymentIntentId,
                'error' => null,
                'status' => $status,
            ];
        } catch (\Throwable $e) {
            return [
                'verified' => false,
                'provider' => 'stripe',
                'reference' => $paymentIntentId,
                'error' => 'Stripe verification failed: '.$e->getMessage(),
            ];
        }
    }

    protected function verifyPayPal(array $payload): array
    {
        $paypalOrderId = trim((string)($payload['paypal_order_id'] ?? $payload['paypalOrderId'] ?? ''));
        $paypalCaptureId = trim((string)($payload['paypal_capture_id'] ?? $payload['paypalCaptureId'] ?? ''));

        if ($paypalOrderId === '' && $paypalCaptureId === '') {
            return [
                'verified' => false,
                'provider' => 'paypal',
                'reference' => null,
                'error' => 'Missing paypal_order_id or paypal_capture_id for PayPal verification.',
            ];
        }

        $payment = DB::table('payments')
            ->whereIn('code', ['paypalexpress', 'paypal'])
            ->where('status', 1)
            ->orderByDesc('payment_id')
            ->first();

        if (!$payment) {
            return [
                'verified' => false,
                'provider' => 'paypal',
                'reference' => $paypalCaptureId ?: $paypalOrderId,
                'error' => 'PayPal gateway is not enabled.',
            ];
        }

        $data = json_decode((string)($payment->data ?? '{}'), true);
        if (!is_array($data)) {
            $data = [];
        }

        $mode = (string)($data['transaction_mode'] ?? ($data['api_mode'] ?? 'test'));
        if ($mode === 'sandbox') {
            $mode = 'test';
        }

        $clientId = $mode === 'live'
            ? (string)($data['live_client_id'] ?? '')
            : (string)($data['test_client_id'] ?? '');

        $clientSecret = $mode === 'live'
            ? (string)($data['live_client_secret'] ?? '')
            : (string)($data['test_client_secret'] ?? '');

        if ($clientId === '' || $clientSecret === '') {
            return [
                'verified' => false,
                'provider' => 'paypal',
                'reference' => $paypalCaptureId ?: $paypalOrderId,
                'error' => 'PayPal credentials are missing for verification.',
            ];
        }

        $baseUrl = $mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        try {
            $tokenResp = Http::asForm()
                ->withBasicAuth($clientId, $clientSecret)
                ->post($baseUrl.'/v1/oauth2/token', [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$tokenResp->ok()) {
                return [
                    'verified' => false,
                    'provider' => 'paypal',
                    'reference' => $paypalCaptureId ?: $paypalOrderId,
                    'error' => 'PayPal token request failed during verification.',
                ];
            }

            $accessToken = (string)($tokenResp->json('access_token') ?? '');
            if ($accessToken === '') {
                return [
                    'verified' => false,
                    'provider' => 'paypal',
                    'reference' => $paypalCaptureId ?: $paypalOrderId,
                    'error' => 'PayPal access token is empty during verification.',
                ];
            }

            if ($paypalCaptureId !== '') {
                $captureResp = Http::withToken($accessToken)
                    ->acceptJson()
                    ->get($baseUrl.'/v2/payments/captures/'.$paypalCaptureId);

                if (!$captureResp->ok()) {
                    return [
                        'verified' => false,
                        'provider' => 'paypal',
                        'reference' => $paypalCaptureId,
                        'error' => 'PayPal capture lookup failed during verification.',
                    ];
                }

                $status = (string)($captureResp->json('status') ?? '');
                if ($status !== 'COMPLETED') {
                    return [
                        'verified' => false,
                        'provider' => 'paypal',
                        'reference' => $paypalCaptureId,
                        'error' => 'PayPal capture is not completed.',
                        'status' => $status,
                    ];
                }

                return [
                    'verified' => true,
                    'provider' => 'paypal',
                    'reference' => $paypalCaptureId,
                    'error' => null,
                    'status' => $status,
                ];
            }

            $orderResp = Http::withToken($accessToken)
                ->acceptJson()
                ->get($baseUrl.'/v2/checkout/orders/'.$paypalOrderId);

            if (!$orderResp->ok()) {
                return [
                    'verified' => false,
                    'provider' => 'paypal',
                    'reference' => $paypalOrderId,
                    'error' => 'PayPal order lookup failed during verification.',
                ];
            }

            $status = (string)($orderResp->json('status') ?? '');
            if ($status !== 'COMPLETED') {
                return [
                    'verified' => false,
                    'provider' => 'paypal',
                    'reference' => $paypalOrderId,
                    'error' => 'PayPal order is not completed.',
                    'status' => $status,
                ];
            }

            return [
                'verified' => true,
                'provider' => 'paypal',
                'reference' => $paypalOrderId,
                'error' => null,
                'status' => $status,
            ];
        } catch (\Throwable $e) {
            return [
                'verified' => false,
                'provider' => 'paypal',
                'reference' => $paypalCaptureId ?: $paypalOrderId,
                'error' => 'PayPal verification failed: '.$e->getMessage(),
            ];
        }
    }
}
