<?php

namespace App\Services\Reservations;

use Admin\Models\Payments_model;
use Throwable;

/**
 * PMD_RESERVATION_GUARANTEE_PROVIDER_REGISTRY_R20
 *
 * Reservation guarantees are deliberately separate from ordinary checkout.
 * A provider may process normal PayMyDine payments without having a certified
 * PayMyDine flow for saving a payment credential and charging it later.
 *
 * "provider_capable" means the PSP product family supports a card/vault-on-file
 * style flow in principle. "adapter_ready" means PayMyDine has implemented and
 * verified that specific reservation-guarantee flow end-to-end.
 */
final class PmdReservationGuaranteeProviderRegistry
{
    public function definitions(): array
    {
        return [
            'stripe' => [
                'label' => 'Stripe',
                'provider_capable' => true,
                'adapter_ready' => true,
                'credential_type' => 'Card',
                'flow' => 'SetupIntent + off-session PaymentIntent',
                'note' => 'Production adapter is implemented in R19/R20.',
            ],
            'vr_payment' => [
                'label' => 'VR Payment',
                'provider_capable' => true,
                'adapter_ready' => false,
                'credential_type' => 'Card registration',
                'flow' => 'Initial customer-initiated registration + later merchant-initiated transaction',
                'note' => 'Provider capability exists, but the PayMyDine reservation adapter still needs certification against the restaurant VR Payment product/Space API.',
            ],
            'worldline' => [
                'label' => 'Worldline',
                'provider_capable' => true,
                'adapter_ready' => false,
                'credential_type' => 'Tokenized card',
                'flow' => 'Card-on-file token + subsequent merchant-initiated payment',
                'note' => 'Provider tokenization exists; PayMyDine reservation-guarantee token/charge adapter is not yet production-certified.',
            ],
            'sumup' => [
                'label' => 'SumUp',
                'provider_capable' => true,
                'adapter_ready' => false,
                'credential_type' => 'Tokenized customer card',
                'flow' => 'Customer card token + later recurring/card-on-file payment',
                'note' => 'Provider tokenization exists; PayMyDine reservation-guarantee adapter is not yet production-certified.',
            ],
            'square' => [
                'label' => 'Square',
                'provider_capable' => true,
                'adapter_ready' => false,
                'credential_type' => 'Card on file',
                'flow' => 'Customer card-on-file + later Payments API charge',
                'note' => 'Provider card-on-file exists. PayMyDine uses Square only in supported Square markets and the reservation-guarantee adapter is not yet production-certified.',
            ],
            'paypal' => [
                'label' => 'PayPal',
                'provider_capable' => true,
                'adapter_ready' => false,
                'credential_type' => 'Vault token',
                'flow' => 'Vaulted payment method + merchant-initiated/reference payment where the merchant account is eligible',
                'note' => 'PayPal vault capability depends on merchant product entitlement. The PayMyDine reservation-guarantee adapter is not yet production-certified.',
            ],
        ];
    }

    public function selectedProvider(): string
    {
        $provider = strtolower(trim((string)setting('reservation_guarantee_provider', 'stripe')));

        return array_key_exists($provider, $this->definitions())
            ? $provider
            : 'stripe';
    }

    public function provider(string $providerCode): array
    {
        $providerCode = strtolower(trim($providerCode));
        $definition = $this->definitions()[$providerCode] ?? [
            'label' => ucfirst(str_replace('_', ' ', $providerCode)),
            'provider_capable' => false,
            'adapter_ready' => false,
            'credential_type' => '',
            'flow' => '',
            'note' => 'Unknown reservation guarantee provider.',
        ];

        return array_merge(
            ['code' => $providerCode],
            $definition,
            $this->runtimeState($providerCode)
        );
    }

    public function all(): array
    {
        $rows = [];

        foreach (array_keys($this->definitions()) as $providerCode) {
            $rows[$providerCode] = $this->provider($providerCode);
        }

        return $rows;
    }

    public function canEnable(string $providerCode): bool
    {
        $provider = $this->provider($providerCode);

        return !empty($provider['provider_capable'])
            && !empty($provider['adapter_ready'])
            && !empty($provider['provider_enabled'])
            && !empty($provider['credentials_ready']);
    }

