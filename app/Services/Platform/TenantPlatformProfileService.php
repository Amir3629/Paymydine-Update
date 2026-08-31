<?php

namespace App\Services\Platform;

use Admin\Models\Payments_model;
use App\Services\Payments\PaymobOmanTenantCatalogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_TENANT_PLATFORM_PROFILE_R4
 *
 * Applies one country profile to the current tenant's default location and
 * tenant-global framework defaults. LocationPlatformContext remains runtime
 * authority for location-scoped features.
 */
final class TenantPlatformProfileService
{
    public function __construct(private ?CountryPlatformProfileRegistry $profiles = null)
    {
        $this->profiles = $profiles ?: new CountryPlatformProfileRegistry();
    }

    public function apply(string $countryInput): array
    {
        $profile = $this->profiles->requireProfile($countryInput);
        $countryCode = (string)$profile['country_code'];
        $warnings = [];

        // Safe catalogue data can be materialized. This makes OMR real even on
        // legacy tenant templates which never shipped an OMR currency row.
        $foundation = (new TenantRegionalFoundationService())->ensure($profile);
        if (!($foundation['ok'] ?? false)) {
            throw new \RuntimeException('Regional country/currency foundation could not be prepared.');
        }

        $countryId = (int)($foundation['country']['country_id'] ?? 0) ?: null;
        $currencyCode = (string)$profile['currency']['code'];
        $this->ensureMarketLanguages($countryCode, (array)$profile['languages'], $warnings);
        $languageState = $this->resolveLanguages((array)$profile['languages']);
        if ($languageState['missing']) {
            $warnings[] = 'Market language packs not enabled: '.implode(', ', $languageState['missing']).'.';
        }

        $defaultLocationId = $this->resolveDefaultLocationId();
        if ($defaultLocationId && $countryId) {
            $this->applyCountryToLocation($defaultLocationId, $countryId);
        } elseif (!$defaultLocationId) {
            $warnings[] = 'No default restaurant location was found; tenant defaults were still saved.';
        }

        $framework = [
            'timezone' => (string)$profile['timezone'],
            'default_language' => (string)$languageState['default'],
            'supported_languages' => array_values($languageState['enabled']),
            'default_currency_code' => $currencyCode,
        ];
        if ($countryId) $framework['country_id'] = $countryId;

        $this->saveFrameworkSettings($framework, $warnings);
        $this->persistPlatformMetadata($profile, $defaultLocationId, $languageState, $warnings);
        $this->disableForeignPaymentRows($countryCode);

        $regionalCatalogue = null;
        try {
            $regionalCatalogue = (new TenantRegionalPaymentCatalogService($this->profiles))->ensureForCountry($countryCode);
        } catch (\Throwable $error) {
            $warnings[] = 'Regional payment catalogue could not be prepared: '.$error->getMessage();
        }

        $providerCatalogue = null;
        if ($countryCode === CountryPlatformProfileRegistry::OMAN) {
            try {
                $providerCatalogue = (new PaymobOmanTenantCatalogService())->ensureCurrentTenant(false);
            } catch (\Throwable $error) {
                $warnings[] = 'Paymob Oman catalogue could not be prepared: '.$error->getMessage();
            }
        }

        $state = [
            'ok' => true,
            'profile_version' => CountryPlatformProfileRegistry::VERSION,
            'country_code' => $countryCode,
            'country_name' => $profile['country_name'],
            'country_id' => $countryId,
            'default_location_id' => $defaultLocationId,
            'timezone' => $profile['timezone'],
            'currency' => $profile['currency'],
            'languages' => $languageState,
            'foundation' => $foundation,
            'payments' => [
                'providers' => array_keys((array)$profile['payments']['providers']),
                'methods' => array_keys((array)$profile['payments']['methods']),
                'regional_catalogue' => $regionalCatalogue,
                'provider_catalogue' => $providerCatalogue,
            ],
            'terminals' => $profile['terminals'],
            'warnings' => $warnings,
        ];

        Log::info('PMD_TENANT_PLATFORM_PROFILE_APPLIED', [
            'country_code' => $countryCode,
            'location_id' => $defaultLocationId,
            'timezone' => $profile['timezone'],
            'currency' => $currencyCode,
            'warnings' => $warnings,
        ]);

        return $state;
    }

