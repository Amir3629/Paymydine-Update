<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\LocationPlatformContext;

/** PMD_PAYMOB_OMAN_GUEST_CATALOG_R11 */
final class PaymobOmanGuestCatalogService
{
    public function __construct(
        private ?LocationPlatformContext $market = null,
        private ?PaymobOmanConnectionService $connection = null
    ) {
        $this->market = $market ?: new LocationPlatformContext();
        $this->connection = $connection ?: new PaymobOmanConnectionService();
    }

    public function state(?int $locationId = null): array
    {
        $market = $this->market->state($locationId);
        if (($market['country_code'] ?? null) !== CountryPlatformProfileRegistry::OMAN) {
            return [
                'ok' => true,
                'country_code' => $market['country_code'] ?? null,
                'provider' => 'paymob',
                'active_market' => false,
                'methods' => [],
            ];
        }

        $runtimeConfig = $this->connection->runtimeConfig();
        $gate = PaymobOmanRuntimeGate::state($runtimeConfig);
        $provider = $this->connection->providerRecord();
        $providerEnabled = $provider !== null && (bool)$provider->status;
        $readiness = $this->connection->readiness();
        $runtime = (new PaymobOmanRuntimeService($runtimeConfig))->state();
        $profileMethods = (array)($market['profile']['payments']['methods'] ?? []);
        $methods = [];

        foreach ($profileMethods as $code => $definition) {
            $definition = (array)$definition;
            if (!in_array('paymob', (array)($definition['provider_candidates'] ?? []), true)) continue;

            $row = Payments_model::query()->where('code', (string)$code)->first();
            $configuredProvider = strtolower(trim((string)($row->provider_code ?? '')));
            if ($configuredProvider === '' && $row && method_exists($row, 'getConfigData')) {
                $configuredProvider = strtolower(trim((string)($row->getConfigData()['provider_code'] ?? '')));
            }

            $methodRuntime = (array)($runtime['methods'][$code] ?? []);
            $enabled = $providerEnabled
                && ($gate['checkout_allowed'] ?? false)
                && ($readiness['ready'] ?? false)
                && $row !== null
                && (bool)$row->status
                && $configuredProvider === 'paymob'
                && (bool)($methodRuntime['integration_configured'] ?? false);

            $methods[] = [
                'code' => (string)$code,
                'name' => (string)($definition['label'] ?? $code),
                'provider_code' => 'paymob',
                'enabled' => $enabled,
                'priority' => (int)($row->priority ?? 50),
                'canonical_method' => (string)($definition['canonical_method'] ?? ''),
                'integration_configured' => (bool)($methodRuntime['integration_configured'] ?? false),
            ];
        }

        return [
            'ok' => true,
            'country_code' => 'OM',
            'currency' => 'OMR',
            'provider' => 'paymob',
            'active_market' => true,
            'provider_enabled' => $providerEnabled,
            'configuration_ready' => (bool)($readiness['ready'] ?? false),
            'runtime_gate' => $gate,
            'methods' => $methods,
        ];
    }
}
