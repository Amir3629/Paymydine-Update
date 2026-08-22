<?php

namespace Admin\Services;

use Admin\Classes\PermissionManager;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Models\Kds_stations_model;
use Admin\Models\Staff_roles_model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;

/**
 * PMD_FIXED_ROLE_AUTHORITY_R43
 *
 * Product-level authority for the seven built-in restaurant roles. Permissions
 * keep the existing controller/POS checks working, while the route gate keeps
 * operational accounts inside their single intended workspace.
 *
 * Unknown/custom roles retain legacy behaviour. This deliberately avoids
 * silently re-scoping restaurants that already use their own custom roles.
 */
class PmdFixedRoleAuthorityV1
{
    private const DEFINITIONS = [
        'owner' => [
            'name' => 'Owner',
            'description' => 'Full restaurant access, including Settings and Owner Dashboard.',
            'landing' => '/admin/dashboardlab',
            'permission_mode' => 'all',
        ],
        'manager' => [
            'name' => 'Manager',
            'description' => 'Full operational access except Owner Dashboard and Settings.',
            'landing' => '/admin/managerlab',
            'permission_mode' => 'all',
        ],
        'cashier' => [
            'name' => 'Cashier',
            'description' => 'CashierLab only, including the existing order and payment authorities.',
            'landing' => '/admin/cashierlab',
            'permissions' => ['Admin.Dashboard', 'Admin.Orders', 'Admin.Payments'],
        ],
        'waiter' => [
            'name' => 'Waiter',
            'description' => 'CashierLab Quick Mode only, including the existing order and payment authorities.',
            'landing' => '/admin/cashierlab',
            'permissions' => ['Admin.Dashboard', 'Admin.Orders', 'Admin.Payments'],
        ],
        'kds' => [
            'name' => 'KDS',
            'description' => 'One assigned kitchen-display station only.',
            'landing' => '/admin/kitchendisplay',
            'permissions' => ['Admin.KitchenDisplay'],
        ],
        'accountant' => [
            'name' => 'Accountant',
            'description' => 'Accountant workspace only.',
            'landing' => '/admin/accountantlab',
            'permissions' => ['Admin.Dashboard'],
        ],
        'reservations' => [
            'name' => 'Reservations',
            'description' => 'Reservations workspace only.',
            'landing' => '/admin/reservationslab',
            'permissions' => ['Admin.Reservations'],
        ],
    ];

    private static bool $viewFilterInstalled = false;

    public function definitions(): array
    {
        return self::DEFINITIONS;
    }

    public function fixedNames(): array
    {
        return array_values(array_map(
            static fn (array $definition): string => $definition['name'],
            self::DEFINITIONS
        ));
    }

    public function ensureDefaultRoles()
    {
        $allPermissions = $this->allPermissionMap();
        $roles = collect();
        $hasCode = Schema::hasColumn('staff_roles', 'code');

        foreach (self::DEFINITIONS as $code => $definition) {
            $query = Staff_roles_model::query();

            if ($hasCode) {
                $query->where(function ($builder) use ($code, $definition) {
                    $builder->where('code', $code)
                        ->orWhereRaw('LOWER(name) = ?', [strtolower($definition['name'])]);
                });
            } else {
                $query->whereRaw('LOWER(name) = ?', [strtolower($definition['name'])]);
            }

            $role = $query->first() ?: new Staff_roles_model;
            $role->name = $definition['name'];
            $role->description = $definition['description'];
            $role->permissions = ($definition['permission_mode'] ?? '') === 'all'
                ? $allPermissions
                : $this->permissionMap($definition['permissions'] ?? []);

            if ($hasCode) {
                $role->code = $code;
            }

            $role->save();
            $roles->put($code, $role->fresh());
        }

        return $roles;
    }

    public function roleById(int $roleId)
    {
        if ($roleId < 1) {
            return null;
        }

        $role = Staff_roles_model::query()->find($roleId);
        if (!$role) {
            return null;
        }

        $code = $this->roleCodeFromModel($role);
        return isset(self::DEFINITIONS[$code]) ? $role : null;
    }

    public function roleCodeForUser($user): ?string
    {
        if (!$user || !$user->staff || !$user->staff->role) {
            return null;
        }

        return $this->roleCodeFromModel($user->staff->role);
    }

