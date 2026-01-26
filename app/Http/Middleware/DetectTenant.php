<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DetectTenant
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
        // Get subdomain from various possible headers
        $subdomain = $request->header('X-Tenant-Subdomain') 
                  ?? $request->header('X-Original-Host') 
                  ?? $this->extractSubdomainFromHost($request->getHost());

        if ($subdomain && $subdomain !== 'www') {
            try {
                // Query the main database for tenant information
                // Note: Use unprefixed table name; Laravel auto-adds prefix from config
                $tenant = DB::connection('mysql')->table('tenants')
                    ->where('domain', 'like', $subdomain . '.%')
                    ->orWhere('domain', $subdomain)
                    ->first();

                if ($tenant && $tenant->database) {
                    // Configure tenant connection
                    Config::set('database.connections.tenant.database', $tenant->database);
                    Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
                    Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
                    Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
                    Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
                    
                    // Reconnect to tenant database
                    DB::purge('tenant');
                    DB::reconnect('tenant');
                    
                    // Set tenant as default connection for this request
                    Config::set('database.default', 'tenant');
                    DB::setDefaultConnection('tenant');
                    
                    // Store tenant info in request and app container
                    $request->attributes->set('tenant', $tenant);
                    app()->instance('tenant', $tenant);
                    
                    Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
                } else {
                    Log::warning("No tenant found for subdomain: {$subdomain}");
                    
                    // Return 404 for unknown tenants
                    return response()->json([
                        'error' => 'Tenant not found',
                        'message' => 'The requested restaurant domain was not found.'
                    ], 404);
                }
            } catch (\Exception $e) {
                Log::error("Error detecting tenant: " . $e->getMessage());
                
                return response()->json([
                    'error' => 'Database Error',
                    'message' => 'Unable to connect to tenant database.'
                ], 500);
            }
        } else {
            // No subdomain provided - for tenant-protected routes, this is an error
            Log::warning("No subdomain detected for tenant-protected route: " . $request->path());
            
            return response()->json([
                'error' => 'Tenant not found',
                'message' => 'No tenant subdomain detected in request.'
            ], 404);
        }

        return $next($request);
    }

    /**
     * Extract subdomain from host header
     *
     * @param string $host
     * @return string|null
     */
    private function extractSubdomainFromHost($host)
    {
        if (!$host) {
            return null;
        }

        $parts = explode('.', $host);
        
        // If we have at least 3 parts (subdomain.domain.tld), return the first part
        if (count($parts) >= 3) {
            return $parts[0];
        }

        // If we have 2 parts, check if it's not the main domain
        if (count($parts) === 2) {
            $mainDomains = ['paymydine.com', 'localhost'];
            if (!in_array($host, $mainDomains)) {
                return $parts[0];
            }
        }

        return null;
    }
} 