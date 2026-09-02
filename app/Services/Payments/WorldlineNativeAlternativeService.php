<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use Worldline\Connect\Sdk\CallContext;
use Worldline\Connect\Sdk\Client;
use Worldline\Connect\Sdk\Communicator;
use Worldline\Connect\Sdk\CommunicatorConfiguration;
use Worldline\Connect\Sdk\V1\Domain\Address;
use Worldline\Connect\Sdk\V1\Domain\AmountOfMoney;
use Worldline\Connect\Sdk\V1\Domain\CreatePaymentRequest;
use Worldline\Connect\Sdk\V1\Domain\Customer;
use Worldline\Connect\Sdk\V1\Domain\GPayThreeDSecure;
use Worldline\Connect\Sdk\V1\Domain\MobilePaymentMethodSpecificInput;
use Worldline\Connect\Sdk\V1\Domain\MobilePaymentProduct320SpecificInput;
use Worldline\Connect\Sdk\V1\Domain\Order;
use Worldline\Connect\Sdk\V1\Domain\OrderReferences;
use Worldline\Connect\Sdk\V1\Domain\RedirectionData;
use Worldline\Connect\Sdk\V1\Domain\RedirectPaymentMethodSpecificInput;
use Worldline\Connect\Sdk\V1\Domain\SessionRequest;
use Worldline\Connect\Sdk\V1\Merchant\Payments\GetPaymentParams;

/**
 * Own-checkout Worldline runtime for browser wallets and redirect products.
 *
 * Apple Pay / Google Pay:
 * - PMD renders the wallet button inside its own checkout.
 * - The official Worldline Client SDK + wallet API obtains the wallet token.
 * - PMD receives only encryptedCustomerInput, never PAN/CVV.
 *
 * PayPal / Wero:
 * - PMD renders the final action button.
 * - POST /payments creates the redirect payment directly, avoiding MyCheckout.
 * - Provider/bank authorization remains provider-controlled by design.
 */
final class WorldlineNativeAlternativeService
{
    private const STATUS_TTL_SECONDS = 7200;
    private const INITIAL_SUBMIT_TTL_SECONDS = 1800;
    private const WALLET_PRODUCTS = [
        'apple_pay' => 302,
        'google_pay' => 320,
    ];
    private const REDIRECT_PRODUCTS = [
        'paypal' => 840,
        'wero' => 809,
    ];

