<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdTrustedLoginDeviceService;
use App\Services\PmdWorkplaceHubBootstrapService;
use App\Services\PmdWorkSessionPolicyService;
use Illuminate\Http\Request;

/** PMD_FIRST_WORKPLACE_DEVICE_V1 */
class PmdFirstWorkplaceDeviceController
{
    public function __invoke(Request $request)
    {
        if (!AdminAuth::isLogged()) {
            return redirect(admin_url('login'));
        }

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) {
            return redirect(admin_url('login'))
                ->with('error', 'Restaurant security is not ready.');
        }

        $identity = $site->identity();
        $locationId = (int)($identity['location_id'] ?? 0);
        $userId = (int)($identity['user_id'] ?? 0);
        $roleService = app(PmdDefaultStaffRoleService::class);
        $role = $roleService->roleCodeForUser($identity['user'] ?? null);
        $target = $this->target($roleService, $role);

        if ($userId < 1 || $locationId < 1) {
            return redirect(admin_url('login'))
                ->with('error', 'Restaurant security identity is incomplete.');
        }

        // The old /siteaccess/hub URL is no longer a user-facing page.
        // Once policy exists, it simply returns the user to the requested PMD area.
        if ($site->policyEnabled($locationId)) {
            $hub = $site->currentHub($request, $locationId);
            if ($hub) {
                $site->touchDevice((int)$hub->id);
            }

            return redirect($target);
        }

        if ($role !== PmdDefaultStaffRoleService::OWNER) {
            return redirect(admin_url('login'))
                ->with('error', 'The Owner must complete the first restaurant security setup.');
        }

        $totp = app(PmdOwnerTotpService::class);
        if (
            !$totp->enabled($userId)
            || !$totp->sessionVerified($userId, $locationId)
        ) {
            return redirect(admin_url('login'))
                ->with('error', 'Verify the Owner Authenticator before creating the main restaurant device.');
        }

        try {
            [$device, $rawToken] = app(PmdWorkplaceHubBootstrapService::class)
                ->activate($request);

            $deviceId = (int)($device->id ?? 0);
            $site->markWorkspaceVerified(
                $locationId,
                'owner_first_device',
                $deviceId
            );

            app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
            $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);

            $site->audit(
                'first_workplace_device_auto_activated',
                true,
                $identity,
                $deviceId ?: null,
                null,
                $request,
                [
                    'surface' => 'owner_login',
                    'session_until' => $policy['expires_at']->toIso8601String(),
                    'session_reason' => $policy['reason'],
                ]
            );

            // PMD_FIRST_OWNER_DIRECT_TRUST_V16_FINAL
            app(PmdTrustedLoginDeviceService::class)
                ->trustAfterVerifiedSecondFactor(
                    $request,
                    $identity
                );

            return redirect($target)
                ->withCookie($this->hubCookie($rawToken, $request))
                ->withCookie($this->hubMarkerCookie($request))
                ->with('success', 'This device is now the main restaurant security device.');
        } catch (\Throwable $error) {
            logger()->error('PMD first Workplace device activation failed', [
                'user_id' => $userId,
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);

            return redirect(admin_url('login'))
                ->with('error', 'Could not activate the main restaurant device. Try again.');
        }
    }

    private function target(PmdDefaultStaffRoleService $roles, ?string $role): string
    {
        $destination = (string)session()->get(
            PmdSiteAccessService::SESSION_DESTINATION,
            'workspace'
        );

        if ($destination === 'staff') {
            return admin_url('mywork');
        }

        $route = $roles->routeForRoleCode((string)$role);
        return admin_url($route ?: 'ownerdashboard');
    }

    private function hubCookie(string $token, Request $request)
    {
        return cookie(
            PmdSiteAccessService::HUB_COOKIE,
            $token,
            60 * 24 * 365 * 3,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            'Lax'
        );
    }

    private function hubMarkerCookie(Request $request)
    {
        return cookie(
            'pmd_site_hub_marker_v1',
            '1',
            60 * 24 * 365 * 3,
            '/',
            null,
            $request->isSecure(),
            false,
            false,
            'Lax'
        );
    }
}
