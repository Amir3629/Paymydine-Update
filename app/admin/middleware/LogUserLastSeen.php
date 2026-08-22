<?php

namespace Admin\Middleware;

use Admin\Services\PmdDefaultStaffRoleService;
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

            /*
             * PMD_MANAGED_ROLE_ROUTE_GATE_V1
             *
             * Permissions alone are not enough for product roles because some
             * operational endpoints are route closures or lightweight data
             * controllers. Enforce the role workspace boundary once, at the web
             * middleware layer, before any admin controller/closure executes.
             *
             * Owner: full access.
             * Manager: full operational access except Owner dashboard/Settings.
             * Cashier + Waiter: Cashier/Quick workspace and its canonical APIs.
             * Accountant: Accountant workspace only.
             * Reservations: Reservations workspace only.
             * KDS: exactly the station encoded in the locked KDS role.
             */
            if ($response = $this->pmdManagedRoleBoundary($request)) {
                return $response;
            }
        }

        return $next($request);
    }

    private function pmdManagedRoleBoundary($request)
    {
        $adminUri = trim((string)config('system.adminUri', 'admin'), '/');
        $path = trim((string)$request->path(), '/');

        if (
            $adminUri === ''
            || ($path !== $adminUri && !str_starts_with($path, $adminUri.'/'))
        ) {
            return null;
        }

        try {
            $auth = resolve('admin.auth');
            if (!$auth->check()) return null;

            $service = app(PmdDefaultStaffRoleService::class);
            $user = $auth->user();
            $roleCode = $service->roleCodeForUser($user);

            if (!$service->isManagedCode($roleCode)) return null;

            // PmdDefaultStaffRoleService uses the canonical "admin/..." path
            // vocabulary. Normalize custom adminUri installations here without
            // changing the product role definitions.
            $normalizedPath = $path;
            if ($adminUri !== 'admin') {
                $suffix = $path === $adminUri
                    ? ''
                    : substr($path, strlen($adminUri) + 1);
                $normalizedPath = 'admin'.($suffix !== '' ? '/'.$suffix : '');
            }

            if ($service->mayOpenPath($roleCode, $normalizedPath)) {
                return null;
            }

            $landing = $service->routeForRoleCode($roleCode);

            if ($request->ajax() || $request->expectsJson()) {
                return response()->json([
                    'ok' => false,
                    'message' => 'This staff role cannot access this workspace.',
                    'workspace' => $landing,
                ], 403);
            }

            if ($landing) {
                return redirect(admin_url($landing));
            }

            return response('This staff role cannot access this workspace.', 403);
        } catch (\Throwable $error) {
            logger()->warning('PMD managed role route gate failed', [
                'path' => $path,
                'message' => $error->getMessage(),
            ]);

            // Do not lock out custom/legacy installations if role resolution
            // itself fails. Normal controller permission checks still apply.
            return null;
        }
    }
}