    public function createWalletSession(string $method, array $context): array
    {
        $method = $this->normalizeMethod($method);
        $productId = self::WALLET_PRODUCTS[$method] ?? 0;
        if ($productId <= 0) {
            throw new \InvalidArgumentException('Unsupported Worldline native wallet method.');
        }

        $session = $this->baseSession($method, $productId, $context);
        $runtime = app(WorldlineConnectRuntimeService::class);
        $cfg = $runtime->config(true);
        $available = $runtime->availablePaymentProducts(
            (string)$session['country_code'],
            (string)$session['expected_currency'],
            (int)$session['expected_amount_minor'],
            (string)$session['locale']
        );
        $availableIds = array_values(array_map('intval', (array)($available[$method] ?? [])));
        if (!in_array($productId, $availableIds, true)) {
            throw new \RuntimeException('Worldline '.$method.' product '.$productId.' is not available for this merchant and transaction.');
        }

        $response = $this->merchantClient($cfg)->sessions()->create(new SessionRequest());
        $raw = $this->toArray($response);
        foreach (['clientSessionId', 'customerId', 'clientApiUrl', 'assetUrl'] as $field) {
            if (trim((string)($raw[$field] ?? '')) === '') {
                throw new \RuntimeException('Worldline did not return a complete browser Client SDK session.');
            }
        }
        if (!$this->isHttpsUrl((string)$raw['clientApiUrl']) || !$this->isHttpsUrl((string)$raw['assetUrl'])) {
            throw new \RuntimeException('Worldline returned an insecure browser Client SDK endpoint.');
        }

        $providerData = $this->providerData();
        $merchantName = trim((string)(
            $providerData[$method.'_merchant_name']
            ?? $providerData['wallet_merchant_name']
            ?? $providerData['merchant_name']
            ?? 'PayMyDine'
        ));
        if ($merchantName === '') {
            $merchantName = 'PayMyDine';
        }

        $googleMerchantId = '';
        if ($method === 'google_pay') {
            $googleMerchantId = trim((string)(
                $providerData['google_pay_merchant_id']
                ?? $providerData['google_merchant_id']
                ?? env('WORLDLINE_GOOGLE_PAY_MERCHANT_ID', '')
            ));
            if ($googleMerchantId === '') {
                throw new \RuntimeException('Google Pay own-checkout requires the Google Merchant ID from Google Pay Business Console. Store it as google_pay_merchant_id in the Worldline provider configuration.');
            }
        }

        $session['created_at_utc'] = gmdate('c');
        $this->saveSession($session);

        \Log::info('WORLDLINE_NATIVE_WALLET_SESSION_CREATED', [
            'host' => request()->getHost(),
            'session_id' => $session['session_id'],
            'order_id' => $session['order_id'],
            'method' => $method,
            'payment_product_id' => $productId,
            'amount_minor' => $session['expected_amount_minor'],
            'currency' => $session['expected_currency'],
        ]);

        return [
            'success' => true,
            'provider' => 'worldline',
            'flow' => 'native_wallet',
            'method_code' => $method,
            'session_id' => $session['session_id'],
            'order_id' => $session['order_id'],
            'payment_product_id' => $productId,
            'client_session' => [
                'clientSessionId' => (string)$raw['clientSessionId'],
                'customerId' => (string)$raw['customerId'],
                'clientApiUrl' => (string)$raw['clientApiUrl'],
                'assetUrl' => (string)$raw['assetUrl'],
            ],
            'payment_details' => [
                'totalAmount' => (int)$session['expected_amount_minor'],
                'countryCode' => (string)$session['country_code'],
                'locale' => (string)$session['locale'],
                'currency' => (string)$session['expected_currency'],
                'isRecurring' => false,
            ],
            'wallet_configuration' => [
                'merchant_name' => $merchantName,
                'google_merchant_id' => $googleMerchantId !== '' ? $googleMerchantId : null,
                'gateway_merchant_id' => (string)$cfg['merchant_id'],
                'environment' => $runtime->environment($cfg) === 'live' ? 'PROD' : 'TEST',
            ],
            'principal_amount_minor' => (int)$session['principal_amount_minor'],
            'tip_amount_minor' => (int)$session['tip_amount_minor'],
            'amount_minor' => (int)$session['expected_amount_minor'],
            'currency' => (string)$session['expected_currency'],
        ];
    }

    public function submitEncryptedWallet(string $sessionId, string $encryptedCustomerInput, string $returnUrl): array
    {
        $session = $this->loadRequiredSession($sessionId);
        $method = (string)$session['method_code'];
        if (!isset(self::WALLET_PRODUCTS[$method])) {
            throw new \RuntimeException('Worldline session is not a browser-wallet session.');
        }
        if (!empty($session['payment_id'])) {
            return $this->verifiedStatus($sessionId);
        }
        if ($this->ageSeconds($session) > self::INITIAL_SUBMIT_TTL_SECONDS) {
            throw new \RuntimeException('Worldline wallet session expired before submission. Start the payment again.');
        }

        $encryptedCustomerInput = trim($encryptedCustomerInput);
        if (strlen($encryptedCustomerInput) < 32 || strlen($encryptedCustomerInput) > 300000) {
            throw new \InvalidArgumentException('Worldline encrypted wallet payload is invalid.');
        }
        $this->assertSameTenantHttpsUrl($returnUrl);

        $request = new CreatePaymentRequest();
        $request->order = $this->buildOrder($session);
        $request->encryptedCustomerInput = $encryptedCustomerInput;

        if ($method === 'google_pay') {
            $redirect = new RedirectionData();
            $redirect->returnUrl = $returnUrl;

            $threeDSecure = new GPayThreeDSecure();
            $threeDSecure->challengeIndicator = 'no-preference';
            $threeDSecure->challengeCanvasSize = '600x400';
            $threeDSecure->skipAuthentication = false;
            $threeDSecure->redirectionData = $redirect;

            $specific320 = new MobilePaymentProduct320SpecificInput();
            $specific320->threeDSecure = $threeDSecure;

            $mobile = new MobilePaymentMethodSpecificInput();
            $mobile->paymentProductId = 320;
            $mobile->requiresApproval = false;
            $mobile->paymentProduct320SpecificInput = $specific320;
            $request->mobilePaymentMethodSpecificInput = $mobile;
        }

        return $this->createPayment($session, $request, 'wallet');
    }

