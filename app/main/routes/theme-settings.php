<?php

        // Theme settings JSON for Next.js (serve from 8000)
        Route::get('/simple-theme', function () {
            // PMD_KAZEN_SIMPLE_THEME_LAYOUT_V5
            $pmdKazenNormalizeMenuLayoutV5 = function ($value) {
                $raw = strtolower(trim((string)($value ?? '')));
                $raw = preg_replace('/[_\\s-]+/', '-', $raw);

                if (in_array($raw, [
                    'tabs',
                    'tab',
                    'tabbed',
                    'classic',
                    'normal',
                    'list',
                    'flat',
                    'category-tabs',
                    'categories-top',
                    'top-categories',
                    'category-tabs-full-item-list',
                ], true)) {
                    return 'tabs';
                }

                if (in_array($raw, [
                    'accordion',
                    'accordions',
                    'collapsed',
                    'expandable',
                    'category-accordion',
                ], true)) {
                    return 'accordion';
                }

                return null;
            };

            $tables = [
                // Prefer new code
                ['name' => 'themes', 'code' => 'frontend-theme'],
                ['name' => 'ti_themes', 'code' => 'frontend-theme'],
                // Legacy fallback
                ['name' => 'themes', 'code' => 'paymydine-nextjs'],
                ['name' => 'ti_themes', 'code' => 'paymydine-nextjs'],
            ];
            $row = null;
            foreach ($tables as $t) {
                try {
                    $candidate = DB::table($t['name'])->where('code', $t['code'])->select('data')->first();
                    if ($candidate && !empty($candidate->data)) { $row = $candidate; break; }
                } catch (Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]); /* table may not exist, keep trying */ }
            }

            if ($row && !empty($row->data)) {
                $data = json_decode($row->data, true) ?: [];
                $pmdKazenMenuLayoutV5 = $pmdKazenNormalizeMenuLayoutV5($data['kazen_menu_layout'] ?? $data['menuLayout'] ?? $data['food_display_style'] ?? null) ?: 'accordion';

                // PMD_KAZEN_HEADER_LINKS_SIMPLE_THEME_V1
                $pmdKazenBoolV1 = function ($value) {
                    if (is_bool($value)) return $value;
                    $raw = strtolower(trim((string)($value ?? '')));
                    return in_array($raw, ['1', 'true', 'yes', 'on', 'enabled'], true);
                };

                $pmdKazenUrlV1 = function ($value) {
                    $url = trim((string)($value ?? ''));
                    if ($url === '') return '';
                    if (!preg_match('#^https?://#i', $url)) {
                        $url = 'https://' . ltrim($url, '/');
                    }

                    // PMD_KAZEN_HEADER_LINKS_REJECT_ADMIN_URLS_V2
                    // Never expose admin/settings URLs as customer-facing social links.
                    $path = parse_url($url, PHP_URL_PATH) ?: '';
                    if (preg_match('#/(admin|app/admin)(/|$)#i', $path)) return '';
                    if (stripos($url, 'settings/edit/review_social') !== false) return '';

                    return $url;
                };

                $pmdKazenSettingV1 = function ($key, $fallback = '') use ($data) {
                    // PMD_KAZEN_SETTING_FIRST_FINAL_V13
                    // For Kazen header links, read settings fallback FIRST.
                    // This fixes cases where theme data contains stale disabled values.
                    if (in_array($key, [
                        'pmd_kazen_website_enabled',
                        'pmd_kazen_website_url',
                        'pmd_kazen_social_enabled',
                        'pmd_kazen_social_platform',
                        'pmd_kazen_social_url',
                    ], true)) {
                        try {
                            $value = \Illuminate\Support\Facades\DB::table('settings')->where('item', $key)->value('value');
                            if ($value !== null && trim((string)$value) !== '') return $value;
                        } catch (\Throwable $e) {}
                    }

                    if (is_array($data) && array_key_exists($key, $data)) {
                        return $data[$key];
                    }

                    try {
                        $value = \Illuminate\Support\Facades\DB::table('settings')->where('item', $key)->value('value');
                        if ($value !== null) return $value;
                    } catch (\Throwable $e) {}

                    return $fallback;
                };

                $pmdKazenPickSocialV1 = function () use ($pmdKazenSettingV1, $pmdKazenBoolV1, $pmdKazenUrlV1) {
                    foreach ([
                        ['instagram', 'pmd_social_instagram_enabled', 'pmd_social_instagram_url'],
                        ['facebook', 'pmd_social_facebook_enabled', 'pmd_social_facebook_url'],
                        ['trustpilot', 'pmd_social_trustpilot_enabled', 'pmd_social_trustpilot_url'],
                        ['reviews', 'pmd_social_reviews_enabled', 'pmd_social_reviews_url'],
                    ] as $candidate) {
                        [$platform, $enabledKey, $urlKey] = $candidate;
                        $url = $pmdKazenUrlV1($pmdKazenSettingV1($urlKey, ''));
                        if ($url !== '' && $pmdKazenBoolV1($pmdKazenSettingV1($enabledKey, '0'))) {
                            return [$platform, $url];
                        }
                    }

                    return ['instagram', ''];
                };

                [$pmdKazenLegacySocialPlatformV1, $pmdKazenLegacySocialUrlV1] = $pmdKazenPickSocialV1();

                $pmdKazenWebsiteUrlV1 = $pmdKazenUrlV1($pmdKazenSettingV1('pmd_kazen_website_url', ''));
                $pmdKazenWebsiteEnabledV1 = $pmdKazenBoolV1($pmdKazenSettingV1('pmd_kazen_website_enabled', $pmdKazenWebsiteUrlV1 !== '' ? '1' : '0')) && $pmdKazenWebsiteUrlV1 !== '';

                $pmdKazenSocialPlatformV1 = strtolower(trim((string)$pmdKazenSettingV1('pmd_kazen_social_platform', $pmdKazenLegacySocialPlatformV1 ?: 'instagram')));
                if (!in_array($pmdKazenSocialPlatformV1, ['instagram', 'facebook', 'trustpilot', 'reviews', 'website'], true)) {
                    $pmdKazenSocialPlatformV1 = 'instagram';
                }

                $pmdKazenSocialUrlV1 = $pmdKazenUrlV1($pmdKazenSettingV1('pmd_kazen_social_url', $pmdKazenLegacySocialUrlV1));
                $pmdKazenSocialEnabledV1 = $pmdKazenBoolV1($pmdKazenSettingV1('pmd_kazen_social_enabled', $pmdKazenSocialUrlV1 !== '' ? '1' : '0')) && $pmdKazenSocialUrlV1 !== '';

                $pmdKazenHeaderLinksV1 = [
                    'website' => [
                        'enabled' => $pmdKazenWebsiteEnabledV1,
                        'url' => $pmdKazenWebsiteUrlV1,
                    ],
                    'social' => [
                        'enabled' => $pmdKazenSocialEnabledV1,
                        'platform' => $pmdKazenSocialPlatformV1,
                        'url' => $pmdKazenSocialUrlV1,
                    ],
                ];
                $adminTheme = $data['theme_configuration'] ?? 'gold_luxury';
                $map = [
                    'gold_luxury' => 'gold-luxury',
                    'gold' => 'gold-luxury',
                    'organic_botanical_paper' => 'organic_botanical_paper',
                    'modern_green' => 'modern_green',
                    'light' => 'gold-luxury',
                    'dark' => 'gold-luxury',
                    'colorful' => 'gold-luxury',
                    'minimal' => 'gold-luxury',
                ];
                $frontend = $map[$adminTheme] ?? 'gold-luxury';
                $isOrganic = $frontend === 'organic_botanical_paper';
                $isModernGreen = $frontend === 'modern_green';
                return response()->json([
                    'success' => true,
                    'admin_theme' => $adminTheme,
                    'frontend_theme' => $frontend,
                    'kazen_menu_layout' => $pmdKazenMenuLayoutV5,
                    'menuLayout' => $pmdKazenMenuLayoutV5,
                    'kazen_header_links' => $pmdKazenHeaderLinksV1,
                    'pmd_kazen_website_enabled' => $pmdKazenWebsiteEnabledV1 ? '1' : '0',
                    'pmd_kazen_website_url' => $pmdKazenWebsiteUrlV1,
                    'pmd_kazen_social_enabled' => $pmdKazenSocialEnabledV1 ? '1' : '0',
                    'pmd_kazen_social_platform' => $pmdKazenSocialPlatformV1,
                    'pmd_kazen_social_url' => $pmdKazenSocialUrlV1,
                    'data' => [
                        'kazen_menu_layout' => $pmdKazenMenuLayoutV5,
                        'menuLayout' => $pmdKazenMenuLayoutV5,
                        'kazen_header_links' => $pmdKazenHeaderLinksV1,
                        'pmd_kazen_website_enabled' => $pmdKazenWebsiteEnabledV1 ? '1' : '0',
                        'pmd_kazen_website_url' => $pmdKazenWebsiteUrlV1,
                        'pmd_kazen_social_enabled' => $pmdKazenSocialEnabledV1 ? '1' : '0',
                        'pmd_kazen_social_platform' => $pmdKazenSocialPlatformV1,
                        'pmd_kazen_social_url' => $pmdKazenSocialUrlV1,
                        'theme_id' => 'kazen_japanese',
                        'primary_color' => $isModernGreen ? '#29BC7E' : ($isOrganic ? ($data['primary_color'] ?? '#737A55') : '#062F2A'),
                        'secondary_color' => $isModernGreen ? '#07110D' : ($isOrganic ? '#FFF9EF' : '#062F2A'),
                        'accent_color' => $isModernGreen ? '#29BC7E' : ($isOrganic ? ($data['accent_color'] ?? '#B8864B') : '#C89B4A'),
                        'background_color' => $isModernGreen ? '#030504' : ($isOrganic ? '#F3EBDD' : '#FAF9F4'),
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'admin_theme' => 'NOT_FOUND',
                'frontend_theme' => 'kazen_japanese',
                'kazen_menu_layout' => 'accordion',
                'menuLayout' => 'accordion',
                'data' => [
                    'kazen_menu_layout' => 'accordion',
                    'menuLayout' => 'accordion',
                    'theme_id' => 'gold-luxury',
                    'primary_color' => '#062F2A',
                    'secondary_color' => '#062F2A',
                    'accent_color' => '#C89B4A',
                    'background_color' => '#FAF9F4',
                ],
            ]);
        });

        // VAT settings JSON for Next.js (serve from 8000) - same pattern as /simple-theme
        Route::get('/vat-settings', function () {
            try {
                $settings = DB::table('settings')->get()->keyBy('item');

                return response()->json([
                    'success' => true,
                    'data' => [
                        'vat_mode' => $settings['tax_mode']->value ?? '0',
                        'vat_percentage' => $settings['tax_percentage']->value ?? '0',
                        'vat_menu_price' => $settings['tax_menu_price']->value ?? '1',
                        'tax_mode' => $settings['tax_mode']->value ?? '0', // Legacy compatibility
                        'tax_percentage' => $settings['tax_percentage']->value ?? '0', // Legacy compatibility
                        'tax_menu_price' => $settings['tax_menu_price']->value ?? '1', // Legacy compatibility
                    ],
                ]);
            } catch (Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                return response()->json([
                    'success' => true,
                    'data' => [
                        'vat_mode' => '0',
                        'vat_percentage' => '0',
                        'vat_menu_price' => '1',
                        'tax_mode' => '0', // Legacy compatibility
                        'tax_percentage' => '0', // Legacy compatibility
                        'tax_menu_price' => '1', // Legacy compatibility
                    ],
                ]);
            }
        });


