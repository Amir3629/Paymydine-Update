<?php

namespace App\Services\Payments;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * PMD_PAYMOB_OMAN_API_R2
 *
 * Server-side Paymob Accept client for the Oman region.
 *
 * Rules:
 * - Modern payment creation uses the Intention API only.
 * - Oman uses https://oman.paymob.com for both test and live credentials.
 * - Test/live behavior is selected by credentials + Integration IDs, not host.
 * - Secret Key, API Key and HMAC Secret never reach the browser.
 * - Redirect data is UX-only; settlement requires an HMAC-verified callback.
 * - Inquiry uses API-Key -> short-lived auth-token, separate from Intention auth.
 */
final class PaymobApiClient
{
    public const OMAN_BASE_URL = 'https://oman.paymob.com';

    private array $config;

    public function __construct(array $config = [])
    {
        $this->config = $this->normalizeConfig($config);
    }

    public function config(): array
    {
        return $this->config;
    }

    /** Safe diagnostic view. Never return server-side secrets. */
    public function safeConfig(): array
    {
        return [
            'provider' => 'paymob',
            'region' => 'OMN',
            'country_code' => 'OM',
            'mode' => $this->config['mode'],
            'api_base_url' => $this->config['api_base_url'],
            'currency' => $this->config['currency'],
            'secret_key_saved' => $this->config['secret_key'] !== '',
            'public_key_saved' => $this->config['public_key'] !== '',
            'api_key_saved' => $this->config['api_key'] !== '',
            'hmac_secret_saved' => $this->config['hmac_secret'] !== '',
            'integration_ids' => array_values(array_keys(array_filter(
                $this->config['integration_ids'],
                static fn ($value) => trim((string)$value) !== ''
            ))),
        ];
    }

    /** Structural validation only; no network request. */
    public function validateConfiguration(bool $requireIntentionCredentials = false): array
    {
        $missing = [];

        if ($this->config['api_base_url'] !== self::OMAN_BASE_URL) {
            return ['ok' => false, 'message' => 'Paymob Oman must use '.self::OMAN_BASE_URL.'.'];
        }

        if ($this->config['api_key'] === '') {
            $missing[] = 'api_key';
        }

        if ($requireIntentionCredentials) {
            foreach (['secret_key', 'public_key', 'hmac_secret'] as $field) {
                if ($this->config[$field] === '') $missing[] = $field;
            }

            if (!count(array_filter(
                $this->config['integration_ids'],
                static fn ($value) => trim((string)$value) !== ''
            ))) {
                $missing[] = 'integration_id';
            }
        }

        if ($missing) {
            return [
                'ok' => false,
                'message' => 'Missing Paymob fields: '.implode(', ', array_values(array_unique($missing))).'.',
                'missing' => array_values(array_unique($missing)),
            ];
        }

        if ($this->config['secret_key'] !== '' && !preg_match('/(^|_)sk_(test|live)_|^sk_/i', $this->config['secret_key'])) {
            return ['ok' => false, 'message' => 'The Paymob Secret Key format does not look valid.'];
        }

        if ($this->config['public_key'] !== '' && !preg_match('/(^|_)pk_(test|live)_|^pk_/i', $this->config['public_key'])) {
            return ['ok' => false, 'message' => 'The Paymob Public Key format does not look valid.'];
        }

        return [
            'ok' => true,
            'message' => $requireIntentionCredentials
                ? 'Paymob Oman intention configuration is structurally ready.'
                : 'Paymob Oman API configuration is structurally ready.',
        ];
    }

    /**
     * Non-payment credential check.
     * API Key -> /api/auth/tokens. The returned bearer token is discarded.
     */
    public function testConnection(): array
    {
        $validation = $this->validateConfiguration(false);
        if (!($validation['ok'] ?? false)) {
            return $validation + ['connected' => false];
        }

        $auth = $this->inquiryAuthToken();
        if (!($auth['ok'] ?? false)) {
            return $auth + ['connected' => false];
        }

        return [
            'ok' => true,
            'connected' => true,
            'provider' => 'paymob',
            'region' => 'OMN',
            'country_code' => 'OM',
            'mode' => $this->config['mode'],
            'api_base_url' => $this->config['api_base_url'],
            'message' => 'Paymob Oman API Key accepted. No payment was created.',
        ];
    }