    public function createRedirectPayment(string $method, array $context, string $returnUrl): array
    {
        $method = $this->normalizeMethod($method);
        $productId = self::REDIRECT_PRODUCTS[$method] ?? 0;
        if ($productId <= 0) {
            throw new \InvalidArgumentException('Unsupported Worldline redirect payment method.');
        }
        $this->assertSameTenantHttpsUrl($returnUrl);

        $session = $this->baseSession($method, $productId, $context);
        $runtime = app(WorldlineConnectRuntimeService::class);
        $available = $runtime->availablePaymentProducts(
            (string)$session['country_code'],
            (string)$session['expected_currency'],
            (int)$session['expected_amount_minor'],
            (string)$session['locale']
        );
        $availableIds = array_values(array_map('intval', (array)($available[$method] ?? [])));
        if (!in_array($productId, $availableIds, true)) {
            throw new \RuntimeException('Worldline '.$method.' product '.$productId.' is not available for this merchant and transaction.');
        }

        $session['created_at_utc'] = gmdate('c');
        $this->saveSession($session);

        $redirection = new RedirectionData();
        $redirection->returnUrl = $returnUrl;

        $redirectInput = new RedirectPaymentMethodSpecificInput();
        $redirectInput->paymentProductId = $productId;
        $redirectInput->requiresApproval = false;
        $redirectInput->redirectionData = $redirection;

        $request = new CreatePaymentRequest();
        $request->order = $this->buildOrder($session);
        $request->redirectPaymentMethodSpecificInput = $redirectInput;

        return $this->createPayment($session, $request, 'redirect');
    }

