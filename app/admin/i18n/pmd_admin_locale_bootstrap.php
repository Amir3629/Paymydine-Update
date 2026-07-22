<?php

declare(strict_types=1);

/*
 * PMD Admin locale bootstrap.
 *
 * Why this file exists:
 * The Blade partial runs while the page is already being rendered. Some
 * controllers prepare translated labels before Blade starts, so changing the
 * locale only inside the layout can be too late. This bootstrap is loaded from
 * app/admin/routes.php and resolves the cookie locale before controllers run.
 *
 * Important lifecycle rule:
 * Do NOT call translator.localization->setLocale() while routes are loading.
 * At that moment TastyIgniter's supported locale list may still be null. The
 * normal localization middleware owns initialization of that service.
 *
 * Current supported admin locales: English (en) and German (de).
 */

if (!function_exists('pmdAdminNormalizeLocale')) {
    function pmdAdminNormalizeLocale(?string $value): string
    {
        $value = strtolower(trim((string)$value));
        $value = str_replace('_', '-', $value);

        if (str_contains($value, '-')) {
            $value = explode('-', $value, 2)[0];
        }

        return $value;
    }
}

if (!function_exists('pmdAdminResolveLocale')) {
    function pmdAdminResolveLocale(?string $requested = null): string
    {
        $allowed = ['en', 'de'];
        $candidate = pmdAdminNormalizeLocale($requested);

        if ($candidate === '') {
            try {
                $candidate = pmdAdminNormalizeLocale(
                    (string)request()->cookie('pmd_admin_locale', '')
                );
            } catch (Throwable $error) {
                $candidate = '';
            }
        }

        if (!in_array($candidate, $allowed, true)) {
            $candidate = pmdAdminNormalizeLocale((string)app()->getLocale());
        }

        return in_array($candidate, $allowed, true)
            ? $candidate
            : 'en';
    }
}

if (!function_exists('pmdAdminApplyLaravelLocale')) {
    function pmdAdminApplyLaravelLocale(?string $requested = null): string
    {
        $locale = pmdAdminResolveLocale($requested);

        // Safe during route loading. TastyIgniter's localization service is
        // deliberately not touched here; its middleware initializes it later.
        app()->setLocale($locale);

        try {
            request()->attributes->set('pmd_admin_locale', $locale);
        } catch (Throwable $error) {
            // Request attributes are optional during very early application boot.
        }

        return $locale;
    }
}

// Apply only Laravel's locale while admin routes are being loaded.
pmdAdminApplyLaravelLocale();

// Re-apply before request dispatch without touching TI's uninitialized service.
if (!defined('PMD_ADMIN_EARLY_LOCALE_HOOK_V2')) {
    define('PMD_ADMIN_EARLY_LOCALE_HOOK_V2', true);

    App::before(function () {
        pmdAdminApplyLaravelLocale();
    });
}

// Own the EN/DE switch endpoint here so the locale architecture is self-contained.
if (!defined('PMD_ADMIN_LANGUAGE_SWITCH_ROUTE_V4')) {
    define('PMD_ADMIN_LANGUAGE_SWITCH_ROUTE_V4', true);

    App::before(function () {
        Route::group([
            'middleware' => ['web'],
            'prefix' => config('system.adminUri', 'admin'),
        ], function () {
            Route::post('_pmd/language-switch-v4', function () {
                $auth = app('admin.auth');

                if (!$auth->isLogged()) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Authentication required.',
                    ], 401);
                }

                $code = pmdAdminNormalizeLocale(
                    (string)request()->input('code', '')
                );

                if (!in_array($code, ['en', 'de'], true)) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Unsupported language.',
                    ], 422);
                }

                $language = \System\Models\Languages_model::query()
                    ->where('code', $code)
                    ->where('status', 1)
                    ->first();

                if (!$language) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Language is not enabled.',
                    ], 404);
                }

                $staff = $auth->staff();

                if ($staff) {
                    $staff->language_id = $language->getKey();
                    $staff->save();
                }

                pmdAdminApplyLaravelLocale($code);

                // This endpoint runs after the normal localization middleware,
                // so the TI localization service is initialized and safe here.
                if (app()->bound('translator.localization')) {
                    try {
                        app('translator.localization')->setLocale($code, true);
                    } catch (Throwable $error) {
                        // Staff preference and cookie remain authoritative next request.
                    }
                }

                $cookie = cookie(
                    'pmd_admin_locale',
                    $code,
                    60 * 24 * 365,
                    '/',
                    null,
                    request()->isSecure(),
                    false,
                    false,
                    'Lax'
                );

                return response()
                    ->json([
                        'ok' => true,
                        'locale' => $code,
                        'name' => $language->name,
                    ])
                    ->withCookie($cookie)
                    ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
            })->name('pmd.language.switch.v4');
        });
    });
}
