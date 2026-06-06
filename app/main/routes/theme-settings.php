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
                $adminTheme = $data['theme_configuration'] ?? 'light';
                $map = [
                    'light' => 'clean-light',
                    'dark' => 'modern-dark',
                    'gold' => 'gold-luxury',
                    'colorful' => 'vibrant-colors',
                    'minimal' => 'minimal',
                ];
                $frontend = $map[$adminTheme] ?? 'clean-light';
                return response()->json([
                    'success' => true,
                    'admin_theme' => $adminTheme,
                    'frontend_theme' => $frontend,
                    'data' => [
                        'theme_id' => $frontend,
                        'primary_color' => $data['primary_color'] ?? '#E7CBA9',
                        'secondary_color' => $data['secondary_color'] ?? '#EFC7B1',
                        'accent_color' => $data['accent_color'] ?? '#3B3B3B',
                        'background_color' => $data['background_color'] ?? '#FAFAFA',
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'admin_theme' => 'NOT_FOUND',
                'frontend_theme' => 'clean-light',
                'data' => [
                    'theme_id' => 'clean-light',
                    'primary_color' => '#E7CBA9',
                    'secondary_color' => '#EFC7B1',
                    'accent_color' => '#3B3B3B',
                    'background_color' => '#FAFAFA',
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

