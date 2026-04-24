<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

if (!function_exists('pmdLoadSumupConfig')) {
    function pmdLoadSumupConfig()
    {
        $payment = \Admin\Models\Payments_model::query()
            ->where('code', 'sumup')
            ->first();
        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $token = (string)($data['access_token'] ?? '');
        $url = (string)($data['url'] ?? 'https://api.sumup.com');
        $merchantCode = (string)($data['id_application'] ?? '');
        $enabled = (bool)optional($payment)->status;

        if (!$enabled || $token === '') {
            return null;
        }

        return (object)[
            'provider_payment_id' => optional($payment)->getKey(),
            'url' => $url,
            'access_token' => $token,
            'id_application' => $merchantCode,
        ];
    }
}

if (!function_exists('pmdResolveSumupMerchantCode')) {
    function pmdResolveSumupMerchantCode($cfg)
    {
        if (!empty($cfg->id_application)) {
            return $cfg->id_application;
        }

        $baseUrl = rtrim($cfg->url ?: 'https://api.sumup.com', '/');
        $resp = Http::withToken($cfg->access_token)
            ->acceptJson()
            ->get($baseUrl.'/v0.1/me');

        $json = $resp->json();
        if (is_array($json)) {
            return $json['merchant_code'] ?? null;
        }

        return null;
    }
}

if (!function_exists('pmdExtractOrderIdFromCheckoutReference')) {
    function pmdExtractOrderIdFromCheckoutReference(?string $checkoutReference): ?int
    {
        $ref = (string)$checkoutReference;
        if (preg_match('/PMD-ORD-(\\d+)-/i', $ref, $m)) {
            return (int)$m[1];
        }
        return null;
    }
}

