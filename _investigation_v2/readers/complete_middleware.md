=== app/Http/Kernel.php ===
<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's route middleware groups.
     * 
     * CRITICAL FIX: Override to enable CSRF protection.
     * TastyIgniter's Flame Kernel has CSRF commented out (vendor/tastyigniter/flame/src/Foundation/Http/Kernel.php:56)
     * This causes "random logout" issues when CSRF tokens expire/mismatch.
     *
     * @var array
     */
    protected $middlewareGroups = [
        'web' => [
            \Igniter\Flame\Foundation\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,  // FIX: Enable CSRF middleware
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Igniter\Flame\Translation\Middleware\Localization::class,
        ],

        'api' => [
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    /**
     * The application's route middleware.
     *
     * These middleware may be assigned to groups or used individually.
     *
     * @var array
     */
    protected $routeMiddleware = [
        'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'bindings' => \Illuminate\Routing\Middleware\SubstituteBindings::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
	'detect.tenant' => \App\Http\Middleware\DetectTenant::class,
	'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class,
        'cors' => \App\Http\Middleware\CorsMiddleware::class,
    ];
} 


=== app/Http/Middleware/DetectTenant.php ===
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
                $tenant = DB::connection('mysql')->table('ti_tenants')
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

=== app/Http/Middleware/TenantDatabaseMiddleware.php ===
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