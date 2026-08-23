<?php

use App\Services\Payments\SumupHostedCheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', \App\Http\Middleware\DetectTenant::class],
], function () {
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
