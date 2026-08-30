<?php

namespace App\Http\Middleware;

use App\Services\PmdSiteAccessService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_ADMIN_TENANT_AUTH_CONTEXT_V5
 *
 * Keep the canonical tenant resolver, then enforce Site Access only for a
 * session that Login has explicitly marked pending. Restaurants without an
 * activated hub and existing sessions are unaffected during rollout.
 */
class PmdAdminTenantAuthContext
{
    public function handle(Request $request, Closure $next)
    {
        if (!$this->isTenantAdminRequest($request)) {
            return $next($request);
        }

        return app(TenantDatabaseMiddleware::class)->handle(
            $request,
            function (Request $tenantRequest) use ($next) {
                if (class_exists(PmdSiteAccessService::class)) {
                    try {
                        $gate = app(PmdSiteAccessService::class)->gateResponse($tenantRequest);
                        if ($gate) return $gate;
                    } catch (\Throwable $error) {
                        // Fail open while schema is being rolled out. Login only
                        // creates pending sessions after service readiness checks.
                        logger()->warning('PMD Site Access gate skipped', [
                            'message' => $error->getMessage(),
                            'path' => $tenantRequest->path(),
                        ]);
                    }
                }

                return $next($tenantRequest);
            }
        );
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
