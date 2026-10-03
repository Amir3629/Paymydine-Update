<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
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
     * PMD_TABLE_ACTIVITY_OCCUPANCY_V76
     *
     * Any fresh guest/staff activity tied to a physical table starts or
     * continues a visit. Persist Busy/occupied here so Seen/payment/kitchen
     * state can never free the table; only the explicit Table Free action can.
     *
     * @param mixed $tableId
     * @param string $reason
     * @param mixed $activityAt Optional event timestamp for safe reconciliation
     * @return bool
     */
    public static function markOccupiedFromActivity(
        $tableId,
        $reason = 'table_activity',
        $activityAt = null
    )
    {
        $raw = trim((string)$tableId);
        if (preg_match('/^table\s+(\d+)$/i', $raw, $matches)) {
            $raw = (string)$matches[1];
        }

        if (!preg_match('/^\d+$/', $raw) || (int)$raw < 1) {
            return false;
        }

        $requestedId = (int)$raw;

        try {
            if (
                !Schema::hasTable('tables')
                || !Schema::hasColumn('tables', 'operational_status')
            ) {
                return false;
            }

            $columns = Schema::getColumnListing('tables');
            $primaryKey = in_array('table_id', $columns, true)
                ? 'table_id'
                : (in_array('id', $columns, true) ? 'id' : null);

            if (!$primaryKey) {
                return false;
            }

            return (bool)DB::transaction(function () use (
                $requestedId,
                $reason,
                $activityAt,
                $columns,
                $primaryKey
            ) {
                $row = DB::table('tables')
                    ->where($primaryKey, $requestedId)
                    ->lockForUpdate()
                    ->first();

                if (!$row && in_array('table_no', $columns, true)) {
                    $row = DB::table('tables')
                        ->where('table_no', (string)$requestedId)
                        ->lockForUpdate()
                        ->first();
                }

                if (!$row) {
                    return false;
                }

                $rawRow = (array)$row;
                $resolvedId = (int)($rawRow[$primaryKey] ?? 0);
                if ($resolvedId < 1) {
                    return false;
                }

                $old = strtolower(trim((string)(
                    $rawRow['operational_status'] ?? 'available'
                )));
                if ($old === '' || $old === 'free') {
                    $old = 'available';
                }
                if (in_array($old, ['busy', 'seated', 'in_use', 'in-use'], true)) {
                    $old = 'occupied';
                }

                if ($old === 'occupied') {
                    return true;
                }

                /* PMD_TABLE_ACTIVITY_RECONCILE_V76B
                 * During live reconciliation an older unresolved notification
                 * must never override a newer explicit Free action. Direct
                 * event creation omits $activityAt and remains immediate. */
                if ($activityAt !== null) {
                    $activityTs = strtotime((string)$activityAt) ?: 0;
                    $stateTs = strtotime((string)(
                        $rawRow['operational_status_updated_at'] ?? ''
                    )) ?: 0;

                    if (
                        $activityTs > 0
                        && $stateTs > 0
                        && $activityTs <= $stateTs
                    ) {
                        return false;
                    }
                }

                $updates = [
                    'operational_status' => 'occupied',
                ];

                if (in_array('operational_status_updated_at', $columns, true)) {
                    $updates['operational_status_updated_at'] = now();
                }
                if (in_array('operational_status_updated_by', $columns, true)) {
                    $updates['operational_status_updated_by'] = null;
                }
                if (in_array('updated_at', $columns, true)) {
                    $updates['updated_at'] = now();
                }

                DB::table('tables')
                    ->where($primaryKey, $resolvedId)
                    ->update($updates);

                self::clearTableCache($resolvedId);

                $historyTable = null;
                foreach (
                    ['pmd_table_status_history', 'ti_pmd_table_status_history']
                    as $candidate
                ) {
                    if (Schema::hasTable($candidate)) {
                        $historyTable = $candidate;
                        break;
                    }
                }

                if ($historyTable) {
                    $historyColumns = Schema::getColumnListing($historyTable);
                    $history = array_intersect_key([
                        'table_id' => $resolvedId,
                        'old_status' => $old,
                        'new_status' => 'occupied',
                        'reason' => substr((string)$reason, 0, 100),
                        'actor_id' => null,
                        'order_id' => null,
                        'context' => json_encode([
                            'source' => 'table_activity',
                            'automatic' => true,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ], array_flip($historyColumns));

                    if ($history) {
                        DB::table($historyTable)->insert($history);
                    }
                }

                return true;
            });
        } catch (\Throwable $error) {
            Log::warning('PMD V76 could not mark table occupied from activity', [
                'table_id' => $requestedId,
                'reason' => (string)$reason,
                'message' => $error->getMessage(),
            ]);

            return false;
        }
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