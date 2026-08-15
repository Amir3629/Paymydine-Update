<?php

/*
|--------------------------------------------------------------------------
| PayMyDine Frontend V2 theme contract
|--------------------------------------------------------------------------
| Adds a V2-only read endpoint. It intentionally does NOT replace the legacy
| /simple-theme route, so the current port-3001 frontend can continue to use
| its old Kazen/Velvet compatibility behavior during the staging period.
|--------------------------------------------------------------------------
*/

if (!defined('PMD_FRONTEND_V2_THEME_ROUTE_V1')) {
    define('PMD_FRONTEND_V2_THEME_ROUTE_V1', true);

    \Illuminate\Support\Facades\Route::get('/api/v1/frontend-theme-v2', function () {
        $decode = function ($raw) {
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
                    if (isset($row->updated_at) && $row->updated_at) {
                        $candidate = (string)$row->updated_at;
                        if (!$latestUpdatedAt || strcmp($candidate, $latestUpdatedAt) > 0) {
                            $latestUpdatedAt = $candidate;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Keep the endpoint read-only and tolerant of older tenant schemas.
            }
        }

        $setting = function ($key, $fallback = '') {
            try {
                $value = \Illuminate\Support\Facades\DB::table('settings')
                    ->where('item', $key)
                    ->value('value');
                if ($value !== null) return $value;
            } catch (\Throwable $e) {}
            return $fallback;
        };

        // PMD_FRONTEND_V2_SETTINGS_AUTHORITY_R3
        // The PMD Settings page is the V2 source of truth. Theme-table payloads
        // remain only as a compatibility fallback for older tenants.
        $selectedRaw =
            $setting('pmd_v2_theme_id', null)
            ?? $setting('theme_configuration', null)
            ?? $setting('frontend_theme', null)
            ?? ($data['pmd_v2_theme_id'] ?? null)
            ?? ($data['theme_configuration'] ?? null)
            ?? ($data['theme_id'] ?? null)
            ?? ($data['frontend_theme'] ?? null)
            ?? 'kazen_japanese';

        $normalizeKey = function ($value) {
            $raw = strtolower(trim((string)($value ?? '')));
            return preg_replace('/[\s-]+/', '_', $raw);
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

        $pick = function (array $keys, $fallback = '') use ($data, $setting) {
            // PMD Settings values are authoritative for V2. Theme-table values
            // are read only when the setting does not exist yet.
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

        return response()->json([
            'success' => true,
            'api_version' => 'pmd-frontend-theme-v2',
            'theme_id' => $canonicalTheme,
            'frontend_theme' => $canonicalTheme,
            'theme_configuration' => $canonicalTheme,
            'admin_theme' => $selectedRaw,
            'pmd_admin_selected_theme' => $selectedRaw,
            'theme_version' => $themeVersion,
            'data' => array_replace($payloadData, ['theme_version' => $themeVersion]),
        ], 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    });
}
