<?php

namespace Admin\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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
             * PMD_SHIFT_AUDIT_ACTOR_CONTEXT_V1
             *
             * Canonical Shifts writes are made with Query Builder from several
             * code paths (save/edit, copy, merge, confirmation/replacements).
             * The immutable DB audit triggers therefore need an authenticated
             * request actor without coupling every write path to the audit layer.
             * MySQL session variables are connection-local and are reset on every
             * Admin web request so a reused PHP DB connection can never leak the
             * previous request's identity.
             */
            $this->bindPmdShiftAuditActor($request);
        }

        return $next($request);
    }

    private function bindPmdShiftAuditActor($request): void
    {
        try {
            $connection = DB::connection();
            if ($connection->getDriverName() !== 'mysql') return;

            $connection->statement(
                'SET @pmd_actor_admin_user_id = NULL, @pmd_actor_staff_id = NULL, @pmd_actor_name = NULL, @pmd_actor_role = NULL, @pmd_audit_source = NULL'
            );

            $auth = resolve('admin.auth');
            if (!$auth->check()) return;

            $user = $auth->user();
            $staff = null;
            try {
                $staff = $user ? $user->staff : null;
            } catch (\Throwable $error) {
                $staff = null;
            }

            $userId = $user ? (int)$user->getKey() : 0;
            $staffId = $staff ? (int)($staff->staff_id ?? $staff->getKey()) : 0;
            $name = trim((string)($staff->staff_name ?? $user->username ?? ''));
            $roleName = '';
            try {
                $role = $staff ? $staff->role : null;
                $roleName = trim((string)($role->name ?? $role->code ?? ''));
            } catch (\Throwable $error) {
                $roleName = '';
            }

            $source = strtoupper((string)$request->method()).' /'.trim((string)$request->path(), '/');

            $connection->statement(
                'SET @pmd_actor_admin_user_id = ?, @pmd_actor_staff_id = ?, @pmd_actor_name = ?, @pmd_actor_role = ?, @pmd_audit_source = ?',
                [
                    $userId > 0 ? $userId : null,
                    $staffId > 0 ? $staffId : null,
                    $name !== '' ? mb_substr($name, 0, 128) : null,
                    $roleName !== '' ? mb_substr($roleName, 0, 64) : null,
                    mb_substr($source, 0, 191),
                ]
            );
        } catch (\Throwable $error) {
            // Audit context is additive and must never block normal Admin work.
            logger()->warning('PMD shift audit actor context failed', [
                'type' => get_class($error),
            ]);
        }
    }
}
