<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Models\Locations_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use App\Services\PmdMobileSync\PmdMobileStaffGrantService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdPortalTotpService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkSessionPolicyService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * PMD_MOBILE_ROLE_WORKSPACE_SESSION_V2
 *
 * Creates a normal short-lived Admin session from the paired Android identity
 * and redirects to the canonical default page for that staff role. Android
 * never needs to hard-code Owner/Manager/Accountant/My Work route policy.
 *
 * ?surface=reservations remains supported for the V17 Reservations client.
 */
final class PmdMobileWorkspaceSessionController extends Controller
{
    public function __invoke(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        $identity = $deviceAuth->authenticate($request);
        $user = $identity['user'] ?? null;
        $staff = $identity['staff'] ?? ($user ? $user->staff : null);
        $locationId = (int)($identity['location_id'] ?? 0);
        $deviceId = (int)($identity['device_id'] ?? 0);
        $roleCode = (string)($identity['role_code'] ?? '');

        $roles = app(PmdDefaultStaffRoleService::class);
        $route = $roles->routeForRoleCode($roleCode);

        // PMD_MOBILE_SIGNED_DESTINATION_AUTHORITY_V12
        // New Staff Grants bind workspace/staff destination cryptographically.
        // Query fallback exists only for older 0.3.4 grants that did not carry
        // the claim.
        $signedDestination = strtolower(trim(
            (string)($identity['destination'] ?? '')
        ));
        $requestedDestination = strtolower(trim(
            (string)$request->query('destination', 'workspace')
        ));
        $destination = in_array(
            $signedDestination,
            ['workspace', 'staff'],
            true
        ) ? $signedDestination : $requestedDestination;

        if (!in_array($destination, ['workspace', 'staff'], true)) {
            abort(404, 'This PayMyDine Android destination is not available.');
        }
        if ($destination === 'staff') {
            $route = 'mywork';
        }

        $legacySurface = strtolower(trim((string)$request->query('surface', '')));
        if ($legacySurface === 'reservations') {
            if (!$user || !$user->hasPermission('Admin.Reservations')) {
                abort(403, 'This paired account cannot use PayMyDine Reservations.');
            }
            $route = 'reservations';
        } elseif ($legacySurface !== '' && $legacySurface !== 'auto') {
            abort(404, 'This PayMyDine Android workspace is not available.');
        }

        if (
            !$user
            || $locationId < 1
            || $deviceId < 1
            || $roleCode === ''
            || $route === null
            || trim($route) === ''
        ) {
            abort(403, 'This paired account has no PayMyDine workspace.');
        }

        $location = Locations_model::query()->find($locationId);
        if (!$location) {
            abort(403, 'The paired restaurant location is unavailable.');
        }

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready() || !$site->policyEnabled($locationId)) {
            abort(403, 'Restaurant security is not active.');
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        AdminAuth::login($user, false);

        // PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13
        // Mobile staff authentication accepts the canonical PayMyDine location
        // rules: superuser, primary staff_location_id, or an explicit attached
        // location. Do not narrow that proof through the legacy AdminLocation
        // pivot-only check after the staff grant has already been verified.
        if (
            !$staff
            || !app(PmdMobileStaffGrantService::class)->userMayUseLocation(
                $user,
                $staff,
                $locationId
            )
        ) {
            AdminAuth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            abort(403, 'This account no longer has access to the restaurant.');
        }

        AdminLocation::setCurrent($location);

        // PMD_MOBILE_ADMIN_SESSION_BINDING_V6
        session()->put(
            PmdSiteAccessService::SESSION_MOBILE_LOCATION,
            $locationId
        );
        session()->put(
            PmdSiteAccessService::SESSION_MOBILE_DEVICE,
            $deviceId
        );
        session()->put(
            PmdSiteAccessService::SESSION_DESTINATION,
            $destination
        );

        // PMD_MOBILE_PORTAL_CANONICAL_SECURITY_V12
        // usernameportal must behave exactly like canonical web Login: the
        // already password-authenticated user remains on /admin/login for their
        // personal Portal Authenticator before My Work opens.
        if ($destination === 'staff') {
            $portal = app(PmdPortalTotpService::class);
            if (!$portal->ensureReady()) {
                AdminAuth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                abort(503, 'Portal security is temporarily unavailable.');
            }

            $portal->clearSessionVerification();
            $portal->resetEnrollment();
            $portal->clearRecoveryDisplay();

            session()->put('pmd_login_portal_security_v1', [
                'mode' => $portal->enabled(
                    (int)$identity['user_id'],
                    $locationId
                ) ? 'verify' : 'setup',
                'user_id' => (int)$identity['user_id'],
                'location_id' => $locationId,
                'session_id' => (string)session()->getId(),
                'created_at' => time(),
            ]);

            $site->audit(
                'mobile_android_portal_security_session',
                true,
                $identity,
                $deviceId,
                null,
                $request,
                [
                    'route' => 'mywork',
                    'protocol' => 'pmd-sync-v1',
                ]
            );

            return redirect(admin_url('login'))
                ->header('Cache-Control', 'no-store, private');
        }

        // PMD_MOBILE_OWNER_CANONICAL_SECURITY_V6
        // Do not redirect Owner to the dashboard and rely on a later middleware
        // pass to discover that MFA is missing. Queue the exact canonical Owner
        // security state here and send the already password-authenticated Admin
        // session straight to /admin/login, where the normal Owner MFA UI lives.
        $isOwner = $roleCode === PmdDefaultStaffRoleService::OWNER;
        $policy = null;

        if ($isOwner) {
            $ownerTotp = app(PmdOwnerTotpService::class);
            session()->put('pmd_login_owner_security_v1', [
                'mode' => $ownerTotp->enabled((int)$identity['user_id'])
                    ? 'verify'
                    : 'setup',
                'user_id' => (int)$identity['user_id'],
                'location_id' => $locationId,
                'session_id' => (string)session()->getId(),
                'created_at' => time(),
            ]);
            session()->put(
                'pmd_owner_totp_after_v1',
                admin_url($route)
            );
        } else {
            $site->markWorkspaceVerified(
                $locationId,
                'mobile_android_device',
                $deviceId
            );
            app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
            $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);
        }

        $site->audit(
            'mobile_android_role_workspace_session',
            true,
            $identity,
            $deviceId,
            null,
            $request,
            [
                'role_code' => $roleCode,
                'route' => $route,
                'legacy_surface' => $legacySurface ?: null,
                'session_until' => $policy
                    ? $policy['expires_at']->toIso8601String()
                    : null,
                'security_continuation' => $isOwner
                    ? 'canonical_owner_gate'
                    : 'mobile_android_device',
                'protocol' => 'pmd-sync-v1',
            ]
        );

        return redirect(
            $isOwner
                ? admin_url('login')
                : admin_url($route)
        )->header('Cache-Control', 'no-store, private');
    }
}
