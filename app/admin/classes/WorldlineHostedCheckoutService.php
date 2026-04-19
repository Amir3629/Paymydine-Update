<?php

namespace Admin\Classes;

use Admin\Classes\PaymentLogger;
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
    protected function normalizeMerchantCustomerId(?string $candidate, string $seed): string
    {
        $value = strtoupper(preg_replace('/[^A-Z0-9_\-]/i', '', (string)$candidate) ?? '');
        if ($value === '') {
            $value = 'PMD'.substr(sha1($seed), 0, 12);
        }

        // Keep conservatively short for Worldline constraints.
        if (strlen($value) > 20) {
            $value = substr($value, 0, 20);
        }

        if ($value === '') {
            $value = 'PMD'.substr(sha1('fallback-'.$seed), 0, 12);
        }

        return $value;
    }

    protected function buildHostedCheckoutPaymentProductFilters(int $paymentProductId): ?object
    {
        if ($paymentProductId <= 0) {
            return null;
        }

        $filtersClass = 'Worldline\\Connect\\Sdk\\V1\\Domain\\PaymentProductFiltersHostedCheckout';
        $restrictClass = 'Worldline\\Connect\\Sdk\\V1\\Domain\\PaymentProductFilter';

        if (!class_exists($filtersClass) || !class_exists($restrictClass)) {
            return null;
        }

        try {
            $filters = new $filtersClass();
            $restrict = new $restrictClass();
            $restrict->products = [$paymentProductId];
            $filters->restrictTo = $restrict;
            return $filters;
        } catch (\Throwable $e) {
            PaymentLogger::warning('WORLDLINE PAYMENT PRODUCT FILTER BUILD FAILED', [
                'provider' => 'worldline',
                'payment_method' => 'wero',
                'payment_product_id' => $paymentProductId,
                'filters_class' => $filtersClass,
                'restrict_class' => $restrictClass,
                'error' => $e->getMessage(),
                'error_class' => get_class($e),
            ]);
            return null;
        }
    }

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
            $paymentStatus = $response->createdPaymentOutput->status ?? null;
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
        $requestId = (string) Str::uuid();

        $amountMinor = (int)($payload['amount_minor'] ?? 0);
        $currency = strtoupper((string)($payload['currency'] ?? 'EUR'));
        $returnUrl = (string)($payload['return_url'] ?? url('/order-placed'));
        $cancelUrl = (string)($payload['cancel_url'] ?? $returnUrl);
        $locale = (string)($payload['locale'] ?? 'en_GB');
        $countryCode = strtoupper((string)($payload['country_code'] ?? 'DE'));
        $merchantCustomerId = $this->normalizeMerchantCustomerId(
            (string)($payload['merchant_customer_id'] ?? ''),
            $requestId
        );
        $paymentMethod = strtolower(trim((string)($payload['payment_method'] ?? 'card')));
        $paymentProductId = (int)($payload['payment_product_id'] ?? 0);
        $paymentProductFiltersIncluded = false;

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
        $specific->showResultPage = false;
        if ($paymentProductId > 0) {
            $paymentProductFilters = $this->buildHostedCheckoutPaymentProductFilters($paymentProductId);
            if ($paymentProductFilters !== null) {
                $specific->paymentProductFilters = $paymentProductFilters;
                $paymentProductFiltersIncluded = true;
            }
        }

        $body = new CreateHostedCheckoutRequest();
        $body->order = $order;
        $body->hostedCheckoutSpecificInput = $specific;

        $requestMeta = [
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'return_url' => $returnUrl,
            'cancel_url' => $cancelUrl,
            'locale' => $locale,
            'country_code' => $countryCode,
            'merchant_customer_id' => $merchantCustomerId,
            'merchant_customer_id_length' => strlen($merchantCustomerId),
            'payment_method' => $paymentMethod,
            'payment_product_id' => $paymentProductId,
            'payment_product_filters_included' => $paymentProductFiltersIncluded,
            'payment_product_filters_class' => $paymentProductFiltersIncluded ? get_class($specific->paymentProductFilters) : null,
            'request_id' => $requestId,
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
                'showResultPage' => false,
                'paymentProductFilters' => $paymentProductFiltersIncluded
                    ? ['restrictTo' => ['products' => [$paymentProductId]]]
                    : null,
            ],
        ];
        PaymentLogger::info('WORLDLINE HOSTED CHECKOUT REQUEST PAYLOAD', [
            'provider' => 'worldline',
            'component' => 'WorldlineHostedCheckoutService',
            'payment_method' => $paymentMethod,
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'merchant_id' => $cfg['merchant_id'] ?? null,
            'api_endpoint' => $cfg['api_endpoint'] ?? null,
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
            $responseBody = method_exists($e, 'getResponseBody') ? (string)$e->getResponseBody() : '';
            $errorLower = strtolower((string)$e->getMessage().' '.$responseBody);
            $providerValidationFailure = str_contains($errorLower, 'validation')
                || str_contains($errorLower, 'invalid')
                || str_contains($errorLower, 'unprocessable');
            PaymentLogger::exception('WORLDLINE HOSTED CHECKOUT CREATE FAILED', $e, [
                'provider' => 'worldline',
                'component' => 'WorldlineHostedCheckoutService',
                'payment_method' => $paymentMethod,
                'host' => $cfg['host'] ?? null,
                'tenant_database' => $cfg['tenant_database'] ?? null,
                'config_id' => $cfg['config_id'] ?? null,
                'merchant_id' => $cfg['merchant_id'] ?? null,
                'environment' => $this->getEnvironment($cfg),
                'request_meta' => $requestMeta,
                'responseBody' => $responseBody !== '' ? mb_substr($responseBody, 0, 2000) : null,
                'provider_validation_failure' => $providerValidationFailure,
                'origin' => $e->getFile().':'.$e->getLine(),
                'request_id' => $requestId,
            ]);
            throw $e;
        }

        $rawResponse = json_decode(json_encode($response), true);
        $rawResponse = is_array($rawResponse) ? $rawResponse : [];

        PaymentLogger::info('WORLDLINE HOSTED CHECKOUT RAW RESPONSE', [
            'provider' => 'worldline',
            'component' => 'WorldlineHostedCheckoutService',
            'payment_method' => $paymentMethod,
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
            'merchant_id' => $cfg['merchant_id'] ?? null,
            'hosted_checkout_id' => $response->hostedCheckoutId ?? ($rawResponse['hostedCheckoutId'] ?? null),
            'raw_response' => $this->sanitizeForLogs($rawResponse),
        ]);

        $redirectCandidates = $this->collectRedirectCandidates($response, $rawResponse);
        PaymentLogger::info('WORLDLINE HOSTED CHECKOUT REDIRECT FIELD CANDIDATES', [
            'provider' => 'worldline',
            'component' => 'WorldlineHostedCheckoutService',
            'payment_method' => $paymentMethod,
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
        PaymentLogger::info('WORLDLINE HOSTED CHECKOUT FINAL REDIRECT DECISION', [
            'provider' => 'worldline',
            'component' => 'WorldlineHostedCheckoutService',
            'payment_method' => $paymentMethod,
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
                'trace_id' => $requestId,
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
                'request_email_top_level' => isset($request->email) ? $request->email : null,
                'request_customer_email_nested' => (
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

        
        
        // ==========================================
        // PMD CLEAN EMAIL + 3DS V2 SHAPE
        // Use NEW 3DS structure only
        
        // ==========================================
        // PMD PURE ENCRYPTED FLOW
        // Client Encryption only
        // Mode A: no cardPaymentMethodSpecificInput
        // Mode B: redirectPaymentMethodSpecificInput only
        
        // ==========================================
        // PMD PURE ENCRYPTED FLOW
        // Client Encryption only
        // Mode A: no cardPaymentMethodSpecificInput
        // Mode B: redirectPaymentMethodSpecificInput only
        // ==========================================
        try {
            $pmdRawInput = null;
            try {
                $pmdRawInput = function_exists('request') ? request()->all() : [];
            } catch (\Throwable $ignored) {
                $pmdRawInput = [];
            }

            $pmdEmail = null;
            if (is_array($pmdRawInput)) {
                if (!empty($pmdRawInput['email']) && is_string($pmdRawInput['email'])) {
                    $pmdEmail = trim($pmdRawInput['email']);
                } elseif (!empty($pmdRawInput['customerEmail']) && is_string($pmdRawInput['customerEmail'])) {
                    $pmdEmail = trim($pmdRawInput['customerEmail']);
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

            // required basic field per official client-encryption minimum payload
            if (
                !isset($request->order->customer->billingAddress->countryCode) ||
                !is_string($request->order->customer->billingAddress->countryCode) ||
                trim($request->order->customer->billingAddress->countryCode) === ''
            ) {
                $request->order->customer->billingAddress->countryCode = 'AT';
            }

            if ($pmdEmail && filter_var($pmdEmail, FILTER_VALIDATE_EMAIL)) {
                $request->email = $pmdEmail;
                $request->order->customer->contactDetails->emailAddress = $pmdEmail;
            }

            // IMPORTANT: remove cardPaymentMethodSpecificInput entirely in encrypted flow test
            if (isset($request->cardPaymentMethodSpecificInput)) {
                unset($request->cardPaymentMethodSpecificInput);
            }

            // Toggle this to true if you want redirect-mode test
            $pmdUseRedirectSpecificInput = true;

            if ($pmdUseRedirectSpecificInput) {
                if (!isset($request->redirectPaymentMethodSpecificInput) || !is_object($request->redirectPaymentMethodSpecificInput)) {
                    $request->redirectPaymentMethodSpecificInput = (object) [];
                }
                $request->redirectPaymentMethodSpecificInput->returnUrl = 'https://mimoza.paymydine.com/worldline-return';
            } else {
                if (isset($request->redirectPaymentMethodSpecificInput)) {
                    unset($request->redirectPaymentMethodSpecificInput);
                }
            }

            \Log::info('PMD WORLDLINE PURE ENCRYPTED FLOW APPLIED', [
                'mode' => $pmdUseRedirectSpecificInput ? 'B_redirectPaymentMethodSpecificInput' : 'A_minimal_only',
                'email' => $request->order->customer->contactDetails->emailAddress ?? null,
                'countryCode' => $request->order->customer->billingAddress->countryCode ?? null,
                'has_cardPaymentMethodSpecificInput' => isset($request->cardPaymentMethodSpecificInput),
                'has_redirectPaymentMethodSpecificInput' => isset($request->redirectPaymentMethodSpecificInput),
            ]);

        } catch (\Throwable $e) {
            \Log::error('PMD WORLDLINE PURE ENCRYPTED FLOW PATCH ERROR', [
                'message' => $e->getMessage(),
            ]);
        }


        
        // ==========================================
        // PMD HARD REMOVE CARD INPUT BEFORE NORMALIZE
        // encryptedCustomerInput flow only
        
        // ==========================================
        // PMD EMAIL ONLY SAFE BLOCK
        // no forced 3DS
        // no forced redirect object
        // no null cardPaymentMethodSpecificInput
        
        // ==========================================
        // PMD TRUE MINIMAL ENCRYPTED CARD
        // encryptedCustomerInput + order only
        // no redirectPaymentMethodSpecificInput
        // no cardPaymentMethodSpecificInput
        // no forced 3DS
        // ==========================================
        try {
            $pmdRawInput = [];
            try {
                $pmdRawInput = function_exists('request') ? (request()->all() ?: []) : [];
            } catch (\Throwable $ignored) {
                $pmdRawInput = [];
            }

            $pmdEmail = null;
            if (is_array($pmdRawInput)) {
                if (!empty($pmdRawInput['email']) && is_string($pmdRawInput['email'])) {
                    $pmdEmail = trim($pmdRawInput['email']);
                } elseif (!empty($pmdRawInput['customerEmail']) && is_string($pmdRawInput['customerEmail'])) {
                    $pmdEmail = trim($pmdRawInput['customerEmail']);
                }
            }

            if (!isset($request->order) || !is_object($request->order)) {
                $request->order = (object) [];
            }
            if (!isset($request->order->customer) || !is_object($request->order->customer)) {
                $request->order->customer = (object) [];
            }
            if (!isset($request->order->customer->contactDetails) || !is_object($request->order->customer->contactDetails)) {
                $request->order->customer->contactDetails = (object) [];
            }
            if (!isset($request->order->customer->billingAddress) || !is_object($request->order->customer->billingAddress)) {
                $request->order->customer->billingAddress = (object) [];
            }

            if ($pmdEmail && filter_var($pmdEmail, FILTER_VALIDATE_EMAIL)) {
                $request->email = $pmdEmail;
                $request->order->customer->contactDetails->emailAddress = $pmdEmail;
            }

            if (!isset($request->order->customer->billingAddress->countryCode) || !$request->order->customer->billingAddress->countryCode) {
                $request->order->customer->billingAddress->countryCode = 'AT';
            }

            if (!isset($request->order->customer->locale) || !$request->order->customer->locale) {
                $request->order->customer->locale = 'de_AT';
            }

            // مهم: برای تست مینیمال، هر دو را کامل حذف کن
            if (isset($request->cardPaymentMethodSpecificInput)) {
                unset($request->cardPaymentMethodSpecificInput);
            }
            if (isset($request->redirectPaymentMethodSpecificInput)) {
                unset($request->redirectPaymentMethodSpecificInput);
            }

            \Log::info('PMD WORLDLINE TRUE MINIMAL ENCRYPTED CARD APPLIED', [
                'final_email_top_level' => $request->email ?? null,
                'final_email_nested' => $request->order->customer->contactDetails->emailAddress ?? null,
                'has_cardPaymentMethodSpecificInput' => isset($request->cardPaymentMethodSpecificInput),
                'has_redirectPaymentMethodSpecificInput' => isset($request->redirectPaymentMethodSpecificInput),
                'request_preview' => [
                    'has_order' => isset($request->order),
                    'has_encryptedCustomerInput' => !empty($request->encryptedCustomerInput ?? null),
                ],
            ]);
        } catch (\Throwable $e) {
            \Log::warning('PMD WORLDLINE TRUE MINIMAL ENCRYPTED CARD FAILED', [
                'message' => $e->getMessage(),
            ]);
        }


        // PMD FIX merchantCustomerId length <= 15
        try {
            if (!isset($request->order) || !is_object($request->order)) {
                $request->order = (object) [];
            }
            if (!isset($request->order->customer) || !is_object($request->order->customer)) {
                $request->order->customer = (object) [];
            }

            $pmdRawInput = [];
            try {
                $pmdRawInput = function_exists('request') ? (request()->all() ?: []) : [];
            } catch (\Throwable $ignored) {
                $pmdRawInput = [];
            }

            $pmdMerchantCustomerId = null;

            if (
                isset($request->order->customer->merchantCustomerId) &&
                is_string($request->order->customer->merchantCustomerId)
            ) {
                $pmdMerchantCustomerId = trim($request->order->customer->merchantCustomerId);
            }

            if (
                !$pmdMerchantCustomerId &&
                is_array($pmdRawInput) &&
                !empty($pmdRawInput['merchantCustomerId']) &&
                is_string($pmdRawInput['merchantCustomerId'])
            ) {
                $pmdMerchantCustomerId = trim($pmdRawInput['merchantCustomerId']);
            }

            $pmdMerchantCustomerId = preg_replace('/[^A-Za-z0-9]/', '', (string) $pmdMerchantCustomerId);

            if (!$pmdMerchantCustomerId) {
                // PMD + 12 hex = 15 chars exactly
                $pmdMerchantCustomerId = 'PMD' . substr(md5((string) microtime(true)), 0, 12);
            }

            if (strlen($pmdMerchantCustomerId) > 15) {
                $pmdMerchantCustomerId = substr($pmdMerchantCustomerId, 0, 15);
            }

            $request->order->customer->merchantCustomerId = $pmdMerchantCustomerId;

            if (
                is_array($pmdRawInput) &&
                !empty($pmdRawInput['email']) &&
                is_string($pmdRawInput['email'])
            ) {
                if (
                    !isset($request->order->customer->contactDetails) ||
                    !is_object($request->order->customer->contactDetails)
                ) {
                    $request->order->customer->contactDetails = (object) [];
                }
                $request->order->customer->contactDetails->emailAddress = trim($pmdRawInput['email']);
            }

            \Log::info('PMD FIXED merchantCustomerId', [
                'merchantCustomerId' => $request->order->customer->merchantCustomerId,
                'length' => strlen((string) $request->order->customer->merchantCustomerId),
                'email' => $request->order->customer->contactDetails->emailAddress ?? null,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('PMD FIX merchantCustomerId failed', [
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
            \Log::info('PMD WORLDLINE CREATE PAYMENT SUCCESS', [
                'payment_id' => $response->payment->id ?? $response->id ?? null,
                'status' => $response->status ?? $response->status ?? null,
                'is_final' => $response->statusOutput->isFinal ?? $response->statusOutput->isFinal ?? null,
                'merchant_action_type' => $response->merchantAction->actionType ?? null,
                'redirect_url' => $response->merchantAction->redirectData->redirectURL ?? $response->merchantAction->redirectData->redirectUrl ?? null,
                'form_method' => $response->merchantAction->redirectData->method ?? null,
                'complete_response_json' => json_decode(json_encode($response), true),
            ]);


        $raw = json_decode(json_encode($response), true);
        $raw = is_array($raw) ? $raw : [];

        \Log::info('WORLDLINE INLINE CREATE PAYMENT RESPONSE', [
            'host' => $cfg['host'] ?? null,
            'tenant_database' => $cfg['tenant_database'] ?? null,
            'config_id' => $cfg['config_id'] ?? null,
            'environment' => $this->getEnvironment($cfg),
            'response' => $this->sanitizeForLogs($raw),
        ]);

        $status = $response->status ?? ($raw['payment']['status'] ?? null);
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
        $response = $merchantClient->payments()->get($paymentId, new \Worldline\Connect\Sdk\V1\Merchant\Payments\GetPaymentParams());
        error_log("VERIFY STATUS CODE: " . json_encode($response->statusOutput ?? null));

        $statusOutput = $response->statusOutput ?? ($response->payment->statusOutput ?? null);
        $statusCode = isset($statusOutput->statusCode) ? (int)$statusOutput->statusCode : null;
        $isAuthorized = isset($statusOutput->isAuthorized)
            ? filter_var($statusOutput->isAuthorized, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
            : null;
        $isAuthorizedSuccess = ($statusCode === 600 && $isAuthorized === true);

        \Log::info('PMD WORLDLINE VERIFY RESPONSE DUMP', [
            'payment_id' => $paymentId ?? null,
            'response_json' => json_decode(json_encode($response), true),
            'top_status' => $response->status ?? $response->status ?? null,
            'status_category' => $statusOutput->statusCategory ?? null,
            'status_code' => $statusCode,
            'is_final' => $statusOutput->isFinal ?? null,
            'is_authorized' => $isAuthorized,
            'is_authorized_success' => $isAuthorizedSuccess,
        ]);

        $raw = json_decode(json_encode($response), true);
        $raw = is_array($raw) ? $raw : [];
        $status = $response->status ?? ($raw['status'] ?? null);
        $statusStr = strtoupper((string)$status);
        $isPaid = $isAuthorizedSuccess || in_array($statusStr, ['9', 'PAID', 'CAPTURED'], true);

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

    private function pmdNormalizeCreateHostedCheckoutRequest($body): \Worldline\Connect\Sdk\V1\Domain\CreateHostedCheckoutRequest
    {
        if (is_array($body)) {
            $body = (object) $body;
        }

        $request = new \Worldline\Connect\Sdk\V1\Domain\CreateHostedCheckoutRequest();
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
            $pmdStatusCode = null;
            $pmdResponseBody = null;
            $pmdErrors = null;
            $pmdCode = null;

            try {
                $pmdCode = $e->getCode();
            } catch (\Throwable $ignored) {
            }

            try {
                if (method_exists($e, 'getStatusCode')) {
                    $pmdStatusCode = $e->getStatusCode();
                }
            } catch (\Throwable $ignored) {
            }

            try {
                if (method_exists($e, 'getResponseBody')) {
                    $pmdResponseBody = $e->getResponseBody();
                }
            } catch (\Throwable $ignored) {
            }

            try {
                if (method_exists($e, 'getErrors')) {
                    $pmdErrors = $e->getErrors();
                }
            } catch (\Throwable $ignored) {
            }

            
        if ($e instanceof \Worldline\Connect\Sdk\V1\DeclinedPaymentException) {
            $pmdDeclinedBody = null;
            $pmdDeclinedErrors = null;
            $pmdDeclinedPayment = null;
            $pmdDeclinedStatus = null;

            try {
                if (method_exists($e, 'getResponseBody')) {
                    $pmdDeclinedBody = $e->getResponseBody();
                }
            } catch (\Throwable $ignored) {}

            try {
                if (method_exists($e, 'getErrors')) {
                    $pmdDeclinedErrors = $e->getErrors();
                }
            } catch (\Throwable $ignored) {}

            try {
                if (method_exists($e, 'getPaymentResult')) {
                    $pmdDeclinedPayment = $e->getPaymentResult();
                } elseif (method_exists($e, 'getCreatePaymentResult')) {
                    $pmdDeclinedPayment = $e->getCreatePaymentResult();
                }
            } catch (\Throwable $ignored) {}

            try {
                $pmdDeclinedStatus = $pmdDeclinedPayment->status
                    ?? $pmdDeclinedPayment->status
                    ?? null;
            } catch (\Throwable $ignored) {}

            \Log::error('PMD WORLDLINE DECLINED DETAIL', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
                'responseBody' => $pmdDeclinedBody,
                'errors' => $pmdDeclinedErrors,
                'declined_status' => $pmdDeclinedStatus,
                'payment_result_json' => json_decode(json_encode($pmdDeclinedPayment), true),
            ]);
        }


        try {
            if ($e instanceof \Throwable) {
                $pmdMethods = get_class_methods($e);
                $pmdMethodResults = [];

                foreach ([
                    'getResponseBody',
                    'getErrors',
                    'getPaymentResult',
                    'getCreatePaymentResult',
                    'getStatusCode',
                    'getErrorId',
                    'getPayment',
                    'getResponse'
                ] as $m) {
                    try {
                        if (method_exists($e, $m)) {
                            $pmdMethodResults[$m] = json_decode(json_encode($e->$m()), true);
                        } else {
                            $pmdMethodResults[$m] = '__METHOD_NOT_FOUND__';
                        }
                    } catch (\Throwable $inner) {
                        $pmdMethodResults[$m] = '__THREW__: ' . $inner->getMessage();
                    }
                }

                \Log::error('PMD WORLDLINE EXCEPTION METHOD DUMP', [
                    'exception_class' => get_class($e),
                    'message' => $e->getMessage(),
                    'methods' => $pmdMethods,
                    'selected_method_results' => $pmdMethodResults,
                ]);
            }
        } catch (\Throwable $dumpIgnored) {
            \Log::error('PMD WORLDLINE EXCEPTION METHOD DUMP FAILED', [
                'message' => $dumpIgnored->getMessage(),
            ]);
        }

\Log::error('WORLDLINE INLINE CREATE PAYMENT ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'code' => $pmdCode,
                'statusCode' => $pmdStatusCode,
                'responseBody' => $pmdResponseBody,
                'errors' => $this->sanitizeForLogs($pmdErrors),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            throw $e;
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
