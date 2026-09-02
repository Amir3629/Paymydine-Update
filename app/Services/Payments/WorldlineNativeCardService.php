<?php

namespace App\Services\Payments;

use Worldline\Connect\Sdk\CallContext;
use Worldline\Connect\Sdk\Client;
use Worldline\Connect\Sdk\Communicator;
use Worldline\Connect\Sdk\CommunicatorConfiguration;
use Worldline\Connect\Sdk\V1\Domain\Address;
use Worldline\Connect\Sdk\V1\Domain\AmountOfMoney;
use Worldline\Connect\Sdk\V1\Domain\CardPaymentMethodSpecificInput;
use Worldline\Connect\Sdk\V1\Domain\CreatePaymentRequest;
use Worldline\Connect\Sdk\V1\Domain\Customer;
use Worldline\Connect\Sdk\V1\Domain\Order;
use Worldline\Connect\Sdk\V1\Domain\OrderReferences;
use Worldline\Connect\Sdk\V1\Domain\RedirectionData;
use Worldline\Connect\Sdk\V1\Domain\SessionRequest;
use Worldline\Connect\Sdk\V1\Domain\ThreeDSecure;
use Worldline\Connect\Sdk\V1\Merchant\Payments\GetPaymentParams;

/**
 * Worldline Connect native-card runtime for PayMyDine Frontend V2.
 *
 * PCI boundary:
 * - Raw PAN, expiry and CVV exist only in the guest browser.
 * - The browser validates/encrypts them with the official Worldline Client SDK.
 * - This service accepts only encryptedCustomerInput plus a PMD session id.
 * - Amount, currency, order and merchant reference are server authoritative.
 * - Card-product discovery is intentionally deferred until submit so the card
 *   fields can render after only the lightweight Worldline Client Session call.
 */
final class WorldlineNativeCardService
{
    private const INITIAL_SUBMIT_TTL_SECONDS = 1800;
    private const STATUS_TTL_SECONDS = 7200;

