<?php

namespace Admin\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Support\Facades\App;

class LogUserLastSeen
{
    public function handle($request, Closure $next)
    {
        if (App::hasDatabase()) {
            foreach (['admin.auth', 'auth'] as $authService) {
                if (App::hasDatabase() && resolve($authService)->check()) {
                    $cacheKey = 'is-online-'.str_replace('.', '-', $authService).'-user-'.resolve($authService)->getId();
                    $expireAt = Carbon::now()->addMinutes(2);
                    cache()->remember($cacheKey, $expireAt, function () use ($authService) {
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

            /*
             * PMD_FIXED_ROLE_AUTHORITY_R43
             *
             * This middleware is already the shared authenticated Admin web
             * boundary, so fixed operational roles are enforced server-side
             * here rather than by hiding navigation in the browser.
             */
            try {
                if (resolve('admin.auth')->check()) {
                    $roleAuthority = app(\Admin\Services\PmdFixedRoleAuthorityV1::class);
                    $roleAuthority->installSettingsCardFilter();

                    if ($blocked = $roleAuthority->gate($request)) {
                        return $blocked;
                    }
                }
            } catch (\Throwable $error) {
                logger()->error('PMD fixed role authority failed closed', [
                    'message' => $error->getMessage(),
                    'path' => $request->path(),
                ]);

                return response('Staff access authority is temporarily unavailable.', 503);
            }
        }

        $response = $next($request);

        /*
         * PMD_CASHIER_QUICK_V22_RESPONSE_BRIDGE_R43
         * Only the accepted V2.1 mobile Cashier host receives these two
         * presentation/workflow assets. Normal desktop CashierLab is untouched.
         */
        try {
            return app(\Admin\Services\PmdCashierQuickV22Bridge::class)
                ->decorate($request, $response);
        } catch (\Throwable $error) {
            logger()->warning('PMD Cashier Quick V2.2 response decoration failed', [
                'message' => $error->getMessage(),
            ]);
        }

        return $response;
    }
}
