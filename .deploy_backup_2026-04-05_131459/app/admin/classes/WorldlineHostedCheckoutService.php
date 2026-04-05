<?php

namespace Admin\Classes;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Worldline\Connect\Sdk\Client;
use Worldline\Connect\Sdk\Communicator;
use Worldline\Connect\Sdk\CommunicatorConfiguration;
use Worldline\Connect\Sdk\V1\Domain\AmountOfMoney;
use Worldline\Connect\Sdk\V1\Domain\CreateHostedCheckoutRequest;
use Worldline\Connect\Sdk\V1\Domain\HostedCheckoutSpecificInput;
use Worldline\Connect\Sdk\V1\Domain\Order;
use Worldline\Connect\Sdk\V1\Domain\Customer;
use Worldline\Connect\Sdk\V1\Domain\Address;
use Worldline\Connect\Sdk\V1\Domain\SessionRequest;

class WorldlineHostedCheckoutService
{
    protected function sanitizeForLogs(array $payload): array
    {
        $sanitized = [];
        foreach ($payload as $key => $value) {
            $k = (string)$key;
            if (is_array($value)) {
                $sanitized[$k] = $this->sanitizeForLogs($value);
                continue;
            }
            if (preg_match('/secret|token|password|api_key|authorization/i', $k)) {
                $sanitized[$k] = is_string($value) && $value !== '' ? '***redacted***' : $value;
                continue;
            }
            $sanitized[$k] = $value;
        }

        return $sanitized;
    }

    protected function normalizeRedirectUrl(?string $candidate): ?string
    {
        $candidate = is_string($candidate) ? trim($candidate) : '';
        if ($candidate === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $candidate)) {
            return $candidate;
        }

        if (str_starts_with($candidate, '//')) {
            return 'https:'.$candidate;
        }

