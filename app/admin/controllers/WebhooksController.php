<?php 

namespace Admin\Controllers;

use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Helpers\TenantHelper;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Webhook;

class WebhooksController extends Controller
{
    public function stripe(Request $request)
    {
        $startedAt = microtime(true);
        $requestId = (string) ($request->header('X-Request-Id') ?? uniqid('wh_', true));

        // Loga chegada do webhook (SEM logar payload inteiro em produção, pode ter PII)
        Log::info('[StripeWebhook] Incoming request', [
            'request_id' => $requestId,
            'ip'         => $request->ip(),
            'method'     => $request->method(),
            'path'       => $request->path(),
            'length'     => (int) $request->header('Content-Length', 0),
            'user_agent' => (string) $request->userAgent(),
        ]);

        $payload   = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');

        Log::debug('[StripeWebhook] Headers snapshot', [
            'request_id' => $requestId,
            'has_signature' => (bool) $sigHeader,
            'signature_len' => $sigHeader ? strlen($sigHeader) : 0,
        ]);

        // Busca config do Stripe no banco
        $payment = Payments_model::where('code', 'stripe')->first();
        if (!$payment) {
            Log::error('[StripeWebhook] Stripe payment config not found', [
                'request_id' => $requestId,
            ]);
            return response('Stripe payment config not found', 404);
        }

        $data = (array) $payment->data;
        $mode = $data['transaction_mode'] ?? 'test';

        $endpointSecret = $mode === 'live'
            ? ($data['live_webhook_secret'] ?? null)
            : ($data['test_webhook_secret'] ?? null);

        Log::info('[StripeWebhook] Loaded config', [
            'request_id' => $requestId,
            'mode'       => $mode,
            'has_secret' => (bool) $endpointSecret,
        ]);

        if (!$endpointSecret) {
            Log::error('[StripeWebhook] Stripe webhook secret not configured', [
                'request_id' => $requestId,
                'mode'       => $mode,
            ]);
            return response('Stripe webhook secret not configured', 503);
        }

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);

            Log::info('[StripeWebhook] Signature OK', [
                'request_id' => $requestId,
                'event_id'   => $event->id ?? null,
                'type'       => $event->type ?? null,
                'created'    => $event->created ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::warning('[StripeWebhook] Invalid signature', [
                'request_id' => $requestId,
                'message'    => $e->getMessage(),
            ]);
            return response('Invalid signature', 400);
        }

        try {
            $eventType = $event->type ?? '';

            if ($eventType === 'payment_intent.succeeded') {
                $pi = $event->data->object;
                $paymentIntentId = $pi->id ?? null;
                Log::info('[StripeWebhook] payment_intent.succeeded', [
                    'request_id' => $requestId,
                    'event_id'   => $event->id ?? null,
                    'payment_intent_id' => $paymentIntentId,
                    'amount'     => $pi->amount ?? null,
                    'currency'   => $pi->currency ?? null,
                ]);
                if ($paymentIntentId) {
                    $order = Orders_model::where('comment', 'like', '%Stripe PaymentIntent: ' . $paymentIntentId . '%')->first();
                    if ($order) {
                        $order->markAsPaymentProcessed();
                        Log::info('[StripeWebhook] Order marked as paid (payment_intent.succeeded)', [
                            'request_id' => $requestId,
                            'order_id'   => $order->order_id ?? $order->id,
                        ]);
                    }
                }
                return response('OK', 200);
            }

            if ($eventType === 'payment_intent.payment_failed') {
                $pi = $event->data->object;
                Log::info('[StripeWebhook] payment_intent.payment_failed', [
                    'request_id' => $requestId,
                    'event_id'   => $event->id ?? null,
                    'payment_intent_id' => $pi->id ?? null,
                    'error'      => $pi->last_payment_error->message ?? null,
                ]);
                return response('OK', 200);
            }

            Log::info('[StripeWebhook] Ignored event type', [
                'request_id' => $requestId,
                'event_id'   => $event->id ?? null,
                'type'       => $eventType,
            ]);
            return response('OK', 200);

        } catch (\Throwable $e) {
            Log::error('[StripeWebhook] Processing failed', [
                'request_id' => $requestId,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => substr($e->getTraceAsString(), 0, 4000),
            ]);
            return response('Webhook processing failed', 500);
        }
    }