    /**
     * Create a payment Intention.
     * POST /v1/intention/ with Authorization: Token {secret_key}.
     */
    public function createIntention(array $payload): array
    {
        $validation = $this->validateConfiguration(true);
        if (!($validation['ok'] ?? false)) return $validation;

        $payload = $this->normalizeIntentionPayload($payload);
        if (!($payload['ok'] ?? false)) return $payload;

        $request = (array)$payload['payload'];
        $result = $this->secretRequest('POST', '/v1/intention/', $request, 30);
        if (!($result['ok'] ?? false)) return $result;

        $body = (array)($result['response'] ?? []);
        $clientSecret = trim((string)($body['client_secret'] ?? ''));
        if ($clientSecret === '') {
            return [
                'ok' => false,
                'http_status' => $result['http_status'] ?? null,
                'message' => 'Paymob Intention response did not include client_secret.',
                'response' => $this->safeResponseBody($body),
            ];
        }

        return [
            'ok' => true,
            'provider' => 'paymob',
            'id' => $body['id'] ?? null,
            'client_secret' => $clientSecret,
            'status' => $body['status'] ?? null,
            'checkout_url' => $this->checkoutUrl($clientSecret),
            'response' => $body,
        ];
    }

    /** Update an existing Intention before checkout completes. */
    public function updateIntention(string $clientSecret, array $payload): array
    {
        $clientSecret = trim($clientSecret);
        if ($clientSecret === '') return ['ok' => false, 'message' => 'Paymob client_secret is required.'];
        if ($this->config['secret_key'] === '') return ['ok' => false, 'message' => 'Paymob Secret Key is not configured.'];

        return $this->secretRequest('PUT', '/v1/intention/'.rawurlencode($clientSecret), $payload, 30);
    }

    public function checkoutUrl(string $clientSecret, ?string $publicKey = null): string
    {
        $clientSecret = trim($clientSecret);
        $publicKey = trim((string)($publicKey ?? $this->config['public_key']));

        if ($clientSecret === '' || $publicKey === '') return '';

        return $this->config['api_base_url'].'/unifiedcheckout/?publicKey='.
            rawurlencode($publicKey).'&clientSecret='.rawurlencode($clientSecret);
    }

    /**
     * Paymob Transaction Processed callback HMAC.
     * SHA-512, exact 20-field order, hmac query parameter.
     */
    public function verifyTransactionPostHmac(array $obj, ?string $receivedHmac): array
    {
        $secret = $this->config['hmac_secret'];
        $receivedHmac = strtolower(trim((string)$receivedHmac));

        if ($secret === '') return ['ok' => false, 'message' => 'Paymob HMAC Secret is not configured.'];
        if ($receivedHmac === '') return ['ok' => false, 'message' => 'Missing Paymob HMAC signature.'];

        $order = is_array($obj['order'] ?? null) ? $obj['order'] : [];
        $sourceData = is_array($obj['source_data'] ?? null) ? $obj['source_data'] : [];

        $fields = [
            $obj['amount_cents'] ?? null,
            $obj['created_at'] ?? null,
            $obj['currency'] ?? null,
            $obj['error_occured'] ?? null,
            $obj['has_parent_transaction'] ?? null,
            $obj['id'] ?? null,
            $obj['integration_id'] ?? null,
            $obj['is_3d_secure'] ?? null,
            $obj['is_auth'] ?? null,
            $obj['is_capture'] ?? null,
            $obj['is_refunded'] ?? null,
            $obj['is_standalone_payment'] ?? null,
            $obj['is_voided'] ?? null,
            $order['id'] ?? null,
            $obj['owner'] ?? null,
            $obj['pending'] ?? null,
            $sourceData['pan'] ?? null,
            $sourceData['sub_type'] ?? null,
            $sourceData['type'] ?? null,
            $obj['success'] ?? null,
        ];

        $joined = implode('', array_map([$this, 'hmacString'], $fields));
        $computed = strtolower(hash_hmac('sha512', $joined, $secret));
        $ok = strlen($computed) === strlen($receivedHmac) && hash_equals($computed, $receivedHmac);

        return ['ok' => $ok, 'message' => $ok ? 'Paymob HMAC verified.' : 'Paymob HMAC verification failed.'];
    }

