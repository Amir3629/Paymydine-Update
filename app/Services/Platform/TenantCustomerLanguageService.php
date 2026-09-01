<?php

namespace App\Services\Platform;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_TENANT_CUSTOMER_LANGUAGES_R1
 *
 * Owns customer-facing locale activation without changing Admin locale state.
 * This is deliberately separate from the framework/Admin languages table:
 * a market may launch a customer-menu language before a full Admin catalogue
 * exists. Restaurant-created menu/category translations remain tenant data.
 */
final class TenantCustomerLanguageService
{
    public function __construct(
        private ?CountryPlatformProfileRegistry $profiles = null,
        private ?PlatformLanguageRegistry $languages = null
    ) {
        $this->profiles = $profiles ?: new CountryPlatformProfileRegistry();
        $this->languages = $languages ?: new PlatformLanguageRegistry();
    }

    public function sync(string $countryInput): array
    {
        $profile = $this->profiles->requireProfile($countryInput);
        $config = (array)($profile['languages'] ?? []);
        $warnings = [];

        $eligible = array_values(array_unique(array_filter(array_map(
            fn ($code) => $this->languages->normalize($code),
            (array)($config['eligible'] ?? ['en'])
        ))));

        $ready = [];
        foreach ($eligible as $code) {
            if ($this->languages->marketPackReady($code)) {
                $ready[] = $code;
            } else {
                $warnings[] = 'Customer language pack is not ready for '.$code.'.';
            }
        }

        if (!$ready) {
            $ready = ['en'];
            $warnings[] = 'No eligible customer language pack was ready; English was retained.';
        }

        $preferred = $this->languages->normalize((string)($config['default'] ?? 'en'));
        $fallback = $this->languages->normalize((string)($config['fallback'] ?? 'en'));
        $default = in_array($preferred, $ready, true)
            ? $preferred
            : (in_array($fallback, $ready, true) ? $fallback : $ready[0]);

        // Keep profile order stable so Oman is always English -> Arabic.
        $enabled = array_values(array_filter(
            $eligible,
            static fn ($code) => in_array($code, $ready, true)
        ));

        $state = [
            'default' => $default,
            'eligible' => $eligible,
            'enabled' => $enabled,
            'missing' => array_values(array_diff($eligible, $enabled)),
            'locale_tags' => array_values((array)($config['locale_tags'] ?? [])),
            'directions' => array_reduce(
                $enabled,
                function (array $carry, string $code): array {
                    $carry[$code] = $this->languages->direction($code);
                    return $carry;
                },
                []
            ),
        ];

        $this->upsertSetting('pmd_v2_enabled_languages', implode(',', $enabled), false);
        $this->upsertSetting('pmd_customer_default_language', $default, false);
        $this->upsertSetting(
            'pmd_customer_languages_json',
            json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
            false
        );

        // Oman already uses English as its framework default. Keep that setting
        // aligned without enabling an incomplete Arabic Admin locale.
        if ((string)$profile['country_code'] === CountryPlatformProfileRegistry::OMAN) {
            $this->upsertSetting('default_language', $default, false);
        }

        Log::info('PMD_TENANT_CUSTOMER_LANGUAGES_SYNCED_R1', [
            'country_code' => (string)$profile['country_code'],
            'default' => $default,
            'enabled' => $enabled,
            'warnings' => $warnings,
        ]);

        return [
            'ok' => true,
            'country_code' => (string)$profile['country_code'],
            'country_name' => (string)$profile['country_name'],
            'languages' => $state,
            'warnings' => $warnings,
        ];
    }

    private function upsertSetting(string $item, $value, bool $serialized): void
    {
        if (!Schema::hasTable('settings')) {
            throw new \RuntimeException('Tenant settings table is missing.');
        }

        $columns = Schema::getColumnListing('settings');
        $where = ['item' => $item];
        if (in_array('sort', $columns, true)) $where['sort'] = 'config';

        $payload = [
            'value' => $serialized ? serialize($value) : (string)$value,
        ];
        if (in_array('serialized', $columns, true)) $payload['serialized'] = $serialized ? 1 : 0;
        if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();
        if (in_array('date_updated', $columns, true)) $payload['date_updated'] = now();
        if (in_array('sort', $columns, true)) $payload['sort'] = 'config';

        DB::table('settings')->updateOrInsert($where, $payload);
    }
}
