<?php

namespace Admin\Traits;

use Admin\Facades\AdminAuth;
use App\Services\PmdPortalTotpService;
use App\Services\PmdSiteAccessQrService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkSessionPolicyService;
use Igniter\Flame\Exception\ValidationException;
use Illuminate\Support\Facades\DB;

/** PMD_PORTAL_PERSONAL_MFA_LOGIN_V1 */
trait HandlesPortalMfa
{
    private const PMD_PORTAL_SECURITY_SESSION = 'pmd_login_portal_security_v1';
    private const PMD_PORTAL_ATTEMPTS_SESSION = 'pmd_login_portal_mfa_attempts_v1';

    private function pmdPortalMfaIndexResponse()
    {
        if (!AdminAuth::isLogged()) return null;
        if (!session()->has(self::PMD_PORTAL_SECURITY_SESSION)) return null;

        $security = $this->pmdPortalMfaSecurityViewState();
        if (!$security) {
            return $this->pmdPortalMfaAbortToLogin(
                'This Portal security step expired. Sign in again.'
            );
        }

        return view('auth.login_portal_mfa_v1', [
            'pmdPortalSecurity' => $security,
        ]);
    }

    /**
     * Start personal MFA for a username ending in "portal". No Workplace
     * challenge is created, so there is nothing for Owner/Admin to approve.
     */
    private function pmdBeginPortalMfa(): void
    {
        if (!AdminAuth::isLogged()) {
            throw new ValidationException([
                'username' => 'Portal sign-in expired. Sign in again.',
            ]);
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);

        if ($userId < 1 || $locationId < 1) {
            throw new ValidationException([
                'username' => 'Portal security is not ready for this account.',
            ]);
        }

        $portal = app(PmdPortalTotpService::class);
        if (!$portal->ensureReady()) {
            throw new ValidationException([
                'username' => 'Portal Authenticator storage is unavailable. Try again shortly.',
            ]);
        }

        // A Portal login must never leave/reuse a restaurant approval challenge.
        $this->pmdPortalCancelWorkspaceChallenge();

        $portal->clearSessionVerification();
        $portal->resetEnrollment();
        session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);

