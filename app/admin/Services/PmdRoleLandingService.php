<?php

namespace Admin\Services;

/**
 * PMD_ROLE_LANDING_SERVICE_V2
 *
 * One server-side authority for PMD admin landing workspaces.
 * Default role routing delegates to PmdDefaultStaffRoleService, including
 * per-station KDS roles. Legacy role names and known test accounts remain as
 * compatibility fallbacks.
 */
class PmdRoleLandingService
{
    private const USERNAME_FALLBACK_MAP = [
        'mehdiowner' => 'dashboardlab',
        'mehdimanager' => 'managerlab',
        'mehdiwaiter' => 'cashierlab',
        'mehdicashier' => 'cashierlab',
        'mehdiaccountant' => 'accountantlab',
        'mehdireservations' => 'reservationslab',
    ];

    public function routeFor($user): ?string
    {
        if (!$user) return null;

        if (method_exists($user, 'isSuperUser') && $user->isSuperUser()) {
            return 'dashboardlab';
        }

        try {
            $service = app(PmdDefaultStaffRoleService::class);
            $code = $service->roleCodeForUser($user);
            $route = $service->routeForRoleCode($code);
            if ($route) return $route;

            $role = optional($user->staff)->role;
            if ($role) {
                $route = $service->routeForRoleCode(
                    strtolower(trim((string)($role->name ?? '')))
                );
                if ($route) return $route;
            }
        } catch (\Throwable $error) {
        }

        $username = strtolower(trim((string)($user->username ?? '')));
        return self::USERNAME_FALLBACK_MAP[$username] ?? null;
    }
}
