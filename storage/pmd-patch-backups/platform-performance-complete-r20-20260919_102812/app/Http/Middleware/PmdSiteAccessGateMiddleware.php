<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessWorkspaceGateService;
use App\Services\PmdTrustedLoginDeviceService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_WEB_GATE_V2
 * PMD_TRUSTED_DEVICE_LOGIN_GATE_V1
 *
 * Security-only middleware. It never rewrites admin HTML.
 *
 * Before first Workplace Access activation rollout remains fail-open so schema
 * installation cannot brick an existing restaurant. Once the security policy
 * is active, failures fail closed. A browser that has already completed the
 * configured second factor for this exact user + restaurant may resume that
 * verification on later password logins from the same trusted browser.
 */
class PmdSiteAccessGateMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $path = trim((string)$request->path(), '/');
        $admin = trim((string)config('system.adminUri', 'admin'), '/');

        if ($path !== $admin && !str_starts_with($path, $admin.'/')) {
            return $next($request);
        }

        // PMD_TRUSTED_COOKIE_SURVIVES_LOGOUT_V3
        // Capture only an already-valid trusted browser before downstream
        // logout/session invalidation. Ordinary Sign out must not revoke it.
        $trustedDeviceBeforeResponse = null;

        try {
            if (AdminAuth::isLogged()) {
                $trustedDeviceBeforeResponse =
                    app(PmdTrustedLoginDeviceService::class)
                        ->current($request);
            }
        } catch (\Throwable $error) {
            $trustedDeviceBeforeResponse = null;
        }

        // PMD_TRUSTED_DEVICE_RESUME_V1
        // Login.php deliberately clears session verification after every fresh
        // password login. If this browser was verified previously for the same
        // user and location, restore the workspace verification before the OTP /
        // approval card can render. Unknown/new/revoked browsers fall through to
        // the normal security flow.
        try {
            if (AdminAuth::isLogged()) {
                $trusted = app(PmdTrustedLoginDeviceService::class)
                    ->resumeIfPossible($request);
                if ($trusted) return $trusted;
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD trusted login resume check failed', [
                'message' => $error->getMessage(),
                'path' => $request->path(),
            ]);
        }

        try {
            $gate = app(PmdSiteAccessWorkspaceGateService::class)->gateResponse($request);
            if ($gate) return $gate;
        } catch (\Throwable $error) {
            logger()->error('PMD Workplace Access gate failed', [
                'message' => $error->getMessage(),
                'path' => $request->path(),
            ]);

            // PMD_WORKPLACE_GATE_FAIL_CLOSED_V1
            // If the restaurant already activated Workplace Access, never turn a
            // service error into password-only access. Before activation we keep
            // rollout-safe behavior so code/schema installation cannot lock an
            // existing tenant.
            try {
                $site = app(PmdSiteAccessService::class);
                if (AdminAuth::isLogged() && $site->ready() && $site->policyEnabled()) {
                    return response(
                        'Workplace security verification is temporarily unavailable. Please try again.',
                        503,
                        ['Cache-Control' => 'no-store']
                    );
                }
            } catch (\Throwable $policyError) {
                logger()->error('PMD Workplace Access policy-state check failed', [
                    'message' => $policyError->getMessage(),
                ]);
            }
        }

        $response = $next($request);

        // PMD_TRUSTED_DEVICE_REMEMBER_V1
        // Only a genuinely verified + session-bound response can create or renew
        // the persistent browser token. Merely knowing the password never does.
        try {
            $response = app(PmdTrustedLoginDeviceService::class)
                ->rememberVerifiedResponse($request, $response);
        } catch (\Throwable $error) {
            logger()->warning('PMD trusted login device remember failed', [
                'message' => $error->getMessage(),
                'path' => $request->path(),
            ]);
        }

        if ($trustedDeviceBeforeResponse) {
            try {
                $response = app(PmdTrustedLoginDeviceService::class)
                    ->renewExistingCookie($request, $response);
            } catch (\Throwable $error) {
                logger()->warning(
                    'PMD trusted cookie logout preservation failed',
                    [
                        'message' => $error->getMessage(),
                        'path' => $request->path(),
                    ]
                );
            }
        }

        return $response;
    }
}
