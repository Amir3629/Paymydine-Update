<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use Illuminate\Support\Str;
use Worldline\Connect\Sdk\Client;
use Worldline\Connect\Sdk\Communicator;
use Worldline\Connect\Sdk\CommunicatorConfiguration;
use Worldline\Connect\Sdk\V1\Domain\Address;
use Worldline\Connect\Sdk\V1\Domain\AmountOfMoney;
use Worldline\Connect\Sdk\V1\Domain\CreateHostedCheckoutRequest;
use Worldline\Connect\Sdk\V1\Domain\Customer;
use Worldline\Connect\Sdk\V1\Domain\HostedCheckoutSpecificInput;
use Worldline\Connect\Sdk\V1\Domain\Order;
use Worldline\Connect\Sdk\V1\Domain\SessionRequest;
use Worldline\Connect\Sdk\V1\Merchant\Payments\GetPaymentParams;

/**
 * Canonical Worldline GlobalCollect / Connect runtime for PayMyDine.
 *
 * Security invariants:
 * - PayMyDine never receives PAN/CVV for this flow.
 * - Every checkout is provider-hosted (MyCheckout).
 * - Payment products come from the merchant's Worldline configuration for the
 *   exact country/currency instead of a PayMyDine hard-coded catalogue.
 * - A Worldline hosted-checkout id is only trusted when PMD created and stored it.
 * - Paid status is accepted only after server-to-server amount/currency/reference checks.
 */
final class WorldlineConnectRuntimeService
{
    private const SUPPORTED_METHODS = [
        'card',
        'apple_pay',
        'google_pay',
        'wero',
        'paypal',
    ];

    public function config(bool $requireEnabled = true): array
    {
        $query = Payments_model::query()->where('code', 'worldline');
        if ($requireEnabled) {
            $query->where('status', 1);
        }
        $model = $query->first();
        if (!$model) {
            throw new \RuntimeException('Worldline provider is not configured or enabled.');
        }

        $data = method_exists($model, 'getConfigData') ? (array)$model->getConfigData() : (array)$model->data;
        $cfg = [
            'api_endpoint' => rtrim(trim((string)($data['api_endpoint'] ?? '')), '/'),
            'merchant_id' => trim((string)($data['merchant_id'] ?? '')),
            'api_key_id' => trim((string)($data['api_key_id'] ?? '')),
            'secret_api_key' => trim((string)($data['secret_api_key'] ?? '')),
            'webhook_secret' => trim((string)($data['webhook_secret'] ?? '')),
            'hosted_checkout_variant' => trim((string)($data['hosted_checkout_variant'] ?? '')),
            'terminal_id' => trim((string)($data['terminal_id'] ?? '')),
            'terminal_environment' => strtolower(trim((string)($data['terminal_environment'] ?? 'test'))),
            'config_id' => (int)$model->getKey(),
            'host' => request()->getHost(),
        ];

        $missing = [];
        foreach (['api_endpoint', 'merchant_id', 'api_key_id', 'secret_api_key'] as $field) {
            if ($cfg[$field] === '') {
                $missing[] = $field;
            }
        }
        if ($missing) {
            throw new \RuntimeException('Worldline configuration incomplete: '.implode(', ', $missing));
        }

        if ($cfg['hosted_checkout_variant'] !== ''
            && !preg_match('/^[A-Za-z0-9._-]{1,64}$/', $cfg['hosted_checkout_variant'])) {
            throw new \RuntimeException('Worldline MyCheckout variant ID is invalid.');
        }

        return $cfg;
    }

    public function environment(array $cfg): string
    {
        $endpoint = strtolower((string)($cfg['api_endpoint'] ?? ''));
        if (str_contains($endpoint, 'api.preprod.connect.worldline-solutions.com')) {
            return 'preprod';
        }
        if (str_contains($endpoint, 'api.connect.worldline-solutions.com')) {
            return 'live';
        }
        return 'custom';
    }

