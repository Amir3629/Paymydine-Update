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
        // Tenant-aware URL resolution helper
        if (!function_exists('resolveFrontendUrlForLocation')) {
            function resolveFrontendUrlForLocation(int $locationId): string
            {
                // 1) ALWAYS use tenant domain from middleware
                $tenant = app()->bound('tenant') ? app('tenant') : null;
                if ($tenant && !empty($tenant->domain)) {
                    $scheme = request()->isSecure() ? 'https' : 'http';
                    return "{$scheme}://{$tenant->domain}";
                }

                // 2) If middleware not set, query ti_tenants directly from current host
                $host = request()->getHost();
                $tenantFromDb = DB::connection('mysql')->table('tenants')
                    ->where('domain', $host)
                    ->where('status', 'active')
                    ->first();
                
                if ($tenantFromDb && !empty($tenantFromDb->domain)) {
                    $scheme = request()->isSecure() ? 'https' : 'http';
                    return "{$scheme}://{$tenantFromDb->domain}";
                }

                // 3) FAIL LOUDLY - no fallback to 'default'
                throw new \RuntimeException(
                    "Cannot build URL: No tenant detected. Please ensure you're accessing via tenant domain (e.g., mimoza.paymydine.com)"
                );
            }
        }

        // Utility functions for Cashier table management
        if (!function_exists('resolveCashierTableId')) {
            function resolveCashierTableId($locationId = 1)
            {
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
            function buildCashierTableUrl($locationId = 1)
            {
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

                    // FIXED: Use tenant-aware URL resolution
                    $frontendUrl = resolveFrontendUrlForLocation($locationId);
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
                
                // FIXED: Use tenant-aware URL resolution
                $frontendUrl = resolveFrontendUrlForLocation($locationId);
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

            // FIXED: Use tenant domain from database (same logic as other routes)
            $frontendUrl = resolveFrontendUrlForLocation($locationId);
                
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
// Route::group([
//     'prefix' => 'api/v1',
//     'namespace' => 'Admin\Controllers\Api',
//     'middleware' => ['api']
// ], function () {
//     Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
//     Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
//     // Route::post('webhooks/pos', 'PosWebhookController@handle')->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
//     // Order endpoints
//     Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
//     Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
//     Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
// });

// Custom API Routes for frontend (no tenant required)
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web']
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
            // Get price context from query parameter (default, bar, dining_room, room_service, happy_hour)
            $priceType = request()->get('price_type', 'default');
            
            // Get menu items with categories (matching old API structure)
            $query = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as base_price,
                    COALESCE(c.name, 'Main') as category_name,
                    ma.name as image
                FROM menus m
                LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
                LEFT JOIN categories c ON mc.category_id = c.category_id
                LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
                    AND ma.attachment_id = m.menu_id 
                    AND ma.tag = 'thumb'
                WHERE m.menu_status = 1
                ORDER BY c.priority ASC, m.menu_name ASC
            ";
            
            $items = DB::select($query);
            
            // Load Menu_prices_model for price calculation
            $menuPricesModel = new \Admin\Models\Menu_prices_model();
            
            // Convert prices to float, fix image paths, and get context-specific prices
            foreach ($items as &$item) {
                // Get context-specific price
                $contextPrice = \Admin\Models\Menu_prices_model::getPriceForContext(
                    $item->id, 
                    $priceType
                );
                
                // Use context price if available, otherwise use base price
                $item->price = $contextPrice !== null ? (float)$contextPrice : (float)$item->base_price;
                $item->base_price = (float)$item->base_price;
                
                if ($item->image) {
                    // If image exists, construct the full URL
                    $item->image = "/api/media/" . $item->image;
                } else {
                    // Use default image if none exists
                    $item->image = '/images/pasta.png';
                }
                
                // Fetch menu options for this item
                if (function_exists('getMenuItemOptions')) {
                    $item->options = getMenuItemOptions($item->id);
                }
            }
            
            // Get all enabled categories
            $categoriesQuery = "
                SELECT category_id as id, name, priority 
                FROM categories 
                WHERE status = 1 
                ORDER BY priority ASC, name ASC
            ";
            $categories = DB::select($categoriesQuery);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $items,
                    'categories' => $categories,
                    'price_context' => $priceType
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
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.price' => 'required|numeric|min:0',
                'total_amount' => 'required|numeric|min:0',
                'payment_method' => 'required|in:cash,card,paypal'
            ];
            
            // Only require table_id and table_name if not in cashier mode
            if (!$isCashier) {
                $validationRules['table_id'] = 'required|string|max:50';
                $validationRules['table_name'] = 'required|string|max:100';
            }
            
            $request->validate($validationRules);

            DB::beginTransaction();

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
                'payment' => $request->payment_method,
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
                'value' => $request->payment_method,
                'priority' => 0
            ]);

            DB::commit();

            \Log::info('API: Order submitted', ['order_id' => $orderId]);
                        
            syncOrderToPOS($orderId);

            \Log::info('API: Order sync to POS initiated', ['order_id' => $orderId]);

            // Create notification for new order (with received status)
            try {
                if (\App\Helpers\SettingsHelper::areNewOrderNotificationsEnabled()) {
                    $notificationData = [
                        'tenant_id' => 1,
                        'order_id' => $orderId,
                        'table_id' => $request->table_id,
                        'status' => 'received',
                        'status_name' => 'Received',
                        'message' => 'New order received',
                        'priority' => 'high'
                    ];
                    
                    // Include table_name if available
                    if ($request->has('table_name') && !empty($request->table_name)) {
                        $notificationData['table_name'] = $request->table_name;
                    }
                    
                    \App\Helpers\NotificationHelper::createOrderNotification($notificationData);
                }
            } catch (\Exception $e) {
                // Log notification error but don't fail the order
                \Log::warning('Failed to create new order notification', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage()
                ]);
            }

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
            $table = DB::table('tables')
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
            $table = DB::table('tables')
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
                return DB::transaction(function () use ($request, $tenantId) {
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
                return DB::transaction(function () use ($request, $tenantId) {
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

        // Sales  History
        Route::get('history', [\Admin\Controllers\History::class, 'index'])
            ->name('admin.history');
    });

    // === Admin Notifications API (JSON) ===
    // Place AFTER the closing brace of the large Route::group([...]) in this file.
    Route::group(['prefix' => 'admin/notifications-api'], function () {
        Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
        Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
        Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
        Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
    });

}); // Close App::before function

// Back-compat for admin bell widget (no api/v1 prefix)
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});

Route::middleware(['web'])->prefix('admin/webhook/pos')->group(function () {
    Route::post('webhook/pos', [\Admin\Controllers\PosWebhookController::class, 'handle'])
        ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
});