    public function paypal(Request $request)
    {
        $startedAt = microtime(true);
        $requestId = (string) ($request->header('X-Request-Id') ?? uniqid('ppwh_', true));

        Log::info('[PayPalWebhook] Incoming request', [
            'request_id' => $requestId,
            'ip'         => $request->ip(),
            'method'     => $request->method(),
            'path'       => $request->path(),
            'length'     => (int) $request->header('Content-Length', 0),
            'user_agent' => (string) $request->userAgent(),
        ]);

        $payloadRaw = $request->getContent();
        $payload    = json_decode($payloadRaw, true);

        Log::debug('[PayPalWebhook] Headers snapshot', [
            'request_id' => $requestId,
            // headers típicos de verificação do PayPal
            'paypal_transmission_id'   => $request->header('paypal-transmission-id'),
            'paypal_transmission_time' => $request->header('paypal-transmission-time'),
            'paypal_cert_url'          => $request->header('paypal-cert-url'),
            'paypal_auth_algo'         => $request->header('paypal-auth-algo'),
            'paypal_transmission_sig'  => $request->header('paypal-transmission-sig') ? 'present' : 'missing',
        ]);

        if (!is_array($payload)) {
            Log::warning('[PayPalWebhook] Invalid JSON payload', [
                'request_id' => $requestId,
                'raw_prefix' => substr($payloadRaw ?? '', 0, 300),
            ]);
            return response('Invalid JSON', 400);
        }

        $eventId   = $payload['id'] ?? null;
        $eventType = $payload['event_type'] ?? null;

        Log::info('[PayPalWebhook] Event received', [
            'request_id' => $requestId,
            'event_id'   => $eventId,
            'event_type' => $eventType,
            'summary'    => $payload['summary'] ?? null,
        ]);

        if (!$eventId || !$eventType) {
            Log::warning('[PayPalWebhook] Missing event id/type', [
                'request_id' => $requestId,
                'payload_keys' => array_keys($payload),
            ]);
            return response('Missing event metadata', 400);
        }

        // idempotência por event_id (PayPal pode reenviar)
        $processedKey = TenantHelper::scopedCacheKey("paypal_webhook_processed:{$eventId}");
        if (Cache::get($processedKey)) {
            Log::info('[PayPalWebhook] Already processed (idempotency hit)', [
                'request_id' => $requestId,
                'event_id'   => $eventId,
            ]);
            return response('OK', 200);
        }

        // Carrega config PayPal do banco
        $payment = Payments_model::where('code', 'paypal')->first();
        if (!$payment) {
            Log::error('[PayPalWebhook] PayPal payment config not found', [
                'request_id' => $requestId,
            ]);
            return response('PayPal payment config not found', 404);
        }

        $data = (array) $payment->data;
        $mode = $data['transaction_mode'] ?? 'test';

        // Ajuste os nomes conforme seu banco:
        $clientId = $mode === 'live'
            ? ($data['live_client_id'] ?? null)
            : ($data['test_client_id'] ?? null);

        $clientSecret = $mode === 'live'
            ? ($data['live_secret'] ?? null)
            : ($data['test_secret'] ?? null);

        // Webhook ID (do app do PayPal) — usado na validação oficial.
        // Mesmo que você não valide agora, eu deixo logado pra você saber se existe.
        $webhookId = $mode === 'live'
            ? ($data['live_webhook_id'] ?? null)
            : ($data['test_webhook_id'] ?? null);

        $baseUrl = $mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        Log::info('[PayPalWebhook] Loaded config', [
            'request_id' => $requestId,
            'mode'       => $mode,
            'has_client_id' => (bool) $clientId,
            'has_secret'    => (bool) $clientSecret,
            'has_webhook_id'=> (bool) $webhookId,
            'base_url'      => $baseUrl,
        ]);

        if (!$clientId || !$clientSecret) {
            Log::error('[PayPalWebhook] Missing PayPal credentials', [
                'request_id' => $requestId,
                'mode'       => $mode,
            ]);
            return response('PayPal credentials not configured', 503);
        }

        try {
            /**
             * AQUI VOCÊ DECIDE o(s) evento(s) que confirmam pagamento.
             * Com Checkout, os mais usados:
             * - PAYMENT.CAPTURE.COMPLETED (pagamento capturado)
             * - CHECKOUT.ORDER.APPROVED (aprovado, mas nem sempre capturado)
             *
             * Eu vou processar PAGAMENTO REAL: PAYMENT.CAPTURE.COMPLETED
             */
            if ($eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
                Log::info('[PayPalWebhook] Ignored event type', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'event_type' => $eventType,
                ]);

                Cache::put($processedKey, true, now()->addDays(2)); // opcional: marcar como visto
                return response('OK', 200);
            }

            $resource = $payload['resource'] ?? [];
            $captureId = $resource['id'] ?? null;

            // Normalmente vem link com order_id: resource.supplementary_data.related_ids.order_id
            $orderId = $resource['supplementary_data']['related_ids']['order_id'] ?? null;

            // Se você setou metadata no PayPal, geralmente vai em custom_id / invoice_id
            // (depende de como você criou a order/capture)
            $customId  = $resource['custom_id'] ?? null;
            $invoiceId = $resource['invoice_id'] ?? null;

            Log::info('[PayPalWebhook] Capture completed payload snapshot', [
                'request_id' => $requestId,
                'event_id'   => $eventId,
                'capture_id' => $captureId,
                'paypal_order_id' => $orderId,
                'custom_id'  => $customId,
                'invoice_id' => $invoiceId,
                'amount'     => $resource['amount']['value'] ?? null,
                'currency'   => $resource['amount']['currency_code'] ?? null,
                'status'     => $resource['status'] ?? null,
            ]);

            if (!$captureId) {
                Log::warning('[PayPalWebhook] Missing capture id', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                ]);
                return response('Missing capture id', 400);
            }

