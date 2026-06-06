<?php

// Updated: Thu Aug 21 22:21:44 CEST 2025


/* PMD_WORLDLINE_PUBLIC_API_ROUTES */
Route::get('/api/v1/payments/worldline/debug-config', function () {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();
        $cfg = $svc->getConfig();

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'environment' => $svc->getEnvironment($cfg),
            'config_id' => $cfg['config_id'],
            'merchant_id_present' => !empty($cfg['merchant_id']),
            'api_key_id_present' => !empty($cfg['api_key_id']),
            'secret_api_key_present' => !empty($cfg['secret_api_key']),
            'webhook_secret_present' => !empty($cfg['webhook_secret']),
            'api_endpoint' => $cfg['api_endpoint'],
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE DEBUG CONFIG ERROR (PUBLIC API)', [
            'message' => $e->getMessage(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::post('/api/v1/payments/worldline/create-hosted-checkout', function (\Illuminate\Http\Request $request) {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();

        $payload = [
            'amount_minor' => (int) $request->input('amount_minor', 0),
            'currency' => (string) $request->input('currency', 'EUR'),
            'return_url' => (string) $request->input('return_url', url('/order-placed')),
            'locale' => (string) $request->input('locale', 'en_GB'),
            'country_code' => (string) $request->input('country_code', 'DE'),
            'merchant_customer_id' => (string) $request->input('merchant_customer_id', 'PMD-MIMOZA-TEST'),
        ];

        \Log::info('WORLDLINE CREATE HOSTED CHECKOUT HIT (PUBLIC API)', [
            'payload' => $payload,
            'host' => request()->getHost(),
        ]);

        $result = $svc->createHostedCheckout($payload);

        \Log::info('WORLDLINE CREATE HOSTED CHECKOUT OK (PUBLIC API)', $result);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'redirect_url' => $result['redirect_url'],
            'hosted_checkout_id' => $result['hosted_checkout_id'],
            'environment' => $result['environment'],
            'meta' => $result['request_meta'],
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE CREATE HOSTED CHECKOUT ERROR (PUBLIC API)', [
            'message' => $e->getMessage(),
            'class' => get_class($e),
            'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
            'errorId' => method_exists($e, 'getErrorId') ? $e->getErrorId() : null,
            'responseBody' => method_exists($e, 'getResponseBody') ? $e->getResponseBody() : null,
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::match(['GET','POST'], '/api/v1/worldline/webhook', function (\Illuminate\Http\Request $request) {
    try {
        \Log::info('WORLDLINE WEBHOOK HIT (PUBLIC API)', [
            'host' => request()->getHost(),
            'headers' => $request->headers->all(),
            'payload' => $request->all(),
            'raw' => $request->getContent(),
        ]);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'message' => 'Webhook received and logged. Signature verification comes in phase 2.',
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE WEBHOOK ERROR (PUBLIC API)', [
            'message' => $e->getMessage(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});
/* /PMD_WORLDLINE_PUBLIC_API_ROUTES */




Route::get('/api/v1/payments/worldline/auth-diagnostic', function () {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();
        $diag = $svc->getConfigForDiagnostics();

        \Log::info('WORLDLINE AUTH DIAGNOSTIC', $diag);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'diagnostic' => $diag,
            'note' => 'If hosted checkout still returns authorization error, the endpoint is reachable but the credential set is not accepted for this merchant/environment combination.',
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE AUTH DIAGNOSTIC ERROR', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});



Route::get('/api/v1/payments/worldline/status/{hostedCheckoutId}', function ($hostedCheckoutId) {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();
        $result = $svc->getHostedCheckoutStatus((string)$hostedCheckoutId);

        \Log::info('WORLDLINE STATUS CHECK', $result);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'result' => $result,
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE STATUS CHECK ERROR', [
            'message' => $e->getMessage(),
            'class' => get_class($e),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::get('/api/v1/payments/worldline/return', function (\Illuminate\Http\Request $request) {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();

        $hostedCheckoutId = (string)$request->query('hostedCheckoutId', '');
        $returnMac = (string)$request->query('RETURNMAC', '');

        if ($hostedCheckoutId === '') {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Missing hostedCheckoutId on return URL',
            ], 422);
        }

        $host = request()->getHost();
        $saved = $svc->getCheckoutSession($host, $hostedCheckoutId);

        if (!$saved) {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Hosted checkout session not found locally',
                'hosted_checkout_id' => $hostedCheckoutId,
            ], 404);
        }

        $savedReturnMac = (string)($saved['return_mac'] ?? '');
        $returnMacMatches = $savedReturnMac !== '' && $returnMac !== '' && hash_equals($savedReturnMac, $returnMac);

        $status = $svc->getHostedCheckoutStatus($hostedCheckoutId);

        \Log::info('WORLDLINE RETURN HANDLER', [
            'host' => $host,
            'hosted_checkout_id' => $hostedCheckoutId,
            'return_mac_matches' => $returnMacMatches,
            'status' => $status,
        ]);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'hosted_checkout_id' => $hostedCheckoutId,
            'return_mac_matches' => $returnMacMatches,
            'saved_session' => $saved,
            'status_result' => $status,
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE RETURN HANDLER ERROR', [
            'message' => $e->getMessage(),
            'class' => get_class($e),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});
