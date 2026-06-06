<?php

/*
|--------------------------------------------------------------------------
| PMD_MAIN_PUBLIC_COMPAT_ROUTES_BEFORE_NEXT_20260606
|--------------------------------------------------------------------------
| These routes are loaded inside app/main App::before web group,
| before the Next.js catch-all proxy.
|--------------------------------------------------------------------------
*/

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

Route::get('/api/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
        'version' => '1.0.0',
    ]);
});

Route::get('/api/v1/settings-wrapped', function () {
    try {
        $conn = DB::connection('tenant');
        $settings = $conn->table('settings')->get()->keyBy('item');

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
    } catch (Throwable $e) {
        Log::error('PMD main settings-wrapped compat failed', [
            'message' => $e->getMessage(),
            'host' => request()->getHost(),
        ]);

        return response()->json([
            'success' => false,
            'error' => 'Settings not found',
        ], 404);
    }
})->middleware([\App\Http\Middleware\DetectTenant::class]);

Route::get('/vat-settings', function () {
    try {
        $settings = DB::table('settings')->get()->keyBy('item');

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
    } catch (Throwable $e) {
        Log::error('PMD main public vat-settings compat failed', [
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
});

Route::post('/validate-coupon', function (Request $request) {
    try {
        $code = strtoupper(trim((string)$request->input('code', '')));
        $subtotal = (float)$request->input('subtotal', $request->input('amount', 0));

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
    } catch (Throwable $e) {
        Log::error('PMD main public validate-coupon compat failed', [
            'message' => $e->getMessage(),
            'host' => request()->getHost(),
            'payload' => $request->all(),
        ]);

        return response()->json([
            'success' => false,
            'valid' => false,
            'message' => 'Failed to validate coupon',
        ], 500);
    }
});
