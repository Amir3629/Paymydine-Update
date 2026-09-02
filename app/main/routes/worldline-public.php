<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/*
 * PMD Worldline public compatibility routes.
 *
 * Canonical checkout creation lives behind /api/v1/payments/card/create-session
 * and /api/v1/payments/worldline/wero/create-session where PayMyDine resolves
 * the submitted order and configured provider. These routes exist only for
 * provider returns/webhooks and for legacy callers that need an explicit,
 * fail-closed response.
 */

$worldlineSafeStatus = static function (array $status): array {
    return [
        'hosted_checkout_id' => $status['hosted_checkout_id'] ?? null,
        'hosted_checkout_status' => $status['hosted_checkout_status'] ?? null,
        'payment_id' => $status['payment_id'] ?? null,
        'payment_status' => $status['payment_status'] ?? null,
    ];
};

$worldlineVerifyWebhook = static function (Request $request, array $cfg): bool {
    $rawBody = (string) $request->getContent();
    $signature = trim((string) $request->header('X-GCS-Signature', ''));
    $keyId = trim((string) $request->header('X-GCS-KeyId', ''));
    $secret = (string) ($cfg['webhook_secret'] ?? '');

    if ($rawBody === '' || $signature === '' || $keyId === '' || $secret === '') {
        return false;
    }

    // Worldline Connect webhooks sign the exact raw request body with
    // HMAC-SHA256. Never verify a re-serialized JSON representation.
    $expected = base64_encode(hash_hmac('sha256', $rawBody, $secret, true));

    return hash_equals($expected, $signature);
};

Route::get('/api/v1/payments/worldline/debug-config', function () {
    return response()->json([
        'ok' => false,
        'provider' => 'worldline',
        'error' => 'Public Worldline diagnostics are disabled.',
    ], 404);
});

Route::get('/api/v1/payments/worldline/auth-diagnostic', function () {
    return response()->json([
        'ok' => false,
        'provider' => 'worldline',
        'error' => 'Public Worldline diagnostics are disabled.',
    ], 404);
});

Route::post('/api/v1/payments/worldline/create-hosted-checkout', function () {
    return response()->json([
        'ok' => false,
        'success' => false,
        'provider' => 'worldline',
        'error' => 'Legacy direct checkout creation is disabled. Use the canonical PayMyDine payment session endpoint.',
        'canonical_endpoint' => '/api/v1/payments/card/create-session',
    ], 410);
});

// Worldline validates a webhook endpoint with an HTTPS GET before activating
// it. The response body must contain only the verification header value.
Route::get('/api/v1/worldline/webhook', function (Request $request) {
    $verification = (string) $request->header('X-GCS-Webhooks-Endpoint-Verification', '');
    if ($verification === '') {
        return response('Missing endpoint verification header.', 400)
            ->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    return response($verification, 200)
        ->header('Content-Type', 'text/plain; charset=UTF-8')
        ->header('Cache-Control', 'no-store');
});

Route::post('/api/v1/worldline/webhook', function (Request $request) use ($worldlineVerifyWebhook) {
    try {
        $service = new \Admin\Classes\WorldlineHostedCheckoutService();
        $cfg = $service->getConfig();

        if (!$worldlineVerifyWebhook($request, $cfg)) {
            Log::warning('WORLDLINE WEBHOOK SIGNATURE REJECTED', [
                'provider' => 'worldline',
                'host' => request()->getHost(),
                'key_id_present' => $request->hasHeader('X-GCS-KeyId'),
                'signature_present' => $request->hasHeader('X-GCS-Signature'),
            ]);

            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Invalid webhook signature.',
            ], 401);
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!is_array($payload)) {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Invalid JSON payload.',
            ], 400);
        }

        // A signed webhook is a reconciliation signal, not settlement truth.
        // Persist/log only non-sensitive identifiers; canonical payment status
        // must still be retrieved from Worldline before an order is settled.
        $eventId = $payload['id'] ?? $payload['apiVersion'] ?? null;
        $type = $payload['type'] ?? null;
        $paymentId = data_get($payload, 'payment.id')
            ?? data_get($payload, 'paymentOutput.payment.id')
            ?? data_get($payload, 'payment.id');

        Log::info('WORLDLINE WEBHOOK ACCEPTED', [
            'provider' => 'worldline',
            'host' => request()->getHost(),
            'event_id' => is_scalar($eventId) ? (string) $eventId : null,
            'event_type' => is_scalar($type) ? (string) $type : null,
            'payment_id' => is_scalar($paymentId) ? (string) $paymentId : null,
        ]);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'accepted' => true,
            'settled' => false,
        ], 202);
    } catch (\Throwable $e) {
        Log::error('WORLDLINE WEBHOOK ERROR', [
            'provider' => 'worldline',
            'host' => request()->getHost(),
            'error_class' => get_class($e),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => 'Worldline webhook processing failed.',
        ], 500);
    }
});

