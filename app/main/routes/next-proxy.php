<?php

        // If the active theme is frontend-theme, proxy root to Next.js server so URL stays 127.0.0.1:8000
        Route::get('/', function () {
            $active = params('default_themes.main', config('system.defaultTheme'));
            if ($active === 'frontend-theme') {
                // stream/proxy Next content
                $next = env('NEXT_PROXY_ORIGIN', 'http://localhost:3001');
                $ch = curl_init($next.'/');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HEADER, false);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                $resp = curl_exec($ch);
                $ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'text/html; charset=UTF-8';
                curl_close($ch);
                return response($resp)->header('Content-Type', $ctype);
            }
            return app('System\\Classes\\Controller')->run('/');
        });

        // Catch-all: proxy all paths to Next when frontend-theme is active, otherwise run TI controller
        Route::any('{slug?}', function ($slug = null) {
            
            
            // PMD_INJECT_PUBLIC_COMPAT_IN_ACTIVE_CATCHALL_20260606
            require_once base_path('routes/pmd-public-compat-handler.php');
            if (function_exists('pmd_public_compat_response_20260606')) {
                $pmdCompatResponse = pmd_public_compat_response_20260606();
                if ($pmdCompatResponse) {
                    return $pmdCompatResponse;
                }
            }

// PMD_HARD_PUBLIC_COMPAT_INSIDE_NEXT_PROXY_20260606
            // These public/backend compatibility endpoints must be answered here
            // before the Next.js catch-all proxy can swallow them.
            $pmdCompatPath = '/' . ltrim(request()->path(), '/');

            if ($pmdCompatPath === '/api/health') {
                return response()->json([
                    'status' => 'ok',
                    'timestamp' => now(),
                    'version' => '1.0.0',
                    'source' => 'main-next-proxy-compat',
                ]);
            }

            if ($pmdCompatPath === '/api/v1/settings-wrapped') {
                try {
                    $settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');

                    $get = function ($key, $default = '') use ($settings) {
                        return optional($settings->get($key))->value ?? $default;
                    };

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'site_name' => $get('site_name', 'PayMyDine'),
                            'site_logo' => $get('site_logo', ''),
                            'favicon_logo' => $get('favicon_logo', $get('site_logo', '')),
                            'default_currency' => $get('default_currency', $get('default_currency_id', 'EUR')),
                            'default_language' => $get('default_language', 'en'),
                            'order_prefix' => $get('invoice_prefix', '#'),
                            'guest_order' => $get('guest_order', '1'),

                            'pmd_review_share_prompt_enabled' => $get('pmd_review_share_prompt_enabled', '1'),
                            'pmd_home_social_icons_enabled' => $get('pmd_home_social_icons_enabled', '1'),

                            'pmd_social_instagram_enabled' => $get('pmd_social_instagram_enabled', '0'),
                            'pmd_social_instagram_url' => $get('pmd_social_instagram_url', ''),

                            'pmd_social_google_enabled' => $get('pmd_social_google_enabled', '0'),
                            'pmd_social_google_url' => $get('pmd_social_google_url', ''),

                            'pmd_social_trustpilot_enabled' => $get('pmd_social_trustpilot_enabled', '0'),
                            'pmd_social_trustpilot_url' => $get('pmd_social_trustpilot_url', ''),

                            'pmd_social_reviews_enabled' => $get('pmd_social_reviews_enabled', '0'),
                            'pmd_social_reviews_url' => $get('pmd_social_reviews_url', ''),

                            'pmd_social_website_enabled' => $get('pmd_social_website_enabled', '0'),
                            'pmd_social_website_url' => $get('pmd_social_website_url', ''),
                        ],
                    ]);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('PMD settings-wrapped hard compat failed', [
                        'message' => $e->getMessage(),
                        'host' => request()->getHost(),
                    ]);

                    return response()->json([
                        'success' => false,
                        'error' => 'Settings not found',
                    ], 404);
                }
            }

            if ($pmdCompatPath === '/vat-settings') {
                try {
                    $settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');

                    $taxMode = optional($settings->get('tax_mode'))->value ?? optional($settings->get('tax_enabled'))->value ?? '0';
                    $taxPercentage = optional($settings->get('tax_percentage'))->value ?? '0';
                    $taxMenuPrice = optional($settings->get('tax_menu_price'))->value ?? '1';

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'vat_mode' => (string)$taxMode,
                            'vat_percentage' => (string)$taxPercentage,
                            'vat_menu_price' => (string)$taxMenuPrice,
                            'tax_mode' => (string)$taxMode,
                            'tax_percentage' => (string)$taxPercentage,
                            'tax_menu_price' => (string)$taxMenuPrice,
                        ],
                    ]);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('PMD vat-settings hard compat failed', [
                        'message' => $e->getMessage(),
                        'host' => request()->getHost(),
                    ]);

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'vat_mode' => '0',
                            'vat_percentage' => '0',
                            'vat_menu_price' => '1',
                            'tax_mode' => '0',
                            'tax_percentage' => '0',
                            'tax_menu_price' => '1',
                        ],
                    ]);
                }
            }

            if ($pmdCompatPath === '/validate-coupon' && request()->isMethod('post')) {
                try {
                    $code = strtoupper(trim((string)request()->input('code', '')));
                    $subtotal = (float)request()->input('subtotal', request()->input('amount', 0));

                    if ($code === '') {
                        return response()->json([
                            'success' => false,
                            'valid' => false,
                            'message' => 'Coupon code is required',
                        ]);
                    }

                    if (!\Illuminate\Support\Facades\Schema::hasTable('igniter_coupons')) {
                        return response()->json([
                            'success' => false,
                            'valid' => false,
                            'message' => 'Coupons are not available',
                        ]);
                    }

                    $query = \Illuminate\Support\Facades\DB::table('igniter_coupons')->where('code', $code);

                    if (\Illuminate\Support\Facades\Schema::hasColumn('igniter_coupons', 'status')) {
                        $query->where('status', 1);
                    }

                    $coupon = $query->first();

                    if (!$coupon) {
                        return response()->json([
                            'success' => false,
                            'valid' => false,
                            'message' => 'Invalid coupon code',
                        ]);
                    }

                    $type = strtoupper((string)($coupon->type ?? 'F'));
                    $rawDiscount = (float)($coupon->discount ?? 0);
                    $discount = $type === 'P' ? $subtotal * ($rawDiscount / 100) : $rawDiscount;
                    $discount = round(max(0, min($discount, $subtotal)), 2);

                    return response()->json([
                        'success' => true,
                        'valid' => true,
                        'message' => 'Coupon applied',
                        'code' => $code,
                        'discountType' => $type,
                        'discountAmount' => $type === 'F' ? $rawDiscount : null,
                        'discountPercent' => $type === 'P' ? $rawDiscount : null,
                        'finalDiscountAmount' => $discount,
                        'data' => [
                            'coupon_id' => $coupon->coupon_id ?? null,
                            'code' => $code,
                            'name' => $coupon->name ?? $code,
                            'type' => $type,
                            'discount' => $discount,
                            'discount_value' => $rawDiscount,
                            'min_total' => isset($coupon->min_total) ? (float)$coupon->min_total : 0,
                        ],
                    ]);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('PMD validate-coupon hard compat failed', [
                        'message' => $e->getMessage(),
                        'host' => request()->getHost(),
                        'payload' => request()->all(),
                    ]);

                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Failed to validate coupon',
                    ], 500);
                }
            }

