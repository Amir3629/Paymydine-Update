<?php

namespace App\Services\Platform;

/**
 * PMD_COUNTRY_PLATFORM_PROFILE_R1
 *
 * Country is a platform context, not a payment-only flag.
 *
 * Each restaurant/location resolves one country profile that can drive:
 * - timezone/date behaviour
 * - currency/minor-unit rules
 * - language eligibility/defaults
 * - payment provider + method catalogue
 * - terminal/provider availability
 * - future regional product settings
 *
 * IMPORTANT:
 * - A profile describes product eligibility, not merchant activation.
 * - Business opening hours, taxes and legal/fiscal configuration remain explicit
 *   restaurant settings and are never guessed from country alone.
 */
final class CountryPlatformProfileRegistry
{
    public const VERSION = '1.0.0';
    public const GERMANY = 'DE';
    public const OMAN = 'OM';

    public function profiles(): array
    {
        return [
            self::GERMANY => [
                'country_code' => 'DE',
                'country_iso3' => 'DEU',
                'country_name' => 'Germany',
                'calling_code' => '+49',
                'timezone' => 'Europe/Berlin',
                'week_start' => 'monday',
                'date_format_hint' => 'DD.MM.YYYY',
                'currency' => [
                    'code' => 'EUR',
                    'minor_exponent' => 2,
                ],
                'languages' => [
                    'default' => 'de',
                    'fallback' => 'en',
                    'eligible' => ['de', 'en'],
                    'locale_tags' => ['de-DE', 'en-DE'],
                ],
                'operations' => [
                    'business_hours_policy' => 'location_owned',
                    'reservation_timezone' => 'Europe/Berlin',
                    'reporting_timezone' => 'Europe/Berlin',
                    'tax_policy' => 'restaurant_configured',
                ],
                'payments' => [
                    'currency' => 'EUR',
                    'providers' => [
                        'stripe' => ['online' => true, 'terminal' => false],
                        'paypal' => ['online' => true, 'terminal' => false],
                        'sumup' => ['online' => true, 'terminal' => true],
                        'vr_payment' => ['online' => true, 'terminal' => true],
                        'worldline' => ['online' => 'catalogue', 'terminal' => false],
                        'square' => ['online' => true, 'terminal' => false],
                    ],
                    'methods' => [
                        'de_card' => $this->method('de_card', 'Cards (Germany)', 'card', ['stripe', 'sumup', 'vr_payment', 'worldline', 'square']),
                        'de_apple_pay' => $this->method('de_apple_pay', 'Apple Pay (Germany)', 'apple_pay', ['stripe', 'sumup', 'vr_payment']),
                        'de_google_pay' => $this->method('de_google_pay', 'Google Pay (Germany)', 'google_pay', ['stripe', 'sumup', 'vr_payment']),
                        'de_wero' => $this->method('de_wero', 'Wero (Germany)', 'wero', ['worldline', 'vr_payment']),
                        'de_paypal' => $this->method('de_paypal', 'PayPal (Germany)', 'paypal', ['paypal', 'stripe', 'vr_payment']),
                        'de_cash' => $this->method('de_cash', 'Cash (Germany)', 'cash', []),
                    ],
                ],
                'terminals' => [
                    'providers' => [
                        'sumup' => ['pmd_remote_runtime' => true, 'status' => 'implemented'],
                        'vr_payment' => ['pmd_remote_runtime' => true, 'status' => 'implemented'],
                        'worldline' => ['pmd_remote_runtime' => false, 'status' => 'not_certified'],
                    ],
                ],
            ],

            self::OMAN => [
                'country_code' => 'OM',
                'country_iso3' => 'OMN',
                'country_name' => 'Oman',
                'calling_code' => '+968',
                'timezone' => 'Asia/Muscat',
                'week_start' => 'sunday',
                'date_format_hint' => 'DD/MM/YYYY',
                'currency' => [
                    'code' => 'OMR',
                    'minor_exponent' => 3,
                ],
                'languages' => [
                    // English is the safe framework default until the tenant has an
                    // enabled Arabic language pack. Arabic remains market-eligible.
                    'default' => 'en',
                    'fallback' => 'en',
                    'eligible' => ['en', 'ar'],
                    'locale_tags' => ['en-OM', 'ar-OM'],
                ],
                'operations' => [
                    'business_hours_policy' => 'location_owned',
                    'reservation_timezone' => 'Asia/Muscat',
                    'reporting_timezone' => 'Asia/Muscat',
                    'tax_policy' => 'restaurant_configured',
                ],
                'payments' => [
                    'currency' => 'OMR',
                    'provider_region' => 'OMN',
                    'providers' => [
                        'paymob' => [
                            'online' => true,
                            'terminal_product' => true,
                            'pmd_remote_terminal_runtime' => false,
                            'status' => 'online_backend_ready_terminal_contract_pending',
                        ],
                    ],
                    'methods' => [
                        'om_card' => $this->method('om_card', 'Cards (Oman)', 'card', ['paymob'], 'card', ['Visa', 'Mastercard', 'American Express']),
                        'om_omannet' => $this->method('om_omannet', 'OmanNet (Oman)', 'omannet', ['paymob'], 'omannet', ['OmanNet']),
                        'om_apple_pay' => $this->method('om_apple_pay', 'Apple Pay (Oman)', 'apple_pay', ['paymob'], 'apple_pay', ['Apple Pay']),
                        'om_google_pay' => $this->method('om_google_pay', 'Google Pay (Oman)', 'google_pay', ['paymob'], 'google_pay', ['Google Pay']),
                        'om_cash' => $this->method('om_cash', 'Cash (Oman)', 'cash', []),
                    ],
                ],
                'terminals' => [
                    'providers' => [
                        'paymob' => [
                            'tap_to_pay_product' => true,
                            'pmd_remote_runtime' => false,
                            'status' => 'waiting_for_paymob_oman_ecr_terminal_contract',
                            'requires' => [
                                'POS/ECR or Cloud Terminal API documentation',
                                'terminal discovery/provisioning contract',
                                'remote charge and status contract',
                                'refund/cancel contract',
                                'test terminal or simulator',
                                'certification requirements',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    public function profile(?string $country): ?array
    {
        $code = $this->normalizeCountry($country);
        return $code !== '' ? ($this->profiles()[$code] ?? null) : null;
    }

    public function requireProfile(string $country): array
    {
        $profile = $this->profile($country);
        if (!$profile) {
            throw new \InvalidArgumentException('Unsupported PayMyDine platform country: '.$country);
        }
        return $profile;
    }

    public function countryOptions(): array
    {
        $options = [];
        foreach ($this->profiles() as $code => $profile) {
            $options[$code] = (string)$profile['country_name'];
        }
        return $options;
    }

    /**
     * Browser-safe summary for Superadmin create/edit previews.
     */
    public function publicProfiles(): array
    {
        $result = [];
        foreach ($this->profiles() as $code => $profile) {
            $result[$code] = [
                'country_code' => $code,
                'country_name' => $profile['country_name'],
                'timezone' => $profile['timezone'],
                'currency' => $profile['currency'],
                'languages' => $profile['languages'],
                'payment_providers' => array_keys((array)$profile['payments']['providers']),
                'payment_methods' => array_values(array_map(
                    static fn (array $method): string => (string)$method['label'],
                    (array)$profile['payments']['methods']
                )),
                'terminal_providers' => (array)$profile['terminals']['providers'],
            ];
        }
        return $result;
    }

    public function normalizeCountry(?string $country): string
    {
        $value = strtoupper(trim((string)$country));
        if ($value === '') return '';

        return match ($value) {
            'DE', 'DEU', 'GERMANY', 'DEUTSCHLAND' => self::GERMANY,
            'OM', 'OMN', 'OMAN', 'SULTANATE OF OMAN' => self::OMAN,
            default => $value,
        };
    }

    public function canonicalCountryName(string $country): string
    {
        $profile = $this->profile($country);
        return $profile ? (string)$profile['country_name'] : trim($country);
    }

    private function method(
        string $code,
        string $label,
        string $canonical,
        array $providers,
        ?string $paymobIntegrationKey = null,
        array $brands = []
    ): array {
        return [
            'code' => $code,
            'label' => $label,
            'canonical_method' => $canonical,
            'provider_candidates' => array_values($providers),
            'paymob_integration_key' => $paymobIntegrationKey,
            'brands' => array_values($brands),
            'requires_provider_activation' => $providers !== [],
            'runtime_offerable' => false,
        ];
    }
}
