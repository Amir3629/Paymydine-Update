<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

/**
 * Restores and manages tenant context for non-HTTP execution paths
 * (CLI, Queue workers, Scheduler). Does not modify HTTP middleware behavior.
 */
class TenantContextHelper
{
    /**
     * Get active tenant database names from the main database.
     *
     * @return array<string> List of tenant database names
     */
    public static function getActiveTenantDatabases(): array
    {
        $tenants = DB::connection('mysql')
            ->table('tenants')
            ->where('status', 'active')
            ->whereNotNull('database')
            ->where('database', '!=', '')
            ->pluck('database')
            ->all();

        return array_values($tenants);
    }

    /**
     * Restore tenant database connection as the default.
     * Safe to call multiple times; purges and reconnects to avoid stale connection.
     *
     * @param string $database Tenant database name
     * @return void
     */
    public static function restoreTenantByDatabase(string $database): void
    {
        Config::set('database.connections.tenant.database', $database);
        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');
    }

    /**
     * Restore main (landlord) database as the default.
     * Use after per-tenant iteration to avoid leaking tenant context.
     */
    public static function restoreMainConnection(): void
    {
        DB::setDefaultConnection('mysql');
    }

    /**
     * Execute a callback for each active tenant with tenant context restored.
     *
     * @param callable $callback Receives (string $database) and should return void
     * @return void
     */
    public static function eachTenant(callable $callback): void
    {
        $databases = self::getActiveTenantDatabases();

        foreach ($databases as $database) {
            self::restoreTenantByDatabase($database);
            try {
                $callback($database);
            } finally {
                self::restoreMainConnection();
            }
        }
    }
}