    public function verifiedStatus(string $sessionId): array
    {
        $session = $this->loadRequiredSession($sessionId);
        $paymentId = trim((string)($session['payment_id'] ?? ''));
        if ($paymentId === '') {
            return $this->statusResult($session, null, 'PENDING', null, null, null, false, false, 'Payment has not been submitted yet.');
        }

        $cfg = app(WorldlineConnectRuntimeService::class)->config(true);
        $raw = $this->toArray($this->merchantClient($cfg)->payments()->get($paymentId, new GetPaymentParams()));
        $status = strtoupper(trim((string)($raw['status'] ?? 'PENDING')));
        $output = (array)($raw['paymentOutput'] ?? []);
        $money = (array)($output['amountOfMoney'] ?? []);
        $references = (array)($output['references'] ?? []);
        $statusOutput = (array)($raw['statusOutput'] ?? []);
        $statusCategory = strtoupper(trim((string)($statusOutput['statusCategory'] ?? '')));
        $actualAmount = isset($money['amount']) && is_numeric($money['amount']) ? (int)$money['amount'] : null;
        $actualCurrency = strtoupper(trim((string)($money['currencyCode'] ?? '')));
        $actualReference = trim((string)($references['merchantReference'] ?? ''));

        $amountMatches = $actualAmount !== null && $actualAmount === (int)$session['expected_amount_minor'];
        $currencyMatches = $actualCurrency !== '' && hash_equals((string)$session['expected_currency'], $actualCurrency);
        $referenceMatches = $actualReference === '' || hash_equals((string)$session['merchant_reference'], $actualReference);
        $verified = $amountMatches && $currencyMatches && $referenceMatches;
        $providerPaid = in_array($status, ['CAPTURED', 'PAID', 'COMPLETED'], true) || $statusCategory === 'COMPLETED';
        $paid = $verified && $providerPaid;

        $session['payment_status'] = $status;
        $session['last_verified_at_utc'] = gmdate('c');
        $this->saveSession($session);

        if (!$verified && $actualAmount !== null) {
            \Log::error('WORLDLINE_NATIVE_ALT_SETTLEMENT_VERIFICATION_FAILED', [
                'host' => request()->getHost(),
                'session_id' => $sessionId,
                'payment_id' => $paymentId,
                'order_id' => $session['order_id'],
                'method' => $session['method_code'],
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
            $actualCurrency !== '' ? $actualCurrency : null,
            $actualReference !== '' ? $actualReference : null,
            $verified,
            $paid,
            $paid ? 'Worldline payment verified.' : ($verified ? 'Worldline payment is not complete yet.' : 'Worldline payment is awaiting verifiable provider output.')
        );
    }

    public function verifyReturnMac(string $sessionId, string $returnMac): bool
    {
        $session = $this->loadRequiredSession($sessionId);
        $expected = trim((string)($session['return_mac'] ?? ''));
        return $expected !== '' && trim($returnMac) !== '' && hash_equals($expected, trim($returnMac));
    }

    private function createPayment(array $session, CreatePaymentRequest $request, string $kind): array
    {
        $cfg = app(WorldlineConnectRuntimeService::class)->config(true);
        $callContext = new CallContext();
        $callContext->setIdempotenceKey(substr(hash('sha256', $session['host'].'|'.$session['session_id'].'|'.$session['method_code']), 0, 32));

        // Never log the request: wallet credentials are intentionally opaque.
        $response = $this->merchantClient($cfg)->payments()->create($request, $callContext);
        $raw = $this->toArray($response);
        $payment = (array)($raw['payment'] ?? []);
        $paymentId = trim((string)($payment['id'] ?? $raw['paymentId'] ?? ''));
        $status = strtoupper(trim((string)($payment['status'] ?? $raw['status'] ?? 'PENDING')));
        $action = (array)($raw['merchantAction'] ?? []);
        $redirectData = (array)($action['redirectData'] ?? []);
        $actionType = strtoupper(trim((string)($action['actionType'] ?? '')));
        $redirectUrl = trim((string)($redirectData['redirectURL'] ?? $redirectData['redirectUrl'] ?? ''));
        $returnMac = trim((string)($redirectData['RETURNMAC'] ?? $redirectData['returnMac'] ?? $raw['RETURNMAC'] ?? ''));

        if ($paymentId === '') {
            throw new \RuntimeException('Worldline did not return a payment id.');
        }
        if ($redirectUrl !== '' && !$this->isHttpsUrl($redirectUrl)) {
            throw new \RuntimeException('Worldline returned an insecure authorization URL.');
        }

        $session['payment_id'] = $paymentId;
        $session['payment_status'] = $status !== '' ? $status : 'PENDING';
        $session['return_mac'] = $returnMac !== '' ? $returnMac : null;
        $session['redirect_url'] = $redirectUrl !== '' ? $redirectUrl : null;
        $session['submitted_at_utc'] = gmdate('c');
        $this->saveSession($session);

        \Log::info('WORLDLINE_NATIVE_ALT_PAYMENT_CREATED', [
            'host' => request()->getHost(),
            'session_id' => $session['session_id'],
            'order_id' => $session['order_id'],
            'method' => $session['method_code'],
            'payment_product_id' => $session['payment_product_id'],
            'payment_id' => $paymentId,
            'payment_status' => $session['payment_status'],
            'kind' => $kind,
            'merchant_action' => $actionType !== '' ? $actionType : null,
            'requires_redirect' => $redirectUrl !== '',
        ]);

        $verified = $this->verifiedStatus((string)$session['session_id']);
        $verified['flow'] = $kind === 'wallet' ? 'native_wallet' : 'native_redirect';
        $verified['action_type'] = $actionType !== '' ? $actionType : null;
        $verified['redirect_url'] = $redirectUrl !== '' ? $redirectUrl : null;
        $verified['return_mac_required'] = $returnMac !== '';
        return $verified;
    }

    private function baseSession(string $method, int $productId, array $context): array
    {
        $orderId = (int)($context['order_id'] ?? 0);
        $amountMinor = (int)($context['amount_minor'] ?? 0);
        $principalAmountMinor = (int)($context['principal_amount_minor'] ?? $amountMinor);
        $tipAmountMinor = max(0, (int)($context['tip_amount_minor'] ?? 0));
        $currency = strtoupper(trim((string)($context['currency'] ?? 'EUR')));
        $countryCode = strtoupper(trim((string)($context['country_code'] ?? 'DE')));
        $locale = trim((string)($context['locale'] ?? 'de_DE')) ?: 'de_DE';
        $merchantReference = substr(trim((string)($context['merchant_reference'] ?? ('PMD-ORDER-'.$orderId))), 0, 40);

        if ($orderId <= 0 || $amountMinor <= 0 || $principalAmountMinor <= 0) {
            throw new \InvalidArgumentException('Worldline own-checkout requires an authoritative submitted order and amount.');
        }
        if (!preg_match('/^[A-Z]{3}$/', $currency) || !preg_match('/^[A-Z]{2}$/', $countryCode)) {
            throw new \InvalidArgumentException('Worldline own-checkout market context is invalid.');
        }
        if ($merchantReference === '') {
            throw new \InvalidArgumentException('Worldline merchant reference is required.');
        }

        return [
            'host' => request()->getHost(),
            'session_id' => bin2hex(random_bytes(24)),
            'order_id' => $orderId,
            'method_code' => $method,
            'payment_product_id' => $productId,
            'merchant_reference' => $merchantReference,
            'expected_amount_minor' => $amountMinor,
            'principal_amount_minor' => $principalAmountMinor,
            'tip_amount_minor' => $tipAmountMinor,
            'expected_currency' => $currency,
            'country_code' => $countryCode,
            'locale' => $locale,
            'payment_id' => null,
            'payment_status' => 'CREATED',
            'return_mac' => null,
            'redirect_url' => null,
            'created_at_utc' => null,
            'submitted_at_utc' => null,
        ];
    }

    private function buildOrder(array $session): Order
    {
        $amount = new AmountOfMoney();
        $amount->amount = (int)$session['expected_amount_minor'];
        $amount->currencyCode = (string)$session['expected_currency'];

        $address = new Address();
        $address->countryCode = (string)$session['country_code'];

        $customer = new Customer();
        $customer->billingAddress = $address;
        $customer->merchantCustomerId = substr('PMD'.(string)$session['order_id'], 0, 20);
        if (property_exists($customer, 'locale')) {
            $customer->locale = (string)$session['locale'];
        }

        $references = new OrderReferences();
        $references->merchantReference = (string)$session['merchant_reference'];
        if (property_exists($references, 'merchantOrderId')) {
            $references->merchantOrderId = (int)$session['order_id'];
        }

        $order = new Order();
        $order->amountOfMoney = $amount;
        $order->customer = $customer;
        $order->references = $references;
        return $order;
    }

    private function statusResult(array $session, ?string $paymentId, string $status, ?int $actualAmount, ?string $actualCurrency, ?string $actualReference, bool $verified, bool $paid, string $message): array
    {
        return [
            'success' => true,
            'provider' => 'worldline',
            'flow' => isset(self::WALLET_PRODUCTS[$session['method_code']]) ? 'native_wallet' : 'native_redirect',
            'session_id' => (string)$session['session_id'],
            'payment_id' => $paymentId,
            'payment_status' => $status,
            'is_paid' => $paid,
            'verification_ok' => $verified,
            'order_id' => (int)$session['order_id'],
            'method_code' => (string)$session['method_code'],
            'payment_product_id' => (int)$session['payment_product_id'],
            'expected_amount_minor' => (int)$session['expected_amount_minor'],
            'principal_amount_minor' => (int)$session['principal_amount_minor'],
            'tip_amount_minor' => (int)$session['tip_amount_minor'],
            'actual_amount_minor' => $actualAmount,
            'expected_currency' => (string)$session['expected_currency'],
            'actual_currency' => $actualCurrency,
            'merchant_reference' => $actualReference ?: (string)$session['merchant_reference'],
            'message' => $message,
        ];
    }

    private function providerData(): array
    {
        $model = Payments_model::query()->where('code', 'worldline')->first();
        if (!$model) {
            return [];
        }
        return method_exists($model, 'getConfigData') ? (array)$model->getConfigData() : (array)$model->data;
    }

    private function merchantClient(array $cfg)
    {
        $configuration = new CommunicatorConfiguration(
            $cfg['api_key_id'],
            $cfg['secret_api_key'],
            $cfg['api_endpoint'],
            'PayMyDine'
        );
        return (new Client(new Communicator($configuration)))->v1()->merchant($cfg['merchant_id']);
    }

    private function normalizeMethod(string $method): string
    {
        return strtolower(str_replace('-', '_', trim($method)));
    }

    private function assertSameTenantHttpsUrl(string $url): void
    {
        if (!$this->isHttpsUrl($url)) {
            throw new \InvalidArgumentException('Worldline return URL must be HTTPS.');
        }
        $host = strtolower((string)parse_url($url, PHP_URL_HOST));
        if ($host === '' || !hash_equals(strtolower(request()->getHost()), $host)) {
            throw new \InvalidArgumentException('Worldline return URL must use the current tenant host.');
        }
    }

    private function isHttpsUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false
            && strtolower((string)parse_url($url, PHP_URL_SCHEME)) === 'https';
    }

    private function sessionsBaseDir(): string
    {
        $dir = storage_path('app/worldline_native_alt_sessions_v1');
        if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create Worldline own-checkout session storage.');
        }
        return $dir;
    }

