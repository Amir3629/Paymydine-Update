<?php

/**
 * Global Helper Functions
 * These functions are available throughout the application
 */

if (!function_exists('buildCashierTableUrl')) {
    /**
     * Build cashier table URL for opening frontend
     *
     * @param int $locationId
     * @return string|null
     */
    function buildCashierTableUrl($locationId = 1)
    {
        try {
            // First resolve the Cashier table_id
            $cashierTableId = resolveCashierTableId($locationId);
            if (!$cashierTableId) {
                return null;
            }
            
            // Get tenant-aware frontend URL
            // Priority: tenant.frontend_url (DB) → config('app.url') → request scheme+host
            $tenantFrontend = optional(app('tenant'))->frontend_url ?? null;
            $configAppUrl   = config('app.url') ?? null;
            $requestHost    = request()->getSchemeAndHttpHost();
            $frontendUrl    = rtrim($tenantFrontend ?: $configAppUrl ?: $requestHost, '/');
            
            // Build the cashier table URL
            return rtrim($frontendUrl, '/') . '/table/' . $cashierTableId;
            
        } catch (\Throwable $e) {
            \Log::error('Error building cashier URL: ' . $e->getMessage());
            return null;
        }
    }
}

if (!function_exists('resolveCashierTableId')) {
    /**
     * Resolve Cashier table ID for a given location
     *
     * @param int $locationId
     * @return int|string|null
     */
    function resolveCashierTableId($locationId = 1)
    {
        try {
            $cashierTable = \Illuminate\Support\Facades\DB::table('tables')
                ->where('location_id', $locationId)
                ->where(function ($q) {
                    $q->where('table_name', 'LIKE', 'Cashier%')
                      ->orWhere('table_name', 'LIKE', 'cashier%')
                      ->orWhere('table_no', 0);
                })
                ->where('table_status', 1)
                ->first();
                
            if ($cashierTable) {
                return $cashierTable->table_id ?? $cashierTable->table_no;
            }
            
            // Fallback: return 0 (which should exist as cashier table)
            return 0;
            
        } catch (\Throwable $e) {
            \Log::error('Error resolving cashier table: ' . $e->getMessage());
            return null;
        }
    }
}

