<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Http\Request;

/**
 * PMD_WORKPLACE_GATE_V8
 *
 * One canonical security surface: /admin/login.
 * A trusted Cashier/POS exposes proof, but never silently becomes proof for a
 * fresh password session. Every fresh login completes an explicit second step.
 */
class PmdSiteAccessWorkspaceGateService
{
    public function gateResponse(Request $request)
    {
        if (!AdminAuth::isLogged()) return null;

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) return null;

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
        $roleService = app(PmdDefaultStaffRoleService::class);
        $role = $roleService->roleCodeForUser($identity['user']);
        $isOwner = $role === PmdDefaultStaffRoleService::OWNER;

        if ($identity['user_id'] < 1 || $locationId < 1) return null;
        if ($identity['staff_id'] < 1 && !$isOwner) return null;

        $relative = $this->relativeAdminPath($request);
        if (str_starts_with($relative, '_pmd/language-switch')) return null;

        if (session()->has('pmd_login_owner_security_v1')) {
            foreach (['login', 'logout', 'siteaccess', '_assets'] as $allowed) {
                if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
            }
            return redirect(admin_url('login'));
        }

        // First-day bootstrap is not complete until a restaurant device has been
        // explicitly activated. TOTP enrollment alone must not open Workspace.
        if (!$site->policyEnabled($locationId)) {
            foreach (['login', 'logout', 'siteaccess', '_assets'] as $allowed) {
                if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
            }

            if ($isOwner && app(PmdOwnerTotpService::class)->enabled((int)$identity['user_id'])) {
                return redirect(admin_url('siteaccess/hub'));
            }

            return redirect(admin_url('login'));
        }

        $binding = app(PmdSiteAccessSessionBindingService::class);
        $workspaceVerified = $site->isWorkspaceVerified($locationId)
            && $binding->isBoundToCurrentUser();

        foreach (['siteaccess', 'login', 'logout', '_assets'] as $allowed) {
            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
        }

        if ($workspaceVerified) return null;

        $pending = $site->challengeForSession();
        if ($pending && $pending->purpose === PmdSiteAccessService::PURPOSE_WORKSPACE) {
            return redirect(admin_url('login'));
        }

        $target = $this->safeTarget($request, $role, $relative);

        if ($isOwner && app(PmdOwnerTotpService::class)->enabled((int)$identity['user_id'])) {
            session()->put('pmd_login_owner_security_v1', [
                'mode' => 'verify',
                'user_id' => (int)$identity['user_id'],
                'location_id' => $locationId,
                'session_id' => (string)session()->getId(),
                'created_at' => time(),
            ]);
            session()->put('pmd_owner_totp_after_v1', $target);
            return redirect(admin_url('login'));
        }

        if ($identity['staff_id'] < 1) {
            return redirect(admin_url('login'))
                ->with('error', 'This account is not assigned to a restaurant role.');
        }

        $challengeRequest = $request->duplicate(null, null, null, []);
        $pending = $site->beginChallenge(
            PmdSiteAccessService::PURPOSE_WORKSPACE,
            $target,
            $challengeRequest
        );

        return $pending
            ? redirect(admin_url('login'))
            : redirect(admin_url('login'))->with('error', 'Restaurant verification could not be started.');
    }

    private function relativeAdminPath(Request $request): string
    {
        $path = trim((string)$request->path(), '/');
        $admin = trim((string)config('system.adminUri', 'admin'), '/');
        if ($path === $admin) return '';
        if (str_starts_with($path, $admin.'/')) return substr($path, strlen($admin) + 1);
        return $path;
    }

    private function safeTarget(Request $request, string $role, string $relative): string
    {
        if ($request->isMethod('GET') && $relative !== '') return $request->fullUrl();

        $route = app(PmdDefaultStaffRoleService::class)->routeForRoleCode($role);
        return $route ? admin_url($route) : admin_url('login');
    }
}
