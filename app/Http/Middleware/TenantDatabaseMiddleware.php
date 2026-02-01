<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

/**
 * Same behavior as Flame's TenantDatabaseMiddleware, but for localhost/127.0.0.1
 * uses the first active tenant so the frontend (e.g. localhost:3001) can call the API.
 */
class TenantDatabaseMiddleware
{
    protected static $tenantSwitched = false;

    public function handle($request, Closure $next)
    {
        if ($request->is('assets/*') || $request->is('images/*')) {
            return $next($request);
        }

        if ($request->attributes->get('tenantSwitched', false)) {
            return $next($request);
        }

        $request->attributes->set('tenantSwitched', true);
        $host = $request->getHost();

        if (!$host) {
            return $next($request);
        }

        // Localhost / 127.0.0.1: prefer tenant with domain 127.0.0.1 or localhost (e.g. paymydine), then env/default
        if (in_array($host, ['localhost', '127.0.0.1'], true)) {
            $tenant = $this->resolveLocalhostTenant($host);
        } else {
            $tenant = DB::connection('mysql')->table('tenants')
                ->where('domain', $host)
                ->first();
        }

        if (!$tenant || $tenant->status !== 'active') {
            return $this->tenantNotFoundResponse(403);
        }

        if (!empty($tenant->database)) {
            Config::set('database.connections.tenant.database', $tenant->database);
            Config::set('database.connections.tenant.host', $tenant->db_host ?? config('database.connections.mysql.host'));
            Config::set('database.connections.tenant.port', $tenant->db_port ?? config('database.connections.mysql.port'));
            Config::set('database.connections.tenant.username', $tenant->db_user ?? config('database.connections.mysql.username'));
            Config::set('database.connections.tenant.password', $tenant->db_pass ?? config('database.connections.mysql.password'));
            DB::purge('tenant');
            DB::reconnect('tenant');
            DB::setDefaultConnection('tenant');
        }

        return $next($request);
    }

    /**
     * Resolve which tenant to use for localhost/127.0.0.1.
     * 1) Prefer a tenant whose domain is 127.0.0.1 or localhost (e.g. paymydine with full schema).
     * 2) Then DEFAULT_TENANT_ID / DEFAULT_TENANT_DATABASE from .env.
     * 3) Else first active tenant by id (may be mimoza with incomplete schema).
     */
    private function resolveLocalhostTenant(string $host)
    {
        // Prefer tenant explicitly configured for local dev (domain = 127.0.0.1 or localhost)
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

    private function tenantNotFoundResponse(int $status = 403)
    {
        return response()->make("
            <!DOCTYPE html>
            <html lang='en'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Tenant Not Found</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: linear-gradient(to right, #141e30, #243b55);
                        font-family: Arial, sans-serif;
                        color: #fff;
                        text-align: center;
                        padding: 20px;
                    }
                    .container {
                        max-width: 500px;
                        background: rgba(255, 255, 255, 0.1);
                        padding: 30px;
                        border-radius: 12px;
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                        backdrop-filter: blur(10px);
                    }
                    h1 { font-size: 42px; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; }
                    p { font-size: 18px; opacity: 0.8; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <h1>Tenant Not Found</h1>
                    <p>The requested tenant does not exist. Please verify the subdomain and try again.</p>
                </div>
            </body>
            </html>
        ", $status);
    }
}
