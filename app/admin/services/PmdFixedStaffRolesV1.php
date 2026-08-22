<?php

namespace Admin\Services;

use Admin\Models\Staff_roles_model;
use Admin\Models\Staffs_model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdFixedStaffRolesV1
{
    private const MARKER_PREFIX = '[PMD_FIXED_ROLE:';

    public function sync(): Collection
    {
        if (!Schema::hasTable('staff_roles')) {
            return collect();
        }

        $columns = Schema::getColumnListing('staff_roles');
        $definitions = $this->definitions();

        if (Schema::hasTable('kds_stations')) {
            $stationColumns = Schema::getColumnListing('kds_stations');
            if (
                in_array('name', $stationColumns, true)
                && in_array('slug', $stationColumns, true)
            ) {
                foreach (
                    DB::table('kds_stations')
                        ->select(array_values(array_intersect(
                            ['station_id', 'name', 'slug'],
                            $stationColumns
                        )))
                        ->orderBy('name')
                        ->get()
                    as $station
                ) {
                    $slug = trim((string)($station->slug ?? ''));
                    $name = trim((string)($station->name ?? ''));
                    if ($slug === '' || $name === '') {
                        continue;
                    }

                    $definitions['kds:'.$slug] = [
                        'name' => 'KDS · '.$name,
                        'code' => 'kds_'.substr(preg_replace('/[^a-z0-9_]+/i', '_', $slug), 0, 50),
                        'description' => 'Kitchen Display only · '.$name.'.',
                        'permissions' => [
                            'Admin.KitchenDisplay' => 1,
                        ],
                    ];
                }
            }
        }

        DB::transaction(function () use ($definitions, $columns) {
            foreach ($definitions as $key => $definition) {
                $marker = $this->marker($key);

                $query = DB::table('staff_roles');
                $row = null;

                if (in_array('description', $columns, true)) {
                    $row = (clone $query)
                        ->where('description', 'like', $marker.'%')
                        ->first();
                }

                if (!$row && in_array('name', $columns, true)) {
                    $row = (clone $query)
                        ->whereRaw('LOWER(name) = ?', [strtolower($definition['name'])])
                        ->first();
                }

                $payload = [];
                if (in_array('name', $columns, true)) {
                    $payload['name'] = $definition['name'];
                }
                if (in_array('description', $columns, true)) {
                    $payload['description'] = $marker.' '.$definition['description'];
                }
                if (in_array('permissions', $columns, true)) {
                    $payload['permissions'] = serialize($definition['permissions']);
                }
                if (in_array('code', $columns, true)) {
                    $payload['code'] = $definition['code'];
                }
                if (in_array('updated_at', $columns, true)) {
                    $payload['updated_at'] = now();
                }

                if ($row) {
                    DB::table('staff_roles')
                        ->where('staff_role_id', (int)$row->staff_role_id)
                        ->update($payload);
                    continue;
                }

                if (in_array('created_at', $columns, true)) {
                    $payload['created_at'] = now();
                }

                DB::table('staff_roles')->insert($payload);
            }
        });

        try {
            $fixedRoleIds = DB::table('staff_roles')
                ->where('description', 'like', self::MARKER_PREFIX.'%')
                ->pluck('staff_role_id')
                ->map(fn ($id) => (int)$id)
                ->filter()
                ->values()
                ->all();

            if ($fixedRoleIds) {
                Staffs_model::with(['role', 'user'])
                    ->whereIn('staff_role_id', $fixedRoleIds)
                    ->get()
                    ->each(function ($staff) {
                        $this->normalizeStaff($staff);
                    });
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD fixed role staff normalization sweep failed', [
                'message' => $error->getMessage(),
            ]);
        }

        return $this->fixedRoles();
    }

    public function fixedRoles(): Collection
    {
        if (!Schema::hasTable('staff_roles')) {
            return collect();
        }

        return Staff_roles_model::query()
            ->where('description', 'like', self::MARKER_PREFIX.'%')
            ->with('staffs')
            ->orderByRaw("CASE WHEN LOWER(name) = 'owner' THEN 0 WHEN LOWER(name) = 'manager' THEN 1 WHEN LOWER(name) = 'cashier' THEN 2 WHEN LOWER(name) = 'waiter' THEN 3 WHEN LOWER(name) = 'accountant' THEN 4 WHEN LOWER(name) = 'reservations' THEN 5 ELSE 6 END")
            ->orderBy('name')
            ->get();
    }

    public function roleKey($role): ?string
    {
        if (!$role) {
            return null;
        }

        $description = trim((string)($role->description ?? ''));
        if (preg_match('/^\[PMD_FIXED_ROLE:([a-z0-9:_-]+)\]/i', $description, $match)) {
            return strtolower($match[1]);
        }

        $code = strtolower(trim((string)($role->code ?? '')));
        if (in_array($code, ['owner', 'manager', 'cashier', 'waiter', 'accountant', 'reservations'], true)) {
            return $code;
        }
        if (str_starts_with($code, 'kds_')) {
            return 'kds:'.str_replace('_', '-', substr($code, 4));
        }

        $name = strtolower(trim((string)($role->name ?? '')));
        if (in_array($name, ['owner', 'manager', 'cashier', 'waiter', 'accountant', 'reservations'], true)) {
            return $name;
        }

        return null;
    }

    public function isFixedRole($role): bool
    {
        return $this->roleKey($role) !== null;
    }

    public function publicDescription($role): string
    {
        return trim((string)preg_replace(
            '/^\[PMD_FIXED_ROLE:[^\]]+\]\s*/i',
            '',
            (string)($role->description ?? '')
        ));
    }

    public function normalizeStaff($staff): void
    {
        if (!$staff || empty($staff->staff_id)) {
            return;
        }

        try {
            $staff->loadMissing(['role', 'user']);
        } catch (\Throwable $ignored) {
        }

        $key = $this->roleKey($staff->role ?? null);
        if (!$key) {
            return;
        }

        try {
            if (Schema::hasColumn('staffs', 'sale_permission')) {
                DB::table('staffs')
                    ->where('staff_id', (int)$staff->staff_id)
                    ->update(['sale_permission' => 1]);
            }
        } catch (\Throwable $ignored) {
        }

        try {
            if (($staff->user ?? null) && Schema::hasColumn('users', 'super_user')) {
                DB::table('users')
                    ->where('user_id', (int)$staff->user->user_id)
                    ->update([
                        'super_user' => $key === 'owner' ? 1 : 0,
                    ]);
            }
        } catch (\Throwable $ignored) {
        }
    }

    public function guardRequest(Request $request, $user)
    {
        if (!$user || !str_starts_with(trim($request->path(), '/'), 'admin')) {
            return null;
        }

        try {
            if (method_exists($user, 'isSuperUser') && $user->isSuperUser()) {
                return null;
            }
        } catch (\Throwable $ignored) {
        }

        $role = $user->staff->role ?? null;
        $key = $this->roleKey($role);
        if (!$key) {
            return null;
        }

        $path = trim($request->path(), '/');

        if (in_array($path, ['admin/login', 'admin/logout', 'admin/account'], true)) {
            return null;
        }

        if ($key === 'owner') {
            return null;
        }

        if ($key === 'manager') {
            if ($path === 'admin') {
                return redirect('/admin/managerlab');
            }

            if ($this->managerBlockedPath($path)) {
                return $this->denyOrRedirect($request, '/admin/managerlab');
            }

            return null;
        }

        $home = $this->homeForKey($key);
        if (!$home) {
            return null;
        }

        if ($path === 'admin') {
            return redirect($home);
        }

        if ($this->operationalPathAllowed($key, $path)) {
            return null;
        }

        return $this->denyOrRedirect($request, $home);
    }

    private function definitions(): array
    {
        return [
            'owner' => [
                'name' => 'Owner',
                'code' => 'owner',
                'description' => 'Full PayMyDine access.',
                'permissions' => [
                    'Admin.*' => 1,
                    'Site.*' => 1,
                    'System.*' => 1,
                ],
            ],
            'manager' => [
                'name' => 'Manager',
                'code' => 'manager',
                'description' => 'Full operational access except Owner Dashboard and Settings.',
                'permissions' => [
                    'Admin.*' => 1,
                    'System.*' => 1,
                ],
            ],
            'cashier' => [
                'name' => 'Cashier',
                'code' => 'cashier',
                'description' => 'Cashier workspace only.',
                'permissions' => [
                    'Admin.Dashboard' => 1,
                    'Admin.Orders' => 1,
                    'Admin.Payments' => 1,
                ],
            ],
            'waiter' => [
                'name' => 'Waiter',
                'code' => 'waiter',
                'description' => 'Cashier Quick Service workspace only.',
                'permissions' => [
                    'Admin.Dashboard' => 1,
                    'Admin.Orders' => 1,
                    'Admin.Payments' => 1,
                ],
            ],
            'accountant' => [
                'name' => 'Accountant',
                'code' => 'accountant',
                'description' => 'Accountant workspace only.',
                'permissions' => [
                    'Admin.Dashboard' => 1,
                ],
            ],
            'reservations' => [
                'name' => 'Reservations',
                'code' => 'reservations',
                'description' => 'Reservations workspace only.',
                'permissions' => [
                    'Admin.Reservations' => 1,
                ],
            ],
        ];
    }

    private function marker(string $key): string
    {
        return self::MARKER_PREFIX.$key.']';
    }

    private function homeForKey(string $key): ?string
    {
        return match (true) {
            $key === 'cashier', $key === 'waiter' => '/admin/cashierlab',
            $key === 'accountant' => '/admin/accountantlab',
            $key === 'reservations' => '/admin/reservationslab',
            str_starts_with($key, 'kds:') => '/admin/kitchendisplay/'.substr($key, 4),
            default => null,
        };
    }

    private function operationalPathAllowed(string $key, string $path): bool
    {
        if (in_array($key, ['cashier', 'waiter'], true)) {
            return $path === 'admin/cashierlab'
                || str_starts_with($path, 'admin/pmd-waiter-')
                || str_starts_with($path, 'admin/waiter-pos/');
        }

        if ($key === 'accountant') {
            return $path === 'admin/accountantlab';
        }

        if ($key === 'reservations') {
            return $path === 'admin/reservationslab';
        }

        if (str_starts_with($key, 'kds:')) {
            return $path === 'admin/kitchendisplay/'.substr($key, 4);
        }

        return true;
    }

    private function managerBlockedPath(string $path): bool
    {
        if (in_array($path, ['admin/dashboardlab', 'admin/dashboard2'], true)) {
            return true;
        }

        foreach ([
            'admin/pmdsettings',
            'admin/pmddevices',
            'admin/pmdmenu',
            'admin/pmdcustomer',
            'admin/pmdteam',
            'admin/pmdfinance',
            'admin/pmdbrand',
            'admin/pmdadvanced',
            'admin/settings',
            'admin/staffs',
            'admin/staff_roles',
            'admin/staff_groups',
            'admin/posdevices',
            'admin/terminal_devices',
            'admin/terminaldevices',
            'admin/kds_stations',
            'admin/cash_drawers',
            'admin/biometric_devices',
            'admin/biometricdevices',
            'admin/pos_configs',
        ] as $blocked) {
            if ($path === $blocked || str_starts_with($path, $blocked.'/')) {
                return true;
            }
        }

        return false;
    }

    private function denyOrRedirect(Request $request, string $home)
    {
        if ($request->ajax() || $request->expectsJson() || !$request->isMethod('GET')) {
            return response()->json([
                'ok' => false,
                'message' => 'This staff role cannot access this area.',
            ], 403);
        }

        return redirect($home);
    }
}
