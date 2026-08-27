<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Crypt;

/**
 * PMD_PAYMOB_OMAN_CONFIG_SCHEMA_R2
 *
 * One backend definition for Paymob Oman provider settings.
 * Every restaurant/tenant owns its own Paymob merchant configuration.
 * Secret values are encrypted before they are stored in the payment provider row.
 */
final class PaymobOmanConfigSchema
{
    public const PROVIDER_CODE = 'paymob';
    public const COUNTRY_CODE = 'OM';
    public const REGION_CODE = 'OMN';
    public const CURRENCY = 'OMR';
    private const ENCRYPTED_PREFIX = 'pmdenc:v1:';

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

            'test_secret_key' => $this->secret('Test Secret Key', 'Server-side Secret Key used for Intention and post-payment APIs.'),
            'test_public_key' => $this->text('Test Public Key', 'Public Key used only where Paymob checkout requires it.'),
            'test_api_key' => $this->secret('Test API Key', 'Server-side API Key used for transaction inquiry and connection testing.'),
            'test_hmac_secret' => $this->secret('Test HMAC Secret', 'Used only to verify Paymob callbacks. Never expose it to the browser.'),
            'test_integration_id_card' => $this->integrationId('Cards (Oman) - Test Integration ID'),
            'test_integration_id_omannet' => $this->omannetIntegrationId('OmanNet (Oman) - Test Integration ID'),
            'test_integration_id_apple_pay' => $this->integrationId('Apple Pay (Oman) - Test Integration ID'),
            'test_integration_id_google_pay' => $this->integrationId('Google Pay (Oman) - Test Integration ID'),

            'live_secret_key' => $this->secret('Live Secret Key', 'Production Secret Key. Keep blank until Paymob has approved the merchant for Live.'),
            'live_public_key' => $this->text('Live Public Key', 'Production Public Key.'),
            'live_api_key' => $this->secret('Live API Key', 'Production transaction inquiry/API authentication key.'),
            'live_hmac_secret' => $this->secret('Live HMAC Secret', 'Production callback HMAC secret.'),
            'live_integration_id_card' => $this->integrationId('Cards (Oman) - Live Integration ID'),
            'live_integration_id_omannet' => $this->omannetIntegrationId('OmanNet (Oman) - Live Integration ID'),
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
                'help' => 'PMD uses Unified Checkout first. Pixel can be enabled after browser/device QA.',
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
     * Prepare admin input for durable provider storage.
     * Blank secret fields preserve the existing encrypted secret. The special
     * literal __clear__ explicitly removes a secret.
     */
    public function prepareForStorage(array $incoming, array $current = []): array
    {
        $result = $current;
        $knownFields = array_keys($this->fields());

        foreach ($knownFields as $field) {
            if (!array_key_exists($field, $incoming)) continue;

            $value = $incoming[$field];
            if (in_array($field, $this->secretFields(), true)) {
                $text = is_scalar($value) ? trim((string)$value) : '';
                if ($text === '') continue;
                if (strtolower($text) === '__clear__') {
                    $result[$field] = '';
                    continue;
                }
                $result[$field] = $this->encryptSecret($text);
                continue;
            }

            $result[$field] = is_string($value) ? trim($value) : $value;
        }

        $mode = strtolower(trim((string)($result['transaction_mode'] ?? 'test')));
        $result['transaction_mode'] = in_array($mode, ['test', 'live'], true) ? $mode : 'test';
        $result['country_code'] = self::COUNTRY_CODE;
        $result['provider_region'] = self::REGION_CODE;
        $result['api_base_url'] = PaymobApiClient::OMAN_BASE_URL;
        $result['currency'] = self::CURRENCY;

        return $result;
    }

    /** Convert stored encrypted values into the exact runtime configuration. */
    public function runtimeConfig(array $saved): array
    {
        foreach ($this->secretFields() as $field) {
            if (array_key_exists($field, $saved)) {
                $saved[$field] = $this->decryptSecret((string)$saved[$field]);
            }
        }

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

    /** Safe values for the admin browser. No secret is ever returned. */
    public function safeAdminConfig(array $saved): array
    {
        $safe = [];
        foreach ($this->fields() as $field => $definition) {
            if (in_array($field, $this->secretFields(), true)) continue;
            if (array_key_exists($field, $saved)) $safe[$field] = $saved[$field];
            elseif (array_key_exists('default', $definition)) $safe[$field] = $definition['default'];
        }

        $safe['secret_present'] = [];
        foreach ($this->secretFields() as $field) {
            $safe['secret_present'][$field] = trim((string)($saved[$field] ?? '')) !== '';
        }

        return $safe;
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

    private function encryptSecret(string $value): string
    {
        if ($value === '') return '';
        if (str_starts_with($value, self::ENCRYPTED_PREFIX)) return $value;
        return self::ENCRYPTED_PREFIX.Crypt::encryptString($value);
    }

    private function decryptSecret(string $value): string
    {
        if ($value === '') return '';
        if (!str_starts_with($value, self::ENCRYPTED_PREFIX)) {
            // Backward-compatible with any R1/R2 plaintext test value. The next
            // admin save automatically migrates it into encrypted storage.
            return $value;
        }

        try {
            return (string)Crypt::decryptString(substr($value, strlen(self::ENCRYPTED_PREFIX)));
        } catch (\Throwable) {
            return '';
        }
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

    private function omannetIntegrationId(string $label): array
    {
        return [
            'label' => $label,
            'help' => 'Optional. If the Oman merchant dashboard gives OmanNet its own Integration ID, enter it here; otherwise PMD can reuse the Cards Integration ID.',
        ];
    }
}
