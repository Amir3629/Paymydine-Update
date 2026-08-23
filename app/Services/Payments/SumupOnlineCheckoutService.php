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

        $methods = $this->availablePaymentMethods($config, $checkoutId);
        $wallets = $this->walletSettings((string)$config['environment']);

        Log::channel('sumup')->info('SUMUP_WIDGET_CHECKOUT_CREATED', [
            'checkout_id' => $checkoutId,
            'checkout_reference' => $reference,
            'environment' => $config['environment'] ?? null,
            'amount' => $amount,
            'currency' => $currency,
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

        return [
            'google_pay' => [
                'merchant_id' => $merchantId,
                'merchant_name' => $merchantName,
                'configured' => $merchantId !== '' && $merchantName !== '',
            ],
            'apple_pay' => [
                // SumUp/Apple domain onboarding is authoritative. PayMyDine
                // intentionally stores no Apple secret or certificate here.
                'dashboard_domain_onboarding_required' => true,
            ],
        ];
    }

    public function saveWalletSettings(
        string $environment,
        ?string $googlePayMerchantId,
        ?string $googlePayMerchantName
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
        $metadata['online_checkout_mode'] = 'payment_widget';
        $metadata['wallet_settings_updated_at'] = now()->toIso8601String();

        DB::table('terminal_provider_configs')
            ->where('terminal_provider_config_id', $row->terminal_provider_config_id)
            ->update([
                'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);

        return $this->walletSettings($environment);
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

    protected function availablePaymentMethods(array $config, string $checkoutId): array
    {
        try {
            $response = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(15)
                ->get(rtrim((string)$config['url'], '/').'/v0.1/checkouts/'.rawurlencode($checkoutId).'/payment-methods');

            if (!$response->successful()) {
                Log::channel('sumup')->warning('SUMUP_WIDGET_PAYMENT_METHOD_DISCOVERY_FAILED', [
                    'checkout_id' => $checkoutId,
                    'status' => $response->status(),
                ]);
                return ['card'];
            }

            $body = (array)$response->json();
            $items = (array)($body['items'] ?? []);
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
            return $ids !== [] ? $ids : ['card'];
        } catch (\Throwable $e) {
            report($e);
            return ['card'];
        }
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
