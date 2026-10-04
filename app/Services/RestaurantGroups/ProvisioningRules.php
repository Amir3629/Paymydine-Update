<?php
namespace App\Services\RestaurantGroups;

/** Checkpoint validation is independent of HTTP, global DB state and retries. */
final class ProvisioningRules
{
    public const PHASES = ['reserved', 'registered', 'prepared', 'domain_ready', 'profile_ready', 'ready'];

    public static function input(object $site): array
    {
        $data = json_decode((string)$site->payload, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($data) || ($data['database'] ?? null) !== $site->database_name
            || ($data['domain'] ?? null) !== $site->slug.'.paymydine.com'
            || !preg_match('/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/D', (string)$site->slug)
            || !preg_match('/^[A-Za-z0-9_]{1,64}$/D', (string)$site->database_name)) {
            throw new \DomainException('Saved location details do not match its reservation.');
        }
        return $data;
    }

    public static function owner(object $group, object $owner): void
    {
        if (!in_array($group->status, ['active', 'provisioning'], true)
            || (int)$group->owner_id !== (int)$owner->id || $owner->status !== 'active') {
            throw new \DomainException('Business account or Owner is not active.');
        }
    }

    public static function checkpoint(object $site, object $group, object $owner): array
    {
        self::owner($group, $owner);
        $data = self::input($site);
        $mark = $data['_provisioning_r4'] ?? null;
        if (!is_array($mark) || ($mark['version'] ?? null) !== 1
            || !preg_match('/^[a-f0-9]{32}$/D', (string)($mark['token'] ?? ''))
            || (int)($mark['owner_id'] ?? 0) !== (int)$owner->id
            || !hash_equals((string)$owner->uuid, (string)($mark['owner_uuid'] ?? ''))
            || (int)($mark['group_id'] ?? 0) !== (int)$site->group_id
            || (int)$site->group_id !== (int)$group->id
            || !in_array($mark['phase'] ?? '', self::PHASES, true)
            || (int)($mark['tenant_id'] ?? 0) !== (int)($site->tenant_id ?? 0)) {
            throw new \DomainException('This location has no matching provisioning checkpoint. Review it before retrying.');
        }
        if (($mark['phase'] === 'reserved') !== ((int)($site->tenant_id ?? 0) === 0)) {
            throw new \DomainException('Provisioning checkpoint has an invalid tenant binding.');
        }
        return $mark;
    }

    public static function tenant(object $site, object $tenant, bool $allowReady = false): void
    {
        if ((int)$site->tenant_id !== (int)$tenant->id
            || (string)$tenant->database !== (string)$site->database_name
            || (string)$tenant->domain !== $site->slug.'.paymydine.com') {
            throw new \DomainException('The reserved location does not own this tenant.');
        }
        if (!$allowReady && (string)$tenant->status !== 'disabled') {
            throw new \DomainException('Provisioning can only modify a disabled, reserved tenant.');
        }
    }

    public static function transition(string $from, string $to): void
    {
        $index = array_search($from, self::PHASES, true);
        if ($index === false || (self::PHASES[$index + 1] ?? null) !== $to) {
            throw new \DomainException('Invalid provisioning checkpoint transition.');
        }
    }
}
