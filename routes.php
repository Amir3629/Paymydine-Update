<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use App\Admin\Controllers\NotificationsApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
        // Utility functions for Cashier table management
        if (!function_exists('resolveCashierTableId')) {
            function resolveCashierTableId($locationId = 1) {
            try {
                // Look for existing Cashier table
                $cashierTable = DB::table('ti_tables')->where('table_name', 'Cashier')->first();
                
                if ($cashierTable) {
                    // Check if it's linked to the location
                    $locationLink = DB::table('locationables')
                        ->where('locationable_id', $cashierTable->table_id)
                        ->where('locationable_type', 'tables')
                        ->where('location_id', $locationId)
                        ->first();
                    
                    if (!$locationLink) {
                        // Link to the location
                        DB::table('locationables')->insert([
                            'location_id' => $locationId,
                            'locationable_id' => $cashierTable->table_id,
                            'locationable_type' => 'tables',
                            'options' => null,
                        ]);
                    }
                    
                    return $cashierTable->table_id;
                } else {
                    // Create Cashier table if it doesn't exist
                    $cashierTableId = DB::table('ti_tables')->insertGetId([
                        'table_name' => 'Cashier',
                        'min_capacity' => 1,
                        'max_capacity' => 1,
                        'table_status' => 1,
                        'extra_capacity' => 0,
                        'is_joinable' => 0,
                        'priority' => 999,
                        'created_at' => now(),
                        'updated_at' => now(),
                        'qr_code' => 'cashier',
                    ]);

                    // Link to the location
                    DB::table('locationables')->insert([
                        'location_id' => $locationId,
                        'locationable_id' => $cashierTableId,
                        'locationable_type' => 'tables',
                        'options' => null,
                    ]);

                    return $cashierTableId;
                }
            } catch (\Throwable $e) {
                \Log::error('Failed to resolve Cashier table: ' . $e->getMessage());
                return null;
            }
            }
        }

        /**
         * Build tenant-aware frontend URL using location's permalink_slug
         * NOTE: This is a duplicate of the function in app/admin/routes.php
         * Both are kept for compatibility with different route contexts
         */
        if (!function_exists('buildTenantFrontendUrl')) {
            function buildTenantFrontendUrl(int $locationId, string $path = '', array $qs = []): string
            {
                $slug = DB::table('ti_locations')->where('location_id', $locationId)->value('permalink_slug');
                if (!$slug) {
                    throw new \Exception("Location {$locationId} missing permalink_slug");
                }
                $scheme = request()->isSecure() ? 'https' : 'http';
                $base   = env('SUBDOMAIN_BASE', 'paymydine.com');
                $url = "{$scheme}://{$slug}.{$base}" . ($path ? '/' . ltrim($path, '/') : '');
                return $qs ? $url . '?' . http_build_query($qs) : $url;
            }
        }

        if (!function_exists('buildCashierTableUrl')) {
            function buildCashierTableUrl($locationId = 1) {
                try {
                    $cashierTableId = resolveCashierTableId($locationId);
                    if (!$cashierTableId) {
                        return null;
                    }

                    // Get table_no for the cashier table
                    $cashierTable = DB::table('ti_tables')->where('table_id', $cashierTableId)->first();
                    if (!$cashierTable) {
                        return null;
                    }

                    $date = date('Y-m-d');
                    $time = date('H:i');

                    $tableNumber = ($cashierTable->table_no > 0) ? $cashierTable->table_no : $cashierTableId;
                
                    // Use tenant-aware URL builder
                    return buildTenantFrontendUrl($locationId, "/table/{$tableNumber}", [
                        'location' => $locationId,
                        'guest' => 1,
                        'date' => $date,
                        'time' => $time,
                        'qr' => 'cashier',
                        'table' => $tableNumber
                    ]);
                } catch (\Throwable $e) {
                    \Log::error('Failed to build Cashier table URL: ' . $e->getMessage());
                    return null;
                }
            }
        }

        // Register Assets Combiner routes
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

        // Get table statuses for the order create page
        Route::get('/orders/get-table-statuses', function () {
            try {
                $tableStatuses = DB::table('orders')
                    ->join('statuses', 'orders.status_id', '=', 'statuses.status_id')
                    ->join('tables', 'orders.order_type', '=', 'tables.table_id')
                    ->select(
                        'tables.table_name',
                        'statuses.status_name',
                        DB::raw('CASE 
                            WHEN ti_statuses.status_name = "Preparation" THEN "preparing"
                            WHEN ti_statuses.status_name = "Received" THEN "received"
                            WHEN ti_statuses.status_name = "Pending" THEN "pending"
                            WHEN ti_statuses.status_name = "Delivery" THEN "delivery"
                            WHEN ti_statuses.status_name = "Completed" THEN "completed"
                            WHEN ti_statuses.status_name = "Canceled" THEN "canceled"
                            WHEN ti_statuses.status_name = "Paid" THEN "paid"
                            ELSE LOWER(REPLACE(ti_statuses.status_name, " ", "-"))
                        END as status_class')
                    )
                    ->where('orders.status_id', '!=', 10) // Exclude paid orders
                    ->orderBy('orders.created_at', 'desc')
                    ->get()
                    ->groupBy('table_name')
                    ->map(function ($orders) {
                        return $orders->first(); // Get the most recent order for each table
                    })
                    ->values();

                return response()->json([
                    'success' => true,
                    'statuses' => $tableStatuses
                ]);
            } catch (Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ]);
            }
        });

        // Get cashier URL for frontend cashier mode
        Route::get('/orders/get-cashier-url', function (Request $request) {
            try {
                $locationId = (int) $request->get('location_id', 1);
                
                // Use tenant-aware URL builder
                $url = buildTenantFrontendUrl($locationId, '/cashier', [
                    'location' => $locationId,
                    'mode'     => 'cashier',
                ]);

                return response()->json([
                    'success' => true,
                    'url'     => $url,
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'error'   => $e->getMessage(),
                ], 500);
            }
        })->name('admin.orders.getCashierUrl');

        // Get storefront URL (redirects to Cashier table)
        Route::get('/storefront-url', function (Request $request) {
            try {
                $locationId = (int) $request->get('location_id', 1);
                $url = buildCashierTableUrl($locationId);
                
                if ($url) {
                    return redirect($url);
                } else {
                    // Fallback to normal storefront
                    return redirect(root_url());
                }
            } catch (\Throwable $e) {
                \Log::error('Failed to get storefront URL: ' . $e->getMessage());
                return redirect(root_url());
            }
        })->name('admin.storefrontUrl');

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



    // Save table layout for the order create page
    Route::post('/orders/save-table-layout', function (Request $request) {
        try {
            $layout = $request->input('layout');
            
            if (!$layout || !is_array($layout)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid layout data'
                ]);
            }

            // Save layout to database or session
            // For now, we'll just return success
            // You can implement actual saving logic here
            
            return response()->json([
                'success' => true,
                'message' => 'Layout saved successfully',
                'layout' => $layout
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
                })->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

        // Get table QR code URL for frontend menu integration
        Route::get('/orders/get-table-qr-url', function (Request $request) {
            try {
                $tableId = $request->get('table_id');
                if (!$tableId) {
                    return response()->json([
                        'success' => false,
                        'error' => 'table_id is required'
                    ]);
                }

                // Get table data
                $table = DB::table('ti_tables')->where('table_id', $tableId)->first();
                if (!$table) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Table not found'
                    ]);
                }

                // Get location data
                $locationData = DB::table('locationables')
                    ->where('locationable_id', $tableId)
                    ->where('locationable_type', 'tables')
                    ->first();
                    
                $locationId = $locationData ? $locationData->location_id : 1;
                $maxCapacity = $table->max_capacity ?? 3;
                $date = date('Y-m-d');
                $time = date('H:i');

                $tableNumber = ($table->table_no > 0) ? $table->table_no : $tableId;
                
                // Use tenant-aware URL builder
                $qrUrl = buildTenantFrontendUrl($locationId, "/table/{$tableNumber}", [
                    'location' => $locationId,
                    'guest' => $maxCapacity,
                    'date' => $date,
                    'time' => $time,
                    'qr' => $table->qr_code,
                    'table' => $tableNumber
                ]);

                return response()->json([
                    'success' => true,
                    'qr_url' => $qrUrl,
                    'table_data' => [
                        'table_id' => $table->table_id,
                        'table_name' => $table->table_name,
                        'qr_code' => $table->qr_code,
                        'location_id' => $locationId,
                        'max_capacity' => $maxCapacity
                    ]
                ]);
            } catch (Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ]);
            }
        })->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
        });