        $mode = $portal->enabled($userId, $locationId) ? 'verify' : 'setup';
        session()->put(self::PMD_PORTAL_SECURITY_SESSION, [
            'mode' => $mode,
            'user_id' => $userId,
            'location_id' => $locationId,
            'session_id' => (string)session()->getId(),
            'created_at' => time(),
        ]);
    }

    public function onPortalMfaConfirm()
    {
        [$state, $identity] = $this->pmdRequirePortalMfaStep('setup');
        $this->pmdPortalMfaAssertAttemptBudget();

        $data = post();
        $this->validate($data, [
            'code' => ['required', 'regex:/^[0-9]{6}$/'],
        ], [], [
            'code' => 'Authenticator code',
        ]);

        $portal = app(PmdPortalTotpService::class);
        $ok = $portal->confirmEnrollment(
            (int)$identity['user_id'],
            (int)$identity['location_id'],
            (string)array_get($data, 'code', '')
        );

        if (!$ok) {
            $this->pmdPortalMfaRecordFailure();
            throw new ValidationException([
                'code' => 'That Authenticator code is not valid. Check the phone time and try again.',
            ]);
        }

        $this->pmdPortalMfaAudit('portal_totp_enrolled', $identity);
        return $this->pmdFinishPortalMfa($identity);
    }

    public function onPortalMfaVerify()
    {
        [$state, $identity] = $this->pmdRequirePortalMfaStep('verify');
        $this->pmdPortalMfaAssertAttemptBudget();

        $data = post();
        $this->validate($data, [
            'code' => ['required', 'regex:/^[0-9]{6}$/'],
        ], [], [
            'code' => 'Authenticator code',
        ]);

        $portal = app(PmdPortalTotpService::class);
        $ok = $portal->verify(
            (int)$identity['user_id'],
            (int)$identity['location_id'],
            (string)array_get($data, 'code', '')
        );

        if (!$ok) {
            $this->pmdPortalMfaRecordFailure();
            throw new ValidationException([
                'code' => 'The Authenticator code is not correct or was already used.',
            ]);
        }

        $this->pmdPortalMfaAudit('portal_totp_verified', $identity);
        return $this->pmdFinishPortalMfa($identity);
    }

    public function onPortalMfaCancel()
    {
        return $this->pmdPortalMfaAbortToLogin();
    }

    private function pmdPortalMfaSecurityViewState(): ?array
    {
        try {
            [$state, $identity] = $this->pmdPortalMfaStateAndIdentity();
            if (!$state || !$identity) return null;

            $portal = app(PmdPortalTotpService::class);
            if (!$portal->ensureReady()) return null;

            $mode = (string)($state['mode'] ?? '');
            if (!in_array($mode, ['setup', 'verify'], true)) return null;

            $security = [
                'mode' => $mode,
                'username' => (string)($identity['user']->username ?? 'staff'),
                'secret' => null,
                'qr_svg' => null,
            ];

            if ($mode === 'setup') {
                if ($portal->enabled(
                    (int)$identity['user_id'],
                    (int)$identity['location_id']
                )) {
                    $state['mode'] = 'verify';
                    session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
                    $security['mode'] = 'verify';
                    return $security;
                }

                $enrollment = $portal->enrollment(
                    (int)$identity['user_id'],
                    (int)$identity['location_id'],
                    (string)($identity['user']->username ?? 'staff')
                );
                $security['secret'] = (string)$enrollment['secret'];

                try {
                    $security['qr_svg'] = app(PmdSiteAccessQrService::class)->svg(
                        $portal->provisioningUri($enrollment),
                        5
                    );
                } catch (\Throwable $error) {
                    logger()->warning('PMD Portal Authenticator QR render failed', [
                        'user_id' => (int)$identity['user_id'],
                        'message' => $error->getMessage(),
                    ]);
                }
            } elseif (!$portal->enabled(
                (int)$identity['user_id'],
                (int)$identity['location_id']
            )) {
                $state['mode'] = 'setup';
                $state['created_at'] = time();
                session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
                return $this->pmdPortalMfaSecurityViewState();
            }

            return $security;
        } catch (\Throwable $error) {
            logger()->warning('PMD Portal MFA view state failed', [
                'message' => $error->getMessage(),
            ]);
            return null;
        }
    }

    private function pmdRequirePortalMfaStep(string $mode): array
    {
        [$state, $identity] = $this->pmdPortalMfaStateAndIdentity();

        if (
            !$state
            || !$identity
            || (string)($state['mode'] ?? '') !== $mode
        ) {
            throw new ValidationException([
                'code' => 'This Portal security step expired. Sign in again.',
            ]);
        }

        return [$state, $identity];
    }

    private function pmdPortalMfaStateAndIdentity(): array
    {
        if (!AdminAuth::isLogged()) return [null, null];

        $state = (array)session()->get(self::PMD_PORTAL_SECURITY_SESSION, []);
        $createdAt = (int)($state['created_at'] ?? 0);
        if (
            !in_array((string)($state['mode'] ?? ''), ['setup', 'verify'], true)
            || $createdAt <= (time() - 900)
            || !hash_equals(
                (string)($state['session_id'] ?? ''),
                (string)session()->getId()
            )
        ) {
            return [null, null];
        }

        try {
            $identity = app(PmdSiteAccessService::class)->identity();
        } catch (\Throwable $error) {
            return [null, null];
        }

        if (
            (int)($state['user_id'] ?? 0) !== (int)($identity['user_id'] ?? 0)
            || (int)($state['location_id'] ?? 0) !== (int)($identity['location_id'] ?? 0)
        ) {
            return [null, null];
        }

        return [$state, $identity];
    }

    private function pmdFinishPortalMfa(array $identity)
    {
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        $portal = app(PmdPortalTotpService::class);

        if (!$portal->sessionVerified($userId, $locationId, 120)) {
            throw new ValidationException([
                'code' => 'Portal security verification expired. Try again.',
            ]);
        }

        // Personal Portal TOTP satisfies this live session only. It does not
        // create any Workplace challenge or dashboard approval. Persistent
        // trusted-login creation is disabled for destination=staff.
        $site = app(PmdSiteAccessService::class);
        $site->markWorkspaceVerified($locationId, 'portal_totp', 0);
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);
        session()->put(PmdSiteAccessService::SESSION_DESTINATION, 'staff');
        session()->forget(self::PMD_PORTAL_SECURITY_SESSION);
        session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);
        $portal->resetEnrollment();

        $this->pmdPortalMfaAudit('portal_login_verified', $identity, [
            'session_until' => $policy['expires_at']->toIso8601String(),
            'session_reason' => $policy['reason'],
        ]);

        return redirect(admin_url('mywork'))
            ->with('success', 'Portal security verified.');
    }

    private function pmdPortalMfaAbortToLogin(?string $message = null)
    {
        $this->pmdPortalCancelWorkspaceChallenge();

        try {
            $portal = app(PmdPortalTotpService::class);
            $portal->clearSessionVerification();
            $portal->resetEnrollment();
        } catch (\Throwable $error) {
        }

        try {
            app(PmdSiteAccessService::class)->clearVerification();
        } catch (\Throwable $error) {
        }

        try {
            app(PmdWorkSessionPolicyService::class)->clear();
        } catch (\Throwable $error) {
        }

        session()->forget([
            self::PMD_PORTAL_SECURITY_SESSION,
            self::PMD_PORTAL_ATTEMPTS_SESSION,
            PmdSiteAccessService::SESSION_DESTINATION,
        ]);

        try {
            AdminAuth::logout();
        } catch (\Throwable $error) {
        }

        session()->invalidate();
        session()->regenerateToken();

        $response = redirect(admin_url('login'));
        return $message ? $response->with('error', $message) : $response;
    }

    private function pmdPortalCancelWorkspaceChallenge(): void
    {
        try {
            $site = app(PmdSiteAccessService::class);
            if ($site->ready()) {
                $challenge = $site->challengeForSession();
                if (
                    $challenge
                    && in_array((string)$challenge->status, ['pending', 'approved'], true)
                ) {
                    DB::table('pmd_site_access_challenges')
                        ->where('id', (int)$challenge->id)
                        ->update([
                            'status' => 'declined',
                            'updated_at' => now(),
                        ]);
                }
            }
        } catch (\Throwable $error) {
        }

        session()->forget(PmdSiteAccessService::SESSION_PENDING);
    }

    private function pmdPortalMfaAssertAttemptBudget(): void
    {
        $attempts = (array)session()->get(self::PMD_PORTAL_ATTEMPTS_SESSION, []);
        $startedAt = (int)($attempts['started_at'] ?? 0);
        $count = (int)($attempts['count'] ?? 0);

        if ($startedAt <= 0 || $startedAt <= (time() - 900)) {
            session()->put(self::PMD_PORTAL_ATTEMPTS_SESSION, [
                'started_at' => time(),
                'count' => 0,
            ]);
            return;
        }

        if ($count >= 8) {
            throw new ValidationException([
                'code' => 'Too many Authenticator attempts. Sign in again after 15 minutes.',
            ]);
        }
    }

    private function pmdPortalMfaRecordFailure(): void
    {
        $attempts = (array)session()->get(self::PMD_PORTAL_ATTEMPTS_SESSION, []);
        $startedAt = (int)($attempts['started_at'] ?? 0);

        if ($startedAt <= 0 || $startedAt <= (time() - 900)) {
            $startedAt = time();
            $count = 0;
        } else {
            $count = (int)($attempts['count'] ?? 0);
        }

        session()->put(self::PMD_PORTAL_ATTEMPTS_SESSION, [
            'started_at' => $startedAt,
            'count' => $count + 1,
        ]);
    }

    private function pmdPortalMfaAudit(
        string $event,
        array $identity,
        array $meta = []
    ): void {
        try {
            $site = app(PmdSiteAccessService::class);
            if (!$site->ready()) return;

            $site->audit(
                $event,
                true,
                $identity,
                null,
                null,
                request(),
                array_merge(['surface' => 'staff_portal_totp'], $meta)
            );
        } catch (\Throwable $error) {
        }
    }
}
