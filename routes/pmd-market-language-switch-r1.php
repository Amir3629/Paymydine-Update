<?php

use App\Services\Platform\CountryPlatformProfileRegistry;
use Igniter\Flame\Setting\DatabaseSettingStore;
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

                $readSupportedDirect = static function ($db) use ($normalizeLocales): array {
                    $columns = $db->getSchemaBuilder()->getColumnListing('settings');
                    if (!in_array('item', $columns, true) || !in_array('value', $columns, true)) {
                        return [];
                    }

                    $query = $db->table('settings');
                    if (in_array('sort', $columns, true)) {
                        $query->where('sort', 'config');
                    }

                    $rows = $query
                        ->where(function ($inner) {
                            $inner->where('item', 'supported_languages')
                                ->orWhere('item', 'like', 'supported_languages.%');
                        })
                        ->orderBy('item')
                        ->get(['item', 'value']);

                    $resolved = [];
                    foreach ($rows as $row) {
                        $item = (string)($row->item ?? '');
                        $value = $row->value ?? null;

                        if ($item === 'supported_languages') {
                            $resolved = $normalizeLocales($value);
                            continue;
                        }

                        if (preg_match('/^supported_languages\.(\d+)$/', $item, $matches)) {
                            $index = (int)$matches[1];
                            $locale = strtolower(trim((string)$value));
                            if ($locale !== '') {
                                $resolved[$index] = $locale;
                            }
                        }
                    }

                    if (!$resolved) {
                        return [];
                    }

                    ksort($resolved);

                    return $normalizeLocales(array_values($resolved));
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
                $runtimeRepairUsed = false;

                // PMD_MARKET_LANGUAGE_SWITCH_HTTP_CACHE_REBIND_R4
                // If the request's tenant setting store is stale but the current
                // tenant DB directly authorizes the requested locale, invalidate
                // only this tenant's exact setting cache key inside the SAME HTTP
                // runtime namespace, bind a fresh DatabaseSettingStore, and retry
                // the normal Localization::setLocale validation. Never bypass it.
                if ($localeResult === false) {
                    $settingSupportedBefore = $normalizeLocales(setting('supported_languages', []));
                    $configSupportedBefore = $normalizeLocales(Config::get('localization.supportedLocales', []));
                    $runtimeSupportedBefore = method_exists($localization, 'supportedLocales')
                        ? $normalizeLocales($localization->supportedLocales())
                        : [];

                    $tenantAuthorizesRequested = in_array($requested, $settingSupportedBefore, true);
                    $dbSupportedDirect = [];
                    $dbAuthorizesRequested = false;
                    $httpCacheRefreshAttempted = false;
                    $httpCacheRefreshSupported = [];
                    $cacheKey = 'igniter.setting.system.tenant.'.sha1(strtolower(trim($tenantDatabase)));

                    if (!$tenantAuthorizesRequested) {
                        $dbSupportedDirect = $readSupportedDirect($db);
                        $dbAuthorizesRequested = in_array($requested, $dbSupportedDirect, true);

                        if ($dbAuthorizesRequested) {
                            $httpCacheRefreshAttempted = true;
                            $cache = app('cache.store');
                            $cache->forget($cacheKey);

                            foreach (['system.setting', 'system.parameter', 'setting.manager'] as $abstract) {
                                app()->forgetInstance($abstract);
                            }

                            $freshStore = new DatabaseSettingStore(app('db'), $cache);
                            $freshStore->setCacheKey($cacheKey);
                            $freshStore->setExtraColumns(['sort' => 'config']);
                            app()->instance('system.setting', $freshStore);

                            $httpCacheRefreshSupported = $normalizeLocales(
                                $freshStore->get('supported_languages', [])
                            );
                            $tenantAuthorizesRequested = in_array(
                                $requested,
                                $httpCacheRefreshSupported,
                                true
                            );

                            if ($tenantAuthorizesRequested) {
                                $settingSupportedBefore = $httpCacheRefreshSupported;
                                $runtimeRepairUsed = true;
                            }
                        }
                    }

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
                        $cacheStore = app('cache.store');

                        return response()->json([
                            'ok' => false,
                            'message' => 'Locale rejected by localization config.',
                            'source' => 'market-language-r2-http-cache-rebind-r4',
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
                                'db_supported_direct' => $dbSupportedDirect,
                                'db_authorizes_requested' => $dbAuthorizesRequested,
                                'http_cache_refresh_attempted' => $httpCacheRefreshAttempted,
                                'http_cache_refresh_supported' => $httpCacheRefreshSupported,
                                'setting_supported_after' => $normalizeLocales(setting('supported_languages', [])),
                                'config_supported_after' => $normalizeLocales(Config::get('localization.supportedLocales', [])),
                                'runtime_supported_after' => method_exists($localization, 'supportedLocales')
                                    ? $normalizeLocales($localization->supportedLocales())
                                    : [],
                                'tenant_authorizes_requested' => $tenantAuthorizesRequested,
                                'cache_key' => $cacheKey,
                                'cache_driver' => Config::get('cache.default'),
                                'cache_store_class' => get_class($cacheStore->getStore()),
                                'cache_file_path' => Config::get('cache.stores.file.path'),
                                'cache_prefix' => Config::get('cache.prefix'),
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
                    'runtime_repair_used' => $runtimeRepairUsed,
                    'source' => 'market-language-r2-http-cache-rebind-r4',
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
