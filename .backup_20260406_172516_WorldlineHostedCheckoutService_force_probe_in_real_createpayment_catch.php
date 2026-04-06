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
            $response = $merchantClient->hostedcheckouts()->create($this->pmdNormalizeCreatePaymentRequest($body));
        } catch (\Throwable $e) {
            try {
                \Log::error('PMD WORLDLINE create-payment exception', [
                    'class' => get_class($e),
                    'message' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'trace_top' => substr($e->getTraceAsString(), 0, 4000),
                    'response_body' => method_exists($e, 'getResponseBody') ? $e->getResponseBody() : null,
                    'errors' => method_exists($e, 'getErrors') ? $e->getErrors() : null,
                ]);
            } catch (\Throwable $logErr) {
                \Log::error('PMD WORLDLINE exception logging failed', [
                    'message' => $logErr->getMessage(),
                ]);
            }
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

        if (!isset($request->order) || !is_object($request->order)) {
            $request->order = (object) [];
        }

        if (!isset($request->order->customer) || !is_object($request->order->customer)) {
            $request->order->customer = (object) [];
        }

        if (!isset($request->order->customer->billingAddress) || !is_object($request->order->customer->billingAddress)) {
            $request->order->customer->billingAddress = (object) [];
        }

        $pmdCountryCode = null;

        if (isset($request->countryCode) && is_string($request->countryCode) && trim($request->countryCode) !== '') {
            $pmdCountryCode = strtoupper(trim($request->countryCode));
        } elseif (isset($request->country) && is_string($request->country) && trim($request->country) !== '') {
            $pmdCountryCode = strtoupper(trim($request->country));
        } elseif (
            isset($request->order->customer->billingAddress->countryCode) &&
            is_string($request->order->customer->billingAddress->countryCode) &&
            trim($request->order->customer->billingAddress->countryCode) !== ''
        ) {
            $pmdCountryCode = strtoupper(trim($request->order->customer->billingAddress->countryCode));
        }

        if (!$pmdCountryCode || strlen($pmdCountryCode) !== 2) {
            $pmdCountryCode = 'AT';
        }

        $request->order->customer->billingAddress->countryCode = $pmdCountryCode;

        if (isset($request->email) && is_string($request->email) && trim($request->email) !== '') {
            if (!isset($request->order->customer->contactDetails) || !is_object($request->order->customer->contactDetails)) {
                $request->order->customer->contactDetails = (object) [];
            }
            if (
                !isset($request->order->customer->contactDetails->emailAddress) ||
                !is_string($request->order->customer->contactDetails->emailAddress) ||
                trim($request->order->customer->contactDetails->emailAddress) === ''
            ) {
                $request->order->customer->contactDetails->emailAddress = trim($request->email);
            }
        }

        if (!isset($request->order) || !is_object($request->order)) {
            $request->order = (object) [];
        }

        if (!isset($request->order->customer) || !is_object($request->order->customer)) {
            $request->order->customer = (object) [];
        }

        if (!isset($request->order->customer->billingAddress) || !is_object($request->order->customer->billingAddress)) {
            $request->order->customer->billingAddress = (object) [];
        }

        if (!isset($request->order->customer->contactDetails) || !is_object($request->order->customer->contactDetails)) {
            $request->order->customer->contactDetails = (object) [];
        }

        if (!isset($request->cardPaymentMethodSpecificInput) || !is_object($request->cardPaymentMethodSpecificInput)) {
            $request->cardPaymentMethodSpecificInput = (object) [];
        }

        $pmdCountryCode = null;

        if (isset($request->countryCode) && is_string($request->countryCode) && trim($request->countryCode) !== '') {
            $pmdCountryCode = strtoupper(trim($request->countryCode));
        } elseif (isset($request->country) && is_string($request->country) && trim($request->country) !== '') {
            $pmdCountryCode = strtoupper(trim($request->country));
        } elseif (
            isset($request->order->customer->billingAddress->countryCode) &&
            is_string($request->order->customer->billingAddress->countryCode) &&
            trim($request->order->customer->billingAddress->countryCode) !== ''
        ) {
            $pmdCountryCode = strtoupper(trim($request->order->customer->billingAddress->countryCode));
        }

        if (!$pmdCountryCode || strlen($pmdCountryCode) !== 2) {
            $pmdCountryCode = 'AT';
        }

        $request->order->customer->billingAddress->countryCode = $pmdCountryCode;

        $pmdFinalEmail = null;

        if (isset($request->email) && is_string($request->email) && trim($request->email) !== '') {
            $pmdFinalEmail = trim($request->email);
        }

        if ((!$pmdFinalEmail || trim($pmdFinalEmail) === '') && isset($pmdRawInputEmail) && is_string($pmdRawInputEmail) && trim($pmdRawInputEmail) !== '') {
            $pmdFinalEmail = trim($pmdRawInputEmail);
            $request->email = $pmdFinalEmail;
        }

        if (
            $pmdFinalEmail &&
            (
                !isset($request->order->customer->contactDetails->emailAddress) ||
                !is_string($request->order->customer->contactDetails->emailAddress) ||
                trim($request->order->customer->contactDetails->emailAddress) === ''
            )
        ) {
            $request->order->customer->contactDetails->emailAddress = $pmdFinalEmail;
        }

        if (
            !isset($request->order->customer->locale) ||
            !is_string($request->order->customer->locale) ||
            trim($request->order->customer->locale) === ''
        ) {
            $request->order->customer->locale = 'de_AT';
        }

        if (
            !isset($request->cardPaymentMethodSpecificInput->paymentProductId) ||
            !$request->cardPaymentMethodSpecificInput->paymentProductId
        ) {
            $request->cardPaymentMethodSpecificInput->paymentProductId = 1;
        }

        if (
            !isset($request->cardPaymentMethodSpecificInput->transactionChannel) ||
            !is_string($request->cardPaymentMethodSpecificInput->transactionChannel) ||
            trim($request->cardPaymentMethodSpecificInput->transactionChannel) === ''
        ) {
            $request->cardPaymentMethodSpecificInput->transactionChannel = 'ECOMMERCE';
        }

        if (
            !isset($request->cardPaymentMethodSpecificInput->returnUrl) ||
            !is_string($request->cardPaymentMethodSpecificInput->returnUrl) ||
            trim($request->cardPaymentMethodSpecificInput->returnUrl) === ''
        ) {
            $pmdHost = $_SERVER['HTTP_HOST'] ?? 'mimoza.paymydine.com';
            $request->cardPaymentMethodSpecificInput->returnUrl = 'https://' . $pmdHost . '/worldline-return';
        }

        $pmdRawInputEmail = $this->pmdGetInputEmailFromGlobals();

        try {
            \Log::info('PMD WORLDLINE RAW INPUT PROBE', [
                'request_email_top_level_before' => isset($request->email) ? $request->email : null,
                'request_customer_email_nested_before' => (
                    isset($request->order) &&
                    is_object($request->order) &&
                    isset($request->order->customer) &&
                    is_object($request->order->customer) &&
                    isset($request->order->customer->contactDetails) &&
                    is_object($request->order->customer->contactDetails) &&
                    isset($request->order->customer->contactDetails->emailAddress)
                ) ? $request->order->customer->contactDetails->emailAddress : null,
                'raw_input_email' => $pmdRawInputEmail,
            ]);
        } catch (\Throwable $e) {
        }

        $pmdFinalEmail = null;

        if (isset($request->email) && is_string($request->email) && trim($request->email) !== '') {
            $pmdFinalEmail = trim($request->email);
        }

        if ((!$pmdFinalEmail || trim($pmdFinalEmail) === '') && isset($pmdRawInputEmail) && is_string($pmdRawInputEmail) && trim($pmdRawInputEmail) !== '') {
            $pmdFinalEmail = trim($pmdRawInputEmail);
            $request->email = $pmdFinalEmail;
        }

        if (
            $pmdFinalEmail &&
            (
                !isset($request->order->customer->contactDetails->emailAddress) ||
                !is_string($request->order->customer->contactDetails->emailAddress) ||
                trim($request->order->customer->contactDetails->emailAddress) === ''
            )
        ) {
            $request->order->customer->contactDetails->emailAddress = $pmdFinalEmail;
        }

        try {
            \Log::info('PMD WORLDLINE EMAIL AFTER INJECT', [
                'pmdFinalEmail' => $pmdFinalEmail,
                'request_email_top_level_after' => isset($request->email) ? $request->email : null,
                'request_customer_email_nested_after' => (
                    isset($request->order) &&
                    is_object($request->order) &&
                    isset($request->order->customer) &&
                    is_object($request->order->customer) &&
                    isset($request->order->customer->contactDetails) &&
                    is_object($request->order->customer->contactDetails) &&
                    isset($request->order->customer->contactDetails->emailAddress)
                ) ? $request->order->customer->contactDetails->emailAddress : null,
            ]);
        } catch (\Throwable $e) {
        }

        
        // ===============================
        // PMD FORCE CARD INPUT (CRITICAL FIX)
        // ===============================
        try {
            if (!isset($request->cardPaymentMethodSpecificInput) || !is_object($request->cardPaymentMethodSpecificInput)) {
                $request->cardPaymentMethodSpecificInput = new \stdClass();
            }

            // ALWAYS force required fields
            $request->cardPaymentMethodSpecificInput->paymentProductId = 1;

            if (!isset($request->cardPaymentMethodSpecificInput->transactionChannel)) {
                $request->cardPaymentMethodSpecificInput->transactionChannel = 'ECOMMERCE';
            }

            if (!isset($request->cardPaymentMethodSpecificInput->returnUrl)) {
                $request->cardPaymentMethodSpecificInput->returnUrl = 'https://mimoza.paymydine.com/worldline-return';
            }

            if (!isset($request->cardPaymentMethodSpecificInput->authorizationMode)) {
                $request->cardPaymentMethodSpecificInput->authorizationMode = 'SALE';
            }

            \Log::info('PMD WORLDLINE CARD INPUT FIX APPLIED', [
                'card_input' => $request->cardPaymentMethodSpecificInput
            ]);

        } catch (\Throwable $e) {
            \Log::error('PMD WORLDLINE CARD INPUT FIX ERROR', [
                'message' => $e->getMessage()
            ]);
        }

        
        // ============================================
        // PMD FORCE WORLLDINE 3DS + DEVICE BLOCK
        // Required to avoid generic incorrect request
        // ============================================
        try {
            $pmdReq = function_exists('request') ? request() : null;

            $pmdHost = null;
            try {
                $pmdHost = $pmdReq ? $pmdReq->getHost() : ($_SERVER['HTTP_HOST'] ?? 'mimoza.paymydine.com');
            } catch (\Throwable $e) {
                $pmdHost = $_SERVER['HTTP_HOST'] ?? 'mimoza.paymydine.com';
            }

            $pmdAcceptHeader = '*/*';
            $pmdUserAgent = 'Mozilla/5.0';
            $pmdIpAddress = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

            try {
                if ($pmdReq) {
                    $tmp = $pmdReq->header('accept');
                    if (is_string($tmp) && trim($tmp) !== '') {
                        $pmdAcceptHeader = trim($tmp);
                    }

                    $tmp = $pmdReq->header('user-agent');
                    if (is_string($tmp) && trim($tmp) !== '') {
                        $pmdUserAgent = trim($tmp);
                    }

                    $tmp = $pmdReq->ip();
                    if (is_string($tmp) && trim($tmp) !== '') {
                        $pmdIpAddress = trim($tmp);
                    }
                }
            } catch (\Throwable $e) {
            }

            if (!isset($request->order) || !is_object($request->order)) {
                $request->order = (object) [];
            }

            if (!isset($request->order->customer) || !is_object($request->order->customer)) {
                $request->order->customer = (object) [];
            }

            if (!isset($request->order->customer->device) || !is_object($request->order->customer->device)) {
                $request->order->customer->device = (object) [];
            }

            if (!isset($request->order->customer->device->browserData) || !is_object($request->order->customer->device->browserData)) {
                $request->order->customer->device->browserData = (object) [];
            }

            if (!isset($request->cardPaymentMethodSpecificInput) || !is_object($request->cardPaymentMethodSpecificInput)) {
                $request->cardPaymentMethodSpecificInput = (object) [];
            }

            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure) || !is_object($request->cardPaymentMethodSpecificInput->threeDSecure)) {
                $request->cardPaymentMethodSpecificInput->threeDSecure = (object) [];
            }

            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData) || !is_object($request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData)) {
                $request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData = (object) [];
            }

            // ---- cardPaymentMethodSpecificInput
            if (!isset($request->cardPaymentMethodSpecificInput->paymentProductId) || !$request->cardPaymentMethodSpecificInput->paymentProductId) {
                $request->cardPaymentMethodSpecificInput->paymentProductId = 1;
            }

            if (!isset($request->cardPaymentMethodSpecificInput->transactionChannel) || !is_string($request->cardPaymentMethodSpecificInput->transactionChannel) || trim($request->cardPaymentMethodSpecificInput->transactionChannel) === '') {
                $request->cardPaymentMethodSpecificInput->transactionChannel = 'ECOMMERCE';
            }

            if (!isset($request->cardPaymentMethodSpecificInput->authorizationMode) || !is_string($request->cardPaymentMethodSpecificInput->authorizationMode) || trim($request->cardPaymentMethodSpecificInput->authorizationMode) === '') {
                $request->cardPaymentMethodSpecificInput->authorizationMode = 'SALE';
            }

            if (!isset($request->cardPaymentMethodSpecificInput->returnUrl) || !is_string($request->cardPaymentMethodSpecificInput->returnUrl) || trim($request->cardPaymentMethodSpecificInput->returnUrl) === '') {
                $request->cardPaymentMethodSpecificInput->returnUrl = 'https://' . $pmdHost . '/worldline-return';
            }

            // ---- 3DS block
            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure->skipAuthentication)) {
                $request->cardPaymentMethodSpecificInput->threeDSecure->skipAuthentication = false;
            }

            if (
                !isset($request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData->returnUrl) ||
                !is_string($request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData->returnUrl) ||
                trim($request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData->returnUrl) === ''
            ) {
                $request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData->returnUrl = 'https://' . $pmdHost . '/worldline-return';
            }

            // ---- customer locale
            if (!isset($request->order->customer->locale) || !is_string($request->order->customer->locale) || trim($request->order->customer->locale) === '') {
                $request->order->customer->locale = 'de_AT';
            }

            // ---- device
            if (!isset($request->order->customer->device->acceptHeader) || !is_string($request->order->customer->device->acceptHeader) || trim($request->order->customer->device->acceptHeader) === '') {
                $request->order->customer->device->acceptHeader = $pmdAcceptHeader;
            }

            if (!isset($request->order->customer->device->userAgent) || !is_string($request->order->customer->device->userAgent) || trim($request->order->customer->device->userAgent) === '') {
                $request->order->customer->device->userAgent = $pmdUserAgent;
            }

            if (!isset($request->order->customer->device->ipAddress) || !is_string($request->order->customer->device->ipAddress) || trim($request->order->customer->device->ipAddress) === '') {
                $request->order->customer->device->ipAddress = $pmdIpAddress;
            }

            if (!isset($request->order->customer->device->timezoneOffsetUtcMinutes)) {
                $request->order->customer->device->timezoneOffsetUtcMinutes = -120;
            }

            // ---- browserData
            if (!isset($request->order->customer->device->browserData->colorDepth)) {
                $request->order->customer->device->browserData->colorDepth = 24;
            }

            if (!isset($request->order->customer->device->browserData->javaEnabled)) {
                $request->order->customer->device->browserData->javaEnabled = false;
            }

            if (!isset($request->order->customer->device->browserData->screenHeight)) {
                $request->order->customer->device->browserData->screenHeight = 1080;
            }

            if (!isset($request->order->customer->device->browserData->screenWidth)) {
                $request->order->customer->device->browserData->screenWidth = 1920;
            }

            \Log::info('PMD WORLDLINE 3DS DEVICE FIX APPLIED', [
                'host' => $pmdHost,
                'acceptHeader' => $request->order->customer->device->acceptHeader ?? null,
                'userAgent' => $request->order->customer->device->userAgent ?? null,
                'ipAddress' => $request->order->customer->device->ipAddress ?? null,
                'timezoneOffsetUtcMinutes' => $request->order->customer->device->timezoneOffsetUtcMinutes ?? null,
                'browserData' => $request->order->customer->device->browserData ?? null,
                'threeDSecure' => $request->cardPaymentMethodSpecificInput->threeDSecure ?? null,
                'cardInput' => $request->cardPaymentMethodSpecificInput ?? null,
            ]);
        } catch (\Throwable $e) {
            \Log::error('PMD WORLDLINE 3DS DEVICE FIX ERROR', [
                'message' => $e->getMessage(),
            ]);
        }


        
        // ============================================
        // PMD FORCE FULL WORLLDINE 3DS REQUEST SHAPE
        // Match official 3DS test-case structure closer
        // ============================================
        try {
            if (!isset($request->order) || !is_object($request->order)) {
                $request->order = (object) [];
            }

            if (!isset($request->order->customer) || !is_object($request->order->customer)) {
                $request->order->customer = (object) [];
            }

            if (!isset($request->order->customer->device) || !is_object($request->order->customer->device)) {
                $request->order->customer->device = (object) [];
            }

            if (!isset($request->order->customer->device->browserData) || !is_object($request->order->customer->device->browserData)) {
                $request->order->customer->device->browserData = (object) [];
            }

            if (!isset($request->order->references) || !is_object($request->order->references)) {
                $request->order->references = (object) [];
            }

            if (!isset($request->cardPaymentMethodSpecificInput) || !is_object($request->cardPaymentMethodSpecificInput)) {
                $request->cardPaymentMethodSpecificInput = (object) [];
            }

            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure) || !is_object($request->cardPaymentMethodSpecificInput->threeDSecure)) {
                $request->cardPaymentMethodSpecificInput->threeDSecure = (object) [];
            }

            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData) || !is_object($request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData)) {
                $request->cardPaymentMethodSpecificInput->threeDSecure->redirectionData = (object) [];
            }

            $pmdMerchantRef = null;
            try {
                $pmdMerchantRef = 'PMD-' . bin2hex(random_bytes(8));
            } catch (\Throwable $e) {
                $pmdMerchantRef = 'PMD-' . substr(md5(uniqid('', true)), 0, 16);
            }

            // ---- customer
            if (!isset($request->order->customer->accountType) || !is_string($request->order->customer->accountType) || trim($request->order->customer->accountType) === '') {
                $request->order->customer->accountType = 'none';
            }

            if (!isset($request->order->customer->locale) || !is_string($request->order->customer->locale) || trim($request->order->customer->locale) === '') {
                $request->order->customer->locale = 'en_US';
            }

            // ---- device locale (official sample has this too)
            if (!isset($request->order->customer->device->locale) || !is_string($request->order->customer->device->locale) || trim($request->order->customer->device->locale) === '') {
                $request->order->customer->device->locale = 'en-US';
            }

            // ---- browserData values as strings like official sample
            if (!isset($request->order->customer->device->browserData->screenHeight) || $request->order->customer->device->browserData->screenHeight === null || $request->order->customer->device->browserData->screenHeight === '') {
                $request->order->customer->device->browserData->screenHeight = '1080';
            } else {
                $request->order->customer->device->browserData->screenHeight = (string) $request->order->customer->device->browserData->screenHeight;
            }

            if (!isset($request->order->customer->device->browserData->screenWidth) || $request->order->customer->device->browserData->screenWidth === null || $request->order->customer->device->browserData->screenWidth === '') {
                $request->order->customer->device->browserData->screenWidth = '1920';
            } else {
                $request->order->customer->device->browserData->screenWidth = (string) $request->order->customer->device->browserData->screenWidth;
            }

            if (!isset($request->order->customer->device->timezoneOffsetUtcMinutes) || $request->order->customer->device->timezoneOffsetUtcMinutes === null || $request->order->customer->device->timezoneOffsetUtcMinutes === '') {
                $request->order->customer->device->timezoneOffsetUtcMinutes = '120';
            } else {
                $request->order->customer->device->timezoneOffsetUtcMinutes = (string) abs((int)$request->order->customer->device->timezoneOffsetUtcMinutes);
            }

            // ---- references
            if (!isset($request->order->references->merchantOrderId) || !$request->order->references->merchantOrderId) {
                $request->order->references->merchantOrderId = (string) time();
            }

            if (!isset($request->order->references->merchantReference) || !is_string($request->order->references->merchantReference) || trim($request->order->references->merchantReference) === '') {
                $request->order->references->merchantReference = $pmdMerchantRef;
            }

            // ---- 3DS exact-ish sample shape
            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure->challengeIndicator) || !is_string($request->cardPaymentMethodSpecificInput->threeDSecure->challengeIndicator) || trim($request->cardPaymentMethodSpecificInput->threeDSecure->challengeIndicator) === '') {
                $request->cardPaymentMethodSpecificInput->threeDSecure->challengeIndicator = 'no-preference';
            }

            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure->challengeCanvasSize) || !is_string($request->cardPaymentMethodSpecificInput->threeDSecure->challengeCanvasSize) || trim($request->cardPaymentMethodSpecificInput->threeDSecure->challengeCanvasSize) === '') {
                $request->cardPaymentMethodSpecificInput->threeDSecure->challengeCanvasSize = '600x400';
            }

            if (!isset($request->cardPaymentMethodSpecificInput->threeDSecure->authenticationFlow) || !is_string($request->cardPaymentMethodSpecificInput->threeDSecure->authenticationFlow) || trim($request->cardPaymentMethodSpecificInput->threeDSecure->authenticationFlow) === '') {
                $request->cardPaymentMethodSpecificInput->threeDSecure->authenticationFlow = 'browser';
            }

            \Log::info('PMD WORLDLINE FULL 3DS SHAPE APPLIED', [
                'accountType' => $request->order->customer->accountType ?? null,
                'customerLocale' => $request->order->customer->locale ?? null,
                'deviceLocale' => $request->order->customer->device->locale ?? null,
                'merchantOrderId' => $request->order->references->merchantOrderId ?? null,
                'merchantReference' => $request->order->references->merchantReference ?? null,
                'timezoneOffsetUtcMinutes' => $request->order->customer->device->timezoneOffsetUtcMinutes ?? null,
                'screenHeight' => $request->order->customer->device->browserData->screenHeight ?? null,
                'screenWidth' => $request->order->customer->device->browserData->screenWidth ?? null,
                'threeDSecure' => $request->cardPaymentMethodSpecificInput->threeDSecure ?? null,
            ]);
        } catch (\Throwable $e) {
            \Log::error('PMD WORLDLINE FULL 3DS SHAPE ERROR', [
                'message' => $e->getMessage(),
            ]);
        }


        $normalizedRequest = $this->pmdNormalizeCreatePaymentRequest($request);

        try {
            \Log::info('PMD WORLDLINE create-payment request snapshot', [
                'request_type' => is_object($request) ? get_class($request) : gettype($request),
                'normalized_type' => is_object($normalizedRequest) ? get_class($normalizedRequest) : gettype($normalizedRequest),
                'request_json' => $this->pmdSafeJson($request),
                'normalized_json' => $this->pmdSafeJson($normalizedRequest),
                'final_email_top_level' => isset($request->email) ? $request->email : null,
                'final_email_nested' => (
                    isset($request->order) &&
                    is_object($request->order) &&
                    isset($request->order->customer) &&
                    is_object($request->order->customer) &&
                    isset($request->order->customer->contactDetails) &&
                    is_object($request->order->customer->contactDetails) &&
                    isset($request->order->customer->contactDetails->emailAddress)
                ) ? $request->order->customer->contactDetails->emailAddress : null,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('PMD WORLDLINE request snapshot failed', [
                'message' => $e->getMessage(),
            ]);
        }

        $response = $merchantClient->payments()->create($normalizedRequest);
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


    /**
     * Normalize stdClass/array payload into the Worldline PHP SDK domain object
     * expected by PaymentsClient::create().
     */
    private function pmdNormalizeCreatePaymentRequest($body): \Worldline\Connect\Sdk\V1\Domain\CreatePaymentRequest
    {
        if (is_array($body)) {
            $body = (object) $body;
        }

        $request = new \Worldline\Connect\Sdk\V1\Domain\CreatePaymentRequest();
        return $request->fromObject($body);
    }

    /**
     * Recursively map stdClass/array payloads to typed Worldline domain objects
     * by inspecting setter parameter types.
     */
    



    private function pmdGetInputEmailFromGlobals()
    {
        try {
            $raw = file_get_contents('php://input');
            if (!$raw || !is_string($raw)) {
                return null;
            }

            $json = json_decode($raw, true);
            if (!is_array($json)) {
                return null;
            }

            $candidates = [
                $json['email'] ?? null,
                $json['customerEmail'] ?? null,
                $json['billingEmail'] ?? null,
                $json['order']['customer']['contactDetails']['emailAddress'] ?? null,
                $json['paymentData']['email'] ?? null,
                $json['payload']['email'] ?? null,
            ];

            foreach ($candidates as $value) {
                if (is_string($value) && trim($value) !== '') {
                    return trim($value);
                }
            }

            return null;
        } catch (\Throwable $e) {
            return null;
        }
    }


    private function pmdSafeJson($value)
    {
        try {
            if (is_object($value) && method_exists($value, 'toObject')) {
                $value = $value->toObject();
            }

            $json = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            if ($json === false) {
                return 'json_encode_failed';
            }

            return $json;
        } catch (\Throwable $e) {
            $pmdErrors = null;
            $pmdErrorsJson = null;
            $pmdResponseBody = null;

            try {
                if (method_exists($e, 'getResponseBody')) {
                    $pmdResponseBody = $e->getResponseBody();
                }
            } catch (\Throwable $inner) {
                $pmdResponseBody = 'GET_RESPONSE_BODY_FAILED: ' . $inner->getMessage();
            }

            try {
                if (method_exists($e, 'getErrors')) {
                    $errs = $e->getErrors();

                    if (is_array($errs)) {
                        $tmp = [];
                        foreach ($errs as $err) {
                            if (is_object($err)) {
                                $tmp[] = get_object_vars($err);
                            } else {
                                $tmp[] = $err;
                            }
                        }
                        $pmdErrors = $tmp;
                    } elseif (is_object($errs)) {
                        $pmdErrors = get_object_vars($errs);
                    } else {
                        $pmdErrors = $errs;
                    }
                }
            } catch (\Throwable $inner) {
                $pmdErrors = [
                    [
                        'code' => 'GET_ERRORS_PARSE_FAILED',
                        'message' => $inner->getMessage(),
                    ]
                ];
            }

            try {
                $pmdErrorsJson = json_encode($pmdErrors, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            } catch (\Throwable $inner) {
                $pmdErrorsJson = 'JSON_ENCODE_FAILED: ' . $inner->getMessage();
            }

            
            // =====================================================
            // PMD PROBE: if direct create-payment fails,
            // try hosted checkout with the exact same normalized request
            // =====================================================
            try {
                $pmdHostedProbeResponse = $merchantClient->hostedcheckouts()->create($normalizedRequest);

                $pmdHostedProbeRaw = null;
                try {
                    if (is_object($pmdHostedProbeResponse) && method_exists($pmdHostedProbeResponse, 'toObject')) {
                        $pmdHostedProbeRaw = json_decode(json_encode($pmdHostedProbeResponse->toObject()), true);
                    } else {
                        $pmdHostedProbeRaw = json_decode(json_encode($pmdHostedProbeResponse), true);
                    }
                } catch (\Throwable $probeRawErr) {
                    $pmdHostedProbeRaw = [
                        'raw_parse_error' => $probeRawErr->getMessage(),
                    ];
                }

                \Log::warning('PMD WORLDLINE HOSTED CHECKOUT PROBE SUCCESS', [
                    'message' => 'Direct payment failed, but hosted checkout create succeeded',
                    'hosted_probe_response' => $this->sanitizeForLogs(is_array($pmdHostedProbeRaw) ? $pmdHostedProbeRaw : []),
                ]);
            } catch (\Throwable $probeEx) {
                $pmdProbeErrors = null;
                try {
                    if (method_exists($probeEx, 'getErrors')) {
                        $tmp = $probeEx->getErrors();
                        $pmdProbeErrors = json_decode(json_encode($tmp), true);
                    }
                } catch (\Throwable $probeErr2) {
                    $pmdProbeErrors = [
                        'parse_error' => $probeErr2->getMessage(),
                    ];
                }

                \Log::warning('PMD WORLDLINE HOSTED CHECKOUT PROBE FAILED', [
                    'message' => $probeEx->getMessage(),
                    'class' => get_class($probeEx),
                    'statusCode' => method_exists($probeEx, 'getStatusCode') ? $probeEx->getStatusCode() : null,
                    'responseBody' => method_exists($probeEx, 'getResponseBody') ? $probeEx->getResponseBody() : null,
                    'errors' => $pmdProbeErrors,
                ]);
            }

\Log::error('WORLDLINE INLINE CREATE PAYMENT ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
                'responseBody' => $pmdResponseBody,
                'errors' => $pmdErrors,
                'errors_json' => $pmdErrorsJson,
                'request_after_defaults' => $this->sanitizeForLogs(json_decode(json_encode($request), true) ?: []),
                'normalized_request' => $this->sanitizeForLogs(json_decode(json_encode($normalizedRequest->toObject()), true) ?: []),
            ]);

            throw $e;
        }
    }

}
