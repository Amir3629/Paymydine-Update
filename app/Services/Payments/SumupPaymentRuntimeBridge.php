<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SumupPaymentRuntimeBridge
{
    public function __construct(
        protected ProviderConnectionService $connections
    ) {
    }

    public function activeEnvironment(): ?string
    {
        if (!Schema::hasTable('terminal_provider_configs')) {
            return null;
        }

        $active = DB::table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->where('is_active', 1)
            ->where('connection_status', 'connected')
            ->value('environment');

        if ($active) {
            return strtolower((string)$active);
        }

        $fallback = DB::table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->where('connection_status', 'connected')
            ->orderByRaw("CASE WHEN environment = 'production' THEN 0 ELSE 1 END")
            ->value('environment');

        return $fallback ? strtolower((string)$fallback) : null;
    }

    /**
     * Merge the encrypted tenant provider connection into the legacy runtime
     * shape without persisting the secret into the payments table.
     */
    public function runtimeData(array $fallback = []): array
    {
        $environment = $this->activeEnvironment();
        if (!$environment) {
            return $fallback;
        }

        $credentials = $this->connections->credentials('sumup', $environment);
        if (
            empty($credentials['access_token'])
            || (string)($credentials['connection_status'] ?? '') !== 'connected'
        ) {
            return $fallback;
        }

        return array_merge($fallback, [
            'access_token' => (string)$credentials['access_token'],
            'url' => rtrim((string)($credentials['api_base_url'] ?: 'https://api.sumup.com'), '/'),
            'id_application' => (string)($credentials['merchant_code'] ?? ''),
            'merchant_code' => (string)($credentials['merchant_code'] ?? ''),
            'transaction_mode' => $environment === 'production' ? 'live' : 'test',
            'pmd_provider_environment' => $environment,
            'pmd_secret_source' => 'terminal_provider_configs',
        ]);
    }

    /**
     * Keep only non-secret compatibility/catalogue state in Payments_model.
     * Existing explicit mappings to another provider are never overwritten.
     */
    public function syncCatalogue(string $environment): array
    {
        $environment = strtolower(trim($environment));
        $credentials = $this->connections->credentials('sumup', $environment);

        if (
            empty($credentials['access_token'])
            || (string)($credentials['connection_status'] ?? '') !== 'connected'
        ) {
            return [
                'synced' => false,
                'reason' => 'sumup_environment_not_connected',
                'environment' => $environment,
            ];
        }

        $provider = Payments_model::query()->where('code', 'sumup')->first();
        if (!$provider) {
            $provider = new Payments_model();
            $provider->code = 'sumup';
            $provider->name = 'SumUp';
            $provider->description = 'SumUp payment provider';
            $provider->class_name = '';
        }

        $providerConfig = method_exists($provider, 'getConfigData')
            ? $provider->getConfigData()
            : [];

        $providerConfig = array_merge($providerConfig, [
            'url' => rtrim((string)($credentials['api_base_url'] ?: 'https://api.sumup.com'), '/'),
            'id_application' => (string)($credentials['merchant_code'] ?? ''),
            'merchant_code' => (string)($credentials['merchant_code'] ?? ''),
            'transaction_mode' => $environment === 'production' ? 'live' : 'test',
            'pmd_provider_environment' => $environment,
            'pmd_secret_source' => 'terminal_provider_configs',
        ]);
        unset($providerConfig['access_token']);

        if (method_exists($provider, 'setConfigData')) {
            $provider->setConfigData($providerConfig);
        }
        $provider->status = 1;
        $provider->save();

        $card = Payments_model::query()->where('code', 'card')->first();
        $cardMapped = false;
        $cardOwnerPreserved = false;

        if ($card) {
            $selectedProvider = strtolower(trim((string)($card->provider_code ?? '')));
            $cardConfig = method_exists($card, 'getConfigData')
                ? $card->getConfigData()
                : [];

            $supported = array_values(array_unique(array_filter(array_map(
                fn ($value) => strtolower(trim((string)$value)),
                (array)($cardConfig['supported_providers'] ?? Payments_model::supportedProvidersForMethod('card'))
            ))));

            if (!in_array('sumup', $supported, true)) {
                $supported[] = 'sumup';
            }
            $cardConfig['supported_providers'] = $supported;

            if ($selectedProvider === '' || $selectedProvider === 'sumup') {
                $card->provider_code = 'sumup';
                $card->name = 'Card / Wallet';
                $card->description = 'Secure card or wallet payment';
                $card->status = 1;
                $cardMapped = true;
            } else {
                $cardOwnerPreserved = true;
            }

            if (method_exists($card, 'setConfigData')) {
                $card->setConfigData($cardConfig);
            }
            $card->save();
        }

        return [
            'synced' => true,
            'environment' => $environment,
            'provider_enabled' => true,
            'card_mapped_to_sumup' => $cardMapped,
            'existing_card_provider_preserved' => $cardOwnerPreserved,
            'secret_persisted_to_legacy_table' => false,
        ];
    }
}
