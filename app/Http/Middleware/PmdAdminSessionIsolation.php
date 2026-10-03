<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;

/**
 * PMD_ADMIN_SESSION_ISOLATION_V3
 *
 * Admin authentication must never share a browser session across tenant
 * subdomains. The project-level SESSION_DOMAIN may remain broad for legacy
 * frontend traffic; admin and Super Admin traffic override it here BEFORE
 * StartSession and receive a deterministic cookie name per hostname.
 */
class PmdAdminSessionIsolation
{
    public function handle(Request $request, Closure $next)
    {
        if (!$this->isAdminSurface($request)) {
            return $next($request);
        }

        $host = strtolower(trim((string)$request->getHost()));
        if ($host === '') {
            return $next($request);
        }

        // Same hostname => same admin session cookie.
        // Different tenant hostname => different cookie name.
        $cookieName = 'pmd_admin_session_v3_'.substr(hash('sha256', $host), 0, 16);

        Config::set('session.cookie', $cookieName);
        Config::set('session.domain', null);
        Config::set('session.path', '/');

        // Production PMD admin traffic is HTTPS. Preserve an explicit secure
        // setting, while also refusing to downgrade a secure HTTPS request.
        if ($request->isSecure()) {
            Config::set('session.secure', true);
        }

        // TastyIgniter's AdminAuth remember cookie is queued through Laravel's
        // CookieJar. Reset its defaults as well so pmd_admin_auth_v2 is host-only.
        $cookieJar = app('cookie');
        if (method_exists($cookieJar, 'setDefaultPathAndDomain')) {
            $cookieJar->setDefaultPathAndDomain(
                '/',
                null,
                (bool)config('session.secure', $request->isSecure()),
                config('session.same_site', 'lax')
            );
        }

        $request->attributes->set('pmd_admin_session_cookie', $cookieName);
        $request->attributes->set('pmd_admin_session_host', $host);

        return $next($request);
    }

    private function isAdminSurface(Request $request): bool
    {
        $path = trim((string)$request->path(), '/');
        $adminUri = trim((string)config('system.adminUri', 'admin'), '/');

        $isTenantAdmin = $adminUri !== '' && (
            $path === $adminUri
            || str_starts_with($path, $adminUri.'/')
        );

        $isSuperAdmin = $path === 'superadmin'
            || str_starts_with($path, 'superadmin/');

        return $isTenantAdmin || $isSuperAdmin;
    }
}
