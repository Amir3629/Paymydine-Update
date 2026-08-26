<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * PMD_ADMIN_TENANT_AUTH_CONTEXT_V4
 *
 * The legacy /admin catch-all route only carries the web group. AdminAuth is
 * resolved by AdminController before page actions run, so the tenant database
 * must already be selected before the route/controller pipeline starts.
 *
 * Reuse the canonical TenantDatabaseMiddleware as the single tenant resolver.
 * Super Admin is intentionally excluded and remains on the central database.
 */
class PmdAdminTenantAuthContext
{
    public function handle(Request $request, Closure $next)
    {
        if (!$this->isTenantAdminRequest($request)) {
            return $next($request);
        }

        return app(TenantDatabaseMiddleware::class)->handle($request, $next);
    }

    private function isTenantAdminRequest(Request $request): bool
    {
        $path = trim((string)$request->path(), '/');
        if ($path !== 'admin' && !str_starts_with($path, 'admin/')) {
            return false;
        }

        // Combined/static admin assets do not need a tenant DB lookup.
        if (str_starts_with($path, 'admin/_assets/')) {
            return false;
        }

        $host = strtolower(trim((string)$request->getHost()));

        // Only restaurant subdomains are tenant-admin surfaces.
        // paymydine.com/superadmin stays central and never enters this branch.
        return (bool)preg_match('/^[a-z0-9-]+\\.paymydine\\.com$/', $host);
    }
}
