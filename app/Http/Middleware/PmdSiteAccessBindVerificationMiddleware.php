<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_BIND_VERIFICATION_V1
 *
 * Runs around Site Access actions. A successful workspace verification consumes
 * the current challenge; only then is the resulting verification session bound
 * to the currently authenticated PMD user.
 */
class PmdSiteAccessBindVerificationMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $site = app(PmdSiteAccessService::class);
        $before = null;

        if (AdminAuth::isLogged() && $site->ready()) {
            try {
                $before = $site->challengeForSession();
            } catch (\Throwable $error) {
            }
        }

        $response = $next($request);

        if ($before && AdminAuth::isLogged()) {
            try {
                $after = $site->challengeForSession();
                $identity = $site->identity();
                $workspacePurpose = $before->purpose === PmdSiteAccessService::PURPOSE_WORKSPACE
                    || $before->purpose === PmdSiteAccessService::PURPOSE_ELEVATE;

                if (
                    $workspacePurpose
                    && !$after
                    && $site->isWorkspaceVerified((int)$identity['location_id'])
                ) {
                    app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
                }
            } catch (\Throwable $error) {
                logger()->warning('PMD Site Access verification binding failed', [
                    'message' => $error->getMessage(),
                ]);
            }
        }

        return $response;
    }
}
