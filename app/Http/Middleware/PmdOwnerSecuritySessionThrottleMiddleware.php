<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdWorkSessionPolicyService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_OWNER_SECURITY_SESSION_THROTTLE_V1
 *
 * Owner TOTP / emergency-code attempts must not share an IP rate-limit bucket
 * with restaurant devices behind the same NAT. Limit attempts to the exact
 * authenticated password-login session instead. Eight failed submissions then
 * invalidate the incomplete Owner security session and require a fresh login.
 */
class PmdOwnerSecuritySessionThrottleMiddleware
{
    private const SESSION_KEY = 'pmd_owner_security_attempt_guard_v1';
    private const SECURITY_SESSION = 'pmd_login_owner_security_v1';
    private const RECOVERY_DISPLAY_SESSION = 'pmd_owner_recovery_codes_once_v1';
    private const AFTER_SESSION = 'pmd_owner_totp_after_v1';
    private const MAX_ATTEMPTS = 8;
    private const WINDOW_SECONDS = 900;

    public function handle(Request $request, Closure $next)
    {
        if (!AdminAuth::isLogged()) {
            return $next($request);
        }

        $user = AdminAuth::getUser();
        $userId = $user ? (int)$user->getKey() : 0;
        $sessionId = (string)session()->getId();
        $now = time();
        $state = (array)session()->get(self::SESSION_KEY, []);

        $sameWindow = $userId > 0
            && (int)($state['user_id'] ?? 0) === $userId
            && hash_equals((string)($state['session_id'] ?? ''), $sessionId)
            && (int)($state['started_at'] ?? 0) > ($now - self::WINDOW_SECONDS);

        $attempts = $sameWindow
            ? ((int)($state['attempts'] ?? 0) + 1)
            : 1;

        session()->put(self::SESSION_KEY, [
            'user_id' => $userId,
            'session_id' => $sessionId,
            'started_at' => $sameWindow
                ? (int)$state['started_at']
                : $now,
            'attempts' => $attempts,
        ]);

        if ($attempts <= self::MAX_ATTEMPTS) {
            return $next($request);
        }

        try {
            $site = app(PmdSiteAccessService::class);
            if ($site->ready()) {
                $identity = $site->identity();
                $site->audit(
                    'owner_security_attempts_locked',
                    false,
                    $identity,
                    null,
                    null,
                    $request,
                    [
                        'surface' => 'canonical_login',
                        'attempts' => $attempts,
                    ]
                );
                $site->clearVerification();
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD Owner security attempt lock audit failed', [
                'message' => $error->getMessage(),
            ]);
        }

        try {
            app(PmdWorkSessionPolicyService::class)->clear();
            app(PmdOwnerTotpService::class)->clearSessionVerification();
            AdminAuth::logout();
        } catch (\Throwable $error) {
        }

        session()->forget([
            self::SESSION_KEY,
            self::SECURITY_SESSION,
            self::RECOVERY_DISPLAY_SESSION,
            self::AFTER_SESSION,
            PmdSiteAccessService::SESSION_PENDING,
        ]);
        session()->invalidate();
        session()->regenerateToken();

        return redirect(admin_url('login'))
            ->with('error', 'Too many security attempts. Sign in again.');
    }
}
