=== app/Helpers/TenantHelper.php ===
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


=== app/Helpers/TableHelper.php ===
<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Helpers\TenantHelper;

class TableHelper
{
    /**
     * Get table information for notifications
     *
     * @param string $tableId
     * @return array|null
     */
    public static function getTableInfo($tableId)
    {
        // Use tenant-scoped cache key to avoid cross-tenant cache collisions
        $cacheKey = TenantHelper::scopedCacheKey("table_info_{$tableId}");
        return Cache::remember($cacheKey, 300, function() use ($tableId) {
            $table = DB::table('tables')
                ->where('table_id', $tableId)
                ->where('table_status', 1)
                ->first();
                
            if (!$table) {
                return null;
            }
            
            return [
                'table_id' => $table->table_id,
                'table_name' => $table->table_name,
                'qr_code' => $table->qr_code,
                'min_capacity' => $table->min_capacity,
                'max_capacity' => $table->max_capacity,
                'is_joinable' => $table->is_joinable,
                'priority' => $table->priority
            ];
        });
    }
    
    /**
     * Validate table exists and is active
     *
     * @param string $tableId
     * @return bool
     */
    public static function validateTable($tableId)
    {
        return DB::table('tables')
            ->where('table_id', $tableId)
            ->where('table_status', 1)
            ->exists();
    }

    /**
     * Get table name by ID
     *
     * @param string $tableId
     * @return string|null
     */
    public static function getTableName($tableId)
    {
        $tableInfo = self::getTableInfo($tableId);
        return $tableInfo ? $tableInfo['table_name'] : null;
    }

    /**
     * Clear table cache
     *
     * @param string $tableId
     * @return void
     */
    public static function clearTableCache($tableId)
    {
        $cacheKey = TenantHelper::scopedCacheKey("table_info_{$tableId}");
        Cache::forget($cacheKey);
    }
}