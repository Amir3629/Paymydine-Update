<?php

namespace App\Services\PmdMobileSync;

use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Http\Request;

/**
 * PMD_MOBILE_STAFF_GRANT_V1
 *
 * A paired Android device proves device/location trust. A human login then
 * receives a short-lived HMAC-signed staff grant bound to that exact device and
 * restaurant. The password never leaves the authorization request and is never
 * persisted on Android.
 */
final class PmdMobileStaffGrantService
{
    public const HEADER = 'X-PayMyDine-Staff-Grant';
    private const VERSION = 1;
    private const TTL_SECONDS = 8 * 60 * 60;

    public function issue(array $deviceIdentity, $user): string
    {
        $locationId = (int)($deviceIdentity['location_id'] ?? 0);
        $deviceId = (int)($deviceIdentity['device_id'] ?? 0);
        $staff = $user ? $user->staff : null;

        if (
            !$user
            || !$staff
            || $locationId < 1
            || $deviceId < 1
            || !$this->activeUser($user, $staff)
            || !$this->userMayUseLocation($user, $staff, $locationId)
        ) {
            throw new \RuntimeException(
                'This PayMyDine staff account cannot use this restaurant device.'
            );
        }

        $roleCode = app(PmdDefaultStaffRoleService::class)
            ->roleCodeForUser($user);
        if ($roleCode === '') {
            throw new \RuntimeException(
                'This PayMyDine staff account has no active role.'
            );
        }

        $now = time();
        $payload = [
            'v' => self::VERSION,
            'device_id' => $deviceId,
            'location_id' => $locationId,
            'user_id' => (int)$user->getKey(),
            'staff_id' => (int)$staff->getKey(),
            'role_code' => $roleCode,
            'iat' => $now,
            'exp' => $now + self::TTL_SECONDS,
        ];

        $body = $this->base64UrlEncode(
            json_encode(
                $payload,
                JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            )
        );

        return $body.'.'.$this->signature($body);
    }

    /**
     * Returns the staff identity represented by the grant, or null when the
     * request does not carry a staff grant (pairing/bootstrap compatibility).
     */
    public function resolve(
        Request $request,
        array $deviceIdentity
    ): ?array {
        $raw = trim((string)$request->header(self::HEADER, ''));
        if ($raw === '') {
            return null;
        }

        $parts = explode('.', $raw, 2);
        if (count($parts) !== 2) {
            abort(401, 'PayMyDine staff session is invalid.');
        }

        [$body, $signature] = $parts;
        if (
            $body === ''
            || $signature === ''
            || !hash_equals($this->signature($body), $signature)
        ) {
            abort(401, 'PayMyDine staff session is invalid.');
        }

        try {
            $payload = json_decode(
                $this->base64UrlDecode($body),
                true,
                16,
                JSON_THROW_ON_ERROR
            );
        } catch (\Throwable $error) {
            abort(401, 'PayMyDine staff session is invalid.');
        }

        $deviceId = (int)($deviceIdentity['device_id'] ?? 0);
        $locationId = (int)($deviceIdentity['location_id'] ?? 0);

        if (
            !is_array($payload)
            || (int)($payload['v'] ?? 0) !== self::VERSION
            || (int)($payload['device_id'] ?? 0) !== $deviceId
            || (int)($payload['location_id'] ?? 0) !== $locationId
            || (int)($payload['exp'] ?? 0) <= time()
        ) {
            abort(401, 'PayMyDine staff session expired or does not match this device.');
        }

        $userId = (int)($payload['user_id'] ?? 0);
        $staffId = (int)($payload['staff_id'] ?? 0);
        $expectedRole = strtolower(trim((string)($payload['role_code'] ?? '')));

        $user = $userId > 0
            ? Users_model::query()->find($userId)
            : null;
        $staff = $user ? $user->staff : null;

        if (
            !$user
            || !$staff
            || (int)$staff->getKey() !== $staffId
            || !$this->activeUser($user, $staff)
            || !$this->userMayUseLocation($user, $staff, $locationId)
        ) {
            abort(401, 'PayMyDine staff session is no longer active.');
        }

        $roleCode = app(PmdDefaultStaffRoleService::class)
            ->roleCodeForUser($user);
        if (
            $roleCode === ''
            || $expectedRole === ''
            || !hash_equals($expectedRole, strtolower($roleCode))
        ) {
            abort(403, 'PayMyDine staff role changed. Sign in again.');
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
                'staff_grant' => $raw,
                'staff_grant_expires_at' => (int)$payload['exp'],
            ]
        );
    }

    public function userMayUseLocation(
        $user,
        $staff,
        int $locationId
    ): bool {
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

    private function activeUser($user, $staff): bool
    {
        return !(
            (isset($user->is_activated) && !(bool)$user->is_activated)
            || (isset($staff->staff_status) && !(bool)$staff->staff_status)
        );
    }

    private function signature(string $body): string
    {
        return $this->base64UrlEncode(
            hash_hmac(
                'sha256',
                'pmd-mobile-staff-grant-v1|'.$body,
                (string)config('app.key', 'pmd-mobile-staff-grant'),
                true
            )
        );
    }

    private function base64UrlEncode(string $raw): string
    {
        return rtrim(
            strtr(base64_encode($raw), '+/', '-_'),
            '='
        );
    }

    private function base64UrlDecode(string $raw): string
    {
        $padding = strlen($raw) % 4;
        if ($padding > 0) {
            $raw .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode(
            strtr($raw, '-_', '+/'),
            true
        );

        if ($decoded === false) {
            throw new \RuntimeException('Invalid base64url.');
        }

        return $decoded;
    }
}
