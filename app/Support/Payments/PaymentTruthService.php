<?php

namespace App\Support\Payments;

use Illuminate\Support\Facades\DB;

class PaymentTruthService
{
    protected PaymentVerificationService $verificationService;

    public function __construct(?PaymentVerificationService $verificationService = null)
    {
        $this->verificationService = $verificationService ?: new PaymentVerificationService();
    }

    protected array $officialSupport = [
        'stripe' => [
            'card' => true,
            'apple_pay' => true,
            'google_pay' => true,
            'paypal' => false,
        ],
        'paypal' => [
            'paypal' => true,
            'card' => true,
            'apple_pay' => true,
            'google_pay' => true,
        ],
        'square' => [
            'card' => true,
            'apple_pay' => true,
            'google_pay' => true,
            'paypal' => false,
        ],
        'worldline' => [
            'card' => true,
            'apple_pay' => true,
            'google_pay' => true,
            'paypal' => true,
        ],
        'sumup' => [
            'card' => true,
            'apple_pay' => false,
            'google_pay' => false,
            'paypal' => false,
        ],
        'cod' => [
            'cod' => true,
        ],
    ];

    public function evaluatePair(string $provider, string $method): array
    {
        $provider = strtolower(trim($provider));
        $method = PaymentMethodNormalizer::normalizeMethod($method) ?? strtolower(trim($method));

        $officiallySupported = (bool)($this->officialSupport[$provider][$method] ?? false);
        $implemented = $this->isImplemented($provider, $method);
        $credentialsReady = $this->credentialsReady($provider, $method);
        $verificationReady = $this->verificationService->isVerificationPathReady($provider, $method);

        return [
            'provider' => $provider,
            'method' => $method,
            'officially_supported' => $officiallySupported,
            'implemented' => $implemented,
            'credentials_ready' => $credentialsReady,
            'verification_ready' => $verificationReady,
            'allowed_publicly_now' => $officiallySupported
                && $implemented
                && $credentialsReady
                && $verificationReady,
        ];
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    public function listPubliclyAllowedMethods(): array
    {
        $payments = DB::table('payments')
            ->where('status', 1)
            ->orderBy('priority')
            ->get(['payment_id', 'code', 'name', 'priority', 'data']);

        $result = [];

        foreach ($payments as $payment) {
            $rawData = is_array($payment->data) ? $payment->data : json_decode((string)($payment->data ?? '{}'), true);
            if (!is_array($rawData)) {
                $rawData = [];
            }

            $provider = $this->resolveProviderCode((string)$payment->code, $rawData);
            $method = PaymentMethodNormalizer::methodFromPaymentCode((string)$payment->code)
                ?? PaymentMethodNormalizer::normalizeMethod($rawData['method_code'] ?? null);

            if (!$provider || !$method) {
                continue;
            }

            $truth = $this->evaluatePair($provider, $method);
            if (!$truth['allowed_publicly_now']) {
                continue;
            }

            $publicCode = PaymentMethodNormalizer::normalizePublicCode((string)$payment->code, $method);
            if (!$publicCode) {
                continue;
            }

            $result[] = [
                'code' => $publicCode,
                'name' => (string)$payment->name,
                'priority' => (int)$payment->priority,
                'provider_code' => $provider,
                'method_code' => $method,
            ];
        }

        return collect($result)
            ->unique('code')
            ->sortBy('priority')
            ->values()
            ->all();
    }

    public function resolveProviderCode(string $paymentCode, array $data = []): ?string
    {
        $explicit = strtolower(trim((string)($data['provider_code'] ?? '')));
        if (in_array($explicit, ['stripe', 'paypal', 'square', 'worldline', 'sumup', 'cod'], true)) {
            return $explicit;
        }

        $code = strtolower(trim($paymentCode));

        return match ($code) {
            'stripe', 'apple_pay', 'google_pay' => 'stripe',
            'paypal', 'paypalexpress', 'paypal_express' => 'paypal',
            'square' => 'square',
            'worldline' => 'worldline',
            'sumup', 'sum_up' => 'sumup',
            'cod', 'cash' => 'cod',
            default => null,
        };
    }

    protected function isImplemented(string $provider, string $method): bool
    {
        $implementedPairs = [
            'stripe:card' => true,
            'paypal:paypal' => true,
        ];

        return (bool)($implementedPairs[$provider.':'.$method] ?? false);
    }

    protected function credentialsReady(string $provider, string $method): bool
    {
        if ($provider === 'stripe' && $method === PaymentMethodNormalizer::METHOD_CARD) {
            $row = DB::table('payments')
                ->where('code', 'stripe')
                ->where('status', 1)
                ->orderByDesc('payment_id')
                ->first();

            if (!$row) {
                return false;
            }

            $data = json_decode((string)($row->data ?? '{}'), true);
            if (!is_array($data)) {
                $data = [];
            }

            $mode = (string)($data['transaction_mode'] ?? 'test');
            $publishableKey = $mode === 'live'
                ? (string)($data['live_publishable_key'] ?? '')
                : (string)($data['test_publishable_key'] ?? '');
            $secretKey = $mode === 'live'
                ? (string)($data['live_secret_key'] ?? '')
                : (string)($data['test_secret_key'] ?? '');

            return $publishableKey !== '' && $secretKey !== '';
        }

        if ($provider === 'paypal' && $method === PaymentMethodNormalizer::METHOD_PAYPAL) {
            $row = DB::table('payments')
                ->whereIn('code', ['paypalexpress', 'paypal'])
                ->where('status', 1)
                ->orderByDesc('payment_id')
                ->first();

            if (!$row) {
                return false;
            }

            $data = json_decode((string)($row->data ?? '{}'), true);
            if (!is_array($data)) {
                $data = [];
            }

            $mode = (string)($data['transaction_mode'] ?? ($data['api_mode'] ?? 'test'));
            if ($mode === 'sandbox') {
                $mode = 'test';
            }

            $clientId = $mode === 'live'
                ? (string)($data['live_client_id'] ?? '')
                : (string)($data['test_client_id'] ?? '');

            $clientSecret = $mode === 'live'
                ? (string)($data['live_client_secret'] ?? '')
                : (string)($data['test_client_secret'] ?? '');

            return $clientId !== '' && $clientSecret !== '';
        }

        return false;
    }
}
