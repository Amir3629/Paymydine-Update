<?php

use Illuminate\Support\Facades\DB;

require_once __DIR__.'/helpers.php';
require_once __DIR__.'/menu-helpers.php';

// Menu endpoints
// PMD_MENU_HIGHLIGHTS_LEGACY_ROUTE_SOURCE_20260607
// This is the active TastyIgniter /api/v1/menu route on production. Keep it
// self-contained because some installs cannot resolve App\Http\Controllers\Controller.

if (!function_exists('pmd_menu_highlight_setting_rows_20260607')) {
    function pmd_menu_highlight_setting_rows_20260607($conn, array $keys): array
    {
        try {
            if (!$conn->getSchemaBuilder()->hasTable('settings')) return [];
            $cols = $conn->getSchemaBuilder()->getColumnListing('settings');
            $keyCol = in_array('item', $cols, true) ? 'item' : (in_array('key', $cols, true) ? 'key' : null);
            $valueCol = in_array('value', $cols, true) ? 'value' : (in_array('data', $cols, true) ? 'data' : null);
            if (!$keyCol || !$valueCol) return [];

            $rows = $conn->table('settings')->whereIn($keyCol, $keys)->get();
            $values = [];
            foreach ($rows as $row) {
                $values[(string)$row->{$keyCol}] = $row->{$valueCol};
            }
            return $values;
        } catch (\Throwable $e) {
            return [];
        }
    }
}

if (!function_exists('pmd_menu_highlight_settings_20260607')) {
    function pmd_menu_highlight_settings_20260607($conn): array
    {
        $defaults = [
            'enable_chef_recommendations_section' => false,
            'enable_best_sellers_section' => false,
            'section_placement' => 'hidden',
            'max_chef_recommendation_items' => 8,
            'max_best_seller_items' => 8,
            'show_badges_on_cards' => true,
            'show_badges_in_modal' => true,
            'badge_display_mode' => 'priority_only',
            'badge_style' => 'corner_ribbon',
            'badge_position' => 'image_top_left',
            'show_badge_text_on_cards' => false,
            'show_badge_text_in_modal' => true,
            'chef_recommendation_label' => "Chef’s Choice",
            'best_seller_label' => 'Best Seller',
        ];

        $aliases = [
            'enable_chef_recommendations_section' => ['pmd_menu_highlights_enable_chef_recommendations_section', 'pmd_menu_highlights_chef_section_enabled'],
            'enable_best_sellers_section' => ['pmd_menu_highlights_enable_best_sellers_section', 'pmd_menu_highlights_bestseller_section_enabled'],
            'section_placement' => ['pmd_menu_highlights_section_placement'],
            'max_chef_recommendation_items' => ['pmd_menu_highlights_max_chef_recommendation_items', 'pmd_menu_highlights_max_chef_items'],
            'max_best_seller_items' => ['pmd_menu_highlights_max_best_seller_items', 'pmd_menu_highlights_max_bestseller_items'],
            'show_badges_on_cards' => ['pmd_menu_highlights_show_badges_on_cards', 'pmd_menu_highlights_show_card_badges'],
            'show_badges_in_modal' => ['pmd_menu_highlights_show_badges_in_modal', 'pmd_menu_highlights_show_modal_badges'],
            'badge_display_mode' => ['pmd_menu_highlights_badge_display_mode'],
            'badge_style' => ['pmd_menu_highlights_badge_style'],
            'badge_position' => ['pmd_menu_highlights_badge_position'],
            'show_badge_text_on_cards' => ['pmd_menu_highlights_show_badge_text_on_cards'],
            'show_badge_text_in_modal' => ['pmd_menu_highlights_show_badge_text_in_modal'],
            'chef_recommendation_label' => ['pmd_menu_highlights_chef_recommendation_label', 'pmd_menu_highlights_chef_label'],
            'best_seller_label' => ['pmd_menu_highlights_best_seller_label', 'pmd_menu_highlights_bestseller_label'],
        ];

        $allKeys = array_values(array_unique(array_merge(...array_values($aliases))));
        $rows = pmd_menu_highlight_setting_rows_20260607($conn, $allKeys);
        $valueFor = function (string $name) use ($aliases, $rows, $defaults) {
            foreach ($aliases[$name] ?? [] as $key) {
                if (array_key_exists($key, $rows) && $rows[$key] !== null && $rows[$key] !== '') return $rows[$key];
            }
            return $defaults[$name];
        };
        $bool = function (string $name) use ($valueFor, $defaults): bool {
            return filter_var($valueFor($name), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool)$defaults[$name];
        };
        $int = function (string $name) use ($valueFor, $defaults): int {
            return max(1, min(24, (int)$valueFor($name) ?: (int)$defaults[$name]));
        };
        $text = function (string $name) use ($valueFor, $defaults): string {
            $value = trim((string)$valueFor($name));
            return $value !== '' ? $value : (string)$defaults[$name];
        };
        $enum = function (string $name, array $allowed) use ($text, $defaults): string {
            $value = $text($name);
            return in_array($value, $allowed, true) ? $value : (string)$defaults[$name];
        };

        $settings = [
            'enable_chef_recommendations_section' => $bool('enable_chef_recommendations_section'),
            'enable_best_sellers_section' => $bool('enable_best_sellers_section'),
            'section_placement' => $enum('section_placement', ['top', 'after_categories', 'hidden']),
            'max_chef_recommendation_items' => $int('max_chef_recommendation_items'),
            'max_best_seller_items' => $int('max_best_seller_items'),
            'show_badges_on_cards' => $bool('show_badges_on_cards'),
            'show_badges_in_modal' => $bool('show_badges_in_modal'),
            'badge_display_mode' => $enum('badge_display_mode', ['priority_only', 'show_all']),
            'badge_style' => $enum('badge_style', ['minimal_circle', 'corner_ribbon', 'soft_pill', 'luxury_label']),
            'badge_position' => $enum('badge_position', ['image_top_left', 'image_top_right', 'title_inline', 'hidden']),
            'show_badge_text_on_cards' => $bool('show_badge_text_on_cards'),
            'show_badge_text_in_modal' => $bool('show_badge_text_in_modal'),
            'chef_recommendation_label' => $text('chef_recommendation_label'),
            'best_seller_label' => $text('best_seller_label'),
        ];

        // Backwards-compatible names consumed by the current frontend.
        return $settings + [
            'chef_section_enabled' => $settings['enable_chef_recommendations_section'],
            'bestseller_section_enabled' => $settings['enable_best_sellers_section'],
            'show_card_badges' => $settings['show_badges_on_cards'],
            'show_modal_badges' => $settings['show_badges_in_modal'],
            'chef_label' => $settings['chef_recommendation_label'],
            'bestseller_label' => $settings['best_seller_label'],
            'max_chef_items' => $settings['max_chef_recommendation_items'],
            'max_bestseller_items' => $settings['max_best_seller_items'],
        ];
    }
}

