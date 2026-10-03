<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdTrustedLoginDeviceService;
use App\Services\PmdWorkSessionPolicyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** PMD_OWNER_EMERGENCY_ACCESS_V1 */
class PmdOwnerEmergencyAccessController
{
    private const LOGIN_SECURITY_SESSION = 'pmd_login_owner_security_v1';
    private const RECOVERY_DISPLAY_SESSION = 'pmd_owner_recovery_codes_once_v1';
    private const AFTER_SESSION = 'pmd_owner_totp_after_v1';
    private const STATE_TTL_SECONDS = 900;

    public function confirm(Request $request)
    {
        [$state, $identity] = $this->requireState('setup');
        $code = preg_replace('/\D+/', '', (string)$request->input('code', ''));
        if (strlen($code) !== 6) {
            return $this->loginError('Enter the 6-digit Authenticator code.');
        }

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->confirmEnrollment(
            (int)$identity['user_id'],
            (int)$identity['location_id'],
            $code
        )) {
            return $this->loginError('That Authenticator code is not valid.');
        }

        $site = app(PmdSiteAccessService::class);
        $site->audit(
            'owner_totp_enrolled',
            true,
            $identity,
            null,
            null,
            $request,
            ['surface' => 'canonical_login']
        );

        $target = (string)session()->get(self::AFTER_SESSION, admin_url('siteaccess/hub'));
        if ($target === '') $target = admin_url('siteaccess/hub');

        $codes = $this->prepareRecoveryCodes($site, $identity, $request);
        if ($codes) {
            $this->queueRecoveryCodes($identity, $target, $codes);
            session()->forget(self::AFTER_SESSION);
            return redirect(admin_url('login'));
        }

