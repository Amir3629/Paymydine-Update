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
                    'data' => [
                        'kazen_menu_layout' => $pmdKazenMenuLayoutV5,
                        'menuLayout' => $pmdKazenMenuLayoutV5,
                        'theme_id' => $frontend,
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
                'frontend_theme' => 'gold-luxury',
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