    public function createClientSession(array $context): array
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
            throw new \InvalidArgumentException('Worldline native card session requires an authoritative submitted order and amount.');
        }
        if (!preg_match('/^[A-Z]{3}$/', $currency) || !preg_match('/^[A-Z]{2}$/', $countryCode)) {
            throw new \InvalidArgumentException('Worldline native card market context is invalid.');
        }
        if ($merchantReference === '') {
            throw new \InvalidArgumentException('Worldline merchant reference is required.');
        }

        $runtime = app(WorldlineConnectRuntimeService::class);
        $cfg = $runtime->config(true);

        // Do not block field rendering on Get payment products. The browser still
        // performs IIN/product discovery for UX, and the server performs the exact
        // authoritative product discovery immediately before creating the payment.
        $allowedProductIds = [];

        $response = $this->merchantClient($cfg)->sessions()->create(new SessionRequest());
        $raw = $this->toArray($response);
        $clientSessionId = trim((string)($raw['clientSessionId'] ?? ''));
        $customerId = trim((string)($raw['customerId'] ?? ''));
        $clientApiUrl = trim((string)($raw['clientApiUrl'] ?? ''));
        $assetUrl = trim((string)($raw['assetUrl'] ?? ''));
        if ($clientSessionId === '' || $customerId === '' || $clientApiUrl === '' || $assetUrl === '') {
            throw new \RuntimeException('Worldline did not return a complete Client SDK session.');
        }
        if (!$this->isHttpsUrl($clientApiUrl) || !$this->isHttpsUrl($assetUrl)) {
            throw new \RuntimeException('Worldline returned an insecure Client SDK endpoint.');
        }

        $sessionId = bin2hex(random_bytes(24));
        $session = [
            'host' => request()->getHost(),
            'session_id' => $sessionId,
            'order_id' => $orderId,
            'merchant_reference' => $merchantReference,
            'expected_amount_minor' => $amountMinor,
            'principal_amount_minor' => $principalAmountMinor,
            'tip_amount_minor' => $tipAmountMinor,
            'expected_currency' => $currency,
            'country_code' => $countryCode,
            'locale' => $locale,
            'allowed_payment_product_ids' => $allowedProductIds,
            'payment_id' => null,
            'payment_status' => 'CREATED',
            'return_mac' => null,
            'redirect_url' => null,
            'created_at_utc' => gmdate('c'),
            'submitted_at_utc' => null,
        ];
        $this->saveSession($session);

        \Log::info('WORLDLINE_NATIVE_CARD_CLIENT_SESSION_CREATED', [
            'host' => request()->getHost(),
            'session_id' => $sessionId,
            'order_id' => $orderId,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'product_validation' => 'deferred_to_submit',
        ]);

        return [
            'success' => true,
            'provider' => 'worldline',
            'flow' => 'native_card',
            'session_id' => $sessionId,
            'client_session' => [
                'clientSessionId' => $clientSessionId,
                'customerId' => $customerId,
                'clientApiUrl' => $clientApiUrl,
                'assetUrl' => $assetUrl,
            ],
            'payment_details' => [
                'totalAmount' => $amountMinor,
                'countryCode' => $countryCode,
                'locale' => $locale,
                'currency' => $currency,
                'isRecurring' => false,
            ],
            'allowed_payment_product_ids' => $allowedProductIds,
            'order_id' => $orderId,
            'principal_amount_minor' => $principalAmountMinor,
            'tip_amount_minor' => $tipAmountMinor,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
        ];
    }

    public function submitEncryptedCard(string $sessionId, string $encryptedCustomerInput, int $paymentProductId, string $returnUrl): array
    {
        $session = $this->loadRequiredSession($sessionId, self::STATUS_TTL_SECONDS);
        if (!empty($session['payment_id'])) {
            return $this->verifiedStatus($sessionId);
        }
        if ($this->ageSeconds($session) > self::INITIAL_SUBMIT_TTL_SECONDS) {
            throw new \RuntimeException('Worldline native card session expired before submission. Start the payment again.');
        }

        $encryptedCustomerInput = trim($encryptedCustomerInput);
        if (strlen($encryptedCustomerInput) < 32 || strlen($encryptedCustomerInput) > 200000) {
            throw new \InvalidArgumentException('Worldline encrypted card payload is invalid.');
        }

        // Exact server-side product validation happens here, immediately before
        // payment creation. This preserves fail-closed behaviour while removing
        // the same provider round-trip from the user-visible field-load path.
        $runtime = app(WorldlineConnectRuntimeService::class);
        $available = $runtime->availablePaymentProducts(
            (string)$session['country_code'],
            (string)$session['expected_currency'],
            (int)$session['expected_amount_minor'],
            (string)$session['locale']
        );
        $allowed = array_values(array_unique(array_filter(array_map('intval', (array)($available['card'] ?? [])))));
        if ($paymentProductId <= 0 || !in_array($paymentProductId, $allowed, true)) {
            throw new \InvalidArgumentException('Worldline payment product is not allowed for this PMD transaction.');
        }
        $session['allowed_payment_product_ids'] = $allowed;
        $this->saveSession($session);

        $this->assertSameTenantHttpsUrl($returnUrl);

        $cfg = $runtime->config(true);
        $amount = new AmountOfMoney();
        $amount->amount = (int)$session['expected_amount_minor'];
        $amount->currencyCode = (string)$session['expected_currency'];

        $address = new Address();
        $address->countryCode = (string)$session['country_code'];

        $customer = new Customer();
        $customer->billingAddress = $address;
        $customer->merchantCustomerId = substr('PMD'.(string)$session['order_id'], 0, 20);

        $references = new OrderReferences();
        $references->merchantReference = (string)$session['merchant_reference'];
        if (property_exists($references, 'merchantOrderId')) {
            $references->merchantOrderId = (int)$session['order_id'];
        }

        $order = new Order();
        $order->amountOfMoney = $amount;
        $order->customer = $customer;
        $order->references = $references;

        $redirection = new RedirectionData();
        $redirection->returnUrl = $returnUrl;

        $threeDSecure = new ThreeDSecure();
        $threeDSecure->authenticationFlow = 'browser';
        $threeDSecure->challengeIndicator = 'no-preference';
        $threeDSecure->challengeCanvasSize = '600x400';
        $threeDSecure->redirectionData = $redirection;

        $cardInput = new CardPaymentMethodSpecificInput();
        $cardInput->paymentProductId = $paymentProductId;
        $cardInput->transactionChannel = 'ECOMMERCE';
        $cardInput->requiresApproval = false;
        $cardInput->threeDSecure = $threeDSecure;

        $request = new CreatePaymentRequest();
        $request->order = $order;
        $request->encryptedCustomerInput = $encryptedCustomerInput;
        $request->cardPaymentMethodSpecificInput = $cardInput;

        $callContext = new CallContext();
        $callContext->setIdempotenceKey(substr(hash('sha256', (string)$session['host'].'|'.$sessionId), 0, 32));

        // IMPORTANT: never log $encryptedCustomerInput or the serialized request.
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
            throw new \RuntimeException('Worldline did not return a payment id for the encrypted card payment.');
        }
        if ($redirectUrl !== '' && !$this->isHttpsUrl($redirectUrl)) {
            throw new \RuntimeException('Worldline returned an insecure 3-D Secure redirect URL.');
        }

        $session['payment_id'] = $paymentId;
        $session['payment_status'] = $status !== '' ? $status : 'PENDING';
        $session['payment_product_id'] = $paymentProductId;
        $session['return_mac'] = $returnMac !== '' ? $returnMac : null;
        $session['redirect_url'] = $redirectUrl !== '' ? $redirectUrl : null;
        $session['submitted_at_utc'] = gmdate('c');
        $this->saveSession($session);

        \Log::info('WORLDLINE_NATIVE_CARD_PAYMENT_CREATED', [
            'host' => request()->getHost(),
            'session_id' => $sessionId,
            'order_id' => $session['order_id'],
            'payment_id' => $paymentId,
            'payment_status' => $session['payment_status'],
            'payment_product_id' => $paymentProductId,
            'merchant_action' => $actionType !== '' ? $actionType : null,
            'requires_redirect' => $redirectUrl !== '',
        ]);

        $verified = $this->verifiedStatus($sessionId);
        $verified['action_type'] = $actionType !== '' ? $actionType : null;
        $verified['redirect_url'] = $redirectUrl !== '' ? $redirectUrl : null;
        $verified['return_mac_required'] = $returnMac !== '';
        return $verified;
    }

    public function verifiedStatus(string $sessionId): array
    {
        $session = $this->loadRequiredSession($sessionId, self::STATUS_TTL_SECONDS);
        $paymentId = trim((string)($session['payment_id'] ?? ''));
        if ($paymentId === '') {
            return $this->statusResult($session, null, 'PENDING', null, null, null, false, false, 'Card details have not been submitted yet.');
        }

        $cfg = app(WorldlineConnectRuntimeService::class)->config(true);
        $paymentClient = $this->merchantClient($cfg)->payments();
        $raw = $this->toArray($paymentClient->get($paymentId, new GetPaymentParams()));
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
            \Log::error('WORLDLINE_NATIVE_CARD_SETTLEMENT_VERIFICATION_FAILED', [
                'host' => request()->getHost(),
                'session_id' => $sessionId,
                'payment_id' => $paymentId,
                'order_id' => $session['order_id'],
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
            $paid ? 'Worldline card payment verified.' : ($verified ? 'Worldline card payment is not complete yet.' : 'Worldline card payment is awaiting verifiable provider output.')
        );
    }

    public function verifyReturnMac(string $sessionId, string $returnMac): bool
    {
        $session = $this->loadRequiredSession($sessionId, self::STATUS_TTL_SECONDS);
        $expected = trim((string)($session['return_mac'] ?? ''));
        return $expected !== '' && trim($returnMac) !== '' && hash_equals($expected, trim($returnMac));
    }

    private function statusResult(array $session, ?string $paymentId, string $status, ?int $actualAmount, ?string $actualCurrency, ?string $actualReference, bool $verified, bool $paid, string $message): array
    {
        return [
            'success' => true,
            'provider' => 'worldline',
            'flow' => 'native_card',
            'session_id' => (string)$session['session_id'],
            'payment_id' => $paymentId,
            'payment_status' => $status,
            'is_paid' => $paid,
            'verification_ok' => $verified,
            'order_id' => (int)$session['order_id'],
            'method_code' => 'card',
            'payment_product_id' => isset($session['payment_product_id']) ? (int)$session['payment_product_id'] : null,
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

    private function assertSameTenantHttpsUrl(string $url): void
    {
        if (!$this->isHttpsUrl($url)) {
            throw new \InvalidArgumentException('Worldline native card return URL must be HTTPS.');
        }
        $host = strtolower((string)parse_url($url, PHP_URL_HOST));
        if ($host === '' || !hash_equals(strtolower(request()->getHost()), $host)) {
            throw new \InvalidArgumentException('Worldline native card return URL must use the current tenant host.');
        }
    }

    private function isHttpsUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false && strtolower((string)parse_url($url, PHP_URL_SCHEME)) === 'https';
    }

    private function sessionsBaseDir(): string
    {
        $dir = storage_path('app/worldline_native_card_sessions_v1');
        if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create Worldline native card session storage.');
        }
        return $dir;
    }

    private function sessionFile(string $host, string $sessionId): string
    {
        $host = preg_replace('/[^A-Za-z0-9._-]/', '_', strtolower($host)) ?: 'unknown-host';
        if (!preg_match('/^[a-f0-9]{48}$/', $sessionId)) {
            throw new \InvalidArgumentException('Invalid Worldline native card session id.');
        }
        $dir = $this->sessionsBaseDir().'/'.$host;
        if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create tenant Worldline native card session storage.');
        }
        return $dir.'/'.$sessionId.'.json';
    }

    private function saveSession(array $session): void
    {
        $encoded = json_encode($session, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if (!is_string($encoded)) {
            throw new \RuntimeException('Unable to serialize Worldline native card session.');
        }
        $file = $this->sessionFile((string)$session['host'], (string)$session['session_id']);
        if (file_put_contents($file, $encoded, LOCK_EX) === false) {
            throw new \RuntimeException('Unable to persist Worldline native card session.');
        }
        @chmod($file, 0660);
    }

    private function loadRequiredSession(string $sessionId, int $ttlSeconds): array
    {
        $sessionId = strtolower(trim($sessionId));
        $file = $this->sessionFile(request()->getHost(), $sessionId);
        if (!is_file($file)) {
            throw new \RuntimeException('Unknown Worldline native card session for this tenant.');
        }
        $decoded = json_decode((string)file_get_contents($file), true);
        if (!is_array($decoded) || !hash_equals(strtolower(request()->getHost()), strtolower((string)($decoded['host'] ?? '')))) {
            throw new \RuntimeException('Worldline native card session is invalid for this tenant.');
        }
        if ($this->ageSeconds($decoded) > $ttlSeconds) {
            throw new \RuntimeException('Worldline native card session expired. Start the payment again.');
        }
        return $decoded;
    }

    private function ageSeconds(array $session): int
    {
        $created = strtotime((string)($session['created_at_utc'] ?? ''));
        if (!$created) {
            return PHP_INT_MAX;
        }
        return max(0, time() - $created);
    }

    private function toArray($value): array
    {
        $decoded = json_decode(json_encode($value), true);
        return is_array($decoded) ? $decoded : [];
    }
}