    /**
     * Turkey ships as a real Turkish + English market. Register those tenant
     * language rows only when the corresponding code assets exist, and disable
     * non-market rows for Turkey so the admin switch cannot leak DE/AR choices.
     */
    private function ensureMarketLanguages(string $countryCode, array $config, array &$warnings): void
    {
        if (!Schema::hasTable('languages') || !Schema::hasColumn('languages', 'code')) return;

        $eligible = array_values(array_unique(array_filter(array_map(
            static fn ($code) => strtolower(trim((string)$code)),
            (array)($config['eligible'] ?? [])
        ))));
        if (!$eligible) return;

        $columns = Schema::getColumnListing('languages');
        $names = [
            'en' => ['name' => 'English', 'idiom' => 'english'],
            'tr' => ['name' => 'Türkçe', 'idiom' => 'turkish'],
            'de' => ['name' => 'Deutsch', 'idiom' => 'german'],
            'ar' => ['name' => 'العربية', 'idiom' => 'arabic'],
        ];

        foreach ($eligible as $code) {
            $hasPack = $code === 'en'
                || (is_dir(base_path('language/'.$code)) && is_file(base_path('app/admin/i18n/platform/'.$code.'.php')));
            if (!$hasPack) {
                $warnings[] = 'Language assets are missing for '.$code.'.';
                continue;
            }

            $definition = $names[$code] ?? ['name' => strtoupper($code), 'idiom' => $code];
            $payload = [];
            if (in_array('name', $columns, true)) $payload['name'] = $definition['name'];
            if (in_array('idiom', $columns, true)) $payload['idiom'] = $definition['idiom'];
            if (in_array('image', $columns, true)) $payload['image'] = '';
            if (in_array('status', $columns, true)) $payload['status'] = 1;
            if (in_array('can_delete', $columns, true)) $payload['can_delete'] = $code === 'en' ? 0 : 1;
            if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();
            if (in_array('created_at', $columns, true)) $payload['created_at'] = now();

            DB::table('languages')->updateOrInsert(['code' => $code], $payload);
        }

        if ($countryCode === CountryPlatformProfileRegistry::TURKEY && in_array('status', $columns, true)) {
            DB::table('languages')->whereNotIn('code', $eligible)->where('status', '!=', 0)->update(['status' => 0]);
        }
    }

    private function resolveLanguages(array $config): array
    {
        $eligible = array_values(array_unique(array_filter(array_map(
            static fn ($code) => strtolower(trim((string)$code)),
            (array)($config['eligible'] ?? [])
        ))));

        $enabled = [];
        if (Schema::hasTable('languages') && Schema::hasColumn('languages', 'code')) {
            $query = DB::table('languages')->whereIn('code', $eligible);
            if (Schema::hasColumn('languages', 'status')) $query->where('status', 1);
            $enabled = $query->pluck('code')
                ->map(static fn ($code) => strtolower((string)$code))
                ->values()->all();
        }

        $preferred = strtolower(trim((string)($config['default'] ?? 'en')));
        $fallback = strtolower(trim((string)($config['fallback'] ?? 'en')));
        $default = in_array($preferred, $enabled, true)
            ? $preferred
            : (in_array($fallback, $enabled, true) ? $fallback : ($enabled[0] ?? $fallback));

        return [
            'default' => $default,
            'eligible' => $eligible,
            'enabled' => $enabled ?: [$default],
            'missing' => array_values(array_diff($eligible, $enabled)),
            'locale_tags' => array_values((array)($config['locale_tags'] ?? [])),
        ];
    }

    private function resolveDefaultLocationId(): ?int
    {
        if (!Schema::hasTable('locations')) return null;

        try {
            $settingId = (int)setting('default_location_id', 0);
            if ($settingId > 0 && DB::table('locations')->where('location_id', $settingId)->exists()) {
                return $settingId;
            }
        } catch (\Throwable $ignored) {
        }

        $id = DB::table('locations')->orderBy('location_id')->value('location_id');
        return $id ? (int)$id : null;
    }

    private function applyCountryToLocation(int $locationId, int $countryId): void
    {
        if (!Schema::hasColumn('locations', 'location_country_id')) return;
        $update = ['location_country_id' => $countryId];
        if (Schema::hasColumn('locations', 'updated_at')) $update['updated_at'] = now();
        DB::table('locations')->where('location_id', $locationId)->update($update);
    }

    private function saveFrameworkSettings(array $settings, array &$warnings): void
    {
        try {
            setting()->set($settings);
            setting()->save();
        } catch (\Throwable $error) {
            $warnings[] = 'Framework settings manager warning: '.$error->getMessage();
        }

        foreach ($settings as $item => $value) {
            $this->upsertSetting($item, $value, is_array($value));
        }
    }

