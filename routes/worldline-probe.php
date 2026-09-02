<?php

/**
 * Worldline legacy tombstones + canonical Connect runtime endpoints.
 *
 * This file is loaded after the historical admin route manifest. Legacy inline
 * routes stay dead; new runtime routes have unique URLs and never accept PAN/CVV.
 */

$worldlineLegacyInlineRetired = static function () {
    return response()->json([
        'success' => false,
        'provider' => 'worldline',
        'error_code' => 'worldline_legacy_inline_retired',
        'message' => 'Legacy Worldline inline payment APIs are retired. Use provider-hosted MyCheckout.',
    ], 410);
};

foreach ([
    '/payments/worldline/inline/session',
    '/payments/worldline/inline/client-session',
    '/payments/worldline/inline/create-payment',
    '/payments/worldline/inline/verify',
    '/payments/worldline/inline/payment-products',
    '/payments/worldline/raw-card-probe',
] as $retiredWorldlineRoute) {
    \Route::match(['get', 'post'], $retiredWorldlineRoute, $worldlineLegacyInlineRetired);
}

$worldlineAdminAuthorize = static function () {
    $auth = app('admin.auth');
    if (!$auth->isLogged()) {
        return response()->json(['success' => false, 'error' => 'Authentication required.'], 401);
    }
    $user = $auth->user();
    if (!$user || !$user->hasPermission('Site.Settings')) {
        return response()->json(['success' => false, 'error' => 'Settings permission required.'], 403);
    }
    return null;
};

// Tenant-specific Terminal API credentials. These are deliberately separate
// from Worldline Connect credentials: Terminal API uses a provider-issued
// bearer key and must never reuse the Connect secret API key.
\Illuminate\Support\Facades\Route::group([
    'prefix' => trim((string)config('system.adminUri', 'admin'), '/'),
    'middleware' => [
        'web',
        \App\Http\Middleware\DetectTenant::class,
        \App\Http\Middleware\TenantDatabaseMiddleware::class,
    ],
], function () use ($worldlineAdminAuthorize) {
    \Illuminate\Support\Facades\Route::post('/_pmd/worldline-connect-test', function () use ($worldlineAdminAuthorize) {
        if ($denied = $worldlineAdminAuthorize()) {
            return $denied;
        }
        $probe = app(\App\Services\Payments\WorldlineConnectRuntimeService::class)->probeConnectivity();
        return response()->json([
            'success' => (bool)($probe['ok'] ?? false),
            'connected' => (bool)($probe['connected'] ?? false),
            'message' => (string)($probe['message'] ?? 'Worldline connection test completed.'),
            'environment' => $probe['environment'] ?? null,
        ], ($probe['ok'] ?? false) ? 200 : 422);
    });

    \Illuminate\Support\Facades\Route::match(['get', 'post'], '/_pmd/worldline-terminal-config', function (\Illuminate\Http\Request $request) use ($worldlineAdminAuthorize) {
        if ($denied = $worldlineAdminAuthorize()) {
            return $denied;
        }

        $model = \Admin\Models\Payments_model::query()->where('code', 'worldline')->first();
        if (!$model) {
            return response()->json(['success' => false, 'error' => 'Worldline provider record not found.'], 404);
        }
        $data = method_exists($model, 'getConfigData') ? (array)$model->getConfigData() : (array)$model->data;

        if ($request->isMethod('post')) {
            $validated = $request->validate([
                'terminal_merchant_id' => ['nullable', 'string', 'max:255'],
                'terminal_api_base_url' => ['nullable', 'url', 'max:500'],
                'terminal_api_token' => ['nullable', 'string', 'max:4096'],
            ]);

            $merchantId = trim((string)($validated['terminal_merchant_id'] ?? ''));
            $baseUrl = rtrim(trim((string)($validated['terminal_api_base_url'] ?? '')), '/');
            $token = array_key_exists('terminal_api_token', $validated)
                ? trim((string)$validated['terminal_api_token'])
                : '';

            $data['terminal_merchant_id'] = $merchantId;
            $data['terminal_api_base_url'] = $baseUrl;
            if ($token !== '') {
                if (hash_equals('__clear__', strtolower($token))) {
                    $data['terminal_api_token'] = '';
                } else {
                    $data['terminal_api_token'] = $token;
                }
            }

            $model->setConfigData($data);
            $model->save();
            $data = method_exists($model, 'getConfigData') ? (array)$model->getConfigData() : (array)$model->data;

            \Log::info('WORLDLINE_TERMINAL_CONFIG_SAVED', [
                'host' => $request->getHost(),
                'provider_id' => $model->getKey(),
                'terminal_id_present' => trim((string)($data['terminal_id'] ?? '')) !== '',
                'terminal_merchant_id_present' => trim((string)($data['terminal_merchant_id'] ?? '')) !== '',
                'terminal_api_base_url_present' => trim((string)($data['terminal_api_base_url'] ?? '')) !== '',
                'terminal_api_token_present' => trim((string)($data['terminal_api_token'] ?? '')) !== '',
            ]);
        }

        $environment = strtolower(trim((string)($data['terminal_environment'] ?? 'test')));
        $baseUrl = trim((string)($data['terminal_api_base_url'] ?? ''));
        if ($baseUrl === '' && $environment !== 'live') {
            $baseUrl = 'https://api.terminal.iacc.global.worldline-solutions.com';
        }

        return response()->json([
            'success' => true,
            'provider' => 'worldline',
            'terminal_environment' => $environment,
            'terminal_id' => (string)($data['terminal_id'] ?? ''),
            'terminal_merchant_id' => (string)($data['terminal_merchant_id'] ?? $data['merchant_id'] ?? ''),
            'terminal_api_base_url' => $baseUrl,
            'terminal_api_token_present' => trim((string)($data['terminal_api_token'] ?? '')) !== '',
            'terminal_ready' => trim((string)($data['terminal_id'] ?? '')) !== ''
                && trim((string)($data['terminal_api_token'] ?? '')) !== ''
                && trim((string)($data['terminal_merchant_id'] ?? $data['merchant_id'] ?? '')) !== ''
                && $baseUrl !== '',
        ]);
    });
});

