<?php

namespace Admin\Services;

use Admin\Classes\PermissionManager;
use Admin\Models\Staff_roles_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** PMD_DEFAULT_STAFF_ROLES_V3 */
class PmdDefaultStaffRoleService
{
    public const OWNER = 'pmd-owner';
    public const MANAGER = 'pmd-manager';
    public const CASHIER = 'pmd-cashier';
    public const WAITER = 'pmd-waiter';
    public const ACCOUNTANT = 'pmd-accountant';
    public const RESERVATIONS = 'pmd-reservations';
    public const KDS_PREFIX = 'pmd-kds:';

    private const PMD_OWNER_WORKSPACE = 'PMD.Workspace.Owner';
    private const PMD_MANAGER_WORKSPACE = 'PMD.Workspace.Manager';
    private const PMD_CASHIER_WORKSPACE = 'PMD.Workspace.Cashier';
    private const PMD_ACCOUNTANT_WORKSPACE = 'PMD.Workspace.Accountant';
    private const PMD_RESERVATIONS_WORKSPACE = 'PMD.Workspace.Reservations';
    private const PMD_KDS_WORKSPACE = 'PMD.Workspace.KDS';

    public function ensure(): array
    {
        $roles = [];
        foreach ($this->definitions() as $definition) {
            $role = Staff_roles_model::query()->where('code', $definition['code'])->first();
            if (!$role) {
                $role = Staff_roles_model::query()
                    ->whereRaw('LOWER(name) = ?', [strtolower($definition['name'])])
                    ->first();
            }
            if (!$role) $role = new Staff_roles_model();

            $role->name = $definition['name'];
            $role->code = $definition['code'];
            $role->description = $definition['description'];
            $role->permissions = $definition['permissions'];
            $role->save();
            $roles[] = $role;
        }
        return $roles;
    }

    public function definitions(): array
    {
        $allPermissions = [];
        try {
            foreach (PermissionManager::instance()->listPermissions() as $permission) {
                $code = trim((string)($permission->code ?? ''));
                if ($code !== '') $allPermissions[$code] = 1;
            }
        } catch (\Throwable $error) {
        }

        $workspacePermissions = [
            self::PMD_OWNER_WORKSPACE => 1,
            self::PMD_MANAGER_WORKSPACE => 1,
            self::PMD_CASHIER_WORKSPACE => 1,
            self::PMD_ACCOUNTANT_WORKSPACE => 1,
            self::PMD_RESERVATIONS_WORKSPACE => 1,
            self::PMD_KDS_WORKSPACE => 1,
        ];

        $ownerPermissions = $allPermissions + $workspacePermissions;
        $managerPermissions = $allPermissions + array_diff_key(
            $workspacePermissions,
            [self::PMD_OWNER_WORKSPACE => true]
        );

        $definitions = [
            [
                'code' => self::OWNER,
                'name' => 'Owner',
                'description' => 'Full access including Owner dashboard and Settings.',
                'permissions' => $ownerPermissions,
            ],
            [
                'code' => self::MANAGER,
                'name' => 'Manager',
                'description' => 'Full operational access, without Owner dashboard or Settings.',
                'permissions' => $managerPermissions,
            ],
            [
                'code' => self::CASHIER,
                'name' => 'Cashier',
                'description' => 'Cashier workspace only. No side menu.',
                'permissions' => [
                    self::PMD_CASHIER_WORKSPACE => 1,
                    'Admin.Dashboard' => 1,
                    'Admin.Orders' => 1,
                    'Admin.Payments' => 1,
                ],
            ],
            [
                'code' => self::WAITER,
                'name' => 'Waiter',
                'description' => 'Cashier mobile Quick Mode only. No side menu.',
                'permissions' => [
                    self::PMD_CASHIER_WORKSPACE => 1,
                    'Admin.Dashboard' => 1,
                    'Admin.Orders' => 1,
                    'Admin.Payments' => 1,
                ],
            ],
            [
                'code' => self::ACCOUNTANT,
                'name' => 'Accountant',
                'description' => 'Accountant workspace only. No side menu.',
                'permissions' => [
                    self::PMD_ACCOUNTANT_WORKSPACE => 1,
                    'Admin.Dashboard' => 1,
                ],
            ],
            [
                'code' => self::RESERVATIONS,
                'name' => 'Reservations',
                'description' => 'Reservations workspace only. No side menu.',
                'permissions' => [
                    self::PMD_RESERVATIONS_WORKSPACE => 1,
                    'Admin.Reservations' => 1,
                ],
            ],
        ];

        foreach ($this->kdsStations() as $station) {
            $definitions[] = [
                'code' => self::KDS_PREFIX.$station['slug'],
                'name' => 'KDS — '.$station['name'],
                'description' => 'KDS only: /admin/kitchendisplay/'.$station['slug'],
                'permissions' => [
                    self::PMD_KDS_WORKSPACE => 1,
                    'Admin.KitchenDisplay' => 1,
                ],
            ];
        }
        return $definitions;
    }