        return 'https://' . ltrim($candidate, '/');
    }

    protected function collectRedirectCandidates($response, array $rawResponse): array
    {
        return array_filter([
            'redirectUrl' => $response->redirectUrl ?? ($rawResponse['redirectUrl'] ?? null),
            'hostedCheckoutUrl' => $response->hostedCheckoutUrl ?? ($rawResponse['hostedCheckoutUrl'] ?? null),
            'partialRedirectUrl' => $response->partialRedirectUrl ?? ($rawResponse['partialRedirectUrl'] ?? null),
        ], fn ($value) => is_string($value) && trim($value) !== '');
    }

    protected function sessionsBaseDir(): string
    {
        $dir = storage_path('app/worldline_checkout_sessions');
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }

    protected function tenantSessionDir(string $host): string
    {
        $safeHost = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $host);
        $dir = $this->sessionsBaseDir() . '/' . $safeHost;
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }

    protected function sessionFile(string $host, string $hostedCheckoutId): string
    {
        return $this->tenantSessionDir($host) . '/' . $hostedCheckoutId . '.json';
    }

    public function saveCheckoutSession(array $data): void
    {
        $host = (string)($data['host'] ?? 'unknown-host');
        $id = (string)($data['hosted_checkout_id'] ?? '');
        if ($id === '') {
            throw new \RuntimeException('Cannot save checkout session without hosted_checkout_id');
        }

        file_put_contents(
            $this->sessionFile($host, $id),
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );
    }

    public function getCheckoutSession(string $host, string $hostedCheckoutId): ?array
    {
        $file = $this->sessionFile($host, $hostedCheckoutId);
        if (!is_file($file)) {
            return null;
        }

        $json = file_get_contents($file);
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }

    protected function centralConnection()
    {
        return DB::connection('mysql');
    }

    protected function resolveTenantFromHost(string $host)
    {
        $central = $this->centralConnection();
        return $central->table('tenants')->where('domain', $host)->first();
    }

    protected function tenantConnectionForHost(string $host)
    {
        $tenant = $this->resolveTenantFromHost($host);

        if (!$tenant || empty($tenant->database)) {
            throw new \RuntimeException("Tenant not found for host: {$host}");
        }

        $base = config('database.connections.mysql');
        $base['database'] = $tenant->database;

        Config::set('database.connections.worldline_runtime', $base);
        DB::purge('worldline_runtime');
        DB::reconnect('worldline_runtime');

        return DB::connection('worldline_runtime');
    }

    public function getConfig(): array
    {
        $host = request()->getHost();
        $conn = $this->tenantConnectionForHost($host);

        $row = $conn->table('pos_configs as pc')
            ->join('pos_devices as pd', 'pd.device_id', '=', 'pc.device_id')
            ->where('pd.code', 'worldline')
            ->select(
                'pc.config_id',
                'pc.url',
                'pc.username',
                'pc.access_token',
                'pc.id_application',
                'pc.password'
            )
            ->orderByDesc('pc.config_id')
            ->first();

        if (!$row) {
            throw new \RuntimeException("Worldline config not found in current tenant DB for host {$host}");
        }

        return [
            'host'            => $host,
            'tenant_database' => $conn->getDatabaseName(),
            'config_id'       => $row->config_id,
            'api_endpoint'    => rtrim((string)$row->url, '/'),
            'api_key_id'      => (string)$row->username,
            'secret_api_key'  => (string)$row->access_token,
            'merchant_id'     => (string)$row->id_application,
            'webhook_secret'  => (string)$row->password,
        ];
    }

    public function getEnvironment(array $cfg): string
    {
        $base = $cfg['api_endpoint'] ?? '';

        if (str_contains($base, 'api.preprod.connect.worldline-solutions.com')) {
            return 'preprod';
        }

        if (str_contains($base, 'api.connect.worldline-solutions.com')) {
            return 'live';
        }

        return 'custom';
    }

    protected function makeMerchantClient(array $cfg)
    {
        $communicatorConfiguration = new CommunicatorConfiguration(
            $cfg['api_key_id'],
            $cfg['secret_api_key'],
            $cfg['api_endpoint'],
            'PayMyDine'
        );

        $communicator = new Communicator($communicatorConfiguration);
        $client = new Client($communicator);

        return $client->v1()->merchant($cfg['merchant_id']);
    }

    public function getConfigForDiagnostics(): array
    {
        $cfg = $this->getConfig();

        return [
            'host' => $cfg['host'],
            'tenant_database' => $cfg['tenant_database'],
            'config_id' => $cfg['config_id'],
            'environment' => $this->getEnvironment($cfg),
            'api_endpoint' => $cfg['api_endpoint'],
            'merchant_id' => $cfg['merchant_id'],
            'merchant_id_length' => strlen((string)$cfg['merchant_id']),
            'api_key_id_prefix' => substr((string)$cfg['api_key_id'], 0, 8),
            'api_key_id_length' => strlen((string)$cfg['api_key_id']),
            'secret_api_key_prefix' => substr((string)$cfg['secret_api_key'], 0, 6),
            'secret_api_key_length' => strlen((string)$cfg['secret_api_key']),
            'webhook_secret_prefix' => substr((string)$cfg['webhook_secret'], 0, 6),
            'webhook_secret_length' => strlen((string)$cfg['webhook_secret']),
            'sdk_mode' => 'connect',
        ];
    }


    public function getHostedCheckoutStatus(string $hostedCheckoutId): array
    {
        $cfg = $this->getConfig();
        $merchantClient = $this->makeMerchantClient($cfg);

        $response = $merchantClient->hostedcheckouts()->get($hostedCheckoutId);

        $status = $response->status ?? null;
        $paymentId = null;
        $paymentStatus = null;

        if (!empty($response->createdPaymentOutput) && !empty($response->createdPaymentOutput->payment)) {
            $paymentId = $response->createdPaymentOutput->payment->id ?? null;
            $paymentStatus = $response->createdPaymentOutput->payment->status ?? null;
        }

        return [
            'host' => $cfg['host'],
            'tenant_database' => $cfg['tenant_database'],
            'config_id' => $cfg['config_id'],
            'merchant_id' => $cfg['merchant_id'],
            'hosted_checkout_id' => $hostedCheckoutId,
            'hosted_checkout_status' => $status,
            'payment_id' => $paymentId,
            'payment_status' => $paymentStatus,
            'raw_response' => json_decode(json_encode($response), true),
        ];
    }


    public function createHostedCheckout(array $payload): array
    {
        $cfg = $this->getConfig();
        $merchantClient = $this->makeMerchantClient($cfg);

        $amountMinor = (int)($payload['amount_minor'] ?? 0);
        $currency = strtoupper((string)($payload['currency'] ?? 'EUR'));
        $returnUrl = (string)($payload['return_url'] ?? url('/order-placed'));
        $locale = (string)($payload['locale'] ?? 'en_GB');
        $countryCode = strtoupper((string)($payload['country_code'] ?? 'DE'));
        $merchantCustomerId = (string)($payload['merchant_customer_id'] ?? ('PMD-' . substr((string) Str::uuid(), 0, 12)));

        if ($amountMinor <= 0) {
            throw new \RuntimeException('amount_minor must be > 0');
        }

        $amount = new AmountOfMoney();
        $amount->amount = $amountMinor;
        $amount->currencyCode = $currency;

        $address = new Address();
        $address->countryCode = $countryCode;

        $customer = new Customer();
        $customer->billingAddress = $address;
        $customer->merchantCustomerId = $merchantCustomerId;

        $order = new Order();
        $order->amountOfMoney = $amount;
        $order->customer = $customer;

        $specific = new HostedCheckoutSpecificInput();
        $specific->returnUrl = $returnUrl;
        $specific->locale = $locale;

        $body = new CreateHostedCheckoutRequest();
        $body->order = $order;
        $body->hostedCheckoutSpecificInput = $specific;

        $requestMeta = [
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'return_url' => $returnUrl,
            'locale' => $locale,
            'country_code' => $countryCode,
            'merchant_customer_id' => $merchantCustomerId,
        ];
        $sdkPayloadDebug = [
            'order' => [
                'amountOfMoney' => [
                    'amount' => $amountMinor,
                    'currencyCode' => $currency,
                ],
                'customer' => [
                    'merchantCustomerId' => $merchantCustomerId,
                    'billingAddress' => [
                        'countryCode' => $countryCode,
                    ],
                ],
            ],
            'hostedCheckoutSpecificInput' => [
                'returnUrl' => $returnUrl,
                'locale' => $locale,
            ],
        ];
        \Log::info('WORLDLINE HOSTED CHECKOUT REQUEST PAYLOAD', [
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
            'request_meta' => $requestMeta,
            'sdk_payload' => $sdkPayloadDebug,
            'field_presence' => [
                'amount_minor' => $amountMinor > 0,
                'currency' => $currency !== '',
                'return_url' => $returnUrl !== '',
                'locale' => $locale !== '',
                'country_code' => $countryCode !== '',
                'merchant_customer_id' => $merchantCustomerId !== '',
            ],
        ]);

        try {
            $response = $merchantClient->hostedcheckouts()->create($body);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE HOSTED CHECKOUT CREATE FAILED', [
                'host' => $cfg['host'] ?? null,
                'tenant_database' => $cfg['tenant_database'] ?? null,
                'config_id' => $cfg['config_id'] ?? null,
                'merchant_id' => $cfg['merchant_id'] ?? null,
                'environment' => $this->getEnvironment($cfg),
                'request_meta' => $requestMeta,
                'exception_class' => get_class($e),
                'message' => $e->getMessage(),
                'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
                'errorId' => method_exists($e, 'getErrorId') ? $e->getErrorId() : null,
                'responseBody' => method_exists($e, 'getResponseBody') ? $e->getResponseBody() : null,
                'origin' => $e->getFile().':'.$e->getLine(),
            ]);
            throw $e;
        }

        $rawResponse = json_decode(json_encode($response), true);
        $rawResponse = is_array($rawResponse) ? $rawResponse : [];

        \Log::info('WORLDLINE HOSTED CHECKOUT RAW RESPONSE', [
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
            'merchant_id' => $cfg['merchant_id'] ?? null,
            'hosted_checkout_id' => $response->hostedCheckoutId ?? ($rawResponse['hostedCheckoutId'] ?? null),
            'raw_response' => $this->sanitizeForLogs($rawResponse),
        ]);

        $redirectCandidates = $this->collectRedirectCandidates($response, $rawResponse);
        \Log::info('WORLDLINE HOSTED CHECKOUT REDIRECT FIELD CANDIDATES', [
            'host' => $cfg['host'] ?? null,
            'hosted_checkout_id' => $response->hostedCheckoutId ?? ($rawResponse['hostedCheckoutId'] ?? null),
            'candidates' => $this->sanitizeForLogs($redirectCandidates),
        ]);

        $redirect = null;
        $redirectSource = null;
        foreach ($redirectCandidates as $source => $candidate) {
            $normalized = $this->normalizeRedirectUrl((string)$candidate);
            if ($normalized !== null) {
                $redirect = $normalized;
                $redirectSource = $source;
                break;
            }
        }
        \Log::info('WORLDLINE HOSTED CHECKOUT FINAL REDIRECT DECISION', [
            'host' => $cfg['host'] ?? null,
            'hosted_checkout_id' => $response->hostedCheckoutId ?? ($rawResponse['hostedCheckoutId'] ?? null),
            'selected_source' => $redirectSource,
            'redirect_url' => $redirect,
        ]);

        $result = [
            'environment' => $this->getEnvironment($cfg),
            'tenant_database' => $cfg['tenant_database'],
            'host' => $cfg['host'],
            'config_id' => $cfg['config_id'],
            'merchant_id' => $cfg['merchant_id'],
            'redirect_url' => $redirect,
            'partial_redirect_url' => $response->partialRedirectUrl ?? ($rawResponse['partialRedirectUrl'] ?? null),
            'hosted_checkout_id' => $response->hostedCheckoutId ?? null,
            'return_mac' => $response->RETURNMAC ?? null,
            'redirect_source' => $redirectSource,
            'redirect_candidates' => $redirectCandidates,
            'raw_response' => $rawResponse,
            'request_meta' => [
                'amount_minor' => $requestMeta['amount_minor'],
                'currency' => $requestMeta['currency'],
                'return_url' => $requestMeta['return_url'],
                'locale' => $requestMeta['locale'],
                'country_code' => $requestMeta['country_code'],
                'merchant_customer_id' => $requestMeta['merchant_customer_id'],
                'trace_id' => (string) Str::uuid(),
            ],
            'created_at_utc' => gmdate('c'),
        ];

        $this->saveCheckoutSession($result);

        return $result;
    }

    public function createInlineClientSession(array $payload = []): array
    {
        $cfg = $this->getConfig();
        $merchantClient = $this->makeMerchantClient($cfg);

        $sessionRequest = new SessionRequest();

        \Log::info('WORLDLINE INLINE CLIENT SESSION REQUEST', [
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
        ]);

        $response = $merchantClient->sessions()->create($sessionRequest);
        $raw = json_decode(json_encode($response), true);
        $raw = is_array($raw) ? $raw : [];

        \Log::info('WORLDLINE INLINE CLIENT SESSION RESPONSE', [
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
            'response' => $this->sanitizeForLogs($raw),
        ]);

        return [
            'clientSessionId' => $response->clientSessionId ?? ($raw['clientSessionId'] ?? null),
            'customerId' => $response->customerId ?? ($raw['customerId'] ?? null),
            'clientApiUrl' => $response->clientApiUrl ?? ($raw['clientApiUrl'] ?? null),
            'assetUrl' => $response->assetUrl ?? ($raw['assetUrl'] ?? null),
            'environment' => $this->getEnvironment($cfg),
        ];
    }

    public function createInlinePayment(array $payload): array
    {
        $cfg = $this->getConfig();
        $merchantClient = $this->makeMerchantClient($cfg);

        $amountMinor = (int)($payload['amount_minor'] ?? 0);
        $currency = strtoupper((string)($payload['currency'] ?? 'EUR'));
        $encryptedCustomerInput = (string)($payload['encryptedCustomerInput'] ?? '');
        $encodedClientMetaInfo = (string)($payload['encodedClientMetaInfo'] ?? '');
        $paymentProductId = (int)($payload['paymentProductId'] ?? 1);

        if ($amountMinor <= 0 || $encryptedCustomerInput === '') {
            throw new \RuntimeException('Inline Worldline payment requires amount_minor > 0 and encryptedCustomerInput');
        }

        $request = new \stdClass();
        $request->order = new \stdClass();
        $request->order->amountOfMoney = new \stdClass();
        $request->order->amountOfMoney->amount = $amountMinor;
        $request->order->amountOfMoney->currencyCode = $currency;
        $request->order->customer = new \stdClass();
        $request->order->customer->merchantCustomerId = (string)($payload['merchantCustomerId'] ?? ('PMD-'.substr((string)Str::uuid(), 0, 12)));
        $request->encryptedCustomerInput = $encryptedCustomerInput;
        $request->cardPaymentMethodSpecificInput = new \stdClass();
        $request->cardPaymentMethodSpecificInput->paymentProductId = $paymentProductId;
        if ($encodedClientMetaInfo !== '') {
            $request->cardPaymentMethodSpecificInput->encodedClientMetaInfo = $encodedClientMetaInfo;
        }

        \Log::info('WORLDLINE INLINE CREATE PAYMENT REQUEST', [
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
            'request' => $this->sanitizeForLogs(json_decode(json_encode($request), true) ?: []),
        ]);

        $response = $merchantClient->payments()->create($request);
        $raw = json_decode(json_encode($response), true);
        $raw = is_array($raw) ? $raw : [];

        \Log::info('WORLDLINE INLINE CREATE PAYMENT RESPONSE', [
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
            'response' => $this->sanitizeForLogs($raw),
        ]);

        $status = $response->payment->status ?? ($raw['payment']['status'] ?? null);
        $id = $response->payment->id ?? ($raw['payment']['id'] ?? null);

        return [
            'payment_id' => $id,
            'status' => $status,
            'raw' => $raw,
        ];
    }

    public function verifyInlinePayment(string $paymentId): array
    {
        $cfg = $this->getConfig();
        $merchantClient = $this->makeMerchantClient($cfg);
        $response = $merchantClient->payments()->get($paymentId);
        $raw = json_decode(json_encode($response), true);
        $raw = is_array($raw) ? $raw : [];
        $status = $response->status ?? ($raw['status'] ?? null);
        $statusStr = strtoupper((string)$status);
        $isPaid = in_array($statusStr, ['9', 'PAID', 'CAPTURED'], true);

        \Log::info('WORLDLINE INLINE VERIFY PAYMENT RESPONSE', [
            'payment_id' => $paymentId,
            'status' => $status,
            'is_paid' => $isPaid,
            'response' => $this->sanitizeForLogs($raw),
        ]);

        return [
            'payment_id' => $paymentId,
            'status' => $status,
            'is_paid' => $isPaid,
            'raw' => $raw,
        ];
    }
}