if (!function_exists('pmd_menu_highlight_cache_version_20260607')) {
    function pmd_menu_highlight_cache_version_20260607($conn): string
    {
        try {
            if (!$conn->getSchemaBuilder()->hasTable('settings')) return 'default';
            $cols = $conn->getSchemaBuilder()->getColumnListing('settings');
            $keyCol = in_array('item', $cols, true) ? 'item' : (in_array('key', $cols, true) ? 'key' : null);
            if (!$keyCol) return 'default';
            if (in_array('updated_at', $cols, true)) {
                $updatedAt = $conn->table('settings')->where($keyCol, 'like', 'pmd_menu_highlights_%')->max('updated_at');
                return $updatedAt ? (string)$updatedAt : 'default';
            }
            $valueCol = in_array('value', $cols, true) ? 'value' : (in_array('data', $cols, true) ? 'data' : $keyCol);
            return sha1(json_encode($conn->table('settings')->where($keyCol, 'like', 'pmd_menu_highlights_%')->pluck($valueCol, $keyCol)->all()));
        } catch (\Throwable $e) {
            return 'default';
        }
    }
}

if (!function_exists('pmd_menu_optional_select_20260607')) {
    function pmd_menu_optional_select_20260607($conn, string $alias, string $column, string $fallback): string
    {
        try {
            if ($conn->getSchemaBuilder()->hasColumn('menus', $column)) return "{$alias}.{$column} as {$column}";
        } catch (\Throwable $e) {}
        return "{$fallback} as {$column}";
    }
}

