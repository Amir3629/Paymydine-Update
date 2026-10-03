<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Models\Locations_model;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkSessionPolicyService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * PMD_MOBILE_WORKSPACE_WEB_SESSION_V1
 *
 * Opens approved non-POS Cloud workspaces from the already-paired Android app.
 * The bearer credential is validated server-side and never appears in a URL or
 * browser cookie. Reservations deliberately remains Cloud-authoritative for
 * this milestone; Android does not fabricate offline reservation mutations.
 */
final class PmdMobileWorkspaceSessionController extends Controller
{
    public function __invoke(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        $surface = strtolower(trim((string)$request->query('surface', '')));
        $targets = [
            'reservations' => [
                'permission' => 'Admin.Reservations',
                'route' => 'reservations',
            ],
        ];

        if (!isset($targets[$surface])) {
            abort(404, 'This PayMyDine Android workspace is not available.');
        }

        $identity = $deviceAuth->authenticate($request);
        $user = $identity['user'] ?? null;
        $locationId = (int)($identity['location_id'] ?? 0);
        $deviceId = (int)($identity['device_id'] ?? 0);
        $target = $targets[$surface];

        if (
            !$user
            || $locationId < 1
            || $deviceId < 1
            || !$user->hasPermission($target['permission'])
        ) {
            abort(403, 'This paired account cannot use this PayMyDine workspace.');
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

        if (!AdminLocation::hasAccess($location)) {
            AdminAuth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            abort(403, 'This account no longer has access to the restaurant.');
        }

        AdminLocation::setCurrent($location);
        session()->put(PmdSiteAccessService::SESSION_DESTINATION, 'workspace');
        $site->markWorkspaceVerified(
            $locationId,
            'mobile_android_device',
            $deviceId
        );
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);

        $site->audit(
            'mobile_android_workspace_session',
            true,
            $identity,
            $deviceId,
            null,
            $request,
            [
                'surface' => $surface,
                'session_until' => $policy['expires_at']->toIso8601String(),
                'protocol' => 'pmd-sync-v1',
            ]
        );

        return redirect(admin_url($target['route']))
            ->header('Cache-Control', 'no-store, private');
    }
}
