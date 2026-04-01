<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

class TenantHelper
{
    /**
     * Get a tenant-specific cache key prefix to prevent cache collisions between tenants.
     * 
     * @return string The tenant identifier to use as a cache key prefix
     */
    public static function tenantCachePrefix(): string
    {
        try {
            if (app()->has('request')) {
                $tenant = app('request')->attributes->get('tenant');
                if ($tenant && isset($tenant->database)) {
                    return "tenant:{$tenant->database}:";
                }
            }
        } catch (\Throwable $e) {
            // No request in CLI/queue
        }

        // Fallback: current default DB (tenant after restoreTenantByDatabase, or main)
        try {
            $database = DB::connection()->getDatabaseName();
            return "db:{$database}:";
        } catch (\Exception $e) {
            return "unknown:";
        }
    }
    
    /**
     * Get a segment for tenant-specific storage paths (e.g. logs, combiner, temp).
     * Returns the tenant database name when in tenant context, 'main' otherwise.
     */
    public static function tenantStorageSegment(): string
    {
        try {
            $database = DB::connection()->getDatabaseName();
            $mainDb = config('database.connections.mysql.database', 'paymydine');
            return ($database && $database !== $mainDb) ? $database : 'main';
        } catch (\Throwable $e) {
            return 'main';
        }
    }

    /**
     * Generate a tenant-scoped cache key
     * 
     * @param string $key The original cache key
     * @return string The tenant-scoped cache key
     */
    public static function scopedCacheKey(string $key): string
    {
        return self::tenantCachePrefix() . $key;
    }
}