    /** Card-token callback uses a different 8-field HMAC contract. */
    public function verifyCardTokenHmac(array $obj, ?string $receivedHmac): array
    {
        $secret = $this->config['hmac_secret'];
        $receivedHmac = strtolower(trim((string)$receivedHmac));
        if ($secret === '') return ['ok' => false, 'message' => 'Paymob HMAC Secret is not configured.'];
        if ($receivedHmac === '') return ['ok' => false, 'message' => 'Missing Paymob HMAC signature.'];

        $fields = [
            $obj['card_subtype'] ?? null,
            $obj['created_at'] ?? null,
            $obj['email'] ?? null,
            $obj['id'] ?? null,
            $obj['masked_pan'] ?? null,
            $obj['merchant_id'] ?? null,
            $obj['order_id'] ?? null,
            $obj['token'] ?? null,
        ];

        $joined = implode('', array_map([$this, 'hmacString'], $fields));
        $computed = strtolower(hash_hmac('sha512', $joined, $secret));
        $ok = strlen($computed) === strlen($receivedHmac) && hash_equals($computed, $receivedHmac);

        return ['ok' => $ok, 'message' => $ok ? 'Paymob card-token HMAC verified.' : 'Paymob card-token HMAC verification failed.'];
    }

    /**
     * Refund a settled transaction. Partial refund is supported via amount_cents.
     * Callers must perform their own authorization and idempotency guard.
     */
    public function refundTransaction(int|string $transactionId, int $amountMinor): array
    {
        if ($amountMinor <= 0) return ['ok' => false, 'message' => 'Refund amount must be greater than zero.'];

        return $this->secretRequest('POST', '/api/acceptance/void_refund/refund', [
            'transaction_id' => $transactionId,
            'amount_cents' => $amountMinor,
        ], 30);
    }

    /** Void a card transaction before settlement. */
    public function voidTransaction(int|string $transactionId): array
    {
        return $this->secretRequest('POST', '/api/acceptance/void_refund/void', [
            'transaction_id' => $transactionId,
        ], 30);
    }

    /** Capture a previously authorized transaction. */
    public function captureTransaction(int|string $transactionId, int $amountMinor): array
    {
        if ($amountMinor <= 0) return ['ok' => false, 'message' => 'Capture amount must be greater than zero.'];

        return $this->secretRequest('POST', '/api/acceptance/capture', [
            'transaction_id' => $transactionId,
            'amount_cents' => $amountMinor,
        ], 30);
    }

    /** Pull current transaction state for reconciliation. */
    public function retrieveTransaction(int|string $transactionId): array
    {
        return $this->inquiryGet('/api/acceptance/transactions/'.rawurlencode((string)$transactionId));
    }

    /** Pull Paymob order + nested transactions for reconciliation. */
    public function retrieveOrder(int|string $orderId): array
    {
        return $this->inquiryGet('/api/ecommerce/orders/'.rawurlencode((string)$orderId));
    }

