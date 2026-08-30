<?php

namespace App\Http\Middleware;

use App\Services\PmdSiteAccessWorkspaceGateService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_WEB_GATE_V1
 *
 * Added to the END of Laravel's web middleware group from the Site Access route
 * module. StartSession and tenant selection have already happened by the time
 * this runs. The policy service is path-gated to tenant /admin surfaces.
 */
class PmdSiteAccessGateMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $path = trim((string)$request->path(), '/');
        $admin = trim((string)config('system.adminUri', 'admin'), '/');

        if ($path !== $admin && !str_starts_with($path, $admin.'/')) {
            return $next($request);
        }

        try {
            $gate = app(PmdSiteAccessWorkspaceGateService::class)->gateResponse($request);
            if ($gate) return $gate;
        } catch (\Throwable $error) {
            // Rollout safety. Site Access is disabled until an explicit hub exists,
            // and a service failure must never brick an existing restaurant Admin.
            logger()->warning('PMD Site Access web gate skipped', [
                'message' => $error->getMessage(),
                'path' => $request->path(),
            ]);
        }

        return $next($request);
    }
}