$active = params('default_themes.main', config('system.defaultTheme'));
            if ($active === 'frontend-theme') {
                $path = '/'.ltrim($slug ?? '', '/');
                // Exclusions to keep backend working
                $exclusions = [
                    '/admin',
                    config('system.assetsCombinerUri', '/_assets'),
                    '/api',
                    '/api-server.php',
                    '/simple-theme',
                    '/vat-settings',
                    '/validate-coupon',
                    '/orders',
                ];
                foreach ($exclusions as $ex) {
                    if ($path === $ex || strpos($path, rtrim($ex,'/').'/') === 0) {
                        return app('System\\Classes\\Controller')->run($path);
                    }
                }

                $next = env('NEXT_PROXY_ORIGIN', 'http://localhost:3001');
                // Preserve query string and path
                $uri = request()->getRequestUri();
                $target = rtrim($next, '/').'/'.ltrim($uri, '/');

                $ch = curl_init($target);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HEADER, false);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                // Forward method/body
                $method = request()->getMethod();
                if ($method !== 'GET') {
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, request()->getContent());
                }
                $resp = curl_exec($ch);
                $ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'text/html; charset=UTF-8';
                curl_close($ch);

                return response($resp)->header('Content-Type', $ctype);
            }

            return app('System\\Classes\\Controller')->run($slug);
        })->where('slug', '(.*)?');
