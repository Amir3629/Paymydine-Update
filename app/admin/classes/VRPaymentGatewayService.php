<?php

namespace Admin\Classes;

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\Http;

class VRPaymentGatewayService
{
    protected const METHOD_FLAG_MAP = [
        'card' => 'card_enabled',
        'apple_pay' => 'apple_pay_enabled',
        'google_pay' => 'google_pay_enabled',
        'paypal' => 'paypal_enabled',
        'wero' => 'wero_enabled',
    ];

    public function getConfig(): array
    {
        $row = Payments_model::query()->where('code', 'vr_payment')->first();
        $raw = is_array(optional($row)->data) ? (array)$row->data : [];

        $providerStatusEnabled = isset($row->status) ? $this->toBool($row->status) : null;
        $config = [
            'enabled' => $providerStatusEnabled !== null ? $providerStatusEnabled : $this->toBool($raw['enabled'] ?? null),
            'mode' => in_array((string)($raw['mode'] ?? ''), ['test', 'live'], true) ? (string)$raw['mode'] : 'test',
            'api_base_url' => rtrim((string)($raw['api_base_url'] ?? ''), '/'),
            'space_id' => trim((string)($raw['space_id'] ?? '')),
            'user_id' => trim((string)($raw['user_id'] ?? '')),
            'auth_key' => trim((string)($raw['auth_key'] ?? '')),
            'webhook_signing_key' => trim((string)($raw['webhook_signing_key'] ?? '')),
            'preferred_integration_mode' => (string)($raw['preferred_integration_mode'] ?? 'payment_page'),
            'card_enabled' => $this->toBool($raw['card_enabled'] ?? true),
            'apple_pay_enabled' => $this->toBool($raw['apple_pay_enabled'] ?? false),
            'google_pay_enabled' => $this->toBool($raw['google_pay_enabled'] ?? false),
            'paypal_enabled' => $this->toBool($raw['paypal_enabled'] ?? false),
            'wero_enabled' => $this->toBool($raw['wero_enabled'] ?? false),
        ];

        return $config;
    }

    public function getConfigForDiagnostics(): array
    {
        $config = $this->getConfig();
        $credentialsPresent = $this->requiredCredentialsPresent($config);

        $readiness = [
            'provider_enabled' => (bool)$config['enabled'],
            'mode' => $config['mode'],
            'integration_mode_valid' => $config['preferred_integration_mode'] === 'payment_page',
            'credentials_present' => $credentialsPresent,
            'config_presence' => [
                'api_base_url' => $config['api_base_url'] !== '',
                'space_id' => $config['space_id'] !== '',
                'user_id' => $config['user_id'] !== '',
                'auth_key' => $config['auth_key'] !== '',
                'webhook_signing_key' => $config['webhook_signing_key'] !== '',
            ],
        ];

        foreach (self::METHOD_FLAG_MAP as $method => $flag) {
            $readiness[$method.'_ready'] = $this->isMethodReady($method, $config);
            $readiness[$method.'_enabled'] = (bool)($config[$flag] ?? false);
        }

        $readiness['any_ready'] =
            $readiness['card_ready']
            || $readiness['apple_pay_ready']
            || $readiness['google_pay_ready']
            || $readiness['paypal_ready']
            || $readiness['wero_ready'];

        return $readiness;
    }

    public function isMethodReady(string $methodCode, ?array $config = null): bool
    {
        $method = strtolower(trim($methodCode));
        $cfg = $config ?: $this->getConfig();
        $flag = self::METHOD_FLAG_MAP[$method] ?? null;

        if ($flag === null) {
            return false;
        }

        if (!$this->toBool($cfg['enabled'] ?? false)) {
            return false;
        }

        if (($cfg['preferred_integration_mode'] ?? '') !== 'payment_page') {
            return false;
        }

        if (!$this->requiredCredentialsPresent($cfg)) {
            return false;
        }

        return $this->toBool($cfg[$flag] ?? false);
    }

