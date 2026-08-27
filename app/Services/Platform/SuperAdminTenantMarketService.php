<?php

namespace App\Services\Platform;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PMD_SUPERADMIN_TENANT_MARKET_R2
 *
 * Central-control-plane bridge for applying a country profile to one tenant DB.
 * Always restores the central database connection before returning/throwing.
 */
final class SuperAdminTenantMarketService
{
    public function applyToTenant($tenant, string $country): array
    {
        $database = trim((string)($tenant->database ?? ''));
        if ($database === '') {
            throw new \InvalidArgumentException('Tenant database is missing.');
        }

        $central = (string)Config::get('database.connections.mysql.database');

        try {
            Config::set('database.connections.mysql.database', $database);
            DB::purge('mysql');
            DB::reconnect('mysql');

            $profiles = new CountryPlatformProfileRegistry();
            $profile = $profiles->requireProfile($country);

            // Countries/currencies are safe regional catalogue data. Ensure them
            // before applying the profile so Oman can really become OMR/Asia-Muscat
            // even when the old TastyIgniter template did not ship an OMR row.
            $foundation = (new TenantRegionalFoundationService())->ensure($profile);
            if (!($foundation['ok'] ?? false)) {
                throw new \RuntimeException('Regional country/currency foundation could not be prepared.');
            }

            $result = (new TenantPlatformProfileService($profiles))->apply((string)$profile['country_code']);
            $result['foundation'] = $foundation;
            $result['database'] = $database;
            return $result;
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
