<?php

namespace App\Services\Reservations;

use Admin\Models\Payments_model;
use App\Services\TerminalPayments\SumupTenantConnectionService;
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
                'credential_type' => 'Saved payment method',
                'methods' => ['card', 'apple_pay', 'google_pay'],
                'flow' => 'SetupIntent + Payment Element + later off-session PaymentIntent',
                'note' => 'Card, Apple Pay and Google Pay are routed through Stripe SetupIntent and stored-credential charging.',
            ],
            'sumup' => [
                'label' => 'SumUp',
                'provider_capable' => true,
                'adapter_ready' => true,
                'credential_type' => 'Tokenized customer card',
                'methods' => ['card'],
                'flow' => 'Customer + SETUP_RECURRING_PAYMENT checkout + saved card token',
                'note' => 'SumUp card tokenization can show a temporary authorization which SumUp reimburses immediately.',
            ],
            'paypal' => [
                'label' => 'PayPal',
                'provider_capable' => true,
                'adapter_ready' => true,
                'credential_type' => 'Vault token',
                'methods' => ['paypal'],
                'flow' => 'PayPal Vault setup token + permanent payment token + merchant-initiated order',
                'note' => 'Requires PayPal Vault / stored-payment entitlement on the merchant account.',
            ],
            'vr_payment' => [
                'label' => 'VR Payment',
                'provider_capable' => true,
                'adapter_ready' => true,
                'credential_type' => 'VR Payment token',
                'methods' => ['card'],
                'flow' => 'VR token + token-update transaction + later process-without-interaction',
                'note' => 'Uses the restaurant VR Payment Space and its tokenization capability.',
            ],
            'worldline' => [
                'label' => 'Worldline',
                'provider_capable' => true,
                'adapter_ready' => true,
                'credential_type' => 'Worldline token',
                'methods' => ['card'],
                'flow' => 'Hosted Tokenization Page + token + later merchant-initiated unscheduled card-on-file payment',
                'note' => 'Uses Worldline Hosted Tokenization so PayMyDine never receives raw card data.',
            ],
        ];
    }

    public function methodDefinitions(): array
    {
        return [
            'card' => [
                'label' => 'Card',
                'providers' => ['stripe', 'sumup', 'vr_payment', 'worldline'],
            ],
            'apple_pay' => [
                'label' => 'Apple Pay',
                'providers' => ['stripe'],
            ],
            'google_pay' => [
                'label' => 'Google Pay',
                'providers' => ['stripe'],
            ],
            'paypal' => [
                'label' => 'PayPal',
                'providers' => ['paypal'],
            ],
        ];
    }

    public function methodsForProvider(string $providerCode): array
    {
        $provider = $this->provider($providerCode);

        return array_values(array_filter(
            array_map(
                static fn ($method): string => strtolower(trim((string)$method)),
                (array)($provider['methods'] ?? [])
            ),
            fn (string $method): bool => array_key_exists(
                $method,
                $this->methodDefinitions()
            )
        ));
    }

    public function selectedMethods(): array
    {
        $raw = app(PmdReservationGuaranteeSettings::class)
            ->string(
                'reservation_guarantee_methods',
                'card,apple_pay,google_pay,paypal'
            );

        $selected = array_values(array_unique(array_filter(array_map(
            static fn ($method): string => strtolower(trim($method)),
            explode(',', $raw)
        ))));

        return array_values(array_intersect(
            $selected,
            array_keys($this->methodDefinitions())
        ));
    }

    public function enabledMethodsForProvider(string $providerCode): array
    {
        return array_values(array_intersect(
            $this->methodsForProvider($providerCode),
            $this->selectedMethods()
        ));
    }

    public function selectedProvider(): string
    {
        $provider = strtolower(trim(
            app(PmdReservationGuaranteeSettings::class)
                ->string('reservation_guarantee_provider', 'stripe')
        ));

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

            $credentialsReady = $this->credentialsReady($providerCode, $data);
            $mode = $this->providerMode($providerCode, $data);

            if ($providerCode === 'sumup') {
                try {
                    $active = app(SumupTenantConnectionService::class)
                        ->activeConfig();
                    if (!empty($active['ready'])) {
                        $credentialsReady = true;
                        $mode = (string)($active['environment'] ?? $mode);
                    }
                } catch (Throwable $ignored) {
                }
            }

            return [
                'provider_record' => true,
                'provider_enabled' => (int)$payment->status === 1,
                'credentials_ready' => $credentialsReady,
                'mode' => $mode,
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

        if ($providerCode === 'vr_payment') {
            return trim((string)($data['space_id'] ?? '')) !== ''
                && trim((string)($data['user_id'] ?? '')) !== ''
                && trim((string)($data['auth_key'] ?? '')) !== '';
        }

        return false;
    }
}
