<?php

use App\Services\Platform\CountryPlatformProfileRegistry;
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

                $requested = strtolower(trim((string)request()->input('code', '')));
                $countryCode = strtoupper(trim((string)setting('pmd_market_country_code', 'DE')));
                $profile = (new CountryPlatformProfileRegistry())->profile($countryCode);
                $eligible = array_values(array_unique(array_filter(array_map(
                    static fn ($code) => strtolower(trim((string)$code)),
                    (array)($profile['languages']['eligible'] ?? ['en'])
                ))));

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
                    ], 409);
                }

                $localization = app('translator.localization');
                if ($localization->setLocale($requested, true) === false) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Locale rejected by localization config.',
                        'source' => 'market-language-r2',
                    ], 409);
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
                    'source' => 'market-language-r2',
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
