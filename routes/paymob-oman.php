<?php

use App\Http\Middleware\DetectTenant;
use App\Http\Middleware\TenantDatabaseMiddleware;
use App\Services\Payments\PaymobOmanCallbackService;
use App\Services\Payments\PaymobOmanCheckoutService;
use App\Services\Payments\PaymobOmanFinancialAdjustmentService;
use App\Services\Payments\PaymobOmanGuestCatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
 * PMD_PAYMOB_OMAN_GUEST_ROUTES_R11
 *
 * The processed callback deliberately does NOT use the `web` middleware group,
 * so an external Paymob POST cannot be rejected by browser CSRF protection.
 * Tenant resolution still runs before any provider secret or financial row is read.
 */
Route::post('/api/v1/payments/paymob/callback', function (Request $request, PaymobOmanCallbackService $service) {
    $result = $service->handleCallback((array)$request->all(), $request->query('hmac'));

    if (($result['settled_by_backend'] ?? false) && is_array($result['settlements'] ?? null)) {
        $adjuster = app(PaymobOmanFinancialAdjustmentService::class);
        $result['financial_adjustments'] = [];
        foreach ($result['settlements'] as $settlement) {
            if (!is_array($settlement) || empty($settlement['order_id'])) continue;
            $result['financial_adjustments'][] = $adjuster->finalizeIfPaid((int)$settlement['order_id']);
        }
    }

    $status = (int)($result['http_status'] ?? (($result['ok'] ?? false) ? 200 : 422));
    unset($result['http_status']);
    return response()->json($result, $status);
})->middleware([DetectTenant::class, TenantDatabaseMiddleware::class])
    ->name('pmd.paymob.oman.callback');

Route::group([
    'prefix' => 'api/v1/payments/paymob',
    'middleware' => ['web', DetectTenant::class, TenantDatabaseMiddleware::class],
], function () {
    Route::get('/catalog', function (Request $request, PaymobOmanGuestCatalogService $catalog) {
        $locationId = $request->query('location_id');
        return response()->json($catalog->state(is_numeric($locationId) ? (int)$locationId : null));
    })->name('pmd.paymob.oman.catalog');

    Route::post('/create-intention', function (Request $request, PaymobOmanCheckoutService $checkout) {
        $validated = $request->validate([
            'order_id' => ['nullable', 'integer', 'min:1'],
            'payment_method' => ['required', 'string', 'in:om_card,om_omannet,om_apple_pay,om_google_pay'],
            'merchant_reference' => ['nullable', 'string', 'max:191'],
            'guest_session_id' => ['nullable', 'string', 'max:191'],
            'payment_intent_token' => ['nullable', 'string', 'max:64'],
            'location_id' => ['nullable', 'integer', 'min:1'],
            'table_id' => ['nullable'],
            'table_no' => ['nullable'],
            'qr' => ['nullable', 'string', 'max:255'],
            'tip_amount' => ['nullable', 'numeric', 'min:0'],
            'coupon_code' => ['nullable', 'string', 'max:191'],
            'coupon_discount' => ['nullable', 'numeric', 'min:0'],
            'selected_items' => ['nullable', 'array'],
            'order_allocations' => ['nullable', 'array', 'max:20'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:64'],
            'first_name' => ['nullable', 'string', 'max:120'],
            'last_name' => ['nullable', 'string', 'max:120'],
            'return_url' => ['required', 'url', 'max:2000'],
        ]);

        $returnUrl = (string)$validated['return_url'];
        $returnHost = strtolower((string)parse_url($returnUrl, PHP_URL_HOST));
        if ($returnHost === '' || $returnHost !== strtolower($request->getHost())) {
            return response()->json(['ok' => false, 'message' => 'Paymob return URL must stay on this restaurant domain.'], 422);
        }

        $validated['notification_url'] = 'https://'.$request->getHost().'/api/v1/payments/paymob/callback';
        $result = $checkout->create($validated);
        $status = (int)($result['http_status'] ?? (($result['ok'] ?? false) ? 201 : 422));
        unset($result['http_status']);
        return response()->json($result, $status);
    })->name('pmd.paymob.oman.create-intention');

    Route::post('/checkout-status', function (Request $request, PaymobOmanCallbackService $service) {
        $validated = $request->validate([
            'attempt_reference' => ['nullable', 'string', 'max:96'],
            'provider_reference' => ['nullable', 'string', 'max:96'],
        ]);
        $reference = trim((string)($validated['attempt_reference'] ?? $validated['provider_reference'] ?? ''));
        if ($reference === '') {
            return response()->json(['ok' => false, 'message' => 'Paymob payment reference is required.'], 422);
        }
        $result = $service->status($reference);

        if (($result['settled_by_backend'] ?? false) && is_array($result['settlements'] ?? null)) {
            $adjuster = app(PaymobOmanFinancialAdjustmentService::class);
            $result['financial_adjustments'] = [];
            foreach ($result['settlements'] as $settlement) {
                if (!is_array($settlement) || empty($settlement['order_id'])) continue;
                $result['financial_adjustments'][] = $adjuster->finalizeIfPaid((int)$settlement['order_id']);
            }
        }

        $status = (int)($result['http_status'] ?? (($result['ok'] ?? false) ? 200 : 422));
        unset($result['http_status']);
        return response()->json($result, $status);
    })->name('pmd.paymob.oman.checkout-status');
});
