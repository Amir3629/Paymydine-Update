<?php

namespace App\Services\Payments;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * PMD_VR_PAYMENT_API_V2_R1
 *
 * Small tenant-scoped client for VR Payment Gateway API v2.0.
 *
 * Authentication follows the current VR Payment Web Service contract:
 * - Application User ID in JWT `sub`
 * - base64-decoded Application User authentication key
 * - HS256
 * - requestPath must exactly match the URL path + query string
 * - requestMethod must be uppercase
 * - `space` is sent as a request header on space-scoped API calls
 *
 * Secrets are never returned by diagnostics helpers.
 */
class VrPaymentApiClient
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $this->normalizeConfig($config);
    }

    public function config(): array
    {
        return $this->config;
    }

    public function validateConfiguration(): array
    {
        $missing = [];
        foreach (['space_id', 'user_id', 'auth_key'] as $field) {
            if (trim((string)($this->config[$field] ?? '')) === '') {
                $missing[] = $field;
            }
        }

        if ($missing) {
            return [
                'ok' => false,
                'message' => 'Missing VR Payment fields: '.implode(', ', $missing),
                'missing' => $missing,
            ];
        }

        if (!ctype_digit((string)$this->config['space_id']) || (int)$this->config['space_id'] <= 0) {
            return ['ok' => false, 'message' => 'VR Payment Space ID must be a positive integer.'];
        }
        if (!ctype_digit((string)$this->config['user_id']) || (int)$this->config['user_id'] <= 0) {
            return ['ok' => false, 'message' => 'VR Payment Application User ID must be a positive integer.'];
        }

        $decoded = base64_decode((string)$this->config['auth_key'], true);
        if ($decoded === false || $decoded === '') {
            return ['ok' => false, 'message' => 'VR Payment Authentication Key must be the base64 key shown for the Application User.'];
        }

        return ['ok' => true, 'message' => 'VR Payment API credentials are structurally valid.'];
    }

    public function connectionAudit(): array
    {
        $validation = $this->validateConfiguration();
        if (!($validation['ok'] ?? false)) {
            return $validation + ['connected' => false];
        }

        $methods = $this->paymentMethodConfigurations();
        if (!($methods['ok'] ?? false)) {
            return [
                'ok' => false,
                'connected' => false,
                'message' => 'VR Payment credentials could not access the configured Space.',
                'api' => $this->safeResult($methods),
            ];
        }

        $terminals = $this->terminals();
        $normalizedMethods = $this->normalizeMethodConfigurations((array)($methods['data'] ?? []));
        $normalizedTerminals = ($terminals['ok'] ?? false)
            ? $this->normalizeTerminals((array)($terminals['data'] ?? []))
            : [];

        $availableCodes = array_values(array_unique(array_filter(array_map(
            static fn (array $row): string => (string)($row['pmd_method_code'] ?? ''),
            $normalizedMethods
        ))));

        return [
            'ok' => true,
            'connected' => true,
            'provider' => 'vr_payment',
            'environment' => $this->config['mode'],
            'space_id' => (int)$this->config['space_id'],
            'application_user_id' => (int)$this->config['user_id'],
            'api_base_url' => $this->config['api_base_url'],
            'payment_methods' => $normalizedMethods,
            'available_method_codes' => $availableCodes,
            'card_ready' => in_array('card', $availableCodes, true),
            'apple_pay_ready' => in_array('apple_pay', $availableCodes, true),
            'google_pay_ready' => in_array('google_pay', $availableCodes, true),
            'wero_ready' => in_array('wero', $availableCodes, true),
            'paypal_ready' => in_array('paypal', $availableCodes, true),
            'terminals_api_ok' => (bool)($terminals['ok'] ?? false),
            'terminal_count' => count($normalizedTerminals),
            'terminals' => $normalizedTerminals,
        ];
    }

    public function paymentMethodConfigurations(): array
    {
        return $this->request('GET', '/api/v2.0/payment/method-configurations/search', [
            'limit' => 100,
            'order' => 'id ASC',
        ]);
    }

    public function availablePaymentMethodConfigurations(int $transactionId, string $integrationMode = 'payment_page'): array
    {
        return $this->request(
            'GET',
            '/api/v2.0/payment/transactions/'.$transactionId.'/payment-method-configurations',
            ['integrationMode' => $integrationMode]
        );
    }

    public function terminals(): array
    {
        return $this->request('GET', '/api/v2.0/payment/terminals', [
            'limit' => 100,
            'order' => 'ASC',
        ]);
    }

    public function terminal(int $terminalId): array
    {
        return $this->request('GET', '/api/v2.0/payment/terminals/'.$terminalId);
    }

    public function createTransaction(array $payload): array
    {
        return $this->request('POST', '/api/v2.0/payment/transactions', [], $payload);
    }

    public function readTransaction(int $transactionId): array
    {
        return $this->request('GET', '/api/v2.0/payment/transactions/'.$transactionId);
    }

    public function paymentPageUrl(int $transactionId): array
    {
        return $this->request('GET', '/api/v2.0/payment/transactions/'.$transactionId.'/payment-page-url');
    }

    public function performTerminalTransaction(int $terminalId, int $transactionId, string $language = 'de-DE'): array
    {
        return $this->request(
            'POST',
            '/api/v2.0/payment/terminals/'.$terminalId.'/perform-transaction',
            [
                'transactionId' => $transactionId,
                'language' => $language,
            ],
            null,
            95
        );
    }

    public function performTerminalTransactionByIdentifier(string $identifier, int $transactionId, string $language = 'de-DE'): array
    {
        return $this->request(
            'POST',
            '/api/v2.0/payment/terminals/by-identifier/'.rawurlencode($identifier).'/perform-transaction',
            [
                'transactionId' => $transactionId,
                'language' => $language,
            ],
            null,
            95
        );
    }

    public function terminalReceipts(int $transactionId, string $format = 'TXT', int $width = 42): array
    {
        return $this->request(
            'GET',
            '/api/v2.0/payment/transactions/'.$transactionId.'/terminal-receipts',
            ['format' => strtoupper($format), 'width' => $width]
        );
    }

    public function triggerFinalBalance(int $terminalId): array
    {
        return $this->request('POST', '/api/v2.0/payment/terminals/'.$terminalId.'/trigger-final-balance');
    }

    public function webhookEncryptionKey(string $keyId): array
    {
        return $this->request(
            'GET',
            '/api/v2.0/webhooks/encryption-keys/'.rawurlencode($keyId),
            [],
            null,
            20,
            false
        );
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): array
    {
        $signatureHeader = trim((string)$signatureHeader);
        if ($signatureHeader === '') {
            return ['ok' => false, 'message' => 'Missing x-signature header.'];
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
            if ($key !== '') {
                $parts[trim($key)] = trim($value);
            }
        }

        if (strcasecmp((string)($parts['algorithm'] ?? ''), 'SHA256withECDSA') !== 0) {
            return ['ok' => false, 'message' => 'Unsupported VR Payment webhook signature algorithm.'];
        }

        $keyId = trim((string)($parts['keyId'] ?? ''));
        $encodedSignature = trim((string)($parts['signature'] ?? ''));
        if ($keyId === '' || $encodedSignature === '') {
            return ['ok' => false, 'message' => 'Malformed VR Payment x-signature header.'];
        }

        $keyResponse = $this->webhookEncryptionKey($keyId);
        if (!($keyResponse['ok'] ?? false)) {
            return ['ok' => false, 'message' => 'Unable to retrieve VR Payment webhook verification key.'];
        }

        $publicKey = $this->extractPublicKey($keyResponse);
        if ($publicKey === '') {
            return ['ok' => false, 'message' => 'VR Payment webhook verification key is empty.'];
        }

        $signature = base64_decode($encodedSignature, true);
        if ($signature === false || $signature === '') {
            return ['ok' => false, 'message' => 'VR Payment webhook signature is not valid base64.'];
        }

        // VR Payment examples use a 64-byte P-256 r||s signature. OpenSSL expects DER.
        if (strlen($signature) === 64) {
            $signature = $this->ecdsaRawSignatureToDer($signature);
        }

        $verified = openssl_verify($rawBody, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($verified !== 1) {
            return ['ok' => false, 'message' => 'VR Payment webhook signature verification failed.', 'key_id' => $keyId];
        }

        return ['ok' => true, 'message' => 'VR Payment webhook signature is valid.', 'key_id' => $keyId];
    }

    public function normalizeMethodConfigurations(array $payload): array
    {
        $rows = $this->extractCollection($payload);
        $normalized = [];

        foreach ($rows as $row) {
            if (!is_array($row)) continue;

            $method = $row['paymentMethod'] ?? $row['payment_method'] ?? null;
            $methodName = $this->localizedName($method)
                ?: $this->localizedName($row)
                ?: (string)($row['name'] ?? '');
            $connector = $row['paymentConnectorConfiguration']
                ?? $row['payment_connector_configuration']
                ?? $row['connectorConfiguration']
                ?? null;
            $connectorName = $this->localizedName($connector);
            $haystack = strtolower(trim($methodName.' '.$connectorName.' '.json_encode($row)));
            $code = $this->mapProviderMethodName($haystack);

            $state = strtolower((string)($row['state'] ?? $row['configurationState'] ?? ''));
            $active = !in_array($state, ['inactive', 'deleted', 'obsolete', 'failed'], true);

            $normalized[] = [
                'id' => isset($row['id']) ? (int)$row['id'] : null,
                'name' => $methodName !== '' ? $methodName : ($connectorName !== '' ? $connectorName : 'VR Payment method'),
                'connector_name' => $connectorName !== '' ? $connectorName : null,
                'state' => $state !== '' ? $state : null,
                'active' => $active,
                'pmd_method_code' => $active ? $code : null,
            ];
        }

        return $normalized;
    }

    public function normalizeTerminals(array $payload): array
    {
        $rows = $this->extractCollection($payload);
        $normalized = [];

        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $id = (int)($row['id'] ?? 0);
            if ($id <= 0) continue;

            $identifier = trim((string)($row['identifier'] ?? $row['terminalIdentifier'] ?? ''));
            $name = trim((string)($row['name'] ?? $row['label'] ?? ''));
            $state = strtolower((string)($row['state'] ?? 'unknown'));
            $device = is_array($row['device'] ?? null) ? $row['device'] : [];
            $serial = trim((string)($device['serialNumber'] ?? $row['serialNumber'] ?? ''));

            $normalized[] = [
                'id' => $id,
                'identifier' => $identifier !== '' ? $identifier : null,
                'name' => $name !== '' ? $name : ($identifier !== '' ? 'VR '.$identifier : 'VR terminal '.$id),
                'state' => $state,
                'serial_number' => $serial !== '' ? $serial : null,
                'online' => in_array($state, ['active', 'linked', 'ready'], true),
            ];
        }

        return $normalized;
    }

    public function normalizeTransactionStatus(array $transaction): string
    {
        $state = strtoupper(trim((string)($transaction['state'] ?? $transaction['status'] ?? '')));

        return match ($state) {
            'AUTHORIZED', 'FULFILL', 'FULFILLED', 'COMPLETED' => 'paid',
            'FAILED', 'DECLINE', 'DECLINED' => 'failed',
            'VOIDED', 'CANCELLED', 'CANCELED' => 'cancelled',
            'PENDING', 'CONFIRMED', 'PROCESSING' => 'sent_to_terminal',
            default => 'pending',
        };
    }

    private function request(
        string $method,
        string $path,
        array $query = [],
        ?array $json = null,
        int $timeout = 30,
        bool $spaceScoped = true
    ): array {
        $method = strtoupper(trim($method));
        $path = '/'.ltrim($path, '/');
        $query = array_filter($query, static fn ($value): bool => $value !== null && $value !== '');
        $queryString = $query ? http_build_query($query, '', '&', PHP_QUERY_RFC3986) : '';
        $requestPath = $path.($queryString !== '' ? '?'.$queryString : '');
        $url = rtrim($this->config['api_base_url'], '/').$requestPath;

        $validation = $this->validateConfiguration();
        if (!($validation['ok'] ?? false)) {
            return [
                'ok' => false,
                'status' => 0,
                'message' => $validation['message'] ?? 'VR Payment configuration is invalid.',
            ];
        }

        $headers = [
            'Authorization' => 'Bearer '.$this->jwt($method, $requestPath),
            'Accept' => 'application/json',
        ];
        if ($spaceScoped) {
            $headers['space'] = (string)$this->config['space_id'];
        }

        try {
            $request = Http::withHeaders($headers)->timeout($timeout);
            if ($json !== null) {
                $request = $request->asJson();
            }

            /** @var Response $response */
            $response = match ($method) {
                'GET' => $request->get($url),
                'POST' => $request->post($url, $json ?? []),
                'PATCH' => $request->patch($url, $json ?? []),
                'DELETE' => $request->delete($url, $json ?? []),
                default => throw new \InvalidArgumentException('Unsupported VR Payment HTTP method: '.$method),
            };

            $body = $response->json();
            if ($body === null) {
                $body = trim((string)$response->body());
            }

            $result = [
                'ok' => $response->successful(),
                'status' => $response->status(),
                'data' => is_array($body) ? $body : $body,
            ];

            if (!$response->successful()) {
                $result['message'] = $this->providerErrorMessage($body, $response->status());
            }

            return $result;
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => 0,
                'message' => 'VR Payment API request failed: '.$e->getMessage(),
                'exception' => get_class($e),
            ];
        }
    }

    private function jwt(string $method, string $requestPath): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT', 'ver' => 1];
        $payload = [
            'sub' => (string)$this->config['user_id'],
            'iat' => time(),
            'requestPath' => $requestPath,
            'requestMethod' => strtoupper($method),
        ];

        $head = $this->base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES));
        $body = $this->base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES));
        $key = base64_decode((string)$this->config['auth_key'], true);
        if ($key === false) {
            throw new \RuntimeException('VR Payment Authentication Key is not valid base64.');
        }
        $signature = hash_hmac('sha256', $head.'.'.$body, $key, true);

        return $head.'.'.$body.'.'.$this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function normalizeConfig(array $config): array
    {
        $base = trim((string)($config['api_base_url'] ?? $config['url'] ?? 'https://gateway.vr-payment.de'));
        if ($base === '') $base = 'https://gateway.vr-payment.de';
        $base = preg_replace('#/api(?:/v2\.0)?/?$#', '', rtrim($base, '/')) ?: rtrim($base, '/');

        return [
            'mode' => in_array(strtolower((string)($config['mode'] ?? 'test')), ['test', 'live'], true)
                ? strtolower((string)($config['mode'] ?? 'test'))
                : 'test',
            'api_base_url' => $base,
            'space_id' => trim((string)($config['space_id'] ?? '')),
            'user_id' => trim((string)($config['user_id'] ?? $config['application_user_id'] ?? '')),
            'auth_key' => trim((string)($config['auth_key'] ?? $config['authentication_key'] ?? '')),
            'currency' => strtoupper(trim((string)($config['currency'] ?? 'EUR'))) ?: 'EUR',
        ];
    }

    private function providerErrorMessage($body, int $status): string
    {
        if (is_array($body)) {
            foreach (['message', 'detail', 'error', 'description'] as $key) {
                if (isset($body[$key]) && is_scalar($body[$key]) && trim((string)$body[$key]) !== '') {
                    return 'VR Payment HTTP '.$status.': '.trim((string)$body[$key]);
                }
            }
            if (isset($body['errors']) && is_array($body['errors'])) {
                return 'VR Payment HTTP '.$status.': '.json_encode($body['errors'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            }
        }
        if (is_string($body) && trim($body) !== '') {
            return 'VR Payment HTTP '.$status.': '.mb_substr(trim($body), 0, 800);
        }
        return 'VR Payment request failed with HTTP '.$status.'.';
    }

    private function extractCollection(array $payload): array
    {
        foreach (['data', 'items', 'results', 'entities'] as $key) {
            if (isset($payload[$key]) && is_array($payload[$key])) {
                return array_values($payload[$key]);
            }
        }

        if (array_is_list($payload)) {
            return $payload;
        }

        return [];
    }

    private function localizedName($value): string
    {
        if (!is_array($value)) return '';
        $name = $value['name'] ?? null;
        if (is_string($name)) return trim($name);
        if (is_array($name)) {
            foreach (['en-US', 'en-GB', 'de-DE', 'de-DE-x-informal', 'de', 'en'] as $locale) {
                if (isset($name[$locale]) && is_scalar($name[$locale])) {
                    return trim((string)$name[$locale]);
                }
            }
            foreach ($name as $candidate) {
                if (is_scalar($candidate) && trim((string)$candidate) !== '') {
                    return trim((string)$candidate);
                }
            }
        }
        return '';
    }

    private function mapProviderMethodName(string $haystack): ?string
    {
        if (str_contains($haystack, 'wero')) return 'wero';
        if (str_contains($haystack, 'apple pay') || str_contains($haystack, 'apple_pay')) return 'apple_pay';
        if (str_contains($haystack, 'google pay') || str_contains($haystack, 'google_pay')) return 'google_pay';
        if (str_contains($haystack, 'paypal') || str_contains($haystack, 'pay pal')) return 'paypal';
        if (
            str_contains($haystack, 'credit')
            || str_contains($haystack, 'debit')
            || str_contains($haystack, 'mastercard')
            || str_contains($haystack, 'visa')
            || str_contains($haystack, 'card')
            || str_contains($haystack, 'karte')
        ) return 'card';
        return null;
    }

    private function safeResult(array $result): array
    {
        return [
            'ok' => (bool)($result['ok'] ?? false),
            'status' => (int)($result['status'] ?? 0),
            'message' => $result['message'] ?? null,
        ];
    }

    private function extractPublicKey(array $result): string
    {
        $data = $result['data'] ?? null;
        if (is_string($data)) {
            $candidate = trim($data, " \t\n\r\0\x0B\"");
            return $this->normalizePemPublicKey($candidate);
        }
        if (is_array($data)) {
            foreach (['publicKey', 'public_key', 'key', 'value'] as $key) {
                if (isset($data[$key]) && is_string($data[$key])) {
                    return $this->normalizePemPublicKey(trim($data[$key]));
                }
            }
        }
        return '';
    }

    private function normalizePemPublicKey(string $value): string
    {
        if ($value === '') return '';
        $value = str_replace('\\n', "\n", $value);
        if (str_contains($value, 'BEGIN PUBLIC KEY')) return $value;

        $decoded = base64_decode($value, true);
        if ($decoded !== false && str_contains($decoded, 'BEGIN PUBLIC KEY')) {
            return $decoded;
        }

        // Endpoint may return DER/base64 key material. Wrap only when it looks base64-like.
        if (preg_match('/^[A-Za-z0-9+\/=\r\n]+$/', $value)) {
            $flat = preg_replace('/\s+/', '', $value);
            return "-----BEGIN PUBLIC KEY-----\n".chunk_split($flat, 64, "\n")."-----END PUBLIC KEY-----\n";
        }

        return $value;
    }

    private function ecdsaRawSignatureToDer(string $signature): string
    {
        $r = substr($signature, 0, 32);
        $s = substr($signature, 32, 32);
        $r = $this->derInteger($r);
        $s = $this->derInteger($s);
        $sequence = $r.$s;
        return "\x30".$this->derLength(strlen($sequence)).$sequence;
    }

    private function derInteger(string $value): string
    {
        $value = ltrim($value, "\x00");
        if ($value === '') $value = "\x00";
        if ((ord($value[0]) & 0x80) !== 0) $value = "\x00".$value;
        return "\x02".$this->derLength(strlen($value)).$value;
    }

    private function derLength(int $length): string
    {
        if ($length < 128) return chr($length);
        $encoded = '';
        while ($length > 0) {
            $encoded = chr($length & 0xff).$encoded;
            $length >>= 8;
        }
        return chr(0x80 | strlen($encoded)).$encoded;
    }
}
