<?php
namespace App\Services\RestaurantGroups;

/** Deterministic publication checks, independent of sessions or database defaults. */
final class PublicationRules
{
    public const VERSION = 3;
    public const MISSING = 'pmd:publication:v3:absent';

    public static function fingerprint(?array $state): string
    {
        return hash('sha256', $state === null ? self::MISSING : Policy::canonical($state));
    }

    public static function unchanged(?string $expected, ?array $current): void
    {
        if (!is_string($expected) || !hash_equals($expected, self::fingerprint($current))) {
            throw new \DomainException('This location changed after preview. Create a new preview.');
        }
    }

    public static function numericId(string $id): int
    {
        if (!preg_match('/^[1-9][0-9]{0,14}$/D', $id)) {
            throw new \InvalidArgumentException('Invalid item identifier.');
        }
        return (int)$id;
    }

    public static function member(object $site, int $groupId): void
    {
        if ((int)$site->group_id !== $groupId || $site->state !== 'ready' || (int)$site->location_id < 1) {
            throw new \DomainException('This location no longer belongs to the selected business account.');
        }
    }

    public static function couponCollision(?object $existing, ?int $mappedId): void
    {
        if ($existing && ($mappedId === null || (int)$existing->coupon_id !== $mappedId)) {
            throw new \DomainException('This discount code belongs to a different local discount. Change the source code before publishing.');
        }
    }

    public static function envelope(array $payload, object $operation, object $owner, object $group): array
    {
        $meta = $payload['meta'] ?? [];
        if (($meta['version'] ?? null) !== self::VERSION
            || (int)($meta['owner_id'] ?? 0) !== (int)$owner->id
            || (int)($meta['auth_version'] ?? 0) !== (int)$owner->auth_version
            || (string)($meta['group_uuid'] ?? '') !== (string)$group->uuid
            || (int)($meta['source_tenant_id'] ?? 0) !== (int)$operation->source_tenant_id
            || (string)($meta['type'] ?? '') !== (string)$operation->entity_type
            || !is_array($payload['item'] ?? null)
            || !hash_equals((string)$operation->digest, Policy::digest($payload))) {
            throw new \DomainException('This preview is no longer valid. Create a new preview.');
        }
        return $payload['item'];
    }

    public static function sameCurrency(array $source, array $target): void
    {
        if (($source['currency'] ?? '') === '' || ($target['currency'] ?? '') === ''
            || $source['currency'] !== $target['currency']
            || ($source['decimals'] ?? null) !== ($target['decimals'] ?? null)) {
            throw new \DomainException('Price publication requires matching configured currencies and decimal precision.');
        }
    }
}
