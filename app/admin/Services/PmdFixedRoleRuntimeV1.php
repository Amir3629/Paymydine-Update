<?php

namespace Admin\Services;

use Admin\Classes\PermissionManager;

/**
 * PMD_FIXED_ROLE_RUNTIME_R43
 *
 * Apply the product-owned permission map to the authenticated model in-memory
 * before AdminController permission checks. This also covers legacy aliases
 * such as Server -> Waiter without destructively rewriting that legacy role row.
 */
class PmdFixedRoleRuntimeV1
{
    public function apply($user, PmdFixedRoleAuthorityV1 $authority): ?string
    {
        $code = $authority->roleCodeForUser($user);
        $definitions = $authority->definitions();

        if (!$code || !isset($definitions[$code]) || !$user || !$user->staff || !$user->staff->role) {
            return null;
        }

        $definition = $definitions[$code];
        $permissions = ($definition['permission_mode'] ?? '') === 'all'
            ? $this->allPermissions()
            : array_fill_keys(array_values(array_unique(array_filter($definition['permissions'] ?? []))), 1);

        $user->staff->role->permissions = $permissions;

        // Fixed role outranks an old database super_user bit for this request.
        $user->super_user = $code === 'owner';

        return $code;
    }

    private function allPermissions(): array
    {
        $permissions = [];

        foreach (PermissionManager::instance()->listPermissions() as $permission) {
            $code = trim((string)($permission->code ?? ''));
            if ($code !== '') {
                $permissions[$code] = 1;
            }
        }

        return $permissions;
    }
}
