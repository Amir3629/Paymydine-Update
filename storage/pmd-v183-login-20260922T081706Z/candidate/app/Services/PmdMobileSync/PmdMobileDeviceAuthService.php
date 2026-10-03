<?php

namespace App\Services\PmdMobileSync;

use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdSiteAccessService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;

/**
 * Native-device bearer authentication.
 *
 * PMD_MOBILE_DEVICE_TRUST_FIRST_V2
 *
 * A paired Android tablet is device/location trust. The current human identity
 * comes from a short-lived signed Staff Grant when one is present. The account
 * that originally paired the tablet is only a backwards-compatible fallback
 * for bootstrap/legacy calls before a staff login exists.
 */
final class PmdMobileDeviceAuthService
{
    /**
     * Device/location trust only. Safe to use before the current staff member
     * has authenticated.
     */
    public function authenticateDevice(Request $request): array
    {
        $rawToken = trim((string)$request->bearerToken());
        if ($rawToken === '') {
            $this->fail(401, 'PayMyDine device token required.');
        }

        $siteAccess = app(PmdSiteAccessService::class);
        $device = $siteAccess->trustedDeviceByRawToken(
            $rawToken,
            'staff_personal'
        );

        if (!$device) {
            $this->fail(
                401,
                'This Android device is no longer trusted. Connect the restaurant again.'
            );
        }

        $locationId = (int)($device->location_id ?? 0);
        if ($locationId < 1) {
            $this->fail(
                403,
                'The paired PayMyDine device has no restaurant location.'
            );
        }

        $siteAccess->touchDevice((int)$device->id);

        return [
            'device' => $device,
            'device_id' => (int)$device->id,
            'location_id' => $locationId,
        ];
    }

    public function authenticate(Request $request): array
    {
        $deviceIdentity = $this->authenticateDevice($request);

        // PMD_MOBILE_STAFF_GRANT_FIRST_V2
        // Resolve the current signed-in human BEFORE touching the historical
        // pairing identity. This is what makes a trusted restaurant tablet a
        // true shared device.
        $granted = app(PmdMobileStaffGrantService::class)
            ->resolve($request, $deviceIdentity);
        if ($granted !== null) {
            return $granted;
        }

        $device = $deviceIdentity['device'];
        $locationId = (int)$deviceIdentity['location_id'];

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
            $this->fail(
                401,
                'The original pairing account is no longer active. Sign in again on this trusted device.'
            );
        }

        if (!$this->userMayUseLocation($user, $staff, $locationId)) {
            $this->fail(
                403,
                'The original pairing account no longer has access to this restaurant location.'
            );
        }

        $roles = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roles->roleCodeForUser($user);
        if ($roleCode === '') {
            $this->fail(
                403,
                'The original pairing account has no active PayMyDine role.'
            );
        }

        return array_merge(
            $deviceIdentity,
            [
                'user' => $user,
                'user_id' => (int)$user->getKey(),
                'staff' => $staff,
                'staff_id' => (int)$staff->getKey(),
                'role_code' => $roleCode,
                'permissions' => (array)$user->getPermissions(),
            ]
        );
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

    private function fail(int $status, string $message): void
    {
        throw new HttpResponseException(
            response()->json(
                [
                    'ok' => false,
                    'message' => $message,
                ],
                $status,
                ['Cache-Control' => 'no-store, private']
            )
        );
    }
}
