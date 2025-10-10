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
            $query = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as price,
                    COALESCE(c.name, 'Main') as category_name,
                    ma.name as image
                FROM ti_menus m
                LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
                LEFT JOIN ti_categories c ON mc.category_id = c.category_id
                LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
                    AND ma.attachment_id = m.menu_id 
                    AND ma.tag = 'thumb'
                WHERE m.menu_status = 1
                ORDER BY c.priority ASC, m.menu_name ASC
            ";
            
            $items = DB::select($query);
            
            // Convert prices to float and fix image paths
            foreach ($items as &$item) {
                $item->price = (float)$item->price;
                if ($item->image) {
                    // If image exists, construct the relative URL for Next.js proxy
                    $item->image = "/api/media/" . $item->image;
                } else {
                    // Use default image if none exists
                    $item->image = '/images/pasta.png';
                }
            }
            
            // Get all enabled categories
            $categoriesQuery = "
                SELECT category_id as id, name, priority 
                FROM ti_categories 
                WHERE status = 1 
                ORDER BY priority ASC, name ASC
            ";
            $categories = DB::select($categoriesQuery);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $items,
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
            $query = DB::table('ti_menus')
                ->leftJoin('ti_menu_categories', 'ti_menus.menu_id', '=', 'ti_menu_categories.menu_id')
                ->leftJoin('ti_categories', 'ti_menu_categories.category_id', '=', 'ti_categories.category_id')
                ->where('ti_menus.menu_status', 1)
                ->select([
                    'ti_menus.menu_id as id',
                    'ti_menus.menu_name as name',
                    'ti_menus.menu_description as description',
                    'ti_menus.menu_price as price',
                    'ti_menus.menu_photo as image',
                    'ti_menus.stock_qty',
                    'ti_menus.minimum_qty',
                    'ti_categories.category_id',
                    'ti_categories.name as category_name'
                ]);

            // Filter by category if provided
            if ($request->has('category_id')) {
                $query->where('ti_categories.category_id', $request->category_id);
            }

            // Search functionality
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('ti_menus.menu_name', 'like', "%{$search}%")
                      ->orWhere('ti_menus.menu_description', 'like', "%{$search}%");
                });
            }

            $items = $query->get()->map(function ($item) {
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
                    'available' => $item->stock_qty > 0
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
            $category = DB::table('ti_categories')
                ->where('category_id', $categoryId)
                ->where('status', 1)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Category not found'
                ], 404);
            }

            $items = DB::table('ti_menus')
                ->join('ti_menu_categories', 'ti_menus.menu_id', '=', 'ti_menu_categories.menu_id')
                ->where('ti_menu_categories.category_id', $categoryId)
                ->where('ti_menus.menu_status', 1)
                ->select([
                    'ti_menus.menu_id as id',
                    'ti_menus.menu_name as name',
                    'ti_menus.menu_description as description',
                    'ti_menus.menu_price as price',
                    'ti_menus.menu_photo as image',
                    'ti_menus.stock_qty',
                    'ti_menus.minimum_qty'
                ])
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'description' => $item->description,
                        'price' => (float)$item->price,
                        'image' => $item->image ? asset('uploads/' . $item->image) : null,
                        'stock_qty' => $item->stock_qty,
                        'minimum_qty' => $item->minimum_qty ?? 1,
                        'available' => $item->stock_qty > 0
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
            $tableInfo = DB::table('ti_tables')
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
} 
