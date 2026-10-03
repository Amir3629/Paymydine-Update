<?php

namespace Admin\Traits;

use Admin\Facades\AdminAuth;
use App\Services\PmdPortalQrService;
use App\Services\PmdPortalTotpService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkSessionPolicyService;
use Igniter\Flame\Exception\ValidationException;
use Illuminate\Support\Facades\DB;

/** PMD_PORTAL_PERSONAL_MFA_LOGIN_V2 */
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
            return $this->pmdPortalMfaAbortToLogin('This Portal security step expired. Sign in again.');
        }

        return response()
            ->view('auth.login_portal_mfa_v1', ['pmdPortalSecurity' => $security])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            ->header('Pragma', 'no-cache')
            ->header('Referrer-Policy', 'no-referrer')
            ->header('X-Frame-Options', 'DENY');
    }

    private function pmdBeginPortalMfa(): void
    {
        if (!AdminAuth::isLogged()) {
            throw new ValidationException(['username' => 'Portal sign-in expired. Sign in again.']);
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $userId = (int)($identity['user_id'] ?? 0);
        $staffId = (int)($identity['staff_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);

        // PMD_PORTAL_REQUIRE_STAFF_PROFILE_V2
        if ($userId < 1 || $staffId < 1 || $locationId < 1) {
            throw new ValidationException([
                'username' => 'This account needs an active Team profile before Staff Portal can be used.',
            ]);
        }

        $portal = app(PmdPortalTotpService::class);
        if (!$portal->ensureReady()) {
            throw new ValidationException([
                'username' => 'Portal Authenticator storage is unavailable. Try again shortly.',
            ]);
        }

        $this->pmdPortalCancelWorkspaceChallenge();
        $portal->clearSessionVerification();
        $portal->resetEnrollment();
        $portal->clearRecoveryDisplay();
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
        $this->validate($data, ['code' => ['required', 'regex:/^[0-9]{6}$/']], [], [
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

        $state['mode'] = 'recovery_codes';
        $state['created_at'] = time();
        session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
        session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);

        $this->pmdPortalMfaAudit('portal_totp_enrolled', $identity);
        return redirect(admin_url('login'));
    }

    public function onPortalMfaVerify()
    {
        [$state, $identity] = $this->pmdRequirePortalMfaStep('verify');
        $this->pmdPortalMfaAssertAttemptBudget();

        $data = post();
        $this->validate($data, ['code' => ['required', 'regex:/^[0-9]{6}$/']], [], [
            'code' => 'Authenticator code',
        ]);

        $portal = app(PmdPortalTotpService::class);
        $userId = (int)$identity['user_id'];
        $ok = $portal->verify(
            $userId,
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

        // Existing V1/V2 enrollments and interrupted first-time setups must not
        // silently continue without a usable recovery path. After a genuine TOTP
        // success, generate a fresh set and require explicit acknowledgement.
        if ($portal->needsRecoveryAcknowledgement($userId)) {
            if (!$portal->ensureRecoveryCodesForDisplay($userId)) {
                throw new ValidationException([
                    'code' => 'Recovery codes could not be prepared. Try again.',
                ]);
            }
            $state['mode'] = 'recovery_codes';
            $state['created_at'] = time();
            session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
            session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);
            return redirect(admin_url('login'));
        }

        return $this->pmdFinishPortalMfa($identity);
    }

    public function onPortalMfaBeginRecovery()
    {
        [$state, $identity] = $this->pmdRequirePortalMfaStep('verify');
        $state['mode'] = 'recover';
        $state['created_at'] = time();
        session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
        session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);
        $this->pmdPortalMfaAudit('portal_recovery_started', $identity);
        return redirect(admin_url('login'));
    }

    public function onPortalMfaRecover()
    {
        [$state, $identity] = $this->pmdRequirePortalMfaStep('recover');
        $this->pmdPortalMfaAssertAttemptBudget();

        $data = post();
        $this->validate($data, [
            'recovery_code' => ['required', 'regex:/^[A-Za-z0-9 -]{8,20}$/'],
        ], [], ['recovery_code' => 'Recovery code']);

        $portal = app(PmdPortalTotpService::class);
        $ok = $portal->recoverToNewEnrollment(
            (int)$identity['user_id'],
            (string)array_get($data, 'recovery_code', '')
        );

        if (!$ok) {
            $this->pmdPortalMfaRecordFailure();
            throw new ValidationException([
                'recovery_code' => 'That recovery code is not valid or was already used.',
            ]);
        }

        $state['mode'] = 'setup';
        $state['created_at'] = time();
        session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
        session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);
        $this->pmdPortalMfaAudit('portal_recovery_code_used_factor_reset', $identity);
        return redirect(admin_url('login'));
    }

    public function onPortalMfaBackToVerify()
    {
        [$state] = $this->pmdRequirePortalMfaStep('recover');
        $state['mode'] = 'verify';
        $state['created_at'] = time();
        session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
        session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);
        return redirect(admin_url('login'));
    }

    public function onPortalMfaRecoveryCodesContinue()
    {
        [$state, $identity] = $this->pmdRequirePortalMfaStep('recovery_codes');
        $portal = app(PmdPortalTotpService::class);
        $userId = (int)$identity['user_id'];

        if (!$portal->acknowledgeRecoveryCodes($userId)) {
            throw new ValidationException([
                'code' => 'Recovery codes expired. Verify your Authenticator again.',
            ]);
        }

        $this->pmdPortalMfaAudit('portal_recovery_codes_acknowledged', $identity);
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
            if (!in_array($mode, ['setup', 'verify', 'recover', 'recovery_codes'], true)) return null;

            $userId = (int)$identity['user_id'];
            $locationId = (int)$identity['location_id'];
            $security = [
                'mode' => $mode,
                'username' => (string)($identity['user']->username ?? 'staff'),
                'manual_secret' => null,
                'qr_svg' => null,
                'recovery_codes' => [],
            ];

            if ($mode === 'setup') {
                if ($portal->enabled($userId, $locationId)) {
                    $state['mode'] = 'verify';
                    $state['created_at'] = time();
                    session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
                    $security['mode'] = 'verify';
                    return $security;
                }

                $enrollment = $portal->enrollment(
                    $userId,
                    $locationId,
                    (string)($identity['user']->username ?? 'staff')
                );
                $security['manual_secret'] = $portal->enrollmentSecret($enrollment);

                try {
                    $security['qr_svg'] = app(PmdPortalQrService::class)
                        ->svg($portal->provisioningUri($enrollment), 5);
                } catch (\Throwable $error) {
                    logger()->warning('PMD Portal Authenticator QR render failed', [
                        'user_id' => $userId,
                        'message' => $error->getMessage(),
                    ]);
                }
            } elseif ($mode === 'verify' || $mode === 'recover') {
                if (!$portal->enabled($userId, $locationId)) {
                    $state['mode'] = 'setup';
                    $state['created_at'] = time();
                    session()->put(self::PMD_PORTAL_SECURITY_SESSION, $state);
                    return $this->pmdPortalMfaSecurityViewState();
                }
            } elseif ($mode === 'recovery_codes') {
                if (!$portal->needsRecoveryAcknowledgement($userId)) {
                    return null;
                }
                $security['recovery_codes'] = $portal->recoveryCodesForDisplay();
                if (!$security['recovery_codes']) {
                    $security['recovery_codes'] = $portal->ensureRecoveryCodesForDisplay($userId);
                }
                if (!$security['recovery_codes']) return null;
            }

            return $security;
        } catch (\Throwable $error) {
            logger()->warning('PMD Portal MFA view state failed', ['message' => $error->getMessage()]);
            return null;
        }
    }

    private function pmdRequirePortalMfaStep(string $mode): array
    {
        [$state, $identity] = $this->pmdPortalMfaStateAndIdentity();
        if (!$state || !$identity || (string)($state['mode'] ?? '') !== $mode) {
            throw new ValidationException(['code' => 'This Portal security step expired. Sign in again.']);
        }
        return [$state, $identity];
    }

    private function pmdPortalMfaStateAndIdentity(): array
    {
        if (!AdminAuth::isLogged()) return [null, null];

        $state = (array)session()->get(self::PMD_PORTAL_SECURITY_SESSION, []);
        $createdAt = (int)($state['created_at'] ?? 0);
        if (
            !in_array((string)($state['mode'] ?? ''), ['setup', 'verify', 'recover', 'recovery_codes'], true)
            || $createdAt <= (time() - 900)
            || !hash_equals((string)($state['session_id'] ?? ''), (string)session()->getId())
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

        if (!$portal->sessionVerified($userId, $locationId, 900)) {
            throw new ValidationException(['code' => 'Portal security verification expired. Try again.']);
        }
        if ($portal->needsRecoveryAcknowledgement($userId)) {
            throw new ValidationException([
                'code' => 'Save and acknowledge your personal recovery codes before opening Portal.',
            ]);
        }

        $site = app(PmdSiteAccessService::class);
        $site->markWorkspaceVerified($locationId, 'portal_totp', 0);
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);

        session()->put(PmdSiteAccessService::SESSION_DESTINATION, 'staff');
        session()->forget(self::PMD_PORTAL_SECURITY_SESSION);
        session()->forget(self::PMD_PORTAL_ATTEMPTS_SESSION);
        $portal->resetEnrollment();
        $portal->clearRecoveryDisplay();

        $this->pmdPortalMfaAudit('portal_login_verified', $identity, [
            'session_until' => $policy['expires_at']->toIso8601String(),
            'session_reason' => $policy['reason'],
        ]);

        return redirect(admin_url('mywork'))->with('success', 'Portal security verified.');
    }

    private function pmdPortalMfaAbortToLogin(?string $message = null)
    {
        $this->pmdPortalCancelWorkspaceChallenge();

        try {
            $portal = app(PmdPortalTotpService::class);
            $portal->clearSessionVerification();
            $portal->resetEnrollment();
            $portal->clearRecoveryDisplay();
        } catch (\Throwable $error) {
        }

        try { app(PmdSiteAccessService::class)->clearVerification(); } catch (\Throwable $error) {}
        try { app(PmdWorkSessionPolicyService::class)->clear(); } catch (\Throwable $error) {}

        session()->forget([
            self::PMD_PORTAL_SECURITY_SESSION,
            self::PMD_PORTAL_ATTEMPTS_SESSION,
            PmdSiteAccessService::SESSION_DESTINATION,
        ]);

        try { AdminAuth::logout(); } catch (\Throwable $error) {}
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
                if ($challenge && in_array((string)$challenge->status, ['pending', 'approved'], true)) {
                    DB::table('pmd_site_access_challenges')
                        ->where('id', (int)$challenge->id)
                        ->update(['status' => 'declined', 'updated_at' => now()]);
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
            session()->put(self::PMD_PORTAL_ATTEMPTS_SESSION, ['started_at' => time(), 'count' => 0]);
            return;
        }

        if ($count >= 8) {
            throw new ValidationException(['code' => 'Too many security attempts. Sign in again after 15 minutes.']);
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

    private function pmdPortalMfaAudit(string $event, array $identity, array $meta = []): void
    {
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
