<?php

namespace Admin\Classes;

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\Http;

class VRPaymentGatewayService
{
    protected const SUPPORTED_METHODS = ['card', 'apple_pay', 'google_pay', 'paypal', 'wero'];
    protected const MAC_VERSION = '1';

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

        foreach (self::SUPPORTED_METHODS as $method) {
            $readiness[$method.'_ready'] = $this->isMethodReady($method, $config);
            $readiness[$method.'_enabled'] = true;
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
        if (!in_array($method, self::SUPPORTED_METHODS, true)) {
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

        return true;
    }

    public function createRedirectSession(array $payload): array
    {
        $method = strtolower(trim((string)($payload['method'] ?? '')));
        $config = $this->getConfig();
        $merchantReference = $this->resolveMerchantReference((string)($payload['merchant_reference'] ?? ''), $method);

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
            return $this->businessError('vr_payment_wallet_not_enabled', 'Selected wallet is not enabled for VR Payment.');
        }

        try {
            $spaceId = (int)$config['space_id'];
            $gatewayBase = $this->resolveGatewayBaseUrl($config['api_base_url'] ?? '');
            $transactionPath = '/api/transaction/create?spaceId='.$spaceId;
            $requestPayload = $this->buildTransactionCreatePayload($method, $payload, $merchantReference);
            $response = $this->signedGatewayRequest('POST', $gatewayBase, $transactionPath, $config, $requestPayload);

            if (!$response->ok()) {
                $httpFailure = $this->normalizeHttpFailure($response->status(), (string)$response->body());
                PaymentLogger::warning('VR_PAYMENT_CREATE_SESSION_HTTP_FAILURE', [
                    'provider' => 'vr_payment',
                    'payment_method' => $method,
                    'request_meta' => ['endpoint' => $gatewayBase.$transactionPath, 'merchant_reference' => $merchantReference],
                    'response_meta' => ['status' => $response->status(), 'body' => $response->body()],
                ]);

                return $this->businessError(
                    (string)$httpFailure['error_code'],
                    (string)$httpFailure['error'],
                    [
                        'status' => $response->status(),
                        'error_category' => $httpFailure['error_category'] ?? 'provider_http',
                        'merchant_reference' => $merchantReference,
                        'provider_response' => $httpFailure['provider_response'] ?? null,
                    ]
                );
            }

            $body = (array)$response->json();
            $transactionId = (string)($body['id'] ?? $body['transaction_id'] ?? '');
            if ($transactionId === '') {
                return $this->businessError('vr_payment_transaction_create_failed', 'VR Payment transaction creation did not return an id.');
            }

            $paymentPagePath = '/api/transaction-payment-page/payment-page-url?spaceId='.$spaceId.'&id='.$transactionId;
            $pageResponse = $this->signedGatewayRequest('GET', $gatewayBase, $paymentPagePath, $config);
            if (!$pageResponse->ok()) {
                $httpFailure = $this->normalizeHttpFailure($pageResponse->status(), (string)$pageResponse->body());
                return $this->businessError(
                    (string)$httpFailure['error_code'],
                    (string)$httpFailure['error'],
                    [
                        'status' => $pageResponse->status(),
                        'error_category' => $httpFailure['error_category'] ?? 'provider_http',
                        'merchant_reference' => $merchantReference,
                        'provider_response' => $httpFailure['provider_response'] ?? null,
                    ]
                );
            }

            $pageBody = (array)$pageResponse->json();
            $redirectUrl = (string)($pageBody['url'] ?? $pageBody['paymentPageUrl'] ?? $pageBody['redirect_url'] ?? '');
            if ($redirectUrl === '') {
                return $this->businessError('vr_payment_redirect_missing', 'VR Payment did not return a redirect URL.');
            }

            return [
                'success' => true,
                'provider' => 'vr_payment',
                'method' => $method,
                'redirect_url' => $redirectUrl,
                'merchant_reference' => $merchantReference,
                'session_id' => $transactionId,
                'transaction_id' => $transactionId,
                'provider_reference' => $transactionId,
                'status' => $this->normalizePaymentStatus((string)($body['state'] ?? 'pending')),
            ];
        } catch (\Throwable $e) {
            $normalized = $this->normalizeProviderException($e);
            PaymentLogger::exception('VR_PAYMENT_CREATE_SESSION_EXCEPTION', $e, [
                'provider' => 'vr_payment',
                'payment_method' => $method,
                'error_category' => $normalized['error_category'] ?? null,
            ]);

            return $this->businessError(
                (string)($normalized['error_code'] ?? 'vr_payment_checkout_create_failed'),
                (string)($normalized['error'] ?? 'Unable to create VR Payment checkout session.'),
                [
                    'error_category' => $normalized['error_category'] ?? 'provider_exception',
                    'details' => $normalized,
                    'merchant_reference' => $merchantReference,
                ]
            );
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
            $spaceId = (int)$config['space_id'];
            $gatewayBase = $this->resolveGatewayBaseUrl($config['api_base_url'] ?? '');
            $resolvedTransactionId = $transactionId !== '' ? $transactionId : ($providerReference !== '' ? $providerReference : $sessionId);
            $statusPath = '/api/transaction/read?spaceId='.$spaceId.'&id='.urlencode($resolvedTransactionId);
            $response = $this->signedGatewayRequest('GET', $gatewayBase, $statusPath, $config);

            if (!$response->ok()) {
                return $this->businessError('vr_payment_status_lookup_failed', 'Unable to verify VR Payment status.', [
                    'provider_http_status' => $response->status(),
                ]);
            }

            $body = (array)$response->json();
            $normalized = $this->normalizePaymentStatus((string)($body['state'] ?? $body['status'] ?? $body['payment_status'] ?? 'unknown'));
            $resolvedId = (string)($body['id'] ?? $resolvedTransactionId);

            return [
                'success' => true,
                'provider' => 'vr_payment',
                'status' => $normalized,
                'is_paid' => in_array($normalized, ['authorized', 'completed'], true),
                'session_id' => $resolvedId,
                'transaction_id' => $resolvedId,
                'provider_reference' => $resolvedId,
                'raw_status' => $body['state'] ?? $body['status'] ?? $body['payment_status'] ?? null,
            ];
        } catch (\Throwable $e) {
            $normalized = $this->normalizeProviderException($e);
            return $this->businessError('vr_payment_status_lookup_failed', 'Unable to verify VR Payment status.', [
                'error_category' => $normalized['error_category'] ?? 'provider_exception',
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
        $message = (string)$e->getMessage();
        $lowerMessage = strtolower($message);
        $category = 'provider_exception';
        $errorCode = 'vr_payment_checkout_create_failed';
        $error = 'Unable to create VR Payment checkout session.';

        if (str_contains($lowerMessage, 'timed out') || str_contains($lowerMessage, 'timeout')) {
            $category = 'connectivity_timeout';
            $errorCode = 'vr_payment_connectivity_timeout';
            $error = 'Connection to VR Payment timed out.';
        } elseif (str_contains($lowerMessage, 'could not resolve host') || str_contains($lowerMessage, 'name or service not known') || str_contains($lowerMessage, 'getaddrinfo')) {
            $category = 'connectivity_dns';
            $errorCode = 'vr_payment_dns_failure';
            $error = 'Unable to resolve VR Payment host.';
        } elseif (str_contains($lowerMessage, 'connection refused')) {
            $category = 'connectivity_refused';
            $errorCode = 'vr_payment_connection_refused';
            $error = 'Connection to VR Payment was refused.';
        } elseif (str_contains($lowerMessage, 'ssl') || str_contains($lowerMessage, 'tls') || str_contains($lowerMessage, 'certificate')) {
            $category = 'connectivity_tls';
            $errorCode = 'vr_payment_tls_failure';
            $error = 'TLS/SSL handshake with VR Payment failed.';
        }

        return [
            'class' => get_class($e),
            'message' => $message,
            'code' => method_exists($e, 'getCode') ? $e->getCode() : null,
            'error_category' => $category,
            'error_code' => $errorCode,
            'error' => $error,
        ];
    }

    public function probeConnectivity(): array
    {
        $config = $this->getConfig();
        $baseUrl = trim((string)($config['api_base_url'] ?? ''));
        if ($baseUrl === '') {
            return [
                'ok' => false,
                'error_category' => 'configuration',
                'error_code' => 'vr_payment_base_url_missing',
                'error' => 'VR Payment API base URL is missing.',
            ];
        }

        $parts = parse_url($baseUrl);
        $host = (string)($parts['host'] ?? '');
        $scheme = strtolower((string)($parts['scheme'] ?? 'https'));
        $port = (int)($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
        if ($host === '') {
            return [
                'ok' => false,
                'error_category' => 'configuration',
                'error_code' => 'vr_payment_base_url_invalid',
                'error' => 'VR Payment API base URL is invalid.',
                'base_url' => $baseUrl,
            ];
        }

        $resolvedIp = gethostbyname($host);
        if ($resolvedIp === $host) {
            return [
                'ok' => false,
                'error_category' => 'connectivity_dns',
                'error_code' => 'vr_payment_dns_failure',
                'error' => 'Unable to resolve VR Payment host.',
                'host' => $host,
                'port' => $port,
            ];
        }

        $errno = 0;
        $errstr = '';
        $protocol = $scheme === 'https' ? 'ssl' : 'tcp';
        $socket = @stream_socket_client("{$protocol}://{$host}:{$port}", $errno, $errstr, 3);
        if (!$socket) {
            $normalized = $this->normalizeProviderException(new \RuntimeException($errstr !== '' ? $errstr : 'Socket connection failed.'));
            return [
                'ok' => false,
                'error_category' => $normalized['error_category'] ?? 'connectivity',
                'error_code' => $normalized['error_code'] ?? 'vr_payment_connectivity_failed',
                'error' => $normalized['error'] ?? 'Unable to reach VR Payment host.',
                'host' => $host,
                'port' => $port,
                'resolved_ip' => $resolvedIp,
                'socket_errno' => $errno,
                'socket_error' => $errstr,
            ];
        }

        fclose($socket);
        return [
            'ok' => true,
            'host' => $host,
            'port' => $port,
            'resolved_ip' => $resolvedIp,
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

    protected function buildTransactionCreatePayload(string $method, array $payload, string $merchantReference): array
    {
        $amountMajor = (float)($payload['amount'] ?? 0);
        $amountMajor = $amountMajor > 0 ? $amountMajor : 0.01;
        $currency = strtoupper((string)($payload['currency'] ?? 'EUR'));
        $returnUrl = (string)($payload['return_url'] ?? '');
        $cancelUrl = (string)($payload['cancel_url'] ?? $returnUrl);

        $lineItems = [];
        foreach ((array)($payload['items'] ?? []) as $item) {
            if (!is_array($item)) {
                continue;
            }
            $qty = max(1, (int)($item['quantity'] ?? 1));
            $price = (float)($item['price'] ?? 0);
            if ($price <= 0) {
                continue;
            }
            $lineItems[] = [
                'name' => (string)($item['name'] ?? 'Paymydine item'),
                'quantity' => $qty,
                'type' => 'PRODUCT',
                'amountIncludingTax' => round($price * $qty, 2),
                'sku' => (string)($item['id'] ?? ('item-'.(count($lineItems) + 1))),
                'uniqueId' => (string)($item['id'] ?? ('item-'.(count($lineItems) + 1))),
            ];
        }
        if (empty($lineItems)) {
            $lineItems[] = [
                'name' => 'Paymydine order',
                'quantity' => 1,
                'type' => 'PRODUCT',
                'amountIncludingTax' => round($amountMajor, 2),
                'sku' => 'order',
                'uniqueId' => 'order',
            ];
        }

        return [
            'currency' => $currency,
            'lineItems' => $lineItems,
            'autoConfirmationEnabled' => true,
            'merchantReference' => $merchantReference,
            'successUrl' => $returnUrl,
            'failedUrl' => $cancelUrl,
            'language' => (string)($payload['locale'] ?? 'en-US'),
            'customerEmailAddress' => (string)($payload['customer_email'] ?? ''),
            'metaData' => [
                'payment_method' => $method,
                'merchant_reference' => $merchantReference,
            ],
        ];
    }

    protected function resolveGatewayBaseUrl(string $apiBaseUrl): string
    {
        $candidate = rtrim(trim($apiBaseUrl), '/');
        if ($candidate === '') {
            return 'https://gateway.vr-payment.de';
        }

        $parts = parse_url($candidate);
        $host = strtolower((string)($parts['host'] ?? ''));
        if ($host === '' || str_contains($host, 'asia.vrpy.de')) {
            return 'https://gateway.vr-payment.de';
        }

        return ($parts['scheme'] ?? 'https').'://'.$host;
    }

    protected function signedGatewayRequest(string $method, string $baseUrl, string $pathWithQuery, array $config, ?array $body = null)
    {
        $upperMethod = strtoupper($method);
        $timestamp = (string)time();
        $decodedSecret = base64_decode((string)$config['auth_key'], true);
        if ($decodedSecret === false) {
            throw new \RuntimeException('VR Payment auth_key must be Base64-encoded application user key.');
        }

        $signaturePayload = self::MAC_VERSION.'|'.(string)$config['user_id'].'|'.$timestamp.'|'.$upperMethod.'|'.$pathWithQuery;
        $macValue = base64_encode(hash_hmac('sha512', $signaturePayload, $decodedSecret, true));
        $url = rtrim($baseUrl, '/').$pathWithQuery;

        $request = Http::withHeaders([
            'Accept' => 'application/json',
            'X-Mac-Version' => self::MAC_VERSION,
            'X-Mac-Userid' => (string)$config['user_id'],
            'X-Mac-Timestamp' => $timestamp,
            'X-Mac-Value' => $macValue,
        ])->timeout(20);

        if ($upperMethod === 'GET') {
            return $request->get($url);
        }

        return $request->withHeaders([
            'Content-Type' => 'application/json;charset=utf-8',
        ])->send($upperMethod, $url, [
            'json' => $body ?? [],
        ]);
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

    protected function resolveMerchantReference(string $merchantReference, string $method): string
    {
        $trimmed = trim($merchantReference);
        if ($trimmed !== '') {
            return $trimmed;
        }

        return sprintf(
            'PMD-VR-%s-%s-%s',
            strtoupper($method ?: 'METHOD'),
            date('YmdHis'),
            substr(bin2hex(random_bytes(6)), 0, 12)
        );
    }

    protected function normalizeHttpFailure(int $status, string $body): array
    {
        $lower = strtolower($body);
        $payload = [
            'error_category' => 'provider_http',
            'error_code' => 'vr_payment_checkout_create_failed',
            'error' => 'Unable to start VR Payment checkout.',
            'provider_response' => mb_substr($body, 0, 1000),
        ];

        if ($status === 401 || $status === 403) {
            $payload['error_category'] = 'authentication';
            $payload['error_code'] = 'vr_payment_auth_failed';
            $payload['error'] = 'VR Payment credentials were rejected.';
            return $payload;
        }
        if ($status === 400 || $status === 422) {
            $payload['error_category'] = 'validation';
            $payload['error_code'] = 'vr_payment_request_invalid';
            $payload['error'] = 'VR Payment rejected the request payload.';
            if (str_contains($lower, 'method') && str_contains($lower, 'not')) {
                $payload['error_category'] = 'method_unsupported';
                $payload['error_code'] = 'vr_payment_method_unsupported';
                $payload['error'] = 'Selected method is not supported by VR Payment configuration.';
            }
            return $payload;
        }
        if ($status === 404) {
            $payload['error_category'] = 'configuration';
            $payload['error_code'] = 'vr_payment_endpoint_not_found';
            $payload['error'] = 'VR Payment endpoint was not found. Check API base URL.';
            return $payload;
        }
        if ($status >= 500) {
            $payload['error_category'] = 'provider_unavailable';
            $payload['error_code'] = 'vr_payment_provider_unavailable';
            $payload['error'] = 'VR Payment is temporarily unavailable.';
            return $payload;
        }

        return $payload;
    }
}
