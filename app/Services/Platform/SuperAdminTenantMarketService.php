<?php

namespace App\Services\Platform;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PMD_SUPERADMIN_TENANT_MARKET_R3
 *
 * Central-control-plane bridge for applying a country profile to one tenant DB.
 * TenantPlatformProfileService owns the whole in-tenant apply transaction/sequence.
 * This bridge only switches database context and ALWAYS restores central.
 */
final class SuperAdminTenantMarketService
{
    public function applyToTenant($tenant, string $country): array
    {
        $database = trim((string)($tenant->database ?? ''));
        if ($database === '') throw new \InvalidArgumentException('Tenant database is missing.');

        $central = (string)Config::get('database.connections.mysql.database');

        try {
            Config::set('database.connections.mysql.database', $database);
            DB::purge('mysql');
            DB::reconnect('mysql');

            $result = (new TenantPlatformProfileService())->apply($country);
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
