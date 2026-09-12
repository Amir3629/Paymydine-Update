<?php

/*
|--------------------------------------------------------------------------
| PMD_FRONTEND_V2_BOOTSTRAP_FAST_R1
|--------------------------------------------------------------------------
| Read-only fast path for Frontend V2. It keeps the existing public endpoint
| contracts intact and adds two new endpoints:
|   GET /api/v1/frontend-theme-v2-fast-r1
|   GET /api/v1/frontend-bootstrap-batch-r1
|
| The batch endpoint executes the existing read routes inside the already-
| booted Laravel request, so one page render does not need a separate PHP-FPM
| bootstrap for every stable tenant-wide read. No TTL/stale cache is used.
|--------------------------------------------------------------------------
*/

if (!defined('PMD_FRONTEND_V2_BOOTSTRAP_FAST_R1')) {
    define('PMD_FRONTEND_V2_BOOTSTRAP_FAST_R1', true);

    if (!function_exists('pmd_v2_fast_theme_payload_r1')) {
        function pmd_v2_fast_theme_payload_r1(): array
        {
            $decode = static function ($raw): array {
                if (is_array($raw)) return $raw;
                if (is_object($raw)) return json_decode(json_encode($raw), true) ?: [];
                if (!is_string($raw) || trim($raw) === '') return [];

                $json = json_decode($raw, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json;

                $unserialized = @unserialize($raw);
                if ($unserialized !== false || $raw === 'b:0;') {
                    return json_decode(json_encode($unserialized), true) ?: [];
                }

                return [];
            };

            $data = [];
            $latestUpdatedAt = null;

            foreach (['themes', 'ti_themes'] as $table) {
                try {
                    if (!\Illuminate\Support\Facades\Schema::hasTable($table)) continue;

                    $query = \Illuminate\Support\Facades\DB::table($table)
                        ->where(function ($q) {
                            $q->where('code', 'frontend-theme')
                                ->orWhere('code', 'paymydine-nextjs')
                                ->orWhere('name', 'like', '%Menu Theme%');
                        });

                    try {
                        $query = $query->orderBy('updated_at');
                    } catch (\Throwable $ignored) {}

                    foreach ($query->get() as $row) {
                        foreach (['data', 'settings', 'config', 'value'] as $column) {
                            if (isset($row->{$column}) && $row->{$column} !== '') {
                                $decoded = $decode($row->{$column});
                                if ($decoded) $data = array_replace_recursive($data, $decoded);
                            }
                        }

                        if (isset($row->updated_at) && $row->updated_at) {
                            $candidate = (string)$row->updated_at;
                            if (!$latestUpdatedAt || strcmp($candidate, $latestUpdatedAt) > 0) {
                                $latestUpdatedAt = $candidate;
                            }
                        }
                    }
                } catch (\Throwable $ignored) {
                    // Compatibility fallback is intentionally tolerant.
                }
            }

            // The old endpoint queried `settings` once per key. Load the same keys
            // in one DB query, then preserve the exact setting-first precedence.
            $settingKeys = [
                'pmd_v2_theme_id', 'theme_configuration', 'frontend_theme',
                'pmd_v2_enabled_languages', 'enabled_languages', 'default_language',
                'pmd_v2_waiter_call_enabled', 'waiter_call_enabled', 'pmd_waiter_call_enabled',
                'pmd_v2_valet_enabled', 'valet_enabled', 'pmd_valet_enabled',
                'pmd_v2_table_order_enabled', 'table_order_enabled', 'guest_order',
                'pmd_v2_split_bill_enabled', 'split_bill_enabled', 'pmd_split_bill_enabled',
                'pmd_v2_tips_enabled', 'tips_enabled', 'tip_enabled',
                'pmd_v2_coupons_enabled', 'coupons_enabled', 'coupon_enabled',
                'pmd_v2_social_enabled', 'pmd_homepage_social_icons_enabled', 'pmd_kazen_social_enabled',
            ];

            $settings = [];
            try {
                $rows = \Illuminate\Support\Facades\DB::table('settings')
                    ->whereIn('item', $settingKeys)
                    ->get(['item', 'value']);

                foreach ($rows as $row) {
                    $key = (string)($row->item ?? '');
                    if ($key !== '' && !array_key_exists($key, $settings)) {
                        $settings[$key] = $row->value ?? null;
                    }
                }
            } catch (\Throwable $ignored) {}

            $setting = static function ($key, $fallback = '') use ($settings) {
                if (array_key_exists($key, $settings) && $settings[$key] !== null) {
                    return $settings[$key];
                }
                return $fallback;
            };

            $selectedRaw =
                $setting('pmd_v2_theme_id', null)
                ?? $setting('theme_configuration', null)
                ?? $setting('frontend_theme', null)
                ?? ($data['pmd_v2_theme_id'] ?? null)
                ?? ($data['theme_configuration'] ?? null)
                ?? ($data['theme_id'] ?? null)
                ?? ($data['frontend_theme'] ?? null)
                ?? 'kazen_japanese';

            $normalizeKey = static function ($value): string {
                $raw = strtolower(trim((string)($value ?? '')));
                return (string)preg_replace('/[\s-]+/', '_', $raw);
            };

            $map = [
                'noir_editorial' => 'noir_editorial',
                'modern_dark' => 'noir_editorial',
                'black_luxury' => 'noir_editorial',
                'verdant_modern' => 'verdant_modern',
                'modern_green' => 'verdant_modern',
                'green' => 'verdant_modern',
                'lumiere_fine_dining' => 'lumiere_fine_dining',
                'gold_luxury' => 'lumiere_fine_dining',
                'gold' => 'lumiere_fine_dining',
                'organic_botanical_paper' => 'lumiere_fine_dining',
                'organic' => 'lumiere_fine_dining',
                'kazen_japanese' => 'kazen_japanese',
                'kazen' => 'kazen_japanese',
                'japanese' => 'kazen_japanese',
                'azzurra_coastal' => 'azzurra_coastal',
                'coastal' => 'azzurra_coastal',
                'mediterranean' => 'azzurra_coastal',
                'seafood' => 'azzurra_coastal',
                'neon_cocktail_bar' => 'neon_cocktail_bar',
                'vibrant_colors' => 'neon_cocktail_bar',
                'cyber_futuristic' => 'neon_cocktail_bar',
                'bar' => 'neon_cocktail_bar',
                'art_deco_speakeasy' => 'art_deco_speakeasy',
                'art_deco' => 'art_deco_speakeasy',
                'speakeasy' => 'art_deco_speakeasy',
                'gatsby' => 'art_deco_speakeasy',
                'shahrazad_persian' => 'shahrazad_persian',
                'persian' => 'shahrazad_persian',
                'persian_luxury' => 'shahrazad_persian',
                'anatolia_turkish' => 'anatolia_turkish',
                'velvet_terracotta' => 'anatolia_turkish',
                'velvet' => 'anatolia_turkish',
                'turkish' => 'anatolia_turkish',
                'ember_steakhouse' => 'ember_steakhouse',
                'steakhouse' => 'ember_steakhouse',
                'charcoal' => 'ember_steakhouse',
                'grill_house' => 'ember_steakhouse',
            ];

            $selectedKey = $normalizeKey($selectedRaw);
            $canonicalTheme = $map[$selectedKey] ?? 'verdant_modern';

            $pick = static function (array $keys, $fallback = '') use ($data, $setting) {
                foreach ($keys as $key) {
                    $value = $setting($key, null);
                    if ($value !== null && $value !== '') return $value;
                }
                foreach ($keys as $key) {
                    if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
                        return $data[$key];
                    }
                }
                return $fallback;
            };

            $enabledLanguages = (string)$pick(
                ['pmd_v2_enabled_languages', 'enabled_languages'],
                (string)$setting('default_language', 'en').',en,de'
            );

            $v2 = [
                'theme_configuration' => $canonicalTheme,
                'theme_id' => $canonicalTheme,
                'frontend_theme' => $canonicalTheme,
                'pmd_v2_theme_id' => $canonicalTheme,
                'pmd_admin_selected_theme' => $selectedRaw,
                'pmd_v2_enabled_languages' => $enabledLanguages,
                'pmd_v2_waiter_call_enabled' => $pick(['pmd_v2_waiter_call_enabled', 'waiter_call_enabled', 'pmd_waiter_call_enabled'], '1'),
                'pmd_v2_valet_enabled' => $pick(['pmd_v2_valet_enabled', 'valet_enabled', 'pmd_valet_enabled'], '0'),
                'pmd_v2_table_order_enabled' => $pick(['pmd_v2_table_order_enabled', 'table_order_enabled', 'guest_order'], '1'),
                'pmd_v2_split_bill_enabled' => $pick(['pmd_v2_split_bill_enabled', 'split_bill_enabled', 'pmd_split_bill_enabled'], '1'),
                'pmd_v2_tips_enabled' => $pick(['pmd_v2_tips_enabled', 'tips_enabled', 'tip_enabled'], '1'),
                'pmd_v2_coupons_enabled' => $pick(['pmd_v2_coupons_enabled', 'coupons_enabled', 'coupon_enabled'], '1'),
                'pmd_v2_social_enabled' => $pick(['pmd_v2_social_enabled', 'pmd_homepage_social_icons_enabled', 'pmd_kazen_social_enabled'], '1'),
            ];

            $payloadData = array_replace($data, $v2);
            $themeVersion = substr(sha1(json_encode([
                $canonicalTheme,
                $latestUpdatedAt,
                $payloadData,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)), 0, 16);

            return [
                'success' => true,
                'api_version' => 'pmd-frontend-theme-v2',
                'theme_id' => $canonicalTheme,
                'frontend_theme' => $canonicalTheme,
                'theme_configuration' => $canonicalTheme,
                'admin_theme' => $selectedRaw,
                'pmd_admin_selected_theme' => $selectedRaw,
                'theme_version' => $themeVersion,
                'data' => array_replace($payloadData, ['theme_version' => $themeVersion]),
            ];
        }
    }

    \Illuminate\Support\Facades\Route::get('/api/v1/frontend-theme-v2-fast-r1', function () {
        return response()->json(pmd_v2_fast_theme_payload_r1(), 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    });

    \Illuminate\Support\Facades\Route::get('/api/v1/frontend-bootstrap-batch-r1', function (\Illuminate\Http\Request $outerRequest) {
        $router = app('router');
        $container = app();
        $host = $outerRequest->getHost();

        $readRoute = static function (string $path) use ($outerRequest, $router, $container, $host): array {
            $server = [
                'HTTP_HOST' => $host,
                'SERVER_NAME' => $host,
                'SERVER_PORT' => 443,
                'HTTPS' => 'on',
                'REMOTE_ADDR' => (string)($outerRequest->ip() ?: '127.0.0.1'),
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_X_FORWARDED_HOST' => $host,
                'HTTP_X_ORIGINAL_HOST' => $host,
                'HTTP_X_PMD_TENANT_HOST' => $host,
            ];

            $subRequest = \Illuminate\Http\Request::create($path, 'GET', [], [], [], $server);
            $subRequest->headers->set('Host', $host);
            $subRequest->headers->set('X-Forwarded-Host', $host);
            $subRequest->headers->set('X-Original-Host', $host);
            $subRequest->headers->set('X-PMD-Tenant-Host', $host);
            $subRequest->headers->set('Accept', 'application/json');

            $previousRequest = $container->bound('request') ? $container->make('request') : null;

            try {
                $container->instance('request', $subRequest);
                $route = $router->getRoutes()->match($subRequest);
                $subRequest->setRouteResolver(static fn () => $route);
                $response = $route->run();
                $status = method_exists($response, 'getStatusCode') ? (int)$response->getStatusCode() : 200;
                $content = method_exists($response, 'getContent') ? (string)$response->getContent() : '';
                $decoded = $content !== '' ? json_decode($content, true) : null;

                return [
                    'status' => $status,
                    'body' => $status >= 200 && $status < 300 && is_array($decoded) ? $decoded : null,
                ];
            } catch (\Throwable $error) {
                return [
                    'status' => 500,
                    'body' => null,
                    'error' => get_class($error),
                ];
            } finally {
                if ($previousRequest) $container->instance('request', $previousRequest);
                else $container->instance('request', $outerRequest);
            }
        };

        $targets = [
            'settings' => '/api/v1/settings',
            'restaurant' => '/api/v1/restaurant',
            'menu' => '/api/v1/menu',
            'categories' => '/api/v1/categories',
            'menuTranslations' => '/api/v1/menu-content-translations',
            'payments' => '/api/v1/payments',
            'vatSettings' => '/api/v1/vat-settings',
            'tipSettings' => '/api/v1/tip-settings',
        ];

        $data = [];
        $status = [];

        foreach ($targets as $key => $path) {
            $result = $readRoute($path);
            $status[$key] = (int)($result['status'] ?? 500);
            $data[$key] = $result['body'] ?? null;
        }

        try {
            $data['theme'] = pmd_v2_fast_theme_payload_r1();
            $status['theme'] = 200;
        } catch (\Throwable $error) {
            $data['theme'] = null;
            $status['theme'] = 500;
        }

        return response()->json([
            'success' => true,
            'api_version' => 'pmd-frontend-bootstrap-batch-r1',
            'data' => $data,
            'status' => $status,
        ], 200, [
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    });
}