Route::get('/api/v1/payments/worldline/status/{hostedCheckoutId}', function (string $hostedCheckoutId) use ($worldlineSafeStatus) {
    try {
        $hostedCheckoutId = trim($hostedCheckoutId);
        if ($hostedCheckoutId === '' || !preg_match('/^[A-Za-z0-9_-]{6,160}$/', $hostedCheckoutId)) {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Invalid hosted checkout identifier.',
            ], 422);
        }

        $service = new \Admin\Classes\WorldlineHostedCheckoutService();
        $host = request()->getHost();
        $saved = $service->getCheckoutSession($host, $hostedCheckoutId);
        if (!$saved) {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Hosted checkout session not found.',
            ], 404);
        }

        $status = $worldlineSafeStatus($service->getHostedCheckoutStatus($hostedCheckoutId));

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'result' => $status,
        ]);
    } catch (\Throwable $e) {
        Log::error('WORLDLINE STATUS CHECK ERROR', [
            'provider' => 'worldline',
            'host' => request()->getHost(),
            'error_class' => get_class($e),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => 'Worldline status could not be verified.',
        ], 500);
    }
});

Route::get('/api/v1/payments/worldline/return', function (Request $request) use ($worldlineSafeStatus) {
    try {
        $service = new \Admin\Classes\WorldlineHostedCheckoutService();
        $hostedCheckoutId = trim((string) $request->query('hostedCheckoutId', ''));
        $returnMac = trim((string) $request->query('RETURNMAC', ''));

        if ($hostedCheckoutId === '' || $returnMac === '') {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Missing Worldline return authentication data.',
            ], 422);
        }

        $host = request()->getHost();
        $saved = $service->getCheckoutSession($host, $hostedCheckoutId);
        if (!$saved) {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Hosted checkout session not found.',
            ], 404);
        }

        $savedReturnMac = (string) ($saved['return_mac'] ?? '');
        if ($savedReturnMac === '' || !hash_equals($savedReturnMac, $returnMac)) {
            Log::warning('WORLDLINE RETURN MAC REJECTED', [
                'provider' => 'worldline',
                'host' => $host,
                'hosted_checkout_id' => $hostedCheckoutId,
            ]);

            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Invalid Worldline return authentication.',
            ], 401);
        }

        // Browser return is only a signal. Query Worldline server-to-server and
        // expose the minimum status required by the return UI.
        $status = $worldlineSafeStatus($service->getHostedCheckoutStatus($hostedCheckoutId));

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'hosted_checkout_id' => $hostedCheckoutId,
            'return_mac_verified' => true,
            'status_result' => $status,
        ]);
    } catch (\Throwable $e) {
        Log::error('WORLDLINE RETURN HANDLER ERROR', [
            'provider' => 'worldline',
            'host' => request()->getHost(),
            'error_class' => get_class($e),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => 'Worldline return could not be verified.',
        ], 500);
    }
});