\Illuminate\Support\Facades\Route::group([
    'prefix' => 'api/v1',
    'middleware' => [
        'web',
        \App\Http\Middleware\DetectTenant::class,
        \App\Http\Middleware\TenantDatabaseMiddleware::class,
    ],
], function () {
    $methodMap = [
        'card' => 'card',
        'apple-pay' => 'apple_pay',
        'google-pay' => 'google_pay',
        'wero' => 'wero',
        'paypal' => 'paypal',
    ];

    // Frontend V2 consumes this canonical supplement. PMD configuration and
    // Worldline's own product-discovery API must BOTH allow a method before it
    // is offered to a guest.
    \Illuminate\Support\Facades\Route::get('/payments/worldline/runtime-methods', function () use ($methodMap) {
        try {
            $service = app(\App\Services\Payments\WorldlineConnectRuntimeService::class);
            $available = $service->availablePaymentProducts('DE', 'EUR');
            $registry = app(\App\Services\Payments\ProviderCapabilityRegistry::class);
            $allowed = array_values($methodMap);
            $rows = \Admin\Models\Payments_model::query()->whereIn('code', $allowed)->get();

            $methods = [];
            foreach ($rows as $row) {
                $code = strtolower(trim((string)$row->code));
                $provider = strtolower(trim((string)($row->provider_code ?? '')));
                if ($code === '' || !(int)$row->status || $provider !== 'worldline') {
                    continue;
                }
                if (!$registry->implementsPaymentMethod('worldline', $code)) {
                    continue;
                }
                $productIds = array_values(array_map('intval', (array)($available[$code] ?? [])));
                if (!$productIds) {
                    continue;
                }
                $methods[] = [
                    'code' => $code,
                    'name' => (string)($row->name ?: ucwords(str_replace('_', ' ', $code))),
                    'provider_code' => 'worldline',
                    'enabled' => true,
                    'status' => 1,
                    'priority' => (int)($row->priority ?? $row->sort_order ?? 50),
                    'worldline_product_ids' => $productIds,
                ];
            }

            usort($methods, static fn (array $a, array $b) => ($a['priority'] <=> $b['priority']) ?: strcmp($a['code'], $b['code']));

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'methods' => $methods,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_RUNTIME_METHOD_DISCOVERY_FAILED', [
                'host' => request()->getHost(),
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'methods' => [],
                'error' => 'Worldline payment-product availability could not be verified.',
            ], 503);
        }
    });

    \Illuminate\Support\Facades\Route::post('/payments/worldline/runtime/{method}/create-session', function (\Illuminate\Http\Request $request, string $method) use ($methodMap) {
        $methodCode = $methodMap[strtolower(trim($method))] ?? null;
        if (!$methodCode) {
            return response()->json(['success' => false, 'error' => 'Unsupported Worldline payment method.'], 404);
        }

        $registry = app(\App\Services\Payments\ProviderCapabilityRegistry::class);
        if (!$registry->implementsPaymentMethod('worldline', $methodCode)) {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_method_not_implemented',
                'error' => 'This Worldline payment method is not enabled in the PMD runtime.',
            ], 409);
        }

        $methodRecord = \Admin\Models\Payments_model::query()->where('code', $methodCode)->first();
        $assignedProvider = strtolower(trim((string)($methodRecord->provider_code ?? '')));
        if (!$methodRecord || !(int)$methodRecord->status || $assignedProvider !== 'worldline') {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_method_not_assigned',
                'error' => 'The selected payment method is not enabled with Worldline.',
            ], 409);
        }

        $orderId = (int)$request->input('order_id', 0);
        if ($orderId <= 0) {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_order_required',
                'error' => 'Submit the order before starting a Worldline payment.',
            ], 422);
        }

        $order = \Illuminate\Support\Facades\DB::table('orders')->where('order_id', $orderId)->first();
        if (!$order) {
            return response()->json(['success' => false, 'error' => 'Order not found.'], 404);
        }

        $returnUrl = trim((string)$request->input('return_url', ''));
        $returnHost = strtolower((string)parse_url($returnUrl, PHP_URL_HOST));
        if ($returnHost === '' || !hash_equals(strtolower($request->getHost()), $returnHost)) {
            return response()->json(['success' => false, 'error' => 'Worldline return URL must use the current tenant host.'], 422);
        }

        // PayMyDine, not the browser, owns principal amount authority.
        $orderTotal = round((float)($order->order_total ?? $order->total ?? 0), 4);
        $settledAmount = max(0.0, round((float)($order->settled_amount ?? 0), 4));
        $remainingAmount = max(0.0, round($orderTotal - $settledAmount, 4));
        $principalAmount = $remainingAmount;
        $tipAmount = max(0.0, round((float)$request->input('tip_amount', 0), 4));
        $payableAmount = round($principalAmount + $tipAmount, 4);

        $allocations = $request->input('order_allocations', []);
        if (is_array($allocations) && count(array_filter($allocations)) > 1) {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_multi_order_not_enabled',
                'error' => 'Worldline grouped multi-order payment is not enabled yet. Pay one submitted order at a time.',
            ], 409);
        }

        $intentToken = trim((string)$request->input('payment_intent_token', ''));
        $selectedItems = $request->input('selected_items');
        if ($intentToken !== '') {
            if (!\Illuminate\Support\Facades\Schema::hasTable('pmd_guest_payment_intents')) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'worldline_payment_intent_unavailable',
                    'error' => 'Server payment intent storage is unavailable.',
                ], 503);
            }

            $intent = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
                ->where('token', $intentToken)
                ->where('order_id', $orderId)
                ->where('status', 'pending')
                ->first();

            if (!$intent) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'worldline_payment_intent_invalid',
                    'error' => 'The split-payment intent is missing, expired, or already used.',
                ], 409);
            }

            if (!empty($intent->expires_at) && \Illuminate\Support\Carbon::parse($intent->expires_at)->isPast()) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'worldline_payment_intent_expired',
                    'error' => 'The split-payment intent has expired. Start the payment again.',
                ], 409);
            }

            $intentMethod = strtolower(trim((string)($intent->payment_method ?? '')));
            $intentProvider = strtolower(str_replace('-', '_', trim((string)($intent->provider ?? ''))));
            if (($intentMethod !== '' && $intentMethod !== $methodCode)
                || ($intentProvider !== '' && $intentProvider !== 'worldline')) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'worldline_payment_intent_mismatch',
                    'error' => 'The payment intent does not belong to this Worldline payment method.',
                ], 409);
            }

            $principalAmount = max(0.0, round((float)($intent->principal_amount ?? 0), 4));
            $tipAmount = max(0.0, round((float)($intent->tip_amount ?? 0), 4));
            $payableAmount = max(0.0, round((float)($intent->payable_amount ?? 0), 4));
        } elseif (is_array($selectedItems) && count($selectedItems) > 0) {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_split_intent_required',
                'error' => 'Split/item Worldline payments require a server-generated payment intent.',
            ], 409);
        }

        $couponCode = trim((string)$request->input('coupon_code', ''));
        $couponDiscount = max(0.0, round((float)$request->input('coupon_discount', 0), 4));
        if ($intentToken === '' && ($couponCode !== '' || $couponDiscount > 0.0001)) {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_coupon_intent_required',
                'error' => 'Coupon-adjusted Worldline payments require a server-authoritative payment intent.',
            ], 409);
        }

        if ($principalAmount <= 0 || $payableAmount <= 0) {
            return response()->json(['success' => false, 'error' => 'Order has no remaining amount to pay.'], 422);
        }

        try {
            $service = app(\App\Services\Payments\WorldlineConnectRuntimeService::class);
            $result = $service->createHostedCheckout([
                'payment_method' => $methodCode,
                'amount_minor' => (int)round($payableAmount * 100),
                'principal_amount_minor' => (int)round($principalAmount * 100),
                'tip_amount_minor' => (int)round($tipAmount * 100),
                'currency' => 'EUR',
                'country_code' => 'DE',
                'locale' => (string)$request->input('locale', 'de_DE'),
                'return_url' => $returnUrl,
                'order_id' => $orderId,
                'merchant_reference' => 'PMD-ORDER-'.$orderId,
            ]);

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'redirect_url' => $result['redirect_url'],
                'hosted_checkout_id' => $result['hosted_checkout_id'],
                'payment_method' => $methodCode,
                'payment_product_ids' => $result['payment_product_ids'] ?? [],
                'order_id' => $orderId,
                'principal_amount' => $principalAmount,
                'tip_amount' => $tipAmount,
                'amount' => $payableAmount,
                'currency' => 'EUR',
            ]);
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_RUNTIME_CREATE_SESSION_FAILED', [
                'host' => $request->getHost(),
                'order_id' => $orderId,
                'payment_method' => $methodCode,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_session_unavailable',
                'error' => $e->getMessage() !== ''
                    ? $e->getMessage()
                    : 'Worldline could not start this payment method.',
            ], 502);
        }
    })->where('method', 'card|apple-pay|google-pay|wero|paypal');

    \Illuminate\Support\Facades\Route::post('/payments/worldline/runtime/status', function (\Illuminate\Http\Request $request) {
        $checkoutId = trim((string)$request->input('hosted_checkout_id', ''));
        $orderId = (int)$request->input('order_id', 0);
        if ($checkoutId === '' || $orderId <= 0) {
            return response()->json(['success' => false, 'error' => 'hosted_checkout_id and order_id are required.'], 422);
        }

        try {
            $result = app(\App\Services\Payments\WorldlineConnectRuntimeService::class)->verifiedStatus($checkoutId);
            if ((int)($result['order_id'] ?? 0) !== $orderId) {
                \Log::warning('WORLDLINE_RUNTIME_ORDER_MISMATCH', [
                    'host' => $request->getHost(),
                    'hosted_checkout_id' => $checkoutId,
                    'requested_order_id' => $orderId,
                    'session_order_id' => $result['order_id'] ?? null,
                ]);
                return response()->json([
                    'success' => false,
                    'is_paid' => false,
                    'verification_ok' => false,
                    'error' => 'Worldline checkout does not belong to this order.',
                ], 409);
            }

            return response()->json($result);
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_RUNTIME_STATUS_FAILED', [
                'host' => $request->getHost(),
                'hosted_checkout_id' => $checkoutId,
                'order_id' => $orderId,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'is_paid' => false,
                'verification_ok' => false,
                'error' => 'Unable to verify Worldline payment status.',
            ], 502);
        }
    });
});

require_once __DIR__.'/worldline-native-card.php';
