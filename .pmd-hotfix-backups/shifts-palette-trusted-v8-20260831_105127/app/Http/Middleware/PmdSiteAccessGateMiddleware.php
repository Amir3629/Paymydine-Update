<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessWorkspaceGateService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_WEB_GATE_V2
 *
 * Before first activation rollout remains fail-open so deploying schema/code
 * cannot brick an existing restaurant. Once a trusted workplace device exists,
 * security failures fail closed instead of bypassing the second factor.
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
            logger()->error('PMD Workplace Access gate failed', [
                'message' => $error->getMessage(),
                'path' => $request->path(),
            ]);

            // PMD_WORKPLACE_GATE_FAIL_CLOSED_V1
            // If the restaurant already activated Workplace Access, never turn a
            // service error into password-only access. Before activation we keep
            // the rollout-safe behavior so code/schema installation cannot lock
            // an existing tenant.
            try {
                $site = app(PmdSiteAccessService::class);
                if (AdminAuth::isLogged() && $site->ready() && $site->policyEnabled()) {
                    return response(
                        'Workplace security verification is temporarily unavailable. Please try again.',
                        503,
                        ['Cache-Control' => 'no-store']
                    );
                }
            } catch (\Throwable $policyError) {
                logger()->error('PMD Workplace Access policy-state check failed', [
                    'message' => $policyError->getMessage(),
                ]);
            }
        }

        return $next($request);
    }
}
