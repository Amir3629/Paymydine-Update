<?php

        // Theme settings JSON for Next.js (serve from 8000)
        Route::get('/simple-theme', function () {
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
                    'data' => [
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
                'data' => [
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