    private function persistPlatformMetadata(array $profile, ?int $locationId, array $languages, array &$warnings): void
    {
        if (!Schema::hasTable('settings')) return;

        $safeProfile = $profile;
        $safeProfile['profile_version'] = CountryPlatformProfileRegistry::VERSION;
        $safeProfile['active_languages'] = $languages['enabled'];

        $metadata = [
            'pmd_market_profile_version' => CountryPlatformProfileRegistry::VERSION,
            'pmd_market_country_code' => (string)$profile['country_code'],
            'pmd_market_country_name' => (string)$profile['country_name'],
            'pmd_market_timezone' => (string)$profile['timezone'],
            'pmd_market_currency_code' => (string)$profile['currency']['code'],
            'pmd_market_currency_minor_exponent' => (string)$profile['currency']['minor_exponent'],
            'pmd_market_languages_json' => json_encode($languages, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'pmd_market_profile_json' => json_encode($safeProfile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ];

        if ($locationId) {
            $metadata['pmd_default_location_market_json'] = json_encode([
                'location_id' => $locationId,
                'country_code' => $profile['country_code'],
                'timezone' => $profile['timezone'],
                'currency' => $profile['currency'],
                'languages' => $languages,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        foreach ($metadata as $item => $value) {
            if ($value === false) {
                $warnings[] = 'Could not encode platform metadata item '.$item.'.';
                continue;
            }
            $this->upsertSetting($item, (string)$value, false);
        }
    }

    /**
     * Match TastyIgniter's real settings storage contract:
     * unique key = sort + item, arrays are PHP-serialized, and the serialized
     * column is populated when present. This also supports newer schemas where
     * some of those legacy columns may have been removed.
     */
    private function upsertSetting(string $item, $value, bool $serialized): void
    {
        if (!Schema::hasTable('settings')) return;
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

    /**
     * Country changes are fail-closed. Rows from the other market are retained so
     * credentials/history are recoverable, but they cannot remain offered after a
     * location switches market. Oman additionally disables the legacy global
     * Germany-oriented provider/method catalogue copied from the tenant template;
     * its online runtime must use the isolated om_* rows instead.
     */
    private function disableForeignPaymentRows(string $countryCode): void
    {
        try {
            $model = new Payments_model();
            $table = $model->getTable();
            $connection = $model->getConnection();
            $schema = $connection->getSchemaBuilder();
            if (!$schema->hasTable($table)) return;

            if ($countryCode === CountryPlatformProfileRegistry::OMAN) {
                $foreignCodes = [
                    // Explicit Germany regional rows.
                    'de_card', 'de_apple_pay', 'de_google_pay', 'de_wero', 'de_paypal', 'de_cash',
                    // Legacy/global online methods copied from the old template.
                    'card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod', 'cash',
                    // Non-Oman providers. `paypal` may be a shared legacy row and
                    // is intentionally included above as well.
                    'stripe', 'worldline', 'sumup', 'square', 'vr_payment',
                    // Turkey remains payment-empty.
                    'tr_card', 'tr_cash',
                ];
            } elseif ($countryCode === CountryPlatformProfileRegistry::TURKEY) {
                // Turkey intentionally has NO payment integration yet. Disable
                // every known regional/provider/global row copied from templates.
                $foreignCodes = [
                    'de_card', 'de_apple_pay', 'de_google_pay', 'de_wero', 'de_paypal', 'de_cash',
                    'om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay', 'om_cash',
                    'card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod', 'cash',
                    'stripe', 'worldline', 'sumup', 'square', 'vr_payment', 'paymob',
                ];
            } else {
                $foreignCodes = [
                    'om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay', 'om_cash', 'paymob',
                    'tr_card', 'tr_cash',
                ];
            }

            $columns = $schema->getColumnListing($table);
            if (!in_array('status', $columns, true)) return;

            $foreignCodes = array_values(array_unique($foreignCodes));
            $affected = $connection->table($table)
                ->whereIn('code', $foreignCodes)
                ->where('status', '!=', 0)
                ->update(['status' => 0]);

            Log::info('PMD_TENANT_PLATFORM_FOREIGN_PAYMENTS_DISABLED_R4', [
                'country_code' => $countryCode,
                'affected_rows' => (int)$affected,
                'codes' => $foreignCodes,
            ]);
        } catch (\Throwable $error) {
            Log::warning('PMD_TENANT_PLATFORM_FOREIGN_PAYMENT_DISABLE_WARNING', ['message' => $error->getMessage()]);
        }
    }
}
