<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use Closure;
use Illuminate\Http\Request;

/** PMD_SITE_ACCESS_MANAGE_TRUST_V7 */
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
                ? response()->json(['ok' => false, 'message' => 'Workplace Access is not ready.'], 409)
                : redirect(admin_url('siteaccess/hub'))->with('error', 'Workplace Access storage is not ready.');
        }

        $identity = $site->identity();
        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        if (!in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) abort(403);

        $locationId = (int)$identity['location_id'];
        $userId = (int)$identity['user_id'];
        if ($locationId < 1 || $userId < 1) abort(403);

        $policyWasEnabled = $site->policyEnabled($locationId);

        if (!$policyWasEnabled) {
            if ($role !== PmdDefaultStaffRoleService::OWNER) {
                return redirect(admin_url('siteaccess/hub'))->with(
                    'error',
                    'The restaurant Owner must activate the first Workplace Access device.'
                );
            }

            // Enrollment alone is not sufficient. If the short-lived proof has
            // expired, queue the same canonical /admin/login TOTP step again.
            if (!app(PmdOwnerTotpService::class)->sessionVerified($userId, $locationId)) {
                session()->put('pmd_login_owner_security_v1', [
                    'mode' => 'verify',
                    'user_id' => $userId,
                    'location_id' => $locationId,
                    'session_id' => (string)session()->getId(),
                    'created_at' => time(),
                ]);
                session()->put('pmd_owner_totp_after_v1', admin_url('siteaccess/hub'));

                return $request->expectsJson()
                    ? response()->json(['ok' => false, 'message' => 'Owner Authenticator verification is required.'], 403)
                    : redirect(admin_url('login'))
                        ->with('error', 'Enter your current Authenticator code to continue.');
            }

            return $this->afterTrustedAction($request, $next($request), $site, $identity, false);
        }

        $hub = $site->currentHub($request, $locationId);
        if ($hub) {
            $site->touchDevice((int)$hub->id);
            return $this->afterTrustedAction($request, $next($request), $site, $identity, true);
        }

        if (
            $site->isWorkspaceVerified($locationId)
            && app(PmdSiteAccessSessionBindingService::class)->isBoundToCurrentUser()
        ) {
            return $this->afterTrustedAction($request, $next($request), $site, $identity, true);
        }

        return $request->expectsJson()
            ? response()->json(['ok' => false, 'message' => 'Restaurant verification is required to change device trust.'], 403)
            : redirect(admin_url('login'))->with('error', 'Verify restaurant access before changing trusted devices or recovery codes.');
    }

    private function afterTrustedAction(
        Request $request,
        $response,
        PmdSiteAccessService $site,
        array $identity,
        bool $policyWasEnabled
    ) {
        if (!$request->routeIs('pmd.siteaccess.hub.activate')) return $response;

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

        if (
            !$policyWasEnabled
            && $site->policyEnabled((int)$identity['location_id'])
            && !session()->has('pmd_site_access_new_recovery_codes')
        ) {
            try {
                $codes = $site->generateRecoveryCodes($request);
                session()->flash('pmd_site_access_new_recovery_codes', $codes);
            } catch (\Throwable $error) {
                logger()->critical('PMD Workplace Access recovery bootstrap failed after activation', [
                    'message' => $error->getMessage(),
                    'location_id' => (int)$identity['location_id'],
                ]);
                session()->flash(
                    'error',
                    'Workplace Access was activated, but emergency recovery codes could not be generated automatically. Generate them now before leaving this device.'
                );
            }
        }

        return $response;
    }
}
