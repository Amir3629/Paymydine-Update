<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_WORKSPACE_GATE_V2
 *
 * Request-level enforcement once a restaurant has explicitly activated its
 * first Site Access hub. Personal Staff Portal trust and workplace trust stay
 * separate: a paired phone can use My Work off-site, but opening any operational
 * Workspace still requires restaurant verification.
 */
class PmdSiteAccessWorkspaceGateService
{
    public function gateResponse(Request $request)
    {
        if (!AdminAuth::isLogged()) return null;

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) return null;

        $identity = $site->identity();
        $locationId = (int)$identity['location_id'];
        if ($identity['user_id'] < 1 || $identity['staff_id'] < 1 || $locationId < 1) return null;
        if (!$site->policyEnabled($locationId)) return null;

        $relative = $this->relativeAdminPath($request);

        // Language switching is account preference, not operational Workspace.
        // Both current and legacy language-switch routes must stay available to
        // a paired Staff Portal device without forcing workplace verification.
        if (str_starts_with($relative, '_pmd/language-switch')) return null;

        // Authentication, Site Access itself, static assets and logout must stay
        // reachable or a user could be trapped behind the gate.
        foreach (['siteaccess', 'login', 'logout', '_assets'] as $allowed) {
            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
        }

        // A physical trusted hub is itself workplace proof. This also makes the
        // Cashier login flow one-step after username/password.
        $hub = $site->currentHub($request, $locationId);
        if ($hub) {
            $site->touchDevice((int)$hub->id);
            if (!$site->isWorkspaceVerified($locationId)) {
                $site->markWorkspaceVerified($locationId, 'trusted_site_hub', (int)$hub->id);
                $site->audit('workspace_auto_verified', true, $identity, (int)$hub->id, null, $request, [
                    'path' => $relative,
                ]);
            }
            return null;
        }

        $isMyWork = $relative === 'mywork' || str_starts_with($relative, 'mywork/');

        if ($isMyWork) {
            // A workplace-verified session can always open personal My Work.
            if ($site->isWorkspaceVerified($locationId)) return null;

            // Otherwise only the employee's paired personal device is allowed
            // off-site. Revoking the device takes effect on the next request.
            $personal = $site->currentStaffDevice($request, $identity['staff_id'], $locationId);
            if ($personal) {
                $site->touchDevice((int)$personal->id);
                return null;
            }

            $pending = $site->challengeForSession();
            if (!$pending || $pending->purpose !== PmdSiteAccessService::PURPOSE_PAIR_STAFF) {
                $target = $request->isMethod('GET') ? $request->fullUrl() : admin_url('mywork');
                $pending = $site->beginChallenge(PmdSiteAccessService::PURPOSE_PAIR_STAFF, $target, $request);
            }

            return $pending ? redirect(admin_url('siteaccess')) : null;
        }

        // Everything else under tenant /admin is operational Workspace.
        if ($site->isWorkspaceVerified($locationId)) return null;

        $pending = $site->challengeForSession();
        if (!$pending || $pending->purpose !== PmdSiteAccessService::PURPOSE_WORKSPACE) {
            $target = $this->safeWorkspaceTarget($request, $identity['user']);
            $pending = $site->beginChallenge(PmdSiteAccessService::PURPOSE_WORKSPACE, $target, $request);
        }

        return $pending ? redirect(admin_url('siteaccess')) : null;
    }

    private function relativeAdminPath(Request $request): string
    {
        $path = trim((string)$request->path(), '/');
        $admin = trim((string)config('system.adminUri', 'admin'), '/');
        if ($path === $admin) return '';
        if (str_starts_with($path, $admin.'/')) return substr($path, strlen($admin) + 1);
        return $path;
    }

    private function safeWorkspaceTarget(Request $request, $user): string
    {
        // Never try to replay a blocked POST/PUT/DELETE after step-up.
        if ($request->isMethod('GET')) return $request->fullUrl();

        try {
            $route = app(\Admin\Services\PmdRoleLandingService::class)->routeFor($user);
            if ($route) return admin_url($route);
        } catch (\Throwable $error) {
        }

        return admin_url('dashboard');
    }
}
