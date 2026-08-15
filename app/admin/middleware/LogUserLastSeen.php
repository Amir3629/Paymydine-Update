<?php

namespace Admin\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;

class LogUserLastSeen
{
    public function handle($request, Closure $next)
    {
        if (App::hasDatabase()) {
            foreach (['admin.auth', 'auth'] as $authService) {
                if (App::hasDatabase() && resolve($authService)->check()) {
                    $cacheKey = 'is-online-'.str_replace('.', '-', $authService).'-user-'.resolve($authService)->getId();
                    $expireAt = Carbon::now()->addMinutes(2);
                    Cache::remember($cacheKey, $expireAt, function () use ($authService) {
                        return resolve($authService)->user()->updateLastSeen(Carbon::now());
                    });
                }
            }

            /*
             * PMD_ADMIN_SESSION_PRESENCE_V1
             *
             * The legacy two-minute cache above remains untouched because other
             * platform code may still use it as a "recent activity" marker.
             * Manager online presence is different: it follows the real admin
             * session until explicit logout or normal session expiry.
             */
            try {
                if (resolve('admin.auth')->check()) {
                    app(\Admin\Services\PmdAdminPresenceService::class)->touchCurrentSession();
                }
            } catch (\Throwable $error) {
                logger()->warning('PMD admin presence touch failed', [
                    'message' => $error->getMessage(),
                ]);
            }
        }

        return $next($request);
    }
}
