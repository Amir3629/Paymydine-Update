<?php

namespace App\Services\Payments;

/**
 * PMD_PAYMENT_MARKET_REGISTRY_R1
 *
 * Region-aware payment catalogue.
 *
 * Why this exists:
 * - PMD is multi-country and a payment method name alone is not enough.
 * - Apple Pay/Google Pay availability and the provider behind them can differ by market.
 * - Regional method variants let the owner UI later show only methods that belong to
 *   the restaurant's country without breaking the existing canonical method families.
 *
 * Important:
 * - Variant codes are presentation/catalogue identities, not new payment protocols.
 * - Runtime code should normalize a variant to canonical_method before orchestration.
 * - A catalogue entry never means the merchant account has the method enabled.
 */
final class PaymentMarketRegistry
{
    public const COUNTRY_OMAN = 'OM';
    public const PAYMOB_REGION_OMAN = 'OMN';

    public const METHOD_OM_CARD = 'om_card';
    public const METHOD_OM_OMANNET = 'om_omannet';
    public const METHOD_OM_APPLE_PAY = 'om_apple_pay';
    public const METHOD_OM_GOOGLE_PAY = 'om_google_pay';

    /**
     * Return the market definition for a restaurant country.
     */
    public function market(?string $country): ?array
    {
        $country = $this->normalizeCountry($country);

        return $country !== '' ? ($this->markets()[$country] ?? null) : null;
    }

    /**
     * Return regional payment-method variants for a restaurant country.
     */
    public function methodsForCountry(?string $country): array
    {
        $market = $this->market($country);

        return is_array($market) ? (array)($market['methods'] ?? []) : [];
    }

    /**
     * Resolve one regional variant by code.
     */
    public function method(string $variantCode): ?array
    {
        $variantCode = strtolower(trim($variantCode));
        if ($variantCode === '') return null;

        foreach ($this->markets() as $market) {
            $method = (array)($market['methods'][$variantCode] ?? []);
            if ($method) return $method;
        }

        return null;
    }

    /**
     * Convert a regional UI/catalogue code back to PMD's canonical payment family.
     */
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

        return $method ? (string)$method['provider_code'] : null;
    }

    public function paymobIntegrationKey(string $variantCode): ?string
    {
        $method = $this->method($variantCode);

        return $method ? (string)($method['paymob_integration_key'] ?? '') ?: null : null;
    }

    public function isAvailableInCountry(string $variantCode, ?string $country): bool
    {
        $method = $this->method($variantCode);
        if (!$method) return false;

        return (string)$method['country_code'] === $this->normalizeCountry($country);
    }

    /**
     * Product-level terminal truth for the market.
     *
     * Paymob publicly documents Tap to Pay through the Paymob App. That is not the
     * same thing as a PMD-controllable Cloud Terminal/ECR API, so remote terminal
     * charging intentionally remains blocked until Paymob Oman provides the private
     * terminal/ECR contract and certification requirements.
     */
    public function terminalState(?string $country): array
    {
        $country = $this->normalizeCountry($country);
        if ($country !== self::COUNTRY_OMAN) {
            return [
                'country_code' => $country ?: null,
                'provider_code' => null,
                'tap_to_pay_product' => false,
                'remote_terminal_api' => false,
                'pmd_terminal_runtime' => false,
                'status' => 'not_catalogued',
            ];
        }

        return [
            'country_code' => self::COUNTRY_OMAN,
            'provider_code' => 'paymob',
            'tap_to_pay_product' => true,
            'tap_to_pay_mode' => 'Paymob App on supported device',
            'remote_terminal_api' => false,
            'pmd_terminal_runtime' => false,
            'status' => 'waiting_for_paymob_oman_ecr_terminal_contract',
            'required_from_provider' => [
                'POS/ECR or Cloud Terminal API documentation',
                'terminal discovery/provisioning contract',
                'remote charge request contract',
                'transaction status contract',
                'refund/cancel contract for terminal transactions',
                'test terminal or simulator',
                'certification and supported device requirements',
            ],
        ];
    }

    public function normalizeCountry(?string $country): string
    {
        $country = strtoupper(trim((string)$country));
        if ($country === '') return '';

        return match ($country) {
            'OM', 'OMN', 'OMAN', 'SULTANATE OF OMAN' => self::COUNTRY_OMAN,
            default => $country,
        };
    }

    public function markets(): array
    {
        return [
            self::COUNTRY_OMAN => [
                'country_code' => self::COUNTRY_OMAN,
                'country_name' => 'Oman',
                'provider_region_code' => self::PAYMOB_REGION_OMAN,
                'currency' => 'OMR',
                'currency_minor_exponent' => 3,
                'provider_code' => 'paymob',
                'provider_base_url' => PaymobApiClient::OMAN_BASE_URL,
                'methods' => [
                    self::METHOD_OM_CARD => $this->omanMethod(
                        self::METHOD_OM_CARD,
                        'Cards (Oman)',
                        'card',
                        'card',
                        ['Visa', 'Mastercard', 'American Express']
                    ),
                    self::METHOD_OM_OMANNET => $this->omanMethod(
                        self::METHOD_OM_OMANNET,
                        'OmanNet (Oman)',
                        'omannet',
                        'omannet',
                        ['OmanNet']
                    ),
                    self::METHOD_OM_APPLE_PAY => $this->omanMethod(
                        self::METHOD_OM_APPLE_PAY,
                        'Apple Pay (Oman)',
                        'apple_pay',
                        'apple_pay',
                        ['Apple Pay']
                    ),
                    self::METHOD_OM_GOOGLE_PAY => $this->omanMethod(
                        self::METHOD_OM_GOOGLE_PAY,
                        'Google Pay (Oman)',
                        'google_pay',
                        'google_pay',
                        ['Google Pay']
                    ),
                ],
            ],
        ];
    }

    private function omanMethod(
        string $variantCode,
        string $label,
        string $canonicalMethod,
        string $integrationKey,
        array $brands
    ): array {
        return [
            'code' => $variantCode,
            'label' => $label,
            'country_code' => self::COUNTRY_OMAN,
            'country_name' => 'Oman',
            'currency' => 'OMR',
            'canonical_method' => $canonicalMethod,
            'provider_code' => 'paymob',
            'paymob_integration_key' => $integrationKey,
            'brands' => array_values($brands),
            'online' => true,
            'checkout_experiences' => ['unified_checkout', 'pixel'],
            'refund_supported_by_provider' => true,
            'void_supported_by_provider' => true,
            'requires_merchant_enablement' => true,
            'runtime_offerable' => false,
            'runtime_offerable_reason' => 'Enable only after this tenant has a matching Paymob Oman Integration ID and the end-to-end PMD flow is activated.',
        ];
    }
}
