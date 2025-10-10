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
        $path = $request->path();
        $host = $request->getHost();
        
        // Allow-list: Admin/central paths that don't require tenant context
        $allowedPaths = [
            'admin/login', 'admin/sign', 'admin/signout', 'admin/sessions',
            'new', 'index', 'settings',
            'superadmin', 'tenants',
            'admin/_assets',
        ];
        
        foreach ($allowedPaths as $allowed) {
            if (str_starts_with($path, $allowed) || $path === 'admin') {
                Log::debug('[DetectTenant] Skipping for admin/central path', [
                    'path' => $path,
                    'host' => $host
                ]);
                return $next($request);
            }
        }
        
        // Skip tenant detection for localhost without subdomain (development)
        if (env('APP_ENV') !== 'production') {
            $localHosts = ['localhost', '127.0.0.1', 'paymydine.test'];
            if (in_array($host, $localHosts) || (strpos($host, ':') !== false && str_starts_with($host, '127.0.0.1'))) {
                Log::debug('[DetectTenant] Skipping for localhost without subdomain', [
                    'host' => $host,
                    'path' => $path
                ]);
                return $next($request);
            }
        }
        
        // Get subdomain from various possible headers
        $subdomain = $request->header('X-Tenant-Subdomain') 
                  ?? $request->header('X-Original-Host') 
                  ?? $this->extractSubdomainFromHost($host);

        if ($subdomain && $subdomain !== 'www') {
            try {
                // Query the main database for tenant information
                $tenant = DB::connection('mysql')->table('ti_tenants')
                    ->where('domain', 'like', $subdomain . '.%')
                    ->orWhere('domain', $subdomain)
                    ->first();

                if ($tenant && $tenant->database) {
                    // Log resolved tenant details
                    Log::info('[Tenant] Resolved tenant', [
                        'subdomain' => $subdomain,
                        'domain' => $tenant->domain ?? 'N/A',
                        'database' => $tenant->database,
                        'db_host' => $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')),
                        'db_username' => $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')),
                    ]);
                    
                    // Configure tenant connection
                    $tenantConfig = [
                        'driver' => 'mysql',
                        'database' => $tenant->database,
                        'host' => $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')),
                        'port' => $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')),
                        'username' => $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')),
                        'password' => $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')),
                        'charset' => 'utf8mb4',
                        'collation' => 'utf8mb4_unicode_ci',
                        'prefix' => env('DB_PREFIX', 'ti_'),
                        'strict' => false,
                    ];
                    
                    Config::set('database.connections.tenant', $tenantConfig);
                    
                    // Reconnect to tenant database
                    DB::purge('tenant');
                    
                    try {
                        DB::reconnect('tenant');
                        // Test connection
                        $pdo = DB::connection('tenant')->getPdo();
                        Log::info('[Tenant] Connected OK', [
                            'database' => $tenant->database,
                            'pdo_connected' => !is_null($pdo),
                        ]);
                    } catch (\Exception $connEx) {
                        Log::error('[Tenant] Connection FAIL', [
                            'database' => $tenant->database,
                            'host' => $tenantConfig['host'],
                            'username' => $tenantConfig['username'],
                            'error' => $connEx->getMessage(),
                        ]);
                        
                        return response()->json([
                            'error' => 'Database Error',
                            'message' => 'Unable to connect to tenant database.',
                            'details' => $connEx->getMessage()
                        ], 500);
                    }
                    
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
            // No subdomain provided, use default connection
            Log::info("No subdomain detected, using default connection");
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