<?php

namespace Admin\Services;

/**
 * PMD_ROLE_LANDING_SERVICE_V2
 *
 * One server-side authority for PMD admin landing workspaces.
 * It only chooses a destination; target controllers keep their own permissions.
 * V2 adds one exact KDS landing per station role code.
 */
class PmdRoleLandingService
{
    private const ROLE_MAP = [
        'pmd-owner' => 'ownerdashboard',
        'owner' => 'ownerdashboard',

        'pmd-manager' => 'managerdashboard',
        'manager' => 'managerdashboard',

        'pmd-cashier' => 'orders',
        'cashier' => 'orders',

        // PMD product decision: Waiter and Cashier share the Cashier workspace.
        'pmd-waiter' => 'orders',
        'waiter' => 'orders',

        'pmd-accountant' => 'accountantdashboard',
        'accountant' => 'accountantdashboard',

        'pmd-reservation' => 'reservations',
        'pmd-reservations' => 'reservations',
        'reservation' => 'reservations',
        'reservations' => 'reservations',

        'pmd-team-member' => 'mywork',
        'team-member' => 'mywork',
        'team member' => 'mywork',
    ];

    private const USERNAME_FALLBACK_MAP = [
        'mehdiowner' => 'ownerdashboard',
        'mehdimanager' => 'managerdashboard',
        'mehdiwaiter' => 'orders',
        'mehdicashier' => 'orders',
        'mehdiaccountant' => 'accountantdashboard',
        'mehdireservations' => 'reservations',
    ];

    public function routeFor($user): ?string
    {
        if (!$user)
            return null;

        // The native /admin/dashboard is retired. Super users land in the
        // owner workspace instead of rendering the legacy native dashboard.
        if (method_exists($user, 'isSuperUser') && $user->isSuperUser())
            return 'ownerdashboard';

        try {
            $staff = $user->staff;
            $role = $staff ? $staff->role : null;

            if ($role) {
                $code = strtolower(trim((string)($role->code ?? '')));
                $name = strtolower(trim((string)($role->name ?? '')));

                if (str_starts_with($code, PmdDefaultStaffRoleService::KDS_PREFIX)) {
                    $slug = trim(substr($code, strlen(PmdDefaultStaffRoleService::KDS_PREFIX)));
                    if ($slug !== '')
                        return 'kitchendisplay/'.$slug;
                }

                if ($code !== '' && isset(self::ROLE_MAP[$code]))
                    return self::ROLE_MAP[$code];

                if ($name !== '' && isset(self::ROLE_MAP[$name]))
                    return self::ROLE_MAP[$name];
            }
        } catch (\Throwable $error) {
            // Fall through to the known test-account map, then null.
        }

        $username = strtolower(trim((string)($user->username ?? '')));

        return self::USERNAME_FALLBACK_MAP[$username] ?? null;
    }
}
