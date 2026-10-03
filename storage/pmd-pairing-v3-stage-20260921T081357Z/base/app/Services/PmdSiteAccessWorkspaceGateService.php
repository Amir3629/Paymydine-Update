<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        // PMD_PORTAL_SESSION_ROUTE_ISOLATION_V1
        // usernameportal is a Staff Portal session, never an Admin workspace session.
        if ((string)session()->get(
            PmdSiteAccessService::SESSION_DESTINATION,
            'workspace'
        ) === 'staff') {
            return $this->portalGateResponse($request, $site, $identity, $locationId, $relative);
        }

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

        // PMD_OWNER_SUPPORT_MFA_RESET_SESSION_GUARD_V18B
        // A SuperAdmin Owner-MFA reset must invalidate the already-open Owner
        // workspace as well as remembered browsers. Direct Owner-TOTP sessions
        // are tied to the currently-active factor generation; trusted-login
        // sessions are tied to the exact still-active trusted device row.
        if ($isOwner && $workspaceVerified) {
            $ownerTotp = app(PmdOwnerTotpService::class);
            $ownerUserId = (int)$identity['user_id'];
            $method = (string)session()->get(PmdSiteAccessService::SESSION_VERIFIED_METHOD, '');
            $deviceId = (int)session()->get(PmdSiteAccessService::SESSION_VERIFIED_DEVICE, 0);
            $ownerSessionValid = false;

            if ($ownerTotp->ready() && $ownerTotp->enabled($ownerUserId)) {
                if ($method === 'trusted_login_device') {
                    try {
                        $trusted = app(PmdTrustedLoginDeviceService::class)
                            ->current($request, $identity);
                        $ownerSessionValid = $deviceId > 0
                            && $trusted
                            && (int)$trusted->id === $deviceId;
                    } catch (\Throwable $error) {
                        $ownerSessionValid = false;
                    }
                } else {
                    $proof = (array)session()->get(PmdOwnerTotpService::SESSION_VERIFIED, []);
                    $verifiedAt = (int)($proof['verified_at'] ?? 0);
                    $confirmedAt = 0;

                    try {
                        $confirmed = DB::table(PmdOwnerTotpService::TABLE)
                            ->where('user_id', $ownerUserId)
                            ->whereNotNull('confirmed_at')
                            ->whereNull('disabled_at')
                            ->orderByDesc('updated_at')
                            ->orderByDesc('id')
                            ->value('confirmed_at');
                        $confirmedAt = $confirmed ? (int)strtotime((string)$confirmed) : 0;
                    } catch (\Throwable $error) {
                        $confirmedAt = 0;
                    }

                    $ownerSessionValid = $ownerTotp->sessionVerified(
                            $ownerUserId,
                            $locationId,
                            86400
                        )
                        && $verifiedAt > 0
                        && $confirmedAt > 0
                        && $confirmedAt <= ($verifiedAt + 1);
                }
            }

            if (!$ownerSessionValid) {
                try {
                    $site->clearVerification();
                    $workSession->clear();
                    $ownerTotp->clearSessionVerification();
                    AdminAuth::logout();
                } catch (\Throwable $error) {
                }

                session()->invalidate();
                session()->regenerateToken();

                return redirect(admin_url('login?owner=security-reset'))->with(
                    'error',
                    'Your Owner Authenticator or trusted sign-in was reset by PayMyDine Support. Sign in again and connect a new Authenticator.'
                );
            }
        }

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

    /** PMD_PORTAL_SESSION_ROUTE_AUTHORITY_V2 */
    private function portalGateResponse(
        Request $request,
        PmdSiteAccessService $site,
        array $identity,
        int $locationId,
        string $relative
    ) {
        foreach (['logout', '_assets', '_pmd/language-switch'] as $allowed) {
            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
        }

        if (session()->has('pmd_login_portal_security_v1')) {
            // PMD_PORTAL_LOGIN_SELF_REDIRECT_FIX_V6
            // /admin/login is the Portal MFA setup/verify/recovery surface.
            // Never redirect that route to itself.
            if ($relative === 'login') return null;
            return redirect(admin_url('login'));
        }

        $binding = app(PmdSiteAccessSessionBindingService::class);
        $portal = app(PmdPortalTotpService::class);
        $proof = (array)session()->get(PmdPortalTotpService::SESSION_VERIFIED, []);
        $verifiedAt = (int)($proof['verified_at'] ?? 0);
        $activeFactor = null;

        try {
            if ($portal->ready()) {
                $activeFactor = \Illuminate\Support\Facades\DB::table(PmdPortalTotpService::TABLE)
                    ->where('user_id', (int)$identity['user_id'])
                    ->whereNotNull('confirmed_at')
                    ->whereNull('disabled_at')
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id')
                    ->first();
            }
        } catch (\Throwable $error) {
            $activeFactor = null;
        }

        $factorConfirmedAt = $activeFactor && !empty($activeFactor->confirmed_at)
            ? (int)strtotime((string)$activeFactor->confirmed_at)
            : 0;

        // The proof must belong to the currently-active factor generation.
        // Resetting or re-enrolling the factor makes old Portal sessions fail
        // on their very next request, even if their work-session cookie exists.
        $factorMatchesProof = $activeFactor
            && $verifiedAt > 0
            && $factorConfirmedAt > 0
            && $factorConfirmedAt <= ($verifiedAt + 1);

        $portalVerified = $site->isWorkspaceVerified($locationId)
            && (string)session()->get(PmdSiteAccessService::SESSION_VERIFIED_METHOD, '') === 'portal_totp'
            && $binding->isBoundToCurrentUser()
            && $portal->sessionVerified(
                (int)$identity['user_id'],
                $locationId,
                86400
            )
            && $factorMatchesProof;

        if (!$portalVerified) {
            try {
                $site->clearVerification();
                app(PmdWorkSessionPolicyService::class)->clear();
                AdminAuth::logout();
            } catch (\Throwable $error) {
            }

            session()->invalidate();
            session()->regenerateToken();

            if ($relative === 'login') return null;

            return redirect(admin_url('login?portal=security-reset'))->with(
                'error',
                'Your Portal Authenticator was reset or changed. Sign in again and use the new factor.'
            );
        }

        if ($relative === 'login') return null;
        if ($relative === 'mywork' || str_starts_with($relative, 'mywork/')) return null;
        if ($relative === 'siteaccess/session/ping') return null;

        if ($request->isMethod('GET') || $request->isMethod('HEAD')) {
            return redirect(admin_url('mywork'));
        }

        return response(
            'This Staff Portal session cannot perform Admin workspace actions.',
            403,
            ['Cache-Control' => 'no-store']
        );
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