    public function assertionMessage(string $providerCode): string
    {
        $provider = $this->provider($providerCode);
        $label = (string)($provider['label'] ?? $providerCode);

        if (empty($provider['provider_capable'])) {
            return $label.' does not expose a supported PayMyDine reservation-guarantee capability.';
        }

        if (empty($provider['adapter_ready'])) {
            return $label.' supports a saved-payment-method flow, but its PayMyDine reservation-guarantee adapter is not production-certified yet. Choose a provider marked Ready.';
        }

        if (empty($provider['provider_enabled'])) {
            return $label.' is not enabled in Payments & finance.';
        }

        if (empty($provider['credentials_ready'])) {
            return $label.' is enabled but its required credentials are incomplete for the selected test/live mode.';
        }

        return '';
    }

    private function runtimeState(string $providerCode): array
    {
        try {
            $payment = Payments_model::query()
                ->where('code', $providerCode)
                ->first();

            if (!$payment) {
                return [
                    'provider_record' => false,
                    'provider_enabled' => false,
                    'credentials_ready' => false,
                    'mode' => null,
                ];
            }

            $data = method_exists($payment, 'getConfigData')
                ? (array)$payment->getConfigData()
                : (array)$payment->data;

            return [
                'provider_record' => true,
                'provider_enabled' => (int)$payment->status === 1,
                'credentials_ready' => $this->credentialsReady($providerCode, $data),
                'mode' => $this->providerMode($providerCode, $data),
            ];
        } catch (Throwable $error) {
            logger()->warning('PMD reservation guarantee provider readiness failed', [
                'provider' => $providerCode,
                'message' => $error->getMessage(),
            ]);

            return [
                'provider_record' => false,
                'provider_enabled' => false,
                'credentials_ready' => false,
                'mode' => null,
            ];
        }
    }

    private function providerMode(string $providerCode, array $data): ?string
    {
        if ($providerCode === 'vr_payment') {
            return strtolower(trim((string)($data['mode'] ?? 'test'))) === 'live'
                ? 'live'
                : 'test';
        }

        if (in_array($providerCode, ['stripe', 'paypal', 'square'], true)) {
            return strtolower(trim((string)($data['transaction_mode'] ?? 'test'))) === 'live'
                ? 'live'
                : 'test';
        }

        if ($providerCode === 'worldline') {
            $endpoint = strtolower(trim((string)($data['api_endpoint'] ?? '')));

            return str_contains($endpoint, 'preprod') || str_contains($endpoint, 'test')
                ? 'test'
                : ($endpoint !== '' ? 'live' : null);
        }

        return null;
    }

    private function credentialsReady(string $providerCode, array $data): bool
    {
        if ($providerCode === 'stripe') {
            $live = strtolower(trim((string)($data['transaction_mode'] ?? 'test'))) === 'live';

            return trim((string)($live
                ? ($data['live_publishable_key'] ?? '')
                : ($data['test_publishable_key'] ?? ''))) !== ''
                && trim((string)($live
                    ? ($data['live_secret_key'] ?? '')
                    : ($data['test_secret_key'] ?? ''))) !== '';
        }

        if ($providerCode === 'paypal') {
            $live = strtolower(trim((string)($data['transaction_mode'] ?? 'test'))) === 'live';

            return trim((string)($live
                ? ($data['live_client_id'] ?? '')
                : ($data['test_client_id'] ?? ''))) !== ''
                && trim((string)($live
                    ? ($data['live_client_secret'] ?? '')
                    : ($data['test_client_secret'] ?? ''))) !== '';
        }

        if ($providerCode === 'worldline') {
            return trim((string)($data['api_endpoint'] ?? '')) !== ''
                && trim((string)($data['merchant_id'] ?? '')) !== ''
                && trim((string)($data['api_key_id'] ?? '')) !== ''
                && trim((string)($data['secret_api_key'] ?? '')) !== '';
        }

        if ($providerCode === 'sumup') {
            return trim((string)($data['access_token'] ?? '')) !== '';
        }

        if ($providerCode === 'square') {
            $live = strtolower(trim((string)($data['transaction_mode'] ?? 'test'))) === 'live';

            return trim((string)($live
                ? ($data['live_application_id'] ?? '')
                : ($data['test_application_id'] ?? ''))) !== ''
                && trim((string)($live
                    ? ($data['live_access_token'] ?? '')
                    : ($data['test_access_token'] ?? ''))) !== ''
                && trim((string)($live
                    ? ($data['live_location_id'] ?? '')
                    : ($data['test_location_id'] ?? ''))) !== '';
        }

        if ($providerCode === 'vr_payment') {
            return trim((string)($data['space_id'] ?? '')) !== ''
                && trim((string)($data['user_id'] ?? '')) !== ''
                && trim((string)($data['auth_key'] ?? '')) !== '';
        }

        return false;
    }
}