        session()->forget([
            self::LOGIN_SECURITY_SESSION,
            self::RECOVERY_DISPLAY_SESSION,
            self::AFTER_SESSION,
        ]);
        return redirect($target)->with('success', 'Authenticator connected.');
    }

    public function verify(Request $request)
    {
        [$state, $identity] = $this->requireState('verify');
        $code = preg_replace('/\D+/', '', (string)$request->input('code', ''));
        if (strlen($code) !== 6) {
            return $this->loginError('Enter the 6-digit Authenticator code.');
        }

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->verify((int)$identity['user_id'], $code)) {
            app(PmdSiteAccessService::class)->audit(
                'owner_totp_failed',
                false,
                $identity,
                null,
                null,
                $request,
                ['surface' => 'canonical_login']
            );
            return $this->loginError('The Authenticator code is not correct or was already used.');
        }

        $site = app(PmdSiteAccessService::class);
        $pending = (array)session()->get(PmdSiteAccessService::SESSION_PENDING, []);
        $challenge = $site->challengeForSession();
        $target = (string)session()->get(self::AFTER_SESSION, '');
        if ($target === '') $target = (string)($pending['redirect'] ?? admin_url('ownerdashboard'));

        if ($challenge && (int)$challenge->user_id === (int)$identity['user_id']) {
            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
                'status' => 'used',
                'approved_at' => $challenge->approved_at ?: now(),
                'used_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $site->markWorkspaceVerified((int)$identity['location_id'], 'owner_totp', 0);
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);
        session()->forget(PmdSiteAccessService::SESSION_PENDING);

        $site->audit(
            'owner_totp_verified',
            true,
            $identity,
            null,
            $challenge ? (int)$challenge->id : null,
            $request,
            [
                'surface' => 'canonical_login',
                'session_until' => $policy['expires_at']->toIso8601String(),
                'session_reason' => $policy['reason'],
            ]
        );

        // PMD_OWNER_TRUST_EXACT_SUCCESS_V3
        $trustedLogin = app(PmdTrustedLoginDeviceService::class);

        // PMD_OWNER_TRUST_TRACE_TEMP_20260831
        logger()->warning('PMD OWNER TRUST TRACE before', [
            'logged' => AdminAuth::isLogged(),
            'user_id' => (int)($identity['user_id'] ?? 0),
            'location_id' => (int)($identity['location_id'] ?? 0),
            'path' => $request->path(),
        ]);

        $trustedResult = app(PmdTrustedLoginDeviceService::class)
            ->trustAfterVerifiedSecondFactor(
                $request,
                $identity
            );

        logger()->warning('PMD OWNER TRUST TRACE after', [
            'result' => $trustedResult,
            'logged' => AdminAuth::isLogged(),
            'user_id' => (int)($identity['user_id'] ?? 0),
            'location_id' => (int)($identity['location_id'] ?? 0),
            'path' => $request->path(),
        ]);

        $codes = $this->prepareRecoveryCodes($site, $identity, $request);
        if ($codes) {
            $this->queueRecoveryCodes($identity, $target, $codes);
            session()->forget(self::AFTER_SESSION);
            $response = redirect(admin_url('login'));

            return $trustedLogin
                ->rememberVerifiedResponse($request, $response);
        }

        session()->forget([
            self::LOGIN_SECURITY_SESSION,
            self::RECOVERY_DISPLAY_SESSION,
            self::AFTER_SESSION,
        ]);
        $response = redirect($target)
            ->with('success', 'Security verified.');

        return $trustedLogin
            ->rememberVerifiedResponse($request, $response);
    }

    public function recover(Request $request)
    {
        [$state, $identity] = $this->requireState('verify');
        $code = $this->normalizeRecoveryCode((string)$request->input('recovery_code', ''));
        if ($code === null) {
            return $this->loginError('Enter a valid emergency recovery code.');
        }

        $site = app(PmdSiteAccessService::class);
        if (!$site->useRecoveryCode($code, $request)) {
            return $this->loginError('That emergency code is invalid or was already used.');
        }

        $target = (string)session()->get(self::AFTER_SESSION, '');
        if ($target === '') {
            $destination = (string)session()->get(PmdSiteAccessService::SESSION_DESTINATION, 'workspace');
            $target = $destination === 'staff'
                ? admin_url('mywork')
                : admin_url('ownerdashboard');
        }

        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);
        app(PmdOwnerTotpService::class)->clearSessionVerification();

        $site->audit(
            'owner_recovery_session_started',
            true,
            $identity,
            null,
            null,
            $request,
            [
                'surface' => 'canonical_login',
                'session_until' => $policy['expires_at']->toIso8601String(),
                'session_reason' => $policy['reason'],
            ]
        );

        session()->forget([
            self::LOGIN_SECURITY_SESSION,
            self::RECOVERY_DISPLAY_SESSION,
            self::AFTER_SESSION,
            PmdSiteAccessService::SESSION_PENDING,
        ]);

        return redirect($target)->with('success', 'Emergency access verified.');
    }

    public function codesSaved(Request $request)
    {
        [$display, $identity] = $this->requireRecoveryDisplay();
        $target = trim((string)($display['target'] ?? ''));
        if ($target === '') $target = admin_url('ownerdashboard');

        app(PmdSiteAccessService::class)->audit(
            'owner_recovery_codes_saved',
            true,
            $identity,
            null,
            null,
            $request,
            ['surface' => 'canonical_login']
        );

        session()->forget([
            self::LOGIN_SECURITY_SESSION,
            self::RECOVERY_DISPLAY_SESSION,
            self::AFTER_SESSION,
        ]);
        return redirect($target)->with('success', 'Emergency codes saved.');
    }

    private function prepareRecoveryCodes(PmdSiteAccessService $site, array $identity, Request $request): array
    {
        try {
            if (!$this->recoveryCodesNeedAcknowledgement($identity)) return [];
            return $site->generateRecoveryCodes($request);
        } catch (\Throwable $error) {
            logger()->error('PMD Owner recovery code preparation failed', [
                'user_id' => (int)$identity['user_id'],
                'location_id' => (int)$identity['location_id'],
                'message' => $error->getMessage(),
            ]);
            return [];
        }
    }

    private function recoveryCodesNeedAcknowledgement(array $identity): bool
    {
        $locationId = (int)$identity['location_id'];
        $userId = (int)$identity['user_id'];

        $unused = DB::table('pmd_site_access_recovery_codes')
            ->where('location_id', $locationId)
            ->where('user_id', $userId)
            ->whereNull('used_at')
            ->count();
        if ($unused < 1) return true;

        $generatedAt = DB::table('pmd_site_access_events')
            ->where('location_id', $locationId)
            ->where('user_id', $userId)
            ->where('event_type', 'recovery_codes_generated')
            ->max('created_at');
        if (!$generatedAt) return true;

        $savedAt = DB::table('pmd_site_access_events')
            ->where('location_id', $locationId)
            ->where('user_id', $userId)
            ->where('event_type', 'owner_recovery_codes_saved')
            ->max('created_at');
        if (!$savedAt) return true;

        return strtotime((string)$savedAt) < strtotime((string)$generatedAt);
    }

    private function queueRecoveryCodes(array $identity, string $target, array $codes): void
    {
        // Keep the canonical Login controller in its valid Owner verify state.
        // The Blade view reads the separate one-time display package and swaps
        // the same /admin/login card to the recovery-code screen.
        session()->put(self::LOGIN_SECURITY_SESSION, [
            'mode' => 'verify',
            'user_id' => (int)$identity['user_id'],
            'location_id' => (int)$identity['location_id'],
            'session_id' => (string)session()->getId(),
            'created_at' => time(),
        ]);

        session()->put(self::RECOVERY_DISPLAY_SESSION, [
            'user_id' => (int)$identity['user_id'],
            'location_id' => (int)$identity['location_id'],
            'session_id' => (string)session()->getId(),
            'created_at' => time(),
            'target' => $target,
            'codes' => array_values($codes),
        ]);
    }

    private function requireRecoveryDisplay(): array
    {
        if (!AdminAuth::isLogged()) {
            abort(401, 'Authentication required.');
        }

        $identity = $this->ownerIdentity();
        $display = (array)session()->get(self::RECOVERY_DISPLAY_SESSION, []);
        $createdAt = (int)($display['created_at'] ?? 0);

        if (
            !$identity
            || (int)($display['user_id'] ?? 0) !== (int)$identity['user_id']
            || (int)($display['location_id'] ?? 0) !== (int)$identity['location_id']
            || !hash_equals((string)($display['session_id'] ?? ''), (string)session()->getId())
            || $createdAt <= (time() - self::STATE_TTL_SECONDS)
            || empty($display['codes'])
        ) {
            abort(419, 'Emergency code screen expired.');
        }

        return [$display, $identity];
    }

    private function requireState(string $mode): array
    {
        if (!AdminAuth::isLogged()) {
            abort(401, 'Authentication required.');
        }

        $identity = $this->ownerIdentity();
        $state = (array)session()->get(self::LOGIN_SECURITY_SESSION, []);
        $createdAt = (int)($state['created_at'] ?? 0);

        if (
            !$identity
            || (string)($state['mode'] ?? '') !== $mode
            || (int)($state['user_id'] ?? 0) !== (int)$identity['user_id']
            || (int)($state['location_id'] ?? 0) !== (int)$identity['location_id']
            || !hash_equals((string)($state['session_id'] ?? ''), (string)session()->getId())
            || $createdAt <= (time() - self::STATE_TTL_SECONDS)
        ) {
            abort(419, 'Security step expired.');
        }

        return [$state, $identity];
    }

    private function ownerIdentity(): ?array
    {
        try {
            $site = app(PmdSiteAccessService::class);
            if (!$site->ready()) return null;
            $identity = $site->identity();
            $role = app(PmdDefaultStaffRoleService::class)
                ->roleCodeForUser($identity['user'] ?? null);
            if ($role !== PmdDefaultStaffRoleService::OWNER) return null;
            if ((int)($identity['user_id'] ?? 0) < 1 || (int)($identity['location_id'] ?? 0) < 1) return null;
            return $identity;
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function normalizeRecoveryCode(string $value): ?string
    {
        $compact = strtoupper(preg_replace('/[^A-F0-9]/i', '', $value));
        if (!preg_match('/^[A-F0-9]{8}$/', $compact)) return null;
        return substr($compact, 0, 4).'-'.substr($compact, 4, 4);
    }

    private function loginError(string $message)
    {
        return redirect(admin_url('login'))->with('error', $message);
    }
}
