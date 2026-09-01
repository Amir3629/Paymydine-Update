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
     * Give each tenant its own cache key and force localization to resolve
     * again inside the correct tenant context.
     */
    private function bindTenantSettingContext(object $tenantInfo): void
    {
        $tenantDatabase = strtolower(trim((string)($tenantInfo->database ?? '')));
        if ($tenantDatabase === '') {
            return;
        }

        $cacheSuffix = sha1($tenantDatabase);

        // Remove any setting instances/drivers that may have been created during
        // boot while the central connection was still the default connection.
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

        // PMD_TENANT_LOCALIZATION_CONFIG_R1
        // Do not depend on a later service-container resolving callback to
        // repair localization config after the tenant switch. The global Admin
        // tenant middleware executes before the web group's Localization
        // middleware, so populate the request's localization authority directly
        // from this tenant-scoped setting store before Localization is resolved.
        $defaultLocale = strtolower(trim((string)$settingStore->get(
            'default_language',
            Config::get('app.locale', 'en')
        )));
        if ($defaultLocale === '') {
            $defaultLocale = 'en';
        }

        $supportedLocales = $this->normalizeSupportedLocales(
            $settingStore->get('supported_languages', [])
        );
        if (!$supportedLocales) {
            $supportedLocales = [$defaultLocale];
        } elseif (!in_array($defaultLocale, $supportedLocales, true)) {
            array_unshift($supportedLocales, $defaultLocale);
            $supportedLocales = array_values(array_unique($supportedLocales));
        }

        Config::set('localization.locale', $defaultLocale);
        Config::set('localization.supportedLocales', $supportedLocales);
        Config::set(
            'localization.detectBrowserLocale',
            (bool)$settingStore->get('detect_language', false)
        );

        // Recreate Localization after the tenant config above is authoritative.
        app()->forgetInstance('translator.localization');

        Log::info('[TenantDatabaseMiddleware] bound tenant localization config', [
            'tenant_db' => $tenantInfo->database ?? null,
            'default_locale' => $defaultLocale,
            'supported_locales' => $supportedLocales,
            'setting_cache_key' => 'igniter.setting.system.tenant.'.$cacheSuffix,
        ]);
    }

    private function normalizeSupportedLocales($value): array
    {
        if (is_string($value)) {
            $decoded = @unserialize($value);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $json = json_decode($value, true);
                $value = is_array($json) ? $json : explode(',', $value);
            }
        }

        if (!is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($locale) => strtolower(trim((string)$locale)),
            $value
        ))));
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
