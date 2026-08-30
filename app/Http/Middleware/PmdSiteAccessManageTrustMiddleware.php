<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_MANAGE_TRUST_V4
 *
 * The first Site Access hub is the restaurant root of trust, so bootstrap is
 * Owner-only. After activation, Owner/Manager trust changes require workplace
 * proof bound to the same user or the current physical trusted hub.
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

        $policyWasEnabled = $site->policyEnabled($locationId);

        // Before the first hub exists there is no stronger device proof to use.
        // Only the Owner may create that initial restaurant root of trust.
        if (!$policyWasEnabled) {
            if ($role !== PmdDefaultStaffRoleService::OWNER) {
                return redirect(admin_url('siteaccess/hub'))->with(
                    'error',
                    'The restaurant Owner must activate the first Site Access hub.'
                );
            }

            return $this->afterTrustedAction(
                $request,
                $next($request),
                $site,
                $identity,
                false
            );
        }

        $hub = $site->currentHub($request, $locationId);
        if ($hub) {
            $site->touchDevice((int)$hub->id);
            return $this->afterTrustedAction(
                $request,
                $next($request),
                $site,
                $identity,
                true
            );
        }

        if (
            $site->isWorkspaceVerified($locationId)
            && app(PmdSiteAccessSessionBindingService::class)->isBoundToCurrentUser()
        ) {
            return $this->afterTrustedAction(
                $request,
                $next($request),
                $site,
                $identity,
                true
            );
        }

        return $request->expectsJson()
            ? response()->json(['ok' => false, 'message' => 'Restaurant verification is required to change device trust.'], 403)
            : redirect(admin_url('siteaccess'))->with('error', 'Verify at the restaurant before changing trusted devices or recovery codes.');
    }

    private function afterTrustedAction(
        Request $request,
        $response,
        PmdSiteAccessService $site,
        array $identity,
        bool $policyWasEnabled
    ) {
        if (!$request->routeIs('pmd.siteaccess.hub.activate')) {
            return $response;
        }

        // PMD_SITE_ACCESS_HUB_MARKER_V1
        // Non-secret marker only. The real hub credential remains HttpOnly. This
        // prevents every ordinary Admin browser from probing the heartbeat API.
        if (method_exists($response, 'withCookie')) {
            $response->withCookie(cookie(
                'pmd_site_hub_marker_v1',
                '1',
                60 * 24 * 365 * 3,
                '/',
                null,
                $request->isSecure(),
                false,
                false,
                'Lax'
            ));
        }

        // PMD_SITE_ACCESS_BOOTSTRAP_RECOVERY_V1
        // The first successful Hub activation must never start enforcement
        // without an emergency path. Generate raw codes exactly once and flash
        // them to the next Hub page; only their keyed hashes remain in the DB.
        if (
            !$policyWasEnabled
            && $site->policyEnabled((int)$identity['location_id'])
        ) {
            try {
                $codes = $site->generateRecoveryCodes($request);
                session()->flash('pmd_site_access_new_recovery_codes', $codes);
            } catch (\Throwable $error) {
                logger()->critical('PMD Site Access recovery bootstrap failed after Hub activation', [
                    'message' => $error->getMessage(),
                    'location_id' => (int)$identity['location_id'],
                ]);

                // Do not silently hide this exceptional state. The Hub is already
                // activated, so the next page must tell the Owner to generate the
                // recovery set manually before relying on Site Access.
                session()->flash(
                    'error',
                    'Site Access Hub was activated, but emergency recovery codes could not be generated automatically. Generate them now before leaving this device.'
                );
            }
        }

        return $response;
    }
}
