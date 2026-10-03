<?php

namespace App\Services\Payments;

use App\Services\Platform\LocationPlatformContext;

/**
 * PMD_PAYMENT_MARKET_CONTEXT_R2
 *
 * Payment-specific facade over LocationPlatformContext. Country is no longer a
 * payment-owned concept: the location platform context is the source of truth.
 */
final class PaymentMarketContext
{
    private PaymentMarketRegistry $registry;
    private LocationPlatformContext $platformContext;

    public function __construct(
        ?PaymentMarketRegistry $registry = null,
        ?LocationPlatformContext $platformContext = null
    ) {
        $this->registry = $registry ?: new PaymentMarketRegistry();
        $this->platformContext = $platformContext ?: new LocationPlatformContext();
    }

    public function countryCode(?int $locationId = null): ?string
    {
        return $this->platformContext->countryCode($locationId);
    }

    public function market(?int $locationId = null): ?array
    {
        return $this->registry->market($this->countryCode($locationId));
    }

    public function paymentMethods(?int $locationId = null): array
    {
        return $this->registry->methodsForCountry($this->countryCode($locationId));
    }

    public function isOman(?int $locationId = null): bool
    {
        return $this->countryCode($locationId) === PaymentMarketRegistry::COUNTRY_OMAN;
    }

    public function state(?int $locationId = null): array
    {
        $platform = $this->platformContext->state($locationId);
        $country = $platform['country_code'] ?? null;
        $market = $this->registry->market($country);

        return [
            'location_id' => $platform['location_id'] ?? null,
            'country_code' => $country,
            'resolved' => (bool)($platform['resolved'] ?? false),
            'market_supported' => $market !== null,
            'market' => $market,
            'platform_profile_version' => $platform['profile_version'] ?? null,
        ];
    }
}
