<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;

/**
 * PMD_WORKPLACE_GATE_V5
 *
 * Once the restaurant activates Workplace Access, every tenant Admin surface -
 * including My Work / Staff Portal - requires fresh workplace verification.
 * Personal devices are never a substitute for restaurant proof.
 *
 * Verified sessions are absolute and shift-aware: scheduled users keep access
 * until shift end + 1 hour; overtime/no-schedule logins use the restaurant-day
 * boundary. An expired verified session is logged out, not silently extended.
 */
class PmdSiteAccessWorkspaceGateService
{
    public function gateResponse(Request $request)
    {
        if (!AdminAuth::isLogged()) return null;

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) return null;

        // PMD_WORK_SESSION_ABSOLUTE_EXPIRY_V1
        // Only an already-verified session has this timestamp. Fresh password
        // logins clear old verification state before beginning step-up.
        $workSession = app(PmdWorkSessionPolicyService::class);
        if (session()->has(PmdSiteAccessService::SESSION_VERIFIED_UNTIL) && $workSession->isExpired()) {
            try {
                $site->clearVerification();
                $workSession->clear();
                AdminAuth::logout();
            } catch (\Throwable $error) {
            }
            session()->invalidate();
            session()->regenerateToken();

            return redirect(admin_url('login?session=work-expired'))
                ->with('error', 'Your work session ended. Sign in again to continue.');
        }

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
                $policy = $workSession->apply($identity);
                $site->audit('workplace_auto_verified', true, $identity, (int)$hub->id, null, $request, [
                    'path' => $relative,
                    'session_until' => $policy['expires_at']->toIso8601String(),
                    'session_reason' => $policy['reason'],
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