if (!function_exists('pmdFinalizeSumupCheckoutIfPaid')) {
    function pmdFinalizeSumupCheckoutIfPaid(array $checkoutBody): array
    {
        $status = strtoupper((string)($checkoutBody['status'] ?? ''));
        $checkoutId = (string)($checkoutBody['id'] ?? '');
        $checkoutReference = (string)($checkoutBody['checkout_reference'] ?? '');
        $orderId = pmdExtractOrderIdFromCheckoutReference($checkoutReference);

        if (!in_array($status, ['PAID', 'SUCCESSFUL'], true) || $orderId <= 0) {
            return ['finalized' => false, 'order_id' => $orderId];
        }

        $order = \Admin\Models\Orders_model::query()->find($orderId);
        if (!$order) {
            return ['finalized' => false, 'order_id' => $orderId, 'error' => 'order_not_found'];
        }

        $order->markAsPaymentProcessed();
        $order->logPaymentAttempt('SumUp checkout paid', true, [
            'checkout_id' => $checkoutId,
            'checkout_reference' => $checkoutReference,
            'status' => $status,
        ], $checkoutBody, true);

        if (\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')) {
            \Illuminate\Support\Facades\DB::table('order_payment_transactions')
                ->where('order_id', $orderId)
                ->whereIn('payment_reference', array_values(array_filter([$checkoutId, $checkoutReference])))
                ->update([
                    'settlement_status' => 'paid',
                    'paid_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        return ['finalized' => true, 'order_id' => $orderId];
    }
}

if (!function_exists('pmdSumupCompatResponse')) {
    function pmdSumupCompatResponse(array $payload, int $status, string $canonicalEndpoint)
    {
        return response()->json(array_merge($payload, [
            'deprecated' => true,
            'compat_mode' => true,
            'canonical_endpoint' => $canonicalEndpoint,
        ]), $status)
            ->header('X-PMD-Deprecated-Route', '1')
            ->header('X-PMD-Canonical-Route', $canonicalEndpoint);
    }
}

Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', \App\Http\Middleware\DetectTenant::class],
], function () {

    Route::get('/payments/sumup/merchant-profile', function () {
        $cfg = pmdLoadSumupConfig();

        if (!$cfg) {
            return response()->json([
                'success' => false,
                'error' => 'SumUp configuration not found',
            ], 404);
        }

        $baseUrl = rtrim($cfg->url ?: 'https://api.sumup.com', '/');

        $resp = Http::withToken($cfg->access_token)
            ->acceptJson()
            ->get($baseUrl.'/v0.1/me/merchant-profile');

        return response()->json([
            'success' => $resp->successful(),
            'provider' => 'sumup',
            'integration_mode' => 'payments',
            'status' => $resp->status(),
            'merchant_code' => $cfg->id_application ?: null,
            'data' => $resp->json(),
        ], $resp->status());
    });

    Route::post('/payments/sumup/create-checkout', function (Request $request) {
        Log::warning('PMD_SUMUP_COMPAT_ROUTE_HIT', [
            'route' => '/api/v1/payments/sumup/create-checkout',
            'canonical_route' => '/api/v1/payments/card/create-session',
        ]);
        $cfg = pmdLoadSumupConfig();

        if (!$cfg) {
            return pmdSumupCompatResponse([
                'success' => false,
                'error' => 'SumUp configuration not found',
            ], 404, '/api/v1/payments/card/create-session');
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|size:3',
            'description' => 'nullable|string|max:255',
            'checkout_reference' => 'nullable|string|max:255',
            'return_url' => 'nullable|url|max:500',
        ]);

        $baseUrl = rtrim($cfg->url ?: 'https://api.sumup.com', '/');
        $merchantCode = pmdResolveSumupMerchantCode($cfg);

        if (!$merchantCode) {
            return pmdSumupCompatResponse([
                'success' => false,
                'error' => 'SumUp merchant_code could not be resolved',
            ], 400, '/api/v1/payments/card/create-session');
        }

        $payload = [
            'checkout_reference' => $validated['checkout_reference'] ?? ('PMD-'.date('YmdHis')),
            'amount' => (float)$validated['amount'],
            'currency' => strtoupper($validated['currency']),
            'merchant_code' => $merchantCode,
            'description' => $validated['description'] ?? 'PayMyDine SumUp checkout',
            'return_url' => $validated['return_url'] ?? (request()->getSchemeAndHttpHost().'/sumup/return'),
            'hosted_checkout' => [
                'enabled' => true,
            ],
        ];

        $resp = Http::withToken($cfg->access_token)
            ->acceptJson()
            ->post($baseUrl.'/v0.1/checkouts', $payload);

        Log::info('PMD SumUp checkout create', [
            'status' => $resp->status(),
            'payload' => $payload,
            'response' => $resp->json(),
        ]);

        $responseBody = (array) $resp->json();
        $hostedCheckoutUrl = (string)($responseBody['hosted_checkout_url'] ?? '');
        $checkoutId = (string)($responseBody['id'] ?? '');

        if ($hostedCheckoutUrl !== '') {
            Log::info('SUMUP_HOSTED_CHECKOUT_REDIRECT', [
                'host' => request()->getHost(),
                'checkout_id' => $checkoutId !== '' ? $checkoutId : null,
                'checkout_reference' => $payload['checkout_reference'],
                'redirect_url' => $hostedCheckoutUrl,
            ]);
        }

        return pmdSumupCompatResponse([
            'success' => $resp->successful(),
            'provider' => 'sumup',
            'integration_mode' => 'payments',
            'status' => $resp->status(),
            'redirect_url' => $hostedCheckoutUrl !== '' ? $hostedCheckoutUrl : null,
            'hosted_checkout_url' => $hostedCheckoutUrl !== '' ? $hostedCheckoutUrl : null,
            'checkout_id' => $checkoutId !== '' ? $checkoutId : null,
            'hosted_checkout' => true,
            'data' => $responseBody,
        ], $resp->status(), '/api/v1/payments/card/create-session');
    });

    Route::get('/payments/sumup/checkout/{checkoutId}', function ($checkoutId) {
        Log::warning('PMD_SUMUP_COMPAT_ROUTE_HIT', [
            'route' => '/api/v1/payments/sumup/checkout/{checkoutId}',
            'canonical_route' => '/api/v1/payments/sumup/checkout-status',
        ]);
        $cfg = pmdLoadSumupConfig();

        if (!$cfg) {
            return pmdSumupCompatResponse([
                'success' => false,
                'error' => 'SumUp configuration not found',
            ], 404, '/api/v1/payments/sumup/checkout-status');
        }

        $baseUrl = rtrim($cfg->url ?: 'https://api.sumup.com', '/');

        $resp = Http::withToken($cfg->access_token)
            ->acceptJson()
            ->get($baseUrl.'/v0.1/checkouts/'.$checkoutId);

        return pmdSumupCompatResponse([
            'success' => $resp->successful(),
            'provider' => 'sumup',
            'status' => $resp->status(),
            'data' => $resp->json(),
        ], $resp->status(), '/api/v1/payments/sumup/checkout-status');
    });

    Route::post('/payments/sumup/refund/{txnId}', function (Request $request, $txnId) {
        Log::warning('PMD_SUMUP_COMPAT_ROUTE_HIT', [
            'route' => '/api/v1/payments/sumup/refund/{txnId}',
            'canonical_route' => '/api/v1/payments/sumup/refund',
        ]);
        $cfg = pmdLoadSumupConfig();

        if (!$cfg) {
            return pmdSumupCompatResponse([
                'success' => false,
                'error' => 'SumUp configuration not found',
            ], 404, '/api/v1/payments/sumup/refund');
        }

        $validated = $request->validate([
            'amount' => 'nullable|numeric|min:0.01',
        ]);

        $payload = [];

        if (isset($validated['amount'])) {
            $payload['amount'] = (float)$validated['amount'];
        }

        $resp = Http::withToken($cfg->access_token)
            ->acceptJson()
            ->post($baseUrl.'/v0.1/me/refund/'.$txnId, $payload);

        Log::info('PMD SumUp refund', [
            'txn_id' => $txnId,
            'status' => $resp->status(),
            'payload' => $payload,
            'response' => $resp->json(),
        ]);

        return pmdSumupCompatResponse([
            'success' => $resp->successful(),
            'provider' => 'sumup',
            'status' => $resp->status(),
            'data' => $resp->json(),
        ], $resp->status(), '/api/v1/payments/sumup/refund');
    });

    Route::post('/webhook/sumup', function (Request $request) {
        Log::warning('PMD_SUMUP_COMPAT_ROUTE_HIT', [
            'route' => '/api/v1/webhook/sumup',
            'canonical_route' => '/api/v1/payments/sumup/webhook',
        ]);
        $cfg = pmdLoadSumupConfig();

        Log::info('PMD SumUp webhook received', [
            'event_type' => $request->input('event_type'),
            'id' => $request->input('id'),
        ]);

        if (!$cfg) {
            return pmdSumupCompatResponse(['success' => false, 'error' => 'SumUp configuration not found'], 404, '/api/v1/payments/sumup/webhook');
        }

        $payload = $request->all();
        $eventType = $payload['event_type'] ?? null;
        $checkoutId = $payload['id'] ?? null;

        if ($eventType === 'CHECKOUT_STATUS_CHANGED' && $checkoutId) {
            $baseUrl = rtrim($cfg->url ?: 'https://api.sumup.com', '/');

            $verify = Http::withToken($cfg->access_token)
                ->acceptJson()
                ->get($baseUrl.'/v0.1/checkouts/'.$checkoutId);

            Log::info('PMD SumUp webhook verified checkout', [
                'checkout_id' => $checkoutId,
                'verify_status' => $verify->status(),
                'checkout_status' => $verify->json()['status'] ?? null,
            ]);
            if ($verify->ok()) {
                $finalize = pmdFinalizeSumupCheckoutIfPaid((array)$verify->json());
                Log::info('PMD SumUp webhook finalize result', $finalize);
            }
        }

        return pmdSumupCompatResponse(['success' => true], 200, '/api/v1/payments/sumup/webhook');
    });
});



