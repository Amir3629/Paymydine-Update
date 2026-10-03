<?php

namespace App\Services\RestaurantGroups;

/** Pure checks shared by the group login and second-factor boundaries. */
final class SecurityProof
{
    public static function recent(int $timestamp, int $now, int $maxAge): bool
    {
        return $timestamp > 0 && $timestamp <= $now
            && $timestamp > $now - max(1, $maxAge);
    }

    public static function password(array $proof, object $owner, int $tenantId, int $userId, int $now, int $maxAge): bool
    {
        return $tenantId > 0 && $userId > 0
            && (int)($proof['owner_id'] ?? 0) === (int)$owner->id
            && (int)($proof['tenant_id'] ?? 0) === $tenantId
            && (int)($proof['user_id'] ?? 0) === $userId
            && (int)($proof['auth_version'] ?? 0) > 0
            && (int)$proof['auth_version'] === (int)$owner->auth_version
            && ($owner->status ?? '') === 'active'
            && self::recent((int)($proof['password_at'] ?? 0), $now, $maxAge);
    }

    public static function factor(array $proof, object $owner, string $sessionId, int $now, int $maxAge): bool
    {
        return $sessionId !== '' && !empty($owner->confirmed_at)
            && !empty($owner->secret_encrypted)
            && self::recent((int)($proof['mfa_at'] ?? 0), $now, $maxAge)
            && (int)$proof['mfa_at'] >= (int)($proof['password_at'] ?? 0)
            && hash_equals($sessionId, (string)($proof['session_id'] ?? ''));
    }

    public static function enrollment(array $proof, object $owner, int $userId, int $locationId, int $tenantId, int $now): bool
    {
        return $userId > 0 && $locationId > 0 && $tenantId > 0
            && ($owner->status ?? '') === 'active'
            && empty($owner->confirmed_at)
            && (int)($proof['group_owner_id'] ?? 0) === (int)$owner->id
            && (int)($proof['auth_version'] ?? 0) === (int)$owner->auth_version
            && (int)($proof['auth_version'] ?? 0) > 0
            && (int)($proof['user_id'] ?? 0) === $userId
            && (int)($proof['location_id'] ?? 0) === $locationId
            && (int)($proof['tenant_id'] ?? 0) === $tenantId
            && self::recent((int)($proof['created_at'] ?? 0), $now, 600)
            && preg_match('/^[A-Z2-7]{32}$/D', (string)($proof['secret'] ?? '')) === 1;
    }

    public static function trustedDevice(object $device, object $owner): bool
    {
        if (($owner->status ?? '') !== 'active' || empty($owner->confirmed_at)
            || empty($owner->secret_encrypted) || !empty($device->revoked_at)) {
            return false;
        }
        if (empty($owner->mfa_reset_at)) return true;
        if (empty($device->paired_at)) return false;
        try {
            $utc = new \DateTimeZone('UTC');
            return new \DateTimeImmutable((string)$device->paired_at, $utc)
                > new \DateTimeImmutable((string)$owner->mfa_reset_at, $utc);
        } catch (\Throwable $error) {
            return false;
        }
    }
}
