<?php

namespace App\Http\Middleware;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdOperationalRosterReconciler;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessWorkspaceGateService;
use App\Services\PmdTrustedLoginDeviceService;
use Closure;
use Illuminate\Http\Request;

/**
 * PMD_SITE_ACCESS_WEB_GATE_V3
 *
 * Security remains fail-closed after Workplace Access activation. V3 also
 * provides the server-first consolidation requested for Team/Shifts:
 * - trusted login devices skip repeat OTP/approval for the same user/browser;
 * - old Staff/User accounts are reconciled into the operational roster before
 *   the Shifts controller reads people;
 * - retired Team navigation/settings surfaces are removed from server HTML;
 * - Shifts final CSS/JS are present in the first response, avoiding refresh
 *   flashes from late stylesheet injection.
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

        $relative = $path === $admin
            ? ''
            : (str_starts_with($path, $admin.'/') ? substr($path, strlen($admin) + 1) : $path);

        // The browser Team pages are retired. Write/AJAX endpoints remain intact
        // for compatibility while Shifts becomes the single Team authority.
        if (
            in_array(strtoupper((string)$request->method()), ['GET', 'HEAD'], true)
            && in_array(strtolower($relative), ['settings/team', 'pmdteam', 'people'], true)
            && $this->isDocumentRequest($request)
        ) {
            return redirect(admin_url('shifts'), 302)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->header('X-PMD-Team-Authority', 'shifts');
        }

        // Reconcile old access-only Staff/User accounts before Shifts reads its
        // operational people list. This is location scoped and idempotent.
        if (
            strtolower($relative) === 'shifts'
            && AdminAuth::isLogged()
            && in_array(strtoupper((string)$request->method()), ['GET', 'HEAD'], true)
            && $this->isDocumentRequest($request)
        ) {
            try {
                $role = app(PmdDefaultStaffRoleService::class)
                    ->roleCodeForUser(AdminAuth::getUser());
                if (in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) {
                    $identity = app(PmdSiteAccessService::class)->identity();
                    $locationId = (int)($identity['location_id'] ?? 0);
                    if ($locationId > 0) {
                        app(PmdOperationalRosterReconciler::class)
                            ->reconcileLocation($locationId);
                    }
                }
            } catch (\Throwable $error) {
                logger()->warning('PMD legacy roster reconciliation failed', [
                    'message' => $error->getMessage(),
                    'path' => $request->path(),
                ]);
            }
        }

        // A previously verified browser resumes before Login can render another
        // OTP / restaurant-approval card.
        try {
            if (AdminAuth::isLogged()) {
                $trustedResume = app(PmdTrustedLoginDeviceService::class)
                    ->resumeIfPossible($request);
                if ($trustedResume) return $trustedResume;
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

        // Once a genuine second-factor session has been completed and bound to
        // the current user, remember this exact browser for later logins.
        try {
            $response = app(PmdTrustedLoginDeviceService::class)
                ->rememberVerifiedResponse($request, $response);
        } catch (\Throwable $error) {
            logger()->warning('PMD trusted login device remember failed', [
                'message' => $error->getMessage(),
                'path' => $request->path(),
            ]);
        }

        return $this->finalizeAdminHtml($request, $response, strtolower($relative));
    }

    private function finalizeAdminHtml(Request $request, $response, string $relative)
    {
        if (!$this->isDocumentRequest($request)) return $response;
        if (!method_exists($response, 'getContent') || !method_exists($response, 'setContent')) return $response;

        $type = strtolower((string)$response->headers->get('Content-Type', ''));
        if ($type !== '' && !str_contains($type, 'text/html')) return $response;

        $html = (string)$response->getContent();
        if ($html === '' || stripos($html, '<html') === false) return $response;

        // Remove Team from Side Menu in the first server response; no CSS hiding.
        $html = preg_replace(
            '~<a\\b(?=[^>]*class="[^"]*pmd-sm2__item[^"]*")(?=[^>]*href="[^"]*/admin/settings/team(?:[?#][^"]*)?")[^>]*>.*?</a>~is',
            '',
            $html
        ) ?? $html;

        // Give Shifts its own calendar-clock identity instead of the generic
        // calendar-list icon.
        $html = preg_replace_callback(
            '~(<a\\b(?=[^>]*class="[^"]*pmd-sm2__item[^"]*")(?=[^>]*href="[^"]*/admin/shifts(?:[?#][^"]*)?")[^>]*>)(.*?)(</a>)~is',
            function ($match) {
                $body = preg_replace(
                    '#<svg\\b[^>]*>.*?</svg>#is',
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/><circle cx="12" cy="14" r="3"/><path d="M12 12.5V14l1 1"/></svg>',
                    $match[2],
                    1
                );
                return $match[1].$body.$match[3];
            },
            $html,
            1
        ) ?? $html;

        // Team & Access is no longer a Settings destination.
        if ($relative === 'settings' || $relative === 'pmdsettings') {
            $html = preg_replace(
                '#<section\\b[^>]*id="pmd-settings-team"[^>]*>.*?</section>#is',
                '',
                $html,
                1
            ) ?? $html;
        }

        if ($relative === 'shifts') {
            // Retire the Members header shortcut and large Team panel before
            // either can receive a browser paint.
            $html = preg_replace(
                '#<button\\b(?=[^>]*class="[^"]*pmd-shifts__header-icon[^"]*")(?=[^>]*data-pmd-team-scroll(?:="")?)[^>]*>.*?</button>#is',
                '',
                $html,
                1
            ) ?? $html;
            $html = preg_replace(
                '#<section\\b[^>]*id="pmd-shifts-team-panel"[^>]*>.*?</section>#is',
                '',
                $html,
                1
            ) ?? $html;

            // Server-first final assets. The board is hidden only until the same
            // synchronous decoration pass applies role ordering/colors; a safety
            // fallback reveals it even if a browser extension blocks the JS file.
            $critical = <<<'HTML'
<style id="pmd-shifts-v18-critical">html.pmd-shifts-v18-booting body.pmd-shifts-page .pmd-shifts-final-board{visibility:hidden!important}html.pmd-shifts-v18-ready body.pmd-shifts-page .pmd-shifts-final-board{visibility:visible!important}</style>
<script id="pmd-shifts-v18-boot">document.documentElement.classList.add('pmd-shifts-v18-booting');window.setTimeout(function(){document.documentElement.classList.add('pmd-shifts-v18-ready')},1800);</script>
<link rel="stylesheet" href="/app/admin/assets/css/pmd-shifts-final-v18.css?v=18">
HTML;
            $script = '<script src="/app/admin/assets/js/pmd-shifts-final-v18.js?v=18"></script>';

            if (stripos($html, 'pmd-shifts-final-v18.css') === false) {
                $html = preg_replace('#</head>#i', $critical."\n</head>", $html, 1) ?? $html;
            }
            if (stripos($html, 'pmd-shifts-final-v18.js') === false) {
                $html = preg_replace('#</body>#i', $script."\n</body>", $html, 1) ?? $html;
            }
        }

        $response->setContent($html);
        return $response;
    }

    private function isDocumentRequest(Request $request): bool
    {
        if ($request->isMethod('HEAD')) return true;
        if ($request->ajax() || $request->expectsJson()) return false;

        $fetchDest = strtolower(trim((string)$request->headers->get('Sec-Fetch-Dest', '')));
        if (in_array($fetchDest, ['document', 'iframe'], true)) return true;

        $accept = strtolower((string)$request->headers->get('Accept', ''));
        return $accept === '' || str_contains($accept, 'text/html');
    }
}
