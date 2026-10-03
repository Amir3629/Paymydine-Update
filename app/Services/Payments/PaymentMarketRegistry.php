<?php

namespace App\Services\Payments;

use App\Services\Platform\CountryPlatformProfileRegistry;

/**
 * PMD_PAYMENT_MARKET_REGISTRY_R2
 *
 * Payment-specific adapter over the root CountryPlatformProfileRegistry.
 * Country/timezone/currency/language/terminal truth is owned by the platform
 * profile; Payments consumes only the relevant section.
 */
final class PaymentMarketRegistry
{
    public const COUNTRY_OMAN = CountryPlatformProfileRegistry::OMAN;
    public const PAYMOB_REGION_OMAN = 'OMN';

    public const METHOD_OM_CARD = 'om_card';
    public const METHOD_OM_OMANNET = 'om_omannet';
    public const METHOD_OM_APPLE_PAY = 'om_apple_pay';
    public const METHOD_OM_GOOGLE_PAY = 'om_google_pay';
    public const METHOD_OM_CASH = 'om_cash';

    public function __construct(
        private ?CountryPlatformProfileRegistry $platformProfiles = null
    ) {
        $this->platformProfiles = $platformProfiles ?: new CountryPlatformProfileRegistry();
    }

    public function market(?string $country): ?array
    {
        $profile = $this->platformProfiles->profile($country);
        if (!$profile) return null;

        $countryCode = (string)$profile['country_code'];
        $payments = (array)$profile['payments'];

        return [
            'country_code' => $countryCode,
            'country_name' => (string)$profile['country_name'],
            'provider_region_code' => (string)($payments['provider_region'] ?? ''),
            'currency' => (string)$profile['currency']['code'],
            'currency_minor_exponent' => (int)$profile['currency']['minor_exponent'],
            'provider_code' => $countryCode === self::COUNTRY_OMAN ? 'paymob' : null,
            'provider_base_url' => $countryCode === self::COUNTRY_OMAN ? PaymobApiClient::OMAN_BASE_URL : null,
            'providers' => (array)($payments['providers'] ?? []),
            'methods' => $this->methodsForCountry($countryCode),
        ];
    }

    public function methodsForCountry(?string $country): array
    {
        $profile = $this->platformProfiles->profile($country);
        if (!$profile) return [];

        $countryCode = (string)$profile['country_code'];
        $countryName = (string)$profile['country_name'];
        $currency = (string)$profile['currency']['code'];
        $result = [];

        foreach ((array)$profile['payments']['methods'] as $variantCode => $definition) {
            $definition = (array)$definition;
            $providerCandidates = array_values((array)($definition['provider_candidates'] ?? []));
            $result[$variantCode] = array_merge($definition, [
                'country_code' => $countryCode,
                'country_name' => $countryName,
                'currency' => $currency,
                'provider_code' => count($providerCandidates) === 1 ? $providerCandidates[0] : null,
                'provider_candidates' => $providerCandidates,
                'online' => $definition['canonical_method'] !== 'cash',
                'checkout_experiences' => $countryCode === self::COUNTRY_OMAN && $providerCandidates === ['paymob']
                    ? ['unified_checkout', 'pixel']
                    : [],
                'requires_merchant_enablement' => $providerCandidates !== [],
                'runtime_offerable' => false,
                'runtime_offerable_reason' => 'Catalogue eligibility is separate from provider/account runtime readiness.',
            ]);
        }

        return $result;
    }

    public function method(string $variantCode): ?array
    {
        $variantCode = strtolower(trim($variantCode));
        if ($variantCode === '') return null;

        foreach ($this->platformProfiles->profiles() as $countryCode => $profile) {
            $methods = $this->methodsForCountry($countryCode);
            if (isset($methods[$variantCode])) return $methods[$variantCode];
        }
        return null;
    }

    public function canonicalMethodCode(string $code): string
    {
        $method = $this->method($code);
        return $method ? (string)$method['canonical_method'] : strtolower(trim($code));
    }

    public function countryForMethod(string $variantCode): ?string
    {
        $method = $this->method($variantCode);
        return $method ? (string)$method['country_code'] : null;
    }

    public function providerForMethod(string $variantCode): ?string
    {
        $method = $this->method($variantCode);
        return $method ? (($method['provider_code'] ?? null) ?: null) : null;
    }

    public function paymobIntegrationKey(string $variantCode): ?string
    {
        $method = $this->method($variantCode);
        $value = $method['paymob_integration_key'] ?? null;
        return $value !== null && trim((string)$value) !== '' ? (string)$value : null;
    }

    public function isAvailableInCountry(string $variantCode, ?string $country): bool
    {
        $method = $this->method($variantCode);
        if (!$method) return false;
        return (string)$method['country_code'] === $this->normalizeCountry($country);
    }

    public function terminalState(?string $country): array
    {
        $profile = $this->platformProfiles->profile($country);
        $countryCode = $this->normalizeCountry($country);
        if (!$profile) {
            return [
                'country_code' => $countryCode ?: null,
                'provider_code' => null,
                'tap_to_pay_product' => false,
                'remote_terminal_api' => false,
                'pmd_terminal_runtime' => false,
                'status' => 'not_catalogued',
            ];
        }

        if ($countryCode === self::COUNTRY_OMAN) {
            $paymob = (array)($profile['terminals']['providers']['paymob'] ?? []);
            return [
                'country_code' => self::COUNTRY_OMAN,
                'provider_code' => 'paymob',
                'tap_to_pay_product' => (bool)($paymob['tap_to_pay_product'] ?? false),
                'tap_to_pay_mode' => 'Paymob App on supported device',
                'remote_terminal_api' => false,
                'pmd_terminal_runtime' => false,
                'status' => (string)($paymob['status'] ?? 'waiting_for_paymob_oman_ecr_terminal_contract'),
                'required_from_provider' => array_values((array)($paymob['requires'] ?? [])),
            ];
        }

        return [
            'country_code' => $countryCode,
            'provider_code' => null,
            'providers' => (array)($profile['terminals']['providers'] ?? []),
            'status' => 'market_profile_resolved',
        ];
    }

    public function normalizeCountry(?string $country): string
    {
        return $this->platformProfiles->normalizeCountry($country);
    }

    public function markets(): array
    {
        $result = [];
        foreach (array_keys($this->platformProfiles->profiles()) as $countryCode) {
            $market = $this->market($countryCode);
            if ($market) $result[$countryCode] = $market;
        }
        return $result;
    }
}
