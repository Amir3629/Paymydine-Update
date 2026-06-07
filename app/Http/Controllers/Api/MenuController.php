<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Services\MenuPopularityService;

class MenuController extends Controller
{
    /**
     * Get full menu with categories and items (matching old API structure)
     */
    public function index(Request $request)
    {
        try {
            // Get menu items with categories (matching old API structure)
            $p = DB::connection()->getTablePrefix();
            $nutritionSelect = $this->getNutritionRawSelect('m');
            $query = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as price,
                    COALESCE(m.prep_time_minutes, 15) as prep_time_minutes,
                    COALESCE(c.name, 'Main') as category_name,
                    ma.name as image,
                    COALESCE(m.is_stock_out, 0) as is_stock_out,
                    COALESCE(m.is_halal, 0) as halal,
                    COALESCE(m.is_vegetarian, 0) as vegetarian,
                    COALESCE(m.is_vegan, 0) as vegan,
                    {$nutritionSelect},
                    {$this->getOptionalMenuColumnExpression('color', 'm')},
                    {$this->getOptionalMenuColumnExpression('is_chef_recommended', 'm')},
                    {$this->getOptionalMenuColumnExpression('is_manual_bestseller', 'm')},
                    {$this->getOptionalMenuColumnExpression('bestseller_override_mode', 'm')},
                    (
                        SELECT GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR '||')
                        FROM {$p}allergenables aa
                        INNER JOIN {$p}allergens a ON a.allergen_id = aa.allergen_id
                        WHERE aa.allergenable_id = m.menu_id
                            AND aa.allergenable_type IN ('menus', 'Admin\\Models\\Menus_model')
                            AND a.status = 1
                    ) as allergy_names,
                    CASE 
                        WHEN m.is_stock_out = 1 THEN 0
                        ELSE 1
                    END as available
                FROM {$p}menus m
                LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
                LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
                LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
                    AND ma.attachment_id = m.menu_id 
                    AND ma.tag = 'thumb'
                WHERE m.menu_status = 1
                ORDER BY c.priority ASC, m.menu_name ASC
            ";
            
            $items = DB::select($query);
            $menuImagesByMenuId = $this->getOrderedMenuImagesByMenuIds(array_map(fn($menu) => (int)$menu->id, $items));
            $bestsellerStats = app(MenuPopularityService::class)->bestsellerStats();
            $autoBestsellerIds = array_flip($bestsellerStats['ids']);
            $popularityCounts = $bestsellerStats['counts'];
            
            // Convert prices to float, fix image paths, and add options
            foreach ($items as &$item) {
                $item->price = (float)$item->price;
                $this->normalizeFoodAttributes($item);
                $this->normalizeNutrition($item);
                $this->applyRecommendationMetadata($item, $autoBestsellerIds, $popularityCounts);
                $item->is_stock_out = (bool)($item->is_stock_out ?? 0);
                $item->available = (bool)($item->available ?? 1);
                
                if ($item->image) {
                    // If image exists, construct the relative URL for Next.js proxy
                    $item->image = "/api/media/" . $item->image;
                } else {
                    // Use default image if none exists
                    $item->image = '/images/pasta.png';
                }
                
                // Mark as regular menu item (not a combo)
                $item->isCombo = false;
                $item->comboId = null;
                $item->images = $menuImagesByMenuId[(int)$item->id] ?? [];
                
                // Fetch menu options for this item
                $item->options = $this->getMenuItemOptions($item->id);
            }
            
            // Get combos from menu_combos table
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
            
            $combos = DB::select($combosQuery);
            
            // Format combos same as menu items
            foreach ($combos as &$combo) {
                $combo->price = (float)$combo->price;
                if ($combo->image) {
                    // If image exists, construct the relative URL for Next.js proxy
                    $combo->image = "/api/media/" . $combo->image;
                } else {
                    // Use default image if none exists
                    $combo->image = '/images/pasta.png';
                }
                
                // Mark as combo
                $combo->isCombo = true;
                $combo->comboId = $combo->id;
                
                // Combos don't have options (they're pre-configured)
                $combo->options = [];
                $combo->is_chef_recommended = false;
                $combo->is_manual_bestseller = false;
                $combo->bestseller_override_mode = 'auto';
                $combo->is_bestseller = false;
                $combo->bestseller_source = null;
                $combo->popularity_count = 0;
                
                // Combos are always available (no stock-out for combos yet)
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
                $combo->color = null;
                $combo->nutrition = null;
            }
            
            // Merge combos with regular menu items
            $allItems = array_merge($items, $combos);
            
            // Get all enabled categories
            $categoriesQuery = "
                SELECT category_id as id, name, priority 
                FROM {$p}categories 
                WHERE status = 1 
                ORDER BY priority ASC, name ASC
            ";
            $categories = DB::select($categoriesQuery);
            
            // Add "Combos" category if it doesn't exist and we have combos
            if (count($combos) > 0) {
                $hasCombosCategory = false;
                foreach ($categories as $cat) {
                    if ($cat->name === 'Combos') {
                        $hasCombosCategory = true;
                        break;
                    }
                }
                if (!$hasCombosCategory) {
                    $categories[] = (object)[
                        'id' => 'combos',
                        'name' => 'Combos',
                        'priority' => 999
                    ];
                }
            }
            
            $setupStatus = $this->getFrontendSetupStatus($allItems, $categories);

            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $allItems,
                    'categories' => $categories,
                    'is_frontend_configured' => $setupStatus['is_frontend_configured'],
                    'setup_status' => $setupStatus['setup_status'],
                    'menu_highlight_settings' => $this->getMenuHighlightSettings(),
                    'menu_cache_version' => $this->getMenuHighlightCacheVersion(),
                    'menu_api_version' => 'menu-highlights-v2'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch menu',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function getOrderedMenuImagesByMenuIds(array $menuIds): array
    {
        if (empty($menuIds) || !Schema::hasTable('menu_images')) {
            return [];
        }

        $rows = DB::table('menu_images')
            ->whereIn('menu_id', $menuIds)
            ->orderBy('menu_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['menu_id', 'image_path']);

        $grouped = [];
        foreach ($rows as $row) {
            $url = trim((string)$row->image_path);
            if ($url === '') {
                continue;
            }
            // PMD_GALLERY_IMAGE_URL_FIX_START
            // Additional menu images are stored as upload filenames/paths, not thumb attachment hashes.
            // Upload files are publicly served from /assets/media/uploads or /assets/media.
            if (preg_match('#^https?://#i', $url)) {
                // keep full URL
            } else {
                $url = ltrim($url, '/');

                if (str_starts_with($url, 'api/media/')) {
                    $url = '/'.$url;
                } elseif (str_starts_with($url, 'assets/media/')) {
                    $url = '/'.$url;
                } elseif (str_starts_with($url, 'attachments/public/')) {
                    $url = '/assets/media/'.$url;
                } elseif (str_starts_with($url, 'uploads/')) {
                    $url = '/assets/media/'.$url;
                } else {
                    $url = '/assets/media/uploads/'.$url;
                }
            }
            // PMD_GALLERY_IMAGE_URL_FIX_END
            $grouped[(int)$row->menu_id][] = $url;
        }
        return $grouped;
    }

    /**
     * Get all menu items (flat list)
     */
    public function items(Request $request)
    {
        try {
            $query = DB::table('menus')
                ->leftJoin('menu_categories', 'menus.menu_id', '=', 'menu_categories.menu_id')
                ->leftJoin('categories', 'menu_categories.category_id', '=', 'categories.category_id')
                ->where('menus.menu_status', 1)
                ->select([
                    'menus.menu_id as id',
                    'menus.menu_name as name',
                    'menus.menu_description as description',
                    'menus.menu_price as price',
                    DB::raw('COALESCE(menus.prep_time_minutes, 15) as prep_time_minutes'),
                    'menus.menu_photo as image',
                    'menus.stock_qty',
                    'menus.minimum_qty',
                    'menus.is_halal as halal',
                    'menus.is_vegetarian as vegetarian',
                    'menus.is_vegan as vegan',
                    DB::raw($this->getNutritionColumnExpression('calories', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('protein', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('carbs', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('fat', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('sugar', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('serving_size', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('color', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('is_chef_recommended', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('is_manual_bestseller', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('bestseller_override_mode', 'menus')),
                    'categories.category_id',
                    'categories.name as category_name'
                ]);

            // Filter by category if provided
            if ($request->has('category_id')) {
                $query->where('categories.category_id', $request->category_id);
            }

            // Search functionality
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('menus.menu_name', 'like', "%{$search}%")
                      ->orWhere('menus.menu_description', 'like', "%{$search}%");
                });
            }

            $recommendationContext = $this->getRecommendationContext();
            $items = $query->get()->map(function ($item) use ($recommendationContext) {
                $this->normalizeFoodAttributes($item);
                $this->normalizeNutrition($item);
                $this->applyRecommendationMetadata($item, $recommendationContext['auto_ids'], $recommendationContext['counts']);

                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'description' => $item->description,
                    'price' => (float)$item->price,
                    'image' => $item->image ? asset('uploads/' . $item->image) : null,
                    'category_id' => $item->category_id,
                    'category_name' => $item->category_name,
                    'stock_qty' => $item->stock_qty,
                    'minimum_qty' => $item->minimum_qty ?? 1,
                    'available' => $item->stock_qty > 0,
                    'halal' => $item->halal,
                    'vegetarian' => $item->vegetarian,
                    'vegan' => $item->vegan,
                    'allergens' => $item->allergens,
                    'allergy_tags' => $item->allergy_tags,
                    'calories' => $item->calories,
                    'protein' => $item->protein,
                    'carbs' => $item->carbs,
                    'fat' => $item->fat,
                    'sugar' => $item->sugar,
                    'serving_size' => $item->serving_size,
                    'color' => $item->color,
                    'nutrition' => $item->nutrition,
                    'is_chef_recommended' => (bool)$item->is_chef_recommended,
                    'is_manual_bestseller' => (bool)$item->is_manual_bestseller,
                    'bestseller_override_mode' => $item->bestseller_override_mode,
                    'is_bestseller' => (bool)$item->is_bestseller,
                    'bestseller_source' => $item->bestseller_source,
                    'popularity_count' => (int)$item->popularity_count
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch menu items',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get menu items by category
     */
    public function itemsByCategory($categoryId)
    {
        try {
            $category = DB::table('categories')
                ->where('category_id', $categoryId)
                ->where('status', 1)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Category not found'
                ], 404);
            }

            $items = DB::table('menus')
                ->join('menu_categories', 'menus.menu_id', '=', 'menu_categories.menu_id')
                ->where('menu_categories.category_id', $categoryId)
                ->where('menus.menu_status', 1)
                ->select([
                    'menus.menu_id as id',
                    'menus.menu_name as name',
                    'menus.menu_description as description',
                    'menus.menu_price as price',
                    DB::raw('COALESCE(menus.prep_time_minutes, 15) as prep_time_minutes'),
                    'menus.menu_photo as image',
                    'menus.stock_qty',
                    'menus.minimum_qty',
                    'menus.is_halal as halal',
                    'menus.is_vegetarian as vegetarian',
                    'menus.is_vegan as vegan',
                    DB::raw($this->getNutritionColumnExpression('calories', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('protein', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('carbs', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('fat', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('sugar', 'menus')),
                    DB::raw($this->getNutritionColumnExpression('serving_size', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('color', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('is_chef_recommended', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('is_manual_bestseller', 'menus')),
                    DB::raw($this->getOptionalMenuColumnExpression('bestseller_override_mode', 'menus'))
                ])
                ->get();

            $recommendationContext = $this->getRecommendationContext();
            $items = $items->map(function ($item) use ($recommendationContext) {
                $this->normalizeFoodAttributes($item);
                $this->normalizeNutrition($item);
                $this->applyRecommendationMetadata($item, $recommendationContext['auto_ids'], $recommendationContext['counts']);

                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'description' => $item->description,
                        'price' => (float)$item->price,
                        'image' => $item->image ? asset('uploads/' . $item->image) : null,
                        'stock_qty' => $item->stock_qty,
                        'minimum_qty' => $item->minimum_qty ?? 1,
                        'available' => $item->stock_qty > 0,
                        'halal' => $item->halal,
                        'vegetarian' => $item->vegetarian,
                        'vegan' => $item->vegan,
                        'allergens' => $item->allergens,
                        'allergy_tags' => $item->allergy_tags,
                        'calories' => $item->calories,
                        'protein' => $item->protein,
                        'carbs' => $item->carbs,
                        'fat' => $item->fat,
                        'sugar' => $item->sugar,
                        'serving_size' => $item->serving_size,
                        'color' => $item->color,
                        'nutrition' => $item->nutrition,
                        'is_chef_recommended' => (bool)$item->is_chef_recommended,
                        'is_manual_bestseller' => (bool)$item->is_manual_bestseller,
                        'bestseller_override_mode' => $item->bestseller_override_mode,
                        'is_bestseller' => (bool)$item->is_bestseller,
                        'bestseller_source' => $item->bestseller_source,
                        'popularity_count' => (int)$item->popularity_count
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => [
                        'id' => $category->category_id,
                        'name' => $category->name,
                        'description' => $category->description,
                        'image' => $category->image ? asset('uploads/' . $category->image) : null,
                    ],
                    'items' => $items,
                    'total' => $items->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch category items',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get table-specific menu (matching old API structure)
     */
    public function getTableMenu(Request $request)
    {
        $tableId = $request->get('table_id');
        
        if (!$tableId) {
            return response()->json([
                'error' => 'table_id is required'
            ], 400);
        }

        try {
            // Get table info
            $tableInfo = DB::table('tables')
                ->where('table_id', $tableId)
                ->first();

            if (!$tableInfo) {
                return response()->json([
                    'error' => 'Table not found'
                ], 404);
            }

            // Get menu items (reuse the index method logic)
            $menuResponse = $this->index($request);
            $menuData = json_decode($menuResponse->getContent(), true);

            if (!$menuData['success']) {
                throw new \Exception('Failed to fetch menu data');
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'table' => [
                        'table_id' => $tableInfo->table_id,
                        'table_name' => $tableInfo->table_name,
                        'location_id' => $tableInfo->location_id,
                        'min_capacity' => $tableInfo->min_capacity,
                        'max_capacity' => $tableInfo->max_capacity,
                        'table_status' => $tableInfo->table_status
                    ],
                    'menu_items' => $menuData['data']['items'],
                    'categories' => $menuData['data']['categories'],
                    'menu_highlight_settings' => $menuData['data']['menu_highlight_settings'] ?? $this->getMenuHighlightSettings(),
                    'menu_cache_version' => $menuData['data']['menu_cache_version'] ?? $this->getMenuHighlightCacheVersion(),
                    'menu_api_version' => $menuData['data']['menu_api_version'] ?? 'menu-highlights-v2'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch table menu',
                'message' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Normalize dietary flags and allergen labels for API consumers.
     */
    private function normalizeFoodAttributes(&$item)
    {
        $allergyTags = [];

        if (isset($item->allergy_names) && strlen((string)$item->allergy_names) > 0) {
            $allergyTags = array_values(array_filter(explode('||', (string)$item->allergy_names)));
            unset($item->allergy_names);
        } elseif (isset($item->allergens) && is_array($item->allergens)) {
            $allergyTags = $item->allergens;
        } elseif (isset($item->id)) {
            $allergyTags = $this->getAllergyTags((int)$item->id);
        }

        $item->halal = (bool)($item->halal ?? $item->is_halal ?? 0);
        $item->vegetarian = (bool)($item->vegetarian ?? $item->is_vegetarian ?? 0);
        $item->vegan = (bool)($item->vegan ?? $item->is_vegan ?? 0);
        $item->allergens = $allergyTags;
        $item->allergy_tags = $allergyTags;
    }


    /**
     * Get active allergen names for endpoints built with the query builder.
     */
    private function getAllergyTags($menuId)
    {
        return DB::table('allergenables')
            ->join('allergens', 'allergens.allergen_id', '=', 'allergenables.allergen_id')
            ->where('allergenables.allergenable_id', $menuId)
            ->whereIn('allergenables.allergenable_type', ['menus', 'Admin\Models\Menus_model'])
            ->where('allergens.status', 1)
            ->orderBy('allergens.name')
            ->distinct()
            ->pluck('allergens.name')
            ->all();
    }


    /**
     * Build a raw SELECT fragment for optional nutrition columns.
     */
    private function getRecommendationContext(): array
    {
        $bestsellerStats = app(MenuPopularityService::class)->bestsellerStats();

        return [
            'auto_ids' => array_flip($bestsellerStats['ids']),
            'counts' => $bestsellerStats['counts'],
        ];
    }

    private function getFrontendSetupStatus(array $items, array $categories): array
    {
        $hasCategories = count($categories) > 0;
        $hasMenuItems = count($items) > 0;
        $hasLogo = false;
        $hasCustomSettings = false;

        if (Schema::hasTable('settings')) {
            $columns = Schema::getColumnListing('settings');
            $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
            $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);
            if ($keyColumn && $valueColumn) {
                $settings = DB::table('settings')
                    ->whereIn($keyColumn, ['site_logo', 'site_name', 'mail_from_address'])
                    ->get()
                    ->keyBy($keyColumn);
                $logoValue = trim((string)($settings['site_logo']->{$valueColumn} ?? ''));
                $siteNameValue = trim((string)($settings['site_name']->{$valueColumn} ?? ''));
                $mailValue = trim((string)($settings['mail_from_address']->{$valueColumn} ?? ''));
                $hasLogo = $logoValue !== '' && stripos($logoValue, 'default') === false && stripos($logoValue, 'placeholder') === false;
                $hasCustomSettings = ($siteNameValue !== '' && strcasecmp($siteNameValue, 'PayMyDine') !== 0) || $mailValue !== '';
            }
        }

        return [
            'is_frontend_configured' => $hasCategories || $hasMenuItems || $hasLogo || $hasCustomSettings,
            'setup_status' => [
                'has_categories' => $hasCategories,
                'has_menu_items' => $hasMenuItems,
                'has_logo' => $hasLogo,
                'has_custom_settings' => $hasCustomSettings,
            ],
        ];
    }

    private function getMenuHighlightSettings(): array
    {
        $defaults = [
            'chef_section_enabled' => true,
            'bestseller_section_enabled' => true,
            'show_card_badges' => true,
            'show_modal_badges' => true,
            'chef_label' => "Chef’s Choice",
            'bestseller_label' => 'Best Seller',
            'max_chef_items' => 8,
            'max_bestseller_items' => 8,
            'badge_style' => 'premium',
            'section_placement' => 'after_categories',
        ];

        if (!Schema::hasTable('settings')) {
            return $defaults;
        }

        $keys = [
            'pmd_menu_highlights_chef_section_enabled',
            'pmd_menu_highlights_bestseller_section_enabled',
            'pmd_menu_highlights_show_card_badges',
            'pmd_menu_highlights_show_modal_badges',
            'pmd_menu_highlights_chef_label',
            'pmd_menu_highlights_bestseller_label',
            'pmd_menu_highlights_max_chef_items',
            'pmd_menu_highlights_max_bestseller_items',
            'pmd_menu_highlights_badge_style',
            'pmd_menu_highlights_section_placement',
        ];
        $columns = Schema::getColumnListing('settings');
        $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
        $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);
        if (!$keyColumn || !$valueColumn) {
            return $defaults;
        }

        $rows = DB::table('settings')
            ->whereIn($keyColumn, $keys)
            ->get()
            ->keyBy($keyColumn);

        $bool = fn($key, $fallback) => filter_var($rows[$key]->{$valueColumn} ?? $fallback, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool)$fallback;
        $int = function ($key, $fallback) use ($rows, $valueColumn) {
            $value = (int)($rows[$key]->{$valueColumn} ?? $fallback);
            return max(1, min(24, $value));
        };
        $text = fn($key, $fallback) => trim((string)($rows[$key]->{$valueColumn} ?? $fallback)) ?: $fallback;

        $badgeStyle = $text('pmd_menu_highlights_badge_style', $defaults['badge_style']);
        if (!in_array($badgeStyle, ['compact', 'ribbon', 'premium'], true)) $badgeStyle = 'premium';

        $placement = $text('pmd_menu_highlights_section_placement', $defaults['section_placement']);
        if (!in_array($placement, ['top', 'after_categories', 'hidden'], true)) $placement = 'after_categories';

        return [
            'chef_section_enabled' => $bool('pmd_menu_highlights_chef_section_enabled', true),
            'bestseller_section_enabled' => $bool('pmd_menu_highlights_bestseller_section_enabled', true),
            'show_card_badges' => $bool('pmd_menu_highlights_show_card_badges', true),
            'show_modal_badges' => $bool('pmd_menu_highlights_show_modal_badges', true),
            'chef_label' => $text('pmd_menu_highlights_chef_label', $defaults['chef_label']),
            'bestseller_label' => $text('pmd_menu_highlights_bestseller_label', $defaults['bestseller_label']),
            'max_chef_items' => $int('pmd_menu_highlights_max_chef_items', 8),
            'max_bestseller_items' => $int('pmd_menu_highlights_max_bestseller_items', 8),
            'badge_style' => $badgeStyle,
            'section_placement' => $placement,
        ];
    }

    private function getMenuHighlightCacheVersion(): string
    {
        if (!Schema::hasTable('settings')) {
            return 'default';
        }

        $columns = Schema::getColumnListing('settings');
        $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
        if (!$keyColumn) {
            return 'default';
        }

        if (in_array('updated_at', $columns, true)) {
            $updatedAt = DB::table('settings')
                ->where($keyColumn, 'like', 'pmd_menu_highlights_%')
                ->max('updated_at');

            return $updatedAt ? (string)$updatedAt : 'default';
        }

        return sha1(json_encode(DB::table('settings')
            ->where($keyColumn, 'like', 'pmd_menu_highlights_%')
            ->pluck(in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : $keyColumn), $keyColumn)
            ->all()));
    }

    private function applyRecommendationMetadata(&$item, array $autoBestsellerIds, array $popularityCounts): void
    {
        $menuId = (int)($item->id ?? $item->menu_id ?? 0);
        $overrideMode = (string)($item->bestseller_override_mode ?? 'auto');
        $manualBestseller = (bool)($item->is_manual_bestseller ?? false);
        $autoBestseller = $menuId > 0 && isset($autoBestsellerIds[$menuId]);

        $isBestseller = false;
        $source = null;
        if ($overrideMode === 'force_off') {
            $isBestseller = false;
        } elseif ($overrideMode === 'force_on' || $manualBestseller) {
            $isBestseller = true;
            $source = 'manual';
        } elseif ($autoBestseller) {
            $isBestseller = true;
            $source = 'auto';
        }

        $item->is_chef_recommended = (bool)($item->is_chef_recommended ?? false);
        $item->is_manual_bestseller = $manualBestseller;
        $item->bestseller_override_mode = in_array($overrideMode, ['auto', 'force_on', 'force_off'], true) ? $overrideMode : 'auto';
        $item->is_bestseller = $isBestseller;
        $item->bestseller_source = $source;
        $item->popularity_count = $popularityCounts[$menuId] ?? 0;
    }

    private function getNutritionRawSelect($tableAlias)
    {
        return implode(",
                    ", array_map(function ($column) use ($tableAlias) {
            return $this->getNutritionColumnExpression($column, $tableAlias);
        }, ['calories', 'protein', 'carbs', 'fat', 'sugar', 'serving_size']));
    }

    /**
     * Return a safe aliased expression even before tenant migrations have run.
     */
    private function getNutritionColumnExpression($column, $tableAlias = 'menus')
    {
        return $this->getOptionalMenuColumnExpression($column, $tableAlias);
    }

    /**
     * Return a safe aliased expression for optional menu columns before all tenants migrate.
     */
    private function getOptionalMenuColumnExpression($column, $tableAlias = 'menus')
    {
        if (Schema::hasColumn('menus', $column)) {
            return $tableAlias.'.'.$column.' as '.$column;
        }

        return 'NULL as '.$column;
    }

    /**
     * Normalize optional restaurant-provided nutrition estimates for API consumers.
     */
    private function normalizeNutrition(&$item)
    {
        $numericFields = ['protein', 'carbs', 'fat', 'sugar'];

        $item->calories = isset($item->calories) && $item->calories !== null && $item->calories !== ''
            ? (int)$item->calories
            : null;

        foreach ($numericFields as $field) {
            $item->{$field} = isset($item->{$field}) && $item->{$field} !== null && $item->{$field} !== ''
                ? (float)$item->{$field}
                : null;
        }

        $item->serving_size = isset($item->serving_size) && $item->serving_size !== ''
            ? (string)$item->serving_size
            : null;

        $hasNutrition = $item->calories !== null
            || $item->protein !== null
            || $item->carbs !== null
            || $item->fat !== null
            || $item->sugar !== null
            || $item->serving_size !== null;

        $item->color = isset($item->color) && preg_match('/^#(?:[0-9a-fA-F]{3}){1,2}$/', (string)$item->color)
            ? (string)$item->color
            : null;

        $item->nutrition = $hasNutrition ? [
            'calories' => $item->calories,
            'protein' => $item->protein,
            'carbs' => $item->carbs,
            'fat' => $item->fat,
            'sugar' => $item->sugar,
            'serving_size' => $item->serving_size,
            'disclaimer' => 'Restaurant-provided estimates. Values may vary by portion size, ingredients, and preparation.',
        ] : null;
    }

    /**
     * Get menu options for a specific menu item
     */
    private function getMenuItemOptions($menuId)
    {
        try {
            $p = DB::connection()->getTablePrefix();
            $optionsQuery = "
                SELECT 
                    mo.option_id as id,
                    mo.option_name as name,
                    mo.display_type,
                    mio.required,
                    mio.priority
                FROM {$p}menu_options mo
                INNER JOIN {$p}menu_item_options mio ON mo.option_id = mio.option_id
                WHERE mio.menu_id = ?
                ORDER BY mio.priority ASC, mo.option_name ASC
            ";
            
            $options = DB::select($optionsQuery, [$menuId]);
            
            // For each option, get its values
            foreach ($options as &$option) {
                $valuesQuery = "
                    SELECT 
                        mov.option_value_id as id,
                        mov.value,
                        mov.new_price as price,
                        mov.is_default
                    FROM {$p}menu_option_values mov
                    INNER JOIN {$p}menu_item_option_values miov ON mov.option_value_id = miov.option_value_id
                    INNER JOIN {$p}menu_item_options mio ON miov.menu_option_id = mio.menu_option_id
                    WHERE mio.menu_id = ? AND mio.option_id = ?
                    ORDER BY miov.priority ASC, mov.value ASC
                ";
                
                $values = DB::select($valuesQuery, [$menuId, $option->id]);
                
                // Convert prices to float
                foreach ($values as &$value) {
                    $value->price = (float)$value->price;
                }
                
                $option->values = $values;
            }
            
            return $options;
            
        } catch (\Exception $e) {
            // Return empty array if there's an error fetching options
            return [];
        }
    }
} 