    public function probeConnectivity(): array
    {
        try {
            $cfg = $this->config(false);
            $response = $this->merchantClient($cfg)->sessions()->create(new SessionRequest());
            $raw = $this->toArray($response);
            $clientSessionId = trim((string)($raw['clientSessionId'] ?? ''));

            return [
                'ok' => $clientSessionId !== '',
                'connected' => $clientSessionId !== '',
                'message' => $clientSessionId !== ''
                    ? 'Worldline Connect authentication successful. No payment was created.'
                    : 'Worldline responded without a client session ID.',
                'environment' => $this->environment($cfg),
            ];
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_RUNTIME_CONNECTIVITY_FAILED', [
                'host' => request()->getHost(),
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return [
                'ok' => false,
                'connected' => false,
                'message' => 'Worldline Connect authentication failed. Check endpoint, Merchant ID, API Key ID and Secret API Key.',
            ];
        }
    }

    public function availablePaymentProducts(
        string $countryCode = 'DE',
        string $currency = 'EUR',
        ?int $amountMinor = null,
        string $locale = 'de_DE'
    ): array {
        $countryCode = strtoupper(trim($countryCode));
        $currency = strtoupper(trim($currency));
        if (!preg_match('/^[A-Z]{2}$/', $countryCode) || !preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('Invalid Worldline product-discovery context.');
        }

        $cfg = $this->config(true);
        $query = null;
        foreach ([
            'Worldline\\Connect\\Sdk\\V1\\Merchant\\Products\\FindProductsParams',
            'Worldline\\Connect\\Sdk\\V1\\Merchant\\Products\\GetProductParams',
        ] as $queryClass) {
            if (class_exists($queryClass)) {
                $query = new $queryClass();
                break;
            }
        }
        if (!$query) {
            throw new \RuntimeException('Installed Worldline Connect SDK cannot discover configured payment products.');
        }

        $query->countryCode = $countryCode;
        $query->currencyCode = $currency;
        if (property_exists($query, 'locale')) {
            $query->locale = trim($locale) ?: 'de_DE';
        }
        if ($amountMinor !== null && $amountMinor > 0 && property_exists($query, 'amount')) {
            $query->amount = $amountMinor;
        }

        try {
            $raw = $this->toArray($this->merchantClient($cfg)->products()->find($query));
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_PRODUCT_DISCOVERY_FAILED', [
                'host' => request()->getHost(),
                'country' => $countryCode,
                'currency' => $currency,
                'amount_minor' => $amountMinor,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Worldline configured payment products could not be retrieved.', 0, $e);
        }

        $result = array_fill_keys(self::SUPPORTED_METHODS, []);
        foreach ((array)($raw['paymentProducts'] ?? []) as $product) {
            if (!is_array($product)) {
                continue;
            }
            $id = isset($product['id']) && is_numeric($product['id']) ? (int)$product['id'] : 0;
            if ($id <= 0) {
                continue;
            }
            $method = $this->classifyProduct($product);
            if ($method !== null && array_key_exists($method, $result)) {
                $result[$method][] = $id;
            }
        }

        foreach ($result as $method => $ids) {
            $result[$method] = array_values(array_unique(array_map('intval', $ids)));
        }

        return $result;
    }

    public function availablePaymentMethods(string $countryCode = 'DE', string $currency = 'EUR'): array
    {
        return array_keys(array_filter(
            $this->availablePaymentProducts($countryCode, $currency),
            static fn (array $ids): bool => count($ids) > 0
        ));
    }