    public function installSettingsCardFilter(): void
    {
        if (self::$viewFilterInstalled) {
            return;
        }

        self::$viewFilterInstalled = true;

        View::composer('*', function ($view) {
            if (!request()->is('admin/pmdsettings')) {
                return;
            }

            $data = $view->getData();
            if (!isset($data['pmdSettingsGroups']) || !is_array($data['pmdSettingsGroups'])) {
                return;
            }

            $blocked = ['pmdadvanced', 'pmdbrand', 'pmdcustomer'];
            $groups = [];

            foreach ($data['pmdSettingsGroups'] as $group) {
                if (!is_array($group)) {
                    continue;
                }

                $items = array_values(array_filter(
                    (array)($group['items'] ?? []),
                    static function ($item) use ($blocked): bool {
                        if (!is_array($item)) {
                            return false;
                        }

                        $path = trim((string)parse_url((string)($item['href'] ?? ''), PHP_URL_PATH), '/');
                        $leaf = strtolower((string)basename($path));
                        return !in_array($leaf, $blocked, true);
                    }
                ));

                if (!$items) {
                    continue;
                }

                $group['items'] = $items;
                $groups[] = $group;
            }

            $view->with('pmdSettingsGroups', $groups);
        });
    }

    /**
     * Return a blocking response/redirect, or null when the request is allowed.
     */
    public function gate(Request $request)
    {
        $user = AdminAuth::getUser();
        if (!$user) {
            return null;
        }

        $path = trim($request->path(), '/');

        // Built-in roles are immutable even for Owner/super-user accounts.
        if ($this->targetsFixedRoleEditor($path)) {
            return $this->deny($request, '/admin/pmdteam', 'Built-in PayMyDine roles cannot be edited.');
        }

        if (method_exists($user, 'isSuperUser') && $user->isSuperUser()) {
            return null;
        }

        $code = $this->roleCodeForUser($user);
        if (!$code || !isset(self::DEFINITIONS[$code])) {
            return null;
        }

        if ($code === 'owner') {
            return null;
        }

        if ($this->alwaysAllowed($path)) {
            return null;
        }

        if ($code === 'manager') {
            if ($this->isOwnerDashboard($path) || $this->isSettingsRoute($path)) {
                return $this->deny($request, '/admin/managerlab', 'Manager access does not include Owner Dashboard or Settings.');
            }

            if ($path === 'admin') {
                return redirect('/admin/managerlab');
            }

            return null;
        }

        if ($code === 'cashier' || $code === 'waiter') {
            if ($this->isCashierRuntimeRoute($path)) {
                return null;
            }

            return $this->deny($request, '/admin/cashierlab', 'This account is restricted to CashierLab.');
        }

        if ($code === 'accountant') {
            if ($path === 'admin/accountantlab' || str_starts_with($path, 'admin/accountantlab/')) {
                return null;
            }

            return $this->deny($request, '/admin/accountantlab', 'This account is restricted to Accountant.');
        }

        if ($code === 'reservations') {
            if ($path === 'admin/reservationslab' || str_starts_with($path, 'admin/reservationslab/')) {
                return null;
            }

            return $this->deny($request, '/admin/reservationslab', 'This account is restricted to Reservations.');
        }

        if ($code === 'kds') {
            $station = $this->stationForStaff($user->staff);
            if (!$station) {
                return response('No KDS station is assigned to this account.', 403);
            }

            $allowedPath = 'admin/kitchendisplay/'.trim((string)$station->slug, '/');
            if ($path === $allowedPath) {
                return null;
            }

            return $this->deny(
                $request,
                '/'.$allowedPath,
                'This KDS account is restricted to its assigned station.'
            );
        }

        return null;
    }

    public function stationForStaff($staff)
    {
        if (!$staff || !Schema::hasTable('kds_stations')) {
            return null;
        }

        $query = Kds_stations_model::query();
        $locationId = $this->currentLocationId();

        if ($locationId > 0 && Schema::hasColumn('kds_stations', 'location_id')) {
            $query->where(function ($builder) use ($locationId) {
                $builder->where('location_id', $locationId)
                    ->orWhereNull('location_id')
                    ->orWhere('location_id', 0);
            });
        }

        $stations = $query->orderBy('name')->get();
        if ($stations->count() === 1) {
            return $stations->first();
        }

        $tokens = array_values(array_unique(array_filter([
            strtolower(trim((string)($staff->staff_name ?? ''))),
            strtolower(trim((string)optional($staff->user)->username)),
            Str::slug((string)($staff->staff_name ?? '')),
            Str::slug((string)optional($staff->user)->username),
        ])));

        foreach ($stations as $station) {
            $name = strtolower(trim((string)$station->name));
            $slug = strtolower(trim((string)$station->slug));
            if (in_array($name, $tokens, true) || in_array($slug, $tokens, true)) {
                return $station;
            }
        }

        return null;
    }