    /**
     * Normalize the transaction object into PMD-friendly state without mutating DB.
     */
    public function normalizeTransactionState(array $obj): array
    {
        $amount = (int)($obj['amount_cents'] ?? 0);
        $refunded = (int)($obj['refunded_amount_cents'] ?? 0);
        $pending = $this->boolValue($obj['pending'] ?? false);
        $success = $this->boolValue($obj['success'] ?? false);
        $voided = $this->boolValue($obj['is_voided'] ?? false);
        $isRefunded = $this->boolValue($obj['is_refunded'] ?? false) || $refunded > 0;
        $error = $this->boolValue($obj['error_occured'] ?? false);

        $status = 'failed';
        if ($pending) {
            $status = 'pending';
        } elseif ($voided) {
            $status = 'voided';
        } elseif ($isRefunded) {
            $status = $amount > 0 && $refunded > 0 && $refunded < $amount ? 'partially_refunded' : 'refunded';
        } elseif ($success && !$error) {
            $status = 'paid';
        }

        $order = is_array($obj['order'] ?? null) ? $obj['order'] : [];

        return [
            'status' => $status,
            'transaction_id' => $obj['id'] ?? null,
            'paymob_order_id' => $order['id'] ?? null,
            'merchant_order_id' => $order['merchant_order_id'] ?? $obj['merchant_order_id'] ?? null,
            'integration_id' => $obj['integration_id'] ?? null,
            'amount_minor' => $amount,
            'refunded_amount_minor' => $refunded,
            'currency' => strtoupper((string)($obj['currency'] ?? '')),
            'is_live' => $this->boolValue($obj['is_live'] ?? ($this->config['mode'] === 'live')),
            'success' => $success,
            'pending' => $pending,
            'is_voided' => $voided,
            'is_refunded' => $isRefunded,
            'is_3d_secure' => $this->boolValue($obj['is_3d_secure'] ?? false),
        ];
    }

    private function normalizeConfig(array $config): array
    {
        $mode = strtolower(trim((string)($config['mode'] ?? $config['transaction_mode'] ?? 'test')));
        if (!in_array($mode, ['test', 'live'], true)) $mode = 'test';

        $selected = static function (array $source, string $field, string $mode): string {
            $direct = trim((string)($source[$field] ?? ''));
            if ($direct !== '') return $direct;

            return trim((string)($source[$mode.'_'.$field] ?? ''));
        };

        $integrationIds = (array)($config['integration_ids'] ?? []);
        foreach (['card', 'omannet', 'apple_pay', 'google_pay'] as $method) {
            $direct = $config['integration_id_'.$method] ?? null;
            $modeValue = $config[$mode.'_integration_id_'.$method] ?? null;
            if ($direct !== null && trim((string)$direct) !== '') {
                $integrationIds[$method] = trim((string)$direct);
            } elseif ($modeValue !== null && trim((string)$modeValue) !== '') {
                $integrationIds[$method] = trim((string)$modeValue);
            }
        }

        return [
            'mode' => $mode,
            'api_base_url' => self::OMAN_BASE_URL,
            'currency' => strtoupper(trim((string)($config['currency'] ?? 'OMR')) ?: 'OMR'),
            'secret_key' => $selected($config, 'secret_key', $mode),
            'public_key' => $selected($config, 'public_key', $mode),
            'api_key' => $selected($config, 'api_key', $mode),
            'hmac_secret' => $selected($config, 'hmac_secret', $mode),
            'integration_ids' => $integrationIds,
        ];
    }

    private function normalizeIntentionPayload(array $payload): array
    {
        $amount = (int)($payload['amount'] ?? 0);
        $currency = strtoupper(trim((string)($payload['currency'] ?? $this->config['currency'])));
        $methods = array_values(array_filter((array)($payload['payment_methods'] ?? []), static function ($value) {
            return is_int($value) || ctype_digit((string)$value);
        }));

        if ($amount <= 0) return ['ok' => false, 'message' => 'Paymob Intention amount must be greater than zero.'];
        if ($currency === '') return ['ok' => false, 'message' => 'Paymob Intention currency is required.'];
        if (!$methods) return ['ok' => false, 'message' => 'At least one enabled Paymob Integration ID is required.'];

        $payload['amount'] = $amount;
        $payload['currency'] = $currency;
        $payload['payment_methods'] = $methods;

        return ['ok' => true, 'payload' => $payload];
    }