    public function createHostedCheckout(array $payload): array
    {
        $cfg = $this->config(true);
        $method = strtolower(trim((string)($payload['payment_method'] ?? 'card')));
        if (!in_array($method, self::SUPPORTED_METHODS, true)) {
            throw new \InvalidArgumentException('Unsupported Worldline payment method: '.$method);
        }

        $amountMinor = (int)($payload['amount_minor'] ?? 0);
        $currency = strtoupper(trim((string)($payload['currency'] ?? 'EUR')));
        $countryCode = strtoupper(trim((string)($payload['country_code'] ?? 'DE')));
        $locale = trim((string)($payload['locale'] ?? 'de_DE')) ?: 'de_DE';
        $returnUrl = trim((string)($payload['return_url'] ?? ''));
        $orderId = (int)($payload['order_id'] ?? 0);
        $merchantReference = trim((string)($payload['merchant_reference'] ?? ''));
        $principalAmountMinor = (int)($payload['principal_amount_minor'] ?? $amountMinor);
        $tipAmountMinor = max(0, (int)($payload['tip_amount_minor'] ?? 0));
        $variant = trim((string)($payload['variant'] ?? $cfg['hosted_checkout_variant'] ?? ''));

        if ($amountMinor <= 0) {
            throw new \InvalidArgumentException('Worldline amount must be greater than zero.');
        }
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('Worldline currency must be a 3-letter ISO code.');
        }
        if (!preg_match('/^[A-Z]{2}$/', $countryCode)) {
            throw new \InvalidArgumentException('Worldline country must be a 2-letter ISO code.');
        }
        if (!filter_var($returnUrl, FILTER_VALIDATE_URL) || stripos($returnUrl, 'https://') !== 0) {
            throw new \InvalidArgumentException('Worldline return URL must be HTTPS.');
        }
        if ($variant !== '' && !preg_match('/^[A-Za-z0-9._-]{1,64}$/', $variant)) {
            throw new \InvalidArgumentException('Worldline MyCheckout variant ID is invalid.');
        }
        if ($merchantReference === '') {
            $merchantReference = $orderId > 0
                ? 'PMD-ORDER-'.$orderId
                : 'PMD-'.strtoupper(substr(str_replace('-', '', (string)Str::uuid()), 0, 20));
        }
        $merchantReference = substr($merchantReference, 0, 40);

        $available = $this->availablePaymentProducts($countryCode, $currency, $amountMinor, $locale);
        $productIds = array_values(array_unique(array_map('intval', (array)($available[$method] ?? []))));
        if (!$productIds) {
            throw new \RuntimeException(
                'Worldline payment method '.$method.' is not configured for '.$countryCode.'/'.$currency.' on this Merchant ID.'
            );
        }

        $amount = new AmountOfMoney();
        $amount->amount = $amountMinor;
        $amount->currencyCode = $currency;

        $address = new Address();
        $address->countryCode = $countryCode;

        $customer = new Customer();
        $customer->billingAddress = $address;
        $customer->merchantCustomerId = substr('PMD'.($orderId > 0 ? $orderId : preg_replace('/\D/', '', (string)microtime(true))), 0, 20);

        $order = new Order();
        $order->amountOfMoney = $amount;
        $order->customer = $customer;

        $referencesClass = 'Worldline\\Connect\\Sdk\\V1\\Domain\\OrderReferences';
        if (class_exists($referencesClass)) {
            $references = new $referencesClass();
            $references->merchantReference = $merchantReference;
            $order->references = $references;
        }

        $specific = new HostedCheckoutSpecificInput();
        $specific->returnUrl = $returnUrl;
        $specific->locale = $locale;
        $specific->showResultPage = false;
        if ($variant !== '') {
            $specific->variant = $variant;
        }
        $this->applyProductFilter($specific, $productIds);

        $request = new CreateHostedCheckoutRequest();
        $request->order = $order;
        $request->hostedCheckoutSpecificInput = $specific;

        $response = $this->merchantClient($cfg)->hostedcheckouts()->create($request);
        $raw = $this->toArray($response);
        $checkoutId = trim((string)($raw['hostedCheckoutId'] ?? ''));
        $returnMac = trim((string)($raw['RETURNMAC'] ?? ''));
        $redirect = $this->resolveRedirect($raw);
        if ($checkoutId === '' || $redirect === '') {
            throw new \RuntimeException('Worldline did not return a complete hosted checkout response.');
        }

