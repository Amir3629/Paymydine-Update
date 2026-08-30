<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;

/**
 * PMD_WORKPLACE_GATE_V4
 *
 * Once the restaurant activates Workplace Access, every tenant Admin surface -
 * including My Work / Staff Portal - requires fresh workplace verification.
 * Personal devices are never a substitute for physical restaurant proof.
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

        $binding = app(PmdSiteAccessSessionBindingService::class);
        $workspaceVerified = $site->isWorkspaceVerified($locationId)
            && $binding->isBoundToCurrentUser();

        $relative = $this->relativeAdminPath($request);

        // Language switching is account preference, not operational access.
        if (str_starts_with($relative, '_pmd/language-switch')) return null;

        // Authentication, Workplace Access itself, static assets and logout must
        // remain reachable or a user could be trapped behind the gate.
        foreach (['siteaccess', 'login', 'logout', '_assets'] as $allowed) {
            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
        }

        // The trusted restaurant Admin/Cashier device is itself workplace proof.
        $hub = $site->currentHub($request, $locationId);
        if ($hub) {
            $site->touchDevice((int)$hub->id);
            if (!$workspaceVerified) {
                $site->markWorkspaceVerified($locationId, 'trusted_workplace_device', (int)$hub->id);
                $binding->bindCurrentUser();
                $site->audit('workplace_auto_verified', true, $identity, (int)$hub->id, null, $request, [
                    'path' => $relative,
                ]);
            }
            return null;
        }

        if ($workspaceVerified) return null;

        // My Work and Workspace use the SAME restaurant verification authority.
        // There is intentionally no persistent personal-phone bypass.
        $pending = $site->challengeForSession();
        if (!$pending || $pending->purpose !== PmdSiteAccessService::PURPOSE_WORKSPACE) {
            $target = $this->safeTarget($request, $identity['user'], $relative);
            $pending = $site->beginChallenge(
                PmdSiteAccessService::PURPOSE_WORKSPACE,
                $target,
                $request
            );
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

    private function safeTarget(Request $request, $user, string $relative): string
    {
        // Never replay a blocked POST/PUT/DELETE after step-up.
        if ($request->isMethod('GET')) return $request->fullUrl();

        if ($relative === 'mywork' || str_starts_with($relative, 'mywork/')) {
            return admin_url('mywork');
        }

        try {
            $route = app(\Admin\Services\PmdRoleLandingService::class)->routeFor($user);
            if ($route) return admin_url($route);
        } catch (\Throwable $error) {
        }

        return admin_url('dashboard');
    }
}
