<?php

use App\Services\Payments\SumupHostedCheckoutService;
use App\Services\Payments\SumupOnlineCheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', \App\Http\Middleware\DetectTenant::class],
], function () {
    // PMD_SUMUP_SWIFT_ROUTE_R5
    // Browser-safe configuration for dedicated Apple Pay / Google Pay Swift Checkout.
    Route::get('/payments/sumup/swift/config', function (SumupOnlineCheckoutService $service) {
        try {
            return response()->json($service->swiftCheckoutConfig());
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'provider' => 'sumup',
                'integration_mode' => 'swift_checkout',
                'message' => $e->getMessage() ?: 'Could not prepare SumUp wallet checkout.',
            ], 422);
        }
    })->name('pmd.sumup.swift.config');

    // Canonical embedded online-payment flow. The browser receives only a
    // checkout id and public widget configuration; SumUp credentials remain
    // encrypted inside the tenant database and card data goes directly to
    // the SumUp Payment Widget.
    Route::post('/payments/sumup/widget/create-checkout', function (
        Request $request,
        SumupOnlineCheckoutService $service
    ) {
        try {
            $payload = $request->validate([
                'amount' => ['required', 'numeric', 'min:0.01'],
                'currency' => ['required', 'string', 'size:3'],
                'order_id' => ['nullable', 'integer', 'min:1'],
                'description' => ['nullable', 'string', 'max:255'],
                'return_url' => ['required', 'url', 'max:1200'],
                'merchant_reference' => ['nullable', 'string', 'max:191'],
                'payment_method' => ['nullable', 'string', 'in:card,apple_pay,google_pay'],
                'items' => ['nullable', 'array'],
            ]);

            return response()->json($service->createWidgetCheckout($payload));
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'provider' => 'sumup',
                'integration_mode' => 'payment_widget',
                'message' => $e->getMessage() ?: 'Could not start SumUp Payment Widget.',
            ], 422);
        }
    })->name('pmd.sumup.widget.checkout');

    Route::post('/payments/sumup/widget/status', function (
        Request $request,
        SumupOnlineCheckoutService $service
    ) {
        try {
            $payload = $request->validate([
                'checkout_id' => ['required', 'string', 'max:191'],
                'order_id' => ['nullable', 'integer', 'min:1'],
                'amount' => ['nullable', 'numeric', 'min:0.01'],
                'currency' => ['nullable', 'string', 'size:3'],
            ]);

            $status = $service->status((string)$payload['checkout_id']);

            if (!empty($payload['order_id'])) {
                $expectedPrefix = 'PMD-ORD-'.(int)$payload['order_id'].'-';
                $reference = (string)($status['checkout_reference'] ?? '');
                if ($reference === '' || strpos($reference, $expectedPrefix) !== 0) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'sumup',
                        'integration_mode' => 'payment_widget',
                        'message' => 'SumUp checkout does not belong to this order.',
                    ], 409);
                }
            }

            if (isset($payload['amount']) && $status['amount'] !== null) {
                if (abs((float)$status['amount'] - round((float)$payload['amount'], 2)) > 0.009) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'sumup',
                        'integration_mode' => 'payment_widget',
                        'message' => 'SumUp checkout amount does not match this payment.',
                    ], 409);
                }
            }

            if (!empty($payload['currency']) && !empty($status['currency'])) {
                if (strtoupper((string)$status['currency']) !== strtoupper((string)$payload['currency'])) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'sumup',
                        'integration_mode' => 'payment_widget',
                        'message' => 'SumUp checkout currency does not match this payment.',
                    ], 409);
                }
            }

            return response()->json($status);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'provider' => 'sumup',
                'integration_mode' => 'payment_widget',
                'message' => $e->getMessage() ?: 'Could not verify SumUp payment.',
            ], 422);
        }
    })->name('pmd.sumup.widget.status');

    // Hosted checkout remains available as a compatibility/fallback product,
    // but PayMyDine frontend-v2 uses the embedded Payment Widget above.
    Route::post('/payments/sumup/self-service-checkout', function (
        Request $request,
        SumupHostedCheckoutService $service
    ) {
        try {
            $payload = $request->validate([
                'amount' => ['required', 'numeric', 'min:0.01'],
                'currency' => ['required', 'string', 'size:3'],
                'order_id' => ['nullable', 'integer', 'min:1'],
                'description' => ['nullable', 'string', 'max:255'],
                'return_url' => ['required', 'url', 'max:1200'],
                'cancel_url' => ['nullable', 'url', 'max:1200'],
                'customer_email' => ['nullable', 'email', 'max:255'],
                'merchant_reference' => ['nullable', 'string', 'max:191'],
                'items' => ['nullable', 'array'],
            ]);

            return response()->json($service->create($payload));
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'provider' => 'sumup',
                'message' => $e->getMessage() ?: 'Could not start SumUp checkout.',
            ], 422);
        }
    })->name('pmd.sumup.self-service.checkout');

    Route::post('/payments/sumup/self-service-status', function (
        Request $request,
        SumupHostedCheckoutService $service
    ) {
        try {
            $payload = $request->validate([
                'checkout_id' => ['required', 'string', 'max:191'],
            ]);

            return response()->json($service->status((string)$payload['checkout_id']));
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'provider' => 'sumup',
                'message' => $e->getMessage() ?: 'Could not verify SumUp checkout.',
            ], 422);
        }
    })->name('pmd.sumup.self-service.status');
});