    /** Secret-Key authenticated request used by Intention and money-management APIs. */
    private function secretRequest(string $method, string $path, ?array $payload = null, int $timeout = 30): array
    {
        if ($this->config['secret_key'] === '') {
            return ['ok' => false, 'message' => 'Paymob Secret Key is not configured.'];
        }

        try {
            $request = Http::withHeaders([
                    'Authorization' => 'Token '.$this->config['secret_key'],
                    'Accept' => 'application/json',
                ])
                ->asJson()
                ->timeout($timeout);

            $url = $this->config['api_base_url'].$path;
            $response = match (strtoupper($method)) {
                'POST' => $request->post($url, $payload ?? []),
                'PUT' => $request->put($url, $payload ?? []),
                'PATCH' => $request->patch($url, $payload ?? []),
                'GET' => $request->get($url, $payload ?? []),
                default => throw new \InvalidArgumentException('Unsupported Paymob HTTP method.'),
            };
        } catch (\Throwable $error) {
            return ['ok' => false, 'message' => 'Unable to reach Paymob Oman: '.$error->getMessage()];
        }

        $body = $this->json($response);
        if (!$response->successful()) {
            return [
                'ok' => false,
                'http_status' => $response->status(),
                'message' => $this->errorMessage($response, $body, 'Paymob request failed.'),
                'response' => $this->safeResponseBody($body),
            ];
        }

        return [
            'ok' => true,
            'http_status' => $response->status(),
            'response' => $this->safeResponseBody($body),
        ];
    }

    /** API-Key -> short-lived token. Token never leaves this client. */
    private function inquiryAuthToken(): array
    {
        if ($this->config['api_key'] === '') return ['ok' => false, 'message' => 'Paymob API Key is not configured.'];

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->timeout(20)
                ->post($this->config['api_base_url'].'/api/auth/tokens', [
                    'api_key' => $this->config['api_key'],
                ]);
        } catch (\Throwable $error) {
            return ['ok' => false, 'message' => 'Unable to reach Paymob Oman: '.$error->getMessage()];
        }

        $body = $this->json($response);
        $token = trim((string)($body['token'] ?? ''));
        if (!$response->successful() || $token === '') {
            return [
                'ok' => false,
                'http_status' => $response->status(),
                'message' => $this->errorMessage($response, $body, 'Paymob rejected the API Key.'),
            ];
        }

        return ['ok' => true, 'token' => $token];
    }

    private function inquiryGet(string $path): array
    {
        $auth = $this->inquiryAuthToken();
        if (!($auth['ok'] ?? false)) return $auth;

        try {
            $response = Http::acceptJson()
                ->timeout(20)
                ->get($this->config['api_base_url'].$path, ['token' => $auth['token']]);
        } catch (\Throwable $error) {
            return ['ok' => false, 'message' => 'Unable to inquire Paymob Oman: '.$error->getMessage()];
        }

        $body = $this->json($response);
        if (!$response->successful()) {
            return [
                'ok' => false,
                'http_status' => $response->status(),
                'message' => $this->errorMessage($response, $body, 'Paymob inquiry failed.'),
                'response' => $this->safeResponseBody($body),
            ];
        }

        return [
            'ok' => true,
            'http_status' => $response->status(),
            'response' => $this->safeResponseBody($body),
        ];
    }

    private function hmacString($value): string
    {
        if (is_bool($value)) return $value ? 'true' : 'false';
        if ($value === null) return '';

        return (string)$value;
    }

    private function boolValue($value): bool
    {
        if (is_bool($value)) return $value;
        if (is_numeric($value)) return (int)$value !== 0;

        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'on'], true);
    }

    private function json(Response $response): array
    {
        try {
            $json = $response->json();
            return is_array($json) ? $json : [];
        } catch (\Throwable $error) {
            return [];
        }
    }

    private function errorMessage(Response $response, array $body, string $fallback): string
    {
        foreach (['detail', 'message', 'error', 'error_message'] as $key) {
            if (isset($body[$key]) && is_scalar($body[$key]) && trim((string)$body[$key]) !== '') {
                return trim((string)$body[$key]);
            }
        }

        return $fallback.' HTTP '.$response->status().'.';
    }

    private function safeResponseBody(array $body): array
    {
        foreach (['token', 'secret_key', 'public_key', 'api_key', 'hmac_secret'] as $field) {
            if (array_key_exists($field, $body)) {
                $body[$field] = $body[$field] ? '***redacted***' : $body[$field];
            }
        }

        return $body;
    }
}