    public function createRedirectSession(array $payload): array
    {
        $method = strtolower(trim((string)($payload['method'] ?? '')));
        $config = $this->getConfig();

        if (!$this->toBool($config['enabled'] ?? false)) {
            return $this->businessError('vr_payment_provider_not_ready', 'VR Payment provider is not enabled.');
        }

        if (($config['preferred_integration_mode'] ?? '') !== 'payment_page') {
            return $this->businessError('vr_payment_configuration_invalid', 'VR Payment integration mode must be payment_page.');
        }

        if (!$this->requiredCredentialsPresent($config)) {
            return $this->businessError('vr_payment_configuration_invalid', 'VR Payment credentials are incomplete.');
        }

        if (!$this->isMethodReady($method, $config)) {
            $flag = self::METHOD_FLAG_MAP[$method] ?? null;
            if ($flag && !$this->toBool($config[$flag] ?? false)) {
                return $this->businessError('vr_payment_method_not_active', 'This VR Payment method is not active for this merchant.');
            }

            return $this->businessError('vr_payment_wallet_not_enabled', 'Selected wallet is not enabled for VR Payment.');
        }

        try {
            $endpoint = $config['api_base_url'].'/checkout/sessions';
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'x-space-id' => $config['space_id'],
                'x-user-id' => $config['user_id'],
                'x-auth-key' => $config['auth_key'],
            ])->timeout(20)->post($endpoint, [
                'amount' => (float)($payload['amount'] ?? 0),
                'currency' => strtoupper((string)($payload['currency'] ?? 'EUR')),
                'method' => $method,
                'return_url' => (string)($payload['return_url'] ?? ''),
                'cancel_url' => (string)($payload['cancel_url'] ?? ''),
                'locale' => (string)($payload['locale'] ?? 'en_US'),
                'country_code' => strtoupper((string)($payload['country_code'] ?? 'DE')),
                'merchant_customer_id' => (string)($payload['merchant_customer_id'] ?? ''),
                'items' => array_values((array)($payload['items'] ?? [])),
            ]);

            if (!$response->ok()) {
                PaymentLogger::warning('VR_PAYMENT_CREATE_SESSION_HTTP_FAILURE', [
                    'provider' => 'vr_payment',
                    'payment_method' => $method,
                    'request_meta' => ['endpoint' => $endpoint],
                    'response_meta' => ['status' => $response->status(), 'body' => $response->body()],
                ]);

                return $this->businessError('vr_payment_checkout_create_failed', 'Unable to start VR Payment checkout.', ['status' => $response->status()]);
            }

            $body = (array)$response->json();
            $redirectUrl = (string)($body['redirect_url'] ?? $body['payment_page_url'] ?? '');
            if ($redirectUrl === '') {
                return $this->businessError('vr_payment_redirect_missing', 'VR Payment did not return a redirect URL.');
            }

