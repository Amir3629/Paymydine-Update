<?php

namespace App\Services\Platform;

use App\Services\Integrations\TenantIntegrationSecretSchemaService;
use App\Services\Turkey\TurkeyTenantProvisioningService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PMD_SUPERADMIN_TENANT_MARKET_R6
 *
 * Central-control-plane bridge for applying country/customer-language state to
 * one tenant DB. Every operation switches database context explicitly and
 * ALWAYS restores the central database.
 *
 * Common integration-security provisioning is applied to EVERY tenant market.
 * Türkiye then receives its additional fiscal/market-specific domain.
 */
final class SuperAdminTenantMarketService
{
    public function applyToTenant($tenant, string $country): array
    {
        return $this->withTenantDatabase($tenant, function (string $database) use ($country): array {
            $result = (new TenantPlatformProfileService())->apply($country);
            $customerLanguages = (new TenantCustomerLanguageService())->sync($country);

            $result['customer_languages'] = $customerLanguages['languages'] ?? [];
            $result['warnings'] = array_values(array_unique(array_merge(
                (array)($result['warnings'] ?? []),
                (array)($customerLanguages['warnings'] ?? [])
            )));

            // PMD_COMMON_INTEGRATION_PROVISIONING_R1
            // This is intentionally country-neutral. Germany, Oman, Canada,
            // Türkiye and future markets all receive the same secure reference
            // store. Country-specific domains are layered on top afterwards.
            try {
                $result['integration_security'] = (new TenantIntegrationSecretSchemaService())->ensure('mysql');
            } catch (\Throwable $error) {
                $result['integration_security'] = ['table' => false, 'error' => $error->getMessage()];
                $result['warnings'][] = 'Common integration-security provisioning failed: '.$error->getMessage();
                $result['warnings'] = array_values(array_unique($result['warnings']));
            }

            $countryCode = (new CountryPlatformProfileRegistry())->normalizeCountry($country);
            if ($countryCode === CountryPlatformProfileRegistry::TURKEY) {
                try {
                    $result['turkey'] = (new TurkeyTenantProvisioningService())->ensure(
                        isset($result['default_location_id']) ? (int)$result['default_location_id'] : null
                    );
                } catch (\Throwable $error) {
                    $result['turkey'] = ['ok' => false, 'error' => $error->getMessage()];
                    $result['warnings'][] = 'Türkiye integration provisioning failed: '.$error->getMessage();
                    $result['warnings'] = array_values(array_unique($result['warnings']));
                }
            }

            $result['database'] = $database;

            return $result;
        });
    }

    /**
     * Language-only operation for existing restaurants. It does not apply
     * currency, payment-provider, location, order, reservation, or menu data.
     */
    public function syncCustomerLanguagesToTenant($tenant, string $country): array
    {
        return $this->withTenantDatabase($tenant, function (string $database) use ($country): array {
            $result = (new TenantCustomerLanguageService())->sync($country);
            $result['database'] = $database;
            return $result;
        });
    }

    private function withTenantDatabase($tenant, callable $callback): array
    {
        $database = trim((string)(
            $tenant->database
            ?? $tenant->database_name
            ?? ''
        ));

        if ($database === '') {
            throw new \InvalidArgumentException('Tenant database is missing.');
        }

        $central = (string)Config::get('database.connections.mysql.database');

        try {
            Config::set('database.connections.mysql.database', $database);
            DB::purge('mysql');
            DB::reconnect('mysql');

            return $callback($database);
        } finally {
            Config::set('database.connections.mysql.database', $central);
            DB::purge('mysql');
            DB::reconnect('mysql');

            Log::info('PMD_SUPERADMIN_TENANT_MARKET_RESTORE_CENTRAL', [
                'database' => $central,
                'tenant_database' => $database,
            ]);
        }
    }
}
