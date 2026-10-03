<?php

namespace App\Services\Platform;

use Admin\Facades\AdminLocation;
use Admin\Models\LocationOption;
use Admin\Models\Locations_model;

/**
 * PMD_LOCATION_CLOCK_STATE_R10
 *
 * Read-only source of truth for restaurant-local time. Existing Admin callers
 * may continue to omit a location; public/runtime callers may pass an explicit
 * location id so restaurant time never depends on an Admin session.
 */
final class LocationClockStateService
{
    public function __construct(
        private ?LocationPlatformContext $marketContext = null
    ) {
        $this->marketContext = $marketContext ?: new LocationPlatformContext();
    }

    public function state(?int $requestedLocationId = null): array
    {
        $location = ($requestedLocationId ?? 0) > 0
            ? $this->locationById((int)$requestedLocationId)
            : $this->activeLocation();

        $locationId = $location ? (int)($location->location_id ?? 0) : 0;
        $locationId = $locationId > 0 ? $locationId : null;
        $locationName = $location ? trim((string)($location->location_name ?? '')) : '';

        [$timezone, $source] = $this->resolveTimezone($location, $locationId);

        return [
            'version' => '10.0.0',
            'location_id' => $locationId,
            'location_name' => $locationName !== '' ? $locationName : null,
            'timezone' => $timezone,
            'timezone_source' => $source,
            // Client computes a stable offset from this value so a wrong laptop
            // clock/timezone can never silently become restaurant time.
            'server_epoch_ms' => (int)round(microtime(true) * 1000),
        ];
    }

    private function activeLocation()
    {
        try {
            return AdminLocation::current();
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function locationById(int $locationId)
    {
        try {
            return Locations_model::query()->find($locationId);
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function resolveTimezone($location, ?int $locationId): array
    {
        if ($location) {
            foreach (['timezone', 'location_timezone'] as $field) {
                $timezone = $this->validTimezone($location->{$field} ?? null);
                if ($timezone !== null) {
                    return [$timezone, 'location-model'];
                }
            }

            try {
                $timezone = $this->validTimezone(
                    LocationOption::onLocation($location)->get('timezone', '')
                );
                if ($timezone !== null) {
                    return [$timezone, 'location-option'];
                }
            } catch (\Throwable $error) {
                // Continue through the explicit fallback chain.
            }
        }

        try {
            $timezone = $this->validTimezone(
                $this->marketContext->timezone($locationId)
            );
            if ($timezone !== null) {
                return [$timezone, 'location-market-profile'];
            }
        } catch (\Throwable $error) {
            // Continue to tenant settings.
        }

        foreach ([
            ['pmd_market_timezone', 'market-setting'],
            ['timezone', 'tenant-setting'],
        ] as [$settingKey, $source]) {
            try {
                $timezone = $this->validTimezone(setting($settingKey));
                if ($timezone !== null) {
                    return [$timezone, $source];
                }
            } catch (\Throwable $error) {
                // Continue to the next source.
            }
        }

        $timezone = $this->validTimezone(config('app.timezone', 'UTC'));
        if ($timezone !== null) {
            return [$timezone, 'app-fallback'];
        }

        return ['UTC', 'utc-fallback'];
    }

    private function validTimezone($value): ?string
    {
        $value = trim((string)$value);
        if ($value === '') return null;

        try {
            new \DateTimeZone($value);
            return $value;
        } catch (\Throwable $error) {
            return null;
        }
    }
}
