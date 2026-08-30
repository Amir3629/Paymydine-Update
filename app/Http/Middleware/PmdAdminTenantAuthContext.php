<?php

namespace App\Http\Middleware;

use App\Services\PmdSiteAccessWorkspaceGateService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_ADMIN_TENANT_AUTH_CONTEXT_V6
 *
 * Select the tenant DB first, then apply the request-level Site Access policy.
 * Site Access remains inactive until a restaurant explicitly activates a hub.
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
                if (class_exists(PmdSiteAccessWorkspaceGateService::class)) {
                    try {
                        $gate = app(PmdSiteAccessWorkspaceGateService::class)->gateResponse($tenantRequest);
                        if ($gate) return $gate;
                    } catch (\Throwable $error) {
                        // Rollout safety: a schema/service failure cannot brick an
                        // existing restaurant Admin. Policy starts only after hub activation.
                        logger()->warning('PMD Site Access Workspace gate skipped', [
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

        if (str_starts_with($path, 'admin/_assets/')) {
            return false;
        }

        $host = strtolower(trim((string)$request->getHost()));
        return (bool)preg_match('/^[a-z0-9-]+\\.paymydine\\.com$/', $host);
    }
}
