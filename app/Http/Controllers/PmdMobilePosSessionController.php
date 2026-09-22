<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Models\Locations_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkSessionPolicyService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * PMD_MOBILE_POS_WEB_SESSION_V1
 *
 * Turns an already-paired Android bearer credential into a normal, short-lived
 * PayMyDine Admin session and redirects straight to the canonical /admin/pos.
 *
 * The raw bearer token is never put into a URL or cookie. Every open checks the
 * device row, current user/staff state, restaurant access and Admin.Orders
 * permission again before creating the web session.
 */
final class PmdMobilePosSessionController extends Controller
{
    public function __invoke(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        $identity = $deviceAuth->authenticate($request);
        $user = $identity['user'] ?? null;
        $locationId = (int)($identity['location_id'] ?? 0);
        $deviceId = (int)($identity['device_id'] ?? 0);

        if (
            !$user
            || $locationId < 1
            || $deviceId < 1
            || !$user->hasPermission('Admin.Orders')
        ) {
            abort(403, 'This paired account cannot use PayMyDine POS.');
        }

        $location = Locations_model::query()->find($locationId);
        if (!$location) {
            abort(403, 'The paired restaurant location is unavailable.');
        }

        $site = app(PmdSiteAccessService::class);
        if (
            !$site->ready()
            || !$site->policyEnabled($locationId)
        ) {
            abort(403, 'Restaurant security is not active.');
        }

        // Never inherit a stale/different browser identity from the embedded
        // WebView. The paired device is the sole authority for this new session.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        AdminAuth::login($user, false);

        if (!AdminLocation::hasAccess($location)) {
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
            'workspace'
        );
        $site->markWorkspaceVerified(
            $locationId,
            'mobile_android_device',
            $deviceId
        );
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);

        $site->audit(
            'mobile_android_pos_session',
            true,
            $identity,
            $deviceId,
            null,
            $request,
            [
                'surface' => 'android_pos_webview',
                'session_until' => $policy['expires_at']->toIso8601String(),
                'protocol' => 'pmd-sync-v1',
            ]
        );

        $roleCode = (string)($identity['role_code'] ?? '');
        $roleRoute = app(PmdDefaultStaffRoleService::class)
            ->routeForRoleCode($roleCode);
        $target = in_array($roleRoute, ['pos', 'pos/waiter'], true)
            ? $roleRoute
            : 'pos';

        return redirect(admin_url($target))
            ->header('Cache-Control', 'no-store, private');
    }
}