            /**
             * Passo forte: buscar token e consultar a CAPTURE na API do PayPal
             * Isso te dá confiança que o evento é real e te traz dados oficiais.
             */
            Log::info('[PayPalWebhook] Fetching OAuth token...', [
                'request_id' => $requestId,
            ]);

            $tokenResp = Http::asForm()
                ->withBasicAuth($clientId, $clientSecret)
                ->post($baseUrl . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$tokenResp->ok()) {
                Log::error('[PayPalWebhook] Token request failed', [
                    'request_id' => $requestId,
                    'status' => $tokenResp->status(),
                    'body'   => substr($tokenResp->body(), 0, 1000),
                ]);
                return response('PayPal auth failed', 502);
            }

            $accessToken = $tokenResp->json('access_token');

            Log::info('[PayPalWebhook] Token OK', [
                'request_id' => $requestId,
                'token_len'  => $accessToken ? strlen($accessToken) : 0,
            ]);

            Log::info('[PayPalWebhook] Fetching capture details...', [
                'request_id' => $requestId,
                'capture_id' => $captureId,
            ]);

            $capResp = Http::withToken($accessToken)
                ->get($baseUrl . '/v2/payments/captures/' . $captureId);

            if (!$capResp->ok()) {
                Log::error('[PayPalWebhook] Capture lookup failed', [
                    'request_id' => $requestId,
                    'capture_id' => $captureId,
                    'status' => $capResp->status(),
                    'body'   => substr($capResp->body(), 0, 1200),
                ]);
                return response('Capture lookup failed', 502);
            }

            $cap = $capResp->json();

            $capStatus  = $cap['status'] ?? null;
            $capAmount  = $cap['amount']['value'] ?? null;
            $capCurrency= $cap['amount']['currency_code'] ?? null;

            // Pegando custom_id / invoice_id do detalhe (caso não venha no webhook)
            $customId   = $customId  ?? ($cap['custom_id'] ?? null);
            $invoiceId  = $invoiceId ?? ($cap['invoice_id'] ?? null);

            Log::info('[PayPalWebhook] Capture details OK', [
                'request_id' => $requestId,
                'capture_id' => $captureId,
                'status'     => $capStatus,
                'amount'     => $capAmount,
                'currency'   => $capCurrency,
                'custom_id'  => $customId,
                'invoice_id' => $invoiceId,
            ]);