if (!function_exists('pmd_menu_popularity_stats_20260607')) {
    function pmd_menu_popularity_stats_20260607(): array
    {
        try {
            if (class_exists(\App\Services\MenuPopularityService::class)) {
                return app(\App\Services\MenuPopularityService::class)->bestsellerStats();
            }
        } catch (\Throwable $e) {}
        return ['ids' => [], 'counts' => []];
    }
}

if (!function_exists('pmd_menu_apply_recommendation_20260607')) {
    function pmd_menu_apply_recommendation_20260607(&$item, array $autoIds, array $counts): void
    {
        $menuId = (int)($item->id ?? $item->menu_id ?? 0);
        $override = (string)($item->bestseller_override_mode ?? 'auto');
        $manual = (bool)($item->is_manual_bestseller ?? false);
        $isBest = false;
        $source = null;
        if ($override === 'force_off') {
            $isBest = false;
        } elseif ($override === 'force_on' || $manual) {
            $isBest = true;
            $source = 'manual';
        } elseif ($menuId > 0 && isset($autoIds[$menuId])) {
            $isBest = true;
            $source = 'auto';
        }
        $item->is_chef_recommended = (bool)($item->is_chef_recommended ?? false);
        $item->is_manual_bestseller = $manual;
        $item->bestseller_override_mode = in_array($override, ['auto', 'force_on', 'force_off'], true) ? $override : 'auto';
        $item->is_bestseller = $isBest;
        $item->bestseller_source = $source;
        $item->popularity_count = (int)($counts[$menuId] ?? 0);
    }
}


