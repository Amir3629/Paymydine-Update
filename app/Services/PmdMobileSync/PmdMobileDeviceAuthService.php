<?php

namespace App\Services\PmdMobileSync;

use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdSiteAccessService;
use Illuminate\Http\Request;

/**
 * Native-device bearer authentication.
 *
 * Device trust is delegated to the existing Site Access token authority.
 * Human role/permission state is resolved fresh from the tenant database.
 */
final class PmdMobileDeviceAuthService
{
    public function authenticate(Request $request): array
    {
        $rawToken = trim((string)$request->bearerToken());
        if ($rawToken === '') {
            abort(401, 'PayMyDine device token required.');
        }

        $siteAccess = app(PmdSiteAccessService::class);
        $device = $siteAccess->trustedDeviceByRawToken(
            $rawToken,
            'staff_personal'
        );

        if (!$device) {
            abort(401, 'PayMyDine device token is invalid or revoked.');
        }

        $user = null;
        $userId = (int)($device->user_id ?? 0);
        if ($userId > 0) {
            $user = Users_model::query()->find($userId);
        }

        if (!$user && (int)($device->staff_id ?? 0) > 0) {
            $user = Users_model::query()
                ->where('staff_id', (int)$device->staff_id)
                ->orderBy('user_id')
                ->first();
        }

        $staff = $user ? $user->staff : null;
        if (
            !$user
            || !$staff
            || isset($user->is_activated) && !(bool)$user->is_activated
            || isset($staff->staff_status) && !(bool)$staff->staff_status
        ) {
            abort(401, 'The paired PayMyDine staff account is not active.');
        }

        $locationId = (int)($device->location_id ?? 0);
        if ($locationId < 1) {
            abort(403, 'The paired PayMyDine device has no restaurant location.');
        }

        if (!$this->userMayUseLocation($user, $staff, $locationId)) {
            abort(403, 'The paired account no longer has access to this restaurant location.');
        }

        $roles = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roles->roleCodeForUser($user);
        if ($roleCode === '') {
            abort(403, 'The paired account has no active PayMyDine role.');
        }

        $siteAccess->touchDevice((int)$device->id);

        $identity = [
            'device' => $device,
            'device_id' => (int)$device->id,
            'location_id' => $locationId,
            'user' => $user,
            'user_id' => (int)$user->getKey(),
            'staff' => $staff,
            'staff_id' => (int)$staff->getKey(),
            'role_code' => $roleCode,
            'permissions' => (array)$user->getPermissions(),
        ];

        // PMD_MOBILE_STAFF_GRANT_OVERRIDE_V1
        // A shared trusted restaurant device may be used by a different active
        // staff member after that person signs in with canonical credentials.
        return app(PmdMobileStaffGrantService::class)
            ->resolve($request, $identity)
            ?? $identity;
    }

    private function userMayUseLocation($user, $staff, int $locationId): bool
    {
        try {
            if (method_exists($user, 'isSuperUser') && $user->isSuperUser()) {
                return true;
            }
        } catch (\Throwable $error) {
        }

        if ((int)($staff->staff_location_id ?? 0) === $locationId) {
            return true;
        }

        try {
            return $staff->locations()
                ->where('locations.location_id', $locationId)
                ->exists();
        } catch (\Throwable $error) {
            return false;
        }
    }
}
