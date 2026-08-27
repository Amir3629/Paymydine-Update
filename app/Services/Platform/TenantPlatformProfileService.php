<?php

namespace App\Services\Platform;

use Admin\Models\Payments_model;
use App\Services\Payments\PaymobOmanTenantCatalogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_TENANT_PLATFORM_PROFILE_R1
 *
 * Applies the Superadmin-selected country to the tenant's DEFAULT location and
 * tenant-global framework defaults. Runtime features should still resolve the
 * actual LocationPlatformContext so additional locations can diverge later.
 */
final class TenantPlatformProfileService
{
    public function __construct(
        private ?CountryPlatformProfileRegistry $profiles = null
    ) {
        $this->profiles = $profiles ?: new CountryPlatformProfileRegistry();
    }

    public function apply(string $countryInput): array
    {
        $profile = $this->profiles->requireProfile($countryInput);
        $countryCode = (string)$profile['country_code'];
        $warnings = [];

        $countryId = $this->resolveCountryId($profile);
        if (!$countryId) {
            $warnings[] = 'Country row was not found in the tenant countries catalogue.';
        }

        $currencyCode = (string)$profile['currency']['code'];
        $currencyAvailable = $this->currencyExists($currencyCode);
        if (!$currencyAvailable) {
            $warnings[] = 'Currency '.$currencyCode.' is not installed/enabled in this tenant.';
        }

        $languageState = $this->resolveLanguages((array)$profile['languages']);
        if (!empty($languageState['missing'])) {
            $warnings[] = 'Market language packs not enabled: '.implode(', ', $languageState['missing']).'.';
        }

        $defaultLocationId = $this->resolveDefaultLocationId();
        if ($defaultLocationId && $countryId) {
            $this->applyCountryToLocation($defaultLocationId, $countryId);
        } elseif (!$defaultLocationId) {
            $warnings[] = 'No default restaurant location was found; tenant defaults were still saved.';
        }

        $frameworkSettings = [
            'timezone' => (string)$profile['timezone'],
            'default_language' => (string)$languageState['default'],
            'supported_languages' => array_values($languageState['enabled']),
        ];
        if ($countryId) $frameworkSettings['country_id'] = $countryId;
        if ($currencyAvailable) $frameworkSettings['default_currency_code'] = $currencyCode;

        $this->saveFrameworkSettings($frameworkSettings, $warnings);
        $this->persistPlatformMetadata($profile, $defaultLocationId, $languageState, $warnings);
        $this->disableForeignRegionalPaymentRows($countryCode);

        $paymentCatalog = null;
        if ($countryCode === CountryPlatformProfileRegistry::OMAN) {
            try {
                // Country has already been applied to the default location. False makes
                // this robust against static location caches in the same request.
                $paymentCatalog = (new PaymobOmanTenantCatalogService())->ensureCurrentTenant(false);
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
            'payments' => [
                'providers' => array_keys((array)$profile['payments']['providers']),
                'methods' => array_keys((array)$profile['payments']['methods']),
                'catalogue' => $paymentCatalog,
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

    private function resolveCountryId(array $profile): ?int
    {
        if (!Schema::hasTable('countries')) return null;

        $query = DB::table('countries');
        $row = $query->where(function ($q) use ($profile) {
            if (Schema::hasColumn('countries', 'iso_code_2')) {
                $q->orWhereRaw('UPPER(iso_code_2) = ?', [strtoupper((string)$profile['country_code'])]);
            }
            if (Schema::hasColumn('countries', 'iso_code_3')) {
                $q->orWhereRaw('UPPER(iso_code_3) = ?', [strtoupper((string)$profile['country_iso3'])]);
            }
            if (Schema::hasColumn('countries', 'country_name')) {
                $q->orWhereRaw('LOWER(country_name) = ?', [strtolower((string)$profile['country_name'])]);
            }
        })->first();

        return $row && isset($row->country_id) ? (int)$row->country_id : null;
    }

    private function currencyExists(string $currencyCode): bool
    {
        if (!Schema::hasTable('currencies') || !Schema::hasColumn('currencies', 'currency_code')) return false;
        $query = DB::table('currencies')->whereRaw('UPPER(currency_code) = ?', [strtoupper($currencyCode)]);
        if (Schema::hasColumn('currencies', 'currency_status')) $query->where('currency_status', 1);
        return $query->exists();
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
            $enabled = $query->pluck('code')->map(static fn ($code) => strtolower((string)$code))->values()->all();
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
        DB::table('locations')->where('location_id', $locationId)->update([
            'location_country_id' => $countryId,
            'updated_at' => now(),
        ]);
    }

    private function saveFrameworkSettings(array $settings, array &$warnings): void
    {
        try {
            setting()->set($settings);
            setting()->save();
        } catch (\Throwable $error) {
            $warnings[] = 'Framework settings manager warning: '.$error->getMessage();
        }

        // Keep the physical table aligned even when the settings manager is stale.
        if (!Schema::hasTable('settings')) return;
        foreach ($settings as $item => $value) {
            $encoded = is_array($value)
                ? json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : (string)$value;
            DB::table('settings')->updateOrInsert(['item' => $item], ['value' => $encoded]);
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
            DB::table('settings')->updateOrInsert(['item' => $item], ['value' => (string)$value]);
        }
    }

    private function disableForeignRegionalPaymentRows(string $countryCode): void
    {
        try {
            $model = new Payments_model();
            $table = $model->getTable();
            $connection = $model->getConnection();
            if (!$connection->getSchemaBuilder()->hasTable($table)) return;

            $foreignCodes = $countryCode === CountryPlatformProfileRegistry::OMAN
                ? ['de_card', 'de_apple_pay', 'de_google_pay', 'de_wero', 'de_paypal', 'de_cash']
                : ['om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay', 'om_cash', 'paymob'];

            $columns = $connection->getSchemaBuilder()->getColumnListing($table);
            if (!in_array('status', $columns, true)) return;
            $connection->table($table)->whereIn('code', $foreignCodes)->update(['status' => 0]);
        } catch (\Throwable $error) {
            Log::warning('PMD_TENANT_PLATFORM_FOREIGN_PAYMENT_DISABLE_WARNING', ['message' => $error->getMessage()]);
        }
    }
}
