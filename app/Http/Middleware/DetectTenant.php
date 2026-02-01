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
        $host = $request->getHost();

        // Localhost / 127.0.0.1: use same tenant as TenantDatabaseMiddleware (domain 127.0.0.1/localhost first, e.g. paymydine)
        // so we don't overwrite with first-by-id (mimoza) and break menu API
        if (in_array($host, ['localhost', '127.0.0.1'], true)) {
            $tenant = $this->resolveLocalhostTenant();
            if ($tenant && $tenant->status === 'active') {
                return $this->applyTenantAndContinue($request, $next, $tenant, 'localhost');
            }
            if ($tenant === null) {
                return $this->jsonWithCors([
                    'error' => 'Tenant not found',
                    'message' => 'No active tenant configured for localhost. Add a tenant with domain 127.0.0.1 or set DEFAULT_TENANT_DATABASE.',
                ], 404);
            }
        }

        $subdomain = $request->header('X-Tenant-Subdomain')
            ?? $request->header('X-Original-Host')
            ?? $this->extractSubdomainFromHost($host);

        if ($subdomain && $subdomain !== 'www') {
            try {
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
                    return $this->jsonWithCors([
                        'error' => 'Tenant not found',
                        'message' => 'The requested restaurant domain was not found.'
                    ], 404);
                }
            } catch (\Exception $e) {
                Log::error("Error detecting tenant: " . $e->getMessage());
                return $this->jsonWithCors([
                    'error' => 'Database Error',
                    'message' => 'Unable to connect to tenant database.'
                ], 500);
            }
        } else {
            // No subdomain provided - for tenant-protected routes, this is an error
            Log::warning("No subdomain detected for tenant-protected route: " . $request->path());
            return $this->jsonWithCors([
                'error' => 'Tenant not found',
                'message' => 'No tenant subdomain detected in request.'
            ], 404);
        }

        return $next($request);
    }

    /**
     * Same resolution as TenantDatabaseMiddleware for localhost: prefer tenant with domain 127.0.0.1/localhost (e.g. paymydine).
     */
    private function resolveLocalhostTenant()
    {
        foreach (['127.0.0.1', 'localhost'] as $domain) {
            $tenant = DB::connection('mysql')->table('tenants')
                ->where('domain', $domain)
                ->where('status', 'active')
                ->first();
            if ($tenant) {
                return $tenant;
            }
        }
        $id = env('DEFAULT_TENANT_ID');
        if ($id !== null && $id !== '') {
            $tenant = DB::connection('mysql')->table('tenants')
                ->where('id', (int) $id)
                ->where('status', 'active')
                ->first();
            if ($tenant) {
                return $tenant;
            }
        }
        $database = env('DEFAULT_TENANT_DATABASE');
        if ($database !== null && $database !== '') {
            $tenant = DB::connection('mysql')->table('tenants')
                ->where('database', $database)
                ->where('status', 'active')
                ->first();
            if ($tenant) {
                return $tenant;
            }
        }
        return DB::connection('mysql')->table('tenants')
            ->where('status', 'active')
            ->orderBy('id')
            ->first();
    }

    private function applyTenantAndContinue(Request $request, Closure $next, $tenant, string $subdomain)
    {
        Config::set('database.connections.tenant.database', $tenant->database);
        Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
        Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
        Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
        DB::purge('tenant');
        DB::reconnect('tenant');
        Config::set('database.default', 'tenant');
        DB::setDefaultConnection('tenant');
        $request->attributes->set('tenant', $tenant);
        app()->instance('tenant', $tenant);
        Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
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

    /**
     * Return JSON response with CORS headers so browser shows real error instead of "blocked by CORS".
     *
     * @param array $data
     * @param int $status
     * @return \Illuminate\Http\JsonResponse
     */
    private function jsonWithCors(array $data, int $status = 404)
    {
        $response = response()->json($data, $status);
        $response->headers->set('Access-Control-Allow-Origin', request()->header('Origin') ?: '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-Subdomain');
        return $response;
    }
} 