/*
 * Menu/food images: ensure /api/media/{path} is always registered (production may not load app/main/routes.php).
 * Same logic as app/main/routes.php so GET /api/media/693/397/25b/69339725b3dde927159940.png returns the file.
 */
Route::group(['prefix' => 'api', 'middleware' => [\App\Http\Middleware\CorsMiddleware::class]], function () {
    Route::get('/media/{path}', function ($path) {
        $path = explode('?', $path)[0];
        $filename = basename($path);
        $pathWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
        $originalExt = pathinfo($filename, PATHINFO_EXTENSION);
        $extensions = array_unique(array_filter(array_merge(
            $originalExt ? [$originalExt] : [],
            ['webp', 'jpg', 'jpeg', 'png']
        )));

        $basePaths = [
            base_path('assets/media/attachments/public'),
            storage_path('app/public/assets/media/attachments/public'),
        ];

        $tryDirect = function ($base) use ($path) {
            $full = rtrim($base, '/') . '/' . ltrim($path, '/');
            return file_exists($full) ? $full : null;
        };

        $tryHashDir = function ($base, $disk, $extList) {
            $p1 = substr($disk, 0, 3);
            $p2 = substr($disk, 3, 3);
            $p3 = substr($disk, 6, 3);
            $dir = rtrim($base, '/') . '/' . $p1 . '/' . $p2 . '/' . $p3 . '/';
            if (!is_dir($dir)) {
                return null;
            }
            foreach ($extList as $ext) {
                $full = $dir . $disk . '.' . $ext;
                if (file_exists($full)) {
                    return $full;
                }
            }
            return null;
        };

        $searchRecursive = function ($base, $filename, $disk = null) {
            if (!is_dir($base)) {
                return null;
            }
            try {
                $iterator = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($base, \RecursiveDirectoryIterator::SKIP_DOTS)
                );
                foreach ($iterator as $file) {
                    if (!$file->isFile()) {
                        continue;
                    }
                    if ($file->getFilename() === $filename) {
                        return $file->getPathname();
                    }
                    if ($disk !== null && pathinfo($file->getFilename(), PATHINFO_FILENAME) === $disk) {
                        return $file->getPathname();
                    }
                }
            } catch (\Exception $e) {
                //
            }
            return null;
        };

        $mediaPath = null;
        foreach ($basePaths as $base) {
            $mediaPath = $tryDirect($base);
            if ($mediaPath) {
                break;
            }
        }

        if (!$mediaPath && strlen($pathWithoutExt) >= 9 && ctype_alnum($pathWithoutExt)) {
            foreach ($basePaths as $base) {
                $mediaPath = $tryHashDir($base, $pathWithoutExt, $extensions);
                if ($mediaPath) {
                    break;
                }
            }
        }

        if (!$mediaPath) {
            foreach ($basePaths as $base) {
                $mediaPath = $searchRecursive($base, $filename, strlen($pathWithoutExt) >= 9 ? $pathWithoutExt : null);
                if ($mediaPath) {
                    break;
                }
            }
        }

        if ($mediaPath) {
            $mimeType = mime_content_type($mediaPath);
            return response()->file($mediaPath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000'
            ]);
        }

        $fallbackPaths = [
            base_path('images/loader.png'),
            base_path('images/logo.png'),
            public_path('images/pasta.png'),
        ];
        foreach ($fallbackPaths as $fallbackPath) {
            if ($fallbackPath && file_exists($fallbackPath)) {
                return response()->file($fallbackPath, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=3600'
                ]);
            }
        }
        $onePixelPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        return response($onePixelPng, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    })->where('path', '.*');
});

