<?php

namespace App\Services\Platform;

use Admin\Models\Locations_model;

/**
 * PMD_LOCATION_PLATFORM_CONTEXT_R1
 *
 * Resolves the regional platform profile from the physical restaurant location.
 * This is the root runtime authority for country-sensitive behaviour.
 */
final class LocationPlatformContext
{
    public function __construct(
        private ?CountryPlatformProfileRegistry $profiles = null
    ) {
        $this->profiles = $profiles ?: new CountryPlatformProfileRegistry();
    }

    public function state(?int $locationId = null): array
    {
        $location = $this->resolveLocation($locationId);
        $countryCode = $this->countryCodeFromLocation($location);

        // Tenant-level market setting is a fallback only. Location country wins.
        if ($countryCode === '') {
            try {
                $countryCode = $this->profiles->normalizeCountry((string)setting('pmd_market_country_code', ''));
            } catch (\Throwable $ignored) {
                $countryCode = '';
            }
        }

        $profile = $countryCode !== '' ? $this->profiles->profile($countryCode) : null;

        return [
            'location_id' => $location ? (int)$location->getKey() : null,
            'location_name' => $location ? (string)($location->location_name ?? '') : null,
            'country_code' => $countryCode !== '' ? $countryCode : null,
            'resolved' => $profile !== null,
            'profile_version' => CountryPlatformProfileRegistry::VERSION,
            'profile' => $profile,
        ];
    }

    public function profile(?int $locationId = null): ?array
    {
        return $this->state($locationId)['profile'] ?? null;
    }

    public function countryCode(?int $locationId = null): ?string
    {
        return $this->state($locationId)['country_code'] ?? null;
    }

    public function timezone(?int $locationId = null): ?string
    {
        return $this->profile($locationId)['timezone'] ?? null;
    }

    public function currencyCode(?int $locationId = null): ?string
    {
        return $this->profile($locationId)['currency']['code'] ?? null;
    }

    public function currencyMinorExponent(?int $locationId = null): ?int
    {
        $value = $this->profile($locationId)['currency']['minor_exponent'] ?? null;
        return $value === null ? null : (int)$value;
    }

    public function languages(?int $locationId = null): array
    {
        return (array)($this->profile($locationId)['languages'] ?? []);
    }

    public function payments(?int $locationId = null): array
    {
        return (array)($this->profile($locationId)['payments'] ?? []);
    }

    public function terminals(?int $locationId = null): array
    {
        return (array)($this->profile($locationId)['terminals'] ?? []);
    }

    private function resolveLocation(?int $locationId)
    {
        try {
            return $locationId
                ? Locations_model::query()->find($locationId)
                : Locations_model::getDefault();
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function countryCodeFromLocation($location): string
    {
        if (!$location) return '';

        try {
            $address = method_exists($location, 'getAddress') ? (array)$location->getAddress() : [];
            return $this->profiles->normalizeCountry(
                (string)($address['iso_code_2'] ?? $address['iso_code_3'] ?? $address['country'] ?? '')
            );
        } catch (\Throwable $error) {
            return '';
        }
    }
}
