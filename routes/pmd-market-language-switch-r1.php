<?php

use App\Services\Platform\CountryPlatformProfileRegistry;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/**
 * PMD_MARKET_LANGUAGE_SWITCH_R2
 *
 * Dedicated market-aware endpoint. It intentionally does NOT reuse the legacy
 * /_pmd/language-switch-v3 URI because older Laravel/TastyIgniter route
 * registration can keep the first route as runtime authority. Market
 * eligibility comes from the persisted country profile; the language row must
 * also be enabled on the tenant DB.
 */
App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::post(
            '_pmd/market-language-switch-r2',
            function () {
                $auth = app('admin.auth');

                if (!$auth->isLogged()) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Authentication required.',
                        'source' => 'market-language-r2',
                    ], 401);
                }

                $normalizeLocales = static function ($value): array {
                    if (is_string($value)) {
                        $decoded = @unserialize($value);
                        if (is_array($decoded)) {
                            $value = $decoded;
                        } else {
                            $json = json_decode($value, true);
                            $value = is_array($json) ? $json : explode(',', $value);
                        }
                    }

                    if (!is_array($value)) {
                        return [];
                    }

                    return array_values(array_unique(array_filter(array_map(
                        static fn ($locale) => strtolower(trim((string)$locale)),
                        $value
                    ))));
                };

                $requested = strtolower(trim((string)request()->input('code', '')));
                $countryCode = strtoupper(trim((string)setting('pmd_market_country_code', 'DE')));
                $profile = (new CountryPlatformProfileRegistry())->profile($countryCode);
                $eligible = $normalizeLocales(
                    (array)($profile['languages']['eligible'] ?? ['en'])
                );

                if (!in_array($requested, $eligible, true)) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Language is not eligible for this market.',
                        'source' => 'market-language-r2',
                        'market' => $countryCode,
                        'eligible' => $eligible,
                    ], 422);
                }

                $db = DB::connection('tenant');
                $tenantDatabase = (string)$db->getDatabaseName();
                $language = $db->table('languages')
                    ->whereRaw('BINARY code = ?', [$requested])
                    ->where('status', 1)
                    ->first();

                if (!$language) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Language is not enabled for this restaurant.',
                        'source' => 'market-language-r2',
                        'market' => $countryCode,
                        'requested_code' => $requested,
                        'tenant_database' => $tenantDatabase,
                    ], 409);
                }

                $localization = app('translator.localization');
                $localeResult = $localization->setLocale($requested, true);

                // PMD_MARKET_LANGUAGE_SWITCH_RUNTIME_REBIND_R3
                // The tenant DB row and market profile are already authoritative
                // above. If Flame still carries an earlier localization config,
                // rebind it from this tenant's own settings and retry the SAME
                // Localization::setLocale validation; never bypass isValid().
                if ($localeResult === false) {
                    $settingSupportedBefore = $normalizeLocales(setting('supported_languages', []));
                    $configSupportedBefore = $normalizeLocales(Config::get('localization.supportedLocales', []));
                    $runtimeSupportedBefore = method_exists($localization, 'supportedLocales')
                        ? $normalizeLocales($localization->supportedLocales())
                        : [];

                    $tenantAuthorizesRequested = in_array($requested, $settingSupportedBefore, true);

                    if ($tenantAuthorizesRequested) {
                        $defaultLocale = strtolower(trim((string)setting(
                            'default_language',
                            Config::get('app.locale', 'en')
                        )));
                        if ($defaultLocale === '') {
                            $defaultLocale = 'en';
                        }

                        $supportedLocales = $settingSupportedBefore;
                        if (!in_array($defaultLocale, $supportedLocales, true)) {
                            array_unshift($supportedLocales, $defaultLocale);
                            $supportedLocales = array_values(array_unique($supportedLocales));
                        }

                        Config::set('localization.locale', $defaultLocale);
                        Config::set('localization.supportedLocales', $supportedLocales);
                        Config::set(
                            'localization.detectBrowserLocale',
                            (bool)setting('detect_language', false)
                        );

                        app()->forgetInstance('translator.localization');
                        $localization = app('translator.localization');
                        $localeResult = $localization->setLocale($requested, true);
                    }

                    if ($localeResult === false) {
                        return response()->json([
                            'ok' => false,
                            'message' => 'Locale rejected by localization config.',
                            'source' => 'market-language-r2-runtime-rebind-r3',
                            'diagnostic' => [
                                'host' => request()->getHost(),
                                'requested_code' => $requested,
                                'market' => $countryCode,
                                'eligible' => $eligible,
                                'tenant_database' => $tenantDatabase,
                                'default_connection' => DB::getDefaultConnection(),
                                'setting_supported_before' => $settingSupportedBefore,
                                'config_supported_before' => $configSupportedBefore,
                                'runtime_supported_before' => $runtimeSupportedBefore,
                                'setting_supported_after' => $normalizeLocales(setting('supported_languages', [])),
                                'config_supported_after' => $normalizeLocales(Config::get('localization.supportedLocales', [])),
                                'runtime_supported_after' => method_exists($localization, 'supportedLocales')
                                    ? $normalizeLocales($localization->supportedLocales())
                                    : [],
                                'tenant_authorizes_requested' => $tenantAuthorizesRequested,
                            ],
                        ], 409);
                    }
                }

                $staff = $auth->staff();
                if ($staff) {
                    if (method_exists($staff, 'setConnection')) $staff->setConnection('tenant');
                    $staff->language_id = (int)$language->language_id;
                    $staff->save();
                }

                app()->setLocale($requested);

                return response()->json([
                    'ok' => true,
                    'locale' => $requested,
                    'name' => $language->name,
                    'market' => $countryCode,
                    'source' => 'market-language-r2-runtime-rebind-r3',
                ])->withCookie(cookie(
                    'pmd_admin_locale',
                    $requested,
                    60 * 24 * 365,
                    '/',
                    null,
                    request()->isSecure(),
                    false,
                    false,
                    'Lax'
                ));
            }
        )->name('pmd.language.switch.market.r2');
    });
});