// Frontend API Routes - These are loaded by TastyIgniter's routing system
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

// Custom API Routes for frontend (TENANT REQUIRED)
Route::group([
    'prefix' => 'api/v1',
    'middleware' => [\App\Http\Middleware\CorsMiddleware::class, 'web', 'detect.tenant']
], function () {
    // === Payments (read-only) ===
    Route::get('/payments', function () {
        // Only return enabled methods in priority order
        $payments = \Admin\Models\Payments_model::isEnabled()
            ->orderBy('priority')
            ->get(['code', 'name', 'priority']);

        return response()->json([
            'success' => true,
            'data' => $payments,
        ], 200);
    });

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
                    // If image exists, construct the full URL
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
    });

    // Categories endpoints
    Route::get('/categories', function () {
        try {
            $categories = DB::table('categories')
                ->where('status', 1)
                ->orderBy('priority', 'asc')
                ->get()
                ->map(function ($category) {
                    return [
                        'id' => $category->category_id,
                        'name' => $category->name,
                        'description' => $category->description ?? '',
                        'image' => $category->image ? asset('uploads/' . $category->image) : null
                    ];
                });

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
    });

    // Image serving endpoint
    Route::get('/images', function () {
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

    // Restaurant info endpoint
    Route::get('/restaurant', function () {
        try {
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

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch restaurant info',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Settings endpoint
    Route::get('/settings', function () {
        try {
            $settings = DB::table('settings')->get()->keyBy('item');
            
            return response()->json([
                'site_name' => $settings['site_name']->value ?? 'PayMyDine',
                'site_logo' => $settings['site_logo']->value ?? '',
                'default_currency' => $settings['default_currency']->value ?? 'USD',
                'default_language' => $settings['default_language']->value ?? 'en',
                'order_prefix' => $settings['invoice_prefix']->value ?? '#',
                'guest_order' => $settings['guest_order']->value ?? '1',
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch settings',
                'message' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }
    });



    // Order submission endpoint
    Route::post('/orders', function (Request $request) {
        try {
            // Validate request data to match frontend structure
            $isCashier = $request->has('is_cashier') && $request->is_cashier;
            
            // Also check if this is a cashier table order
            if (!$isCashier && $request->has('table_id')) {
                $cashierTable = DB::table('ti_tables')->where('table_name', 'Cashier')->first();
                if ($cashierTable && $request->table_id == $cashierTable->table_id) {
                    $isCashier = true;
                }
            }
            
            $validationRules = [
                'customer_name' => 'required|string|max:255',
                'items' => 'required|array|min:1',
                'items.*.menu_id' => 'required|integer|exists:menus,menu_id',
                'items.*.name' => 'required|string|max:255',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.price' => 'required|numeric|min:0',
                'total_amount' => 'required|numeric|min:0',
                'payment_method' => 'required|in:cash,card,paypal,qr_pay_later'
            ];
            
            // Only require table_id and table_name if not in cashier mode
            if (!$isCashier) {
                $validationRules['table_id'] = 'required|string|max:50';
                $validationRules['table_name'] = 'required|string|max:100';
            }
            
            $request->validate($validationRules);

            DB::beginTransaction();

            $resolvedPaymentMethod = strtolower((string)($request->payment_method_raw ?: $request->payment_method));

            // Prevent duplicate unpaid QR-pay-later order per table
            if (!$isCashier && $resolvedPaymentMethod === 'qr_pay_later') {
                $paidStatusId = (int)(DB::table('statuses')
                    ->whereRaw('LOWER(status_name) = ?', ['paid'])
                    ->value('status_id') ?? 10);

                $existingUnpaid = DB::table('orders')
                    ->where('order_type', (string)$request->table_id)
                    ->where('payment', 'qr_pay_later')
                    ->where('status_id', '!=', $paidStatusId)
                    ->orderByDesc('order_id')
                    ->first();

                if ($existingUnpaid) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'error' => 'Pending QR payment order already exists for this table',
                        'existing_order_id' => (int)$existingUnpaid->order_id
                    ], 409);
                }
            }

            // Get next order number
            $orderNumber = DB::table('orders')->max('order_id') + 1;

            // Build order comment with table information or cashier mode
            $comment = '';
            if ($isCashier) {
                $comment .= "Cashier Order | ";
            } else {
                if ($request->has('table_id') && $request->table_id) {
                    $comment .= "Table ID: " . $request->table_id . " | ";
                }
                if ($request->has('table_name') && $request->table_name) {
                    $comment .= "Table: " . $request->table_name . " | ";
                }
            }
            if ($request->has('special_instructions') && $request->special_instructions) {
                $comment .= "Special Instructions: " . $request->special_instructions;
            }
            $comment = trim($comment, ' |');

            // Create main order record
            $orderId = DB::table('orders')->insertGetId([
                'order_id' => $orderNumber,
                'first_name' => $request->customer_name,
                'last_name' => 'Customer', // Default last name
                'email' => $request->customer_email ?? 'customer@example.com', // Default email
                'telephone' => $request->customer_phone ?? '0000000000', // Default phone
                'location_id' => 1, // Default location
                'order_type' => $isCashier ? 'cashier' : $request->table_id, // Store cashier or table_id
                'order_total' => $request->total_amount,
                'order_date' => now()->format('Y-m-d'),
                'order_time' => now()->format('H:i:s'),
                'status_id' => 1,
                'assignee_id' => null,
                'comment' => $comment,
                'processed' => 0,
                'payment' => $resolvedPaymentMethod,
                'total_items' => count($request->items),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent() ?? 'API Client',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Insert order items
            foreach ($request->items as $item) {
                $menuItem = DB::table('menus')
                    ->where('menu_id', $item['menu_id'])
                    ->where('menu_status', 1)
                    ->first();

                if (!$menuItem) {
                    throw new \Exception("Menu item with ID {$item['menu_id']} not found");
                }

                DB::table('order_menus')->insert([
                    'order_id' => $orderId,
                    'menu_id' => $item['menu_id'],
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['price'] * $item['quantity'],
                    'comment' => $item['special_instructions'] ?? ''
                ]);
            }

            // Store tip amount if provided
            if ($request->tip_amount && $request->tip_amount > 0) {
                DB::table('order_totals')->insert([
                    'order_id' => $orderId,
                    'code' => 'tip',
                    'title' => 'Tip',
                    'value' => $request->tip_amount,
                    'priority' => 0
                ]);
            }

            // Store payment method
            DB::table('order_totals')->insert([
                'order_id' => $orderId,
                'code' => 'payment_method',
                'title' => 'Payment Method',
                'value' => $resolvedPaymentMethod,
                'priority' => 0
            ]);

            DB::commit();

            // Return success response matching the expected format
            return response()->json([
                'success' => true,
                'order_id' => $orderId,
                'message' => 'Order placed successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to create order',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Order status endpoints
    Route::get('/orders/pending-qr', function (Request $request) {
        $tableId = trim((string)$request->get('table_id', ''));
        $tableNo = trim((string)$request->get('table_no', ''));
        $tableParam = trim((string)$request->get('table', ''));
        $qrInput = trim((string)$request->get('qr', ''));

        if ($tableId === '' && $tableNo === '' && $tableParam === '' && $qrInput === '') {
            return response()->json([
                'success' => false,
                'error' => 'table_id or table_no or table or qr is required'
            ], 422);
        }

        $paidStatusId = (int)(DB::table('statuses')
            ->whereRaw('LOWER(status_name) = ?', ['paid'])
            ->value('status_id') ?? 10);
        $hasSettlementColumns = Schema::hasColumn('orders', 'settlement_status')
            && Schema::hasColumn('orders', 'settled_amount');

        $table = null;
        $inputs = array_values(array_unique(array_filter([$tableId, $tableNo, $tableParam], fn($v) => $v !== '')));
        foreach ($inputs as $candidate) {
            $table = DB::table('tables')
                ->where('table_id', $candidate)
                ->orWhere('table_no', $candidate)
                ->first();
            if ($table) break;
        }
        if (!$table && $qrInput !== '') {
            $table = DB::table('tables')->where('qr_code', $qrInput)->first();
        }

        $candidates = array_values(array_unique(array_filter([
            $table ? (string)$table->table_id : null,
            $table ? (string)$table->table_no : null,
            $table ? (string)$table->table_name : null,
            $tableId,
            $tableNo,
            $tableParam,
        ], fn($v) => $v !== null && $v !== '')));

        $baseOrderQuery = DB::table('orders')
            ->where('payment', 'qr_pay_later')
            ->when($hasSettlementColumns, function ($q) {
                $q->where(function ($settlement) {
                    $settlement->whereNull('settlement_status')
                        ->orWhereNotIn('settlement_status', ['paid', 'cancelled', 'failed']);
                })->where(function ($amount) {
                    $amount->whereNull('settled_amount')
                        ->orWhereColumn('settled_amount', '<', 'order_total');
                });
            }, function ($q) use ($paidStatusId) {
                $q->where('status_id', '!=', $paidStatusId);
            });

        $order = null;
        $duplicateOpenOrderIds = [];
        if (!empty($candidates)) {
            $exactMatches = (clone $baseOrderQuery)
                ->whereIn('order_type', $candidates)
                ->orderByDesc('order_id')
                ->get();
            $order = $exactMatches->first();
            $duplicateOpenOrderIds = $exactMatches->pluck('order_id')->skip(1)->map(fn($id) => (int)$id)->values()->all();
        }

        if (!$order && !empty($candidates)) {
            $fallbackMatches = (clone $baseOrderQuery)
                ->where(function ($q) use ($candidates) {
                    foreach ($candidates as $candidate) {
                        $q->orWhere('comment', 'like', '%Table ID: ' . $candidate . '%');
                        $q->orWhere('comment', 'like', '%Table: ' . $candidate . '%');
                    }
                })
                ->orderByDesc('order_id')
                ->get();
            $order = $fallbackMatches->first();
            $duplicateOpenOrderIds = $fallbackMatches->pluck('order_id')->skip(1)->map(fn($id) => (int)$id)->values()->all();
        }

        if (!$order) {
            return response()->json([
                'success' => true,
                'data' => null
            ]);
        }

        $items = DB::table('order_menus')
            ->where('order_id', $order->order_id)
            ->get(['order_menu_id', 'menu_id', 'name', 'quantity', 'price', 'subtotal']);

        $orderTotal = (float)($order->order_total ?? 0);
        $settledAmount = $hasSettlementColumns ? (float)($order->settled_amount ?? 0) : 0.0;
        if ($settledAmount < 0) $settledAmount = 0.0;
        if ($settledAmount > $orderTotal && $orderTotal > 0) $settledAmount = $orderTotal;
        $remainingAmount = max(0, round($orderTotal - $settledAmount, 4));
        $settlementStatus = $hasSettlementColumns
            ? strtolower((string)($order->settlement_status ?? 'unpaid'))
            : 'unpaid';

        return response()->json([
            'success' => true,
            'data' => [
                'order_id' => (int)$order->order_id,
                'table_id' => (string)$order->order_type,
                'payment' => (string)$order->payment,
                'status_id' => (int)$order->status_id,
                'order_total' => $orderTotal,
                'settlement_status' => $settlementStatus,
                'settled_amount' => round($settledAmount, 4),
                'remaining_amount' => $remainingAmount,
                'duplicate_open_order_ids' => $duplicateOpenOrderIds,
                'items' => $items,
            ]
        ]);
    });

    Route::post('/orders/pay-existing', function (Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric|min:0.0001',
            'table_id' => 'nullable|string|max:50',
            'table_no' => 'nullable|string|max:50',
            'table' => 'nullable|string|max:50',
            'qr' => 'nullable|string|max:191',
            'selected_items' => 'nullable|array',
        ]);

        $paidStatusId = (int)(DB::table('statuses')
            ->whereRaw('LOWER(status_name) = ?', ['paid'])
            ->value('status_id') ?? 10);
        $hasSettlementColumns = Schema::hasColumn('orders', 'settlement_status')
            && Schema::hasColumn('orders', 'settled_amount');
        $normalizedPaymentMethod = strtolower((string)$request->payment_method);

        $result = DB::transaction(function () use ($request, $paidStatusId, $hasSettlementColumns, $normalizedPaymentMethod) {
            $order = DB::table('orders')
                ->where('order_id', $request->order_id)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                return ['error' => 'Order not found', 'status' => 404];
            }
            if (strtolower((string)$order->payment) !== 'qr_pay_later') {
                return ['error' => 'Only qr_pay_later orders can be paid through this endpoint', 'status' => 422];
            }

            $contextValues = array_values(array_unique(array_filter([
                trim((string)$request->input('table_id', '')),
                trim((string)$request->input('table_no', '')),
                trim((string)$request->input('table', '')),
            ], fn($value) => $value !== '')));
            $qrContext = trim((string)$request->input('qr', ''));
            if ($qrContext !== '') {
                $tableForQr = DB::table('tables')->where('qr_code', $qrContext)->first();
                if ($tableForQr) {
                    $contextValues = array_values(array_unique(array_filter(array_merge($contextValues, [
                        (string)$tableForQr->table_id,
                        (string)($tableForQr->table_no ?? ''),
                        (string)($tableForQr->table_name ?? ''),
                    ]), fn($value) => $value !== '')));
                }
            }
            if (!empty($contextValues)) {
                $orderType = (string)($order->order_type ?? '');
                $comment = (string)($order->comment ?? '');
                $contextMatches = in_array($orderType, $contextValues, true);
                if (!$contextMatches) {
                    foreach ($contextValues as $candidate) {
                        if (str_contains($comment, 'Table ID: '.$candidate) || str_contains($comment, 'Table: '.$candidate)) {
                            $contextMatches = true;
                            break;
                        }
                    }
                }
                if (!$contextMatches) {
                    return ['error' => 'Order does not belong to scanned table', 'status' => 409];
                }
            }

            $orderTotal = round((float)($order->order_total ?? 0), 4);
            $settledAmount = $hasSettlementColumns ? max(0, round((float)($order->settled_amount ?? 0), 4)) : 0.0;
            $settlementStatus = $hasSettlementColumns ? strtolower((string)($order->settlement_status ?? 'unpaid')) : 'unpaid';
            if (in_array($settlementStatus, ['cancelled', 'failed'], true)) {
                return ['error' => 'Order is not payable', 'status' => 422];
            }
            if (($hasSettlementColumns && ($settlementStatus === 'paid' || ($orderTotal > 0 && $settledAmount >= $orderTotal - 0.0001)))
                || (!$hasSettlementColumns && (int)$order->status_id === $paidStatusId)) {
                return [
                    'success' => true,
                    'order_id' => (int)$request->order_id,
                    'message' => 'Order is already paid',
                    'settlement_status' => 'paid',
                    'settled_amount' => $settledAmount ?: $orderTotal,
                    'remaining_amount' => 0.0,
                    'already_paid' => true,
                    'should_print_receipt' => false,
                ];
            }

            $update = [
                'status_id' => $paidStatusId,
                'processed' => 1,
                'updated_at' => now(),
            ];
            if ($hasSettlementColumns) {
                $update['settlement_status'] = 'paid';
                $update['settled_amount'] = $orderTotal;
                $update['settlement_method'] = $normalizedPaymentMethod;
                if ($request->filled('payment_reference')) $update['settlement_reference'] = (string)$request->payment_reference;
                if (Schema::hasColumn('orders', 'settled_at')) $update['settled_at'] = now();
            } else {
                $update['payment'] = $normalizedPaymentMethod;
            }

            DB::table('orders')->where('order_id', $request->order_id)->update($update);

            DB::table('order_totals')
                ->where('order_id', $request->order_id)
                ->where('code', 'payment_method')
                ->update(['value' => $normalizedPaymentMethod]);

            if ($request->filled('payment_reference')) {
                $exists = DB::table('order_totals')
                    ->where('order_id', $request->order_id)
                    ->where('code', 'payment_reference')
                    ->where('value', (string)$request->payment_reference)
                    ->exists();
                if (!$exists) {
                    DB::table('order_totals')->insert([
                        'order_id' => $request->order_id,
                        'code' => 'payment_reference',
                        'title' => 'Payment Reference',
                        'value' => (string)$request->payment_reference,
                        'priority' => 0
                    ]);
                }
            }

            return [
                'success' => true,
                'order_id' => (int)$request->order_id,
                'message' => 'Order paid successfully',
                'settlement_status' => 'paid',
                'settled_amount' => $orderTotal,
                'remaining_amount' => 0.0,
                'already_paid' => false,
                'should_print_receipt' => true,
            ];
        });

        if (!empty($result['error'])) {
            return response()->json(['success' => false, 'error' => $result['error']], $result['status'] ?? 500);
        }

        return response()->json($result);
    });

    Route::get('/order-status', function (Request $request) {
        $orderId = $request->get('order_id');
        
        if (!$orderId) {
            return response()->json([
                'error' => 'order_id is required'
            ], 400);
        }

        try {
            $order = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->select([
                    'orders.order_id',
                    'orders.status_id',
                    'statuses.status_name',
                    'orders.updated_at'
                ])
                ->first();

            if (!$order) {
                return response()->json([
                    'error' => 'Order not found'
                ], 404);
            }

            // Map status_id to customer-friendly status (matching frontend expectations)
            $statusMap = [
                1 => 'pending',
                2 => 'confirmed',
                3 => 'preparing',
                4 => 'ready',
                5 => 'delivered',
                6 => 'cancelled'
            ];

            // Map to frontend expected customer_status numbers (0=Kitchen, 1=Preparing, 2=On Way)
            $customerStatusMap = [
                1 => 0, // pending -> Kitchen
                2 => 0, // confirmed -> Kitchen
                3 => 1, // preparing -> Preparing
                4 => 2, // ready -> On Way
                5 => 2, // delivered -> On Way
                6 => 0  // cancelled -> Kitchen
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $order->order_id,
                    'status_id' => $order->status_id,
                    'status_name' => $statusMap[$order->status_id] ?? 'unknown',
                    'customer_status' => $customerStatusMap[$order->status_id] ?? 0,
                    'updated_at' => $order->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get order status',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    Route::post('/order-status', function (Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
            'status' => 'required|string|in:pending,confirmed,preparing,ready,delivered,cancelled'
        ]);

        try {
            $statusMap = [
                'pending' => 1,
                'confirmed' => 2,
                'preparing' => 3,
                'ready' => 4,
                'delivered' => 5,
                'cancelled' => 6
            ];

            $statusId = $statusMap[$request->status];

            $updated = DB::table('orders')
                ->where('order_id', $request->order_id)
                ->update([
                    'status_id' => $statusId,
                    'updated_at' => now()
                ]);

            if ($updated) {
                return response()->json([
                    'success' => true,
                    'message' => 'Order status updated successfully'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to update order status'
                ], 400);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update order status',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Table endpoints
    Route::get('/table-info', function (Request $request) {
        $tableId = $request->get('table_id');
        
        if (!$tableId) {
            return response()->json([
                'error' => 'table_id is required'
            ], 400);
        }

        try {
            $table = DB::table('ti_tables')
                ->where('table_id', $tableId)
                ->first();

            if (!$table) {
                return response()->json([
                    'error' => 'Table not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'table_id' => $table->table_id,
                    'table_name' => $table->table_name,
                    'location_id' => $table->location_id,
                    'status' => $table->status ?? 'available'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get table info',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Get current table info from URL parameters (for QR code system)
    Route::get('/current-table', function (Request $request) {
        try {
            // Get table info from URL parameters (set by QR redirect)
            $tableId = $request->get('table_id');
            $tableName = $request->get('table_name');
            
            if (!$tableId || !$tableName) {
                return response()->json([
                    'success' => false,
                    'error' => 'Table information not found in URL parameters'
                ], 400);
            }

            // Verify table exists in database
            $table = DB::table('ti_tables')
                ->where('table_id', $tableId)
                ->first();

            if (!$table) {
                return response()->json([
                    'success' => false,
                    'error' => 'Table not found in database'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'table_id' => $tableId,
                    'table_name' => $tableName,
                    'location_id' => $table->location_id ?? 1,
                    'status' => $table->status ?? 'available'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get current table info',
                'message' => $e->getMessage()
            ], 500);
        }
    });


// ------------ Admin JSON API for Notifications ------------
Route::group([
    'prefix' => 'admin',
    'middleware' => ['web', 'AdminAuthenticate'], // reuse existing admin auth alias
], function () {
    // Notifications API routes moved to bottom of file to avoid duplicates

});

// --- Public API Routes (outside admin group) ---
Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
    // Waiter call endpoint
    Route::post('/waiter-call', function (Request $request) {
        $request->validate([
            'table_id' => 'required|string',
            'message' => 'required|string|max:500'
        ]);
        
        try {
            // For testing, use a default tenant ID
            $tenantId = 1;
            
            // Use transaction for data consistency
            return DB::transaction(function() use ($request, $tenantId) {
                // Store waiter call
                $callId = DB::table('waiter_calls')->insertGetId([
                    'table_id' => $request->table_id,
                    'message' => $request->message,
                    'status' => 'new',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                // Get table info for notification
                $tableInfo = \App\Helpers\TableHelper::getTableInfo($request->table_id);
                $tableName = $tableInfo ? $tableInfo['table_name'] : "Table {$request->table_id}";
                
                // Create notification directly
                DB::table('notifications')->insert([
                    'type'       => 'waiter_call',
                    'title'      => "Waiter called from {$tableName}",
                    'table_id'   => (string)$request->table_id,
                    'table_name' => $tableName,
                    'payload'    => json_encode(['message' => $request->message]),
                    'status'     => 'new',
                    'created_at' => \Carbon\Carbon::now(),
                    'updated_at' => \Carbon\Carbon::now(),
                ]);
                
                return response()->json([
                    'ok' => true,
                    'message' => 'Waiter called successfully',
                    'id' => $callId,
                    'created_at' => now()->toISOString()
                ], 201);
            });
            
        } catch (\Exception $e) {
            \Log::error('Waiter call failed', [
                'error' => $e->getMessage(),
                'table_id' => $request->table_id,
                'tenant' => $tenantId ?? 'unknown'
            ]);
            
            return response()->json([
                'ok' => false,
                'error' => 'Failed to process waiter call'
            ], 500);
        }
    });
    
    
    // Table notes endpoint
    Route::post('/table-notes', function (Request $request) {
        $request->validate([
            'table_id' => 'required|string',
            'note' => 'required|string|max:500',
            'timestamp' => 'required|date'
        ]);
        
        try {
            // For testing, use a default tenant ID
            $tenantId = 1;
            
            // Use transaction for data consistency
            return DB::transaction(function() use ($request, $tenantId) {
                // Store table note
                $noteId = DB::table('table_notes')->insertGetId([
                    'table_id' => $request->table_id,
                    'note' => $request->note,
                    'timestamp' => $request->timestamp,
                    'status' => 'new',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                // Get table info for notification
                $tableInfo = \App\Helpers\TableHelper::getTableInfo($request->table_id);
                $tableName = $tableInfo ? $tableInfo['table_name'] : "Table {$request->table_id}";
                
                // Create notification directly
                DB::table('notifications')->insert([
                    'type'       => 'table_note',
                    'title'      => "Note from {$tableName}",
                    'table_id'   => (string)$request->table_id,
                    'table_name' => $tableName,
                    'payload'    => json_encode(['note' => $request->note]),
                    'status'     => 'new',
                    'created_at' => \Carbon\Carbon::now(),
                    'updated_at' => \Carbon\Carbon::now(),
                ]);
                
                return response()->json([
                    'ok' => true,
                    'message' => 'Note submitted successfully',
                    'id' => $noteId,
                    'created_at' => now()->toISOString()
                ], 201);
            });
            
        } catch (\Exception $e) {
            \Log::error('Table note failed', [
                'error' => $e->getMessage(),
                'table_id' => $request->table_id,
                'tenant' => $tenantId ?? 'unknown'
            ]);
            
            return response()->json([
                'ok' => false,
                'error' => 'Failed to process table note'
            ], 500);
        }
    });

    // Sales → History
    Route::get('history', [\Admin\Controllers\History::class, 'index'])
        ->name('admin.history');
});

// === Admin Notifications API (JSON) ===
// Place AFTER the closing brace of the large Route::group([...]) in this file.
Route::group(['prefix' => 'admin/notifications-api'], function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/',     [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}',[\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});

}); // Close App::before function

// Back-compat for admin bell widget (no api/v1 prefix)
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/',     [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});





/* FISKALY_CREATE_CLIENT_AJAX_START */
/* FISKALY_CREATE_CLIENT_AJAX_END */










/* === FISKALY_CREATE_CLIENT_AJAX_START === */

/* === FISKALY_CREATE_CLIENT_AJAX_END === */


/* === FISKALY_CREATE_CLIENT_AJAX_FINAL === */
/* === /FISKALY_CREATE_CLIENT_AJAX_FINAL === */