// PMD_KAZEN_PUBLIC_MENU_LAYOUT_V3
// Public, read-only helper for the Next.js Kazen customer frontend.
// It exposes only the frontend-theme food display setting, not private admin data.
if (!defined('PMD_KAZEN_PUBLIC_MENU_LAYOUT_V3')) {
    define('PMD_KAZEN_PUBLIC_MENU_LAYOUT_V3', true);

    \Route::get('/pmd-kazen-menu-layout', function () {
        $normalize = function ($value) {
            $raw = strtolower(trim((string)($value ?? '')));
            $raw = preg_replace('/[_\s-]+/', '-', $raw);

            if (in_array($raw, [
                'tabs',
                'tab',
                'tabbed',
                'classic',
                'normal',
                'list',
                'flat',
                'category-tabs',
                'categories-top',
                'top-categories',
                'category-tabs-full-item-list',
            ], true)) {
                return 'tabs';
            }

            if (in_array($raw, [
                'accordion',
                'accordions',
                'collapsed',
                'expandable',
                'category-accordion',
            ], true)) {
                return 'accordion';
            }

            return null;
        };

        $decode = function ($raw) {
            if (is_array($raw) || is_object($raw)) {
                return json_decode(json_encode($raw), true);
            }

            if (!is_string($raw) || trim($raw) === '') {
                return null;
            }

            $json = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $json;
            }

            $unserialized = @unserialize($raw);
            if ($unserialized !== false || $raw === 'b:0;') {
                return json_decode(json_encode($unserialized), true);
            }

            return $raw;
        };

        $scan = function ($value) use (&$scan, $normalize) {
            $directKeys = [
                'kazen_menu_layout',
                'kazenMenuLayout',
                'menu_layout',
                'menuLayout',
                'food_display_style',
                'foodDisplayStyle',
                'category_display',
                'categoryDisplay',
            ];

            if (is_string($value) || is_numeric($value)) {
                return $normalize($value);
            }

            if (is_object($value)) {
                $value = json_decode(json_encode($value), true);
            }

            if (!is_array($value)) {
                return null;
            }

            foreach ($directKeys as $key) {
                if (array_key_exists($key, $value)) {
                    $found = $normalize($value[$key]);
                    if ($found) {
                        return $found;
                    }
                }
            }

            foreach ($value as $child) {
                $found = $scan($child);
                if ($found) {
                    return $found;
                }
            }

            return null;
        };

        $debug = [];
        $tables = ['themes', 'ti_themes'];

        foreach ($tables as $table) {
            try {
                if (!\Illuminate\Support\Facades\Schema::hasTable($table)) {
                    $debug[] = ['table' => $table, 'status' => 'missing'];
                    continue;
                }

                $columns = \Illuminate\Support\Facades\Schema::getColumnListing($table);
                if (!in_array('code', $columns, true)) {
                    $debug[] = ['table' => $table, 'status' => 'no_code_column'];
                    continue;
                }

                $row = \Illuminate\Support\Facades\DB::table($table)
                    ->where('code', 'frontend-theme')
                    ->first();

                if (!$row) {
                    $debug[] = ['table' => $table, 'status' => 'no_frontend_theme_row'];
                    continue;
                }

                $rowArray = json_decode(json_encode($row), true);
                $debug[] = [
                    'table' => $table,
                    'status' => 'row_found',
                    'columns' => array_values(array_intersect(array_keys($rowArray), ['code', 'name', 'data', 'settings', 'config', 'value'])),
                ];

                foreach ($rowArray as $column => $rawValue) {
                    $decoded = $decode($rawValue);
                    $found = $scan($decoded);

                    if ($found) {
                        return response()->json([
                            'success' => true,
                            'kazen_menu_layout' => $found,
                            'menuLayout' => $found,
                            'source' => $table . '.' . $column,
                            'debug' => $debug,
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                $debug[] = [
                    'table' => $table,
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'kazen_menu_layout' => 'accordion',
            'menuLayout' => 'accordion',
            'source' => 'default',
            'debug' => $debug,
        ]);
    })->name('pmd.kazen.menu.layout');
}


// PMD_KAZEN_ADMIN_MENU_LAYOUT_V4
// Public read-only helper under /admin because the root domain is proxied to Next.
// It returns only the Kazen food display style.
if (!defined('PMD_KAZEN_ADMIN_MENU_LAYOUT_V4')) {
    define('PMD_KAZEN_ADMIN_MENU_LAYOUT_V4', true);

    $pmdKazenMenuLayoutResponderV4 = function () {
        $normalize = function ($value) {
            $raw = strtolower(trim((string)($value ?? '')));
            $raw = preg_replace('/[_\s-]+/', '-', $raw);

            if (in_array($raw, [
                'tabs',
                'tab',
                'tabbed',
                'classic',
                'normal',
                'list',
                'flat',
                'category-tabs',
                'categories-top',
                'top-categories',
                'category-tabs-full-item-list',
            ], true)) {
                return 'tabs';
            }

            if (in_array($raw, [
                'accordion',
                'accordions',
                'collapsed',
                'expandable',
                'category-accordion',
            ], true)) {
                return 'accordion';
            }

            return null;
        };

        $decode = function ($raw) {
            if (is_array($raw) || is_object($raw)) {
                return json_decode(json_encode($raw), true);
            }

            if (!is_string($raw) || trim($raw) === '') {
                return null;
            }

            $json = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $json;
            }

            $unserialized = @unserialize($raw);
            if ($unserialized !== false || $raw === 'b:0;') {
                return json_decode(json_encode($unserialized), true);
            }

            return $raw;
        };

        $scan = function ($value) use (&$scan, $normalize) {
            $directKeys = [
                'kazen_menu_layout',
                'kazenMenuLayout',
                'menu_layout',
                'menuLayout',
                'food_display_style',
                'foodDisplayStyle',
                'category_display',
                'categoryDisplay',
            ];

            if (is_string($value) || is_numeric($value)) {
                return $normalize($value);
            }

            if (is_object($value)) {
                $value = json_decode(json_encode($value), true);
            }

            if (!is_array($value)) {
                return null;
            }

            foreach ($directKeys as $key) {
                if (array_key_exists($key, $value)) {
                    $found = $normalize($value[$key]);
                    if ($found) {
                        return $found;
                    }
                }
            }

            foreach ($value as $child) {
                $found = $scan($child);
                if ($found) {
                    return $found;
                }
            }

            return null;
        };

        $debug = [];
        $tables = ['themes', 'ti_themes'];

        foreach ($tables as $table) {
            try {
                if (!\Illuminate\Support\Facades\Schema::hasTable($table)) {
                    $debug[] = ['table' => $table, 'status' => 'missing'];
                    continue;
                }

                $columns = \Illuminate\Support\Facades\Schema::getColumnListing($table);
                if (!in_array('code', $columns, true)) {
                    $debug[] = ['table' => $table, 'status' => 'no_code_column'];
                    continue;
                }

                $row = \Illuminate\Support\Facades\DB::table($table)
                    ->where('code', 'frontend-theme')
                    ->first();

                if (!$row) {
                    $debug[] = ['table' => $table, 'status' => 'no_frontend_theme_row'];
                    continue;
                }

                $rowArray = json_decode(json_encode($row), true);
                $debug[] = [
                    'table' => $table,
                    'status' => 'row_found',
                    'columns' => array_values(array_intersect(array_keys($rowArray), ['code', 'name', 'data', 'settings', 'config', 'value'])),
                ];

                foreach ($rowArray as $column => $rawValue) {
                    $decoded = $decode($rawValue);
                    $found = $scan($decoded);

                    if ($found) {
                        return response()->json([
                            'success' => true,
                            'kazen_menu_layout' => $found,
                            'menuLayout' => $found,
                            'source' => $table . '.' . $column,
                            'debug' => $debug,
                        ], 200, [
                            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                            'Pragma' => 'no-cache',
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                $debug[] = [
                    'table' => $table,
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'kazen_menu_layout' => 'accordion',
            'menuLayout' => 'accordion',
            'source' => 'default',
            'debug' => $debug,
        ], 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    };

    \Route::get('/admin/pmd-kazen-menu-layout', $pmdKazenMenuLayoutResponderV4)
        ->name('pmd.kazen.menu.layout.admin');

    \Route::get('/admin/pmd-kazen-menu-layout-public', $pmdKazenMenuLayoutResponderV4)
        ->name('pmd.kazen.menu.layout.admin.public');
}

// PMD_KAZEN_SIMPLE_THEME_OVERRIDE_ROUTE_V14
// Final override for /simple-theme.
// This route is intentionally registered last so it wins over older /simple-theme handlers.
// It reads the actual frontend-theme row and exposes Kazen header links to the Next frontend.
if (!defined('PMD_KAZEN_SIMPLE_THEME_OVERRIDE_ROUTE_V14')) {
    define('PMD_KAZEN_SIMPLE_THEME_OVERRIDE_ROUTE_V14', true);

    \Route::get('/simple-theme', function () {
        $bool = function ($value) {
            if (is_bool($value)) return $value;
            $raw = strtolower(trim((string)($value ?? '')));
            return in_array($raw, ['1', 'true', 'yes', 'on', 'enabled'], true);
        };

        $url = function ($value) {
            $raw = trim((string)($value ?? ''));
            if ($raw === '') return '';
            if (!preg_match('#^https?://#i', $raw)) {
                $raw = 'https://' . ltrim($raw, '/');
            }
            if (preg_match('#/admin(/|$)#i', $raw)) return '';
            return $raw;
        };

        $data = [];

        foreach (['themes', 'ti_themes'] as $table) {
            try {
                $query = \Illuminate\Support\Facades\DB::table($table)
                    ->where(function ($q) {
                        $q->where('code', 'frontend-theme')
                          ->orWhere('code', 'paymydine-nextjs')
                          ->orWhere('name', 'like', '%Menu Theme%');
                    });

                try {
                    $query = $query->orderByDesc('updated_at');
                } catch (\Throwable $e) {}

                foreach ($query->get() as $row) {
                    $decoded = json_decode($row->data ?? '{}', true);
                    if (is_array($decoded)) {
                        $data = array_replace_recursive($data, $decoded);
                    }
                }
            } catch (\Throwable $e) {}
        }

        $setting = function ($key, $fallback = '') {
            try {
                $value = \Illuminate\Support\Facades\DB::table('settings')->where('item', $key)->value('value');
                if ($value !== null) return $value;
            } catch (\Throwable $e) {}
            return $fallback;
        };

        $pick = function ($key, $fallback = '') use (&$data, $setting) {
            if (is_array($data) && array_key_exists($key, $data)) return $data[$key];
            return $setting($key, $fallback);
        };

        $menuRaw = strtolower(trim((string)($data['kazen_menu_layout'] ?? $data['menuLayout'] ?? 'accordion')));
        $menuLayout = in_array($menuRaw, ['tabs', 'tab', 'category-tabs', 'category_tabs'], true) ? 'tabs' : 'accordion';

        $websiteUrl = $url($pick('pmd_kazen_website_url', $data['kazen_header_links']['website']['url'] ?? ''));
        if ($websiteUrl === '') {
            $websiteUrl = $url($setting('pmd_kazen_website_url', ''));
        }

        $websiteEnabledRaw = $pick(
            'pmd_kazen_website_enabled',
            $data['kazen_header_links']['website']['enabled'] ?? ($websiteUrl !== '' ? '1' : '0')
        );
        $websiteEnabled = $websiteUrl !== '' && $bool($websiteEnabledRaw);

        $socialUrl = $url($pick('pmd_kazen_social_url', $data['kazen_header_links']['social']['url'] ?? ''));
        if ($socialUrl === '') {
            $socialUrl = $url($setting('pmd_kazen_social_url', ''));
        }

        $socialPlatform = strtolower(trim((string)$pick(
            'pmd_kazen_social_platform',
            $data['kazen_header_links']['social']['platform'] ?? $setting('pmd_kazen_social_platform', 'instagram')
        )));
        if (!in_array($socialPlatform, ['instagram', 'facebook', 'trustpilot', 'reviews', 'website'], true)) {
            $socialPlatform = 'instagram';
        }

        $socialEnabledRaw = $pick(
            'pmd_kazen_social_enabled',
            $data['kazen_header_links']['social']['enabled'] ?? ($socialUrl !== '' ? '1' : '0')
        );
        $socialEnabled = $socialUrl !== '' && $bool($socialEnabledRaw);

        $frontend = 'kazen_japanese';

        $payloadData = array_replace($data, [
            'theme_configuration' => 'kazen_japanese',
            'kazen_menu_layout' => $menuLayout,
            'menuLayout' => $menuLayout,
            'kazen_header_links' => [
                'website' => [
                    'enabled' => $websiteEnabled,
                    'url' => $websiteUrl,
                ],
                'social' => [
                    'enabled' => $socialEnabled,
                    'platform' => $socialPlatform,
                    'url' => $socialUrl,
                ],
            ],
            'pmd_kazen_website_enabled' => $websiteEnabled ? '1' : '0',
            'pmd_kazen_website_url' => $websiteUrl,
            'pmd_kazen_social_enabled' => $socialEnabled ? '1' : '0',
            'pmd_kazen_social_platform' => $socialPlatform,
            'pmd_kazen_social_url' => $socialUrl,
            'theme_id' => 'kazen_japanese',
            'primary_color' => $data['primary_color'] ?? '#062F2A',
            'secondary_color' => $data['secondary_color'] ?? '#062F2A',
            'accent_color' => $data['accent_color'] ?? '#C89B4A',
            'background_color' => $data['background_color'] ?? '#FAF9F4',
        ]);

        return response()->json([
            'success' => true,
            'admin_theme' => 'kazen_japanese',
            'frontend_theme' => $frontend,
            'kazen_menu_layout' => $menuLayout,
            'menuLayout' => $menuLayout,
            'kazen_header_links' => $payloadData['kazen_header_links'],
            'pmd_kazen_website_enabled' => $payloadData['pmd_kazen_website_enabled'],
            'pmd_kazen_website_url' => $payloadData['pmd_kazen_website_url'],
            'pmd_kazen_social_enabled' => $payloadData['pmd_kazen_social_enabled'],
            'pmd_kazen_social_platform' => $payloadData['pmd_kazen_social_platform'],
            'pmd_kazen_social_url' => $payloadData['pmd_kazen_social_url'],
            'data' => $payloadData,
        ]);
    });
}
// PMD_KAZEN_SIMPLE_THEME_OVERRIDE_ROUTE_V14_END


// PMD_SIMPLE_THEME_KAZEN_LOCK_V28
// Marker: /simple-theme payload is locked to Kazen in the existing final responder above.
// If gold-luxury appears in /simple-theme after this marker, another earlier route is winning.

// PMD_SIMPLE_THEME_DYNAMIC_ALL_EXISTING_THEMES_V8
// Final /simple-theme override: restores admin theme switching.
// This intentionally does NOT add Velvet. It only restores existing stable themes.
if (!defined('PMD_SIMPLE_THEME_DYNAMIC_ALL_EXISTING_THEMES_V8')) {
    define('PMD_SIMPLE_THEME_DYNAMIC_ALL_EXISTING_THEMES_V8', true);

    \Illuminate\Support\Facades\Route::get('/simple-theme', function () {
        $bool = function ($value) {
            if (is_bool($value)) return $value;
            $raw = strtolower(trim((string)($value ?? '')));
            return in_array($raw, ['1', 'true', 'yes', 'on', 'enabled'], true);
        };

        $url = function ($value) {
            $raw = trim((string)($value ?? ''));
            if ($raw === '') return '';
            if (!preg_match('#^https?://#i', $raw)) {
                $raw = 'https://' . ltrim($raw, '/');
            }
            if (preg_match('#/(admin|app/admin)(/|$)#i', parse_url($raw, PHP_URL_PATH) ?: '')) return '';
            if (stripos($raw, 'settings/edit/review_social') !== false) return '';
            return $raw;
        };

        $decode = function ($raw) {
            if (is_array($raw)) return $raw;
            if (is_object($raw)) return json_decode(json_encode($raw), true) ?: [];
            if (!is_string($raw) || trim($raw) === '') return [];
            $json = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json;
            $unserialized = @unserialize($raw);
            if (($unserialized !== false || $raw === 'b:0;')) {
                return json_decode(json_encode($unserialized), true) ?: [];
            }
            return [];
        };

        $data = [];

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
                    $query = $query->orderByDesc('updated_at');
                } catch (\Throwable $e) {}

                foreach ($query->get() as $row) {
                    foreach (['data', 'settings', 'config', 'value'] as $column) {
                        if (isset($row->{$column}) && $row->{$column} !== '') {
                            $decoded = $decode($row->{$column});
                            if (is_array($decoded)) {
                                $data = array_replace_recursive($data, $decoded);
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {}
        }

        $setting = function ($key, $fallback = '') {
            try {
                $value = \Illuminate\Support\Facades\DB::table('settings')->where('item', $key)->value('value');
                if ($value !== null) return $value;
            } catch (\Throwable $e) {}
            return $fallback;
        };

        $pick = function ($key, $fallback = '') use (&$data, $setting) {
            if (is_array($data) && array_key_exists($key, $data)) return $data[$key];
            return $setting($key, $fallback);
        };

        $normalizeTheme = function ($value) {
            $raw = strtolower(trim((string)($value ?? '')));
            $raw = preg_replace('/[\s-]+/', '_', $raw);

            $map = [
                'gold_luxury' => 'gold-luxury',
                'gold' => 'gold-luxury',
                'light' => 'gold-luxury',
                'dark' => 'gold-luxury',
                'colorful' => 'gold-luxury',
                'minimal' => 'gold-luxury',

                'organic_botanical_paper' => 'organic_botanical_paper',
                'organic' => 'organic_botanical_paper',

                'modern_green' => 'modern_green',

                'kazen_japanese' => 'kazen_japanese',
                'kazen' => 'kazen_japanese',
            ];

            return $map[$raw] ?? 'gold-luxury';
        };

        $adminThemeRaw =
            $data['theme_configuration']
            ?? $data['theme_id']
            ?? $data['frontend_theme']
            ?? $setting('theme_configuration', 'gold_luxury');

        $frontend = $normalizeTheme($adminThemeRaw);

        $menuRaw = strtolower(trim((string)($data['kazen_menu_layout'] ?? $data['menuLayout'] ?? $data['food_display_style'] ?? 'accordion')));
        $menuRaw = preg_replace('/[_\s-]+/', '-', $menuRaw);
        $menuLayout = in_array($menuRaw, ['tabs', 'tab', 'category-tabs', 'category-tabs-full-item-list'], true) ? 'tabs' : 'accordion';

        $websiteUrl = $url($pick('pmd_kazen_website_url', $data['kazen_header_links']['website']['url'] ?? ''));
        $websiteEnabled = $websiteUrl !== '' && $bool($pick('pmd_kazen_website_enabled', $data['kazen_header_links']['website']['enabled'] ?? '1'));

        $socialUrl = $url($pick('pmd_kazen_social_url', $data['kazen_header_links']['social']['url'] ?? ''));
        $socialPlatform = strtolower(trim((string)$pick('pmd_kazen_social_platform', $data['kazen_header_links']['social']['platform'] ?? 'instagram')));
        if (!in_array($socialPlatform, ['instagram', 'facebook', 'trustpilot', 'reviews', 'website'], true)) {
            $socialPlatform = 'instagram';
        }
        $socialEnabled = $socialUrl !== '' && $bool($pick('pmd_kazen_social_enabled', $data['kazen_header_links']['social']['enabled'] ?? '1'));

        $colorsByTheme = [
            'gold-luxury' => [
                'primary_color' => '#062F2A',
                'secondary_color' => '#062F2A',
                'accent_color' => '#C89B4A',
                'background_color' => '#FAF9F4',
            ],
            'organic_botanical_paper' => [
                'primary_color' => $data['primary_color'] ?? '#737A55',
                'secondary_color' => '#FFF9EF',
                'accent_color' => $data['accent_color'] ?? '#B8864B',
                'background_color' => '#F3EBDD',
            ],
            'modern_green' => [
                'primary_color' => '#29BC7E',
                'secondary_color' => '#07110D',
                'accent_color' => '#29BC7E',
                'background_color' => '#030504',
            ],
            'kazen_japanese' => [
                'primary_color' => '#062F2A',
                'secondary_color' => '#062F2A',
                'accent_color' => '#C89B4A',
                'background_color' => '#FAF9F4',
            ],
        ];

        $themeColors = $colorsByTheme[$frontend] ?? $colorsByTheme['gold-luxury'];

        $payloadData = array_replace($data, [
            'theme_configuration' => $adminThemeRaw,
            'theme_id' => $frontend,
            'frontend_theme' => $frontend,
            'admin_theme' => $adminThemeRaw,

            'kazen_menu_layout' => $menuLayout,
            'menuLayout' => $menuLayout,

            'kazen_header_links' => [
                'website' => [
                    'enabled' => $websiteEnabled,
                    'url' => $websiteUrl,
                ],
                'social' => [
                    'enabled' => $socialEnabled,
                    'platform' => $socialPlatform,
                    'url' => $socialUrl,
                ],
            ],

            'pmd_kazen_website_enabled' => $websiteEnabled ? '1' : '0',
            'pmd_kazen_website_url' => $websiteUrl,
            'pmd_kazen_social_enabled' => $socialEnabled ? '1' : '0',
            'pmd_kazen_social_platform' => $socialPlatform,
            'pmd_kazen_social_url' => $socialUrl,
        ], $themeColors);

        return response()->json([
            'success' => true,
            'admin_theme' => $adminThemeRaw,
            'frontend_theme' => $frontend,
            'kazen_menu_layout' => $menuLayout,
            'menuLayout' => $menuLayout,
            'kazen_header_links' => $payloadData['kazen_header_links'],
            'pmd_kazen_website_enabled' => $payloadData['pmd_kazen_website_enabled'],
            'pmd_kazen_website_url' => $payloadData['pmd_kazen_website_url'],
            'pmd_kazen_social_enabled' => $payloadData['pmd_kazen_social_enabled'],
            'pmd_kazen_social_platform' => $payloadData['pmd_kazen_social_platform'],
            'pmd_kazen_social_url' => $payloadData['pmd_kazen_social_url'],
            'data' => $payloadData,
        ], 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    });
}

// PMD_EXISTING_THEMES_KAZEN_ENGINE_SAFE_V10
// Safe final override:
// Admin may save Gold / Organic / Modern / Kazen.
// Public frontend always receives kazen_japanese engine, plus pmd_visual_theme_selection for skin.
// This preserves the full working Kazen feature set for all existing themes.
if (!defined('PMD_EXISTING_THEMES_KAZEN_ENGINE_SAFE_V10')) {
    define('PMD_EXISTING_THEMES_KAZEN_ENGINE_SAFE_V10', true);

    \Illuminate\Support\Facades\Route::get('/simple-theme', function () {
        $decode = function ($raw) {
            if (is_array($raw)) return $raw;
            if (is_object($raw)) return json_decode(json_encode($raw), true) ?: [];
            if (!is_string($raw) || trim($raw) === '') return [];
            $json = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json;
            $unserialized = @unserialize($raw);
            if (($unserialized !== false || $raw === 'b:0;')) {
                return json_decode(json_encode($unserialized), true) ?: [];
            }
            return [];
        };

        $data = [];

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
                    $query = $query->orderByDesc('updated_at');
                } catch (\Throwable $e) {}

                foreach ($query->get() as $row) {
                    foreach (['data', 'settings', 'config', 'value'] as $column) {
                        if (isset($row->{$column}) && $row->{$column} !== '') {
                            $decoded = $decode($row->{$column});
                            if (is_array($decoded)) {
                                $data = array_replace_recursive($data, $decoded);
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {}
        }

        $setting = function ($key, $fallback = '') {
            try {
                $value = \Illuminate\Support\Facades\DB::table('settings')->where('item', $key)->value('value');
                if ($value !== null) return $value;
            } catch (\Throwable $e) {}
            return $fallback;
        };

        $selectedRaw =
            $data['theme_configuration']
            ?? $data['theme_id']
            ?? $data['frontend_theme']
            ?? $setting('theme_configuration', 'kazen_japanese');

        $normalizeSkin = function ($value) {
            $raw = strtolower(trim((string)($value ?? '')));
            $raw = preg_replace('/[\s-]+/', '_', $raw);

            $map = [
                'gold_luxury' => 'gold-luxury',
                'gold' => 'gold-luxury',
                'organic_botanical_paper' => 'organic-botanical-paper',
                'organic' => 'organic-botanical-paper',
                'modern_green' => 'modern-green',
                'kazen_japanese' => 'kazen-japanese',
                'kazen' => 'kazen-japanese',
            ];

            return $map[$raw] ?? 'kazen-japanese';
        };

        $visualSkin = $normalizeSkin($selectedRaw);

        $menuRaw = strtolower(trim((string)($data['kazen_menu_layout'] ?? $data['menuLayout'] ?? $data['food_display_style'] ?? 'tabs')));
        $menuRaw = preg_replace('/[_\s-]+/', '-', $menuRaw);
        $menuLayout = in_array($menuRaw, ['tabs', 'tab', 'category-tabs', 'category-tabs-full-item-list'], true) ? 'tabs' : 'accordion';

        $colorsBySkin = [
            'kazen-japanese' => [
                'primary_color' => '#062F2A',
                'secondary_color' => '#062F2A',
                'accent_color' => '#C89B4A',
                'background_color' => '#FAF9F4',
            ],
            'gold-luxury' => [
                'primary_color' => '#8C6A2F',
                'secondary_color' => '#251C10',
                'accent_color' => '#C89B4A',
                'background_color' => '#FAF3E3',
            ],
            'organic-botanical-paper' => [
                'primary_color' => '#737A55',
                'secondary_color' => '#FFF9EF',
                'accent_color' => '#B8864B',
                'background_color' => '#F3EBDD',
            ],
            'modern-green' => [
                'primary_color' => '#29BC7E',
                'secondary_color' => '#07110D',
                'accent_color' => '#29BC7E',
                'background_color' => '#030504',
            ],
        ];

        $themeColors = $colorsBySkin[$visualSkin] ?? $colorsBySkin['kazen-japanese'];

        $payloadData = array_replace($data, [
            'theme_configuration' => 'kazen_japanese',
            'theme_id' => 'kazen_japanese',
            'frontend_theme' => 'kazen_japanese',
            'admin_theme' => 'kazen_japanese',

            'pmd_visual_theme_selection' => $visualSkin,
            'pmd_admin_selected_theme' => $selectedRaw,

            'kazen_menu_layout' => $menuLayout,
            'menuLayout' => $menuLayout,
        ], $themeColors);

        return response()->json([
            'success' => true,
            'admin_theme' => 'kazen_japanese',
            'frontend_theme' => 'kazen_japanese',
            'kazen_menu_layout' => $menuLayout,
            'menuLayout' => $menuLayout,
            'pmd_visual_theme_selection' => $visualSkin,
            'pmd_admin_selected_theme' => $selectedRaw,
            'data' => $payloadData,
        ], 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    });
}


// PMD_SIMPLE_THEME_VELVET_TERRACOTTA_CLEAN_V14
if (!defined('PMD_SIMPLE_THEME_VELVET_TERRACOTTA_CLEAN_V14')) { define('PMD_SIMPLE_THEME_VELVET_TERRACOTTA_CLEAN_V14', true); \Illuminate\Support\Facades\Route::get('/simple-theme', function () { $decode = function ($raw) { if (is_array($raw)) return $raw; if (is_object($raw)) return json_decode(json_encode($raw), true) ?: []; if (!is_string($raw) || trim($raw) === '') return []; $json = json_decode($raw, true); if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json; $unserialized = @unserialize($raw); if (($unserialized !== false || $raw === 'b:0;')) return json_decode(json_encode($unserialized), true) ?: []; return []; }; $data = []; foreach (['themes','ti_themes'] as $table) { try { if (!\Illuminate\Support\Facades\Schema::hasTable($table)) continue; $query = \Illuminate\Support\Facades\DB::table($table)->where(function ($q) { $q->where('code','frontend-theme')->orWhere('code','paymydine-nextjs')->orWhere('name','like','%Menu Theme%'); }); try { $query = $query->orderByDesc('updated_at'); } catch (\Throwable $e) {} foreach ($query->get() as $row) { foreach (['data','settings','config','value'] as $column) { if (isset($row->{$column}) && $row->{$column} !== '') { $decoded = $decode($row->{$column}); if (is_array($decoded)) $data = array_replace_recursive($data, $decoded); } } } } catch (\Throwable $e) {} } $setting = function ($key, $fallback = '') { try { $value = \Illuminate\Support\Facades\DB::table('settings')->where('item', $key)->value('value'); if ($value !== null) return $value; } catch (\Throwable $e) {} return $fallback; }; $selectedRaw = $data['theme_configuration'] ?? $data['theme_id'] ?? $data['frontend_theme'] ?? $setting('theme_configuration', 'kazen_japanese'); $raw = preg_replace('/[\s-]+/', '_', strtolower(trim((string)$selectedRaw))); $isVelvet = in_array($raw, ['velvet_terracotta','velvet'], true); $frontend = $isVelvet ? 'velvet_terracotta' : 'kazen_japanese'; $menuRaw = preg_replace('/[_\s-]+/', '-', strtolower(trim((string)($data['kazen_menu_layout'] ?? $data['menuLayout'] ?? $data['food_display_style'] ?? 'tabs')))); $menuLayout = in_array($menuRaw, ['tabs','tab','category-tabs','category-tabs-full-item-list'], true) ? 'tabs' : 'accordion'; $colors = $isVelvet ? ['primary_color'=>'#B86750','secondary_color'=>'#5D6F55','accent_color'=>'#8F4739','background_color'=>'#FBF0E3'] : ['primary_color'=>'#062F2A','secondary_color'=>'#062F2A','accent_color'=>'#C89B4A','background_color'=>'#FAF9F4']; $payloadData = array_replace($data, ['theme_configuration'=>$frontend,'theme_id'=>$frontend,'frontend_theme'=>$frontend,'admin_theme'=>$selectedRaw,'pmd_admin_selected_theme'=>$selectedRaw,'kazen_menu_layout'=>$menuLayout,'menuLayout'=>$menuLayout], $colors); return response()->json(['success'=>true,'admin_theme'=>$selectedRaw,'frontend_theme'=>$frontend,'kazen_menu_layout'=>$menuLayout,'menuLayout'=>$menuLayout,'pmd_admin_selected_theme'=>$selectedRaw,'data'=>$payloadData], 200, ['Cache-Control'=>'no-store, no-cache, must-revalidate, max-age=0','Pragma'=>'no-cache']); }); }