            if ($capStatus !== 'COMPLETED') {
                Log::warning('[PayPalWebhook] Capture not completed, skipping', [
                    'request_id' => $requestId,
                    'capture_id' => $captureId,
                    'status'     => $capStatus,
                ]);
                Cache::put($processedKey, true, now()->addDays(2));
                return response('OK', 200);
            }

            /**
             * Agora: achar seu draft.
             * Aqui você escolhe qual "chave" vai usar.
             * - Se você criou o PayPal Order com custom_id = checkout_ref, perfeito.
             * - Senão: invoice_id
             */
            $checkoutRef = $customId ?: $invoiceId;

            if (!$checkoutRef) {
                Log::warning('[PayPalWebhook] Missing checkout_ref (custom_id/invoice_id)', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'capture_id' => $captureId,
                ]);
                return response('Missing checkout_ref', 400);
            }

            $cacheKey = TenantHelper::scopedCacheKey("pending_payment:{$checkoutRef}");
            $pending  = Cache::get($cacheKey);

            Log::info('[PayPalWebhook] Cache lookup', [
                'request_id'   => $requestId,
                'checkout_ref' => $checkoutRef,
                'cache_key'    => $cacheKey,
                'cache_hit'    => (bool) $pending,
            ]);

            if (!$pending) {
                Log::warning('[PayPalWebhook] Draft not found (expired)', [
                    'request_id'   => $requestId,
                    'checkout_ref' => $checkoutRef,
                    'cache_key'    => $cacheKey,
                ]);
                return response('Draft not found (expired)', 404);
            }

            $draft       = (array)($pending['draft'] ?? []);
            $paymentCode = (string)($pending['payment_code'] ?? 'paypal');

            Log::debug('[PayPalWebhook] Pending payload snapshot', [
                'request_id'   => $requestId,
                'checkout_ref' => $checkoutRef,
                'payment_code' => $paymentCode,
                'draft_keys'   => array_keys($draft),
                'location_id'  => $draft['location_id'] ?? null,
                'order_total'  => $draft['order_total'] ?? null,
            ]);

            DB::beginTransaction();

            try {
                Log::info('[PayPalWebhook] Creating order...', [
                    'request_id' => $requestId,
                    'checkout_ref' => $checkoutRef,
                ]);

                $order = new Orders_model();
                $order->location_id = (int)($draft['location_id'] ?? 1);

                $order->first_name  = (string)($draft['customer']['first_name'] ?? '');
                $order->last_name   = (string)($draft['customer']['last_name'] ?? '');
                $order->email       = (string)($draft['customer']['email'] ?? '');
                $order->telephone   = (string)($draft['customer']['telephone'] ?? '');

                $order->order_type  = (string)($draft['order_type'] ?? 'collection');
                $order->order_total = (float)($draft['order_total'] ?? 0);

                $order->payment     = $paymentCode;

                $order->save();

                Log::info('[PayPalWebhook] Order created', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                    'order_total'=> $order->order_total ?? null,
                ]);

                $order->markAsPaymentProcessed();
                Log::info('[PayPalWebhook] markAsPaymentProcessed OK', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                ]);

                $order->updateOrderStatus(null, [
                    'comment' => 'PayPal capture confirmed via webhook',
                ]);
                Log::info('[PayPalWebhook] updateOrderStatus OK', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                ]);

                $order->logPaymentAttempt(
                    'PayPal payment succeeded',
                    true,
                    [
                        'checkout_ref' => $checkoutRef,
                        'draft' => $draft, // cuidado com PII
                    ],
                    [
                        'paypal_event_id'   => $eventId,
                        'paypal_capture_id' => $captureId,
                        'paypal_order_id'   => $orderId,
                        'custom_id'         => $customId,
                        'invoice_id'        => $invoiceId,
                        'amount'            => $capAmount,
                        'currency'          => $capCurrency,
                        'status'            => $capStatus,
                    ],
                    true
                );

                Log::info('[PayPalWebhook] logPaymentAttempt OK', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                ]);

                Cache::put($processedKey, true, now()->addDays(2));
                Cache::forget($cacheKey);

                Log::info('[PayPalWebhook] Idempotency stored + cache cleared', [
                    'request_id'   => $requestId,
                    'event_id'     => $eventId,
                    'checkout_ref' => $checkoutRef,
                    'processed_key'=> $processedKey,
                    'cache_key'    => $cacheKey,
                ]);

                DB::commit();

                Log::info('[PayPalWebhook] Completed OK', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'duration_ms'=> (int)((microtime(true) - $startedAt) * 1000),
                ]);

                return response('OK', 200);

            } catch (\Throwable $e) {
                DB::rollBack();

                Log::error('[PayPalWebhook] Transaction failed (rollback)', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'checkout_ref' => $checkoutRef ?? null,
                    'message' => $e->getMessage(),
                    'file'    => $e->getFile(),
                    'line'    => $e->getLine(),
                    'trace'   => substr($e->getTraceAsString(), 0, 4000),
                ]);

                return response('Webhook processing failed', 500);
            }

        } catch (\Throwable $e) {
            Log::error('[PayPalWebhook] Unexpected failure', [
                'request_id' => $requestId,
                'event_id'   => $eventId,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => substr($e->getTraceAsString(), 0, 4000),
            ]);

            return response('Webhook processing failed', 500);
        }
    }

    public function square(Request $request)
    {
        $startedAt = microtime(true);
        $requestId = (string) ($request->header('X-Request-Id') ?? uniqid('sqwh_', true));

        Log::info('[SquareWebhook] Incoming request', [
            'request_id' => $requestId,
            'ip'         => $request->ip(),
            'method'     => $request->method(),
            'path'       => $request->path(),
            'length'     => (int) $request->header('Content-Length', 0),
            'user_agent' => (string) $request->userAgent(),
        ]);

        $payloadRaw = $request->getContent();
        $sigHeader  = $request->header('x-square-hmacsha256-signature');
        $envHeader  = $request->header('square-environment'); // Sandbox/Production (se vier)

        Log::debug('[SquareWebhook] Headers snapshot', [
            'request_id' => $requestId,
            'has_signature' => (bool) $sigHeader,
            'signature_len' => $sigHeader ? strlen($sigHeader) : 0,
            'square_environment' => $envHeader,
        ]);

        // Carrega config do Square no banco (ajuste "code" conforme seu gateway)
        $payment = Payments_model::where('code', 'square')->first();
        if (!$payment) {
            Log::error('[SquareWebhook] Square payment config not found', [
                'request_id' => $requestId,
            ]);
            return response('Square payment config not found', 404);
        }

        $data = (array) $payment->data;

        // Ajuste os nomes conforme seu schema:
        $signatureKey = $data['webhook_signature_key'] ?? null;
        $notificationUrl = $data['webhook_notification_url'] ?? null;

        Log::info('[SquareWebhook] Loaded config', [
            'request_id' => $requestId,
            'has_signature_key' => (bool) $signatureKey,
            'has_notification_url' => (bool) $notificationUrl,
        ]);

        if (!$signatureKey || !$notificationUrl) {
            Log::error('[SquareWebhook] Webhook signature key / notification URL not configured', [
                'request_id' => $requestId,
            ]);
            return response('Square webhook not configured', 503);
        }

        // 1) Validação da assinatura (HMAC-SHA256 + base64)
        // assinatura = base64_encode( hash_hmac('sha256', notification_url + raw_body, signature_key, true) )
        if (!$sigHeader) {
            Log::warning('[SquareWebhook] Missing signature header', [
                'request_id' => $requestId,
            ]);
            return response('Missing signature', 400);
        }

        $computed = base64_encode(
            hash_hmac('sha256', $notificationUrl . $payloadRaw, $signatureKey, true)
        );

        $valid = hash_equals($computed, $sigHeader);

        Log::info('[SquareWebhook] Signature check', [
            'request_id' => $requestId,
            'valid'      => $valid,
            // útil pra debug: comparar prefixo (não logue inteiro em prod se não quiser)
            'computed_prefix' => substr($computed, 0, 12),
            'header_prefix'   => substr($sigHeader, 0, 12),
        ]);

        if (!$valid) {
            return response('Invalid signature', 403);
        }

        // 2) Parse do JSON
        $payload = json_decode($payloadRaw, true);
        if (!is_array($payload)) {
            Log::warning('[SquareWebhook] Invalid JSON payload', [
                'request_id' => $requestId,
                'raw_prefix' => substr($payloadRaw ?? '', 0, 300),
            ]);
            return response('Invalid JSON', 400);
        }

        $eventType = $payload['type'] ?? null;      // ex: payment.updated
        $eventId   = $payload['event_id'] ?? null;  // id único do evento

        Log::info('[SquareWebhook] Event received', [
            'request_id' => $requestId,
            'event_id'   => $eventId,
            'type'       => $eventType,
        ]);

        if (!$eventType || !$eventId) {
            Log::warning('[SquareWebhook] Missing event fields', [
                'request_id' => $requestId,
                'payload_keys' => array_keys($payload),
            ]);
            return response('Missing event metadata', 400);
        }

        // 3) Idempotência por event_id
        $processedKey = TenantHelper::scopedCacheKey("square_webhook_processed:{$eventId}");
        if (Cache::get($processedKey)) {
            Log::info('[SquareWebhook] Already processed (idempotency hit)', [
                'request_id' => $requestId,
                'event_id'   => $eventId,
            ]);
            return response('OK', 200);
        }

        try {
            // 4) Só processar eventos de payment.*
            if (!in_array($eventType, ['payment.created', 'payment.updated'], true)) {
                Log::info('[SquareWebhook] Ignored event type', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'type'       => $eventType,
                ]);
                Cache::put($processedKey, true, now()->addDays(2));
                return response('OK', 200);
            }

            // Estrutura típica:
            // payload.data.object.payment
            $paymentObj = $payload['data']['object']['payment'] ?? null;

            if (!is_array($paymentObj)) {
                Log::warning('[SquareWebhook] Missing payment object', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'type'       => $eventType,
                    'data_keys'  => isset($payload['data']) ? array_keys((array)$payload['data']) : [],
                ]);
                return response('Missing payment object', 400);
            }

            $squarePaymentId = $paymentObj['id'] ?? null;
            $status          = $paymentObj['status'] ?? null; // COMPLETED / APPROVED / CANCELED etc
            $orderId         = $paymentObj['order_id'] ?? null;

            // Valores costumam vir em dinheiro como amount_money: { amount: 123, currency: "USD" }
            $amountCents = $paymentObj['amount_money']['amount'] ?? null;
            $currency    = $paymentObj['amount_money']['currency'] ?? ($paymentObj['amount_money']['currency_code'] ?? null);

            // Onde guardar seu checkout_ref?
            // Sugestão: metadata.checkout_ref OU reference_id OU note
            $checkoutRef =
                ($paymentObj['metadata']['checkout_ref'] ?? null)
                ?: ($paymentObj['reference_id'] ?? null)
                ?: ($paymentObj['note'] ?? null);

            Log::info('[SquareWebhook] Payment snapshot', [
                'request_id' => $requestId,
                'event_id'   => $eventId,
                'square_payment_id' => $squarePaymentId,
                'status'     => $status,
                'order_id'   => $orderId,
                'amount_cents' => $amountCents,
                'currency'   => $currency,
                'checkout_ref' => $checkoutRef,
                'metadata_keys' => isset($paymentObj['metadata']) ? array_keys((array)$paymentObj['metadata']) : [],
            ]);

            // 5) Só confirma pagamento quando estiver COMPLETED
            if ($status !== 'COMPLETED') {
                Log::info('[SquareWebhook] Payment not completed yet, skipping', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'status'     => $status,
                ]);
                Cache::put($processedKey, true, now()->addDays(2));
                return response('OK', 200);
            }

            if (!$checkoutRef) {
                Log::warning('[SquareWebhook] Missing checkout_ref (metadata/reference_id/note)', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'square_payment_id' => $squarePaymentId,
                ]);
                return response('Missing checkout_ref', 400);
            }

            $cacheKey = TenantHelper::scopedCacheKey("pending_payment:{$checkoutRef}");
            $pending  = Cache::get($cacheKey);

            Log::info('[SquareWebhook] Cache lookup', [
                'request_id'   => $requestId,
                'checkout_ref' => $checkoutRef,
                'cache_key'    => $cacheKey,
                'cache_hit'    => (bool) $pending,
            ]);

            if (!$pending) {
                Log::warning('[SquareWebhook] Draft not found (expired)', [
                    'request_id' => $requestId,
                    'checkout_ref' => $checkoutRef,
                ]);
                return response('Draft not found (expired)', 404);
            }

            $draft       = (array)($pending['draft'] ?? []);
            $paymentCode = (string)($pending['payment_code'] ?? 'square');

            Log::debug('[SquareWebhook] Pending payload snapshot', [
                'request_id'   => $requestId,
                'checkout_ref' => $checkoutRef,
                'payment_code' => $paymentCode,
                'draft_keys'   => array_keys($draft),
                'location_id'  => $draft['location_id'] ?? null,
                'order_total'  => $draft['order_total'] ?? null,
            ]);

            DB::beginTransaction();

            try {
                Log::info('[SquareWebhook] Creating order...', [
                    'request_id' => $requestId,
                    'checkout_ref' => $checkoutRef,
                ]);

                $order = new Orders_model();
                $order->location_id = (int)($draft['location_id'] ?? 1);

                $order->first_name  = (string)($draft['customer']['first_name'] ?? '');
                $order->last_name   = (string)($draft['customer']['last_name'] ?? '');
                $order->email       = (string)($draft['customer']['email'] ?? '');
                $order->telephone   = (string)($draft['customer']['telephone'] ?? '');

                $order->order_type  = (string)($draft['order_type'] ?? 'collection');
                $order->order_total = (float)($draft['order_total'] ?? 0);

                $order->payment     = $paymentCode;

                $order->save();

                Log::info('[SquareWebhook] Order created', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                    'order_total'=> $order->order_total ?? null,
                ]);

                $order->markAsPaymentProcessed();
                Log::info('[SquareWebhook] markAsPaymentProcessed OK', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                ]);

                $order->updateOrderStatus(null, [
                    'comment' => 'Square payment confirmed via webhook',
                ]);
                Log::info('[SquareWebhook] updateOrderStatus OK', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                ]);

                $order->logPaymentAttempt(
                    'Square payment succeeded',
                    true,
                    [
                        'checkout_ref' => $checkoutRef,
                        'draft' => $draft, // cuidado com PII
                    ],
                    [
                        'square_event_id'   => $eventId,
                        'square_payment_id' => $squarePaymentId,
                        'square_order_id'   => $orderId,
                        'status'            => $status,
                        'amount_cents'      => $amountCents,
                        'currency'          => $currency,
                        'event_type'        => $eventType,
                    ],
                    true
                );

                Log::info('[SquareWebhook] logPaymentAttempt OK', [
                    'request_id' => $requestId,
                    'order_id'   => $order->order_id ?? ($order->id ?? null),
                ]);

                Cache::put($processedKey, true, now()->addDays(2));
                Cache::forget($cacheKey);

                Log::info('[SquareWebhook] Idempotency stored + cache cleared', [
                    'request_id'   => $requestId,
                    'event_id'     => $eventId,
                    'checkout_ref' => $checkoutRef,
                    'processed_key'=> $processedKey,
                    'cache_key'    => $cacheKey,
                ]);

                DB::commit();

                Log::info('[SquareWebhook] Completed OK', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'duration_ms'=> (int)((microtime(true) - $startedAt) * 1000),
                ]);

                return response('OK', 200);

            } catch (\Throwable $e) {
                DB::rollBack();

                Log::error('[SquareWebhook] Transaction failed (rollback)', [
                    'request_id' => $requestId,
                    'event_id'   => $eventId,
                    'checkout_ref' => $checkoutRef ?? null,
                    'message' => $e->getMessage(),
                    'file'    => $e->getFile(),
                    'line'    => $e->getLine(),
                    'trace'   => substr($e->getTraceAsString(), 0, 4000),
                ]);

                return response('Webhook processing failed', 500);
            }

        } catch (\Throwable $e) {
            Log::error('[SquareWebhook] Unexpected failure', [
                'request_id' => $requestId,
                'event_id'   => $eventId,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => substr($e->getTraceAsString(), 0, 4000),
            ]);

            return response('Webhook processing failed', 500);
        }
    }
}
