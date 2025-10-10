<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
App::before(function () {
    /*
     * Register Admin app routes
     *
     * The Admin app intercepts all URLs
     * prefixed with /admin.
     */
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        // Register Assets Combiner routes
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

        // Other pages
        Route::any('{slug}', 'System\Classes\Controller@runAdmin')
            ->where('slug', '(.*)?');
    });

    // Admin entry point
    Route::any(config('system.adminUri', 'admin'), 'System\Classes\Controller@runAdmin');
    Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
 
    
    Route::get('/new', [SuperAdminController::class, 'showNewPage'])
        ->name('superadmin.new')
        ->middleware('superadmin.auth') // Protect this route
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        Route::get('/index', [SuperAdminController::class, 'showIndex'])
        ->name('superadmin.index')
        ->middleware('superadmin.auth') // Protect this route
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        Route::get('/settings', [SuperAdminController::class, 'settings'])
        ->name('superadmin.settings')
        ->middleware('superadmin.auth') // Protect this route
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    

        Route::match(['get', 'post'], '/new/store', [SuperAdminController::class, 'store'])
        ->name('superadmin.store')
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

        Route::match(['get', 'post'], '/tenants/update', [SuperAdminController::class, 'update'])
        ->name('tenants.update')
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        Route::get('/tenants/delete/{id}', [SuperAdminController::class, 'delete'])
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

        Route::get('/superadmin/login', [SuperAdminController::class, 'login'])
        ->name('login.new')
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        
Route::post('/superadmin/sign', [SuperAdminController::class, 'sign'])
->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/superadmin/signout', [SuperAdminController::class, 'signOut'])
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

    Route::post('/superadmin/settings/update', [SuperAdminController::class, 'updateSettings'])->name('superadmin.update') 
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    Route::post('/tenant/update-status', function (Request $request) {
        $id = $request->input('id');
        $status = $request->input('status') === 'activate' ? 'active' : 'disabled';
    
        $updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);
    
        if ($updated) {
            return response()->json(['success' => true]);
        } else {
            return response()->json(['success' => false, 'error' => 'Failed to update']);
        }
    })->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
});

// Frontend API Routes
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
    Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
    Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
    
    // Order endpoints
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});

// Custom API Routes for menu and categories (no tenant required)
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
], function () {
    // Menu endpoints
    Route::get('/menu', function () {
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
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch menu',
                'message' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        }
    });

    // Media serving route for images
    Route::get('/media/{path}', function ($path) {
        // Remove any query parameters
        $path = explode('?', $path)[0];
        
        // First try the direct path (as stored in database)
        $mediaPath = base_path('assets/media/attachments/public/' . $path);
        
        if (!file_exists($mediaPath)) {
            // If not found, search recursively for the filename
            $filename = basename($path);
            $searchPath = base_path('assets/media/attachments/public');
            
            $foundPath = null;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($searchPath, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            
            foreach ($iterator as $file) {
                if ($file->getFilename() === $filename) {
                    $foundPath = $file->getPathname();
                    break;
                }
            }
            
            if ($foundPath) {
                $mediaPath = $foundPath;
            }
        }
        
        if (file_exists($mediaPath)) {
            $mimeType = mime_content_type($mediaPath);
            return response()->file($mediaPath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000'
            ]);
        } else {
            // Fallback to pasta.png if image not found
            $fallbackPath = public_path('images/pasta.png');
            if (file_exists($fallbackPath)) {
                return response()->file($fallbackPath, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=31536000'
                ]);
            } else {
                abort(404);
            }
        }
    })->where('path', '.*');
    
    Route::get('/menu/categories', function () {
        try {
            $categories = DB::table('categories')
                ->where('status', 1)
                ->orderBy('priority')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $categories->map(function ($category) {
                    return [
                        'id' => $category->category_id,
                        'name' => $category->name,
                        'description' => $category->description,
                        'priority' => $category->priority,
                        'status' => $category->status,
                        'created_at' => $category->created_at,
                        'updated_at' => $category->updated_at,
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch categories',
                'message' => $e->getMessage()
            ], 500);
        }
    });
    
    Route::get('/menu/items', function (Request $request) {
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
    });
    
    Route::get('/menu/categories/{categoryId}/items', function ($categoryId) {
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
                    'menus.minimum_qty'
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
    });
    
    // Categories endpoints
    Route::get('/categories', function () {
        try {
            $categories = DB::table('categories')
                ->where('status', 1)
                ->orderBy('priority')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $categories->map(function ($category) {
                    return [
                        'id' => $category->category_id,
                        'name' => $category->name,
                        'description' => $category->description,
                        'priority' => $category->priority,
                        'status' => $category->status,
                        'created_at' => $category->created_at,
                        'updated_at' => $category->updated_at,
                    ];
                })
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch categories',
                'message' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        }
    });
    
    Route::get('/categories/{categoryId}', function ($categoryId) {
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

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $category->category_id,
                    'name' => $category->name,
                    'description' => $category->description,
                    'priority' => $category->priority,
                    'status' => $category->status,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch category',
                'message' => $e->getMessage()
            ], 500);
        }
    });
    
    // Restaurant info endpoint
    Route::get('/restaurant', function () {
        $restaurant = DB::table('locations')->first();
        
        return response()->json([
            'id' => 1,
            'name' => $restaurant->location_name ?? 'PayMyDine',
            'description' => $restaurant->description ?? '',
            'address' => $restaurant->location_address_1 ?? '',
            'phone' => $restaurant->location_telephone ?? '',
            'email' => $restaurant->location_email ?? '',
            'settings' => [
                'currency' => $restaurant->location_currency ?? 'USD',
                'timezone' => $restaurant->location_timezone ?? 'UTC',
                'delivery_enabled' => (bool)($restaurant->offer_delivery ?? false),
                'pickup_enabled' => (bool)($restaurant->offer_collection ?? false),
            ]
        ]);
    });
    
    // Settings endpoint
    Route::get('/settings', function () {
        $settings = DB::table('settings')->get()->keyBy('item');
        
        return response()->json([
            'site_name' => $settings['site_name']->value ?? 'PayMyDine',
            'site_logo' => $settings['site_logo']->value ?? '',
            'default_currency' => $settings['default_currency']->value ?? 'USD',
            'default_language' => $settings['default_language']->value ?? 'en',
            'order_prefix' => $settings['invoice_prefix']->value ?? '#',
            'guest_order' => $settings['guest_order']->value ?? '1',
        ]);
    });
});

// Image serving endpoint (matching old API structure)
Route::get('/api/images', function () {
    $filename = request()->get('file');
    if (empty($filename)) {
        abort(404);
    }
    
    // Extract hash directories from filename (e.g., 688a367fbc700218826107.jpg -> 688/a36/7fb)
    if (preg_match('/^(\w{3})(\w{3})(\w{3})/', $filename, $matches)) {
        $hash1 = $matches[1];
        $hash2 = $matches[2];
        $hash3 = $matches[3];
        $imagePath = storage_path("app/public/assets/media/attachments/public/{$hash1}/{$hash2}/{$hash3}/{$filename}");
    } else {
        // Fallback to direct path
        $imagePath = storage_path('app/public/assets/media/attachments/public/' . $filename);
    }
    
    if (file_exists($imagePath)) {
        $mimeType = mime_content_type($imagePath);
        return response()->file($imagePath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=31536000'
        ]);
    } else {
        // Fallback to pasta.png
        $fallbackPath = public_path('images/pasta.png');
        if (file_exists($fallbackPath)) {
            return response()->file($fallbackPath, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'public, max-age=31536000'
            ]);
        } else {
            abort(404);
        }
    }
});