Route::post('/payments/sumup/create-hosted-checkout', function (\Illuminate\Http\Request $request) {
    \Log::warning('PMD_SUMUP_COMPAT_ROUTE_HIT', [
        'route' => '/payments/sumup/create-hosted-checkout',
        'canonical_route' => '/api/v1/payments/card/create-session',
    ]);
    try {
        $payment = \Admin\Models\Payments_model::isEnabled()->where('code', 'sumup')->first();

        if (!$payment) {
            return pmdSumupCompatResponse([
                'success' => false,
                'error' => 'SumUp configuration not found',
            ], 404, '/api/v1/payments/card/create-session');
        }

        $data = (array) ($payment->data ?? []);
        $mode = $data['transaction_mode'] ?? 'test';

        $apiKey = $mode === 'live'
            ? ($data['live_api_key'] ?? null)
            : ($data['test_api_key'] ?? null);

        $merchantCode = $data['merchant_code'] ?? null;
        $baseUrl = rtrim($data['base_url'] ?? 'https://api.sumup.com', '/');

        if (!$apiKey || !$merchantCode) {
            return pmdSumupCompatResponse([
                'success' => false,
                'error' => 'SumUp gateway is not configured correctly',
            ], 422, '/api/v1/payments/card/create-session');
        }

        $amount = (float) $request->input('amount', 0);
        $currency = strtoupper((string) $request->input('currency', 'EUR'));
        $description = (string) $request->input('description', 'PayMyDine SumUp checkout');
        $checkoutReference = (string) $request->input('checkout_reference', 'PMD-SUMUP-' . now()->format('YmdHis'));
        $redirectUrl = (string) $request->input('redirect_url', $data['return_url'] ?? url('/sumup/return'));
        $returnUrl = (string) $request->input('return_url', $data['webhook_url'] ?? url('/api/v1/webhook/sumup'));

        if ($amount <= 0) {
            return pmdSumupCompatResponse([
                'success' => false,
                'error' => 'Amount must be greater than zero',
            ], 422, '/api/v1/payments/card/create-session');
        }

        $payload = [
            'checkout_reference' => $checkoutReference,
            'amount' => round($amount, 2),
            'currency' => $currency,
            'merchant_code' => $merchantCode,
            'description' => $description,
            'redirect_url' => $redirectUrl,
            'return_url' => $returnUrl,
            'hosted_checkout' => [
                'enabled' => true,
            ],
        ];

        $resp = \Illuminate\Support\Facades\Http::withToken($apiKey)
            ->acceptJson()
            ->post($baseUrl . '/v0.1/checkouts', $payload);

        $json = $resp->json();

        return pmdSumupCompatResponse([
            'success' => $resp->successful(),
            'provider' => 'sumup',
            'integration_mode' => 'hosted_checkout',
            'status' => $resp->status(),
            'payload' => $payload,
            'data' => $json,
            'hosted_checkout_url' => $json['hosted_checkout_url'] ?? null,
            'checkout_id' => $json['id'] ?? null,
        ], $resp->status(), '/api/v1/payments/card/create-session');
    } catch (\Throwable $e) {
        \Log::error('SumUp hosted checkout create failed', [
            'message' => $e->getMessage(),
        ]);

        return pmdSumupCompatResponse([
            'success' => false,
            'error' => $e->getMessage(),
        ], 500, '/api/v1/payments/card/create-session');
    }
});

Route::get('/payment/sumup/complete', function (\Illuminate\Http\Request $request) {
    \Log::info('SUMUP_HOSTED_CHECKOUT_RETURN', [
        'host' => $request->getHost(),
        'checkout_id' => (string)$request->query('checkout_id', ''),
        'query' => $request->query(),
    ]);

    $checkoutId = trim((string)$request->query('checkout_id', ''));
    $target = '/menu?payment_return_provider=sumup';
    if ($checkoutId !== '') {
        $target .= '&checkout_id='.urlencode($checkoutId);
    }

    return redirect($target);
});
