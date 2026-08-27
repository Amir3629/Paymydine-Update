<?php

namespace App\Services\Payments;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * PMD_PAYMOB_OMAN_API_R1
 *
 * Server-side Paymob Accept client for the Oman region.
 *
 * Rules:
 * - Modern payment creation uses the Intention API only.
 * - Oman uses https://oman.paymob.com for both test and live credentials.
 * - Test/live behavior is selected by the Secret/Public Keys and Integration IDs,
 *   not by changing the regional API host.
 * - Secret Key, API Key and HMAC Secret must never reach the browser.
 * - Browser redirect data is UX-only; settlement must use an HMAC-verified webhook.
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

    /**
     * Safe diagnostic view. Never return server-side secrets.
     */
    public function safeConfig(): array
    {
        return [
            'provider' => 'paymob',
            'region' => 'OMN',
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

    /**
     * Structural validation only; this performs no network request.
     */
    public function validateConfiguration(bool $requireIntentionCredentials = false): array
    {
        $missing = [];

        if ($this->config['api_base_url'] !== self::OMAN_BASE_URL) {
            return [
                'ok' => false,
                'message' => 'Paymob Oman must use '.self::OMAN_BASE_URL.'.',
            ];
        }

        if ($this->config['api_key'] === '') {
            $missing[] = 'api_key';
        }

        if ($requireIntentionCredentials) {
            foreach (['secret_key', 'public_key', 'hmac_secret'] as $field) {
                if ($this->config[$field] === '') {
                    $missing[] = $field;
                }
            }

            if (!count(array_filter($this->config['integration_ids'], static fn ($value) => trim((string)$value) !== ''))) {
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
            return [
                'ok' => false,
                'message' => 'The Paymob Secret Key format does not look valid.',
            ];
        }

        if ($this->config['public_key'] !== '' && !preg_match('/(^|_)pk_(test|live)_|^pk_/i', $this->config['public_key'])) {
            return [
                'ok' => false,
                'message' => 'The Paymob Public Key format does not look valid.',
            ];
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
     *
     * Paymob's official collections use API Key -> /api/auth/tokens for
     * Transaction Inquiry and related APIs. This verifies account access without
     * creating a payment or an Intention. The returned bearer token is deliberately
     * discarded and never exposed by this method.
     */
    public function testConnection(): array
    {
        $validation = $this->validateConfiguration(false);
        if (!($validation['ok'] ?? false)) {
            return $validation + ['connected' => false];
        }

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->timeout(20)
                ->post($this->config['api_base_url'].'/api/auth/tokens', [
                    'api_key' => $this->config['api_key'],
                ]);
        } catch (\Throwable $error) {
            return [
                'ok' => false,
                'connected' => false,
                'message' => 'Unable to reach Paymob Oman: '.$error->getMessage(),
            ];
        }

        $body = $this->json($response);
        $hasToken = is_string($body['token'] ?? null) && trim((string)$body['token']) !== '';

        if (!$response->successful() || !$hasToken) {
            return [
                'ok' => false,
                'connected' => false,
                'http_status' => $response->status(),
                'message' => $this->errorMessage($response, $body, 'Paymob rejected the API Key.'),
            ];
        }

        return [
            'ok' => true,
            'connected' => true,
            'provider' => 'paymob',
            'region' => 'OMN',
            'mode' => $this->config['mode'],
            'api_base_url' => $this->config['api_base_url'],
            'http_status' => $response->status(),
            'message' => 'Paymob Oman API Key accepted. No payment was created.',
        ];
    }

    /**
     * Create a Paymob payment Intention.
     *
     * Official contract:
     * POST /v1/intention/
     * Authorization: Token {secret_key}
     */
    public function createIntention(array $payload): array
    {
        $validation = $this->validateConfiguration(true);
        if (!($validation['ok'] ?? false)) {
            return $validation;
        }

        $amount = (int)($payload['amount'] ?? 0);
        $currency = strtoupper(trim((string)($payload['currency'] ?? $this->config['currency'])));
        $methods = array_values(array_filter((array)($payload['payment_methods'] ?? []), static function ($value) {
            return is_int($value) || ctype_digit((string)$value) || trim((string)$value) !== '';
        }));

        if ($amount <= 0) {
            return ['ok' => false, 'message' => 'Paymob Intention amount must be greater than zero.'];
        }
        if ($currency === '') {
            return ['ok' => false, 'message' => 'Paymob Intention currency is required.'];
        }
        if (!$methods) {
            return ['ok' => false, 'message' => 'At least one enabled Paymob Integration ID is required.'];
        }

        $payload['amount'] = $amount;
        $payload['currency'] = $currency;
        $payload['payment_methods'] = $methods;

        try {
            $response = Http::withHeaders([
                    'Authorization' => 'Token '.$this->config['secret_key'],
                    'Accept' => 'application/json',
                ])
                ->asJson()
                ->timeout(30)
                ->post($this->config['api_base_url'].'/v1/intention/', $payload);
        } catch (\Throwable $error) {
            return [
                'ok' => false,
                'message' => 'Unable to create Paymob Intention: '.$error->getMessage(),
            ];
        }

        $body = $this->json($response);
        $clientSecret = trim((string)($body['client_secret'] ?? ''));

        if (!$response->successful() || $clientSecret === '') {
            return [
                'ok' => false,
                'http_status' => $response->status(),
                'message' => $this->errorMessage($response, $body, 'Paymob Intention creation failed.'),
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

    public function checkoutUrl(string $clientSecret, ?string $publicKey = null): string
    {
        $clientSecret = trim($clientSecret);
        $publicKey = trim((string)($publicKey ?? $this->config['public_key']));

        if ($clientSecret === '' || $publicKey === '') {
            return '';
        }

        return $this->config['api_base_url'].'/unifiedcheckout/?publicKey='.
            rawurlencode($publicKey).'&clientSecret='.rawurlencode($clientSecret);
    }

    /**
     * Verify Paymob transaction POST callback HMAC.
     *
     * Paymob requires SHA-512 over these 20 fields in this exact order.
     * Redirect query parameters are not authenticated and must never settle an order.
     */
    public function verifyTransactionPostHmac(array $obj, ?string $receivedHmac): array
    {
        $secret = $this->config['hmac_secret'];
        $receivedHmac = strtolower(trim((string)$receivedHmac));

        if ($secret === '') {
            return ['ok' => false, 'message' => 'Paymob HMAC Secret is not configured.'];
        }
        if ($receivedHmac === '') {
            return ['ok' => false, 'message' => 'Missing Paymob HMAC signature.'];
        }

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

        return [
            'ok' => $ok,
            'message' => $ok ? 'Paymob HMAC verified.' : 'Paymob HMAC verification failed.',
        ];
    }

    private function normalizeConfig(array $config): array
    {
        $mode = strtolower(trim((string)($config['mode'] ?? $config['transaction_mode'] ?? 'test')));
        if (!in_array($mode, ['test', 'live'], true)) {
            $mode = 'test';
        }

        $integrationIds = (array)($config['integration_ids'] ?? []);
        foreach (['card', 'omannet', 'apple_pay', 'google_pay'] as $method) {
            $direct = $config['integration_id_'.$method] ?? null;
            if ($direct !== null && trim((string)$direct) !== '') {
                $integrationIds[$method] = trim((string)$direct);
            }
        }

        return [
            'mode' => $mode,
            'api_base_url' => self::OMAN_BASE_URL,
            'currency' => strtoupper(trim((string)($config['currency'] ?? 'OMR')) ?: 'OMR'),
            'secret_key' => trim((string)($config['secret_key'] ?? '')),
            'public_key' => trim((string)($config['public_key'] ?? '')),
            'api_key' => trim((string)($config['api_key'] ?? '')),
            'hmac_secret' => trim((string)($config['hmac_secret'] ?? '')),
            'integration_ids' => $integrationIds,
        ];
    }

    private function hmacString($value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if ($value === null) {
            return '';
        }

        return (string)$value;
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
        foreach (['token', 'secret_key', 'public_key', 'api_key', 'hmac_secret', 'client_secret'] as $field) {
            if (array_key_exists($field, $body)) {
                $body[$field] = $body[$field] ? '***redacted***' : $body[$field];
            }
        }

        return $body;
    }
}