if (!function_exists('pmd_menu_highlights_response_20260607')) {
    function pmd_menu_highlights_response_20260607()
    {
try {
        // DetectTenant has set default connection to tenant; use it explicitly for menu + combos.
        $conn = DB::connection('tenant');
        $p = $conn->getTablePrefix();
        $nutritionSelect = implode(",
                                ", array_map(function ($column) use ($conn) {
            return pmdMenuColumnSelect($conn, 'm', $column);
        }, ['calories', 'protein', 'carbs', 'fat', 'sugar', 'serving_size']));
        $recommendationSelect = implode(",
                                ", [
            pmd_menu_optional_select_20260607($conn, 'm', 'is_chef_recommended', '0'),
            pmd_menu_optional_select_20260607($conn, 'm', 'is_manual_bestseller', '0'),
            pmd_menu_optional_select_20260607($conn, 'm', 'bestseller_override_mode', "'auto'"),
        ]);
        $query = "
            SELECT
                m.menu_id as id,
                m.menu_name as name,
                m.menu_description as description,
                CAST(m.menu_price AS DECIMAL(10,2)) as price,
                COALESCE(c.name, 'Main') as category_name,
                ma.name as image,
                COALESCE(m.is_halal, 0) as halal,
                COALESCE(m.is_vegetarian, 0) as vegetarian,
                COALESCE(m.is_vegan, 0) as vegan,
                {$nutritionSelect},
                {$recommendationSelect},
                (
                    SELECT GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR '||')
                    FROM {$p}allergenables aa
                    INNER JOIN {$p}allergens a ON a.allergen_id = aa.allergen_id
                    WHERE aa.allergenable_id = m.menu_id
                        AND aa.allergenable_type IN ('menus', 'Admin\\Models\\Menus_model')
                        AND a.status = 1
                ) as allergy_names
            FROM {$p}menus m
            LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
            LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
            LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus'
                AND ma.attachment_id = m.menu_id
                AND ma.tag = 'thumb'
            WHERE m.menu_status = 1
            ORDER BY c.priority ASC, COALESCE(m.menu_priority, 999999) ASC, m.menu_name ASC
        ";

        $items = $conn->select($query);
        $stats = pmd_menu_popularity_stats_20260607();
        $autoIds = array_flip($stats['ids'] ?? []);
        $counts = $stats['counts'] ?? [];

        foreach ($items as &$item) {
            $item->price = (float)$item->price;
            normalizeMenuFoodAttributes($item);
            normalizeMenuNutrition($item);
            pmd_menu_apply_recommendation_20260607($item, $autoIds, $counts);
            $item->image = $item->image ? "/api/media/".$item->image : '/images/pasta.png';
            $item->isCombo = false;
            $item->comboId = null;
            $item->images = pmd_menu_gallery_images_for_id((int)$item->id);
            $item->gallery = $item->images;
            $item->media = $item->images;
            $item->options = getMenuItemOptions($item->id);
        }

        $combosQuery = "
            SELECT
                mc.combo_id as id,
                mc.combo_name as name,
                mc.combo_description as description,
                CAST(mc.combo_price AS DECIMAL(10,2)) as price,
                'Combos' as category_name,
                ma.name as image
            FROM {$p}menu_combos mc
            LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menu_combos'
                AND ma.attachment_id = mc.combo_id
                AND ma.tag = 'thumb'
            WHERE mc.combo_status = 1
            ORDER BY mc.combo_priority ASC, mc.combo_name ASC
        ";
        $combos = $conn->select($combosQuery);
        foreach ($combos as &$combo) {
            $combo->price = (float)$combo->price;
            $combo->image = $combo->image ? "/api/media/".$combo->image : '/images/pasta.png';
            $combo->isCombo = true;
            $combo->comboId = $combo->id;
            $combo->options = [];
            $combo->is_stock_out = false;
            $combo->available = true;
            $combo->halal = false;
            $combo->vegetarian = false;
            $combo->vegan = false;
            $combo->allergens = [];
            $combo->allergy_tags = [];
            $combo->calories = null;
            $combo->protein = null;
            $combo->carbs = null;
            $combo->fat = null;
            $combo->sugar = null;
            $combo->serving_size = null;
            $combo->nutrition = null;
            $combo->is_chef_recommended = false;
            $combo->is_manual_bestseller = false;
            $combo->bestseller_override_mode = 'auto';
            $combo->is_bestseller = false;
            $combo->bestseller_source = null;
            $combo->popularity_count = 0;
        }
        $allItems = array_merge($items, $combos);

        $categories = $conn->select("
            SELECT category_id as id, name, priority
            FROM {$p}categories
            WHERE status = 1
            ORDER BY priority ASC, name ASC
        ");
        if (count($combos) > 0) {
            $hasCombosCategory = false;
            foreach ($categories as $cat) {
                if ($cat->name === 'Combos') { $hasCombosCategory = true; break; }
            }
            if (!$hasCombosCategory) $categories[] = (object)['id' => 'combos', 'name' => 'Combos', 'priority' => 999];
        }

        $settings = pmd_menu_highlight_settings_20260607($conn);
        $setupRows = pmd_menu_highlight_setting_rows_20260607($conn, ['site_logo', 'site_name', 'mail_from_address']);
        $logoValue = trim((string)($setupRows['site_logo'] ?? ''));
        $siteNameValue = trim((string)($setupRows['site_name'] ?? ''));
        $mailValue = trim((string)($setupRows['mail_from_address'] ?? ''));
        $hasCategories = count($categories) > 0;
        $hasMenuItems = count($allItems) > 0;
        $hasLogo = $logoValue !== '' && stripos($logoValue, 'default') === false && stripos($logoValue, 'placeholder') === false;
        $hasCustomSettings = ($siteNameValue !== '' && strcasecmp($siteNameValue, 'PayMyDine') !== 0) || $mailValue !== '';

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $allItems,
                'categories' => $categories,
                'is_frontend_configured' => $hasCategories || $hasMenuItems || $hasLogo || $hasCustomSettings,
                'setup_status' => [
                    'has_categories' => $hasCategories,
                    'has_menu_items' => $hasMenuItems,
                    'has_logo' => $hasLogo,
                    'has_custom_settings' => $hasCustomSettings,
                ],
                'menu_highlight_settings' => $settings,
                'menu_cache_version' => pmd_menu_highlight_cache_version_20260607($conn),
                'menu_api_version' => 'menu-highlights-v2',
            ],
        ]);
    } catch (\Exception $e) {
        \Log::error('PMD_MENU_HIGHLIGHTS_LEGACY_ROUTE_FAILED', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        return response()->json([
            'success' => false,
            'error' => 'Failed to fetch menu',
            'message' => $e->getMessage(),
        ], 500);
    }

    }
}
