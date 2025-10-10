=== routes.php (LINES 1-600) ===
<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use App\Admin\Controllers\NotificationsApiController;
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
        // Utility functions for Cashier table management
        if (!function_exists('resolveCashierTableId')) {
            function resolveCashierTableId($locationId = 1) {
            try {
                    // Look for existing Cashier table
                    $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
                
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
                        $cashierTableId = DB::table('tables')->insertGetId([
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

        if (!function_exists('buildCashierTableUrl')) {
            function buildCashierTableUrl($locationId = 1) {
            try {
                $cashierTableId = resolveCashierTableId($locationId);
                if (!$cashierTableId) {
                    return null;
                }

                    // Get table_no for the cashier table
                    $cashierTable = DB::table('tables')->where('table_id', $cashierTableId)->first();
                if (!$cashierTable) {
                    return null;
                }

                $request = request();
                $frontendUrl = $request->getScheme() . '://' . $request->getHost();
                $date = date('Y-m-d');
                $time = date('H:i');

                $tableNumber = ($cashierTable->table_no > 0) ? $cashierTable->table_no : $cashierTableId;
                
                return rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?' . http_build_query([
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
                            WHEN statuses.status_name = "Preparation" THEN "preparing"
                            WHEN statuses.status_name = "Received" THEN "received"
                            WHEN statuses.status_name = "Pending" THEN "pending"
                            WHEN statuses.status_name = "Delivery" THEN "delivery"
                            WHEN statuses.status_name = "Completed" THEN "completed"
                            WHEN statuses.status_name = "Canceled" THEN "canceled"
                            WHEN statuses.status_name = "Paid" THEN "paid"
                            ELSE LOWER(REPLACE(statuses.status_name, " ", "-"))
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
                
                $frontendUrl = $request->getScheme() . '://' . $request->getHost();
                $url = rtrim($frontendUrl, '/').'/cashier?'.http_build_query([
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
                $table = DB::table('tables')->where('table_id', $tableId)->first();
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

            // Build QR code URL (same logic as in tables/edit.blade.php)
            $request = request();
            $frontendUrl = $request->getScheme() . '://' . $request->getHost();
                
            $tableNumber = ($table->table_no > 0) ? $table->table_no : $tableId;
                
                $qrUrl = rtrim($frontendUrl, '/') . '/table/' . $tableNumber . '?' . http_build_query([
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

// Frontend API Routes - These are loaded by TastyIgniter's routing system
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api', 'detect.tenant']
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
    'middleware' => ['web', 'detect.tenant']
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
            $p = DB::connection()->getTablePrefix();
            $query = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as price,
                    COALESCE(c.name, 'Main') as category_name,
                    ma.name as image
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
                FROM {$p}categories 
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
                    $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
                if ($cashierTable && $request->table_id == $cashierTable->table_id) {
                    $isCashier = true;
                }
            }
            
            $validationRules = [
                'customer_name' => 'required|string|max:255',
                'items' => 'required|array|min:1',
                'items.*.menu_id' => 'required|integer|exists:menus,menu_id',
                'items.*.name' => 'required|string|max:255',
