<?php

/**
 * Worldline native card runtime.
 *
 * Raw card fields are intentionally not accepted by any route in this file.
 * The browser uses the official Worldline Client SDK and sends only
 * encrypted_customer_input after the PMD server has created an authoritative
 * order-bound payment session.
 */

\Illuminate\Support\Facades\Route::group([
    'prefix' => 'api/v1',
    'middleware' => [
        'web',
        \App\Http\Middleware\DetectTenant::class,
        \App\Http\Middleware\TenantDatabaseMiddleware::class,
    ],
], function () {
    $authorizeCard = static function () {
        $registry = app(\App\Services\Payments\ProviderCapabilityRegistry::class);
        if (!$registry->implementsPaymentMethod('worldline', 'card')) {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_card_not_implemented',
                'error' => 'Worldline card payments are not enabled in the PMD runtime.',
            ], 409);
        }

        $method = \Admin\Models\Payments_model::query()->where('code', 'card')->first();
        $provider = strtolower(trim((string)($method->provider_code ?? '')));
        if (!$method || !(int)$method->status || $provider !== 'worldline') {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_card_not_assigned',
                'error' => 'Card is not enabled with Worldline for this restaurant.',
            ], 409);
        }
        return null;
    };

    $rejectRawCardFields = static function (\Illuminate\Http\Request $request) {
        $forbidden = [
            'pan', 'cardnumber', 'card_number', 'card-number',
            'cvv', 'cvc', 'securitycode', 'security_code',
            'expiry', 'expirydate', 'expiry_date', 'expiration', 'expirationdate',
        ];
        foreach (array_keys((array)$request->all()) as $key) {
            $normalized = strtolower(trim((string)$key));
            if (in_array($normalized, $forbidden, true)) {
                \Log::warning('WORLDLINE_NATIVE_CARD_RAW_FIELD_REJECTED', [
                    'host' => $request->getHost(),
                    'field' => $normalized,
                ]);
                return response()->json([
                    'success' => false,
                    'error_code' => 'worldline_raw_card_forbidden',
                    'error' => 'Raw card data must never be sent to the PayMyDine server.',
                ], 422);
            }
        }
        return null;
    };

    \Illuminate\Support\Facades\Route::post('/payments/worldline/native/card/create-session', function (\Illuminate\Http\Request $request) use ($authorizeCard, $rejectRawCardFields) {
        if ($denied = $authorizeCard()) {
            return $denied;
        }
        if ($rejected = $rejectRawCardFields($request)) {
            return $rejected;
        }

        $orderId = (int)$request->input('order_id', 0);
        if ($orderId <= 0) {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_order_required',
                'error' => 'Submit the order before starting a Worldline card payment.',
            ], 422);
        }

        $order = \Illuminate\Support\Facades\DB::table('orders')->where('order_id', $orderId)->first();
        if (!$order) {
            return response()->json(['success' => false, 'error' => 'Order not found.'], 404);
        }

        $returnUrl = trim((string)$request->input('return_url', ''));
        $returnHost = strtolower((string)parse_url($returnUrl, PHP_URL_HOST));
        if (!filter_var($returnUrl, FILTER_VALIDATE_URL)
            || strtolower((string)parse_url($returnUrl, PHP_URL_SCHEME)) !== 'https'
            || $returnHost === ''
            || !hash_equals(strtolower($request->getHost()), $returnHost)) {
            return response()->json(['success' => false, 'error' => 'Worldline return URL must use HTTPS on the current tenant host.'], 422);
        }

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
                    'error' => 'The payment intent has expired. Start the payment again.',
                ], 409);
            }

            $intentMethod = strtolower(trim((string)($intent->payment_method ?? '')));
            $intentProvider = strtolower(str_replace('-', '_', trim((string)($intent->provider ?? ''))));
            if (($intentMethod !== '' && $intentMethod !== 'card')
                || ($intentProvider !== '' && $intentProvider !== 'worldline')) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'worldline_payment_intent_mismatch',
                    'error' => 'The payment intent does not belong to this Worldline card payment.',
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
            $result = app(\App\Services\Payments\WorldlineNativeCardService::class)->createClientSession([
                'order_id' => $orderId,
                'amount_minor' => (int)round($payableAmount * 100),
                'principal_amount_minor' => (int)round($principalAmount * 100),
                'tip_amount_minor' => (int)round($tipAmount * 100),
                'currency' => 'EUR',
                'country_code' => 'DE',
                'locale' => (string)$request->input('locale', 'de_DE'),
                'merchant_reference' => 'PMD-ORDER-'.$orderId,
            ]);
            $result['message'] = 'Enter your card details below. Card data is encrypted by Worldline in your browser.';
            return response()->json($result);
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_NATIVE_CARD_SESSION_FAILED', [
                'host' => $request->getHost(),
                'order_id' => $orderId,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_native_card_session_unavailable',
                'error' => $e->getMessage() !== '' ? $e->getMessage() : 'Worldline native card session could not be created.',
            ], 502);
        }
    });

    \Illuminate\Support\Facades\Route::post('/payments/worldline/native/card/submit', function (\Illuminate\Http\Request $request) use ($authorizeCard, $rejectRawCardFields) {
        if ($denied = $authorizeCard()) {
            return $denied;
        }
        if ($rejected = $rejectRawCardFields($request)) {
            return $rejected;
        }

        $sessionId = strtolower(trim((string)$request->input('session_id', '')));
        $encrypted = trim((string)$request->input('encrypted_customer_input', ''));
        $productId = (int)$request->input('payment_product_id', 0);
        $returnUrl = trim((string)$request->input('return_url', ''));
        if (!preg_match('/^[a-f0-9]{48}$/', $sessionId) || $encrypted === '' || $productId <= 0 || $returnUrl === '') {
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_native_card_submit_invalid',
                'error' => 'Worldline encrypted card submission is incomplete.',
            ], 422);
        }

        try {
            return response()->json(
                app(\App\Services\Payments\WorldlineNativeCardService::class)
                    ->submitEncryptedCard($sessionId, $encrypted, $productId, $returnUrl)
            );
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_NATIVE_CARD_SUBMIT_FAILED', [
                'host' => $request->getHost(),
                'session_id' => $sessionId,
                'payment_product_id' => $productId,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'error_code' => 'worldline_native_card_submit_failed',
                'error' => $e->getMessage() !== '' ? $e->getMessage() : 'Worldline could not create the encrypted card payment.',
            ], 502);
        }
    });

    \Illuminate\Support\Facades\Route::post('/payments/worldline/native/card/status', function (\Illuminate\Http\Request $request) use ($authorizeCard, $rejectRawCardFields) {
        if ($denied = $authorizeCard()) {
            return $denied;
        }
        if ($rejected = $rejectRawCardFields($request)) {
            return $rejected;
        }
        $sessionId = strtolower(trim((string)$request->input('session_id', '')));
        $orderId = (int)$request->input('order_id', 0);
        if (!preg_match('/^[a-f0-9]{48}$/', $sessionId) || $orderId <= 0) {
            return response()->json(['success' => false, 'error' => 'session_id and order_id are required.'], 422);
        }

        try {
            $result = app(\App\Services\Payments\WorldlineNativeCardService::class)->verifiedStatus($sessionId);
            if ((int)($result['order_id'] ?? 0) !== $orderId) {
                return response()->json([
                    'success' => false,
                    'is_paid' => false,
                    'verification_ok' => false,
                    'error' => 'Worldline native card session does not belong to this order.',
                ], 409);
            }
            return response()->json($result);
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_NATIVE_CARD_STATUS_FAILED', [
                'host' => $request->getHost(),
                'session_id' => $sessionId,
                'order_id' => $orderId,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'is_paid' => false,
                'verification_ok' => false,
                'error' => 'Unable to verify Worldline native card payment status.',
            ], 502);
        }
    });

    \Illuminate\Support\Facades\Route::post('/payments/worldline/native/card/return', function (\Illuminate\Http\Request $request) use ($authorizeCard, $rejectRawCardFields) {
        if ($denied = $authorizeCard()) {
            return $denied;
        }
        if ($rejected = $rejectRawCardFields($request)) {
            return $rejected;
        }

        $sessionId = strtolower(trim((string)$request->input('session_id', '')));
        $returnMac = trim((string)$request->input('return_mac', $request->input('RETURNMAC', '')));
        $orderId = (int)$request->input('order_id', 0);
        if (!preg_match('/^[a-f0-9]{48}$/', $sessionId) || $returnMac === '' || $orderId <= 0) {
            return response()->json(['success' => false, 'error' => 'session_id, order_id and RETURNMAC are required.'], 422);
        }

        try {
            $service = app(\App\Services\Payments\WorldlineNativeCardService::class);
            if (!$service->verifyReturnMac($sessionId, $returnMac)) {
                \Log::warning('WORLDLINE_NATIVE_CARD_RETURN_MAC_MISMATCH', [
                    'host' => $request->getHost(),
                    'session_id' => $sessionId,
                    'order_id' => $orderId,
                ]);
                return response()->json([
                    'success' => false,
                    'is_paid' => false,
                    'verification_ok' => false,
                    'error_code' => 'worldline_return_mac_invalid',
                    'error' => 'Worldline return verification failed.',
                ], 401);
            }
            $result = $service->verifiedStatus($sessionId);
            if ((int)($result['order_id'] ?? 0) !== $orderId) {
                return response()->json([
                    'success' => false,
                    'is_paid' => false,
                    'verification_ok' => false,
                    'error' => 'Worldline native card return does not belong to this order.',
                ], 409);
            }
            $result['return_mac_verified'] = true;
            return response()->json($result);
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_NATIVE_CARD_RETURN_FAILED', [
                'host' => $request->getHost(),
                'session_id' => $sessionId,
                'order_id' => $orderId,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'is_paid' => false,
                'verification_ok' => false,
                'error' => 'Unable to verify Worldline native card return.',
            ], 502);
        }
    });
});