        $session = [
            'host' => request()->getHost(),
            'hosted_checkout_id' => $checkoutId,
            'return_mac' => $returnMac,
            'order_id' => $orderId > 0 ? $orderId : null,
            'merchant_reference' => $merchantReference,
            'payment_method' => $method,
            'payment_product_ids' => $productIds,
            'hosted_checkout_variant' => $variant !== '' ? $variant : null,
            'expected_amount_minor' => $amountMinor,
            'principal_amount_minor' => $principalAmountMinor,
            'tip_amount_minor' => $tipAmountMinor,
            'expected_currency' => $currency,
            'country_code' => $countryCode,
            'created_at_utc' => gmdate('c'),
        ];
        $this->saveSession($session);

        \Log::info('WORLDLINE_HOSTED_CHECKOUT_CREATED', [
            'host' => request()->getHost(),
            'hosted_checkout_id' => $checkoutId,
            'order_id' => $session['order_id'],
            'payment_method' => $method,
            'payment_product_ids' => $productIds,
            'hosted_checkout_variant' => $session['hosted_checkout_variant'],
            'amount_minor' => $amountMinor,
            'currency' => $currency,
        ]);

        return [
            'ok' => true,
            'provider' => 'worldline',
            'environment' => $this->environment($cfg),
            'hosted_checkout_id' => $checkoutId,
            'redirect_url' => $redirect,
            'payment_method' => $method,
            'payment_product_ids' => $productIds,
            'hosted_checkout_variant' => $variant !== '' ? $variant : null,
        ];
    }

    public function verifiedStatus(string $hostedCheckoutId): array
    {
        $hostedCheckoutId = trim($hostedCheckoutId);
        if ($hostedCheckoutId === '' || !preg_match('/^[A-Za-z0-9._:-]{8,160}$/', $hostedCheckoutId)) {
            throw new \InvalidArgumentException('Invalid Worldline hosted checkout ID.');
        }

        $session = $this->loadSession(request()->getHost(), $hostedCheckoutId);
        if (!$session) {
            throw new \RuntimeException('Unknown Worldline checkout for this tenant.');
        }

        $cfg = $this->config(true);
        $merchant = $this->merchantClient($cfg);
        $hosted = $this->toArray($merchant->hostedcheckouts()->get($hostedCheckoutId));
        $created = (array)($hosted['createdPaymentOutput'] ?? []);
        $payment = (array)($created['payment'] ?? []);
        $paymentId = trim((string)($payment['id'] ?? ''));

        if ($paymentId === '') {
            return $this->statusResult($session, null, 'PENDING', null, null, null, false, false, 'Payment has not been created yet.');
        }

        $providerPayment = $this->toArray($merchant->payments()->get($paymentId, new GetPaymentParams()));
        $paymentOutput = (array)($providerPayment['paymentOutput'] ?? []);
        $money = (array)($paymentOutput['amountOfMoney'] ?? []);
        $references = (array)($paymentOutput['references'] ?? []);
        $status = strtoupper(trim((string)($providerPayment['status'] ?? $created['status'] ?? '')));
        $statusOutput = (array)($providerPayment['statusOutput'] ?? []);
        $statusCategory = strtoupper(trim((string)($statusOutput['statusCategory'] ?? '')));
        $actualAmount = isset($money['amount']) && is_numeric($money['amount']) ? (int)$money['amount'] : null;
        $actualCurrency = strtoupper(trim((string)($money['currencyCode'] ?? '')));
        $actualMerchantReference = trim((string)($references['merchantReference'] ?? ''));

        $amountMatches = $actualAmount !== null && $actualAmount === (int)$session['expected_amount_minor'];
        $currencyMatches = $actualCurrency !== '' && hash_equals((string)$session['expected_currency'], $actualCurrency);
        $referenceMatches = $actualMerchantReference === '' || hash_equals((string)$session['merchant_reference'], $actualMerchantReference);
        $verified = $amountMatches && $currencyMatches && $referenceMatches;
        $isAuthorized = filter_var($statusOutput['isAuthorized'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $paymentStatusCategory = strtoupper(trim((string)($providerPayment['paymentStatusCategory'] ?? '')));
        $captureRequestedAccepted = $status === 'CAPTURE_REQUESTED'
            && $isAuthorized
            && ($paymentStatusCategory === '' || $paymentStatusCategory === 'SUCCESSFUL');
        $providerPaid = in_array($status, ['CAPTURED', 'PAID', 'COMPLETED'], true)
            || $statusCategory === 'COMPLETED'
            || $captureRequestedAccepted;
        $paid = $verified && $providerPaid;

        if (!$verified) {
            \Log::error('WORLDLINE_SETTLEMENT_VERIFICATION_FAILED', [
                'host' => request()->getHost(),
                'hosted_checkout_id' => $hostedCheckoutId,
                'payment_id' => $paymentId,
                'order_id' => $session['order_id'] ?? null,
                'amount_matches' => $amountMatches,
                'currency_matches' => $currencyMatches,
                'reference_matches' => $referenceMatches,
            ]);
        }

        return $this->statusResult(
            $session,
            $paymentId,
            $status,
            $actualAmount,
            $actualCurrency,
            $actualMerchantReference,
            $verified,
            $paid,
            $paid ? 'Worldline payment verified.' : ($verified ? 'Worldline payment is not complete yet.' : 'Worldline payment failed PMD settlement verification.')
        );
    }

    public function verifyReturnMac(string $hostedCheckoutId, string $returnMac): bool
    {
        $session = $this->loadSession(request()->getHost(), trim($hostedCheckoutId));
        if (!$session) {
            return false;
        }
        $expected = (string)($session['return_mac'] ?? '');
        return $expected !== '' && $returnMac !== '' && hash_equals($expected, $returnMac);
    }

    private function classifyProduct(array $product): ?string
    {
        $id = isset($product['id']) && is_numeric($product['id']) ? (int)$product['id'] : 0;
        $label = strtolower(trim((string)($product['displayHints']['label'] ?? '')));
        $paymentMethod = strtolower(trim((string)($product['paymentMethod'] ?? '')));
        $group = strtolower(trim((string)($product['paymentProductGroup'] ?? '')));

        if ($id === 302 || str_contains($label, 'apple pay')) {
            return 'apple_pay';
        }
        if ($id === 320 || str_contains($label, 'google pay')) {
            return 'google_pay';
        }
        if ($id === 840 || str_contains($label, 'paypal')) {
            return 'paypal';
        }
        if (str_contains($label, 'wero') || str_contains($paymentMethod, 'wero') || str_contains($group, 'wero')) {
            return 'wero';
        }
        if ($paymentMethod === 'card' || $group === 'card' || $group === 'cards') {
            return 'card';
        }

        return null;
    }

    private function merchantClient(array $cfg)
    {
        $communicatorConfiguration = new CommunicatorConfiguration(
            $cfg['api_key_id'],
            $cfg['secret_api_key'],
            $cfg['api_endpoint'],
            'PayMyDine'
        );
        return (new Client(new Communicator($communicatorConfiguration)))->v1()->merchant($cfg['merchant_id']);
    }

    private function applyProductFilter(HostedCheckoutSpecificInput $specific, array $productIds): void
    {
        $filtersClass = 'Worldline\\Connect\\Sdk\\V1\\Domain\\PaymentProductFiltersHostedCheckout';
        $filterClass = 'Worldline\\Connect\\Sdk\\V1\\Domain\\PaymentProductFilter';
        if (!class_exists($filtersClass) || !class_exists($filterClass)) {
            throw new \RuntimeException('Installed Worldline Connect SDK cannot restrict hosted checkout payment products.');
        }
        $filters = new $filtersClass();
        $restrict = new $filterClass();
        $restrict->products = array_values(array_map('intval', $productIds));
        $filters->restrictTo = $restrict;
        $specific->paymentProductFilters = $filters;
    }

    private function resolveRedirect(array $raw): string
    {
        foreach (['redirectUrl', 'hostedCheckoutUrl', 'partialRedirectUrl'] as $key) {
            $candidate = trim((string)($raw[$key] ?? ''));
            if ($candidate === '') {
                continue;
            }
            if (str_starts_with($candidate, '//')) {
                return 'https:'.$candidate;
            }
            if (preg_match('#^https://#i', $candidate)) {
                return $candidate;
            }
            if ($key === 'partialRedirectUrl') {
                $candidate = ltrim($candidate, '/');
                $host = strtolower((string)parse_url('https://'.$candidate, PHP_URL_HOST));
                if ($host === '' || !str_ends_with($host, '.worldline-solutions.com')) {
                    throw new \RuntimeException('Worldline returned an unexpected hosted checkout domain.');
                }
                if (str_starts_with(strtolower($candidate), 'payment.')) {
                    return 'https://'.$candidate;
                }
                return 'https://payment.'.$candidate;
            }
        }
        return '';
    }

    private function statusResult(array $session, ?string $paymentId, string $status, ?int $actualAmount, ?string $actualCurrency, ?string $actualMerchantReference, bool $verified, bool $paid, string $message): array
    {
        return [
            'success' => true,
            'provider' => 'worldline',
            'hosted_checkout_id' => $session['hosted_checkout_id'],
            'payment_id' => $paymentId,
            'payment_status' => $status,
            'is_paid' => $paid,
            'verification_ok' => $verified,
            'order_id' => $session['order_id'] ?? null,
            'method_code' => $session['payment_method'] ?? null,
            'payment_product_ids' => $session['payment_product_ids'] ?? [],
            'expected_amount_minor' => (int)$session['expected_amount_minor'],
            'principal_amount_minor' => (int)($session['principal_amount_minor'] ?? $session['expected_amount_minor']),
            'tip_amount_minor' => (int)($session['tip_amount_minor'] ?? 0),
            'actual_amount_minor' => $actualAmount,
            'expected_currency' => (string)$session['expected_currency'],
            'actual_currency' => $actualCurrency,
            'merchant_reference' => $actualMerchantReference ?: ($session['merchant_reference'] ?? null),
            'message' => $message,
        ];
    }

    private function sessionsBaseDir(): string
    {
        $dir = storage_path('app/worldline_checkout_sessions_v2');
        if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create Worldline checkout session storage.');
        }
        return $dir;
    }

    private function sessionFile(string $host, string $checkoutId): string
    {
        $host = preg_replace('/[^A-Za-z0-9._-]/', '_', strtolower($host)) ?: 'unknown-host';
        $checkoutId = preg_replace('/[^A-Za-z0-9._:-]/', '_', $checkoutId) ?: 'unknown-checkout';
        $dir = $this->sessionsBaseDir().'/'.$host;
        if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create tenant Worldline session storage.');
        }
        return $dir.'/'.$checkoutId.'.json';
    }

    private function saveSession(array $session): void
    {
        $encoded = json_encode($session, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if (!is_string($encoded)) {
            throw new \RuntimeException('Unable to serialize Worldline checkout session.');
        }
        $file = $this->sessionFile((string)$session['host'], (string)$session['hosted_checkout_id']);
        if (file_put_contents($file, $encoded, LOCK_EX) === false) {
            throw new \RuntimeException('Unable to persist Worldline checkout session.');
        }
        @chmod($file, 0660);
    }

    private function loadSession(string $host, string $checkoutId): ?array
    {
        $file = $this->sessionFile($host, $checkoutId);
        if (!is_file($file)) {
            return null;
        }
        $decoded = json_decode((string)file_get_contents($file), true);
        return is_array($decoded) ? $decoded : null;
    }

    private function toArray($value): array
    {
        $decoded = json_decode(json_encode($value), true);
        return is_array($decoded) ? $decoded : [];
    }
}
