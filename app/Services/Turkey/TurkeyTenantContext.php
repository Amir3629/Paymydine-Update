<?php

namespace App\Services\Turkey;

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\LocationPlatformContext;

/**
 * Turkey-only runtime guard.
 *
 * Every Turkey integration must pass through this service before reading or
 * mutating Turkey-specific state. Location country is authoritative; the
 * tenant-level market setting is only the existing LocationPlatformContext
 * fallback.
 */
final class TurkeyTenantContext
{
    public function __construct(private ?LocationPlatformContext $platform = null)
    {
        $this->platform = $platform ?: new LocationPlatformContext();
    }

    public function state(?int $locationId = null): array
    {
        $state = $this->platform->state($locationId);
        $country = strtoupper((string)($state['country_code'] ?? ''));

        return [
            'is_turkey' => $country === CountryPlatformProfileRegistry::TURKEY,
            'country_code' => $country ?: null,
            'location_id' => $state['location_id'] ?? $locationId,
            'profile' => $state['profile'] ?? null,
        ];
    }

    public function isTurkey(?int $locationId = null): bool
    {
        return (bool)$this->state($locationId)['is_turkey'];
    }

    public function requireTurkey(?int $locationId = null): array
    {
        $state = $this->state($locationId);
        if (!$state['is_turkey']) {
            throw new \DomainException('Turkey integration is unavailable outside Türkiye tenants/locations.');
        }
        return $state;
    }
}
