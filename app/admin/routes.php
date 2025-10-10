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

                    // Tenant-aware frontend URL (inline, no helper class):
                    // Priority: tenant.frontend_url (DB) → config('app.url') → request scheme+host
                    $tenantFrontend = optional(app('tenant'))->frontend_url ?? null;
                    $configAppUrl   = config('app.url') ?? null;
                    $requestHost    = request()->getSchemeAndHttpHost();
                    $frontendUrl    = rtrim($tenantFrontend ?: $configAppUrl ?: $requestHost, '/');
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
                
                // Tenant-aware frontend URL (inline, no helper class):
                // Priority: tenant.frontend_url (DB) → config('app.url') → request scheme+host
                $tenantFrontend = optional(app('tenant'))->frontend_url ?? null;
                $configAppUrl   = config('app.url') ?? null;
                $requestHost    = request()->getSchemeAndHttpHost();
                $frontendUrl    = rtrim($tenantFrontend ?: $configAppUrl ?: $requestHost, '/');
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
            // Tenant-aware frontend URL (inline, no helper class):
            // Priority: tenant.frontend_url (DB) → config('app.url') → request scheme+host
            $tenantFrontend = optional(app('tenant'))->frontend_url ?? null;
            $configAppUrl   = config('app.url') ?? null;
            $requestHost    = request()->getSchemeAndHttpHost();
            $frontendUrl    = rtrim($tenantFrontend ?: $configAppUrl ?: $requestHost, '/');
                
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

// ============================================================================
// REMOVED DUPLICATE API ROUTES
// All /api/v1 routes are now canonical in routes.php with detect.tenant middleware
// All admin/notifications-api routes are canonical in routes.php
// This file now contains only:
//   1. Main admin UI routes (within App::before)
//   2. Superadmin tenant management routes  
//   3. Order notifications toggle route
// ============================================================================

// Order notifications toggle route
Route::middleware(['web', 'admin'])->group(function () {
    Route::post('/admin/statuses/toggle-order-notifications', [\Admin\Controllers\Statuses::class, 'toggleOrderNotifications']);
});
