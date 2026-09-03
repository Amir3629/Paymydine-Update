<?php

/**
 * Canonical Square runtime.
 *
 * - Web Payments SDK receives only public Square identifiers.
 * - PMD never accepts raw PAN/CVV.
 * - Square source tokens are charged server-side.
 * - PMD settlement must still verify Square Payment amount/currency/reference.
 */

\Illuminate\Support\Facades\Route::group([
    'prefix' => 'api/v1',
    'middleware' => [
        'web',
        \App\Http\Middleware\DetectTenant::class,
        \App\Http\Middleware\TenantDatabaseMiddleware::class,
    ],
], function () {
    $rejectRawCard = static function (\Illuminate\Http\Request $request) {
        $forbidden = ['pan','cardnumber','card_number','card-number','cvv','cvc','securitycode','security_code','expiry','expirydate','expiry_date','expiration'];
        foreach (array_keys((array)$request->all()) as $key) {
            if (in_array(strtolower(trim((string)$key)), $forbidden, true)) {
                \Log::warning('SQUARE_RAW_CARD_FIELD_REJECTED', ['host' => $request->getHost(), 'field' => (string)$key]);
                return response()->json(['success' => false, 'error' => 'Raw card data must never be sent to PayMyDine.'], 422);
            }
        }
        return null;
    };

    $authorizeMethod = static function (string $methodCode) {
        $methodCode = strtolower(trim($methodCode));
        if (!in_array($methodCode, ['card', 'apple_pay', 'google_pay'], true)) {
            return response()->json(['success' => false, 'error' => 'Unsupported Square payment method.'], 422);
        }
        $registry = app(\App\Services\Payments\ProviderCapabilityRegistry::class);
        if (!$registry->implementsPaymentMethod('square', $methodCode)) {
            return response()->json(['success' => false, 'error' => 'This Square method is not enabled in the PayMyDine runtime.'], 409);
        }
        $method = \Admin\Models\Payments_model::query()->where('code', $methodCode)->first();
        $provider = strtolower(trim((string)($method->provider_code ?? '')));
        if (!$method || !(int)$method->status || $provider !== 'square') {
            return response()->json(['success' => false, 'error' => ucfirst(str_replace('_', ' ', $methodCode)).' is not enabled with Square for this restaurant.'], 409);
        }
        return null;
    };

    $resolveOrderPayment = static function (\Illuminate\Http\Request $request, string $methodCode): array {
        $orderId = (int)$request->input('order_id', 0);
        if ($orderId <= 0) throw new \InvalidArgumentException('Submit the order before starting a Square payment.');
        $order = \Illuminate\Support\Facades\DB::table('orders')->where('order_id', $orderId)->first();
        if (!$order) throw new \InvalidArgumentException('Order not found.');

        $orderTotal = max(0.0, round((float)($order->order_total ?? $order->total ?? 0), 4));
        $settled = max(0.0, round((float)($order->settled_amount ?? 0), 4));
        $remaining = max(0.0, round($orderTotal - $settled, 4));
        $principal = $remaining;
        $tip = max(0.0, round((float)$request->input('tip_amount', 0), 4));
        $intentId = null;
        $intentToken = trim((string)$request->input('payment_intent_token', ''));

        if ($intentToken !== '') {
            if (!\Illuminate\Support\Facades\Schema::hasTable('pmd_guest_payment_intents')) {
                throw new \RuntimeException('Server payment intent storage is unavailable.');
            }
            $intent = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
                ->where('token', $intentToken)->where('order_id', $orderId)->where('status', 'pending')->first();
            if (!$intent) throw new \InvalidArgumentException('The split-payment intent is missing, expired, or already used.');
            if (!empty($intent->expires_at) && \Illuminate\Support\Carbon::parse($intent->expires_at)->isPast()) {
                throw new \InvalidArgumentException('The split-payment intent has expired.');
            }
            $intentMethod = strtolower(trim((string)($intent->payment_method ?? '')));
            $intentProvider = strtolower(str_replace('-', '_', trim((string)($intent->provider ?? ''))));
            if (($intentMethod !== '' && $intentMethod !== $methodCode) || ($intentProvider !== '' && $intentProvider !== 'square')) {
                throw new \InvalidArgumentException('The split-payment intent does not belong to this Square payment.');
            }
            $principal = max(0.0, round((float)($intent->principal_amount ?? 0), 4));
            $tip = max(0.0, round((float)($intent->tip_amount ?? 0), 4));
            $payable = max(0.0, round((float)($intent->payable_amount ?? 0), 4));
            $intentId = (int)($intent->id ?? 0) ?: null;
        } else {
            $selectedItems = $request->input('selected_items');
            $couponCode = trim((string)$request->input('coupon_code', ''));
            $couponDiscount = max(0.0, round((float)$request->input('coupon_discount', 0), 4));
            if (is_array($selectedItems) && count($selectedItems) > 0) {
                throw new \InvalidArgumentException('Square item/split payments require a server-generated payment intent.');
            }
            if ($couponCode !== '' || $couponDiscount > 0.0001) {
                throw new \InvalidArgumentException('Square coupon-adjusted payments require a server-generated payment intent.');
            }
            if ($tip > $remaining + 0.0001) {
                throw new \InvalidArgumentException('Tip cannot exceed 100% of the remaining bill.');
            }
            $payable = round($principal + $tip, 4);
        }

        if ($principal <= 0 || $payable <= 0) throw new \InvalidArgumentException('Order has no remaining amount to pay.');
        return compact('orderId','order','orderTotal','settled','remaining','principal','tip','payable','intentId','intentToken');
    };

    $referenceFor = static function (int $orderId, ?int $intentId): string {
        return substr($intentId ? "PMD-{$orderId}-I-{$intentId}" : "PMD-{$orderId}", 0, 40);
    };

    \Illuminate\Support\Facades\Route::get('/payments/square/runtime-config', function (\Illuminate\Http\Request $request) use ($authorizeMethod) {
        $method = strtolower(trim((string)$request->query('method', 'card')));
        if ($denied = $authorizeMethod($method)) return $denied;
        try {
            $locationId = (int)$request->query('location_id', 0) ?: null;
            $platform = app(\App\Services\Platform\LocationPlatformContext::class);
            $country = $platform->countryCode($locationId);
            $currency = $platform->currencyCode($locationId);
            $config = app(\App\Services\Payments\SquareRuntimeService::class)->publicConfiguration($country, $currency);
            if (empty($config['methods'][$method])) {
                return response()->json(['success' => false, 'error' => 'Square does not expose the selected payment method for this runtime.'], 409);
            }
            return response()->json($config);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage()], 409);
        }
    });

    \Illuminate\Support\Facades\Route::post('/payments/square/create-payment', function (\Illuminate\Http\Request $request) use ($rejectRawCard, $authorizeMethod, $resolveOrderPayment, $referenceFor) {
        if ($rejected = $rejectRawCard($request)) return $rejected;
        $method = strtolower(trim((string)$request->input('payment_method', 'card')));
        if ($denied = $authorizeMethod($method)) return $denied;
        $sourceId = trim((string)$request->input('source_id', ''));
        if ($sourceId === '' || strlen($sourceId) > 2048) {
            return response()->json(['success' => false, 'error' => 'Square payment token is required.'], 422);
        }

        try {
            $resolved = $resolveOrderPayment($request, $method);
            $platform = app(\App\Services\Platform\LocationPlatformContext::class);
            $locationId = (int)$request->input('location_id', 0) ?: null;
            $pmdCountry = $platform->countryCode($locationId);
            $pmdCurrency = strtoupper((string)($platform->currencyCode($locationId) ?: $request->input('currency', '')));
            $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
            $publicConfig = $runtime->publicConfiguration($pmdCountry, $pmdCurrency);
            $currency = strtoupper((string)$publicConfig['currency']);
            $reference = $referenceFor((int)$resolved['orderId'], $resolved['intentId']);
            $amountMinor = $runtime->toMinor((float)$resolved['payable'], $currency);
            $idempotency = 'pmdsq_'.substr(hash('sha256', $request->getHost().'|'.$resolved['orderId'].'|'.$method.'|'.$sourceId.'|'.$resolved['intentToken']), 0, 48);
            $result = $runtime->createPayment([
                'source_id' => $sourceId,
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'reference_id' => $reference,
                'idempotency_key' => $idempotency,
                'note' => 'PayMyDine order #'.$resolved['orderId'].' via '.str_replace('_', ' ', $method),
            ]);
            $result['order_id'] = (int)$resolved['orderId'];
            $result['payable_amount'] = (float)$resolved['payable'];
            $result['principal_amount'] = (float)$resolved['principal'];
            $result['tip_amount'] = (float)$resolved['tip'];
            $result['payment_intent_token'] = $resolved['intentToken'] !== '' ? $resolved['intentToken'] : null;
            if (!($result['is_paid'] ?? false)) {
                $result['message'] = 'Square payment is not complete yet. Do not settle the PayMyDine order until Square reports COMPLETED.';
            }
            return response()->json($result, 200);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            \Log::warning('SQUARE_CREATE_PAYMENT_FAILED', ['host' => $request->getHost(), 'method' => $method, 'message' => $e->getMessage()]);
            return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage() ?: 'Square payment failed.'], 502);
        }
    });

    \Illuminate\Support\Facades\Route::post('/payments/square/payment-status', function (\Illuminate\Http\Request $request) use ($authorizeMethod, $resolveOrderPayment, $referenceFor) {
        $method = strtolower(trim((string)$request->input('payment_method', 'card')));
        if ($denied = $authorizeMethod($method)) return $denied;
        $paymentId = trim((string)$request->input('payment_id', ''));
        if ($paymentId === '') return response()->json(['success' => false, 'error' => 'Square payment ID is required.'], 422);
        try {
            $resolved = $resolveOrderPayment($request, $method);
            $platform = app(\App\Services\Platform\LocationPlatformContext::class);
            $locationId = (int)$request->input('location_id', 0) ?: null;
            $pmdCurrency = strtoupper((string)($platform->currencyCode($locationId) ?: $request->input('currency', '')));
            $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
            $config = $runtime->publicConfiguration($platform->countryCode($locationId), $pmdCurrency);
            return response()->json($runtime->verifyPayment(
                $paymentId,
                $runtime->toMinor((float)$resolved['payable'], (string)$config['currency']),
                (string)$config['currency'],
                $referenceFor((int)$resolved['orderId'], $resolved['intentId']),
                (string)$config['location_id']
            ));
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage()], 502);
        }
    });

    // Signed Square webhooks are a reconciliation signal. They never mark an
    // order paid by themselves; PMD still retrieves the canonical Payment/Terminal
    // object server-to-server before settlement.
    \Illuminate\Support\Facades\Route::post('/payments/square/webhook', function (\Illuminate\Http\Request $request) {
        try {
            $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
            $config = $runtime->providerConfig(true);
            $signatureKey = trim((string)($config['webhook_signature_key'] ?? ''));
            $notificationUrl = trim((string)($config['webhook_notification_url'] ?? ''));
            $signature = trim((string)$request->header('x-square-hmacsha256-signature', ''));
            $raw = $request->getContent();
            if ($signatureKey === '' || $notificationUrl === '') {
                return response('Square webhook is not configured', 503);
            }
            if ($signature === '') return response('Missing Square signature', 401);
            $computed = base64_encode(hash_hmac('sha256', $notificationUrl.$raw, $signatureKey, true));
            if (!hash_equals($computed, $signature)) {
                \Log::warning('SQUARE_WEBHOOK_SIGNATURE_INVALID', ['host' => $request->getHost()]);
                return response('Invalid Square signature', 401);
            }
            $payload = json_decode($raw, true);
            if (!is_array($payload)) return response('Invalid JSON', 400);
            $eventId = trim((string)($payload['event_id'] ?? ''));
            $eventType = trim((string)($payload['type'] ?? ''));
            if ($eventId === '' || $eventType === '') return response('Missing event metadata', 400);
            $cacheKey = 'pmd:square:webhook:'.sha1($request->getHost().'|'.$eventId);
            if (\Illuminate\Support\Facades\Cache::has($cacheKey)) return response('OK', 200);

            $summary = ['event_id' => $eventId, 'type' => $eventType, 'host' => $request->getHost(), 'settled' => false];
            if (in_array($eventType, ['payment.created', 'payment.updated'], true)) {
                $paymentId = trim((string)($payload['data']['object']['payment']['id'] ?? ''));
                if ($paymentId !== '') {
                    try {
                        $payment = $runtime->getPayment($paymentId);
                        $summary += [
                            'payment_id' => $paymentId,
                            'payment_status' => $payment['status'] ?? null,
                            'reference_id' => $payment['reference_id'] ?? null,
                            'amount_minor' => $payment['amount_money']['amount'] ?? null,
                            'currency' => $payment['amount_money']['currency'] ?? null,
                        ];
                    } catch (\Throwable $lookupError) {
                        $summary['lookup_error'] = $lookupError->getMessage();
                    }
                }
            } elseif (in_array($eventType, ['terminal.checkout.created', 'terminal.checkout.updated', 'device.code.paired'], true)) {
                $summary['terminal_event'] = true;
            }
            \Log::info('SQUARE_WEBHOOK_VERIFIED_RECONCILIATION_SIGNAL', $summary);
            \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addDays(3));
            return response('OK', 200);
        } catch (\Throwable $e) {
            \Log::error('SQUARE_WEBHOOK_FAILED', ['host' => $request->getHost(), 'message' => $e->getMessage()]);
            return response('Square webhook processing failed', 500);
        }
    });
});
