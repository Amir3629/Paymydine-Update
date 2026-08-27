<?php

namespace App\Services\Payments;

/**
 * PMD_PAYMOB_OMAN_CONFIG_SCHEMA_R1
 *
 * One backend definition for Paymob Oman provider settings.
 * Pmdfinance may render this schema later; Payments.php remains save/validation
 * authority. No credential in this class is a global/shared PMD credential.
 * Every restaurant/tenant stores its own merchant configuration.
 */
final class PaymobOmanConfigSchema
{
    public const PROVIDER_CODE = 'paymob';
    public const COUNTRY_CODE = 'OM';
    public const REGION_CODE = 'OMN';
    public const CURRENCY = 'OMR';

    public function fields(): array
    {
        return [
            'transaction_mode' => [
                'label' => 'Environment',
                'type' => 'select',
                'default' => 'test',
                'options' => [
                    'test' => 'Test / Sandbox',
                    'live' => 'Live / Production',
                ],
                'help' => 'Paymob Oman uses the same regional API host for Test and Live. Credentials and Integration IDs choose the environment.',
            ],
            'country_code' => [
                'label' => 'Market',
                'readonly' => true,
                'default' => self::COUNTRY_CODE,
                'help' => 'This Paymob provider profile is for restaurants located in Oman.',
            ],
            'api_base_url' => [
                'label' => 'Oman API Base URL',
                'readonly' => true,
                'default' => PaymobApiClient::OMAN_BASE_URL,
            ],
            'currency' => [
                'label' => 'Settlement / checkout currency',
                'readonly' => true,
                'default' => self::CURRENCY,
                'help' => 'OMR uses 3 minor digits: 1 OMR = 1000 baisa.',
            ],

            'test_secret_key' => $this->secret('Test Secret Key', 'sk_test_*; used server-side for Intention and post-payment APIs.'),
            'test_public_key' => $this->text('Test Public Key', 'pk_test_*; safe to use only where Paymob checkout requires the public key.'),
            'test_api_key' => $this->secret('Test API Key', 'Used server-side for Transaction Inquiry authentication and connection testing.'),
            'test_hmac_secret' => $this->secret('Test HMAC Secret', 'Used only to verify Paymob callbacks. Never expose it to the browser.'),
            'test_integration_id_card' => $this->integrationId('Cards (Oman) - Test Integration ID'),
            'test_integration_id_omannet' => $this->integrationId('OmanNet (Oman) - Test Integration ID'),
            'test_integration_id_apple_pay' => $this->integrationId('Apple Pay (Oman) - Test Integration ID'),
            'test_integration_id_google_pay' => $this->integrationId('Google Pay (Oman) - Test Integration ID'),

            'live_secret_key' => $this->secret('Live Secret Key', 'Production Secret Key. Keep blank until Paymob has approved the merchant for Live.'),
            'live_public_key' => $this->text('Live Public Key', 'Production Public Key.'),
            'live_api_key' => $this->secret('Live API Key', 'Production Transaction Inquiry/API authentication key.'),
            'live_hmac_secret' => $this->secret('Live HMAC Secret', 'Production callback HMAC secret.'),
            'live_integration_id_card' => $this->integrationId('Cards (Oman) - Live Integration ID'),
            'live_integration_id_omannet' => $this->integrationId('OmanNet (Oman) - Live Integration ID'),
            'live_integration_id_apple_pay' => $this->integrationId('Apple Pay (Oman) - Live Integration ID'),
            'live_integration_id_google_pay' => $this->integrationId('Google Pay (Oman) - Live Integration ID'),

            'checkout_experience' => [
                'label' => 'Checkout experience',
                'type' => 'select',
                'default' => 'unified_checkout',
                'options' => [
                    'unified_checkout' => 'Unified Checkout (recommended first)',
                    'pixel' => 'Pixel embedded checkout (enable after QA)',
                ],
                'help' => 'PMD R1 uses Unified Checkout first. Pixel can be enabled after browser/device QA.',
            ],
            'connection_status' => [
                'label' => 'Connection status',
                'readonly' => true,
                'default' => 'Not tested',
            ],
            'last_tested_at' => [
                'label' => 'Last test time',
                'readonly' => true,
            ],
        ];
    }

    public function secretFields(): array
    {
        return [
            'test_secret_key',
            'test_api_key',
            'test_hmac_secret',
            'live_secret_key',
            'live_api_key',
            'live_hmac_secret',
        ];
    }

    public function integrationIdFields(): array
    {
        return [
            'test_integration_id_card',
            'test_integration_id_omannet',
            'test_integration_id_apple_pay',
            'test_integration_id_google_pay',
            'live_integration_id_card',
            'live_integration_id_omannet',
            'live_integration_id_apple_pay',
            'live_integration_id_google_pay',
        ];
    }

    /**
     * Convert a saved provider payload into the exact configuration consumed by
     * PaymobApiClient. Direct legacy names remain accepted by the client as fallback.
     */
    public function runtimeConfig(array $saved): array
    {
        $mode = strtolower(trim((string)($saved['transaction_mode'] ?? $saved['mode'] ?? 'test')));
        if (!in_array($mode, ['test', 'live'], true)) $mode = 'test';

        return array_merge($saved, [
            'mode' => $mode,
            'transaction_mode' => $mode,
            'country_code' => self::COUNTRY_CODE,
            'region_code' => self::REGION_CODE,
            'api_base_url' => PaymobApiClient::OMAN_BASE_URL,
            'currency' => self::CURRENCY,
        ]);
    }

    public function validationRules(): array
    {
        $rules = [
            'transaction_mode' => ['nullable', 'in:test,live'],
            'checkout_experience' => ['nullable', 'in:unified_checkout,pixel'],
            'test_secret_key' => ['nullable', 'string', 'max:4096'],
            'test_public_key' => ['nullable', 'string', 'max:4096'],
            'test_api_key' => ['nullable', 'string', 'max:4096'],
            'test_hmac_secret' => ['nullable', 'string', 'max:4096'],
            'live_secret_key' => ['nullable', 'string', 'max:4096'],
            'live_public_key' => ['nullable', 'string', 'max:4096'],
            'live_api_key' => ['nullable', 'string', 'max:4096'],
            'live_hmac_secret' => ['nullable', 'string', 'max:4096'],
        ];

        foreach ($this->integrationIdFields() as $field) {
            $rules[$field] = ['nullable', 'integer', 'min:1'];
        }

        return $rules;
    }

    /**
     * Credentials can be saved while onboarding is incomplete. Runtime readiness is
     * intentionally stricter than form save validation.
     */
    public function readiness(array $saved): array
    {
        $config = $this->runtimeConfig($saved);
        $client = new PaymobApiClient($config);
        $structural = $client->validateConfiguration(true);
        $state = (new PaymobOmanRuntimeService($config))->state();

        return [
            'ready' => (bool)($structural['ok'] ?? false),
            'mode' => $config['mode'],
            'structural' => $structural,
            'methods' => $state['methods'],
        ];
    }

    private function secret(string $label, string $help): array
    {
        return ['label' => $label, 'secret' => true, 'help' => $help];
    }

    private function text(string $label, string $help): array
    {
        return ['label' => $label, 'help' => $help];
    }

    private function integrationId(string $label): array
    {
        return [
            'label' => $label,
            'help' => 'Leave blank when Paymob has not enabled this payment method for this merchant account.',
        ];
    }
}
