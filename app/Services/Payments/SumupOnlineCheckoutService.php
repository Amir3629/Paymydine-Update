<?php

namespace App\Services\Payments;

use App\Services\TerminalPayments\SumupTenantConnectionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SumupOnlineCheckoutService
{
    public const WIDGET_SDK_URL = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';

    private const PMD_WIDGET_METHODS = ['card', 'apple_pay', 'google_pay'];

    public function __construct(
        protected SumupTenantConnectionService $connections
    ) {
    }

    public function createWidgetCheckout(array $payload): array
    {
        $config = $this->activeConfig();

        // PMD_SUMUP_WALLET_STRICT_R2
        // Carry the guest-selected PMD payment method all the way to the
        // provider boundary. Standalone wallets may never silently fall back
        // to card fields. The Card / Wallet row intentionally keeps the full
        // eligible SumUp method list.
        $requestedMethod = strtolower(trim((string)($payload['payment_method'] ?? 'card')));
        if (!in_array($requestedMethod, self::PMD_WIDGET_METHODS, true)) {
            throw new RuntimeException('Unsupported SumUp payment method.');
        }

        $amount = round((float)($payload['amount'] ?? 0), 2);
        if ($amount <= 0) {
            throw new RuntimeException('Payment amount must be greater than zero.');
        }

        $currency = strtoupper(trim((string)($payload['currency'] ?? 'EUR')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new RuntimeException('Invalid payment currency.');
        }

        $returnUrl = trim((string)($payload['return_url'] ?? ''));
        if ($returnUrl === '') {
            throw new RuntimeException('Payment return URL is required.');
        }

        $orderId = (int)($payload['order_id'] ?? 0);
        $providedReference = trim((string)($payload['merchant_reference'] ?? ''));
        $reference = $providedReference !== ''
            ? mb_substr($providedReference, 0, 191)
            : ($orderId > 0
                ? 'PMD-ORD-'.$orderId.'-'.bin2hex(random_bytes(6))
                : 'PMD-GUEST-'.bin2hex(random_bytes(8)));

        $request = [
            'checkout_reference' => $reference,
            'amount' => $amount,
            'currency' => $currency,
            'merchant_code' => (string)$config['merchant_code'],
            'description' => trim((string)($payload['description'] ?? 'PayMyDine order')) ?: 'PayMyDine order',
            // SumUp APMs can require a return target even though the Payment
            // Widget itself stays embedded in PayMyDine for the normal flow.
            'redirect_url' => $returnUrl,
        ];

        $response = Http::withToken($config['access_token'])
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->post(rtrim((string)$config['url'], '/').'/v0.1/checkouts', $request);

        $body = (array)$response->json();
        if (!$response->successful()) {
            throw new RuntimeException($this->safeHttpMessage($body, 'SumUp could not create the checkout.'));
        }

        $checkoutId = trim((string)($body['id'] ?? ''));
        if ($checkoutId === '') {
            throw new RuntimeException('SumUp did not return a checkout ID.');
        }

        $wallets = $this->walletSettings((string)$config['environment']);
        $methods = $this->availablePaymentMethods($config, $amount, $currency);
        if (!($wallets['google_pay']['configured'] ?? false)) {
            $methods = array_values(array_filter(
                $methods,
                static fn (string $method): bool => $method !== 'google_pay'
            ));
        }
        if ($requestedMethod === 'google_pay' && !($wallets['google_pay']['configured'] ?? false)) {
            throw new RuntimeException('Google Pay is not configured for this restaurant yet. Complete Google Pay web approval, then save the Google Merchant ID and Merchant Name in PayMyDine.');
        }

        if ($requestedMethod !== 'card') {
            if (!in_array($requestedMethod, $methods, true)) {
                $label = $requestedMethod === 'apple_pay' ? 'Apple Pay' : 'Google Pay';
                throw new RuntimeException($label.' is not available for this SumUp checkout. Check wallet onboarding, domain registration and the current browser/device.');
            }
            $methods = [$requestedMethod];
        } elseif ($methods === []) {
            $methods = ['card'];
        }

        Log::channel('sumup')->info('SUMUP_WIDGET_CHECKOUT_CREATED', [
            'checkout_id' => $checkoutId,
            'checkout_reference' => $reference,
            'environment' => $config['environment'] ?? null,
            'amount' => $amount,
            'currency' => $currency,
            'requested_payment_method' => $requestedMethod,
            'available_payment_methods' => $methods,
            'google_pay_configured' => (bool)($wallets['google_pay']['configured'] ?? false),
        ]);

        return [
            'success' => true,
            'provider' => 'sumup',
            'integration_mode' => 'payment_widget',
            'environment' => (string)($config['environment'] ?? ''),
            'checkout_id' => $checkoutId,
            'checkout_reference' => $reference,
            'status' => strtolower(trim((string)($body['status'] ?? 'pending'))) ?: 'pending',
            'requested_payment_method' => $requestedMethod,
            'available_payment_methods' => $methods,
            'widget' => [
                'sdk_url' => self::WIDGET_SDK_URL,
                'allowed_payment_methods' => $methods,
                'google_pay' => (bool)($wallets['google_pay']['configured'] ?? false)
                    ? [
                        'merchantId' => (string)$wallets['google_pay']['merchant_id'],
                        'merchantName' => (string)$wallets['google_pay']['merchant_name'],
                    ]
                    : null,
            ],
        ];
    }

    public function status(string $checkoutId): array
    {
        $checkoutId = trim($checkoutId);
        if ($checkoutId === '') {
            throw new RuntimeException('SumUp checkout ID is required.');
        }

        $config = $this->activeConfig();
        $response = Http::withToken($config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->get(rtrim((string)$config['url'], '/').'/v0.1/checkouts/'.rawurlencode($checkoutId));

        $body = (array)$response->json();
        if (!$response->successful()) {
            throw new RuntimeException($this->safeHttpMessage($body, 'SumUp could not verify the payment.'));
        }

        $rawStatus = strtoupper(trim((string)($body['status'] ?? 'PENDING')));
        $isPaid = in_array($rawStatus, ['PAID', 'SUCCESSFUL', 'SUCCESS'], true);
        $isCancelled = in_array($rawStatus, ['CANCELLED', 'CANCELED', 'EXPIRED'], true);
        $isFailed = in_array($rawStatus, ['FAILED', 'FAILURE', 'REJECTED'], true);

        $status = $isPaid
            ? 'paid'
            : ($isCancelled
                ? 'cancelled'
                : ($isFailed ? 'failed' : 'pending'));

        return [
            'success' => true,
            'provider' => 'sumup',
            'environment' => (string)($config['environment'] ?? ''),
            'checkout_id' => $checkoutId,
            'checkout_reference' => (string)($body['checkout_reference'] ?? ''),
            'status' => $status,
            'is_paid' => $isPaid,
            'payment_id' => $this->transactionReference($body) ?: $checkoutId,
            'transaction_code' => $this->transactionReference($body) ?: $checkoutId,
            'amount' => isset($body['amount']) ? (float)$body['amount'] : null,
            'currency' => (string)($body['currency'] ?? ''),
        ];
    }

    public function walletSettings(string $environment): array
    {
        $environment = $this->normalizeEnvironment($environment);
        $row = DB::table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->where('environment', $environment)
            ->first();

        $metadata = $this->decodeMetadata($row->metadata ?? null);
        $merchantId = trim((string)($metadata['google_pay_merchant_id'] ?? ''));
        $merchantName = trim((string)($metadata['google_pay_merchant_name'] ?? ''));
        $publicKey = trim((string)(
            $metadata['sumup_wallet_public_key']
            ?? $metadata['swift_checkout_public_key']
            ?? ''
        ));

        return [
            'google_pay' => [
                'merchant_id' => $merchantId,
                'merchant_name' => $merchantName,
                'configured' => $merchantId !== '' && $merchantName !== '',
            ],
            'apple_pay' => [
                'dashboard_domain_onboarding_required' => true,
            ],
            'swift_checkout' => [
                // Public merchant key intentionally goes to the browser. This
                // is NOT the secret SumUp API key (sup_sk_...).
                'public_key' => $publicKey,
                'configured' => $this->isUsableSwiftPublicKey($publicKey), // PMD_SUMUP_PUBLIC_KEY_VALIDATION_R1_4_7
            ],
        ];
    }

    public function saveWalletSettings(
        string $environment,
        ?string $googlePayMerchantId,
        ?string $googlePayMerchantName,
        ?string $walletPublicKey = null
    ): array {
        $environment = $this->normalizeEnvironment($environment);
        $row = DB::table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->where('environment', $environment)
            ->first();

        if (!$row) {
            throw new RuntimeException('Save the SumUp connection before configuring wallets.');
        }

        $metadata = $this->decodeMetadata($row->metadata ?? null);
        $metadata['google_pay_merchant_id'] = trim((string)$googlePayMerchantId);
        $metadata['google_pay_merchant_name'] = trim((string)$googlePayMerchantName);

        if ($walletPublicKey !== null) {
            $walletPublicKey = trim($walletPublicKey);
            if ($walletPublicKey !== '' && !$this->isUsableSwiftPublicKey($walletPublicKey)) {
                throw new RuntimeException('SumUp Wallet Public Key is invalid. Paste the real public merchant key generated by SumUp (sup_pk_...). Placeholder/example values are rejected. Never paste a sup_sk_ secret key here.');
            }
            $metadata['sumup_wallet_public_key'] = $walletPublicKey;
        }

        $metadata['online_checkout_mode'] = 'payment_widget+swift_checkout';
        $metadata['wallet_settings_updated_at'] = now()->toIso8601String();

        DB::table('terminal_provider_configs')
            ->where('terminal_provider_config_id', $row->terminal_provider_config_id)
            ->update([
                'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);

        return $this->walletSettings($environment);
    }

    // PMD_SUMUP_SWIFT_CONFIG_R5
    // Swift Checkout is the dedicated SumUp product for standalone Apple Pay
    // and Google Pay buttons. The response contains browser-safe data only.
    public function swiftCheckoutConfig(): array
    {
        $config = $this->activeConfig();
        $wallets = $this->walletSettings((string)$config['environment']);
        $publicKey = trim((string)($wallets['swift_checkout']['public_key'] ?? ''));
        if (!$this->isUsableSwiftPublicKey($publicKey)) {
            throw new RuntimeException('SumUp Wallet Public Key is missing or invalid. Copy the real sup_pk_ public merchant key from SumUp Dashboard → Settings → For Developers → Toolkit → API Keys into PayMyDine. Placeholder/example values cannot authorize Swift Checkout.');
        }

        $identity = $this->merchantIdentity($config);

        return [
            'success' => true,
            'provider' => 'sumup',
            'integration_mode' => 'swift_checkout',
            'environment' => (string)$config['environment'],
            'sdk_url' => 'https://js.sumup.com/swift-checkout/v1/sdk.js',
            'public_key' => $publicKey,
            'country_code' => $identity['country_code'],
            'merchant_name' => $identity['merchant_name'],
            'google_pay' => ($wallets['google_pay']['configured'] ?? false)
                ? [
                    'merchantId' => (string)$wallets['google_pay']['merchant_id'],
                    'merchantName' => (string)$wallets['google_pay']['merchant_name'],
                ]
                : null,
        ];
    }

    public function stateWithWallets(array $state): array
    {
        foreach (['test', 'production'] as $environment) {
            if (!isset($state['environments'][$environment]) || !is_array($state['environments'][$environment])) {
                continue;
            }
            $state['environments'][$environment]['wallets'] = $this->walletSettings($environment);
            $state['environments'][$environment]['online_checkout_mode'] = 'payment_widget';
        }

        return $state;
    }

    protected function isUsableSwiftPublicKey(string $publicKey): bool
    {
        // PMD_SUMUP_PUBLIC_KEY_VALIDATION_R1_4_7
        // Swift Checkout calls SumUp merchant-profile with this browser-safe
        // public merchant key. Prefix-only checks accepted documentation
        // placeholders such as sup_pk_PASTE_YOUR_REAL_PUBLIC_KEY_HERE and then
        // exposed a broken Apple Pay button which failed with HTTP 401.
        $publicKey = trim($publicKey);
        if (!preg_match('/^sup_pk_[A-Za-z0-9._-]{12,500}$/', $publicKey)) {
            return false;
        }

        $upper = strtoupper($publicKey);
        foreach (['PASTE_', 'PLACEHOLDER', 'EXAMPLE_', '_HERE'] as $forbidden) {
            if (str_contains($upper, $forbidden)) {
                return false;
            }
        }

        return true;
    }

    protected function activeConfig(): array
    {
        $config = $this->connections->activeConfig();

        if (empty($config) || !($config['ready'] ?? false)) {
            throw new RuntimeException('Connect and activate SumUp in Payments & finance first.');
        }
        if (trim((string)($config['access_token'] ?? '')) === '') {
            throw new RuntimeException('SumUp API key is missing.');
        }
        if (trim((string)($config['merchant_code'] ?? '')) === '') {
            throw new RuntimeException('SumUp Merchant Code is missing. Test the provider connection first.');
        }

        return $config;
    }

    // PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4
    // SumUp's current public API exposes checkout-eligible methods at the
    // merchant endpoint. Query it with the actual amount/currency and fail
    // closed for standalone wallets; Card / Wallet may still fall back to card.
    protected function availablePaymentMethods(array $config, float $amount, string $currency): array
    {
        try {
            $merchantCode = trim((string)($config['merchant_code'] ?? ''));
            if ($merchantCode === '') {
                return [];
            }

            $response = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(15)
                ->get(
                    rtrim((string)$config['url'], '/').'/v0.1/merchants/'.rawurlencode($merchantCode).'/payment-methods',
                    [
                        'amount' => round($amount, 2),
                        'currency' => strtoupper($currency),
                    ]
                );

            if (!$response->successful()) {
                Log::channel('sumup')->warning('SUMUP_WIDGET_PAYMENT_METHOD_DISCOVERY_FAILED', [
                    'merchant_code' => $merchantCode,
                    'amount' => $amount,
                    'currency' => $currency,
                    'status' => $response->status(),
                ]);
                return [];
            }

            $body = (array)$response->json();
            $items = (array)($body['available_payment_methods'] ?? $body['items'] ?? []);
            $ids = [];
            foreach ($items as $item) {
                $id = is_array($item)
                    ? strtolower(trim((string)($item['id'] ?? '')))
                    : strtolower(trim((string)$item));
                if ($id !== '' && in_array($id, self::PMD_WIDGET_METHODS, true)) {
                    $ids[] = $id;
                }
            }

            $ids = array_values(array_unique($ids));
            Log::channel('sumup')->info('SUMUP_WIDGET_PAYMENT_METHODS_DISCOVERED', [
                'merchant_code' => $merchantCode,
                'amount' => $amount,
                'currency' => $currency,
                'methods' => $ids,
            ]);
            return $ids;
        } catch (\Throwable $e) {
            report($e);
            return [];
        }
    }

    protected function merchantIdentity(array $config): array
    {
        $merchantCode = trim((string)($config['merchant_code'] ?? ''));
        if ($merchantCode === '') {
            throw new RuntimeException('SumUp Merchant Code is missing.');
        }

        $country = '';
        $name = '';

        try {
            $merchantResponse = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(15)
                ->get(rtrim((string)$config['url'], '/').'/v1/merchants/'.rawurlencode($merchantCode));

            if ($merchantResponse->successful()) {
                $merchant = (array)$merchantResponse->json();
                $company = (array)($merchant['company'] ?? []);
                $companyAddress = (array)($company['address'] ?? []);
                $business = (array)($merchant['business_profile'] ?? []);
                $businessAddress = (array)($business['address'] ?? []);
                $country = strtoupper(trim((string)(
                    $merchant['country']
                    ?? $companyAddress['country']
                    ?? $businessAddress['country']
                    ?? ''
                )));
                $name = trim((string)(
                    $business['name']
                    ?? $company['name']
                    ?? $merchant['alias']
                    ?? ''
                ));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        if (!preg_match('/^[A-Z]{2}$/', $country)) {
            try {
                $meResponse = Http::withToken($config['access_token'])
                    ->acceptJson()
                    ->timeout(15)
                    ->get(rtrim((string)$config['url'], '/').'/v0.1/me');
                if ($meResponse->successful()) {
                    $me = (array)$meResponse->json();
                    $profile = (array)($me['merchant_profile'] ?? []);
                    $profileAddress = (array)($profile['address'] ?? []);
                    $country = strtoupper(trim((string)(
                        $profile['country']
                        ?? $profileAddress['country']
                        ?? $me['country']
                        ?? ''
                    )));
                    if ($name === '') {
                        $name = trim((string)(
                            $profile['business_name']
                            ?? $profile['name']
                            ?? $me['display_name']
                            ?? ''
                        ));
                    }
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        if (!preg_match('/^[A-Z]{2}$/', $country)) {
            throw new RuntimeException('Could not resolve the SumUp merchant country required by Swift Checkout. Test the SumUp connection again and make sure the API key belongs to this merchant.');
        }

        return [
            'country_code' => $country,
            'merchant_name' => $name !== '' ? $name : 'PayMyDine',
        ];
    }

    protected function transactionReference(array $body): string
    {
        foreach (['transaction_code', 'transaction_id', 'payment_id'] as $key) {
            $value = trim((string)($body[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        $transactions = $body['transactions'] ?? [];
        if (is_array($transactions)) {
            foreach ($transactions as $transaction) {
                if (!is_array($transaction)) {
                    continue;
                }
                foreach (['transaction_code', 'id', 'transaction_id'] as $key) {
                    $value = trim((string)($transaction[$key] ?? ''));
                    if ($value !== '') {
                        return $value;
                    }
                }
            }
        }

        return '';
    }

    protected function safeHttpMessage(array $body, string $fallback): string
    {
        $errors = $body['errors'] ?? null;
        if (is_array($errors)) {
            $detail = trim((string)($errors['detail'] ?? $errors['message'] ?? ''));
            if ($detail !== '') {
                return $detail;
            }
        }
        $message = trim((string)($body['message'] ?? $body['error'] ?? $body['detail'] ?? ''));
        return $message !== '' ? $message : $fallback;
    }

    private function normalizeEnvironment(string $environment): string
    {
        $environment = strtolower(trim($environment));
        if (!in_array($environment, ['test', 'production'], true)) {
            throw new RuntimeException('Invalid SumUp environment.');
        }
        return $environment;
    }

    private function decodeMetadata($value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || trim($value) === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}