            return [
                'success' => true,
                'provider' => 'vr_payment',
                'method' => $method,
                'redirect_url' => $redirectUrl,
                'session_id' => $body['session_id'] ?? null,
                'transaction_id' => $body['transaction_id'] ?? null,
                'provider_reference' => $body['provider_reference'] ?? null,
                'status' => $this->normalizePaymentStatus((string)($body['status'] ?? 'pending')),
            ];
        } catch (\Throwable $e) {
            PaymentLogger::exception('VR_PAYMENT_CREATE_SESSION_EXCEPTION', $e, [
                'provider' => 'vr_payment',
                'payment_method' => $method,
            ]);

            return $this->businessError('vr_payment_checkout_create_failed', 'Unable to create VR Payment checkout session.');
        }
    }

    public function fetchPaymentStatus(array $context): array
    {
        $config = $this->getConfig();
        if (!$this->toBool($config['enabled'] ?? false) || !$this->requiredCredentialsPresent($config)) {
            return $this->businessError('vr_payment_provider_not_ready', 'VR Payment provider is not ready.');
        }

        $sessionId = trim((string)($context['session_id'] ?? ''));
        $transactionId = trim((string)($context['transaction_id'] ?? ''));
        $providerReference = trim((string)($context['provider_reference'] ?? ''));

        if ($sessionId === '' && $transactionId === '' && $providerReference === '') {
            return $this->businessError('vr_payment_status_lookup_failed', 'No VR Payment reference was provided.');
        }

        try {
            $endpoint = $config['api_base_url'].'/checkout/status';
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'x-space-id' => $config['space_id'],
                'x-user-id' => $config['user_id'],
                'x-auth-key' => $config['auth_key'],
            ])->timeout(20)->post($endpoint, [
                'session_id' => $sessionId !== '' ? $sessionId : null,
                'transaction_id' => $transactionId !== '' ? $transactionId : null,
                'provider_reference' => $providerReference !== '' ? $providerReference : null,
            ]);

            if (!$response->ok()) {
                return $this->businessError('vr_payment_status_lookup_failed', 'Unable to verify VR Payment status.', [
                    'provider_http_status' => $response->status(),
                ]);
            }

            $body = (array)$response->json();
            $normalized = $this->normalizePaymentStatus((string)($body['status'] ?? $body['payment_status'] ?? 'unknown'));

            return [
                'success' => true,
                'provider' => 'vr_payment',
                'status' => $normalized,
                'is_paid' => in_array($normalized, ['authorized', 'completed'], true),
                'session_id' => $body['session_id'] ?? ($sessionId !== '' ? $sessionId : null),
                'transaction_id' => $body['transaction_id'] ?? ($transactionId !== '' ? $transactionId : null),
                'provider_reference' => $body['provider_reference'] ?? ($providerReference !== '' ? $providerReference : null),
                'raw_status' => $body['status'] ?? $body['payment_status'] ?? null,
            ];
        } catch (\Throwable $e) {
            $normalized = $this->normalizeProviderException($e);
            return $this->businessError('vr_payment_status_lookup_failed', 'Unable to verify VR Payment status.', [
                'details' => $normalized,
            ]);
        }
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader, ?string $timestampHeader = null): bool
    {
        $config = $this->getConfig();
        $key = (string)($config['webhook_signing_key'] ?? '');
        if ($key === '' || $signatureHeader === null || trim($signatureHeader) === '') {
            return false;
        }

        $signature = trim($signatureHeader);
        $signature = preg_replace('/^sha256=/i', '', $signature) ?: $signature;
        $expectedRaw = hash_hmac('sha256', $rawBody, $key);
        if (hash_equals($expectedRaw, $signature)) {
            return true;
        }

        if ($timestampHeader !== null && trim($timestampHeader) !== '') {
            $expectedWithTimestamp = hash_hmac('sha256', trim($timestampHeader).'.'.$rawBody, $key);
            if (hash_equals($expectedWithTimestamp, $signature)) {
                return true;
            }
        }

        return false;
    }

    public function normalizeProviderException(\Throwable $e): array
    {
        return [
            'class' => get_class($e),
            'message' => $e->getMessage(),
            'code' => method_exists($e, 'getCode') ? $e->getCode() : null,
        ];
    }

    public function normalizePaymentStatus(string $providerStatus): string
    {
        $status = strtolower(trim($providerStatus));
        return match ($status) {
            'pending', 'created', 'processing' => 'pending',
            'authorized', 'authorised' => 'authorized',
            'paid', 'captured', 'completed', 'succeeded', 'success' => 'completed',
            'failed', 'error', 'declined' => 'failed',
            'cancelled', 'canceled' => 'cancelled',
            'expired', 'timeout' => 'expired',
            default => 'unknown',
        };
    }

    protected function requiredCredentialsPresent(array $config): bool
    {
        return ($config['api_base_url'] ?? '') !== ''
            && ($config['space_id'] ?? '') !== ''
            && ($config['user_id'] ?? '') !== ''
            && ($config['auth_key'] ?? '') !== '';
    }

    protected function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return ((int)$value) === 1;
        }
        $v = strtolower(trim((string)$value));
        if (in_array($v, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }
        if (in_array($v, ['0', 'false', 'no', 'off', ''], true)) {
            return false;
        }
        return !empty($value);
    }

    protected function businessError(string $code, string $message, array $extra = []): array
    {
        return array_merge([
            'success' => false,
            'provider' => 'vr_payment',
            'error_code' => $code,
            'error' => $message,
            'business_error' => true,
        ], $extra);
    }
}