    public function isManagedCode(string $code): bool
    {
        $code = strtolower(trim($code));
        return in_array($code, [
            self::OWNER,
            self::MANAGER,
            self::CASHIER,
            self::WAITER,
            self::ACCOUNTANT,
            self::RESERVATIONS,
        ], true) || str_starts_with($code, self::KDS_PREFIX);
    }

    public function isManagedRole($role): bool
    {
        return $this->isManagedCode((string)($role->code ?? ''));
    }

    public function roleCodeForUser($user): string
    {
        if (!$user) return '';
        try {
            if (method_exists($user, 'isSuperUser') && $user->isSuperUser()) return self::OWNER;
            return strtolower(trim((string)optional(optional($user->staff)->role)->code));
        } catch (\Throwable $error) {
            return '';
        }
    }

    public function routeForRoleCode(string $code): ?string
    {
        $code = strtolower(trim($code));
        $map = [
            self::OWNER => 'dashboardlab', 'owner' => 'dashboardlab',
            self::MANAGER => 'managerlab', 'manager' => 'managerlab',
            self::CASHIER => 'cashierlab', 'cashier' => 'cashierlab',
            self::WAITER => 'cashierlab', 'waiter' => 'cashierlab',
            self::ACCOUNTANT => 'accountantlab', 'accountant' => 'accountantlab',
            self::RESERVATIONS => 'reservationslab', 'reservation' => 'reservationslab', 'reservations' => 'reservationslab',
        ];
        if (isset($map[$code])) return $map[$code];
        if (str_starts_with($code, self::KDS_PREFIX)) {
            $slug = trim(substr($code, strlen(self::KDS_PREFIX)));
            return $slug !== '' ? 'kitchendisplay/'.$slug : 'kitchendisplay';
        }
        return null;
    }

    /**
     * Server-side route boundary for managed roles. Users_model calls this
     * before legacy permission matching, so direct URL entry is denied too.
     */
    public function mayOpenPath(string $code, string $path): bool
    {
        $code = strtolower(trim($code));
        $path = trim(strtolower($path), '/');
        if (!$this->isManagedCode($code)) return true;
        if ($code === self::OWNER) return true;

        // Auth and the retired native dashboard are transport/redirect routes,
        // not product workspaces. Let them finish role routing normally.
        if (in_array($path, ['admin', 'admin/dashboard', 'admin/login', 'admin/logout'], true)) {
            return true;
        }

        $is = function (string $route) use ($path): bool {
            return $path === 'admin/'.$route || str_starts_with($path, 'admin/'.$route.'/');
        };

        if ($code === self::MANAGER) {
            if ($is('dashboardlab')) return false;
            foreach (['pmdsettings','pmdadvanced','pmdbrand','pmdcustomer','pmdteam','pmddevices','pmdfinance'] as $route) {
                if ($is($route)) return false;
            }
            return true;
        }

        if ($code === self::CASHIER || $code === self::WAITER) {
            return $is('cashierlab') || $is('pmd-waiter-pos-v1') || $is('pmd-waiter-pos-v22');
        }
        if ($code === self::ACCOUNTANT) return $is('accountantlab');
        if ($code === self::RESERVATIONS) return $is('reservationslab');

        if (str_starts_with($code, self::KDS_PREFIX)) {
            $slug = trim(substr($code, strlen(self::KDS_PREFIX)));
            return $path === 'admin/kitchendisplay/'.$slug
                || str_starts_with($path, 'admin/kitchendisplay/'.$slug.'/');
        }

        return false;
    }

    private function kdsStations(): array
    {
        if (!Schema::hasTable('kds_stations')) return [];
        try {
            $query = DB::table('kds_stations');
            $columns = Schema::getColumnListing('kds_stations');
            if (in_array('is_active', $columns, true)) $query->where('is_active', 1);
            elseif (in_array('status', $columns, true)) $query->where('status', 1);

            return $query->orderBy('name')->get()->map(function ($row) {
                $name = trim((string)($row->name ?? 'KDS'));
                $slug = trim((string)($row->slug ?? ''));
                if ($slug === '') {
                    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name), '-'));
                }
                return ['name' => $name ?: 'KDS', 'slug' => $slug];
            })->filter(fn($row) => $row['slug'] !== '')->values()->all();
        } catch (\Throwable $error) {
            return [];
        }
    }
}