    private function sessionFile(string $host, string $sessionId): string
    {
        $host = preg_replace('/[^A-Za-z0-9._-]/', '_', strtolower($host)) ?: 'unknown-host';
        if (!preg_match('/^[a-f0-9]{48}$/', $sessionId)) {
            throw new \InvalidArgumentException('Invalid Worldline own-checkout session id.');
        }
        $dir = $this->sessionsBaseDir().'/'.$host;
        if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create tenant Worldline own-checkout session storage.');
        }
        return $dir.'/'.$sessionId.'.json';
    }

    private function saveSession(array $session): void
    {
        $encoded = json_encode($session, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if (!is_string($encoded)) {
            throw new \RuntimeException('Unable to serialize Worldline own-checkout session.');
        }
        $file = $this->sessionFile((string)$session['host'], (string)$session['session_id']);
        if (file_put_contents($file, $encoded, LOCK_EX) === false) {
            throw new \RuntimeException('Unable to persist Worldline own-checkout session.');
        }
        @chmod($file, 0660);
    }

    private function loadRequiredSession(string $sessionId): array
    {
        $sessionId = strtolower(trim($sessionId));
        $file = $this->sessionFile(request()->getHost(), $sessionId);
        if (!is_file($file)) {
            throw new \RuntimeException('Unknown Worldline own-checkout session for this tenant.');
        }
        $decoded = json_decode((string)file_get_contents($file), true);
        if (!is_array($decoded)
            || !hash_equals(strtolower(request()->getHost()), strtolower((string)($decoded['host'] ?? '')))) {
            throw new \RuntimeException('Worldline own-checkout session is invalid for this tenant.');
        }
        if ($this->ageSeconds($decoded) > self::STATUS_TTL_SECONDS) {
            throw new \RuntimeException('Worldline own-checkout session expired. Start the payment again.');
        }
        return $decoded;
    }

    private function ageSeconds(array $session): int
    {
        $created = strtotime((string)($session['created_at_utc'] ?? ''));
        return $created ? max(0, time() - $created) : PHP_INT_MAX;
    }

    private function toArray($value): array
    {
        $decoded = json_decode(json_encode($value), true);
        return is_array($decoded) ? $decoded : [];
    }
}
