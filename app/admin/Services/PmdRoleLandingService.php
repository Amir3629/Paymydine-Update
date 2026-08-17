<?php

namespace Admin\Services;

/**
 * PMD_ROLE_LANDING_SERVICE_V1
 *
 * One server-side authority for PMD admin landing workspaces.
 * It only chooses a destination; target controllers keep their own permissions.
 */
class PmdRoleLandingService
{
    private const ROLE_MAP = [
        'pmd-owner' => 'dashboardlab',
        'owner' => 'dashboardlab',

        'pmd-manager' => 'managerlab',
        'manager' => 'managerlab',

        'pmd-cashier' => 'cashierlab',
        'cashier' => 'cashierlab',

        // PMD product decision: Waiter and Cashier share the Cashier workspace.
        'pmd-waiter' => 'cashierlab',
        'waiter' => 'cashierlab',

        'pmd-accountant' => 'accountantlab',
        'accountant' => 'accountantlab',

        'pmd-reservation' => 'reservationslab',
        'pmd-reservations' => 'reservationslab',
        'reservation' => 'reservationslab',
        'reservations' => 'reservationslab',
    ];

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
        if (!$user)
            return null;

        // The native /admin/dashboard is retired. Super users land in the
        // owner workspace instead of rendering the legacy native dashboard.
        if (method_exists($user, 'isSuperUser') && $user->isSuperUser())
            return 'dashboardlab';

        try {
            $staff = $user->staff;
            $role = $staff ? $staff->role : null;

            if ($role) {
                $code = strtolower(trim((string)($role->code ?? '')));
                $name = strtolower(trim((string)($role->name ?? '')));

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
