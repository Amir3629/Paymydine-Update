<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

class TenantDatabaseMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        // Get tenant from domain
        $tenant = $this->extractTenantFromDomain($request);
        
        if ($tenant) {
            // Find tenant in main database
            $tenantInfo = DB::connection('mysql')->table('ti_tenants')
                ->where('domain', $tenant . '.paymydine.com')
                ->where('status', 'active')
                ->first();
            
            if ($tenantInfo) {
                // Switch to tenant database
                Config::set('database.connections.mysql.database', $tenantInfo->database);
                
                // Reconnect with new database
                DB::purge('mysql');
                DB::reconnect('mysql');
                
                // Store tenant info in request for later use
                $request->attributes->set('tenant', $tenantInfo);
            } else {
                // Tenant not found or inactive
                return response()->json(['error' => 'Restaurant not found or inactive'], 404);
            }
        } else {
            // No tenant detected from domain
            return response()->json(['error' => 'Invalid domain'], 400);
        }
        
        return $next($request);
    }
    
    private function extractTenantFromDomain(Request $request)
    {
        $hostname = $request->getHost();
        $parts = explode('.', $hostname);
        
        // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
        if (count($parts) >= 3 && $parts[1] === 'paymydine') {
            return $parts[0];
        }
        
        // For development/testing, also check for localhost patterns
        if (count($parts) >= 2 && $parts[0] !== 'www') {
            return $parts[0];
        }
        
        return null;
    }
} 