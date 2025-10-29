<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationTenantGuard
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $currentDb = DB::connection()->getDatabaseName();
        
        // Check if we're using a tenant database
        if (strpos($currentDb, 'tenant_') === false && $currentDb !== 'paymydine') {
            Log::error('Notification operation attempted on non-tenant database', [
                'database' => $currentDb,
                'url' => $request->url(),
                'method' => $request->method(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Invalid database context for notification operations'
            ], 500);
        }
        
        // Log notification operations for audit
        if ($request->is('*/notifications*') || $request->is('*/waiter-call*') || 
            $request->is('*/valet-request*') || $request->is('*/table-notes*')) {
            Log::info('Notification operation', [
                'database' => $currentDb,
                'url' => $request->url(),
                'method' => $request->method(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'tenant_id' => $this->extractTenantId($currentDb)
            ]);
        }
        
        return $next($request);
    }
    
    /**
     * Extract tenant ID from database name
     *
     * @param string $dbName
     * @return int|null
     */
    private function extractTenantId($dbName)
    {
        if (preg_match('/tenant_(\d+)_db/', $dbName, $matches)) {
            return (int) $matches[1];
        }
        
        return null;
    }
}