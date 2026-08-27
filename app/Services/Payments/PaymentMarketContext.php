<?php

namespace App\Services\Payments;

use Admin\Models\Locations_model;

/**
 * PMD_PAYMENT_MARKET_CONTEXT_R1
 *
 * Resolves the payment market from the current tenant restaurant/location.
 * The source of truth is the location country relation (iso_code_2), not a
 * browser locale, currency guess, hostname guess, or provider credential.
 */
final class PaymentMarketContext
{
    private PaymentMarketRegistry $registry;

    public function __construct(?PaymentMarketRegistry $registry = null)
    {
        $this->registry = $registry ?: new PaymentMarketRegistry();
    }

    public function countryCode(?int $locationId = null): ?string
    {
        try {
            $location = $locationId
                ? Locations_model::query()->find($locationId)
                : Locations_model::getDefault();

            if (!$location) return null;

            $address = method_exists($location, 'getAddress') ? (array)$location->getAddress() : [];
            $country = $this->registry->normalizeCountry(
                (string)($address['iso_code_2'] ?? $address['iso_code_3'] ?? $address['country'] ?? '')
            );

            return $country !== '' ? $country : null;
        } catch (\Throwable $error) {
            return null;
        }
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
        $country = $this->countryCode($locationId);
        $market = $this->registry->market($country);

        return [
            'country_code' => $country,
            'resolved' => $country !== null,
            'market_supported' => $market !== null,
            'market' => $market,
        ];
    }
}
