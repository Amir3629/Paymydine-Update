<?php

                // ================================
                // COMPAT endpoints (frontend needs)
                // No tenant hardcoding; DetectTenant already applied
                // ================================

                Route::get('/settings-wrapped', function () {
                    try {
                        $conn = DB::connection('tenant');
                        $settings = $conn->table('settings')->get()->keyBy('item');
                        $payload = [
                            'site_name'        => optional($settings->get('site_name'))->value ?? 'PayMyDine',
                            'site_logo'        => optional($settings->get('site_logo'))->value ?? '',
                            'favicon_logo'     => optional($settings->get('favicon_logo'))->value ?? (optional($settings->get('site_logo'))->value ?? ''),
                            'default_currency' => optional($settings->get('default_currency'))->value ?? (optional($settings->get('default_currency_id'))->value ?? 'USD'),
                            'default_language' => optional($settings->get('default_language'))->value ?? 'en',
                            'order_prefix'     => optional($settings->get('invoice_prefix'))->value ?? '#',
                            'guest_order'      => optional($settings->get('guest_order'))->value ?? '1',
                        ];
                        return response()->json(['success' => true, 'data' => $payload]);
                    } catch (\Throwable $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        return response()->json(['success' => false, 'error' => 'Settings not found'], 404);
                    }
                });

                Route::get('/vat-settings', function () {
                    try {
                        $conn = DB::connection('tenant');
                        $settings = $conn->table('settings')->get()->keyBy('item');
                        $tax_mode       = optional($settings->get('tax_mode'))->value ?? optional($settings->get('tax_enabled'))->value ?? '0';
                        $tax_percentage = optional($settings->get('tax_percentage'))->value ?? '0';
                        $tax_menu_price = optional($settings->get('tax_menu_price'))->value ?? '1';
                        return response()->json(['success' => true, 'data' => [
                            'vat_mode' => (string)$tax_mode,
                            'vat_percentage' => (string)$tax_percentage,
                            'vat_menu_price' => (string)$tax_menu_price,
                            'tax_mode' => (string)$tax_mode, // Legacy compatibility
                            'tax_percentage' => (string)$tax_percentage, // Legacy compatibility
                            'tax_menu_price' => (string)$tax_menu_price, // Legacy compatibility
                        ]]);
                    } catch (\Throwable $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        return response()->json(['success' => false, 'error' => 'VAT settings not found'], 404);
                    }
                });

