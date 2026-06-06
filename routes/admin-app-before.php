<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use Admin\Controllers\StaffAuthController;
use Admin\Controllers\Biometricdevices;
use Admin\Controllers\BiometricDevicesAPI;
use Admin\Controllers\Api\CashDrawerController;
use Admin\Controllers\Api\PosAgentController;
use App\Admin\Controllers\NotificationsApiController;
use App\Admin\Classes\TerminalDevicesPlatformController;
use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;
require_once base_path('app/system/helpers/r2o_outbound_dryrun_helper.php');
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
                    ->where('status', 'new')
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

        // KDS Station Routes - Must be before the catch-all route
        Route::get('kitchendisplay/{stationSlug}', function ($stationSlug) {
            $controller = app()->make(\Admin\Controllers\KitchenDisplay::class);
            $controller->initialize();
            return $controller->index($stationSlug);
        })->where('stationSlug', '[a-z0-9\-]+');

        Route::post('kitchendisplay/{stationSlug}', function ($stationSlug) {
            $controller = app()->make(\Admin\Controllers\KitchenDisplay::class);
            $controller->initialize();

            // Handle AJAX requests (onRefresh, onUpdateStatus)
            $handler = request()->post('_handler');
            if ($handler === 'onRefresh') {
                return $controller->index_onRefresh();
            } elseif ($handler === 'onUpdateStatus') {
                return $controller->index_onUpdateStatus();
            }

            return $controller->index($stationSlug);
        })->where('stationSlug', '[a-z0-9\-]+');

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

        // Biometric device management routes - MUST BE BEFORE catch-all route
        // Note: Authentication is handled by controller's $requiredPermissions property
        Route::group(['prefix' => 'biometric_devices'], function () {
            // Note: device_management and enroll_staff are now integrated as tabs in the main index page
            // Keeping routes for backward compatibility, but they redirect to main page with tabs
            Route::get('/device_management', function() {
                return redirect(admin_url('biometric_devices?tab=management'));
            });
            Route::get('/enroll_staff', function() {
                return redirect(admin_url('biometric_devices?tab=enroll'));
            });

            // Device operations
            Route::post('/{id}/test-connection', [Biometricdevices::class, 'onTestConnection'])->name('biometric_devices.test_connection');
            Route::post('/{id}/sync-staff', [Biometricdevices::class, 'onSyncStaff'])->name('biometric_devices.sync_staff');
            Route::post('/{id}/sync-attendance', [Biometricdevices::class, 'onSyncAttendance'])->name('biometric_devices.sync_attendance');

            // Schedule routes
            Route::post('/schedule/store', [Biometricdevices::class, 'scheduleStore'])->name('biometric_devices.schedule_store');
            Route::get('/schedule/get/{id}', [Biometricdevices::class, 'scheduleGet'])->name('biometric_devices.schedule_get');
            Route::post('/schedule/update', [Biometricdevices::class, 'scheduleUpdate'])->name('biometric_devices.schedule_update');
            Route::post('/schedule/assign-staff', [Biometricdevices::class, 'scheduleAssignStaff'])->name('biometric_devices.schedule_assign_staff');

            // Report export routes
            Route::get('/report/export', [Biometricdevices::class, 'reportExport'])->name('biometric_devices.report_export');
        });

        // Biometric Devices API Routes - MUST BE BEFORE catch-all route
        Route::group(['prefix' => 'api/biometric'], function () {
            // Device Operations
            Route::get('devices', [BiometricDevicesAPI::class, 'index']);
            Route::get('devices/{id}', [BiometricDevicesAPI::class, 'show']);
            Route::post('devices/detect', [BiometricDevicesAPI::class, 'detect']);
            Route::post('devices/{id}/test', [BiometricDevicesAPI::class, 'testConnection']);
            Route::post('devices/{id}/ping', [BiometricDevicesAPI::class, 'pingDevice']);
            Route::post('devices/{id}/reconnect', [BiometricDevicesAPI::class, 'forceReconnect']);
            Route::get('devices/{id}/health', [BiometricDevicesAPI::class, 'checkHealth']);
            Route::get('devices/{id}/uptime', [BiometricDevicesAPI::class, 'getDeviceUptime']);

            // Sync Operations
            Route::post('devices/{id}/sync/attendance', [BiometricDevicesAPI::class, 'syncAttendance']);
            Route::post('devices/{id}/sync/staff', [BiometricDevicesAPI::class, 'syncStaff']);

            // Attendance Operations
            Route::post('attendance/manual', [BiometricDevicesAPI::class, 'manualAttendance']);

            // Enrollment Operations
            Route::post('devices/{id}/enroll', [BiometricDevicesAPI::class, 'enrollStaff']);
            Route::delete('devices/{id}/unenroll/{staffId}', [BiometricDevicesAPI::class, 'removeEnrollment']);

            // Staff Operations
            Route::get('staff', [BiometricDevicesAPI::class, 'getStaff']);
            Route::get('staff/{id}', [BiometricDevicesAPI::class, 'getStaffDetails']);
            Route::get('staff/{id}/enrollments', [BiometricDevicesAPI::class, 'getStaffEnrollments']);
            Route::post('staff/create-with-card', [BiometricDevicesAPI::class, 'createStaffWithCard']);

            // Card Operations
            Route::get('cards/assignments', [BiometricDevicesAPI::class, 'getCardAssignments']);
            Route::get('cards/unassigned', [BiometricDevicesAPI::class, 'getUnassignedCards']);
            Route::post('cards/assign', [BiometricDevicesAPI::class, 'assignCard']);
            Route::delete('cards/unassign/{id}', [BiometricDevicesAPI::class, 'unassignCard']);
            Route::post('devices/{id}/read-card', [BiometricDevicesAPI::class, 'readCard']);

            // Notifications
            Route::get('notifications', [BiometricDevicesAPI::class, 'getNotifications']);
            Route::post('notifications/{id}/read', [BiometricDevicesAPI::class, 'markNotificationRead']);
            Route::post('notifications/read-all', [BiometricDevicesAPI::class, 'markAllNotificationsRead']);

            // Dashboard & Status
            Route::get('dashboard', [BiometricDevicesAPI::class, 'getDashboard']);
            Route::get('status/realtime', [BiometricDevicesAPI::class, 'getRealTimeStatus']);
        });

        // Cash Drawer API Routes
        Route::group(['prefix' => 'api/cash-drawers'], function () {
            Route::post('{id}/open', [CashDrawerController::class, 'open']);
            Route::post('{id}/test', [CashDrawerController::class, 'test']);
            Route::get('{id}/status', [CashDrawerController::class, 'status']);
            Route::get('{id}/logs', [CashDrawerController::class, 'logs']);
            Route::post('location/{locationId}/open', [CashDrawerController::class, 'openForLocation']);
        });

        // Local POS agent routes (pilot)
        Route::group(['prefix' => 'api/pos-agent/commands'], function () {
            Route::get('pull', [PosAgentController::class, 'pull']);
            Route::match(['get', 'post'], '{id}/ack', [PosAgentController::class, 'ack']);
        });
        Route::post('api/pos-agent/pair', [PosAgentController::class, 'pair']);
        Route::get('cash_drawers/windows_connector/{id}', [\Admin\Controllers\CashDrawers::class, 'windowsConnector']);
        Route::get('cash_drawers/windows_connector_agent/{id}', [\Admin\Controllers\CashDrawers::class, 'windowsConnectorAgent']);

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


    // Backward-compatible alias
    Route::match(['get', 'post'], '/new/store', [SuperAdminController::class, 'store'])
    ->name('superadmin.store')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

    // Backward-compatible alias
    Route::match(['get', 'post'], '/tenants/update', [SuperAdminController::class, 'update'])
    ->name('tenants.update')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

    // Backward-compatible alias
    Route::get('/tenants/delete/{id}', [SuperAdminController::class, 'delete'])
    ->name('tenants.delete')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

    Route::post('/superadmin/settings/update', [SuperAdminController::class, 'updateSettings'])->name('superadmin.update')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

    // Backward-compatible alias
    Route::post('/tenant/update-status', function (Request $request) {
        $id = $request->input('id');
        $status = $request->input('status') === 'activate' ? 'active' : 'disabled';

        $updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);

        if ($updated) {
            return response()->json(['success' => true]);
        } else {
            return response()->json(['success' => false, 'error' => 'Failed to update']);
        }
    })->name('tenant.update-status')
    ->middleware('superadmin.auth')
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);



    // Move order between tables
    Route::post('/orders/move-table', function (Request $request) {
        try {
            $sourceTableName = $request->input('source_table_name');
            $sourceTableId = $request->input('source_table_id');
            $destTableName = $request->input('dest_table_name');
            $destTableId = $request->input('dest_table_id');

            if (!$sourceTableName || !$destTableName) {
                return response()->json([
                    'success' => false,
                    'message' => 'Source and destination table names are required'
                ], 400);
            }

            // Get paid status ID
            $paidStatus = DB::table('statuses')->where('status_name', 'Paid')->first();
            $paidStatusId = $paidStatus ? $paidStatus->status_id : 10;

            // Get active orders for source table (not paid)
            $sourceOrders = DB::table('orders')
                ->where('order_type', $sourceTableName)
                ->where('status_id', '!=', $paidStatusId)
                ->get();

            // Get active orders for destination table (not paid)
            $destOrders = DB::table('orders')
                ->where('order_type', $destTableName)
                ->where('status_id', '!=', $paidStatusId)
                ->get();

            // Get table info for notifications
            $sourceTableInfo = DB::table('tables')->where('table_id', $sourceTableId)->first();
            $destTableInfo = DB::table('tables')->where('table_id', $destTableId)->first();
            $sourceTableDisplayName = $sourceTableInfo ? $sourceTableInfo->table_name : $sourceTableName;
            $destTableDisplayName = $destTableInfo ? $destTableInfo->table_name : $destTableName;

            $frontendPaymentMethod = (string)($request->payment_method ?? '');
            $normalizedPaymentMethod = match ($frontendPaymentMethod) {
                'stripe', 'apple_pay', 'google_pay' => 'card',
                'paypal' => 'paypal',
                'cash' => 'cash',
                'card' => 'card',
                default => $frontendPaymentMethod,
            };

            \Log::info('PMD_MIN_ORDER_DEBUG payment_mapping', [
                'frontend_payment_method' => $frontendPaymentMethod,
                'normalized_payment_method' => $normalizedPaymentMethod,
            ]);


            $frontendPaymentMethod = (string)($request->payment_method ?? '');

            $normalizedPaymentMethod = match ($frontendPaymentMethod) {
                'stripe', 'apple_pay', 'google_pay' => 'card',
                'paypal' => 'paypal',
                'cash' => 'cash',
                'card' => 'card',
                default => 'card',
            };

            \Log::info('PMD_MIN_ORDER_DEBUG payment_mapping', [
                'frontend_payment_method' => $frontendPaymentMethod,
                'normalized_payment_method' => $normalizedPaymentMethod,
            ]);

            DB::beginTransaction();


            try {
                // Move orders from source to destination
                foreach ($sourceOrders as $order) {
                    DB::table('orders')
                        ->where('order_id', $order->order_id)
                        ->update([
                            'order_type' => $destTableName,
                            'updated_at' => now()
                        ]);

                    // Update comment if it contains table reference
                    if ($order->comment) {
                        $updatedComment = str_replace($sourceTableName, $destTableName, $order->comment);
                        DB::table('orders')
                            ->where('order_id', $order->order_id)
                            ->update(['comment' => $updatedComment]);
                    }
                }

                // Move orders from destination to source (swap)
                foreach ($destOrders as $order) {
                    DB::table('orders')
                        ->where('order_id', $order->order_id)
                        ->update([
                            'order_type' => $sourceTableName,
                            'updated_at' => now()
                        ]);

                    // Update comment if it contains table reference
                    if ($order->comment) {
                        $updatedComment = str_replace($destTableName, $sourceTableName, $order->comment);
                        DB::table('orders')
                            ->where('order_id', $order->order_id)
                            ->update(['comment' => $updatedComment]);
                    }
                }

                // Create notification for table move
                $movedCount = $sourceOrders->count();
                $swappedCount = $destOrders->count();

                $notificationMessage = '';
                if ($movedCount > 0 && $swappedCount > 0) {
                    $notificationMessage = "Orders swapped: {$movedCount} order(s) moved from {$sourceTableDisplayName} to {$destTableDisplayName}, {$swappedCount} order(s) moved from {$destTableDisplayName} to {$sourceTableDisplayName}";
                } elseif ($movedCount > 0) {
                    $notificationMessage = "{$movedCount} order(s) moved from {$sourceTableDisplayName} to {$destTableDisplayName}";
                } elseif ($swappedCount > 0) {
                    $notificationMessage = "{$swappedCount} order(s) moved from {$destTableDisplayName} to {$sourceTableDisplayName}";
                } else {
                    $notificationMessage = "Table move completed: {$sourceTableDisplayName} ↔ {$destTableDisplayName}";
                }

                // Get current user for notification
                $userId = auth('admin')->id() ?? null;

                // Create notification
                $notificationId = DB::table('notifications')->insertGetId([
                    'type' => 'table_move',
                    'title' => "Table Move: {$sourceTableDisplayName} → {$destTableDisplayName}",
                    'message' => $notificationMessage,
                    'table_id' => $destTableId,
                    'table_name' => $destTableDisplayName,
                    'payload' => json_encode([
                        'source_table_name' => $sourceTableDisplayName,
                        'source_table_id' => $sourceTableId,
                        'dest_table_name' => $destTableDisplayName,
                        'dest_table_id' => $destTableId,
                        'moved_orders_count' => $movedCount,
                        'swapped_orders_count' => $swappedCount,
                        'moved_by' => $userId,
                        'timestamp' => now()->toISOString()
                    ], JSON_UNESCAPED_UNICODE),
                    'status' => 'new',
                    'priority' => 'medium',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => $notificationMessage,
                    'moved_count' => $movedCount,
                    'swapped_count' => $swappedCount,
                    'notification_id' => $notificationId
                ]);

            } catch (\Exception $e) {
                if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
                throw $e;
            }

        } catch (\Exception $e) {
            \Log::error('Move table error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to move orders: ' . $e->getMessage()
            ], 500);
        }
    });

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

    Route::resource('terminal_devices', 'TerminalDevices');

    Route::prefix('terminal_devices_platform')->group(function() {
        Route::get('/', [TerminalDevicesPlatformController::class, 'index'])->name('terminal_devices_platform.index');
        Route::get('create', [TerminalDevicesPlatformController::class, 'create'])->name('terminal_devices_platform.create');
        Route::post('store', [TerminalDevicesPlatformController::class, 'store'])->name('terminal_devices_platform.store');
        Route::get('edit/{id}', [TerminalDevicesPlatformController::class, 'edit'])->name('terminal_devices_platform.edit');
        Route::post('update/{id}', [TerminalDevicesPlatformController::class, 'update'])->name('terminal_devices_platform.update');
        Route::post('connect/{id}', [TerminalDevicesPlatformController::class, 'connect'])->name('terminal_devices_platform.connect');
        Route::post('sync/{id}', [TerminalDevicesPlatformController::class, 'sync'])->name('terminal_devices_platform.sync');
        Route::post('toggle/{id}', [TerminalDevicesPlatformController::class, 'toggle'])->name('terminal_devices_platform.toggle');
    });

    Route::get('sumup/test', function () {
        $payment = \Admin\Models\Payments_model::query()->where('code', 'sumup')->first();
        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $token = trim((string)($data['access_token'] ?? ''));
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');

        if (!$payment || !(bool)$payment->status || $token === '') {
            return response()->json([
                'success' => false,
                'message' => 'SumUp provider is not configured/enabled.',
            ], 422);
        }

        try {
            $resp = \Illuminate\Support\Facades\Http::withToken($token)->acceptJson()->get($baseUrl.'/v0.1/me');
            $json = (array)$resp->json();
            $merchantCode = (string)($json['merchant_profile']['merchant_code'] ?? $json['merchant_code'] ?? '');
            $email = (string)($json['email'] ?? $json['user_email'] ?? '');

            \Log::channel('sumup')->info('SUMUP_ADMIN_TEST_ENDPOINT', [
                'status' => $resp->status(),
                'merchant_code' => $merchantCode !== '' ? $merchantCode : null,
                'email' => $email !== '' ? $email : null,
            ]);

            return response()->json([
                'success' => $resp->ok() && $merchantCode !== '',
                'status' => $resp->status(),
                'merchant_code' => $merchantCode !== '' ? $merchantCode : null,
                'account_email' => $email !== '' ? $email : null,
                'connected' => $resp->ok() && $merchantCode !== '',
            ], $resp->ok() ? 200 : 502);
        } catch (\Throwable $e) {
            \Log::channel('sumup')->error('SUMUP_ADMIN_TEST_EXCEPTION', [
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to contact SumUp test endpoint.',
            ], 500);
        }
    });
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
    // Central method->provider support matrix (single source of truth)
    $methodProviderMatrix = \Admin\Models\Payments_model::supportedProviderMatrix();

    $providerCapabilityMatrix = [
        'stripe' => ['card', 'apple_pay', 'google_pay', 'paypal'],
        'paypal' => ['paypal'],
        'worldline' => ['card', 'wero'],
        'sumup' => ['card'],
        'square' => ['card'],
        'vr_payment' => ['card', 'apple_pay', 'google_pay', 'paypal', 'wero'],
    ];

    $implementedFlowMatrix = $providerCapabilityMatrix;

    $availableProviderCodesForMethod = function (string $methodCode) use ($providerCapabilityMatrix, $implementedFlowMatrix): array {
        if (in_array($methodCode, ['cod', 'cash'], true)) {
            return [];
        }
        return \Admin\Models\Payments_model::supportedProvidersForMethod($methodCode);
    };

    $defaultPaymentMethods = [
        ['code' => 'card', 'name' => 'Card', 'provider_code' => 'stripe', 'enabled' => true, 'priority' => 1],
        ['code' => 'apple_pay', 'name' => 'Apple Pay', 'provider_code' => 'stripe', 'enabled' => true, 'priority' => 2],
        ['code' => 'google_pay', 'name' => 'Google Pay', 'provider_code' => 'stripe', 'enabled' => true, 'priority' => 3],
        ['code' => 'wero', 'name' => 'Wero', 'provider_code' => 'worldline', 'enabled' => false, 'priority' => 4],
        ['code' => 'paypal', 'name' => 'PayPal', 'provider_code' => 'paypal', 'enabled' => true, 'priority' => 5],
        ['code' => 'cod', 'name' => 'Cash', 'provider_code' => null, 'enabled' => true, 'priority' => 6],
    ];

    $defaultPaymentProviders = [
        ['code' => 'stripe', 'name' => 'Stripe', 'enabled' => true, 'supported_methods' => $providerCapabilityMatrix['stripe'], 'config' => ['transaction_mode' => 'test', 'test_publishable_key' => '', 'live_publishable_key' => '', 'test_secret_key' => '', 'live_secret_key' => '', 'currency' => 'EUR', 'wero_enabled' => false]],
        ['code' => 'paypal', 'name' => 'PayPal', 'enabled' => true, 'supported_methods' => $providerCapabilityMatrix['paypal'], 'config' => ['transaction_mode' => 'test', 'test_client_id' => '', 'test_client_secret' => '', 'live_client_id' => '', 'live_client_secret' => '', 'brand_name' => '', 'currency' => 'EUR']],
        ['code' => 'worldline', 'name' => 'Worldline', 'enabled' => false, 'supported_methods' => $providerCapabilityMatrix['worldline'], 'config' => ['api_endpoint' => '', 'merchant_id' => '', 'api_key_id' => '', 'secret_api_key' => '', 'webhook_secret' => '', 'wero_enabled' => false, 'wero_payment_product_id' => '']],
        ['code' => 'sumup', 'name' => 'SumUp', 'enabled' => false, 'supported_methods' => $providerCapabilityMatrix['sumup'], 'config' => ['access_token' => '', 'url' => 'https://api.sumup.com', 'id_application' => '']],
        ['code' => 'square', 'name' => 'Square', 'enabled' => false, 'supported_methods' => $providerCapabilityMatrix['square'], 'config' => ['transaction_mode' => 'test', 'test_access_token' => '', 'test_location_id' => '', 'live_access_token' => '', 'live_location_id' => '', 'currency' => 'EUR']],
        ['code' => 'vr_payment', 'name' => 'VR Payment', 'enabled' => false, 'supported_methods' => $providerCapabilityMatrix['vr_payment'], 'config' => ['enabled' => false, 'mode' => 'test', 'api_base_url' => '', 'space_id' => '', 'user_id' => '', 'auth_key' => '', 'webhook_signing_key' => '', 'preferred_integration_mode' => 'payment_page']],
    ];

    $loadJsonSetting = function (string $item, array $fallback) {
        $row = \Illuminate\Support\Facades\DB::table('settings')
            ->where('sort', 'paymydine')
            ->where('item', $item)
            ->first();
        if (!$row || !isset($row->value)) return $fallback;
        $decoded = json_decode((string)$row->value, true);
        return is_array($decoded) ? $decoded : $fallback;
    };

    $saveJsonSetting = function (string $item, array $value): void {
        \Illuminate\Support\Facades\DB::table('settings')->updateOrInsert(
            ['sort' => 'paymydine', 'item' => $item],
            ['value' => json_encode($value), 'serialized' => 1]
        );
    };

    $loadProviderConfigFromPayments = function (string $providerCode): array {
        $row = \Admin\Models\Payments_model::query()->where('code', $providerCode)->first();
        return is_array(optional($row)->data) ? $row->data : [];
    };

    $loadProviderRecordsFromPayments = function () {
        $providerCodes = ['stripe', 'paypal', 'worldline', 'sumup', 'square', 'vr_payment'];
        return \Admin\Models\Payments_model::query()
            ->whereIn('code', $providerCodes)
            ->get()
            ->map(function ($row) {
                $meta = is_array($row->data ?? null) ? (array)$row->data : [];
                $supportedMethods = $meta['supported_methods'] ?? null;
                if (!is_array($supportedMethods) || empty($supportedMethods)) {
                    $supportedMethods = [
                        'stripe' => ['card', 'apple_pay', 'google_pay', 'paypal'],
                        'paypal' => ['paypal'],
                        'worldline' => ['card', 'wero'],
                        'sumup' => ['card'],
                        'square' => ['card'],
                        'vr_payment' => ['card', 'apple_pay', 'google_pay', 'paypal', 'wero'],
                    ][(string)$row->code] ?? [];
                }

                return [
                    'code' => (string)$row->code,
                    'name' => (string)($row->name ?: ucfirst((string)$row->code)),
                    'enabled' => (bool)$row->status,
                    'supported_methods' => array_values(array_map(fn ($method) => (string)$method, (array)$supportedMethods)),
                ];
            })
            ->keyBy('code');
    };

    $loadMethodRecordsFromPayments = function () {
        $methodCodes = ['card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod'];
        return \Admin\Models\Payments_model::query()
            ->whereIn('code', $methodCodes)
            ->get()
            ->map(function ($row) {
                $meta = is_array($row->data ?? null) ? (array)$row->data : [];
                $resolvedProvider = $row->provider_code ?? ($meta['provider_code'] ?? null);
                $supportedProvidersRaw = $meta['supported_providers'] ?? \Admin\Models\Payments_model::supportedProvidersForMethod((string)$row->code);
                $supportedProviders = array_values(array_unique(array_filter(array_map(
                    fn ($provider) => strtolower(trim((string)$provider)),
                    is_array($supportedProvidersRaw) ? $supportedProvidersRaw : []
                ), fn (string $provider) => $provider !== '')));
                $allowedProviders = \Admin\Models\Payments_model::supportedProvidersForMethod((string)$row->code);
                if (!empty($allowedProviders)) {
                    $supportedProviders = array_values(array_filter($supportedProviders, fn (string $provider) => in_array($provider, $allowedProviders, true)));
                }
                $normalizedProvider = strtolower(trim((string)$resolvedProvider));
                if ($normalizedProvider !== '' && in_array($normalizedProvider, $allowedProviders, true) && !in_array($normalizedProvider, $supportedProviders, true)) {
                    $supportedProviders[] = $normalizedProvider;
                }
                if (empty($supportedProviders) && !empty($allowedProviders)) {
                    $supportedProviders = array_values($allowedProviders);
                }
                $providerSource = $row->provider_code !== null ? 'column:provider_code' : (array_key_exists('provider_code', $meta) ? 'meta.provider_code' : 'default');
                return [
                    'code' => (string)$row->code,
                    'name' => (string)($row->name ?: ucfirst(str_replace('_', ' ', (string)$row->code))),
                    'provider_code' => $resolvedProvider,
                    'supported_providers' => $supportedProviders,
                    'enabled' => (bool)$row->status,
                    'priority' => (int)($row->priority ?? 0),
                    'source_of_truth' => [
                        'table' => $row->getTable(),
                        'key' => [$row->getKeyName() => $row->getKey()],
                        'provider' => $providerSource,
                    ],
                ];
            })
            ->keyBy('code');
    };

    $syncStripeProviderConfigToPayments = function (array $provider): void {
        if ((string)($provider['code'] ?? '') !== 'stripe') {
            return;
        }

        $config = is_array($provider['config'] ?? null) ? (array)$provider['config'] : [];
        $allowedKeys = [
            'transaction_mode',
            'test_publishable_key',
            'live_publishable_key',
            'test_secret_key',
            'live_secret_key',
            'currency',
            'wero_enabled',
        ];
        $normalizedConfig = array_intersect_key($config, array_flip($allowedKeys));

        $payment = \Admin\Models\Payments_model::query()->where('code', 'stripe')->first();
        if (!$payment) {
            return;
        }

        $existing = method_exists($payment, 'getConfigData') ? $payment->getConfigData() : [];
        $payment->setConfigData(array_merge($existing, $normalizedConfig));
        $payment->status = !empty($provider['enabled']) ? 1 : 0;
        $payment->save();
    };

    $persistStripeWeroCapabilityStatus = function (string $status, ?string $message = null): void {
        $payment = \Admin\Models\Payments_model::query()->where('code', 'stripe')->first();
        if (!$payment) {
            return;
        }

        $existing = method_exists($payment, 'getConfigData') ? $payment->getConfigData() : [];
        $existing['wero_capability_status'] = strtolower(trim($status)) ?: 'unknown';
        $existing['wero_capability_checked_at'] = gmdate('c');
        if ($message !== null) {
            $existing['wero_capability_message'] = mb_substr($message, 0, 500);
        }
        $payment->setConfigData($existing);
        $payment->save();
    };

    $persistWorldlineWeroCapabilityStatus = function (string $status, ?string $message = null) use ($loadJsonSetting, $defaultPaymentProviders, $saveJsonSetting): void {
        $providers = collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $worldline = (array)$providers->get('worldline', []);
        $config = is_array($worldline['config'] ?? null) ? (array)$worldline['config'] : [];
        $config['wero_capability_status'] = strtolower(trim($status)) ?: 'unknown';
        $config['wero_capability_checked_at'] = gmdate('c');
        if ($message !== null) {
            $config['wero_capability_message'] = mb_substr($message, 0, 500);
        }
        $worldline['config'] = $config;
        $providers->put('worldline', $worldline);
        $saveJsonSetting('payment_providers', $providers->values()->all());
    };

    $persistWorldlineWeroDebug = function (array $payload): void {
        try {
            $host = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', (string)request()->getHost());
            $path = storage_path('app/worldline_wero_debug');
            if (!is_dir($path)) {
                @mkdir($path, 0775, true);
            }
            @file_put_contents(
                rtrim($path, '/').'/'.$host.'.json',
                json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            );
        } catch (\Throwable $e) {
            \Log::warning('WORLDLINE_WERO_DEBUG_PERSIST_FAILED', ['message' => $e->getMessage()]);
        }
    };

    $loadWorldlineWeroDebug = function (): ?array {
        try {
            $host = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', (string)request()->getHost());
            $file = storage_path('app/worldline_wero_debug/'.$host.'.json');
            if (!is_file($file)) {
                return null;
            }
            $raw = @file_get_contents($file);
            $decoded = json_decode((string)$raw, true);
            return is_array($decoded) ? $decoded : null;
        } catch (\Throwable $e) {
            return null;
        }
    };

    $extractWorldlineExceptionDetails = function (\Throwable $e): array {
        $statusCode = method_exists($e, 'getStatusCode') ? (int)$e->getStatusCode() : null;
        $errorId = method_exists($e, 'getErrorId') ? (string)$e->getErrorId() : null;
        $responseBody = method_exists($e, 'getResponseBody') ? (string)$e->getResponseBody() : '';

        if ($responseBody === '' && method_exists($e, 'getResponse')) {
            try {
                $response = $e->getResponse();
                if (is_object($response) && method_exists($response, 'getBody')) {
                    $body = $response->getBody();
                    $responseBody = is_string($body) ? $body : (method_exists($body, '__toString') ? (string)$body : '');
                } elseif (is_string($response)) {
                    $responseBody = $response;
                }
            } catch (\Throwable $ignored) {
            }
        }

        $errors = [];
        if (method_exists($e, 'getErrors')) {
            try {
                $rawErrors = $e->getErrors();
                if (is_array($rawErrors)) {
                    $errors = $rawErrors;
                }
            } catch (\Throwable $ignored) {
            }
        }

        $payload = json_decode($responseBody, true);
        if (is_array($payload)) {
            if (empty($errors) && is_array($payload['errors'] ?? null)) {
                $errors = (array)$payload['errors'];
            }
            if ($statusCode === null && isset($payload['httpStatusCode'])) {
                $statusCode = (int)$payload['httpStatusCode'];
            }
            if ($errorId === null && isset($payload['errorId'])) {
                $errorId = (string)$payload['errorId'];
            }
        }

        return [
            'httpStatusCode' => $statusCode,
            'errorId' => $errorId,
            'category' => (string)($payload['category'] ?? ''),
            'errors' => array_values(array_map(function ($err) {
                $row = is_array($err) ? $err : (array)$err;
                return [
                    'code' => $row['code'] ?? null,
                    'id' => $row['id'] ?? null,
                    'propertyName' => $row['propertyName'] ?? null,
                    'message' => $row['message'] ?? null,
                ];
            }, (array)$errors)),
            'raw_response_body' => $responseBody !== '' ? mb_substr($responseBody, 0, 4000) : null,
        ];
    };

    $toBool = function ($value): bool {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return ((int)$value) === 1;
        }
        if (is_string($value)) {
            $v = strtolower(trim($value));
            if ($v === '' || $v === '0' || $v === 'false' || $v === 'no' || $v === 'off') {
                return false;
            }
            if ($v === '1' || $v === 'true' || $v === 'yes' || $v === 'on') {
                return true;
            }
        }
        return !empty($value);
    };

    $resolveStripeRuntimeReadiness = function () use ($loadJsonSetting, $defaultPaymentMethods, $defaultPaymentProviders, $loadMethodRecordsFromPayments, $persistStripeWeroCapabilityStatus, $toBool): array {
        $methodsFromDb = $loadMethodRecordsFromPayments();
        $methods = $methodsFromDb->count() > 0
            ? $methodsFromDb
            : collect($loadJsonSetting('payment_methods', $defaultPaymentMethods))->keyBy('code');
        $providers = collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $stripeProvider = (array)$providers->get('stripe', []);
        $providerEnabled = (bool)($stripeProvider['enabled'] ?? false);

        $payment = \Admin\Models\Payments_model::isEnabled()->where('code', 'stripe')->first();
        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $mode = (string)($data['transaction_mode'] ?? 'test');
        $publishableKey = (string)($mode === 'live' ? ($data['live_publishable_key'] ?? '') : ($data['test_publishable_key'] ?? ''));
        $secretKey = (string)($mode === 'live' ? ($data['live_secret_key'] ?? '') : ($data['test_secret_key'] ?? ''));

        $baseReady = $providerEnabled && $publishableKey !== '' && $secretKey !== '';
        $cardMethodConfigured = (bool)(($methods->get('card')['enabled'] ?? false) && (($methods->get('card')['provider_code'] ?? null) === 'stripe'));
        $appleMethodConfigured = (bool)(($methods->get('apple_pay')['enabled'] ?? false) && (($methods->get('apple_pay')['provider_code'] ?? null) === 'stripe'));
        $googleMethodConfigured = (bool)(($methods->get('google_pay')['enabled'] ?? false) && (($methods->get('google_pay')['provider_code'] ?? null) === 'stripe'));
        $weroMethodConfigured = (bool)(($methods->get('wero')['enabled'] ?? false) && (($methods->get('wero')['provider_code'] ?? null) === 'stripe'));

        $cardReady = $baseReady && $cardMethodConfigured;
        $appleReady = $baseReady && $appleMethodConfigured;
        $googleReady = $baseReady && $googleMethodConfigured;
        $weroReady = $baseReady && $weroMethodConfigured;
        $persistStripeWeroCapabilityStatus(
            $weroReady ? 'redirect_checkout' : 'unconfigured',
            'Stripe Wero is executed as a redirect checkout flow.'
        );

        return [
            'provider_enabled' => $providerEnabled,
            'mode' => $mode,
            'publishable_key' => $publishableKey,
            'secret_key_present' => $secretKey !== '',
            'card_ready' => $cardReady,
            'apple_pay_ready' => $appleReady,
            'google_pay_ready' => $googleReady,
            'wero_ready' => $weroReady,
            'any_ready' => $cardReady || $appleReady || $googleReady || $weroReady,
            'wero_enabled_by_config' => $weroReady,
            'wero_capability_status' => $weroReady ? 'redirect_checkout' : 'unconfigured',
        ];
    };

    $resolveWorldlineInlineReadiness = function (): array {
        try {
            $cfg = app(\Admin\Classes\WorldlineHostedCheckoutService::class)->getConfig();
            $ready = !empty($cfg['api_endpoint']) && !empty($cfg['api_key_id']) && !empty($cfg['secret_api_key']) && !empty($cfg['merchant_id']);
            return [
                'ready' => $ready,
                'environment' => app(\Admin\Classes\WorldlineHostedCheckoutService::class)->getEnvironment($cfg),
            ];
        } catch (\Throwable $e) {
            return ['ready' => false, 'error' => $e->getMessage()];
        }
    };

    $resolveWorldlineWeroReadiness = function () use ($loadJsonSetting, $defaultPaymentProviders, $resolveWorldlineInlineReadiness, $toBool, $loadProviderConfigFromPayments, $loadProviderRecordsFromPayments): array {
        $providers = collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $providerRecords = $loadProviderRecordsFromPayments();

        $storedWorldlineProvider = (array)$providers->get('worldline', []);
        $liveWorldlineRecord = (array)$providerRecords->get('worldline', []);
        $liveWorldlineConfig = $loadProviderConfigFromPayments('worldline');

        $providerEnabled = array_key_exists('enabled', $liveWorldlineRecord)
            ? (bool)$liveWorldlineRecord['enabled']
            : (bool)($storedWorldlineProvider['enabled'] ?? false);

        $worldlineConfig = [];
        if (is_array($storedWorldlineProvider['config'] ?? null)) {
            $worldlineConfig = (array)$storedWorldlineProvider['config'];
        }
        if (is_array($liveWorldlineConfig) && !empty($liveWorldlineConfig)) {
            $worldlineConfig = array_replace($worldlineConfig, $liveWorldlineConfig);
        }

        $inlineReadiness = $resolveWorldlineInlineReadiness();
        $weroEnabled = $toBool($worldlineConfig['wero_enabled'] ?? false);
        $weroPaymentProductId = (int)($worldlineConfig['wero_payment_product_id'] ?? 0);
        $weroCapabilityStatus = strtolower((string)($worldlineConfig['wero_capability_status'] ?? 'unknown'));
        $weroCapabilityMessage = (string)($worldlineConfig['wero_capability_message'] ?? '');

        return [
            'provider' => 'worldline',
            'provider_enabled' => $providerEnabled,
            'inline_ready' => (bool)($inlineReadiness['ready'] ?? false),
            'wero_enabled' => $weroEnabled,
            'wero_payment_product_id' => $weroPaymentProductId,
            'wero_capability_status' => $weroCapabilityStatus,
            'wero_capability_message' => $weroCapabilityMessage,
            'runtime_session_status' => 'unknown',
            'ready' => $providerEnabled
                && (bool)($inlineReadiness['ready'] ?? false)
                && $weroEnabled
                && $weroPaymentProductId > 0,
        ];
    };

    $resolveWorldlineWeroProductId = function (array $worldlineWeroReadiness, array $diagnostics = []): array {
        $configuredProductId = (int)($worldlineWeroReadiness['wero_payment_product_id'] ?? 0);
        $environment = strtolower((string)($diagnostics['environment'] ?? ''));
        $apiEndpoint = strtolower((string)($diagnostics['api_endpoint'] ?? ''));
        $isGlobalCollect = str_contains($apiEndpoint, 'connect.worldline-solutions.com');
        $effectiveProductId = $configuredProductId;
        $reason = $effectiveProductId > 0 ? 'configured' : 'missing';

        return [
            'configured_product_id' => $configuredProductId,
            'effective_product_id' => $effectiveProductId,
            'reason' => $reason,
            'is_globalcollect' => $isGlobalCollect,
            'environment' => $environment,
        ];
    };

    $resolveVRPaymentRuntimeReadiness = function () use ($loadProviderRecordsFromPayments): array {
        $providerRecords = $loadProviderRecordsFromPayments();
        $providerRow = (array)$providerRecords->get('vr_payment', []);
        $providerEnabled = (bool)($providerRow['enabled'] ?? false);

        $service = app(\Admin\Classes\VRPaymentGatewayService::class);
        $diag = $service->getConfigForDiagnostics();
        $connectivity = $service->probeConnectivity();
        $diag['connectivity'] = $connectivity;

        return array_merge($diag, [
            'provider_enabled' => $providerEnabled && (bool)($diag['provider_enabled'] ?? false),
        ]);
    };

    $persistVRPaymentSession = function (array $record): void {
        if (!\Illuminate\Support\Facades\Schema::hasTable('vr_payment_sessions')) {
            return;
        }

        $sessionId = trim((string)($record['session_id'] ?? ''));
        $transactionId = trim((string)($record['transaction_id'] ?? ''));
        $providerReference = trim((string)($record['provider_reference'] ?? ''));
        $merchantReference = trim((string)($record['merchant_reference'] ?? ''));

        if ($sessionId === '' && $transactionId === '' && $providerReference === '' && $merchantReference === '') {
            return;
        }

        $lookup = \Illuminate\Support\Facades\DB::table('vr_payment_sessions');
        if ($sessionId !== '') {
            $lookup->where('session_id', $sessionId);
        } elseif ($transactionId !== '') {
            $lookup->where('transaction_id', $transactionId);
        } elseif ($providerReference !== '') {
            $lookup->where('provider_reference', $providerReference);
        } else {
            $lookup->where('merchant_reference', $merchantReference)
                ->where('method_code', (string)($record['method_code'] ?? 'card'))
                ->orderByDesc('updated_at');
        }

        $existing = $lookup->first();
        $payload = [
            'provider_code' => 'vr_payment',
            'method_code' => (string)($record['method_code'] ?? 'card'),
            'merchant_reference' => $merchantReference,
            'session_id' => $sessionId !== '' ? $sessionId : null,
            'transaction_id' => $transactionId !== '' ? $transactionId : null,
            'provider_reference' => $providerReference !== '' ? $providerReference : null,
            'state' => (string)($record['state'] ?? 'pending'),
            'amount' => isset($record['amount']) ? (float)$record['amount'] : null,
            'currency' => isset($record['currency']) ? strtoupper((string)$record['currency']) : null,
            'order_id' => isset($record['order_id']) ? (int)$record['order_id'] : null,
            'raw_snapshot' => isset($record['raw_snapshot']) ? json_encode($record['raw_snapshot']) : null,
            'updated_at' => now(),
        ];

        if ($existing) {
            \Illuminate\Support\Facades\DB::table('vr_payment_sessions')
                ->where('id', (int)$existing->id)
                ->update($payload);
            return;
        }

        $payload['created_at'] = now();
        \Illuminate\Support\Facades\DB::table('vr_payment_sessions')->insert($payload);
    };

    $reconcileVRPaymentState = function (array $statusData): void {
        $state = strtolower((string)($statusData['status'] ?? 'unknown'));
        $sessionId = trim((string)($statusData['session_id'] ?? ''));
        $transactionId = trim((string)($statusData['transaction_id'] ?? ''));
        $providerReference = trim((string)($statusData['provider_reference'] ?? ''));
        $referenceCandidates = array_values(array_filter([
            $sessionId !== '' ? $sessionId : null,
            $transactionId !== '' ? $transactionId : null,
            $providerReference !== '' ? $providerReference : null,
            isset($statusData['merchant_reference']) ? trim((string)$statusData['merchant_reference']) : null,
        ]));

        if (!\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions') || empty($referenceCandidates)) {
            return;
        }

        $mappedSettlementStatus = match ($state) {
            'authorized', 'completed' => 'paid',
            'failed' => 'failed',
            'cancelled', 'expired' => 'cancelled',
            default => null,
        };

        if ($mappedSettlementStatus === null) {
            return;
        }

        $matchedRows = \Illuminate\Support\Facades\DB::table('order_payment_transactions')
            ->whereIn('payment_reference', $referenceCandidates)
            ->get(['id', 'order_id']);

        foreach ($matchedRows as $row) {
            \Illuminate\Support\Facades\DB::table('order_payment_transactions')
                ->where('id', (int)$row->id)
                ->update([
                    'settlement_status' => $mappedSettlementStatus,
                    'updated_at' => now(),
                ]);
            if (\Illuminate\Support\Facades\Schema::hasTable('orders')) {
                \Illuminate\Support\Facades\DB::table('orders')
                    ->where('order_id', (int)$row->order_id)
                    ->update([
                        'payment_provider' => 'vr_payment',
                        'payment_reference' => $referenceCandidates[0] ?? null,
                        'updated_at' => now(),
                    ]);
            }
        }
    };

    $isProviderReadyForMethod = function (string $providerCode, string $methodCode, array $stripeReadiness, array $worldlineReadiness, array $worldlineWeroReadiness, array $vrPaymentReadiness): array {
        if ($providerCode === 'stripe') {
            $readinessByMethod = [
                'card' => (bool)($stripeReadiness['card_ready'] ?? false),
                'apple_pay' => (bool)($stripeReadiness['apple_pay_ready'] ?? false),
                'google_pay' => (bool)($stripeReadiness['google_pay_ready'] ?? false),
                'paypal' => (bool)($stripeReadiness['any_ready'] ?? false),
                'wero' => (bool)($stripeReadiness['wero_ready'] ?? false),
            ];
            return [
                'ready' => (bool)($readinessByMethod[$methodCode] ?? false),
                'reason' => 'stripe_method_readiness',
            ];
        }

        if ($providerCode === 'worldline') {
            if ($methodCode === 'wero') {
                return [
                    'ready' => (bool)($worldlineWeroReadiness['ready'] ?? false),
                    'reason' => 'worldline_wero_readiness',
                ];
            }

            if ($methodCode === 'card') {
                return [
                    'ready' => (bool)($worldlineReadiness['ready'] ?? false),
                    'reason' => 'worldline_card_readiness',
                ];
            }
        }

        if ($providerCode === 'vr_payment') {
            $readinessByMethod = [
                'card' => (bool)($vrPaymentReadiness['card_ready'] ?? false),
                'apple_pay' => (bool)($vrPaymentReadiness['apple_pay_ready'] ?? false),
                'google_pay' => (bool)($vrPaymentReadiness['google_pay_ready'] ?? false),
                'paypal' => (bool)($vrPaymentReadiness['paypal_ready'] ?? false),
                'wero' => (bool)($vrPaymentReadiness['wero_ready'] ?? false),
            ];
            return [
                'ready' => (bool)($readinessByMethod[$methodCode] ?? false),
                'reason' => 'vr_payment_method_readiness',
            ];
        }

        return ['ready' => true, 'reason' => 'generic_provider_readiness'];
    };

    $resolveRuntimeMethodCollection = function (bool $withTrace = false) use (
        $defaultPaymentMethods,
        $defaultPaymentProviders,
        $loadJsonSetting,
        $availableProviderCodesForMethod,
        $resolveStripeRuntimeReadiness,
        $resolveWorldlineInlineReadiness,
        $resolveWorldlineWeroReadiness,
        $resolveVRPaymentRuntimeReadiness,
        $loadMethodRecordsFromPayments,
        $loadProviderRecordsFromPayments,
        $isProviderReadyForMethod
    ) {
        $methodsFromDb = $loadMethodRecordsFromPayments();
        $providersFromDb = $loadProviderRecordsFromPayments();
        $stripeReadiness = $resolveStripeRuntimeReadiness();
        $worldlineReadiness = $resolveWorldlineInlineReadiness();
        $worldlineWeroReadiness = $resolveWorldlineWeroReadiness();
        $vrPaymentReadiness = $resolveVRPaymentRuntimeReadiness();
        $resolveAvailableProviders = is_callable($availableProviderCodesForMethod ?? null)
            ? $availableProviderCodesForMethod
            : fn (string $methodCode): array => [];
        $providersByCode = $providersFromDb->count() > 0
            ? $providersFromDb
            : collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $sourceMethods = $methodsFromDb->count() > 0
            ? $methodsFromDb->values()
            : collect($loadJsonSetting('payment_methods', $defaultPaymentMethods));

        $trace = [];
        $availableMethods = collect();

        foreach (collect($sourceMethods)->sortBy('priority')->values() as $m) {
            $methodCode = (string)($m['code'] ?? '');
            $isEnabled = (bool)($m['enabled'] ?? false);
            $configuredProvider = $m['provider_code'] ?? null;

            if ($methodCode === 'cod') {
                if ($isEnabled) {
                    $availableMethods->push([
                        'code' => $methodCode,
                        'name' => (string)$m['name'],
                        'provider_code' => null,
                        'priority' => (int)($m['priority'] ?? 0),
                    ]);
                }
                $trace[] = [
                    'method' => $methodCode,
                    'included' => $isEnabled,
                    'reason' => $isEnabled ? 'cash_payment_no_provider_required' : 'method_disabled',
                ];
                continue;
            }

            if (!$isEnabled) {
                $trace[] = ['method' => $methodCode, 'included' => false, 'reason' => 'method_disabled'];
                continue;
            }

            $inclusionReasons = [];
            $selectedProvider = $configuredProvider ? strtolower((string)$configuredProvider) : null;
            $supportedProviders = array_values(array_unique(array_filter(array_map(
                fn ($provider) => strtolower(trim((string)$provider)),
                (array)($m['supported_providers'] ?? [])
            ), fn (string $provider) => $provider !== '')));
            $availableProviders = $resolveAvailableProviders($methodCode);
            if (!empty($availableProviders)) {
                $supportedProviders = array_values(array_filter($supportedProviders, fn (string $provider) => in_array($provider, $availableProviders, true)));
            }
            if (empty($supportedProviders)) {
                $supportedProviders = $availableProviders;
            }
            if (!$selectedProvider) {
                $inclusionReasons[] = 'provider_missing';
            } elseif (!in_array($selectedProvider, $availableProviders, true)) {
                $inclusionReasons[] = "{$selectedProvider}:not_supported_for_method";
            } elseif (!empty($supportedProviders) && !in_array($selectedProvider, $supportedProviders, true)) {
                $inclusionReasons[] = "{$selectedProvider}:not_in_supported_providers";
            } elseif (!$providersByCode->has($selectedProvider)) {
                $inclusionReasons[] = "{$selectedProvider}:provider_not_configured";
            } else {
                $provider = (array)$providersByCode->get($selectedProvider, []);
                if (!($provider['enabled'] ?? false)) {
                    $inclusionReasons[] = "{$selectedProvider}:provider_disabled";
                } else {
                    $providerReadiness = $isProviderReadyForMethod(
                        $selectedProvider,
                        $methodCode,
                        $stripeReadiness,
                        $worldlineReadiness,
                        $worldlineWeroReadiness,
                        $vrPaymentReadiness
                    );
                    if (!($providerReadiness['ready'] ?? false)) {
                        $inclusionReasons[] = "{$selectedProvider}:".(string)($providerReadiness['reason'] ?? 'provider_not_ready');
                    }
                }
            }

            if (!empty($inclusionReasons)) {
                $trace[] = [
                    'method' => $methodCode,
                    'included' => false,
                    'reason' => 'no_provider_ready',
                    'configured_provider' => $configuredProvider,
                    'selected_provider' => null,
                    'fallback_allowed' => false,
                    'fallback_reason' => null,
                    'selection_change_reason' => 'configured_provider_not_usable',
                    'source_of_truth' => $m['source_of_truth'] ?? 'payment_methods.provider_code',
                    'candidate_diagnostics' => $inclusionReasons,
                ];
                continue;
            }

            $availableMethods->push([
                'code' => $methodCode,
                'name' => (string)$m['name'],
                'provider_code' => $selectedProvider,
                'priority' => (int)($m['priority'] ?? 0),
            ]);
            $trace[] = [
                'method' => $methodCode,
                'included' => true,
                'reason' => 'provider_ready',
                'selected_provider' => $selectedProvider,
                'configured_provider' => $configuredProvider,
                'fallback_allowed' => false,
                'fallback_reason' => null,
                'selection_change_reason' => null,
                'source_of_truth' => $m['source_of_truth'] ?? 'payment_methods.provider_code',
            ];
        }

        $methods = $availableMethods->values();
        if ($withTrace) {
            return [
                'methods' => $methods,
                'trace' => $trace,
                'readiness' => [
                    'stripe' => $stripeReadiness,
                    'worldline_card' => $worldlineReadiness,
                    'worldline_wero' => $worldlineWeroReadiness,
                    'vr_payment' => $vrPaymentReadiness,
                ],
            ];
        }

        return $methods;
    };

    // === Payments (read-only) ===
    Route::get('/payments', function () use ($resolveRuntimeMethodCollection) {
        $methods = $resolveRuntimeMethodCollection(false);
        return response()->json($methods, 200);
    });

    Route::get('/payments/debug/availability-trace', function () use ($resolveRuntimeMethodCollection) {
        $resolution = $resolveRuntimeMethodCollection(true);

        \Admin\Classes\PaymentLogger::info('Payment availability trace generated', [
            'provider' => 'internal',
            'payment_method' => 'all',
            'request_meta' => [
                'path' => request()->path(),
                'query' => request()->query(),
            ],
            'response_meta' => [
                'method_count' => count($resolution['methods'] ?? []),
                'trace_count' => count($resolution['trace'] ?? []),
            ],
            'trace' => $resolution['trace'] ?? [],
        ]);

        return response()->json([
            'success' => true,
            'host' => request()->getHost(),
            'methods' => $resolution['methods'] ?? [],
            'trace' => $resolution['trace'] ?? [],
            'readiness' => $resolution['readiness'] ?? [],
        ], 200);
    });

    Route::get('/payments/vr-payment/diagnostics', function () use ($resolveRuntimeMethodCollection, $resolveVRPaymentRuntimeReadiness) {
        $runtime = $resolveRuntimeMethodCollection(true);
        $lastSession = null;
        $lastWebhook = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('vr_payment_sessions')) {
            $lastSession = \Illuminate\Support\Facades\DB::table('vr_payment_sessions')->orderByDesc('updated_at')->first();
        }
        if (\Illuminate\Support\Facades\Schema::hasTable('vr_payment_webhook_events')) {
            $lastWebhook = \Illuminate\Support\Facades\DB::table('vr_payment_webhook_events')->orderByDesc('processed_at')->first();
        }
        $readiness = $resolveVRPaymentRuntimeReadiness();
        $methodTrace = collect($runtime['trace'] ?? [])->keyBy('method');
        $methodMappings = collect($runtime['methods'] ?? [])
            ->map(fn ($m) => [
                'method_code' => (string)($m['code'] ?? ''),
                'provider_code' => (string)($m['provider_code'] ?? ''),
                'ready' => true,
                'reason' => 'provider_ready',
            ])->keyBy('method_code');
        foreach (['card', 'apple_pay', 'google_pay', 'paypal', 'wero'] as $method) {
            if (!$methodMappings->has($method)) {
                $trace = (array)$methodTrace->get($method, []);
                $methodMappings->put($method, [
                    'method_code' => $method,
                    'provider_code' => (string)($trace['configured_provider'] ?? ''),
                    'ready' => false,
                    'reason' => (string)($trace['selection_change_reason'] ?? $trace['reason'] ?? 'method_not_available'),
                ]);
            }
        }

        $lastNormalizedError = null;
        if ($lastSession && !empty($lastSession->raw_snapshot)) {
            $snapshot = json_decode((string)$lastSession->raw_snapshot, true);
            if (is_array($snapshot) && (!empty($snapshot['error_code']) || !empty($snapshot['error_category']))) {
                $lastNormalizedError = [
                    'state' => (string)($lastSession->state ?? 'unknown'),
                    'error_code' => $snapshot['error_code'] ?? null,
                    'error_category' => $snapshot['error_category'] ?? null,
                    'error' => $snapshot['error'] ?? null,
                    'updated_at' => (string)($lastSession->updated_at ?? ''),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'provider' => 'vr_payment',
            'readiness' => $readiness,
            'webhook_signing_key_present' => (bool)($readiness['config_presence']['webhook_signing_key'] ?? false),
            'return_status_endpoint' => '/api/v1/payments/vr-payment/return-status',
            'webhook_endpoint' => '/api/v1/payments/vr-payment/webhook',
            'runtime_trace' => $runtime['trace'] ?? [],
            'runtime_methods' => $runtime['methods'] ?? [],
            'method_mapping' => $methodMappings->values()->all(),
            'last_session' => $lastSession,
            'last_webhook_event' => $lastWebhook,
            'last_normalized_error' => $lastNormalizedError,
        ]);
    });

    Route::get('/payment-methods-admin', function () use ($defaultPaymentMethods, $loadJsonSetting, $loadMethodRecordsFromPayments) {
        $methodsFromDb = $loadMethodRecordsFromPayments();
        if ($methodsFromDb->count() > 0) {
            $payload = $methodsFromDb
                ->values()
                ->map(fn ($m) => [
                    'code' => (string)$m['code'],
                    'name' => (string)$m['name'],
                    'provider_code' => $m['provider_code'] ?? null,
                    'enabled' => (bool)($m['enabled'] ?? false),
                    'priority' => (int)($m['priority'] ?? 0),
                    'source_of_truth' => $m['source_of_truth'] ?? null,
                ])
                ->all();
            return response()->json(['success' => true, 'data' => $payload]);
        }

        $defaults = $defaultPaymentMethods;
        $load = $loadJsonSetting;
        return response()->json([
            'success' => true,
            'data' => array_values($load('payment_methods', $defaults)),
        ]);
    });

    Route::post('/payment-methods-admin', function (\Illuminate\Http\Request $request) use ($defaultPaymentMethods, $defaultPaymentProviders, $saveJsonSetting, $loadJsonSetting, $availableProviderCodesForMethod) {
        $methods = $request->input('methods', []);
        if (!is_array($methods)) {
            return response()->json(['success' => false, 'message' => 'Invalid methods payload'], 422);
        }
        $resolveAvailableProviders = is_callable($availableProviderCodesForMethod ?? null)
            ? $availableProviderCodesForMethod
            : fn (string $methodCode): array => [];
        $providers = collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $defaults = collect($defaultPaymentMethods)->keyBy('code');
        $normalized = collect($methods)
            ->filter(fn ($m) => is_array($m) && isset($m['code']) && $defaults->has($m['code']))
            ->map(function ($m, $i) use ($defaults) {
                $base = $defaults[$m['code']];
                return [
                    'code' => $base['code'],
                    'name' => (string)($m['name'] ?? $base['name']),
                    'provider_code' => array_key_exists('provider_code', $m) ? ($m['provider_code'] ?: null) : $base['provider_code'],
                    'enabled' => (bool)($m['enabled'] ?? $base['enabled']),
                    'priority' => (int)($m['priority'] ?? ($i + 1)),
                ];
            })
            ->values()
            ->all();
        if (count($normalized) !== count($defaults)) {
            return response()->json(['success' => false, 'message' => 'All payment methods are required'], 422);
        }
        foreach ($normalized as $method) {
            $methodCode = (string)$method['code'];
            $providerCode = $method['provider_code'] ?? null;
            if ($methodCode === 'cod') {
                if (!is_null($providerCode)) {
                    return response()->json(['success' => false, 'message' => 'Cash method must not have a provider'], 422);
                }
                continue;
            }
            if (!$providerCode || !$providers->has($providerCode)) {
                return response()->json(['success' => false, 'message' => "Provider is required for method {$methodCode}"], 422);
            }
            $available = $resolveAvailableProviders($methodCode);
            if (!in_array((string)$providerCode, $available, true)) {
                return response()->json(['success' => false, 'message' => "Provider {$providerCode} is not fully implemented for method {$methodCode}"], 422);
            }
        }

        foreach ($normalized as $method) {
            $code = (string)$method['code'];
            $row = \Admin\Models\Payments_model::query()->where('code', $code)->first();
            if (!$row) {
                continue;
            }

            $providerCode = $method['provider_code'] ?? null;
            $providerCode = $providerCode !== null ? strtolower((string)$providerCode) : null;
            if ($code === 'cod') {
                $providerCode = null;
            }

            $config = method_exists($row, 'getConfigData') ? $row->getConfigData() : [];
            $config['provider_code'] = $providerCode;
            $config['supported_providers'] = \Admin\Models\Payments_model::supportedProvidersForMethod($code);
            if ($providerCode && !in_array($providerCode, $config['supported_providers'], true)) {
                $config['supported_providers'][] = $providerCode;
            }
            $config['supported_providers'] = array_values(array_unique(array_filter(array_map(
                fn ($provider) => strtolower(trim((string)$provider)),
                (array)$config['supported_providers']
            ), fn (string $provider) => $provider !== '')));
            $row->setConfigData($config);

            if (\Illuminate\Support\Facades\Schema::hasColumn($row->getTable(), 'provider_code')) {
                $row->provider_code = $providerCode;
            }
            if (isset($row->priority)) {
                $row->priority = (int)($method['priority'] ?? $row->priority);
            }
            if (isset($row->sort_order)) {
                $row->sort_order = (int)($method['priority'] ?? $row->sort_order);
            }
            $row->status = !empty($method['enabled']) ? 1 : 0;
            $row->save();

            \Admin\Classes\PaymentLogger::info('Payment method admin mapping persisted', [
                'provider' => 'internal',
                'payment_method' => $code,
                'request_meta' => [
                    'table' => $row->getTable(),
                    'key' => [$row->getKeyName() => $row->getKey()],
                    'provider_code' => $providerCode,
                    'status' => (int)$row->status,
                ],
            ]);
        }

        $saveJsonSetting('payment_methods', $normalized);
        return response()->json(['success' => true, 'data' => $normalized]);
    });

    Route::get('/payment-providers-admin', function () use ($defaultPaymentProviders, $loadJsonSetting, $loadProviderConfigFromPayments, $implementedFlowMatrix) {
        $defaults = collect($defaultPaymentProviders)->keyBy('code');
        $stored = collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $data = $defaults->map(function ($base, $code) use ($stored, $loadProviderConfigFromPayments, $implementedFlowMatrix) {
            $existing = $stored->get($code, []);
            $paymentData = $loadProviderConfigFromPayments($code);
            return [
                'code' => $base['code'],
                'name' => $base['name'],
                'enabled' => (bool)($existing['enabled'] ?? $base['enabled']),
                'supported_methods' => array_values($base['supported_methods']),
                'implemented_methods' => array_values($implementedFlowMatrix[$code] ?? []),
                'config' => array_merge(
                    $base['config'],
                    is_array($existing['config'] ?? null) ? $existing['config'] : [],
                    array_intersect_key($paymentData, $base['config'])
                ),
            ];
        })->values()->all();
        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    });

    Route::post('/payment-providers-admin', function (\Illuminate\Http\Request $request) use ($defaultPaymentProviders, $saveJsonSetting, $syncStripeProviderConfigToPayments) {
        $providers = $request->input('providers', []);
        if (!is_array($providers)) {
            return response()->json(['success' => false, 'message' => 'Invalid providers payload'], 422);
        }
        $defaults = collect($defaultPaymentProviders)->keyBy('code');
        $normalized = collect($providers)
            ->filter(fn ($p) => is_array($p) && isset($p['code']) && $defaults->has($p['code']))
            ->map(function ($p) use ($defaults) {
                $base = $defaults[$p['code']];
                return [
                    'code' => $base['code'],
                    'name' => $base['name'],
                    'enabled' => (bool)($p['enabled'] ?? $base['enabled']),
                    'supported_methods' => array_values($base['supported_methods']),
                    'config' => array_merge($base['config'], is_array($p['config'] ?? null) ? $p['config'] : []),
                ];
            })
            ->values()
            ->all();
        if (count($normalized) !== count($defaults)) {
            return response()->json(['success' => false, 'message' => 'All payment providers are required'], 422);
        }
        $saveJsonSetting('payment_providers', $normalized);
        foreach ($normalized as $provider) {
            $syncStripeProviderConfigToPayments($provider);
        }
        return response()->json(['success' => true, 'data' => $normalized]);
    });

    // Stripe tenant config (safe for frontend: publishable key + mode only)
    Route::get('/payments/stripe/config', function () use ($defaultPaymentMethods, $defaultPaymentProviders, $loadJsonSetting, $availableProviderCodesForMethod, $resolveStripeRuntimeReadiness, $loadMethodRecordsFromPayments) {
        $methodsFromDb = $loadMethodRecordsFromPayments();
        $methods = $methodsFromDb->count() > 0
            ? $methodsFromDb
            : collect($loadJsonSetting('payment_methods', $defaultPaymentMethods))->keyBy('code');
        $providers = collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $readiness = $resolveStripeRuntimeReadiness();
        $resolveAvailableProviders = is_callable($availableProviderCodesForMethod ?? null)
            ? $availableProviderCodesForMethod
            : fn (string $methodCode): array => [];
        $stripeMethodCodes = ['card', 'apple_pay', 'google_pay', 'wero'];
        $hasActiveStripeMethod = collect($stripeMethodCodes)->contains(function ($methodCode) use ($methods, $providers, $resolveAvailableProviders) {
            if (!$methods->has($methodCode)) {
                return false;
            }
            $method = (array)$methods->get($methodCode, []);
            if (!($method['enabled'] ?? false)) {
                return false;
            }
            $providerCode = $method['provider_code'] ?? null;
            if ($providerCode !== 'stripe') {
                return false;
            }
            $provider = (array)$providers->get('stripe', []);
            if (!($provider['enabled'] ?? false)) {
                return false;
            }
            return in_array('stripe', $resolveAvailableProviders((string)$methodCode), true);
        });
        if (!$hasActiveStripeMethod || !($readiness['any_ready'] ?? false)) {
            return response()->json(['success' => false, 'error' => 'Stripe is not active for any enabled method'], 404);
        }

        $payment = \Admin\Models\Payments_model::isEnabled()->where('code', 'stripe')->first();
        if (!$payment) {
            return response()->json(['success' => false, 'error' => 'Stripe not configured'], 404);
        }
        $data = (array) $payment->data;
        $mode = $data['transaction_mode'] ?? 'test';
        $publishableKey = $mode === 'live'
            ? ($data['live_publishable_key'] ?? '')
            : ($data['test_publishable_key'] ?? '');
        // Resolve tenant currency + wallet flags for frontend UI
        $settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');
        $rawCurrency = $settings['default_currency_code']->value ?? ($settings['default_currency']->value ?? null);

        if (!$rawCurrency) {
            $resolvedCurrency = 'EUR';
        } elseif (!preg_match('/^\d+$/', (string)$rawCurrency)) {
            $resolvedCurrency = strtoupper((string)$rawCurrency);
        } else {
            $resolvedCurrency = strtoupper((string)(
                \Illuminate\Support\Facades\DB::table('currencies')->where('currency_id', (int)$rawCurrency)->value('currency_code') ?: 'EUR'
            ));
        }

        $countryCode = strtoupper((string)($data['country_code'] ?? 'DE'));

        return response()->json([
            'success' => true,
            'publishableKey' => $publishableKey ?: '',
            'mode' => $mode,
            'currency' => $resolvedCurrency,
            'countryCode' => $countryCode,
            'methods' => [
                'card' => (bool)($readiness['card_ready'] ?? false),
                'apple_pay' => (bool)($readiness['apple_pay_ready'] ?? false),
                'google_pay' => (bool)($readiness['google_pay_ready'] ?? false),
                'wero' => (bool)($readiness['wero_ready'] ?? false),
            ],
        ], 200);
    });

    Route::post('/payments/card/create-session', function (\Illuminate\Http\Request $request) use ($resolveRuntimeMethodCollection, $persistVRPaymentSession) {
        $runtimeResolution = $resolveRuntimeMethodCollection(true);
        $runtimeMethods = collect($runtimeResolution['methods'] ?? [])->keyBy('code');
        $runtimeTraceByMethod = collect($runtimeResolution['trace'] ?? [])->keyBy('method');
        $cardMethod = (array)$runtimeMethods->get('card', []);
        if (empty($cardMethod)) {
            return response()->json(['success' => false, 'error' => 'Card method is disabled'], 422);
        }

        $providerCode = (string)($cardMethod['provider_code'] ?? '');
        if ($providerCode === '') {
            return response()->json(['success' => false, 'error' => 'Card provider is not configured'], 422);
        }
        if ($providerCode === 'sumup') {
            \Log::channel('sumup')->info('SUMUP_CARD_RESOLVER_SELECTION', [
                'host' => request()->getHost(),
                'selected_provider' => $providerCode,
                'card_method' => $cardMethod,
                'card_trace' => (array)$runtimeTraceByMethod->get('card', []),
            ]);
        }

        $payload = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|size:3',
            'return_url' => 'nullable|url',
            'cancel_url' => 'nullable|url',
            'locale' => 'nullable|string|max:10',
            'items' => 'nullable|array',
            'order_id' => 'nullable|integer|min:1',
        ]);

        $amountMajor = (float)$payload['amount'];
        $currency = strtoupper((string)$payload['currency']);
        $amountMinor = (int)round($amountMajor * 100);
        $returnUrl = (string)($payload['return_url'] ?? url('/order-placed'));

        $paymentRow = \Admin\Models\Payments_model::query()->where('code', $providerCode)->first();
        $paymentData = is_array(optional($paymentRow)->data) ? (array)$paymentRow->data : [];

        try {
            if ($providerCode === 'worldline') {
                $worldlinePayload = [
                    'amount_minor' => $amountMinor,
                    'currency' => $currency,
                    'return_url' => $returnUrl,
                    'locale' => (string)$request->input('locale', 'en_GB'),
                    'country_code' => (string)$request->input('country_code', 'DE'),
                    'merchant_customer_id' => (string)$request->input('merchant_customer_id', 'PMD-MIMOZA-TEST'),
                ];
                \Log::info('PMD_CARD_CREATE_SESSION_WORLDLINE_TRIGGERED', [
                    'provider' => $providerCode,
                    'host' => request()->getHost(),
                    'worldline_payload' => $worldlinePayload,
                    'worldline_payload_checks' => [
                        'has_amount_minor' => isset($worldlinePayload['amount_minor']) && (int)$worldlinePayload['amount_minor'] > 0,
                        'has_currency' => !empty($worldlinePayload['currency']),
                        'has_return_url' => !empty($worldlinePayload['return_url']),
                        'has_locale' => !empty($worldlinePayload['locale']),
                        'has_country_code' => !empty($worldlinePayload['country_code']),
                        'has_merchant_customer_id' => !empty($worldlinePayload['merchant_customer_id']),
                    ],
                ]);
                $svc = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
                $result = $svc->createHostedCheckout($worldlinePayload);
                \Log::info('PMD_CARD_CREATE_SESSION_WORLDLINE_RESPONSE', [
                    'provider' => $providerCode,
                    'hosted_checkout_id' => $result['hosted_checkout_id'] ?? null,
                    'redirect_url_present' => !empty($result['redirect_url']),
                    'environment' => $result['environment'] ?? null,
                ]);
                return response()->json([
                    'success' => true,
                    'provider' => 'worldline',
                    'redirect_url' => $result['redirect_url'] ?? null,
                    'hosted_checkout_id' => $result['hosted_checkout_id'] ?? null,
                ]);
            }

            if ($providerCode === 'sumup') {
                $token = (string)($paymentData['access_token'] ?? '');
                $baseUrl = rtrim((string)($paymentData['url'] ?? 'https://api.sumup.com'), '/');
                $merchantCode = trim((string)($paymentData['id_application'] ?? ''));
                $merchantCodeSource = 'configured';
                if ($token === '') {
                    return response()->json(['success' => false, 'error' => 'SumUp credentials are incomplete'], 503);
                }
                try {
                    $startedAt = microtime(true);
                    if ($merchantCode === '') {
                        $merchantResp = \Illuminate\Support\Facades\Http::withToken($token)->acceptJson()->timeout(5)->get($baseUrl.'/v0.1/me');
                        $merchantPayload = (array)$merchantResp->json();
                        $merchantCode = trim((string)(($merchantPayload['merchant_profile']['merchant_code'] ?? $merchantPayload['merchant_code'] ?? '') ?: ''));
                        if ($merchantCode !== '') {
                            $merchantCodeSource = 'resolved_from_me';
                        }
                    }
                    if ($merchantCode === '') {
                        \Log::channel('sumup')->error('SUMUP_CREATE_SESSION_MERCHANT_CODE_MISSING', [
                            'host' => request()->getHost(),
                            'base_url' => $baseUrl,
                            'merchant_code_source' => $merchantCodeSource,
                        ]);
                        return response()->json([
                            'success' => false,
                            'provider' => 'sumup',
                            'error' => 'sumup_merchant_code_missing',
                            'message' => 'SumUp merchant code could not be resolved from token.',
                        ], 422);
                    }
                    $orderId = isset($payload['order_id']) ? (int)$payload['order_id'] : 0;
                    $checkoutReference = $orderId > 0
                        ? ('PMD-ORD-'.$orderId.'-'.uniqid('', true))
                        : ('PMD-'.uniqid('', true));
                    $sumupCheckoutPayload = [
                        'checkout_reference' => $checkoutReference,
                        'amount' => (float)round((float)$amountMajor, 2),
                        'currency' => $currency,
                        'merchant_code' => (string)$merchantCode,
                        'hosted_checkout' => [
                            'enabled' => true,
                        ],
                    ];

                    \Log::channel('sumup')->info('SUMUP_CREATE_SESSION_REQUEST', [
                        'host' => request()->getHost(),
                        'payload' => $sumupCheckoutPayload,
                        'merchant_code_source' => $merchantCodeSource,
                    ]);
                    \Illuminate\Support\Facades\Cache::put(
                        'sumup_last_checkout_payload_'.request()->getHost(),
                        $sumupCheckoutPayload,
                        now()->addHours(12)
                    );

                    $sumupResponse = null;
                    $body = [];
                    $attempts = 0;
                    $maxAttempts = 3;
                    while ($attempts < $maxAttempts) {
                        $attempts++;
                        try {
                            $sumupResponse = \Illuminate\Support\Facades\Http::withToken($token)
                                ->acceptJson()
                                ->timeout(5)
                                ->post($baseUrl.'/v0.1/checkouts', $sumupCheckoutPayload);
                            $body = (array)$sumupResponse->json();

                            if ($sumupResponse->ok() || $sumupResponse->status() < 500) {
                                break;
                            }
                        } catch (\Throwable $attemptError) {
                            $body = ['exception' => $attemptError->getMessage()];
                            if ($attempts >= $maxAttempts) {
                                throw $attemptError;
                            }
                        }

                        usleep(250000);
                    }

                    $statusCode = $sumupResponse ? $sumupResponse->status() : null;
                    \Log::channel('sumup')->info('SUMUP_CREATE_SESSION_RESPONSE', [
                        'attempts' => $attempts,
                        'status' => $statusCode,
                        'body' => $body,
                        'duration_ms' => (int)round((microtime(true) - $startedAt) * 1000),
                    ]);

                    $checkoutId = trim((string)($body['id'] ?? ''));
                    $isUpstreamSuccess = $sumupResponse && $sumupResponse->successful();

                    if (!$isUpstreamSuccess) {
                        $failedStatus = $sumupResponse ? (int)$sumupResponse->status() : 422;
                        $errorResponse = [
                            'success' => false,
                            'provider' => 'sumup',
                            'error' => 'sumup_error',
                            'status' => $failedStatus,
                            'body' => $body,
                        ];
                        \Log::channel('sumup')->warning('SUMUP_CREATE_SESSION_FINAL_RESPONSE', [
                            'host' => request()->getHost(),
                            'status' => $failedStatus,
                            'response' => $errorResponse,
                        ]);
                        return response()->json($errorResponse, $failedStatus);
                    }

                    if ($checkoutId === '') {
                        $missingIdResponse = [
                            'success' => false,
                            'provider' => 'sumup',
                            'error' => 'sumup_error',
                            'status' => (int)($statusCode ?: 422),
                            'message' => 'SumUp checkout response did not include a checkout id.',
                            'body' => $body,
                        ];
                        \Log::channel('sumup')->warning('SUMUP_CREATE_SESSION_FINAL_RESPONSE', [
                            'host' => request()->getHost(),
                            'status' => (int)($statusCode ?: 422),
                            'response' => $missingIdResponse,
                        ]);
                        return response()->json($missingIdResponse, 422);
                    }

                    $extractUrlFromLinks = function (array $payload, array $preferredRels = []): ?string {
                        $links = $payload['links'] ?? [];
                        if (!is_array($links)) {
                            return null;
                        }
                        foreach ($links as $link) {
                            $href = trim((string)($link['href'] ?? ''));
                            $rel = strtolower(trim((string)($link['rel'] ?? '')));
                            if ($href === '') {
                                continue;
                            }
                            if (!empty($preferredRels) && in_array($rel, $preferredRels, true)) {
                                return $href;
                            }
                        }
                        if (empty($preferredRels)) {
                            foreach ($links as $link) {
                                $href = trim((string)($link['href'] ?? ''));
                                if ($href !== '') {
                                    return $href;
                                }
                            }
                        }
                        return null;
                    };

                    $hostedCheckoutUrl = trim((string)(
                        $body['hosted_checkout_url']
                        ?? ($body['checkout_link'] ?? '')
                    ));
                    if ($hostedCheckoutUrl === '') {
                        $hostedCheckoutUrl = (string)($extractUrlFromLinks($body, ['hosted_checkout', 'checkout', 'pay', 'payment']) ?? '');
                    }
                    $checkoutUrl = trim((string)($body['checkout_url'] ?? ''));
                    if ($checkoutUrl === '') {
                        $checkoutUrl = (string)($extractUrlFromLinks($body, ['checkout', 'pay', 'payment']) ?? '');
                    }
                    $fallbackCheckoutUrl = trim((string)(
                        $body['redirect_url']
                        ?? ($body['url'] ?? '')
                    ));
                    if ($fallbackCheckoutUrl === '') {
                        $fallbackCheckoutUrl = (string)($extractUrlFromLinks($body) ?? '');
                    }
                    $redirectUrl = $hostedCheckoutUrl !== ''
                        ? $hostedCheckoutUrl
                        : ($checkoutUrl !== '' ? $checkoutUrl : $fallbackCheckoutUrl);

                    if ($orderId > 0 && \Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')) {
                        \Illuminate\Support\Facades\DB::table('order_payment_transactions')->insert([
                            'order_id' => $orderId,
                            'payment_method' => 'card',
                            'payment_reference' => $checkoutId !== '' ? $checkoutId : $checkoutReference,
                            'amount' => $amountMajor,
                            'settlement_status' => 'pending',
                            'payer_label' => 'sumup_guest_checkout',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                    $successResponse = [
                        'success' => true,
                        'provider' => 'sumup',
                        'status' => (int)($statusCode ?: 200),
                        'checkout_id' => $checkoutId,
                        'checkout_url' => $checkoutUrl !== '' ? $checkoutUrl : null,
                        'hosted_checkout_url' => $hostedCheckoutUrl !== '' ? $hostedCheckoutUrl : null,
                        'redirect_url' => $redirectUrl,
                        'checkout_reference' => $checkoutReference,
                        'raw_body' => array_intersect_key($body, array_flip([
                            'id',
                            'status',
                            'amount',
                            'currency',
                            'checkout_reference',
                            'checkout_url',
                            'hosted_checkout_url',
                            'redirect_url',
                            'links',
                        ])),
                    ];
                    $successResponse['merchant_code_source'] = $merchantCodeSource;
                    $successResponse['hosted_checkout'] = true;
                    if ($redirectUrl === '') {
                        $successResponse['widget_ready'] = true;
                        $successResponse['message'] = 'SumUp checkout was created successfully, but no redirect URL was returned. Use checkout_id with SumUp Payment Widget.';
                    }
                    if ($redirectUrl !== '') {
                        \Log::channel('sumup')->info('SUMUP_HOSTED_CHECKOUT_REDIRECT', [
                            'host' => request()->getHost(),
                            'checkout_id' => $checkoutId,
                            'checkout_reference' => $checkoutReference,
                            'merchant_code_source' => $merchantCodeSource,
                            'redirect_url' => $redirectUrl,
                        ]);
                    }
                    \Log::channel('sumup')->info('SUMUP_CREATE_SESSION_FINAL_RESPONSE', [
                        'host' => request()->getHost(),
                        'status' => (int)($statusCode ?: 200),
                        'response' => $successResponse,
                    ]);
                    return response()->json($successResponse);
                } catch (\Throwable $sumupException) {
                    \Log::channel('sumup')->error('SUMUP_CREATE_SESSION_EXCEPTION', [
                        'message' => $sumupException->getMessage(),
                        'class' => get_class($sumupException),
                    ]);
                    $exceptionResponse = [
                        'success' => false,
                        'provider' => 'sumup',
                        'error' => 'sumup_error',
                        'status' => 500,
                        'body' => ['message' => $sumupException->getMessage()],
                    ];
                    \Log::channel('sumup')->error('SUMUP_CREATE_SESSION_FINAL_RESPONSE', [
                        'host' => request()->getHost(),
                        'status' => 500,
                        'response' => $exceptionResponse,
                    ]);
                    return response()->json($exceptionResponse, 500);
                }
            }

            if ($providerCode === 'square') {
                $mode = (string)($paymentData['transaction_mode'] ?? 'test');
                $accessToken = $mode === 'live'
                    ? (string)($paymentData['live_access_token'] ?? '')
                    : (string)($paymentData['test_access_token'] ?? '');
                $locationId = $mode === 'live'
                    ? (string)($paymentData['live_location_id'] ?? '')
                    : (string)($paymentData['test_location_id'] ?? '');
                if ($accessToken === '' || $locationId === '') {
                    return response()->json(['success' => false, 'error' => 'Square credentials are incomplete'], 503);
                }
                $squareBase = $mode === 'live' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
                $squareResponse = \Illuminate\Support\Facades\Http::withHeaders([
                    'Authorization' => 'Bearer '.$accessToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->post($squareBase.'/v2/online-checkout/payment-links', [
                    'idempotency_key' => 'PMD-'.uniqid('', true),
                    'quick_pay' => [
                        'name' => 'Paymydine order',
                        'price_money' => [
                            'amount' => $amountMinor,
                            'currency' => $currency,
                        ],
                        'location_id' => $locationId,
                    ],
                    'checkout_options' => [
                        'redirect_url' => $returnUrl,
                    ],
                    'pre_populated_data' => [
                        'buyer_email' => (string)($request->input('customer_email', '')),
                    ],
                ]);
                if (!$squareResponse->ok()) {
                    return response()->json(['success' => false, 'error' => 'Failed to create Square payment link', 'details' => $squareResponse->json()], 502);
                }
                $body = (array)$squareResponse->json();
                $redirectUrl = (string)($body['payment_link']['url'] ?? '');
                if ($redirectUrl === '') {
                    return response()->json(['success' => false, 'error' => 'Square payment link missing'], 502);
                }
                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'redirect_url' => $redirectUrl,
                    'payment_link_id' => $body['payment_link']['id'] ?? null,
                    'order_id' => $body['payment_link']['order_id'] ?? null,
                ]);
            }

            if ($providerCode === 'stripe') {
                return response()->json(['success' => false, 'error' => 'Stripe card flow uses PaymentIntent endpoint'], 409);
            }

            if ($providerCode === 'vr_payment') {
                $service = app(\Admin\Classes\VRPaymentGatewayService::class);
                $result = $service->createRedirectSession([
                    'method' => 'card',
                    'amount' => $amountMajor,
                    'currency' => $currency,
                    'return_url' => $returnUrl,
                    'cancel_url' => (string)($payload['cancel_url'] ?? $returnUrl),
                    'locale' => (string)($payload['locale'] ?? 'en_US'),
                    'country_code' => (string)$request->input('country_code', 'DE'),
                    'merchant_customer_id' => (string)$request->input('merchant_customer_id', 'PMD-VR-CARD'),
                    'items' => (array)($payload['items'] ?? []),
                ]);
                if (!($result['success'] ?? false)) {
                    return response()->json($result, 422);
                }
                $persistVRPaymentSession([
                    'method_code' => 'card',
                    'merchant_reference' => (string)$request->input('merchant_reference', ''),
                    'session_id' => (string)($result['session_id'] ?? ''),
                    'transaction_id' => (string)($result['transaction_id'] ?? ''),
                    'provider_reference' => (string)($result['provider_reference'] ?? ''),
                    'state' => (string)($result['status'] ?? 'pending'),
                    'amount' => $amountMajor,
                    'currency' => $currency,
                    'raw_snapshot' => $result,
                ]);
                return response()->json($result, 200);
            }

            return response()->json(['success' => false, 'error' => "Unsupported card provider {$providerCode}"], 422);
        } catch (\Throwable $e) {
            $logPayload = [
                'provider' => $providerCode,
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
                'errorId' => method_exists($e, 'getErrorId') ? $e->getErrorId() : null,
                'responseBody' => method_exists($e, 'getResponseBody') ? $e->getResponseBody() : null,
            ];
            if ($providerCode === 'sumup') {
                \Log::channel('sumup')->error('SUMUP_CREATE_SESSION_OUTER_EXCEPTION', $logPayload);
            } else {
                \Log::error('Card create-session failed', $logPayload);
            }
            return response()->json(['success' => false, 'error' => $e->getMessage() ?: 'Failed to create card session'], 500);
        }
    });

    $registerVRPaymentSessionRoute = function (string $methodCode, string $path) use ($resolveRuntimeMethodCollection, $persistVRPaymentSession) {
        Route::post($path, function (\Illuminate\Http\Request $request) use ($methodCode, $resolveRuntimeMethodCollection, $persistVRPaymentSession) {
            $payload = $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'currency' => 'required|string|size:3',
                'return_url' => 'required|url',
                'cancel_url' => 'required|url',
                'locale' => 'nullable|string|max:10',
                'country_code' => 'nullable|string|max:3',
                'merchant_customer_id' => 'nullable|string|max:120',
                'merchant_reference' => 'nullable|string|max:191',
                'items' => 'nullable|array',
            ]);

            $runtimeCollection = $resolveRuntimeMethodCollection(true);
            $runtimeMethods = collect($runtimeCollection['methods'] ?? [])->keyBy('code');
            $selected = (array)$runtimeMethods->get($methodCode, []);
            if (empty($selected)) {
                return response()->json([
                    'success' => false,
                    'provider' => 'vr_payment',
                    'method' => $methodCode,
                    'business_error' => true,
                    'error_code' => 'vr_payment_method_not_active',
                    'error' => 'This payment method is currently unavailable for this merchant.',
                ], 422);
            }

            $selectedProvider = strtolower((string)($selected['provider_code'] ?? ''));
            if ($selectedProvider !== 'vr_payment') {
                return response()->json([
                    'success' => false,
                    'provider' => $selectedProvider ?: null,
                    'method' => $methodCode,
                    'business_error' => true,
                    'error_code' => 'vr_payment_method_not_active',
                    'error' => 'Selected method is not mapped to VR Payment.',
                ], 422);
            }

            $service = app(\Admin\Classes\VRPaymentGatewayService::class);
            $result = $service->createRedirectSession([
                'method' => $methodCode,
                'amount' => (float)$payload['amount'],
                'currency' => strtoupper((string)$payload['currency']),
                'return_url' => (string)$payload['return_url'],
                'cancel_url' => (string)$payload['cancel_url'],
                'locale' => (string)($payload['locale'] ?? 'en_US'),
                'country_code' => strtoupper((string)($payload['country_code'] ?? 'DE')),
                'merchant_customer_id' => (string)($payload['merchant_customer_id'] ?? 'PMD-VR-CHECKOUT'),
                'merchant_reference' => (string)($payload['merchant_reference'] ?? ''),
                'items' => (array)($payload['items'] ?? []),
            ]);

            if (!($result['success'] ?? false)) {
                $persistVRPaymentSession([
                    'method_code' => $methodCode,
                    'merchant_reference' => (string)($result['merchant_reference'] ?? ($payload['merchant_reference'] ?? '')),
                    'session_id' => (string)($result['session_id'] ?? ''),
                    'transaction_id' => (string)($result['transaction_id'] ?? ''),
                    'provider_reference' => (string)($result['provider_reference'] ?? ''),
                    'state' => 'failed',
                    'amount' => (float)$payload['amount'],
                    'currency' => strtoupper((string)$payload['currency']),
                    'raw_snapshot' => $result,
                ]);
                return response()->json($result, 422);
            }

            $persistVRPaymentSession([
                'method_code' => $methodCode,
                'merchant_reference' => (string)($result['merchant_reference'] ?? ($payload['merchant_reference'] ?? '')),
                'session_id' => (string)($result['session_id'] ?? ''),
                'transaction_id' => (string)($result['transaction_id'] ?? ''),
                'provider_reference' => (string)($result['provider_reference'] ?? ''),
                'state' => (string)($result['status'] ?? 'pending'),
                'amount' => (float)$payload['amount'],
                'currency' => strtoupper((string)$payload['currency']),
                'raw_snapshot' => $result,
            ]);

            return response()->json($result, 200);
        });
    };

    $registerVRPaymentSessionRoute('card', '/payments/vr-payment/card/create-session');
    $registerVRPaymentSessionRoute('paypal', '/payments/vr-payment/paypal/create-session');
    $registerVRPaymentSessionRoute('wero', '/payments/vr-payment/wero/create-session');
    $registerVRPaymentSessionRoute('apple_pay', '/payments/vr-payment/apple-pay/create-session');
    $registerVRPaymentSessionRoute('google_pay', '/payments/vr-payment/google-pay/create-session');

    Route::match(['GET', 'POST'], '/payments/vr-payment/return-status', function (\Illuminate\Http\Request $request) use ($persistVRPaymentSession, $reconcileVRPaymentState) {
        $payload = $request->validate([
            'session_id' => 'nullable|string|max:191',
            'transaction_id' => 'nullable|string|max:191',
            'provider_reference' => 'nullable|string|max:191',
            'merchant_reference' => 'nullable|string|max:191',
        ]);

        if (
            empty($payload['session_id'])
            && empty($payload['transaction_id'])
            && empty($payload['provider_reference'])
            && empty($payload['merchant_reference'])
        ) {
            return response()->json([
                'success' => false,
                'provider' => 'vr_payment',
                'error_code' => 'vr_payment_status_lookup_failed',
                'error' => 'No VR Payment reference was provided.',
            ], 422);
        }

        $service = app(\Admin\Classes\VRPaymentGatewayService::class);
        $status = $service->fetchPaymentStatus($payload);
        if (!($status['success'] ?? false)) {
            return response()->json($status, 422);
        }

        $persistVRPaymentSession([
            'method_code' => 'unknown',
            'merchant_reference' => (string)($payload['merchant_reference'] ?? ''),
            'session_id' => (string)($status['session_id'] ?? ''),
            'transaction_id' => (string)($status['transaction_id'] ?? ''),
            'provider_reference' => (string)($status['provider_reference'] ?? ''),
            'state' => (string)($status['status'] ?? 'unknown'),
            'raw_snapshot' => $status,
        ]);
        $reconcileVRPaymentState(array_merge($payload, $status));

        return response()->json($status, 200);
    });

    Route::post('/payments/vr-payment/webhook', function (\Illuminate\Http\Request $request) use ($persistVRPaymentSession, $reconcileVRPaymentState) {
        $rawBody = (string)$request->getContent();
        $signature = (string)$request->header('x-vr-signature', '');
        $timestamp = (string)$request->header('x-vr-timestamp', '');
        $service = app(\Admin\Classes\VRPaymentGatewayService::class);

        if (!$service->verifyWebhookSignature($rawBody, $signature, $timestamp)) {
            \Admin\Classes\PaymentLogger::warning('VR_PAYMENT_WEBHOOK_SIGNATURE_INVALID', [
                'provider' => 'vr_payment',
                'payment_method' => 'all',
                'request_meta' => ['headers' => $request->headers->all()],
            ]);
            return response()->json([
                'success' => false,
                'provider' => 'vr_payment',
                'error_code' => 'vr_payment_signature_invalid',
                'error' => 'Invalid VR Payment webhook signature.',
            ], 401);
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return response()->json([
                'success' => false,
                'provider' => 'vr_payment',
                'error_code' => 'vr_payment_webhook_invalid',
                'error' => 'Invalid webhook payload.',
            ], 422);
        }

        $eventId = trim((string)($payload['event_id'] ?? ''));
        if ($eventId === '') {
            $eventId = hash('sha256', $rawBody);
        }

        if (\Illuminate\Support\Facades\Schema::hasTable('vr_payment_webhook_events')) {
            $alreadyProcessed = \Illuminate\Support\Facades\DB::table('vr_payment_webhook_events')
                ->where('event_id', $eventId)
                ->exists();
            if ($alreadyProcessed) {
                return response()->json(['success' => true, 'provider' => 'vr_payment', 'duplicate' => true], 200);
            }
        }

        $normalizedState = $service->normalizePaymentStatus((string)($payload['status'] ?? $payload['payment_status'] ?? 'unknown'));
        $record = [
            'method_code' => (string)($payload['method'] ?? 'unknown'),
            'merchant_reference' => (string)($payload['merchant_reference'] ?? ''),
            'session_id' => (string)($payload['session_id'] ?? ''),
            'transaction_id' => (string)($payload['transaction_id'] ?? ''),
            'provider_reference' => (string)($payload['provider_reference'] ?? ''),
            'state' => $normalizedState,
            'raw_snapshot' => $payload,
        ];
        $persistVRPaymentSession($record);
        $reconcileVRPaymentState(array_merge($payload, [
            'status' => $normalizedState,
        ]));

        if (\Illuminate\Support\Facades\Schema::hasTable('vr_payment_webhook_events')) {
            \Illuminate\Support\Facades\DB::table('vr_payment_webhook_events')->insert([
                'event_id' => $eventId,
                'event_type' => (string)($payload['event_type'] ?? $payload['type'] ?? 'unknown'),
                'session_id' => (string)($payload['session_id'] ?? ''),
                'transaction_id' => (string)($payload['transaction_id'] ?? ''),
                'provider_reference' => (string)($payload['provider_reference'] ?? ''),
                'state' => $normalizedState,
                'processed_at' => now(),
                'payload' => json_encode($payload),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'provider' => 'vr_payment',
            'event_id' => $eventId,
            'status' => $normalizedState,
        ], 200);
    })->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class]);

    Route::post('/payments/worldline/checkout-status', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'hosted_checkout_id' => 'required|string',
        ]);

        try {
            $service = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $status = $service->getHostedCheckoutStatus((string)$payload['hosted_checkout_id']);

            $hostedStatus = strtoupper((string)($status['hosted_checkout_status'] ?? ''));
            $paymentStatusRaw = $status['payment_status'] ?? null;
            $paymentStatus = strtoupper((string)$paymentStatusRaw);

            $paidHostedStatuses = ['PAYMENT_CREATED', 'COMPLETED'];
            $paidPaymentStatuses = ['PAID', 'CAPTURED', '9'];

            $isPaid = in_array($hostedStatus, $paidHostedStatuses, true)
                || in_array($paymentStatus, $paidPaymentStatuses, true);

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'hosted_checkout_id' => (string)$payload['hosted_checkout_id'],
                'is_paid' => $isPaid,
                'hosted_checkout_status' => $status['hosted_checkout_status'] ?? null,
                'payment_status' => $status['payment_status'] ?? null,
                'payment_id' => $status['payment_id'] ?? null,
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('Worldline checkout-status failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'error' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/payments/worldline/auth-diagnostic', function () {
        try {
            $service = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'result' => $service->getConfigForDiagnostics(),
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE AUTH DIAGNOSTIC ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'error' => $e->getMessage(),
            ], 500);
        }
    });

    Route::post('/payments/worldline/create-hosted-checkout', function (\Illuminate\Http\Request $request) {
        try {
            $payload = $request->validate([
                'amount_minor' => 'required|integer|min:1',
                'currency' => 'required|string|size:3',
                'return_url' => 'required|url',
                'locale' => 'nullable|string|max:10',
                'country_code' => 'nullable|string|size:2',
                'merchant_customer_id' => 'nullable|string|max:64',
            ]);

            $service = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $result = $service->createHostedCheckout([
                'amount_minor' => (int)$payload['amount_minor'],
                'currency' => strtoupper((string)$payload['currency']),
                'return_url' => (string)$payload['return_url'],
                'locale' => (string)($payload['locale'] ?? 'en_GB'),
                'country_code' => strtoupper((string)($payload['country_code'] ?? 'DE')),
                'merchant_customer_id' => (string)($payload['merchant_customer_id'] ?? ('PMD-'.substr(sha1((string)microtime(true)), 0, 12))),
            ]);

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'redirect_url' => $result['redirect_url'] ?? null,
                'hosted_checkout_id' => $result['hosted_checkout_id'] ?? null,
                'environment' => $result['environment'] ?? null,
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE CREATE HOSTED CHECKOUT V1 ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
                'responseBody' => method_exists($e, 'getResponseBody') ? $e->getResponseBody() : null,
            ]);
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'error' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/payments/worldline/status/{hostedCheckoutId}', function (string $hostedCheckoutId) {
        try {
            $service = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $status = $service->getHostedCheckoutStatus($hostedCheckoutId);

            $hostedStatus = strtoupper((string)($status['hosted_checkout_status'] ?? ''));
            $paymentStatus = strtoupper((string)($status['payment_status'] ?? ''));
            $isPaid = in_array($hostedStatus, ['PAYMENT_CREATED', 'COMPLETED'], true)
                || in_array($paymentStatus, ['PAID', 'CAPTURED', '9'], true);

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'result' => [
                    'hosted_checkout_id' => $hostedCheckoutId,
                    'is_paid' => $isPaid,
                    'hosted_checkout_status' => $status['hosted_checkout_status'] ?? null,
                    'payment_status' => $status['payment_status'] ?? null,
                    'payment_id' => $status['payment_id'] ?? null,
                ],
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE STATUS V1 ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'error' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/payments/worldline/return', function (\Illuminate\Http\Request $request) {
        try {
            $hostedCheckoutId = (string)$request->query('hostedCheckoutId', '');
            if ($hostedCheckoutId === '') {
                return response()->json([
                    'success' => false,
                    'provider' => 'worldline',
                    'error' => 'Missing hostedCheckoutId',
                ], 422);
            }

            $service = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $status = $service->getHostedCheckoutStatus($hostedCheckoutId);

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'hosted_checkout_id' => $hostedCheckoutId,
                'query' => $request->query(),
                'status_result' => [
                    'hosted_checkout_status' => $status['hosted_checkout_status'] ?? null,
                    'payment_status' => $status['payment_status'] ?? null,
                    'payment_id' => $status['payment_id'] ?? null,
                ],
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE RETURN V1 ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'error' => $e->getMessage(),
            ], 500);
        }
    });

    Route::post('/payments/worldline/inline/session', function (\Illuminate\Http\Request $request) {
        try {
            $payload = $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'currency' => 'required|string|size:3',
            ]);
            $svc = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $session = $svc->createInlineClientSession([
                'amount_minor' => (int)round(((float)$payload['amount']) * 100),
                'currency' => strtoupper((string)$payload['currency']),
            ]);
            if (empty($session['clientSessionId']) || empty($session['customerId']) || empty($session['clientApiUrl']) || empty($session['assetUrl'])) {
                return response()->json(['success' => false, 'error' => 'Worldline inline session response is incomplete'], 502);
            }
            return response()->json(['success' => true, 'session' => $session]);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE INLINE SESSION ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    });

    Route::post('/payments/worldline/inline/create-payment', function (\Illuminate\Http\Request $request) {
        try {
            $payload = $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'currency' => 'required|string|size:3',
                'paymentProductId' => 'required|integer|min:1',
                'encryptedCustomerInput' => 'required|string|min:10',
                'encodedClientMetaInfo' => 'nullable|string',
                'cardholderName' => 'nullable|string|max:255',
                'email' => 'nullable|email',
                'phone' => 'nullable|string|max:64',
            ]);
            $svc = app(\Admin\Classes\WorldlineHostedCheckoutService::class);

            try {
                \Log::info('PMD REAL INLINE ROUTE HIT', [
                    'path' => method_exists($request, 'path') ? $request->path() : null,
                    'full_url' => method_exists($request, 'fullUrl') ? $request->fullUrl() : null,
                    'host' => method_exists($request, 'getHost') ? $request->getHost() : null,
                    'payload' => json_decode(json_encode($request->all()), true),
                    'raw_input' => file_get_contents('php://input'),
                ]);
            } catch (\Throwable $__pmdRouteProbeErr) {
                \Log::error('PMD REAL INLINE ROUTE HIT LOG ERROR', [
                    'message' => $__pmdRouteProbeErr->getMessage(),
                ]);
            }
            $res = $svc->createInlinePayment([
                'amount_minor' => (int)round(((float)$payload['amount']) * 100),
                'currency' => strtoupper((string)$payload['currency']),
                'paymentProductId' => (int)$payload['paymentProductId'],
                'encryptedCustomerInput' => (string)$payload['encryptedCustomerInput'],
                'encodedClientMetaInfo' => (string)($payload['encodedClientMetaInfo'] ?? ''),
                'merchantCustomerId' => 'PMD-'.substr(sha1((string)($payload['email'] ?? $payload['phone'] ?? microtime(true))), 0, 12),
            ]);
            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'payment_id' => $res['payment_id'] ?? null,
                'status' => $res['status'] ?? null,
            ]);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE INLINE CREATE PAYMENT ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
                'responseBody' => method_exists($e, 'getResponseBody') ? $e->getResponseBody() : null,
            ]);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    });

    Route::post('/payments/worldline/inline/verify', function (\Illuminate\Http\Request $request) {
        try {
            $payload = $request->validate([
                'payment_id' => 'required|string',
            ]);
            $svc = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $res = $svc->verifyInlinePayment((string)$payload['payment_id']);
            return response()->json(['success' => true, 'provider' => 'worldline'] + $res);
        } catch (\Throwable $e) {
            \Log::error('WORLDLINE INLINE VERIFY ERROR', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    });

    Route::get('/payments/worldline/create-debug/{hostedCheckoutId}', function (string $hostedCheckoutId) {
        try {
            $service = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $host = request()->getHost();
            $session = $service->getCheckoutSession($host, $hostedCheckoutId);
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'provider' => 'worldline',
                    'error' => 'Hosted checkout session not found',
                    'hosted_checkout_id' => $hostedCheckoutId,
                ], 404);
            }

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'hosted_checkout_id' => $hostedCheckoutId,
                'environment' => $session['environment'] ?? null,
                'merchant_id' => $session['merchant_id'] ?? null,
                'return_mac' => $session['return_mac'] ?? null,
                'redirect_url' => $session['redirect_url'] ?? null,
                'redirect_source' => $session['redirect_source'] ?? null,
                'redirect_candidates' => $session['redirect_candidates'] ?? [],
                'raw_response' => $session['raw_response'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'error' => $e->getMessage(),
            ], 500);
        }
    });

    Route::post('/payments/sumup/checkout-status', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'checkout_id' => 'required|string',
        ]);

        $payment = \Admin\Models\Payments_model::query()->where('code', 'sumup')->first();
        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $token = (string)($data['access_token'] ?? '');
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');

        if ($token === '') {
            return response()->json(['success' => false, 'provider' => 'sumup', 'error' => 'SumUp credentials are incomplete'], 503);
        }

        try {
            $res = \Illuminate\Support\Facades\Http::withToken($token)
                ->acceptJson()
                ->get($baseUrl.'/v0.1/checkouts/'.urlencode((string)$payload['checkout_id']));

            if (!$res->ok()) {
                return response()->json(['success' => false, 'provider' => 'sumup', 'error' => 'Failed to fetch SumUp checkout status', 'details' => $res->json()], 502);
            }

            $body = (array)$res->json();
            $status = strtoupper((string)($body['status'] ?? ''));
            $isPaid = in_array($status, ['PAID', 'SUCCESSFUL'], true);
            $settlementStatus = match ($status) {
                'PAID', 'SUCCESSFUL' => 'paid',
                'FAILED' => 'failed',
                'EXPIRED' => 'cancelled',
                default => null,
            };

            if ($settlementStatus !== null && \Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')) {
                \Illuminate\Support\Facades\DB::table('order_payment_transactions')
                    ->where('payment_reference', (string)$payload['checkout_id'])
                    ->update([
                        'settlement_status' => $settlementStatus,
                        'updated_at' => now(),
                    ]);
            }

            \Log::channel('sumup')->info('SUMUP_CHECKOUT_STATUS_VERIFIED', [
                'host' => request()->getHost(),
                'checkout_id' => (string)$payload['checkout_id'],
                'upstream_status' => (int)$res->status(),
                'checkout_status' => $status !== '' ? $status : null,
                'is_paid' => $isPaid,
                'mapped_settlement_status' => $settlementStatus,
            ]);
            \Log::channel('sumup')->info('SUMUP_HOSTED_CHECKOUT_VERIFIED', [
                'host' => request()->getHost(),
                'checkout_id' => (string)$payload['checkout_id'],
                'checkout_status' => $status !== '' ? $status : null,
                'is_paid' => $isPaid,
                'transaction_code' => $body['transaction_code'] ?? null,
            ]);

            return response()->json([
                'success' => true,
                'provider' => 'sumup',
                'checkout_id' => (string)$payload['checkout_id'],
                'status' => $body['status'] ?? null,
                'transaction_code' => $body['transaction_code'] ?? null,
                'is_paid' => $isPaid,
                'raw_body' => array_intersect_key($body, array_flip([
                    'id',
                    'status',
                    'amount',
                    'currency',
                    'checkout_reference',
                    'transaction_code',
                    'transaction_id',
                ])),
            ], 200);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'provider' => 'sumup', 'error' => $e->getMessage()], 500);
        }
    });

    Route::post('/payments/sumup/widget-event', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'checkout_id' => 'required|string',
            'event_type' => 'required|string|max:32',
            'event_body' => 'nullable|array',
            'event_meta' => 'nullable|array',
        ]);

        \Log::channel('sumup')->info('SUMUP_WIDGET_EVENT', [
            'host' => request()->getHost(),
            'checkout_id' => (string)$payload['checkout_id'],
            'event_type' => strtolower((string)$payload['event_type']),
            'event_body' => (array)($payload['event_body'] ?? []),
            'event_meta' => (array)($payload['event_meta'] ?? []),
        ]);

        return response()->json([
            'success' => true,
            'provider' => 'sumup',
        ], 200);
    });

    Route::get('/payments/sumup/health', function () {
        $payment = \Admin\Models\Payments_model::query()->where('code', 'sumup')->first();
        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $token = trim((string)($data['access_token'] ?? ''));
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');
        $merchantCode = trim((string)($data['id_application'] ?? ''));

        if (!$payment || !(bool)$payment->status || $token === '') {
            return response()->json([
                'status' => 'failed',
                'message' => 'SumUp provider is not configured',
            ], 422);
        }

        $start = microtime(true);
        try {
            $res = \Illuminate\Support\Facades\Http::withToken($token)->acceptJson()->timeout(5)->get($baseUrl.'/v0.1/me');
            $json = (array)$res->json();
            if ($merchantCode === '') {
                $merchantCode = (string)(($json['merchant_profile']['merchant_code'] ?? $json['merchant_code'] ?? '') ?: '');
            }

            $latency = (int)round((microtime(true) - $start) * 1000);
            return response()->json([
                'status' => ($res->ok() && $merchantCode !== '') ? 'ok' : 'failed',
                'merchant_code' => $merchantCode !== '' ? $merchantCode : null,
                'latency_ms' => $latency,
            ], ($res->ok() && $merchantCode !== '') ? 200 : 502);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'failed',
                'merchant_code' => null,
                'latency_ms' => (int)round((microtime(true) - $start) * 1000),
                'message' => 'SumUp health check request failed',
            ], 500);
        }
    });

    Route::get('/payments/sumup/debug', function () {
        $payment = \Admin\Models\Payments_model::query()->where('code', 'sumup')->first();
        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $token = trim((string)($data['access_token'] ?? ''));
        $configuredMerchantCode = trim((string)($data['id_application'] ?? ''));
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');
        $preview = \Illuminate\Support\Facades\Cache::get('sumup_last_checkout_payload_'.request()->getHost());

        $meResult = null;
        $resolvedMerchantCode = '';
        if ($token !== '') {
            try {
                $resp = \Illuminate\Support\Facades\Http::withToken($token)->acceptJson()->timeout(5)->get($baseUrl.'/v0.1/me');
                $resolvedMerchantCode = trim((string)((($resp->json()['merchant_profile']['merchant_code'] ?? null) ?? ($resp->json()['merchant_code'] ?? '')) ?: ''));
                $meResult = [
                    'ok' => $resp->ok(),
                    'status' => $resp->status(),
                    'body' => $resp->json(),
                ];
            } catch (\Throwable $e) {
                $meResult = [
                    'ok' => false,
                    'status' => 500,
                    'body' => ['message' => $e->getMessage()],
                ];
            }
        }
        $effectiveMerchantCode = $configuredMerchantCode !== '' ? $configuredMerchantCode : $resolvedMerchantCode;
        $effectiveMerchantCodeSource = $configuredMerchantCode !== '' ? 'configured' : ($resolvedMerchantCode !== '' ? 'resolved_from_me' : null);

        \Log::channel('sumup')->info('SUMUP_DEBUG_ENDPOINT_HIT', [
            'host' => request()->getHost(),
            'provider_loaded' => (bool)$payment,
            'token_present' => $token !== '',
            'configured_merchant_code' => $configuredMerchantCode !== '' ? $configuredMerchantCode : null,
            'resolved_merchant_code' => $resolvedMerchantCode !== '' ? $resolvedMerchantCode : null,
            'effective_merchant_code' => $effectiveMerchantCode !== '' ? $effectiveMerchantCode : null,
            'effective_merchant_code_source' => $effectiveMerchantCodeSource,
            'payload_preview' => $preview,
            'me_ok' => $meResult['ok'] ?? null,
        ]);

        return response()->json([
            'provider_loaded' => (bool)$payment,
            'token_present' => $token !== '',
            'merchant_code_present' => $effectiveMerchantCode !== '',
            'configured_merchant_code' => $configuredMerchantCode !== '' ? $configuredMerchantCode : null,
            'resolved_merchant_code_from_me' => $resolvedMerchantCode !== '' ? $resolvedMerchantCode : null,
            'effective_merchant_code' => $effectiveMerchantCode !== '' ? $effectiveMerchantCode : null,
            'effective_merchant_code_source' => $effectiveMerchantCodeSource,
            'me_result' => $meResult,
            'last_create_checkout_payload_preview' => $preview,
        ]);
    });

    Route::post('/payments/square/checkout-status', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'payment_link_id' => 'required|string',
        ]);

        $payment = \Admin\Models\Payments_model::query()->where('code', 'square')->first();
        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $mode = (string)($data['transaction_mode'] ?? 'test');
        $accessToken = $mode === 'live'
            ? (string)($data['live_access_token'] ?? '')
            : (string)($data['test_access_token'] ?? '');

        if ($accessToken === '') {
            return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square credentials are incomplete'], 503);
        }

        $base = $mode === 'live' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
        $headers = [
            'Authorization' => 'Bearer '.$accessToken,
            'Accept' => 'application/json',
        ];

        try {
            $linkRes = \Illuminate\Support\Facades\Http::withHeaders($headers)->get($base.'/v2/online-checkout/payment-links/'.urlencode((string)$payload['payment_link_id']));
            if (!$linkRes->ok()) {
                return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Failed to fetch Square payment link status', 'details' => $linkRes->json()], 502);
            }

            $linkBody = (array)$linkRes->json();
            $orderId = (string)($linkBody['payment_link']['order_id'] ?? '');
            if ($orderId === '') {
                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'payment_link_id' => (string)$payload['payment_link_id'],
                    'is_paid' => false,
                    'status' => 'ORDER_ID_MISSING',
                ], 200);
            }

            $orderRes = \Illuminate\Support\Facades\Http::withHeaders($headers)->get($base.'/v2/orders/'.urlencode($orderId));
            if (!$orderRes->ok()) {
                return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Failed to fetch Square order status', 'details' => $orderRes->json()], 502);
            }

            $orderBody = (array)$orderRes->json();
            $state = strtoupper((string)($orderBody['order']['state'] ?? ''));
            $isPaid = in_array($state, ['COMPLETED'], true);

            return response()->json([
                'success' => true,
                'provider' => 'square',
                'payment_link_id' => (string)$payload['payment_link_id'],
                'order_id' => $orderId,
                'status' => $state,
                'is_paid' => $isPaid,
            ], 200);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage()], 500);
        }
    });

    Route::get('/payments/worldline/wero/debug-last', function () use ($loadWorldlineWeroDebug) {
        return response()->json([
            'success' => true,
            'host' => request()->getHost(),
            'debug' => $loadWorldlineWeroDebug(),
        ], 200);
    });

    Route::get('/payments/worldline/wero/availability-last', function () use ($loadWorldlineWeroDebug) {
        return response()->json([
            'success' => true,
            'host' => request()->getHost(),
            'availability' => $loadWorldlineWeroDebug(),
        ], 200);
    });

    Route::post('/payments/worldline/wero/create-session', function (\Illuminate\Http\Request $request) use ($resolveRuntimeMethodCollection, $resolveWorldlineWeroReadiness, $persistWorldlineWeroCapabilityStatus, $resolveWorldlineWeroProductId, $persistWorldlineWeroDebug, $extractWorldlineExceptionDetails) {
        $runtimeMethods = collect($resolveRuntimeMethodCollection(false))->keyBy('code');
        $weroMethod = (array)$runtimeMethods->get('wero', []);
        if (empty($weroMethod)) {
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'method' => 'wero',
                'error_code' => 'wero_unavailable',
                'resolved_error_code' => 'wero_unavailable',
                'allow_fallback' => false,
                'display_message' => 'Wero is currently unavailable. Please choose another payment method.',
                'error' => 'Wero method is disabled',
            ], 422);
        }

        $providerCode = (string)($weroMethod['provider_code'] ?? '');
        if ($providerCode !== 'worldline') {
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'method' => 'wero',
                'error_code' => 'wero_provider_mismatch',
                'resolved_error_code' => 'wero_provider_mismatch',
                'allow_fallback' => false,
                'display_message' => 'Wero is not configured correctly for this store. Please choose another payment method.',
                'error' => 'Wero is not configured for Worldline on this tenant',
            ], 422);
        }

        $worldlineWeroReadiness = $resolveWorldlineWeroReadiness();
        if (!($worldlineWeroReadiness['ready'] ?? false)) {
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'method' => 'wero',
                'error_code' => 'wero_not_supported',
                'resolved_error_code' => 'wero_not_supported',
                'allow_fallback' => false,
                'display_message' => 'Wero is not available for the current store configuration. Please choose another payment method.',
                'error' => 'Wero is not available for the current Worldline configuration.',
            ], 503);
        }

        $payload = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|size:3',
            'return_url' => 'required|url',
            'cancel_url' => 'nullable|url',
            'locale' => 'nullable|string|max:10',
            'country_code' => 'nullable|string|size:2',
            'merchant_customer_id' => 'nullable|string|max:64',
        ]);

        try {
            $svc = app(\Admin\Classes\WorldlineHostedCheckoutService::class);
            $diagnostics = $svc->getConfigForDiagnostics();
            $productIdResolution = $resolveWorldlineWeroProductId($worldlineWeroReadiness, $diagnostics);
            if (($productIdResolution['reason'] ?? '') !== 'configured') {
                \Admin\Classes\PaymentLogger::warning('Worldline Wero payment product id adjusted', [
                    'provider' => 'worldline',
                    'payment_method' => 'wero',
                    'request_meta' => [
                        'configured_product_id' => $productIdResolution['configured_product_id'] ?? null,
                        'effective_product_id' => $productIdResolution['effective_product_id'] ?? null,
                        'reason' => $productIdResolution['reason'] ?? null,
                        'is_globalcollect' => $productIdResolution['is_globalcollect'] ?? null,
                        'environment' => $productIdResolution['environment'] ?? null,
                        'note' => 'No runtime product-id rewrite is applied. Configure/verify product id in Worldline merchant settings.',
                    ],
                ]);

                return response()->json([
                    'success' => false,
                    'provider' => 'worldline',
                    'method' => 'wero',
                    'error_code' => 'worldline_provider_configuration_invalid',
                    'resolved_error_code' => 'worldline_provider_configuration_invalid',
                    'allow_fallback' => false,
                    'display_message' => 'Wero is not configured correctly for this store. Please choose another payment method.',
                    'error' => 'Worldline Wero payment product id is missing or invalid in provider configuration.',
                    'details' => [
                        'configured_product_id' => $productIdResolution['configured_product_id'] ?? null,
                        'effective_product_id' => $productIdResolution['effective_product_id'] ?? null,
                        'environment' => $productIdResolution['environment'] ?? null,
                    ],
                ], 422);
            }

            $result = $svc->createHostedCheckout([
                'amount_minor' => (int)round(((float)$payload['amount']) * 100),
                'currency' => strtoupper((string)$payload['currency']),
                'return_url' => (string)$payload['return_url'],
                'cancel_url' => (string)($payload['cancel_url'] ?? $payload['return_url']),
                'locale' => (string)($payload['locale'] ?? 'de_DE'),
                'country_code' => strtoupper((string)($payload['country_code'] ?? 'DE')),
                'merchant_customer_id' => (string)($payload['merchant_customer_id'] ?? ('PMD-WERO-'.substr(sha1((string)microtime(true)), 0, 12))),
                'payment_method' => 'wero',
                'payment_product_id' => (int)($productIdResolution['effective_product_id'] ?? 0),
            ]);

            $persistWorldlineWeroDebug([
                'updated_at' => gmdate('c'),
                'host' => request()->getHost(),
                'tenant_database' => $diagnostics['tenant_database'] ?? null,
                'merchant_id' => $diagnostics['merchant_id'] ?? null,
                'environment' => $diagnostics['environment'] ?? null,
                'phase' => 'success',
                'payment_method' => 'wero',
                'configured_product_id' => $productIdResolution['configured_product_id'] ?? null,
                'effective_product_id' => $productIdResolution['effective_product_id'] ?? null,
                'country_code' => strtoupper((string)($payload['country_code'] ?? 'DE')),
                'currency' => strtoupper((string)$payload['currency']),
                'locale' => (string)($payload['locale'] ?? 'de_DE'),
                'provider_error_id' => null,
                'upstream_code' => null,
                'provider_exception' => [
                    'errors' => [],
                ],
                'resolved_error_code' => null,
                'request_payload' => [
                    'amount' => (float)$payload['amount'],
                    'currency' => strtoupper((string)$payload['currency']),
                    'return_url' => (string)$payload['return_url'],
                    'locale' => (string)($payload['locale'] ?? 'de_DE'),
                    'country_code' => strtoupper((string)($payload['country_code'] ?? 'DE')),
                    'payment_product_id' => (int)($productIdResolution['effective_product_id'] ?? 0),
                ],
                'provider_response' => [
                    'hosted_checkout_id' => (string)($result['hosted_checkout_id'] ?? ''),
                    'redirect_url_present' => !empty($result['redirect_url']),
                ],
            ]);

            $redirectUrl = (string)($result['redirect_url'] ?? '');
            if ($redirectUrl === '') {
                return response()->json([
                    'success' => false,
                    'provider' => 'worldline',
                    'method' => 'wero',
                    'error_code' => 'wero_redirect_missing',
                    'resolved_error_code' => 'wero_redirect_missing',
                    'allow_fallback' => false,
                    'display_message' => 'Wero checkout could not be started. Please choose another payment method.',
                    'error' => 'Worldline Wero checkout URL is missing.',
                ], 502);
            }

            $persistWorldlineWeroCapabilityStatus('supported');

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'method' => 'wero',
                'payment_method' => 'wero',
                'resolved_error_code' => null,
                'allow_fallback' => false,
                'fallback' => false,
                'fallback_candidate' => null,
                'original_provider' => 'worldline',
                'actual_provider' => 'worldline',
                'redirect_url' => $redirectUrl,
                'hosted_checkout_id' => (string)($result['hosted_checkout_id'] ?? ''),
            ]);
        } catch (\Throwable $e) {
            $requestId = (string)\Illuminate\Support\Str::uuid();
            $providerException = $extractWorldlineExceptionDetails($e);
            $statusCode = (int)($providerException['httpStatusCode'] ?? 0) ?: (method_exists($e, 'getStatusCode') ? (int)$e->getStatusCode() : null);
            $providerErrorId = (string)($providerException['errorId'] ?? '') ?: (method_exists($e, 'getErrorId') ? (string)$e->getErrorId() : null);
            $responseBody = (string)($providerException['raw_response_body'] ?? '');
            $errorMessage = (string)$e->getMessage();
            $errorLower = strtolower($errorMessage.' '.$responseBody);
            $upstreamErrors = (array)($providerException['errors'] ?? []);
            $upstreamError = is_array($upstreamErrors[0] ?? null) ? (array)$upstreamErrors[0] : [];
            $upstreamCode = (string)($upstreamError['code'] ?? '');
            $upstreamErrorId = strtoupper((string)($upstreamError['id'] ?? ''));
            $propertyName = (string)($upstreamError['propertyName'] ?? '');
            $errorCode = 'worldline_internal_exception';
            $humanMessage = 'Worldline Wero checkout is currently unavailable. Please try again later.';
            $httpCode = 502;
            $allowStripeFallback = false;

            $isNoPaymentProductsAvailable = $upstreamErrorId === 'NO_PAYMENT_PRODUCTS_AVAILABLE' || $upstreamCode === '1406';

            if ($isNoPaymentProductsAvailable) {
                $errorCode = 'wero_product_not_available';
                $humanMessage = 'Wero is not available for this Worldline merchant / payment product configuration.';
                $httpCode = 422;
                $allowStripeFallback = false;
                $persistWorldlineWeroCapabilityStatus('unsupported', $humanMessage);
            } elseif (
                str_contains($errorLower, 'toobject()')
                || str_contains($errorLower, 'hostedcheckoutspecificinput')
                || str_contains($errorLower, 'paymentproductfilters')
            ) {
                $errorCode = 'worldline_sdk_object_construction_failed';
                $humanMessage = 'Worldline Wero request object construction failed before provider authorization.';
                $httpCode = 500;
            } elseif (str_contains($errorLower, 'config') || str_contains($errorLower, 'credential') || str_contains($errorLower, 'merchant') || str_contains($errorLower, 'not found')) {
                $errorCode = 'worldline_provider_configuration_invalid';
                $humanMessage = 'Worldline Wero is not configured correctly for this restaurant.';
            } elseif (str_contains($errorLower, 'validation') || str_contains($errorLower, 'invalid') || str_contains($errorLower, 'unprocessable')) {
                $errorCode = 'worldline_request_validation_failed';
                $humanMessage = 'Worldline rejected the Wero checkout request due to provider-side validation.';
                $persistWorldlineWeroCapabilityStatus('unsupported', $errorMessage);
            } elseif ($statusCode >= 400 && $statusCode < 500) {
                $errorCode = 'worldline_request_validation_failed';
                $humanMessage = 'Worldline rejected the Wero checkout request due to request-field validation.';
                $httpCode = max(400, min(499, (int)$statusCode ?: 422));
                if (strtolower($upstreamCode) === '21000220' || str_contains(strtolower($propertyName), 'merchantcustomerid')) {
                    $errorCode = 'worldline_merchant_customer_id_invalid';
                    $humanMessage = 'Worldline rejected merchantCustomerId length/format.';
                }
            } elseif ($statusCode === 401 || $statusCode === 403) {
                $errorCode = 'worldline_invalid_credentials_or_entitlement';
                $humanMessage = 'Worldline credentials are not authorized for Wero on this merchant account.';
                $httpCode = 503;
                $allowStripeFallback = true;
            } elseif ($statusCode >= 500) {
                $errorCode = 'worldline_session_unavailable';
                $humanMessage = 'Worldline is temporarily unavailable. Please try again shortly.';
                $httpCode = 503;
                $allowStripeFallback = true;
            } elseif ($statusCode > 0) {
                $httpCode = max(400, min(599, $statusCode));
            }

            $diagnostics = [];
            if (isset($svc)) {
                try {
                    $diagnostics = $svc->getConfigForDiagnostics();
                } catch (\Throwable $diagError) {
                    $diagnostics = [];
                }
            }

            \Admin\Classes\PaymentLogger::exception('Worldline Wero create-session failed', $e, [
                'provider' => 'worldline',
                'payment_method' => 'wero',
                'host' => request()->getHost(),
                'tenant_database' => $diagnostics['tenant_database'] ?? null,
                'config_id' => $diagnostics['config_id'] ?? null,
                'environment' => $diagnostics['environment'] ?? null,
                'payment_product_filters_included' => false,
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'code' => method_exists($e, 'getCode') ? $e->getCode() : null,
                'statusCode' => $statusCode,
                'provider_error_id' => $providerErrorId,
                'responseBody' => $responseBody !== '' ? mb_substr($responseBody, 0, 2000) : null,
                'provider_exception' => $providerException,
                'resolved_error_code' => $errorCode,
                'request_id' => $requestId,
            ]);

            $persistWorldlineWeroDebug([
                'updated_at' => gmdate('c'),
                'host' => request()->getHost(),
                'tenant_database' => $diagnostics['tenant_database'] ?? null,
                'merchant_id' => $diagnostics['merchant_id'] ?? null,
                'environment' => $diagnostics['environment'] ?? null,
                'phase' => 'error',
                'payment_method' => 'wero',
                'configured_product_id' => isset($productIdResolution) ? ($productIdResolution['configured_product_id'] ?? null) : null,
                'effective_product_id' => isset($productIdResolution) ? ($productIdResolution['effective_product_id'] ?? null) : null,
                'country_code' => strtoupper((string)($payload['country_code'] ?? 'DE')),
                'currency' => strtoupper((string)($payload['currency'] ?? 'EUR')),
                'locale' => (string)($payload['locale'] ?? 'de_DE'),
                'provider_error_id' => $providerErrorId ?: null,
                'upstream_code' => $upstreamCode !== '' ? $upstreamCode : null,
                'resolved_error_code' => $errorCode,
                'provider_exception' => [
                    'httpStatusCode' => $providerException['httpStatusCode'] ?? null,
                    'errorId' => $providerException['errorId'] ?? null,
                    'category' => $providerException['category'] ?? null,
                    'errors' => $upstreamErrors,
                    'raw_response_body' => $providerException['raw_response_body'] ?? null,
                ],
            ]);
            return response()->json([
                'success' => false,
                'provider' => 'worldline',
                'method' => 'wero',
                'error_code' => $errorCode,
                'resolved_error_code' => $errorCode,
                'allow_fallback' => $allowStripeFallback,
                'fallback_candidate' => $allowStripeFallback ? ['provider' => 'stripe', 'method' => 'ideal'] : null,
                'request_id' => $requestId,
                'error' => $humanMessage,
                'details' => [
                    'provider_error_id' => $providerErrorId ?: null,
                    'provider_status' => $statusCode,
                    'property_name' => $propertyName !== '' ? $propertyName : null,
                    'upstream_code' => $upstreamCode !== '' ? $upstreamCode : null,
                    'response_body' => $responseBody !== '' ? mb_substr($responseBody, 0, 2000) : null,
                ],
                'provider_status' => $statusCode,
                'provider_error_id' => $providerErrorId ?: null,
                'property_name' => $propertyName !== '' ? $propertyName : null,
                'upstream_code' => $upstreamCode !== '' ? $upstreamCode : null,
                'category' => ($providerException['category'] ?? '') !== '' ? (string)$providerException['category'] : null,
                'errors' => $upstreamErrors,
                'response_body' => $responseBody !== '' ? mb_substr($responseBody, 0, 2000) : null,
            ], $httpCode);
        }
    });

    Route::post('/payments/wero/create-session', function (\Illuminate\Http\Request $request) use ($resolveRuntimeMethodCollection, $resolveStripeRuntimeReadiness, $persistStripeWeroCapabilityStatus) {
        $runtimeMethods = collect($resolveRuntimeMethodCollection(false))->keyBy('code');
        $weroMethod = (array)$runtimeMethods->get('wero', []);
        if (empty($weroMethod)) {
            return response()->json([
                'success' => false,
                'error_code' => 'wero_unavailable',
                'resolved_error_code' => 'wero_unavailable',
                'allow_fallback' => false,
                'display_message' => 'Wero is currently unavailable. Please choose another payment method.',
                'error' => 'Wero method is disabled',
            ], 422);
        }

        $providerCode = strtolower((string)($weroMethod['provider_code'] ?? 'stripe'));
        $fallbackFromWorldline = filter_var($request->input('fallback_from_worldline', false), FILTER_VALIDATE_BOOLEAN);
        if ($providerCode !== 'stripe' && !$fallbackFromWorldline) {
            return response()->json(['success' => false, 'error' => 'Wero is not configured for Stripe on this tenant'], 422);
        }
        $isExplicitFallback = $fallbackFromWorldline;

        $resolveStripeRuntimeReadiness();

        $payload = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|size:3',
            'return_url' => 'required|url',
            'cancel_url' => 'nullable|url',
            'items' => 'nullable|array',
            'customer_email' => 'nullable|email',
            'fallback_method' => 'nullable|string|in:ideal',
            'fallback_from_worldline' => 'nullable|boolean',
        ]);

        $payment = \Admin\Models\Payments_model::isEnabled()->where('code', 'stripe')->first();
        if (!$payment) {
            return response()->json(['success' => false, 'error' => 'Stripe not configured'], 404);
        }

        $data = is_array($payment->data ?? null) ? (array)$payment->data : [];
        $mode = (string)($data['transaction_mode'] ?? 'test');
        $secretKey = $mode === 'live'
            ? (string)($data['live_secret_key'] ?? '')
            : (string)($data['test_secret_key'] ?? '');

        if ($secretKey === '') {
            return response()->json(['success' => false, 'error' => 'Stripe secret key not configured'], 503);
        }

        try {
            \Admin\Classes\PaymentLogger::info('Stripe Wero session requested', [
                'provider' => 'stripe',
                'payment_method' => 'wero',
                'request_meta' => [
                    'fallback_from_worldline' => $fallbackFromWorldline,
                    'requested_method' => 'wero',
                    'configured_runtime_provider' => $providerCode,
                    'flow_mode' => $isExplicitFallback ? 'fallback' : 'primary',
                ],
            ]);
            \Stripe\Stripe::setApiKey($secretKey);
            $currency = strtolower((string)$payload['currency']);
            $amountMinor = (int)round(((float)$payload['amount']) * 100);
            $cancelUrl = (string)($payload['cancel_url'] ?? $payload['return_url']);
            $successUrl = (string)$payload['return_url'];
            $successUrl .= (str_contains($successUrl, '?') ? '&' : '?').'session_id={CHECKOUT_SESSION_ID}';

            $lineItems = collect((array)($payload['items'] ?? []))
                ->filter(fn ($item) => is_array($item))
                ->map(function ($item) use ($currency) {
                    $qty = max(1, (int)($item['quantity'] ?? 1));
                    $unitAmountMinor = (int)round(((float)($item['price'] ?? 0)) * 100);
                    if ($unitAmountMinor <= 0) {
                        return null;
                    }

                    return [
                        'price_data' => [
                            'currency' => $currency,
                            'product_data' => [
                                'name' => (string)($item['name'] ?? 'Paymydine item'),
                            ],
                            'unit_amount' => $unitAmountMinor,
                        ],
                        'quantity' => $qty,
                    ];
                })
                ->filter()
                ->values()
                ->all();

            if (empty($lineItems)) {
                $lineItems = [[
                    'price_data' => [
                        'currency' => $currency,
                        'product_data' => ['name' => 'Paymydine order'],
                        'unit_amount' => $amountMinor,
                    ],
                    'quantity' => 1,
                ]];
            }

            $fallbackMethod = strtolower((string)($payload['fallback_method'] ?? ''));
            if ($fallbackMethod === '') {
                $fallbackMethod = 'ideal';
            }

            if ($fallbackMethod !== 'ideal') {
                return response()->json([
                    'success' => false,
                    'provider' => 'stripe',
                    'method' => 'wero',
                    'error_code' => 'stripe_fallback_method_invalid',
                    'error' => 'Unsupported Stripe fallback method.',
                ], 422);
            }

            if ($currency !== 'eur') {
                return response()->json([
                    'success' => false,
                    'provider' => 'stripe',
                    'method' => 'wero',
                    'error_code' => 'stripe_fallback_currency_invalid',
                    'error' => 'Stripe iDEAL fallback requires EUR currency.',
                ], 422);
            }

            $checkoutPayload = [
                'mode' => 'payment',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'payment_method_types' => ['ideal'],
                'line_items' => $lineItems,
                'metadata' => [
                    'provider' => 'stripe',
                    'payment_method' => 'ideal',
                    'requested_method' => 'wero',
                    'flow_mode' => $isExplicitFallback ? 'fallback' : 'primary',
                ],
            ];
            $customerEmail = trim((string)($payload['customer_email'] ?? ''));
            if ($customerEmail !== '') {
                $checkoutPayload['customer_email'] = $customerEmail;
            }

            $session = \Stripe\Checkout\Session::create($checkoutPayload);
            $persistStripeWeroCapabilityStatus('supported');

            return response()->json([
                'success' => true,
                'provider' => 'stripe',
                'method' => 'wero',
                'provider_method' => 'ideal',
                'requested_method' => 'wero',
                'fallback' => $isExplicitFallback,
                'fallback_provider' => $isExplicitFallback ? 'stripe' : null,
                'fallback_method' => $isExplicitFallback ? 'ideal' : null,
                'original_provider' => $isExplicitFallback ? 'worldline' : 'stripe',
                'redirect_url' => (string)($session->url ?? ''),
                'session_id' => (string)($session->id ?? ''),
            ]);
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $message = (string)$e->getMessage();
            $isUnsupportedWero = str_contains(strtolower($message), 'invalid payment_method_types')
                || str_contains(strtolower($message), 'payment_method_types[0]');
            $httpHeaders = method_exists($e, 'getHttpHeaders') ? (array)$e->getHttpHeaders() : [];
            $requestId = (string)($httpHeaders['Request-Id'] ?? $httpHeaders['request-id'] ?? '');
            \Log::warning('Wero create-session Stripe invalid request', [
                'provider' => 'stripe',
                'method' => 'wero',
                'mode' => $mode,
                'message' => $message,
                'class' => get_class($e),
                'stripe_code' => method_exists($e, 'getStripeCode') ? $e->getStripeCode() : null,
                'http_status' => method_exists($e, 'getHttpStatus') ? $e->getHttpStatus() : null,
                'param' => method_exists($e, 'getStripeParam') ? $e->getStripeParam() : null,
                'request_id' => $requestId !== '' ? $requestId : (method_exists($e, 'getRequestId') ? $e->getRequestId() : null),
            ]);

            if ($isUnsupportedWero) {
                $persistStripeWeroCapabilityStatus('unsupported', $message);
                return response()->json([
                    'success' => false,
                    'provider' => 'stripe',
                    'method' => 'wero',
                    'error_code' => 'wero_not_supported',
                    'error' => 'Wero is not available for the current Stripe account or region.',
                    'stripe_message' => $message,
                ], 422);
            }

            return response()->json([
                'success' => false,
                'provider' => 'stripe',
                'method' => 'wero',
                'error_code' => 'wero_invalid_request',
                'error' => 'Stripe rejected the Wero checkout request.',
                'stripe_message' => $message,
            ], 422);
        } catch (\Throwable $e) {
            \Log::error('Wero create-session failed', [
                'provider' => 'stripe',
                'method' => 'wero',
                'mode' => $mode ?? null,
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'code' => method_exists($e, 'getCode') ? $e->getCode() : null,
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage() ?: 'Failed to create Wero checkout session',
            ], 500);
        }
    });

    Route::post('/payments/wero/checkout-status', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'session_id' => 'required|string',
        ]);

        $payment = \Admin\Models\Payments_model::isEnabled()->where('code', 'stripe')->first();
        if (!$payment) {
            return response()->json(['success' => false, 'provider' => 'stripe', 'method' => 'wero', 'error' => 'Stripe not configured'], 404);
        }
        $data = is_array($payment->data ?? null) ? (array)$payment->data : [];
        $mode = (string)($data['transaction_mode'] ?? 'test');
        $secretKey = $mode === 'live'
            ? (string)($data['live_secret_key'] ?? '')
            : (string)($data['test_secret_key'] ?? '');
        if ($secretKey === '') {
            return response()->json(['success' => false, 'provider' => 'stripe', 'method' => 'wero', 'error' => 'Stripe secret key not configured'], 503);
        }

        try {
            \Stripe\Stripe::setApiKey($secretKey);
            $session = \Stripe\Checkout\Session::retrieve((string)$payload['session_id']);
            $paymentStatus = strtolower((string)($session->payment_status ?? ''));
            $isPaid = $paymentStatus === 'paid';
            $paymentIntentId = (string)($session->payment_intent ?? '');

            return response()->json([
                'success' => true,
                'provider' => 'stripe',
                'method' => 'wero',
                'session_id' => (string)$payload['session_id'],
                'is_paid' => $isPaid,
                'payment_status' => $paymentStatus,
                'payment_intent_id' => $paymentIntentId !== '' ? $paymentIntentId : null,
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('Wero checkout-status failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'provider' => 'stripe',
                'method' => 'wero',
                'error' => $e->getMessage(),
            ], 500);
        }
    });

    // Create Stripe PaymentIntent using tenant secret from DB


    $resolvePaypalRuntimeConfig = function () use ($defaultPaymentMethods, $defaultPaymentProviders, $loadJsonSetting): array {
        $methods = collect($loadJsonSetting('payment_methods', $defaultPaymentMethods))->keyBy('code');
        $providers = collect($loadJsonSetting('payment_providers', $defaultPaymentProviders))->keyBy('code');
        $paypalProvider = (array)$providers->get('paypal', []);
        $providerEnabled = (bool)($paypalProvider['enabled'] ?? false);

        $paypalMethodEnabled = (bool)(($methods->get('paypal')['enabled'] ?? false) && (($methods->get('paypal')['provider_code'] ?? null) === 'paypal'));
        $cardMethodEnabled = (bool)(($methods->get('card')['enabled'] ?? false) && (($methods->get('card')['provider_code'] ?? null) === 'paypal'));
        $applePayMethodEnabled = (bool)(($methods->get('apple_pay')['enabled'] ?? false) && (($methods->get('apple_pay')['provider_code'] ?? null) === 'paypal'));
        $googlePayMethodEnabled = (bool)(($methods->get('google_pay')['enabled'] ?? false) && (($methods->get('google_pay')['provider_code'] ?? null) === 'paypal'));

        $row = \Admin\Models\Payments_model::query()
            ->whereIn('code', ['paypal', 'paypalexpress'])
            ->where('status', 1)
            ->orderByRaw("CASE WHEN code = 'paypal' THEN 0 ELSE 1 END")
            ->orderByDesc('payment_id')
            ->first();

        $paymentData = is_array(optional($row)->data) ? (array)$row->data : [];
        $providerConfig = is_array($paypalProvider['config'] ?? null) ? (array)$paypalProvider['config'] : [];
        $pdata = array_merge($providerConfig, $paymentData);

        $mode = (string)($pdata['transaction_mode'] ?? ($pdata['api_mode'] ?? 'test'));
        if ($mode === 'sandbox') {
            $mode = 'test';
        }
        $clientId = $mode === 'live'
            ? (string)($pdata['live_client_id'] ?? '')
            : (string)($pdata['test_client_id'] ?? '');
        $clientSecret = $mode === 'live'
            ? (string)($pdata['live_client_secret'] ?? '')
            : (string)($pdata['test_client_secret'] ?? '');

        return [
            'provider_enabled' => $providerEnabled,
            'paypal_enabled' => $paypalMethodEnabled,
            'card_enabled' => $cardMethodEnabled,
            'apple_pay_enabled' => $applePayMethodEnabled,
            'google_pay_enabled' => $googlePayMethodEnabled,
            'mode' => $mode,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'brand_name' => (string)($pdata['brand_name'] ?? ''),
        ];
    };

    // ================================
    // PMD_PUBLIC_PAYPAL_ROUTES_V1
    // Public frontend config for PayPal (NO secret exposed)
    // ================================
    Route::get('/payments/config-public', function () use ($resolvePaypalRuntimeConfig) {
        $settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');
        $rawCurrency = $settings['default_currency_code']->value ?? ($settings['default_currency']->value ?? null);

        if (!$rawCurrency) {
            $resolvedCurrency = 'EUR';
        } elseif (!preg_match('/^\d+$/', (string)$rawCurrency)) {
            $resolvedCurrency = strtoupper((string)$rawCurrency);
        } else {
            $resolvedCurrency = strtoupper((string)(
                \Illuminate\Support\Facades\DB::table('currencies')
                    ->where('currency_id', (int)$rawCurrency)
                    ->value('currency_code') ?: 'EUR'
            ));
        }

        $countryCode = strtoupper((string)($settings['country_code']->value ?? 'DE'));

        $runtime = $resolvePaypalRuntimeConfig();
        $paypalEnabled = (bool)$runtime['provider_enabled'] && (
            (bool)$runtime['paypal_enabled']
            || (bool)$runtime['card_enabled']
            || (bool)$runtime['apple_pay_enabled']
            || (bool)$runtime['google_pay_enabled']
        );
        $paypalClientId = (string)($runtime['client_id'] ?? '');
        $pmode = (string)($runtime['mode'] ?? 'test');

        return response()->json([
            'success' => true,
            'paypalEnabled' => $paypalEnabled && !empty($paypalClientId),
            'paypalMethodEnabled' => (bool)$runtime['paypal_enabled'],
            'paypalCardEnabled' => (bool)$runtime['card_enabled'],
            'paypalApplePayEnabled' => (bool)$runtime['apple_pay_enabled'],
            'paypalGooglePayEnabled' => (bool)$runtime['google_pay_enabled'],
            'paypalClientId' => $paypalClientId,
            'paypalMode' => $pmode,
            'currency' => $resolvedCurrency,
            'countryCode' => $countryCode,
        ], 200);
    });


    // PMD_LIVE_TENANT_PAYMENTS_DEBUG
    Route::get('/debug/live-payments', function (\Illuminate\Http\Request $request) {
        if ((string)$request->query('token') !== 'PMD_DEBUG_20260308') {
            abort(403);
        }

        $rows = \Illuminate\Support\Facades\DB::table('payments')
            ->select('payment_id', 'code', 'name', 'status', 'is_default', 'updated_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('payment_id')
            ->get();

        $paypalexpress = \Illuminate\Support\Facades\DB::table('payments')
            ->where('code', 'paypalexpress')
            ->orderByDesc('payment_id')
            ->first();

        return response()->json([
            'host' => $request->getHost(),
            'app_env' => config('app.env'),
            'db_default' => config('database.default'),
            'db_name' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'rows' => $rows,
            'paypalexpress' => $paypalexpress,
            'paypalexpress_data_decoded' => $paypalexpress && !empty($paypalexpress->data)
                ? json_decode((string)$paypalexpress->data, true)
                : null,
        ], 200);
    });

    Route::post('/debug/live-payments-clean', function (\Illuminate\Http\Request $request) {
        if ((string)$request->input('token') !== 'PMD_DEBUG_20260308') {
            abort(403);
        }

        $badCodes = ['apple_pa', 'apple_pay1', 'paypall', 'paypal'];

        $before = \Illuminate\Support\Facades\DB::table('payments')
            ->whereIn('code', $badCodes)
            ->get();

        $deleted = \Illuminate\Support\Facades\DB::table('payments')
            ->whereIn('code', $badCodes)
            ->delete();

        $after = \Illuminate\Support\Facades\DB::table('payments')
            ->select('payment_id', 'code', 'name', 'status', 'is_default', 'updated_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('payment_id')
            ->get();

        return response()->json([
            'host' => $request->getHost(),
            'db_name' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'deleted_count' => $deleted,
            'before' => $before,
            'after' => $after,
        ], 200);
    });

    Route::post('/debug/live-payments-fix-paypal', function (\Illuminate\Http\Request $request) {
        if ((string)$request->input('token') !== 'PMD_DEBUG_20260308') {
            abort(403);
        }

        $rowsBefore = \Illuminate\Support\Facades\DB::table('payments')
            ->select('payment_id', 'code', 'name', 'status', 'is_default', 'priority', 'updated_at', 'data')
            ->whereIn('code', ['paypa', 'paypalexpress', 'paypal', 'paypall'])
            ->orderBy('payment_id')
            ->get();

        $bad = \Illuminate\Support\Facades\DB::table('payments')
            ->where('code', 'paypa')
            ->orderByDesc('payment_id')
            ->first();

        $good = \Illuminate\Support\Facades\DB::table('payments')
            ->where('code', 'paypalexpress')
            ->orderByDesc('payment_id')
            ->first();

        \Illuminate\Support\Facades\DB::beginTransaction();

        try {
            if ($bad && $good) {
                \Illuminate\Support\Facades\DB::table('payments')
                    ->where('payment_id', $good->payment_id)
                    ->update([
                        'name' => $bad->name ?: $good->name,
                        'class_name' => $bad->class_name ?: $good->class_name,
                        'description' => $bad->description ?: $good->description,
                        'data' => !empty($bad->data) ? $bad->data : $good->data,
                        'status' => $bad->status,
                        'is_default' => $bad->is_default,
                        'priority' => $bad->priority,
                        'updated_at' => now(),
                    ]);

                \Illuminate\Support\Facades\DB::table('payments')
                    ->where('payment_id', $bad->payment_id)
                    ->delete();
            } elseif ($bad && !$good) {
                \Illuminate\Support\Facades\DB::table('payments')
                    ->where('payment_id', $bad->payment_id)
                    ->update([
                        'code' => 'paypalexpress',
                        'updated_at' => now(),
                    ]);
            }

            \Illuminate\Support\Facades\DB::table('payments')
                ->whereIn('code', ['paypal', 'paypall'])
                ->delete();

            $pp = \Illuminate\Support\Facades\DB::table('payments')
                ->where('code', 'paypalexpress')
                ->orderByDesc('is_default')
                ->orderByDesc('status')
                ->orderByDesc('updated_at')
                ->orderByDesc('payment_id')
                ->get();

            if ($pp->count() > 1) {
                $keep = $pp->first();
                $deleteIds = $pp->skip(1)->pluck('payment_id')->all();
                if (!empty($deleteIds)) {
                    \Illuminate\Support\Facades\DB::table('payments')
                        ->whereIn('payment_id', $deleteIds)
                        ->delete();
                }
            }

            \Illuminate\Support\Facades\DB::commit();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            throw $e;
        }

        $rowsAfter = \Illuminate\Support\Facades\DB::table('payments')
            ->select('payment_id', 'code', 'name', 'status', 'is_default', 'priority', 'updated_at', 'data')
            ->whereIn('code', ['paypa', 'paypalexpress', 'paypal', 'paypall'])
            ->orderBy('payment_id')
            ->get();

        return response()->json([
            'host' => $request->getHost(),
            'db_name' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'before' => $rowsBefore,
            'after' => $rowsAfter,
        ], 200);
    });



    // Create PayPal order using Laravel tenant/admin config only
    Route::post('/payments/paypal/create-order', function (\Illuminate\Http\Request $request) use ($resolvePaypalRuntimeConfig) {
        \Log::info('PMD PAYPAL create-order HIT', [
            'host' => $request->getHost(),
            'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'content_type' => $request->header('Content-Type'),
            'payload_all' => $request->all(),
            'raw' => $request->getContent(),
        ]);
        try {
            $runtime = $resolvePaypalRuntimeConfig();
            if (!(bool)$runtime['provider_enabled']) {
                \Log::warning('PayPal create-order: provider disabled', [
                    'host' => $request->getHost(),
                    'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'PayPal credentials not configured',
                    'reason' => 'provider_disabled',
                ], 503);
            }

            $pmode = (string)($runtime['mode'] ?? 'test');
            $clientId = (string)($runtime['client_id'] ?? '');
            $clientSecret = (string)($runtime['client_secret'] ?? '');
            $requestedMethod = strtolower((string)$request->input('payment_method', 'paypal'));
            $methodEnabled = match ($requestedMethod) {
                'card' => (bool)$runtime['card_enabled'],
                'apple_pay' => (bool)$runtime['apple_pay_enabled'],
                'google_pay' => (bool)$runtime['google_pay_enabled'],
                default => (bool)$runtime['paypal_enabled'],
            };

            if (!$methodEnabled) {
                return response()->json([
                    'success' => false,
                    'error' => "PayPal method '{$requestedMethod}' is not enabled for this restaurant",
                    'reason' => 'method_not_enabled',
                ], 422);
            }

            if (!$clientId || !$clientSecret) {
                \Log::warning('PayPal create-order: credentials missing after decode', [
                    'host' => $request->getHost(),
                    'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                    'mode' => $pmode,
                    'has_client_id' => !empty($clientId),
                    'has_client_secret' => !empty($clientSecret),
                    'provider_enabled' => (bool)$runtime['provider_enabled'],
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'PayPal credentials not configured',
                    'reason' => 'client_id_or_secret_missing',
                    'mode' => $pmode,
                ], 503);
            }

            $paypalBase = $pmode === 'live'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            $tokenRes = \Illuminate\Support\Facades\Http::asForm()
                ->withBasicAuth($clientId, $clientSecret)
                ->post($paypalBase . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$tokenRes->successful()) {
                \Log::error('PayPal create-order: token request failed', [
                    'host' => $request->getHost(),
                    'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                    'mode' => $pmode,
                    'status' => $tokenRes->status(),
                    'body' => $tokenRes->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to create PayPal order',
                    'reason' => 'token_request_failed',
                    'paypal_status' => $tokenRes->status(),
                    'paypal_body' => $tokenRes->json(),
                ], 503);
            }

            $accessToken = (string)($tokenRes->json('access_token') ?? '');
            if (!$accessToken) {
                \Log::error('PayPal create-order: access token empty', [
                    'host' => $request->getHost(),
                    'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                    'mode' => $pmode,
                    'body' => $tokenRes->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to create PayPal order',
                    'reason' => 'empty_access_token',
                ], 503);
            }

            $amount = number_format((float)$request->input('amount', 0), 2, '.', '');
            $currency = strtoupper((string)($request->input('currency') ?: 'EUR'));

            if ((float)$amount <= 0) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid PayPal amount',
                ], 422);
            }

            $itemsSummary = '';

            \Illuminate\Support\Facades\Log::info('[Stripe create-intent] items_shape_debug', [
                'items_type' => gettype($body['items'] ?? null),
                'items_count' => is_array($body['items'] ?? null) ? count($body['items']) : null,
                'first_item' => (is_array($body['items'] ?? null) && !empty($body['items'])) ? $body['items'][0] : null,
            ]);

            \Illuminate\Support\Facades\Log::info('[Stripe create-intent] metadata_preview', [
                'restaurant_id' => (string)($body['restaurantId'] ?? ''),
                'tableNumber_raw' => $body['tableNumber'] ?? null,
                'customer_email' => (string)($body['customerInfo']['email'] ?? ''),
                'customer_name' => (string)($body['customerInfo']['name'] ?? ''),
                'items_summary' => isset($itemsSummary) ? $itemsSummary : '',
            ]);

            $payload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'amount' => [
                        'currency_code' => $currency,
                        'value' => $amount,
                    ],
                ]],
                'application_context' => [
                    'shipping_preference' => 'NO_SHIPPING',
                    'user_action' => 'PAY_NOW',
                ],
            ];

            $orderRes = \Illuminate\Support\Facades\Http::withToken($accessToken)
                ->acceptJson()
                ->post($paypalBase . '/v2/checkout/orders', $payload);

            if (!$orderRes->successful()) {
                \Log::error('PayPal create-order: order request failed', [
                    'host' => $request->getHost(),
                    'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                    'mode' => $pmode,
                    'status' => $orderRes->status(),
                    'body' => $orderRes->body(),
                    'payload' => $payload,
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to create PayPal order',
                    'reason' => 'order_request_failed',
                    'paypal_status' => $orderRes->status(),
                    'paypal_body' => $orderRes->json(),
                ], 503);
            }

            $paypalJson = $orderRes->json();
            $orderId = (string)($paypalJson['id'] ?? '');

            if (!$orderId) {
                \Log::error('PayPal create-order: missing order id in paypal response', [
                    'host' => $request->getHost(),
                    'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                    'mode' => $pmode,
                    'body' => $paypalJson,
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to create PayPal order',
                    'reason' => 'missing_order_id',
                    'paypal_body' => $paypalJson,
                ], 503);
            }

            return response()->json([
                'success' => true,
                'id' => $orderId,
                'orderID' => $orderId,
                'paypal' => $paypalJson,
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('PayPal create-order exception', [
                'host' => $request->getHost(),
                'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to create PayPal order',
                'reason' => 'exception',
                'message' => $e->getMessage(),
            ], 503);
        }
    });

    // Capture PayPal order using Laravel tenant/admin config only
    Route::post('/payments/paypal/capture-order', function (\Illuminate\Http\Request $request) use ($resolvePaypalRuntimeConfig) {
        \Log::info('PMD PAYPAL capture-order HIT', [
            'host' => $request->getHost(),
            'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'content_type' => $request->header('Content-Type'),
            'payload_all' => $request->all(),
            'raw' => $request->getContent(),
        ]);
        try {
            $runtime = $resolvePaypalRuntimeConfig();
            if (!(bool)$runtime['provider_enabled']) {
                return response()->json([
                    'success' => false,
                    'error' => 'PayPal credentials not configured',
                    'reason' => 'provider_disabled',
                ], 503);
            }
            $pmode = (string)($runtime['mode'] ?? 'test');
            $clientId = (string)($runtime['client_id'] ?? '');
            $clientSecret = (string)($runtime['client_secret'] ?? '');

            if (!$clientId || !$clientSecret) {
                return response()->json([
                    'success' => false,
                    'error' => 'PayPal credentials not configured',
                    'reason' => 'client_id_or_secret_missing',
                ], 503);
            }

            $orderId = (string)($request->input('orderID') ?: $request->input('orderId') ?: $request->input('id'));
            if (!$orderId) {
                return response()->json([
                    'success' => false,
                    'error' => 'Missing PayPal order ID',
                ], 422);
            }

            $paypalBase = $pmode === 'live'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            $tokenRes = \Illuminate\Support\Facades\Http::asForm()
                ->withBasicAuth($clientId, $clientSecret)
                ->post($paypalBase . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$tokenRes->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to capture PayPal order',
                    'reason' => 'token_request_failed',
                    'paypal_status' => $tokenRes->status(),
                    'paypal_body' => $tokenRes->json(),
                ], 503);
            }

            $accessToken = (string)($tokenRes->json('access_token') ?? '');
            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to capture PayPal order',
                    'reason' => 'empty_access_token',
                ], 503);
            }

            $captureRes = \Illuminate\Support\Facades\Http::withToken($accessToken)
                ->acceptJson()
                ->post($paypalBase . '/v2/checkout/orders/' . $orderId . '/capture');

            if (!$captureRes->successful()) {
                \Log::error('PayPal capture-order failed', [
                    'host' => $request->getHost(),
                    'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                    'order_id' => $orderId,
                    'status' => $captureRes->status(),
                    'body' => $captureRes->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to capture PayPal order',
                    'reason' => 'capture_request_failed',
                    'paypal_status' => $captureRes->status(),
                    'paypal_body' => $captureRes->json(),
                ], 503);
            }

            return response()->json([
                'success' => true,
                'orderID' => $orderId,
                'paypal' => $captureRes->json(),
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('PayPal capture-order exception', [
                'host' => $request->getHost(),
                'db' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to capture PayPal order',
                'reason' => 'exception',
                'message' => $e->getMessage(),
            ], 503);
        }
    });


    Route::post('/payments/stripe/create-intent', function (\Illuminate\Http\Request $request) use ($resolveStripeRuntimeReadiness) {
        $stripeReadiness = $resolveStripeRuntimeReadiness();
        if (!($stripeReadiness['any_ready'] ?? false)) {
            return response()->json(['success' => false, 'error' => 'Stripe is not ready for checkout'], 503);
        }

        $payment = \Admin\Models\Payments_model::isEnabled()->where('code', 'stripe')->first();
        if (!$payment) {
            return response()->json(['success' => false, 'error' => 'Stripe not configured'], 404);
        }
        $data = (array) $payment->data;
        $mode = $data['transaction_mode'] ?? 'test';
        $secretKey = $mode === 'live'
            ? ($data['live_secret_key'] ?? null)
            : ($data['test_secret_key'] ?? null);
        if (!$secretKey) {
            return response()->json(['success' => false, 'error' => 'Stripe secret key not configured'], 503);
        }
        $body = $request->validate([
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|string|size:3',
            'preferredMethod' => 'nullable|string',
            'restaurantId' => 'nullable|string',
            'items' => 'nullable|array',
            'customerInfo' => 'nullable|array',
            'tableNumber' => 'nullable',
        ]);

        \Illuminate\Support\Facades\Log::info('[Stripe create-intent] incoming', [
            'currency' => $body['currency'] ?? null,
            'amount' => $body['amount'] ?? null,
            'host' => request()->getHost(),
            'path' => request()->getPathInfo(),
        ]);

        $itemsSummary = collect(is_array($body['items'] ?? null) ? $body['items'] : [])
            ->map(function ($item) {
                if (!is_array($item)) {
                    return null;
                }
                $name = trim((string) ($item['name'] ?? ($item['item']['name'] ?? '')));
                $qty = (int) ($item['quantity'] ?? 1);
                if ($qty < 1) {
                    $qty = 1;
                }

                return $name !== '' ? ($name . ' x' . $qty) : null;
            })
            ->filter()
            ->take(8)
            ->implode(', ');

try {
            \Illuminate\Support\Facades\Log::info("[Stripe create-intent] resolved-keys", ["mode"=>$mode, "has_secret"=>(bool)$secretKey, "has_payment"=>(bool)$payment]);
            \Stripe\Stripe::setApiKey($secretKey);
            // Decide currency from tenant settings (do NOT trust client)
$settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');
$raw = $settings['default_currency_code']->value ?? ($settings['default_currency']->value ?? null);

if (!$raw) {
    $currency = strtolower((string)($body['currency'] ?? 'usd'));
} elseif (!preg_match('/^\d+$/', (string)$raw)) {
    $currency = strtolower((string)$raw);
} else {
    $code = \Illuminate\Support\Facades\DB::table('currencies')
        ->where('currency_id', (int)$raw)
        ->value('currency_code');
    $currency = strtolower((string)($code ?: ($body['currency'] ?? 'usd')));
}

\Illuminate\Support\Facades\Log::info('[Stripe create-intent] currency_source_v2', [
    'tenant_raw' => $raw,
    'client'     => $body['currency'] ?? null,
    'final'      => $currency,
    'host'       => request()->getHost(),
]);
// [Stripe create-intent] currency_source_v2

            $amountMajor = (float) $body['amount'];
            $zeroDecimalCurrencies = ['bif','clp','djf','gnf','jpy','kmf','krw','mga','pyg','rwf','ugx','vnd','vuv','xaf','xof','xpf'];
            $isZeroDecimal = in_array($currency, $zeroDecimalCurrencies);
            $amountMinor = $isZeroDecimal ? (int) round($amountMajor) : (int) round($amountMajor * 100);
            $preferred = strtolower((string)($body['preferredMethod'] ?? 'card'));
            $preferredMap = [
                'card' => (bool)($stripeReadiness['card_ready'] ?? false),
                'apple_pay' => (bool)($stripeReadiness['apple_pay_ready'] ?? false),
                'google_pay' => (bool)($stripeReadiness['google_pay_ready'] ?? false),
            ];
            if (!($preferredMap[$preferred] ?? false)) {
                return response()->json([
                    'success' => false,
                    'error' => "Stripe method '{$preferred}' is not ready for this tenant",
                ], 422);
            }

            $payload = [
                'amount' => $amountMinor,
                'currency' => $currency,
                'metadata' => [
                    'restaurant_id' => (string)($body['restaurantId'] ?? ''),
                    'table_number' => isset($body['tableNumber']) ? (string)$body['tableNumber'] : '',
                    'customer_email' => (string)($body['customerInfo']['email'] ?? ''),
                    'customer_name' => (string)($body['customerInfo']['name'] ?? ''),
                    'item_count' => isset($body['items']) && is_array($body['items']) ? (string)count($body['items']) : '0',
                    'items_summary' => $itemsSummary !== '' ? $itemsSummary : 'No items',
                ],
            ];

            // Let Stripe decide eligible methods (cards + wallets + PayPal if enabled/eligible)
            $payload['automatic_payment_methods'] = ['enabled' => true];

            // NOTE: $preferred is currently a UI hint only.
            // If later you want "PayPal-only", we can switch based on $preferred.
            $intent = \Stripe\PaymentIntent::create($payload);
return response()->json([
                'success' => true,
                'clientSecret' => $intent->client_secret,
                'paymentIntentId' => $intent->id,
            ], 200);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[Stripe create-intent] ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage() ?: 'Failed to create payment intent',
            ], 500);
        }
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
                FROM categories
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
                'favicon_logo' => $settings['favicon_logo']->value ?? '',
                'default_currency_id' => ($settings['default_currency']->value ?? $settings['default_currency_code']->value ?? null),
                'default_currency' => (function() use ($settings) {
                    $id = $settings['default_currency']->value ?? $settings['default_currency_code']->value ?? null;
                    if (!$id) return 'USD';
                    try {
                        $code = \Illuminate\Support\Facades\DB::table('currencies')->where('currency_id', $id)->value('currency_code');
                        return $code ?: 'USD';
                    } catch (\Throwable $e) {
                        return 'USD';
                    }
                })(),
                'default_language' => $settings['default_language']->value ?? 'en',
                'order_prefix' => $settings['invoice_prefix']->value ?? '#',
                'guest_order' => $settings['guest_order']->value ?? '1',
                // PMD_REVIEW_SOCIAL_SETTINGS_PUBLIC_20260605
                'pmd_review_share_prompt_enabled' => $settings['pmd_review_share_prompt_enabled']->value ?? '1',
                'pmd_homepage_social_icons_enabled' => $settings['pmd_homepage_social_icons_enabled']->value ?? '1',
                'pmd_social_trustpilot_enabled' => $settings['pmd_social_trustpilot_enabled']->value ?? '0',
                'pmd_social_trustpilot_url' => $settings['pmd_social_trustpilot_url']->value ?? '',
                'pmd_social_instagram_enabled' => $settings['pmd_social_instagram_enabled']->value ?? '0',
                'pmd_social_instagram_url' => $settings['pmd_social_instagram_url']->value ?? '',
                'pmd_social_google_enabled' => $settings['pmd_social_google_enabled']->value ?? '0',
                'pmd_social_google_url' => $settings['pmd_social_google_url']->value ?? '',
                'pmd_social_website_enabled' => $settings['pmd_social_website_enabled']->value ?? '0',
                'pmd_social_website_url' => $settings['pmd_social_website_url']->value ?? '',
                'pmd_social_reviews_enabled' => $settings['pmd_social_reviews_enabled']->value ?? '0',
                'pmd_social_reviews_url' => $settings['pmd_social_reviews_url']->value ?? '',
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
    Route::post('/orders', function (Request $request) use ($loadJsonSetting, $defaultPaymentMethods) {
        \Log::info('PMD_ACTIVE_ORDER_ROUTE_ENTER', [
            'host' => $request->getHost(),
            'path' => $request->path(),
            'method' => $request->method(),
            'content_type' => $request->header('Content-Type'),
            'payload_all' => $request->all(),
            'raw' => $request->getContent(),
        ]);

        $normalizedPaymentMethod = strtolower((string)$request->input('payment_method', ''));
        $normalizedPaymentMethodRaw = strtolower(trim((string)$request->input('payment_method_raw', $normalizedPaymentMethod)));
        if ($normalizedPaymentMethodRaw === '') {
            $normalizedPaymentMethodRaw = $normalizedPaymentMethod;
        }
        $normalizedPaymentProvider = strtolower(trim((string)$request->input('payment_provider', '')));
        $normalizedPaymentReference = trim((string)$request->input('payment_reference', ''));
        $hasStripePaymentIntentId = trim((string)$request->input('stripe_payment_intent_id', '')) !== '';

        try {
            $methodRows = \Admin\Models\Payments_model::query()
                ->whereIn('code', ['card', 'apple_pay', 'google_pay', 'wero', 'paypal', 'cod'])
                ->get()
                ->mapWithKeys(function ($row) {
                    $data = is_array($row->data ?? null) ? (array)$row->data : [];
                    return [
                        (string)$row->code => [
                            'provider_code' => strtolower((string)($row->provider_code ?? ($data['provider_code'] ?? ''))),
                            'enabled' => (bool)$row->status,
                        ],
                    ];
                });
            $methodConfigByCode = $methodRows->count() > 0
                ? $methodRows
                : collect($loadJsonSetting('payment_methods', $defaultPaymentMethods))->keyBy('code');
            if ($normalizedPaymentProvider === '') {
                $normalizedPaymentProvider = strtolower((string)($methodConfigByCode->get($normalizedPaymentMethodRaw)['provider_code']
                    ?? $methodConfigByCode->get($normalizedPaymentMethod)['provider_code']
                    ?? ''));
            }
            if ($normalizedPaymentReference === '' && $hasStripePaymentIntentId) {
                $normalizedPaymentReference = trim((string)$request->input('stripe_payment_intent_id', ''));
            }
            $request->merge([
                'payment_method_raw' => $normalizedPaymentMethodRaw !== '' ? $normalizedPaymentMethodRaw : null,
                'payment_provider' => $normalizedPaymentProvider !== '' ? $normalizedPaymentProvider : null,
                'payment_reference' => $normalizedPaymentReference !== '' ? $normalizedPaymentReference : null,
            ]);

            $isCashier = (bool)($request->get('is_cashier') ?? $request->get('is_codier') ?? false);

            $tableNameNormalized = strtolower(trim((string)($request->table_name ?? '')));
            $isDelivery = $tableNameNormalized === 'delivery';
            $isPickup = in_array($tableNameNormalized, ['pickup', 'collection'], true);

            if (!$isCashier && !$isDelivery && !$isPickup && $request->has('table_id')) {
                $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
                if ($cashierTable && (string)$request->table_id === (string)$cashierTable->table_id) {
                    $isCashier = true;
                }
            }

            \Log::info('PMD_ACTIVE_ORDER_ROUTE_MODE', [
                'table_name_raw' => $request->table_name ?? null,
                'table_name_normalized' => $tableNameNormalized,
                'table_id' => $request->table_id ?? null,
                'is_cashier' => $isCashier,
                'is_delivery' => $isDelivery,
                'is_pickup' => $isPickup,
            ]);

            if (empty($request->table_id) && in_array($tableNameNormalized, ['delivery', 'cashier'], true)) {
                $locationId = (int)($request->input('location_id') ?? 1);
                $resolvedDefaultTableId = null;
                $resolutionSource = 'none';
                try {
                    if (\Illuminate\Support\Facades\Schema::hasColumn('tables', 'location_id')) {
                        $resolvedDefaultTableId = DB::table('tables')
                            ->whereRaw('LOWER(TRIM(table_name)) = ?', [$tableNameNormalized])
                            ->where('location_id', $locationId)
                            ->orderBy('table_id')
                            ->value('table_id');
                        if ($resolvedDefaultTableId) {
                            $resolutionSource = 'direct_location';
                        }
                    }

                    if (!$resolvedDefaultTableId && \Illuminate\Support\Facades\Schema::hasTable('locationables')) {
                        $resolvedDefaultTableId = DB::table('tables')
                            ->whereRaw('LOWER(TRIM(table_name)) = ?', [$tableNameNormalized])
                            ->whereExists(function ($sub) use ($locationId) {
                                $sub->select(DB::raw(1))
                                    ->from('locationables')
                                    ->whereColumn('locationables.locationable_id', 'tables.table_id')
                                    ->whereIn('locationables.locationable_type', ['tables', 'Admin\\Models\\Tables_model'])
                                    ->where('locationables.location_id', $locationId);
                            })
                            ->orderBy('table_id')
                            ->value('table_id');
                        if ($resolvedDefaultTableId) {
                            $resolutionSource = 'pivot_locationable';
                        }
                    }

                    if (!$resolvedDefaultTableId) {
                        $resolvedDefaultTableId = DB::table('tables')
                            ->whereRaw('LOWER(TRIM(table_name)) = ?', [$tableNameNormalized])
                            ->orderBy('table_id')
                            ->value('table_id');
                        if ($resolvedDefaultTableId) {
                            $resolutionSource = 'global_name_fallback';
                        }
                    }
                } catch (\Throwable $resolverException) {
                    \Log::warning('PMD_DEFAULT_TABLE_RESOLUTION_FAILED', [
                        'requested_table_name' => $tableNameNormalized,
                        'location_id' => $locationId,
                        'error' => $resolverException->getMessage(),
                    ]);

                    return response()->json([
                        'success' => false,
                        'error' => 'Default table resolution failed',
                        'message' => 'Unable to resolve default table for this order',
                    ], 422);
                }

                \Log::info('PMD_DEFAULT_TABLE_RESOLUTION', [
                    'requested_table_name' => $tableNameNormalized,
                    'resolved_table_id' => $resolvedDefaultTableId ? (int)$resolvedDefaultTableId : null,
                    'location_id' => $locationId,
                    'source' => $resolutionSource,
                ]);

                if ($resolvedDefaultTableId) {
                    $request->merge(['table_id' => (string)$resolvedDefaultTableId]);
                }
            }

            $validationRules = [
                'customer_name' => 'required|string|max:255',
                'items' => 'required|array|min:1',
                'items.*.menu_id' => 'required|integer|exists:menus,menu_id',
                'items.*.name' => 'required|string|max:255',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.price' => 'required|numeric|min:0',
                'items.*.options' => 'nullable',
                'total_amount' => 'required|numeric|min:0',
                'tip_amount' => 'nullable|numeric|min:0',
                'coupon_discount' => 'nullable|numeric|min:0',
                'payment_method' => 'required|in:cash,cod,card,paypal,stripe,apple_pay,google_pay,wero',
                'stripe_payment_intent_id' => 'nullable|string|max:255',
            ];

            if (!$isCashier && !$isDelivery && !$isPickup) {
                $validationRules['table_id'] = 'required|string|max:50';
                $validationRules['table_name'] = 'required|string|max:100';
            } else {
                $validationRules['table_name'] = 'nullable|string|max:100';
                $validationRules['table_id'] = 'nullable|string|max:50';
            }

            $validationRules['payment_provider'] = 'nullable|string|in:stripe,paypal,worldline,sumup,square,vr_payment';
            $validationRules['payment_method_raw'] = 'nullable|string|in:card,apple_pay,google_pay,wero,paypal,cod,cash,stripe';
            $validationRules['payment_reference'] = 'nullable|string|max:255';

            $request->validate($validationRules);
            $guestSessionId = trim((string)$request->input('guest_session_id', ''));
            $existingOrderId = (int)$request->input('existing_order_id', 0);
            $appendToOrder = filter_var($request->input('append_to_order', false), FILTER_VALIDATE_BOOLEAN);

            $frontendPaymentMethod = (string)($request->payment_method ?? '');
            $frontendPaymentMethodRaw = (string)($request->payment_method_raw ?? $frontendPaymentMethod);
            $frontendPaymentProvider = strtolower((string)($request->payment_provider ?? ''));
            if ($frontendPaymentProvider === '') {
                $frontendPaymentProvider = strtolower((string)($methodConfigByCode->get($frontendPaymentMethodRaw)['provider_code'] ?? ''));
            }

            $normalizedPaymentMethod = match ($frontendPaymentMethod) {
                'stripe', 'apple_pay', 'google_pay', 'wero' => 'card',
                'paypal' => 'paypal',
                'cod' => 'cash',
                'cash' => 'cash',
                'card' => 'card',
                default => 'card',
            };

            \Log::info('PMD_ACTIVE_ORDER_ROUTE_PAYMENT_MAPPING', [
                'frontend_payment_method' => $frontendPaymentMethod,
                'frontend_payment_method_raw' => $frontendPaymentMethodRaw,
                'frontend_payment_provider' => $frontendPaymentProvider,
                'normalized_payment_method' => $normalizedPaymentMethod,
            ]);

            $isStripeWalletMethod = in_array($frontendPaymentMethodRaw, ['stripe', 'apple_pay', 'google_pay'], true);
            $isStripeWeroMethod = $frontendPaymentMethodRaw === 'wero' && $frontendPaymentProvider === 'stripe';
            $isStripeCardMethod = $frontendPaymentMethodRaw === 'card' && $frontendPaymentProvider === 'stripe';
            $mustVerifyStripe = $isStripeWalletMethod || $isStripeWeroMethod || $isStripeCardMethod;
            if (($isStripeWalletMethod || $isStripeWeroMethod) && $frontendPaymentProvider !== 'stripe') {
                return response()->json([
                    'success' => false,
                    'message' => 'Stripe payment verification failed: invalid provider for selected method',
                ], 422);
            }

            if ($mustVerifyStripe) {
                $stripePaymentIntentId = (string)($request->input('payment_reference') ?: $request->input('stripe_payment_intent_id'));
                if ($stripePaymentIntentId === '') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Stripe payment verification failed: missing payment_intent_id',
                    ], 422);
                }

                $stripePayment = \Admin\Models\Payments_model::isEnabled()->where('code', 'stripe')->first();
                if (!$stripePayment) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Stripe payment verification failed: provider not configured',
                    ], 503);
                }

                $stripeData = is_array($stripePayment->data ?? null) ? (array)$stripePayment->data : [];
                $stripeMode = (string)($stripeData['transaction_mode'] ?? 'test');
                $stripeSecretKey = (string)($stripeMode === 'live'
                    ? ($stripeData['live_secret_key'] ?? '')
                    : ($stripeData['test_secret_key'] ?? ''));

                if ($stripeSecretKey === '') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Stripe payment verification failed: secret key missing',
                    ], 503);
                }

                try {
                    \Stripe\Stripe::setApiKey($stripeSecretKey);
                    $paymentIntent = \Stripe\PaymentIntent::retrieve($stripePaymentIntentId);
                    $paymentStatus = (string)($paymentIntent->status ?? '');
                    if ($paymentStatus !== 'succeeded') {
                        return response()->json([
                            'success' => false,
                            'message' => "Stripe payment verification failed: status '{$paymentStatus}' is not final",
                        ], 422);
                    }

                    $settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');
                    $rawCurrency = $settings['default_currency_code']->value ?? ($settings['default_currency']->value ?? null);
                    if (!$rawCurrency) {
                        $expectedCurrency = strtoupper((string)($request->input('currency') ?: 'EUR'));
                    } elseif (!preg_match('/^\d+$/', (string)$rawCurrency)) {
                        $expectedCurrency = strtoupper((string)$rawCurrency);
                    } else {
                        $expectedCurrency = strtoupper((string)(
                            \Illuminate\Support\Facades\DB::table('currencies')->where('currency_id', (int)$rawCurrency)->value('currency_code') ?: 'EUR'
                        ));
                    }
                    $expectedCurrencyLower = strtolower($expectedCurrency);
                    $piCurrency = strtolower((string)($paymentIntent->currency ?? ''));
                    if ($piCurrency !== $expectedCurrencyLower) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Stripe payment verification failed: currency mismatch',
                        ], 422);
                    }

                    $expectedAmountMajor = (float)($request->input('total_amount') ?? 0);
                    $zeroDecimalCurrencies = ['bif','clp','djf','gnf','jpy','kmf','krw','mga','pyg','rwf','ugx','vnd','vuv','xaf','xof','xpf'];
                    $isZeroDecimal = in_array($expectedCurrencyLower, $zeroDecimalCurrencies, true);
                    $expectedAmountMinor = $isZeroDecimal
                        ? (int) round($expectedAmountMajor)
                        : (int) round($expectedAmountMajor * 100);
                    $piAmount = (int)($paymentIntent->amount ?? 0);
                    if ($expectedAmountMinor !== $piAmount) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Stripe payment verification failed: amount mismatch',
                        ], 422);
                    }

                    $expectedTenantContext = (string)($request->input('location_id') ?? 1);
                    $metadataRestaurantId = (string)($paymentIntent->metadata->restaurant_id ?? '');
                    if ($metadataRestaurantId !== '' && $metadataRestaurantId !== $expectedTenantContext) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Stripe payment verification failed: tenant context mismatch',
                        ], 422);
                    }
                } catch (\Throwable $e) {
                    \Log::error('PMD_STRIPE_ORDER_VERIFICATION_FAILED', [
                        'message' => $e->getMessage(),
                        'payment_intent_id' => $stripePaymentIntentId,
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Stripe payment verification failed',
                    ], 422);
                }
            }

            DB::beginTransaction();

            $orderNumber = DB::table('orders')->max('order_id') + 1;

            $comment = '';
            if ($isCashier) {
                $comment .= "Cashier Order | ";
            } elseif ($isDelivery) {
                $comment .= "Delivery Order | ";
            } elseif ($isPickup) {
                $comment .= "Pickup Order | ";
            } else {
                if ($request->filled('table_id')) {
                    $comment .= "Table ID: " . $request->table_id . " | ";
                }
                if ($request->filled('table_name')) {
                    $comment .= "Table: " . $request->table_name . " | ";
                }
            }

            if ($request->filled('special_instructions')) {
                $comment .= "Special Instructions: " . $request->special_instructions;
            }
            if ($guestSessionId !== '') {
                $comment .= ($comment !== '' ? ' | ' : '') . '[guest_session:'.$guestSessionId.']';
            }
            $comment = trim($comment, ' |');

            $orderId = null;
            $isAppendFlow = false;
            if ($appendToOrder && $existingOrderId > 0) {
                $candidateOrder = DB::table('orders')
                    ->where('order_id', $existingOrderId)
                    ->where('location_id', $request->location_id ?? 1)
                    ->lockForUpdate()
                    ->first();

                if ($candidateOrder) {
                    $isPaidOrSettled = !empty($candidateOrder->settled_at)
                        || in_array(strtolower((string)($candidateOrder->settlement_status ?? '')), ['paid', 'settled'], true)
                        || (float)($candidateOrder->settled_amount ?? 0) >= (float)($candidateOrder->order_total ?? 0);
                    $sameTableContext = (string)($candidateOrder->order_type ?? '') === (string)($isCashier ? 'cashier' : ($isDelivery ? 'delivery' : ($isPickup ? 'pickup' : $request->table_id)));

                    $storedGuestSessionId = '';
                    if (preg_match('/\[guest_session:([^\]]+)\]/', (string)($candidateOrder->comment ?? ''), $guestMatches)) {
                        $storedGuestSessionId = trim((string)($guestMatches[1] ?? ''));
                    }

                    if (
                        !$isPaidOrSettled
                        && (int)($candidateOrder->status_id ?? 0) !== 10
                        && $sameTableContext
                        && $guestSessionId !== ''
                        && $storedGuestSessionId !== ''
                        && hash_equals($storedGuestSessionId, $guestSessionId)
                    ) {
                        $orderId = (int)$candidateOrder->order_id;
                        $isAppendFlow = true;
                    }
                }
            }

            $insertData = [
                'order_id' => $orderNumber,
                'first_name' => $request->customer_name,
                'last_name' => 'Customer',
                'email' => $request->customer_email ?? '',
                'telephone' => $request->customer_phone ?? '',
                'location_id' => $request->location_id ?? 1,
                'order_type' => $isCashier ? 'cashier' : ($isDelivery ? 'delivery' : ($isPickup ? 'pickup' : $request->table_id)),
                'order_total' => (float)$request->total_amount,
                'order_date' => now()->format('Y-m-d'),
                'order_time' => now()->format('H:i:s'),
                'status_id' => 1,
                'assignee_id' => null,
                'comment' => $comment,
                'processed' => 1,
                'payment' => $normalizedPaymentMethod,
                'total_items' => count($request->items),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent() ?? 'API Client',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($request->filled('stripe_payment_intent_id')) {
                try {
                    if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'stripe_payment_intent_id')) {
                        $insertData['stripe_payment_intent_id'] = $request->stripe_payment_intent_id;
                    }
                } catch (\Throwable $e) {
                    \Log::warning('PMD_ACTIVE_ORDER_ROUTE stripe_payment_intent_id skipped', [
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            if ($request->filled('payment_provider')) {
                try {
                    if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'payment_provider')) {
                        $insertData['payment_provider'] = (string)$request->payment_provider;
                    }
                } catch (\Throwable $e) {
                    \Log::warning('PMD_ACTIVE_ORDER_ROUTE payment_provider skipped', [
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            if ($request->filled('payment_reference')) {
                try {
                    if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'payment_reference')) {
                        $insertData['payment_reference'] = (string)$request->payment_reference;
                    }
                } catch (\Throwable $e) {
                    \Log::warning('PMD_ACTIVE_ORDER_ROUTE payment_reference skipped', [
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            if (!$orderId) {
                $orderId = DB::table('orders')->insertGetId($insertData);
                $order = \Admin\Models\Orders_model::find($orderId);

                if ($order) {
                    $order->processed = 1;
                    $order->save();
                }
            }

            $baseItemsSubtotal = 0.0;
            $optionsSubtotal = 0.0;
            $itemsSubtotal = 0.0;
            $etaItems = [];


            // PMD_R2O_LIVE_NAME_PRICE_FIX_V1
            $isImportedReady2Order =
                str_contains((string)($request->special_instructions ?? ''), 'Imported from ready2order')
                || str_contains((string)($request->source_key ?? ''), 'r2o')
                || str_contains((string)($request->source_key ?? ''), 'ready2order')
                || str_contains((string)($request->external_source ?? ''), 'r2o')
                || str_contains((string)($request->external_source ?? ''), 'ready2order');

            foreach ($request->items as $item) {
                $menuItem = DB::table('menus')
                    ->where('menu_id', $item['menu_id'])
                    ->where('menu_status', 1)
                    ->first();

                if (!$menuItem) {
                    throw new \Exception("Menu item with ID {$item['menu_id']} not found");
                }

                $qty = max(1, (int)($item['quantity'] ?? 1));

                $clientUnitPrice = (float)($item['price'] ?? 0);
                $canonicalUnitPrice = (float)($menuItem->menu_price ?? 0);

                $incomingName = trim((string)($item['name'] ?? ''));
                $effectiveUnitPrice = ($isImportedReady2Order && $clientUnitPrice > 0)
                    ? $clientUnitPrice
                    : $canonicalUnitPrice;

                $effectiveName = ($isImportedReady2Order && $incomingName !== '')
                    ? $incomingName
                    : ($menuItem->menu_name ?? $item['name']);

                $prepFromItem = (int)($item['prep_time_minutes'] ?? 0);
                $prepFromMenu = (int)($menuItem->prep_time_minutes ?? 0);
                $fallbackPrep = 15;
                try {
                    $fallbackPrep = (int)(\Illuminate\Support\Facades\DB::table('settings')->where('item', 'eta_default_prep_minutes')->orderByDesc('setting_id')->value('value') ?: 15);
                } catch (\Throwable $ignored) {}
                $resolvedPrep = $prepFromItem > 0 ? $prepFromItem : ($prepFromMenu > 0 ? $prepFromMenu : max(1, $fallbackPrep));
                $etaItems[] = ['menu_id'=>(int)$item['menu_id'],'quantity'=>$qty,'prep_time_minutes'=>$resolvedPrep];

                $baseSubtotal = round($effectiveUnitPrice * $qty, 4);
                $baseItemsSubtotal += $baseSubtotal;

                $orderMenuId = DB::table('order_menus')->insertGetId([
                    'order_id' => $orderId,
                    'menu_id' => $item['menu_id'],
                    'name' => $effectiveName,
                    'quantity' => $qty,
                    'price' => $effectiveUnitPrice,
                    'subtotal' => $baseSubtotal,
                    'comment' => $item['special_instructions'] ?? '',
                    'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE) : null,
                ]);

                \Log::info('PMD_ACTIVE_ORDER_ROUTE_PRICE_CANONICALIZED', [
                    'order_id' => $orderId,
                    'menu_id' => $item['menu_id'],
                    'client_unit_price' => $clientUnitPrice,
                    'canonical_unit_price' => $canonicalUnitPrice,
                    'qty' => $qty,
                ]);

                $rawOptions = $item['options'] ?? [];
                $optionValueIds = [];

                $collectOptionIds = function ($value) use (&$collectOptionIds, &$optionValueIds) {
                    if (is_array($value)) {
                        foreach ($value as $v) {
                            $collectOptionIds($v);
                        }
                        return;
                    }

                    if (is_numeric($value)) {
                        $optionValueIds[] = (int)$value;
                    }
                };

                $collectOptionIds($rawOptions);
                $optionValueIds = array_values(array_unique(array_filter($optionValueIds)));

                // PMD_R2O_LIVE_NAME_PRICE_FIX_V1
                // Ready2Order line price already includes the side/customization price.
                // Do not re-apply local option pricing here, otherwise subtotal gets doubled.
                if ($isImportedReady2Order) {
                    $optionValueIds = [];
                }

                $itemOptionsTotal = 0.0;

                foreach ($optionValueIds as $optionValueId) {
                    $option = DB::table('menu_option_values')
                        ->where('option_value_id', $optionValueId)
                        ->first();

                    if (!$option) {
                        \Log::warning('PMD_ACTIVE_ORDER_ROUTE option value missing', [
                            'order_id' => $orderId,
                            'menu_id' => $item['menu_id'],
                            'option_value_id' => $optionValueId,
                        ]);
                        continue;
                    }

                    $menuItemOption = DB::table('menu_item_options')
                        ->where('menu_id', $item['menu_id'])
                        ->where('option_id', $option->option_id)
                        ->first();

                    $exists = DB::table('order_menu_options')
                        ->where('order_id', $orderId)
                        ->where('order_menu_id', $orderMenuId)
                        ->where('menu_option_value_id', $option->option_value_id)
                        ->exists();

                    if (!$exists) {
                        DB::table('order_menu_options')->insert([
                            'order_id' => $orderId,
                            'menu_id' => $item['menu_id'],
                            'quantity' => $qty,
                            'order_menu_id' => $orderMenuId,
                            'order_option_name' => $option->value,
                            'order_option_price' => $option->price,
                            'menu_option_value_id' => $option->option_value_id,
                            'order_menu_option_id' => $menuItemOption ? $menuItemOption->menu_option_id : $option->option_id,
                        ]);
                    }

                    $itemOptionsTotal += ((float)$option->price * $qty);
                }

                $finalLineSubtotal = round($baseSubtotal + $itemOptionsTotal, 4);

                if ($itemOptionsTotal > 0) {
                    DB::table('order_menus')
                        ->where('order_menu_id', $orderMenuId)
                        ->update([
                            'subtotal' => $finalLineSubtotal,
                        ]);
                }

                $optionsSubtotal += $itemOptionsTotal;
                $itemsSubtotal += $finalLineSubtotal;

                \Log::info('PMD_ACTIVE_ORDER_ROUTE_ITEM_DONE', [
                    'order_id' => $orderId,
                    'order_menu_id' => $orderMenuId,
                    'menu_id' => $item['menu_id'],
                    'client_unit_price' => $clientUnitPrice,
                    'canonical_unit_price' => $canonicalUnitPrice,
                    'base_subtotal' => $baseSubtotal,
                    'item_options_total' => $itemOptionsTotal,
                    'final_subtotal' => $finalLineSubtotal,
                    'option_value_ids' => $optionValueIds,
                ]);
            }

            $tipAmount = round((float)($request->tip_amount ?? 0), 4);
            $couponDiscount = round((float)($request->coupon_discount ?? 0), 4);
            $taxEnabled = (string)setting('tax_mode', '0') === '1';
            $taxPercent = max(0.0, round((float)setting('tax_percentage', 0), 4));
            $taxMenuPrice = (string)setting('tax_menu_price', '1'); // 0=included, 1=add at checkout

            $taxAmount = 0.0;
            $orderTotal = round($itemsSubtotal + $tipAmount - $couponDiscount, 4);
            if ($taxEnabled && $taxPercent > 0) {
                if ($taxMenuPrice === '1') {
                    $taxAmount = round($itemsSubtotal * ($taxPercent / 100), 4);
                    $orderTotal = round($orderTotal + $taxAmount, 4);
                } else {
                    $taxAmount = round($itemsSubtotal - ($itemsSubtotal / (1 + ($taxPercent / 100))), 4);
                }
            }

            DB::table('order_totals')->where('order_id', $orderId)->delete();

            $totalsRows = [
                [
                    'order_id' => $orderId,
                    'code' => 'subtotal',
                    'title' => 'Subtotal',
                    'value' => $itemsSubtotal,
                    'priority' => 1,
                    'is_summable' => 1,
                ],
            ];

            if ($taxAmount > 0) {
                $totalsRows[] = [
                    'order_id' => $orderId,
                    'code' => 'tax',
                    'title' => 'VAT',
                    'value' => $taxAmount,
                    'priority' => 2,
                    'is_summable' => 1,
                ];
            }

            if ($tipAmount > 0) {
                $totalsRows[] = [
                    'order_id' => $orderId,
                    'code' => 'tip',
                    'title' => 'Tip',
                    'value' => $tipAmount,
                    'priority' => 3,
                    'is_summable' => 1,
                ];
            }

            if ($couponDiscount > 0) {
                $totalsRows[] = [
                    'order_id' => $orderId,
                    'code' => 'discount',
                    'title' => 'Discount',
                    'value' => -1 * $couponDiscount,
                    'priority' => 4,
                    'is_summable' => 1,
                ];
            }

            $totalsRows[] = [
                'order_id' => $orderId,
                'code' => 'total',
                'title' => 'Total',
                'value' => $orderTotal,
                'priority' => 99,
                'is_summable' => 0,
            ];

            DB::table('order_totals')->insert($totalsRows);

            // === PMD_BILLING_SNAPSHOT_WRITE_START ===
            try {
                $billingTaxMode = $taxMenuPrice === '1' ? 'add_at_end' : 'included';

                $storeTaxPercent = (float) setting('tax_percentage', 0);

                $storedMenuRows = DB::table('order_menus')
                    ->where('order_id', $orderId)
                    ->select('name', 'quantity', 'subtotal', 'price')
                    ->get();

                $billingItems = [];

                foreach ($storedMenuRows as $menuRow) {
                    $billingItems[] = [
                        'name' => (string) ($menuRow->name ?? ''),
                        'qty' => (float) ($menuRow->quantity ?? 1),
                        'line_total' => (float) ($menuRow->subtotal ?? (((float) ($menuRow->price ?? 0)) * ((float) ($menuRow->quantity ?? 1)))),
                        'tax_rate' => $storeTaxPercent,
                    ];
                }

                $billBuilder = new \App\Support\Billing\BillSnapshotBuilder();
                $billSnapshot = $billBuilder->buildFromStoredOrder(
                    $billingItems,
                    (float) $tipAmount,
                    $billingTaxMode
                );

                DB::table('order_totals')->where('order_id', $orderId)->delete();

                $snapshotTotalsRows = [
                    [
                        'order_id' => $orderId,
                        'code' => 'subtotal',
                        'title' => 'Subtotal',
                        'value' => (float) ($billSnapshot['display']['subtotal'] ?? 0),
                        'priority' => 1,
                        'is_summable' => 1,
                    ],
                    [
                        'order_id' => $orderId,
                        'code' => 'tax',
                        'title' => (string) ($billSnapshot['display']['tax_title'] ?? 'VAT'),
                        'value' => (float) ($billSnapshot['display']['tax_value'] ?? 0),
                        'priority' => 2,
                        'is_summable' => 1,
                    ],
                ];

                if (((float) ($billSnapshot['display']['tip_value'] ?? 0)) > 0) {
                    $snapshotTotalsRows[] = [
                        'order_id' => $orderId,
                        'code' => 'tip',
                        'title' => (string) ($billSnapshot['display']['tip_title'] ?? 'Tip'),
                        'value' => (float) ($billSnapshot['display']['tip_value'] ?? 0),
                        'priority' => 3,
                        'is_summable' => 1,
                    ];
                }

                $snapshotTotalsRows[] = [
                    'order_id' => $orderId,
                    'code' => 'total',
                    'title' => 'Total',
                    'value' => (float) ($billSnapshot['display']['total'] ?? 0),
                    'priority' => 99,
                    'is_summable' => 0,
                ];

                DB::table('order_totals')->insert($snapshotTotalsRows);

                $ordersUpdate = [
                    'order_total' => (float) ($billSnapshot['display']['total'] ?? 0),
                ];

                if (\Schema::hasColumn('orders', 'bill_snapshot')) {
                    $ordersUpdate['bill_snapshot'] = json_encode($billSnapshot, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
                }

                if (\Schema::hasColumn('orders', 'fiscal_snapshot')) {
                    $ordersUpdate['fiscal_snapshot'] = json_encode($billSnapshot['fiscal'] ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
                }

                if (\Schema::hasColumn('orders', 'tax_mode')) {
                    $ordersUpdate['tax_mode'] = $billingTaxMode;
                }

                DB::table('orders')->where('order_id', $orderId)->update($ordersUpdate);

                \Log::info('PMD_BILLING_SNAPSHOT_WRITTEN', [
                    'order_id' => $orderId,
                    'tax_mode' => $billingTaxMode,
                    'store_tax_percent' => $storeTaxPercent,
                    'display_subtotal' => $billSnapshot['display']['subtotal'] ?? null,
                    'display_tax_value' => $billSnapshot['display']['tax_value'] ?? null,
                    'display_total' => $billSnapshot['display']['total'] ?? null,
                ]);
            } catch (\Throwable $e) {
                \Log::error('PMD_BILLING_SNAPSHOT_FAILED', [
                    'order_id' => $orderId ?? null,
                    'message' => $e->getMessage(),
                ]);
            }
            // === PMD_BILLING_SNAPSHOT_WRITE_END ===


            $canonicalOrderTotal = round((float) DB::table('order_totals')
                ->where('order_id', $orderId)
                ->where('code', 'total')
                ->value('value'), 4);

            $writtenTotalsCount = DB::table('order_totals')
                ->where('order_id', $orderId)
                ->count();

            \Log::info('PMD_ACTIVE_ORDER_ROUTE_TOTALS_WRITTEN', [
                'order_id' => $orderId,
                'items_subtotal' => $itemsSubtotal,
                'tax_amount' => $taxAmount,
                'tip_amount' => $tipAmount,
                'coupon_discount' => $couponDiscount,
                'order_total' => $orderTotal,
                'written_totals_count' => $writtenTotalsCount,
                'rows' => $totalsRows,
            ]);

            $clientOrderTotal = round((float)($request->total_amount ?? 0), 4);
            $serverReconstructed = round($itemsSubtotal + $taxAmount + $tipAmount - $couponDiscount, 4);

            if (abs($clientOrderTotal - $serverReconstructed) > 0.01) {
                \Log::warning('PMD_ACTIVE_ORDER_ROUTE_TOTAL_MISMATCH', [
                    'order_id' => $orderId,
                    'client_total' => $clientOrderTotal,
                    'server_reconstructed_total' => $serverReconstructed,
                    'items_subtotal' => $itemsSubtotal,
                    'tax_amount' => $taxAmount,
                    'tip_amount' => $tipAmount,
                    'coupon_discount' => $couponDiscount,
                ]);
            }

            $etaResult = ['show_customer_eta' => true, 'eta_minutes' => null, 'active_order_count' => null];
            try {
                \Log::info('PMD_ACTIVE_ORDER_ETA_INPUT', [
                    'order_id' => $orderId,
                    'location_id' => (int)($request->location_id ?? 1),
                    'menu_ids' => array_map(fn($x) => (int)($x['menu_id'] ?? 0), $etaItems),
                    'prep_times' => array_map(fn($x) => (int)($x['prep_time_minutes'] ?? 0), $etaItems),
                ]);
                $etaResult = \App\Services\OrderEtaService::calculate($etaItems, (int)($request->location_id ?? 1), ['exclude_order_id' => (int)$orderId]);
                \Log::info('PMD_ACTIVE_ORDER_ETA_COMPUTED', array_merge(['order_id' => $orderId, 'location_id' => (int)($request->location_id ?? 1)], $etaResult));
            } catch (\Throwable $e) {
                \Log::warning('PMD_ACTIVE_ORDER_ETA_FAILED', ['order_id' => $orderId, 'location_id' => (int)($request->location_id ?? 1), 'error' => $e->getMessage()]);
            }

            DB::table('orders')
                ->where('order_id', $orderId)
                ->update([
                    'order_total' => $canonicalOrderTotal > 0 ? $canonicalOrderTotal : $orderTotal,
                    'total_items' => DB::table('order_menus')->where('order_id', $orderId)->sum('quantity'),
                    'estimated_prep_minutes' => isset($etaResult['eta_minutes']) ? (int)$etaResult['eta_minutes'] : null,
                    'updated_at' => now(),
                ]);

            if ($appendToOrder && !$isAppendFlow) {
                $appendRejectReason = 'missing_existing_order';
                if (!$existingOrderId) {
                    $appendRejectReason = 'missing_existing_order';
                } elseif ($guestSessionId === '') {
                    $appendRejectReason = 'missing_guest_session_in_request';
                } else {
                    $candidateOrderForLog = DB::table('orders')
                        ->where('order_id', $existingOrderId)
                        ->where('location_id', $request->location_id ?? 1)
                        ->first();

                    if (!$candidateOrderForLog) {
                        $appendRejectReason = 'missing_existing_order';
                    } else {
                        $paidOrSettled = !empty($candidateOrderForLog->settled_at)
                            || in_array(strtolower((string)($candidateOrderForLog->settlement_status ?? '')), ['paid', 'settled'], true)
                            || (float)($candidateOrderForLog->settled_amount ?? 0) >= (float)($candidateOrderForLog->order_total ?? 0)
                            || (int)($candidateOrderForLog->status_id ?? 0) === 10;
                        if ($paidOrSettled) {
                            $appendRejectReason = 'paid_or_settled';
                        } else {
                            $expectedContext = (string)($isCashier ? 'cashier' : ($isDelivery ? 'delivery' : ($isPickup ? 'pickup' : $request->table_id)));
                            if ((string)($candidateOrderForLog->order_type ?? '') !== $expectedContext) {
                                $appendRejectReason = 'context_mismatch';
                            } else {
                                $storedGuestSessionIdForLog = '';
                                if (preg_match('/\[guest_session:([^\]]+)\]/', (string)($candidateOrderForLog->comment ?? ''), $guestMatchesForLog)) {
                                    $storedGuestSessionIdForLog = trim((string)($guestMatchesForLog[1] ?? ''));
                                }
                                if ($storedGuestSessionIdForLog === '') {
                                    $appendRejectReason = 'missing_guest_session_on_order';
                                } elseif (!hash_equals($storedGuestSessionIdForLog, $guestSessionId)) {
                                    $appendRejectReason = 'guest_session_mismatch';
                                }
                            }
                        }
                    }
                }
                \Log::warning('PMD_APPEND_REJECTED', [
                    'reason' => $appendRejectReason,
                    'existing_order_id' => $existingOrderId,
                    'new_order_id' => $orderId,
                    'location_id' => $request->location_id ?? 1,
                    'table_id' => $request->table_id ?? null,
                ]);
            }

            if ($isAppendFlow) {
                $notificationPayload = [
                    'order_id' => (int)$orderId,
                    'append_items_count' => count($request->items),
                    'guest_session_id' => $guestSessionId,
                ];
                $existingAppendNotification = DB::table('notifications')
                    ->where('type', 'order_append')
                    ->where('title', 'Customer added new items to order #'.$orderId)
                    ->where('status', 'new')
                    ->where('created_at', '>=', now()->subSeconds(10))
                    ->first();
                if (!$existingAppendNotification) {
                    DB::table('notifications')->insert([
                        'type' => 'order_append',
                        'title' => 'Customer added new items to order #'.$orderId,
                        'table_id' => (int)($request->table_id ?? 0),
                        'table_name' => (string)($request->table_name ?? ''),
                        'payload' => json_encode($notificationPayload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                        'status' => 'new',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            \Log::info('PMD_ACTIVE_ORDER_ETA_STORED', [
                'order_id' => $orderId,
                'eta_minutes' => $etaResult['eta_minutes'] ?? null,
                'show_customer_eta' => $etaResult['show_customer_eta'] ?? true,
                'active_order_count' => $etaResult['active_order_count'] ?? null,
                'location_id' => (int)($request->location_id ?? 1),
            ]);

            DB::commit();

            try {
                $order = \Admin\Models\Orders_model::find($orderId);

                if ($order && !$order->hasInvoice()) {
                    $order->generateInvoice();
                }
            } catch (\Throwable $e) {
                \Log::error('PMD_ACTIVE_ORDER_ROUTE_INVOICE_GENERATION_FAILED', [
                    'order_id' => $orderId,
                    'message' => $e->getMessage(),
                ]);
            }

            try {
                $normalizedForFiskaly = in_array($frontendPaymentMethod, ['stripe', 'apple_pay', 'google_pay', 'card'], true)
                    ? 'card'
                    : $frontendPaymentMethod;

                $paymentReference =
                    $request->stripe_payment_intent_id
                    ?? $request->paypal_order_id
                    ?? null;

                $shouldFinalizeInline = in_array($normalizedPaymentMethod, ['cash'], true);

                if ($shouldFinalizeInline) {
                    (new \Admin\Services\Fiskaly\FiskalySignDeService())->finalizeOrder(
                        (int)$orderId,
                        (int)($order->location_id ?? $request->location_id ?? 1),
                        $normalizedForFiskaly,
                        $paymentReference
                    );
                } else {
                    \Log::info('[Fiskaly] FORCED_EXECUTION / explicit payment confirmation', [
                        'order_id' => $orderId ?? null,
                        'payment_method' => $frontendPaymentMethod,
                        'normalized_payment_method' => $normalizedForFiskaly,
                    ]);
                }
            } catch (\Throwable $e) {
                \Log::error('[Fiskaly] post-commit finalize failed', [
                    'order_id' => $orderId ?? null,
                    'location_id' => $order->location_id ?? $request->location_id ?? 1,
                    'payment_method' => $request->payment_method ?? null,
                    'stripe_payment_intent_id' => $request->stripe_payment_intent_id ?? null,
                    'message' => $e->getMessage(),
                ]);
            }

            if (\App\Helpers\CashDrawerHelper::shouldOpenDrawer($normalizedPaymentMethod)) {
                try {
                    $locationId = $request->location_id ?? 1;
                    \App\Helpers\CashDrawerHelper::openDrawerForOrder($orderId, $locationId, $normalizedPaymentMethod);
                } catch (\Exception $e) {
                    \Log::error('Cash Drawer: Failed to open drawer after order creation', [
                        'order_id' => $orderId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            try {
                if (\App\Helpers\SettingsHelper::areNewOrderNotificationsEnabled()) {
                    $notificationData = [
                        'tenant_id' => $request->location_id ?? 1,
                        'order_id' => $orderId,
                        'table_id' => $request->table_id,
                        'status' => 'received',
                        'status_name' => 'Received',
                        'message' => 'New order received',
                        'priority' => 'high',
                    ];

                    if ($request->filled('table_name')) {
                        $notificationData['table_name'] = $request->table_name;
                    }

                    \App\Helpers\NotificationHelper::createOrderNotification($notificationData);
                }
            } catch (\Exception $e) {
                \Log::warning('Failed to create new order notification', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage(),
                ]);
            }

                        pmd_r2o_outbound_dryrun_after_order_create($orderId, $request->all());

            \Log::info('PMD_ACTIVE_ORDER_ROUTE_SUCCESS', [
                'order_id' => $orderId,
                'base_items_subtotal' => $baseItemsSubtotal,
                'options_subtotal' => $optionsSubtotal,
                'items_subtotal' => $itemsSubtotal,
                'tax_amount' => $taxAmount,
                'tip_amount' => $tipAmount,
                'coupon_discount' => $couponDiscount,
                'order_total' => $orderTotal,
            ]);

            $combinedItems = DB::table('order_menus')
                ->where('order_id', $orderId)
                ->select(['order_menu_id', 'menu_id', 'name', 'quantity', 'price', 'subtotal', 'comment', 'option_values'])
                ->orderBy('order_menu_id')
                ->get()
                ->map(function ($row) {
                    return [
                        'order_menu_id' => (int)($row->order_menu_id ?? 0),
                        'menu_id' => (int)($row->menu_id ?? 0),
                        'name' => (string)($row->name ?? ''),
                        'quantity' => (float)($row->quantity ?? 0),
                        'price' => (float)($row->price ?? 0),
                        'subtotal' => (float)($row->subtotal ?? 0),
                        'comment' => (string)($row->comment ?? ''),
                        'option_values' => $row->option_values,
                    ];
                })->values();

            $combinedTotalsRows = DB::table('order_totals')
                ->where('order_id', $orderId)
                ->orderBy('priority')
                ->get(['code', 'title', 'value', 'priority', 'is_summable']);

            $combinedTotals = $combinedTotalsRows->mapWithKeys(function ($row) {
                return [(string)$row->code => (float)$row->value];
            });

            $finalOrderTotal = round((float)($combinedTotals['total'] ?? $canonicalOrderTotal ?? $orderTotal), 4);
            $settledAmount = round((float)DB::table('orders')->where('order_id', $orderId)->value('settled_amount'), 4);
            $remainingAmount = round(max(0, $finalOrderTotal - $settledAmount), 4);
            $settlementStatus = $remainingAmount <= 0.0001 ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid');

            return response()->json([
                'success' => true,
                'order_id' => $orderId,
                'message' => 'Order placed successfully',
                'order_total' => $finalOrderTotal,
                'total' => $finalOrderTotal,
                'total_items' => (int)DB::table('order_menus')->where('order_id', $orderId)->sum('quantity'),
                'items' => $combinedItems,
                'order_totals' => $combinedTotalsRows,
                'settlement' => [
                    'orderTotal' => $finalOrderTotal,
                    'settledAmount' => $settledAmount,
                    'remainingAmount' => $remainingAmount,
                    'settlementStatus' => $settlementStatus,
                ],
                'eta_minutes' => $etaResult['eta_minutes'] ?? null,
                'estimated_prep_minutes' => $etaResult['eta_minutes'] ?? null,
                'show_customer_eta' => (bool)($etaResult['show_customer_eta'] ?? true),
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::warning('PMD_ORDER_VALIDATION_REJECTED', [
                'payment_method' => $normalizedPaymentMethod,
                'payment_method_raw' => $normalizedPaymentMethodRaw,
                'payment_provider' => $normalizedPaymentProvider,
                'has_stripe_payment_intent_id' => $hasStripePaymentIntentId,
                'errors' => $e->errors(),
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'message' => 'Order payload validation failed',
                'details' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            \Log::error('PMD_ACTIVE_ORDER_ROUTE_EXCEPTION', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'payload_all' => $request->all(),
                'raw' => $request->getContent(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to create order',
                'message' => $e->getMessage(),
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
        $tableId = trim((string)$request->get('table_id', ''));
        $tableNo = trim((string)$request->get('table_no', ''));
        $tableParam = trim((string)$request->get('table', ''));
        $qrCode  = trim((string)$request->get('qr', ''));

        if ($tableId === '' && $tableNo === '' && $tableParam === '' && $qrCode === '') {
            return response()->json([
                'success' => false,
                'error' => 'table_id or table_no or table or qr is required'
            ], 400);
        }

        try {
            $table = null;

            $candidates = [];
            foreach ([$tableId, $tableNo, $tableParam] as $v) {
                if ($v !== '' && !in_array($v, $candidates, true)) {
                    $candidates[] = $v;
                }
            }

            foreach ($candidates as $candidate) {
                $table = DB::table('tables')
                    ->where('table_id', $candidate)
                    ->orWhere('table_no', $candidate)
                    ->first();

                if ($table) {
                    break;
                }
            }

            if (!$table && $qrCode !== '') {
                $table = DB::table('tables')
                    ->where('qr_code', $qrCode)
                    ->first();
            }

            if (!$table) {
                return response()->json([
                    'success' => false,
                    'error' => 'Table not found'
                ], 404);
            }

            $locationId = 1;
            try {
                $locationRow = DB::table('locationables')
                    ->where('locationable_id', $table->table_id)
                    ->where('locationable_type', 'tables')
                    ->first();
                if ($locationRow && isset($locationRow->location_id)) {
                    $locationId = (int)$locationRow->location_id;
                }
            } catch (\Throwable $e) {}

            return response()->json([
                'success' => true,
                'data' => [
                    'table_id' => (string)$table->table_id,
                    'table_no' => (string)($table->table_no ?? ''),
                    'table_name' => (string)$table->table_name,
                    'location_id' => $locationId,
                    'qr_code' => (string)($table->qr_code ?? $qrCode),
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
        Route::post('general-staff-note', [\Admin\Controllers\NotificationsApi::class, 'createGeneralStaffNote']);
        Route::get('note-suggestions', [\Admin\Controllers\NotificationsApi::class, 'getNoteSuggestions']);
        Route::get('note-suggestions-debug', function() {
            $debug = [];

            // Check extension_settings
            $ext = DB::table('extension_settings')->where('item', 'core.panel')->first();
            if ($ext) {
                $parsed = is_string($ext->data) ? json_decode($ext->data, true) : $ext->data;
                $debug['extension_settings'] = [
                    'item' => $ext->item,
                    'data_type' => gettype($ext->data),
                    'data_raw' => substr($ext->data, 0, 1000),
                    'data_parsed' => $parsed,
                    'has_note_suggestions' => is_array($parsed) && isset($parsed['note_suggestion_sentences']),
                    'note_suggestions_data' => is_array($parsed) && isset($parsed['note_suggestion_sentences']) ? $parsed['note_suggestion_sentences'] : null
                ];
            } else {
                $debug['extension_settings'] = 'NOT FOUND';
            }

            // Check settings table
            $set = DB::table('settings')->where('item', 'core.panel')->first();
            if ($set) {
                $debug['settings'] = [
                    'item' => $set->item,
                    'value_type' => gettype($set->value),
                    'serialized' => $set->serialized ?? false,
                    'value_sample' => substr($set->value, 0, 500)
                ];
            } else {
                $debug['settings'] = 'NOT FOUND';
            }

            return response()->json($debug);
        });
    });

    // ========== Staff Authentication & Biometric Device Routes ==========

    // Staff authentication routes (for card/fingerprint login)
    Route::group(['prefix' => 'staff-auth'], function () {
        Route::post('/card', [StaffAuthController::class, 'authenticateByCard']);
        Route::post('/fingerprint', [StaffAuthController::class, 'authenticateByFingerprint']);
        Route::post('/register-fingerprint', [StaffAuthController::class, 'registerFingerprint']);
        Route::get('/attendance-status', [StaffAuthController::class, 'getAttendanceStatus']);
    });


}); // Close App::before function
