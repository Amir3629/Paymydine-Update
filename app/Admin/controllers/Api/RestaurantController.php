<?php

namespace Admin\Controllers\Api;

use Admin\Models\Menus_model;
use Admin\Models\Categories_model;
use Admin\Models\Locations_model;
use Illuminate\Http\Request;
use System\Classes\BaseController;

class RestaurantController extends BaseController
{
    public function __construct()
    {
        parent::__construct();
        
        // Enable CORS for frontend requests
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }

    public function getRestaurantInfo($locationId)
    {
        try {
            $location = Locations_model::findOrFail($locationId);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $location->location_id,
                    'name' => $location->location_name,
                    'address' => $location->location_address_1,
                    'city' => $location->location_city,
                    'state' => $location->location_state,
                    'postcode' => $location->location_postcode,
                    'telephone' => $location->location_telephone,
                    'description' => $location->description,
                    'openingHours' => $location->hours,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Restaurant not found'
            ], 404);
        }
    }

    public function getMenu($locationId)
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
                AND (c.frontend_visible = 1 OR c.frontend_visible IS NULL)
                ORDER BY m.menu_name
            ";
            
            $items = \DB::select($query);
            
            // Convert prices to float and fix image paths
            foreach ($items as &$item) {
                $item->price = (float)$item->price;
                if ($item->image) {
                    // If image exists, construct the full URL
                    $item->image = url("/api/v1/images?file=" . urlencode($item->image));
                } else {
                    // Use default image if none exists
                    $item->image = '/images/pasta.png';
                }
            }
            
            // Get all enabled categories
            $categoriesQuery = "
                SELECT DISTINCT 
                    c.category_id,
                    c.name as category_name,
                    c.description,
                    c.frontend_visible
                FROM ti_categories c
                INNER JOIN ti_menu_categories mc ON c.category_id = mc.category_id
                INNER JOIN ti_menus m ON mc.menu_id = m.menu_id
                WHERE c.status = 1 
                AND (c.frontend_visible = 1 OR c.frontend_visible IS NULL)
                AND m.menu_status = 1
                ORDER BY c.name
            ";
            $categories = \DB::select($categoriesQuery);
            
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
     * Get categories endpoint
     */
    public function getCategories($locationId)
    {
        try {
            $categoriesQuery = "
                SELECT DISTINCT 
                    c.category_id,
                    c.name as category_name,
                    c.description,
                    c.frontend_visible
                FROM ti_categories c
                INNER JOIN ti_menu_categories mc ON c.category_id = mc.category_id
                INNER JOIN ti_menus m ON mc.menu_id = m.menu_id
                WHERE c.status = 1 
                AND (c.frontend_visible = 1 OR c.frontend_visible IS NULL)
                AND m.menu_status = 1
                ORDER BY c.name
            ";
            $categories = \DB::select($categoriesQuery);
            
            return response()->json([
                'success' => true,
                'data' => $categories
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch categories',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get table info endpoint
     */
    public function getTableInfo(Request $request, $locationId)
    {
        $tableId = $request->get('table_id');
        $qrCode = $request->get('qr_code');
        
        if (!$tableId && !$qrCode) {
            return response()->json([
                'error' => 'table_id or qr_code is required'
            ], 400);
        }

        try {
            $whereClause = $tableId ? "table_id = ?" : "qr_code = ?";
            $param = $tableId ?: $qrCode;
            
            $table = \DB::table('tables')
                ->whereRaw($whereClause, [$param])
                ->where('table_status', 1)
                ->first();

            if (!$table) {
                return response()->json([
                    'error' => 'Table not found'
                ], 404);
            }

            // Build tenant-aware frontend URL using the location ID passed in route
            try {
                $frontendUrl = buildTenantFrontendUrl($locationId, "/menu/table-{$table->table_id}");
            } catch (\Exception $e) {
                // Fallback if location has no permalink_slug
                $frontendUrl = "http://" . request()->getHost() . "/menu/table-{$table->table_id}";
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'table_id' => $table->table_id,
                    'table_name' => $table->table_name,
                    'qr_code' => $table->qr_code,
                    'location_id' => $table->location_id,
                    'min_capacity' => $table->min_capacity,
                    'max_capacity' => $table->max_capacity,
                    'table_status' => $table->table_status,
                    'frontend_url' => $frontendUrl
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch table info',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get table menu endpoint
     */
    public function getTableMenu(Request $request, $locationId)
    {
        $tableId = $request->get('table_id');
        
        if (!$tableId) {
            return response()->json([
                'error' => 'table_id is required'
            ], 400);
        }

        try {
            // Get table info
            $tableInfo = \DB::table('tables')
                ->where('table_id', $tableId)
                ->first();

            if (!$tableInfo) {
                return response()->json([
                    'error' => 'Table not found'
                ], 404);
            }

            // Get menu items (reuse the getMenu method logic)
            $menuResponse = $this->getMenu($locationId);
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