    private function allPermissionMap(): array
    {
        $codes = [];
        foreach (PermissionManager::instance()->listPermissions() as $permission) {
            $code = trim((string)($permission->code ?? ''));
            if ($code !== '') {
                $codes[$code] = 1;
            }
        }
        return $codes;
    }

    private function permissionMap(array $permissions): array
    {
        return array_fill_keys(array_values(array_unique(array_filter($permissions))), 1);
    }

    private function roleCodeFromModel($role): string
    {
        $raw = '';
        if ($role && isset($role->code)) {
            $raw = trim((string)$role->code);
        }
        if ($raw === '' && $role) {
            $raw = trim((string)$role->name);
        }

        $code = Str::slug(strtolower($raw), '_');
        return match ($code) {
            'server', 'service', 'waiter_server' => 'waiter',
            'reservation', 'reservationist' => 'reservations',
            'kitchen', 'kitchen_display' => 'kds',
            default => $code,
        };
    }

    private function currentLocationId(): int
    {
        try {
            $location = AdminLocation::current();
            if ($location && (int)$location->location_id > 0) {
                return (int)$location->location_id;
            }
        } catch (\Throwable $ignored) {
        }

        try {
            $sessionId = (int)AdminLocation::getSession('id');
            if ($sessionId > 0) {
                return $sessionId;
            }
        } catch (\Throwable $ignored) {
        }

        return 0;
    }

    private function targetsFixedRoleEditor(string $path): bool
    {
        if (!preg_match('#^admin/staff_roles/(?:edit|delete)/(\d+)$#', $path, $match)) {
            return false;
        }

        $role = Staff_roles_model::query()->find((int)$match[1]);
        if (!$role) {
            return false;
        }

        return isset(self::DEFINITIONS[$this->roleCodeFromModel($role)]);
    }

    private function alwaysAllowed(string $path): bool
    {
        foreach ([
            'admin/login',
            'admin/logout',
            'admin/_assets',
            'admin/_pmd/',
            'admin/notifications',
            'admin/notification',
            'admin/profile',
            'admin/account',
        ] as $allowed) {
            if ($path === rtrim($allowed, '/') || str_starts_with($path, $allowed)) {
                return true;
            }
        }

        return false;
    }

    private function isOwnerDashboard(string $path): bool
    {
        foreach (['admin/dashboardlab', 'admin/dashboard2', 'admin/dashboard'] as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return true;
            }
        }
        return false;
    }

    private function isSettingsRoute(string $path): bool
    {
        foreach ([
            'admin/pmdsettings',
            'admin/pmdmenu',
            'admin/pmdcustomer',
            'admin/pmdteam',
            'admin/pmddevices',
            'admin/pmdfinance',
            'admin/pmdbrand',
            'admin/pmdadvanced',
            'admin/staffs',
            'admin/staff_roles',
            'admin/staff_groups',
            'admin/settings',
            'admin/system_settings',
        ] as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return true;
            }
        }
        return false;
    }

    private function isCashierRuntimeRoute(string $path): bool
    {
        foreach ([
            'admin/cashierlab',
            'admin/pmd-waiter-',
            'admin/waiter-pos/',
            'admin/dashboardwaiter-final-',
            'admin/pmd-waiter-pos-v22/',
        ] as $prefix) {
            if ($path === rtrim($prefix, '/') || str_starts_with($path, $prefix)) {
                return true;
            }
        }
        return false;
    }

    private function deny(Request $request, string $landing, string $message)
    {
        if (!$request->isMethod('GET') || $request->ajax() || $request->expectsJson()) {
            return response()->json(['ok' => false, 'message' => $message], 403);
        }

        $current = '/'.trim($request->path(), '/');
        if ($current === $landing) {
            return response($message, 403);
        }

        return redirect($landing);
    }
}
