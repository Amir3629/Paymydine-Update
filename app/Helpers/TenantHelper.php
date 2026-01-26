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
        $request = app('request');
        $tenant = $request->attributes->get('tenant');
        
        // If tenant is available from the middleware, use its database name
        if ($tenant && isset($tenant->database)) {
            return "tenant:{$tenant->database}:";
        }
        
        // Fallback to current database name
        try {
            $database = DB::connection()->getDatabaseName();
            return "db:{$database}:";
        } catch (\Exception $e) {
            // Last resort fallback
            return "unknown:";
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
