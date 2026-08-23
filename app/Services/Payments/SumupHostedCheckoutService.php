<?php

namespace App\Services\Payments;

use App\Services\TerminalPayments\SumupTenantConnectionService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SumupHostedCheckoutService
{
    public function __construct(
        protected SumupTenantConnectionService $connections
    ) {
    }

    public function create(array $payload): array
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
        $reference = $orderId > 0
            ? 'PMD-ORD-'.$orderId.'-'.bin2hex(random_bytes(6))
            : 'PMD-GUEST-'.bin2hex(random_bytes(8));

        $request = [
            'checkout_reference' => $reference,
            'amount' => $amount,
            'currency' => $currency,
            'merchant_code' => (string)$config['merchant_code'],
            'description' => trim((string)($payload['description'] ?? 'PayMyDine order')) ?: 'PayMyDine order',
            'redirect_url' => $returnUrl,
            'hosted_checkout' => [
                'enabled' => true,
            ],
        ];

        $response = Http::withToken($config['access_token'])
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->post(rtrim((string)$config['url'], '/').'/v0.1/checkouts', $request);

        $body = (array)$response->json();
        if (!$response->successful()) {
            throw new RuntimeException($this->safeHttpMessage($body, 'SumUp could not start the payment.'));
        }

        $checkoutId = trim((string)($body['id'] ?? ''));
        if ($checkoutId === '') {
            throw new RuntimeException('SumUp did not return a checkout ID.');
        }

        $redirectUrl = $this->checkoutUrl($body);
        if ($redirectUrl === '') {
            throw new RuntimeException('SumUp did not return a hosted checkout URL.');
        }

        // Hosted Checkout is the owner of wallet presentation. Discovering the
        // checkout-specific allow-list is diagnostic only: it proves which
        // methods SumUp says are eligible without duplicating Apple Pay / Google
        // Pay as separate PayMyDine methods or blocking a valid checkout if the
        // optional discovery request is unavailable.
        $availablePaymentMethods = $this->availablePaymentMethods($config, $checkoutId, $amount, $currency);

        Log::channel('sumup')->info('SUMUP_HOSTED_CHECKOUT_CREATED', [
            'environment' => (string)($config['environment'] ?? ''),
            'merchant_code' => (string)$config['merchant_code'],
            'checkout_id' => $checkoutId,
            'checkout_reference' => $reference,
            'available_payment_methods' => $availablePaymentMethods,
        ]);

        return [
            'success' => true,
            'provider' => 'sumup',
            'environment' => (string)($config['environment'] ?? ''),
            'checkout_id' => $checkoutId,
            'checkout_reference' => $reference,
            'redirect_url' => $redirectUrl,
            'hosted_checkout_url' => $redirectUrl,
            'status' => strtolower(trim((string)($body['status'] ?? 'pending'))) ?: 'pending',
            'available_payment_methods' => $availablePaymentMethods,
            'wallets_presented_by' => 'sumup_hosted_checkout',
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

    protected function availablePaymentMethods(array $config, string $checkoutId, float $amount, string $currency): array
    {
        $baseUrl = rtrim((string)$config['url'], '/');
        $token = (string)$config['access_token'];
        $methods = [];

        // Prefer the checkout-scoped endpoint because eligibility can depend on
        // the concrete checkout. Fall back to the merchant-scoped endpoint used
        // by newer SumUp API docs if the checkout endpoint is unavailable.
        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(12)
            ->get($baseUrl.'/v0.1/checkouts/'.rawurlencode($checkoutId).'/payment-methods');

        if (!$response->successful()) {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(12)
                ->get(
                    $baseUrl.'/v0.1/merchants/'.rawurlencode((string)$config['merchant_code']).'/payment-methods',
                    ['amount' => $amount, 'currency' => $currency]
                );
        }

        if (!$response->successful()) {
            Log::channel('sumup')->warning('SUMUP_PAYMENT_METHOD_DISCOVERY_UNAVAILABLE', [
                'checkout_id' => $checkoutId,
                'status' => $response->status(),
                'body' => mb_substr((string)$response->body(), 0, 800),
            ]);
            return [];
        }

        $json = (array)$response->json();
        $items = $json['items'] ?? $json['available_payment_methods'] ?? [];
        if (!is_array($items)) {
            return [];
        }

        foreach ($items as $item) {
            if (is_string($item)) {
                $id = strtolower(trim($item));
            } elseif (is_array($item)) {
                $id = strtolower(trim((string)($item['id'] ?? $item['code'] ?? '')));
            } else {
                $id = '';
            }

            if ($id !== '' && !in_array($id, $methods, true)) {
                $methods[] = $id;
            }
        }

        return $methods;
    }

    protected function checkoutUrl(array $body): string
    {
        foreach (['hosted_checkout_url', 'checkout_url', 'redirect_url', 'url'] as $key) {
            $value = trim((string)($body[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        $links = $body['links'] ?? [];
        if (!is_array($links)) {
            return '';
        }

        foreach ($links as $link) {
            if (!is_array($link)) {
                continue;
            }

            $href = trim((string)($link['href'] ?? ''));
            if ($href !== '') {
                return $href;
            }
        }

        return '';
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

        foreach (['detail', 'message', 'error', 'title'] as $key) {
            $message = trim((string)($body[$key] ?? ''));
            if ($message !== '') {
                return $message;
            }
        }

        return $fallback;
    }
}
