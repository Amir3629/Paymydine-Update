<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdSiteAccessService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_MANAGE_TRUST_V1
 *
 * Bootstrap is allowed once to Owner/Manager before the first hub exists.
 * After policy activation, trust configuration itself requires workplace proof
 * so a remote Manager cannot revoke the last hub to disable enforcement.
 */
class PmdSiteAccessManageTrustMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (!AdminAuth::isLogged()) {
            return $request->expectsJson()
                ? response()->json(['ok' => false, 'message' => 'Authentication required.'], 401)
                : redirect(admin_url('login'));
        }

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) {
            return $request->expectsJson()
                ? response()->json(['ok' => false, 'message' => 'Site Access is not ready.'], 409)
                : redirect(admin_url('siteaccess/hub'))->with('error', 'Site Access storage is not ready.');
        }

        $identity = $site->identity();
        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        if (!in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) {
            abort(403);
        }

        $locationId = (int)$identity['location_id'];
        if ($locationId < 1) abort(403);

        // Before the first hub exists there is no stronger device proof to use;
        // an authenticated Owner/Manager is the controlled bootstrap authority.
        if (!$site->policyEnabled($locationId)) {
            return $next($request);
        }

        $hub = $site->currentHub($request, $locationId);
        if ($hub) {
            $site->touchDevice((int)$hub->id);
            return $next($request);
        }

        if ($site->isWorkspaceVerified($locationId)) {
            return $next($request);
        }

        return $request->expectsJson()
            ? response()->json(['ok' => false, 'message' => 'Restaurant verification is required to change device trust.'], 403)
            : redirect(admin_url('siteaccess'))->with('error', 'Verify at the restaurant before changing trusted devices or recovery codes.');
    }
}
