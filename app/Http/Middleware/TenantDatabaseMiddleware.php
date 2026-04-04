<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class TenantDatabaseMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $subdomain = $this->extractTenantFromDomain($request);

        if (!$subdomain) {
            return response()->json(['error' => 'Invalid domain'], 400);
        }

        // landlord DB = mysql connection using paymydine
        // logical table name "tenants" => Laravel prefix should resolve to ti_tenants
        $tenantInfo = DB::connection('mysql')->table('tenants')
            ->where('domain', $subdomain . '.paymydine.com')
            ->where('status', 'active')
            ->first();

        if (!$tenantInfo || empty($tenantInfo->database)) {
            return response()->json(['error' => 'Restaurant not found or inactive'], 404);
        }

        // switch only dedicated tenant connection
        Config::set('database.connections.tenant.database', $tenantInfo->database);
        Config::set('database.connections.tenant.host', $tenantInfo->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.port', $tenantInfo->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
        Config::set('database.connections.tenant.username', $tenantInfo->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
        Config::set('database.connections.tenant.password', $tenantInfo->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));

        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');

        $request->attributes->set('tenant', $tenantInfo);
        app()->instance('tenant', $tenantInfo);

        Log::info('[TenantDatabaseMiddleware] switched tenant connection', [
            'host' => $request->getHost(),
            'subdomain' => $subdomain,
            'tenant_domain' => $tenantInfo->domain ?? null,
            'tenant_db' => $tenantInfo->database ?? null,
        ]);

        return $next($request);
    }

    private function extractTenantFromDomain(Request $request): ?string
    {
        $hostname = $request->getHost();
        if (!$hostname) {
            return null;
        }

        $parts = explode('.', $hostname);

        if (count($parts) >= 3 && $parts[1] === 'paymydine') {
            return $parts[0];
        }

        if (count($parts) >= 2 && $parts[0] !== 'www') {
            return $parts[0];
        }

        return null;
    }
}
