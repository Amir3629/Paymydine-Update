<?php

namespace App\Http\Middleware;

use Closure;

class SuperAdminCanonicalHost
{
    private const CANONICAL_HOST = 'paymydine.com';

    public function handle($request, Closure $next)
    {
        $host = strtolower(trim((string)$request->getHost()));

        if ($host !== self::CANONICAL_HOST) {
            $uri = '/'.ltrim((string)$request->getRequestUri(), '/');

            // 307 deliberately preserves POST bodies for stale forms/bookmarks
            // while moving every Super Admin request onto the central control plane.
            return redirect()->away('https://'.self::CANONICAL_HOST.$uri, 307);
        }

        return $next($request);
    }
}
