<?php

namespace App\Http\Middleware;

use Closure;
use Igniter\Flame\Setting\DatabaseSettingStore;
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

        $tenantInfo = DB::connection('mysql')->table('tenants')
            ->where('domain', $subdomain . '.paymydine.com')
            ->where('status', 'active')
            ->first();

        if (!$tenantInfo || empty($tenantInfo->database)) {
            return response()->json(['error' => 'Restaurant not found or inactive'], 404);
        }

        Config::set('database.connections.tenant.database', $tenantInfo->database);
        Config::set('database.connections.tenant.host', $tenantInfo->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.port', $tenantInfo->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
        Config::set('database.connections.tenant.username', $tenantInfo->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
        Config::set('database.connections.tenant.password', $tenantInfo->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));

        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');

        $this->bindTenantSettingContext($tenantInfo);

        $request->attributes->set('tenant', $tenantInfo);
        app()->instance('tenant', $tenantInfo);

        Log::info('[TenantDatabaseMiddleware] switched tenant connection', [
            'host' => $request->getHost(),
            'subdomain' => $subdomain,
            'tenant_domain' => $tenantInfo->domain ?? null,
            'tenant_db' => $tenantInfo->database ?? null,
        ]);

        $response = $next($request);

        // PMD_PAY_EXISTING_CANONICAL_PERSISTENCE_V2
        // Run while the tenant connection is certainly active. The canonical
        // middleware is idempotent, so its outer web-group pass becomes a no-op.
        if ($request->isMethod('post') && str_ends_with(trim($request->path(), '/'), 'orders/pay-existing')) {
            app(PmdCanonicalPayExistingPersistence::class)
                ->persistSuccessfulResponse($request, $response);
        }

        return $response;
    }

    /**
     * Rebind TastyIgniter settings after the tenant database becomes the
     * default connection. System boot may resolve settings before request
     * middleware runs, and Flame otherwise uses one process-wide cache key.
     *
     * Give each tenant its own cache key and force localization/translator
     * singletons to resolve again inside the correct tenant context.
     */
    private function bindTenantSettingContext(object $tenantInfo): void
    {
        $tenantDatabase = strtolower(trim((string)($tenantInfo->database ?? '')));
        if ($tenantDatabase === '') {
            return;
        }

        $cacheSuffix = sha1($tenantDatabase);

        // Remove any instances/drivers that may have been created during boot
        // while the central connection was still the default connection.
        foreach (['system.setting', 'system.parameter', 'setting.manager'] as $abstract) {
            app()->forgetInstance($abstract);
        }

        $settingStore = new DatabaseSettingStore(app('db'), app('cache.store'));
        $settingStore->setCacheKey('igniter.setting.system.tenant.'.$cacheSuffix);
        $settingStore->setExtraColumns(['sort' => 'config']);
        app()->instance('system.setting', $settingStore);

        $parameterStore = new DatabaseSettingStore(app('db'), app('cache.store'));
        $parameterStore->setCacheKey('igniter.setting.parameters.tenant.'.$cacheSuffix);
        $parameterStore->setExtraColumns(['sort' => 'prefs']);
        app()->instance('system.parameter', $parameterStore);

        // Localization config is populated through a resolving callback that
        // reads setting(). Re-resolve it after the tenant setting store exists.
        app()->forgetInstance('translator.localization');
        app()->forgetInstance('translator');
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
