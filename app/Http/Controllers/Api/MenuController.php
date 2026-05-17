<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            $query = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as price,
                    COALESCE(c.name, 'Main') as category_name,
                    ma.name as image,
                    COALESCE(m.is_stock_out, 0) as is_stock_out,
                    COALESCE(m.is_halal, 0) as halal,
                    COALESCE(m.is_vegetarian, 0) as vegetarian,
                    COALESCE(m.is_vegan, 0) as vegan,
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
            
            // Convert prices to float, fix image paths, and add options
            foreach ($items as &$item) {
                $item->price = (float)$item->price;
                $this->normalizeFoodAttributes($item);
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
                
                // Combos are always available (no stock-out for combos yet)
                $combo->is_stock_out = false;
                $combo->available = true;
                $combo->halal = false;
                $combo->vegetarian = false;
                $combo->vegan = false;
                $combo->allergens = [];
                $combo->allergy_tags = [];
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
            
            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $allItems,
                    'categories' => $categories
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
                    'menus.menu_photo as image',
                    'menus.stock_qty',
                    'menus.minimum_qty',
                    'menus.is_halal as halal',
                    'menus.is_vegetarian as vegetarian',
                    'menus.is_vegan as vegan',
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

            $items = $query->get()->map(function ($item) {
                $this->normalizeFoodAttributes($item);

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
                    'allergy_tags' => $item->allergy_tags
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
                    'menus.menu_photo as image',
                    'menus.stock_qty',
                    'menus.minimum_qty',
                    'menus.is_halal as halal',
                    'menus.is_vegetarian as vegetarian',
                    'menus.is_vegan as vegan'
                ])
                ->get()
                ->map(function ($item) {
                    $this->normalizeFoodAttributes($item);

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
                        'allergy_tags' => $item->allergy_tags
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
                    'categories' => $menuData['data']['categories']
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
