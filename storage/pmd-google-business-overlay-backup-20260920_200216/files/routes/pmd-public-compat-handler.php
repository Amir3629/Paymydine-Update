<?php

/*
|--------------------------------------------------------------------------
| PMD_PUBLIC_COMPAT_HANDLER_20260606
|--------------------------------------------------------------------------
| Shared handler for public endpoints that must not be swallowed by Next proxy.
|--------------------------------------------------------------------------
*/

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

if (!function_exists('pmd_public_compat_settings_rows_20260606')) {
    function pmd_public_compat_settings_rows_20260606()
    {
        $connections = array_values(array_unique(array_filter([
            'tenant',
            config('database.default'),
            'mysql',
        ])));

        foreach ($connections as $connection) {
            try {
                return DB::connection($connection)->table('settings')->get()->keyBy('item');
            } catch (\Throwable $ignored) {
                // try next connection
            }
        }

        return collect();
    }
}

if (!function_exists('pmd_public_compat_setting_get_20260606')) {
    function pmd_public_compat_setting_get_20260606($settings, string $key, $default = '')
    {
        try {
            $row = $settings->get($key);
            return $row && isset($row->value) ? $row->value : $default;
        } catch (\Throwable $ignored) {
            return $default;
        }
    }
}

if (!function_exists('pmd_public_compat_response_20260606')) {
    function pmd_public_compat_response_20260606()
    {
        $path = '/' . ltrim((string)request()->path(), '/');
        $method = strtoupper((string)request()->method());

        if ($path === '/api/health') {
            return response()->json([
                'status' => 'ok',
                'timestamp' => now(),
                'version' => '1.0.0',
                'source' => 'pmd-public-compat-handler',
            ]);
        }

        if ($path === '/api/v1/settings-wrapped') {
            try {
                $settings = pmd_public_compat_settings_rows_20260606();

                $siteLogo = pmd_public_compat_setting_get_20260606($settings, 'site_logo', '');

                return response()->json([
                    'success' => true,
                    'data' => [
                        'site_name' => pmd_public_compat_setting_get_20260606($settings, 'site_name', 'PayMyDine'),
                        'site_logo' => $siteLogo,
                        'favicon_logo' => pmd_public_compat_setting_get_20260606($settings, 'favicon_logo', $siteLogo),
                        'default_currency' => pmd_public_compat_setting_get_20260606($settings, 'default_currency', pmd_public_compat_setting_get_20260606($settings, 'default_currency_id', 'EUR')),
                        'default_language' => pmd_public_compat_setting_get_20260606($settings, 'default_language', 'en'),
                        'order_prefix' => pmd_public_compat_setting_get_20260606($settings, 'invoice_prefix', '#'),
                        'guest_order' => pmd_public_compat_setting_get_20260606($settings, 'guest_order', '1'),

                        'pmd_review_share_prompt_enabled' => pmd_public_compat_setting_get_20260606($settings, 'pmd_review_share_prompt_enabled', '1'),
                        'pmd_home_social_icons_enabled' => pmd_public_compat_setting_get_20260606($settings, 'pmd_home_social_icons_enabled', '1'),

                        'pmd_social_instagram_enabled' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_instagram_enabled', '0'),
                        'pmd_social_instagram_url' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_instagram_url', ''),

                        'pmd_social_google_enabled' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_google_enabled', '0'),
                        'pmd_social_google_url' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_google_url', ''),

                        'pmd_social_trustpilot_enabled' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_trustpilot_enabled', '0'),
                        'pmd_social_trustpilot_url' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_trustpilot_url', ''),

                        'pmd_social_reviews_enabled' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_reviews_enabled', '0'),
                        'pmd_social_reviews_url' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_reviews_url', ''),

                        'pmd_social_website_enabled' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_website_enabled', '0'),
                        'pmd_social_website_url' => pmd_public_compat_setting_get_20260606($settings, 'pmd_social_website_url', ''),
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::error('PMD_PUBLIC_COMPAT settings-wrapped failed', [
                    'message' => $e->getMessage(),
                    'host' => request()->getHost(),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Settings not found',
                ], 404);
            }
        }

        if ($path === '/vat-settings') {
            try {
                $settings = pmd_public_compat_settings_rows_20260606();

                $taxMode = pmd_public_compat_setting_get_20260606(
                    $settings,
                    'tax_mode',
                    pmd_public_compat_setting_get_20260606($settings, 'tax_enabled', '0')
                );

                $taxPercentage = pmd_public_compat_setting_get_20260606($settings, 'tax_percentage', '0');
                $taxMenuPrice = pmd_public_compat_setting_get_20260606($settings, 'tax_menu_price', '1');

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
                Log::error('PMD_PUBLIC_COMPAT vat-settings failed', [
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

        if ($path === '/validate-coupon' && $method === 'POST') {
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

                if (!Schema::hasTable('igniter_coupons')) {
                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Coupons are not available',
                    ]);
                }

                $query = DB::table('igniter_coupons')->where('code', $code);

                if (Schema::hasColumn('igniter_coupons', 'status')) {
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
                Log::error('PMD_PUBLIC_COMPAT validate-coupon failed', [
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

        return null;
    }
}
