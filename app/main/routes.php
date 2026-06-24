<?php

// PMD_WAITER_DASHBOARD_REBUILD_20260624
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-data', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-audit', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'audit']);
// PMD_WAITER_DASHBOARD_REBUILD_20260624_END

/* PMD_WAITER_DASHBOARD_V149_ROUTES_START */
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-v149-data', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-v149-audit', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'audit']);
\Illuminate\Support\Facades\Route::match(['GET','POST'], 'admin/pmd-waiter-dashboard-v149-update-layout', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'updateLayout']);
\Illuminate\Support\Facades\Route::match(['GET','POST'], 'admin/pmd-waiter-dashboard-v149-merge', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'merge']);
\Illuminate\Support\Facades\Route::match(['GET','POST'], 'admin/pmd-waiter-dashboard-v149-add-item', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'addItem']);
/* PMD_WAITER_DASHBOARD_V149_ROUTES_END */



/* PMD FLOOR PLAN V141 ROUTES START */
\Route::get('admin/pmd-floor-plan-data', 'Admin\Controllers\PmdFloorPlanCleanV141@data');
\Route::get('admin/pmd-floor-plan-audit', 'Admin\Controllers\PmdFloorPlanCleanV141@audit');
\Route::get('admin/pmd-floor-plan-update', 'Admin\Controllers\PmdFloorPlanCleanV141@update');
\Route::post('admin/pmd-floor-plan-update', 'Admin\Controllers\PmdFloorPlanCleanV141@update');
/* PMD FLOOR PLAN V141 ROUTES END */



// PMD FLOOR PLAN v139 CLEAN STABLE ROUTES START
\Illuminate\Support\Facades\Route::get('admin/pmd-floor-plan-data', [\Admin\Controllers\PmdFloorPlanCleanV139::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-floor-plan-audit', [\Admin\Controllers\PmdFloorPlanCleanV139::class, 'audit']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v139-data', [\Admin\Controllers\PmdFloorPlanCleanV139::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v139-audit', [\Admin\Controllers\PmdFloorPlanCleanV139::class, 'audit']);
\Illuminate\Support\Facades\Route::match(['GET','POST'], 'admin/pmd-floor-plan-add-item', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'addItem']);
// PMD FLOOR PLAN v139 CLEAN STABLE ROUTES END


/*
 * Main route orchestrator. Helpers and route definitions live in focused modules under app/main/routes/.
 */
require_once __DIR__.'/routes/helpers.php';
require_once __DIR__.'/routes/sumup.php';
require_once __DIR__.'/routes/menu-helpers.php';
require_once __DIR__.'/routes/main-app-before.php';
require_once __DIR__.'/routes/worldline-public.php';



// PMD_REAL_DASHBOARD_DATA_V2_ROUTE_START
\Illuminate\Support\Facades\Route::get('admin/pmd-dashboard-data-v2', [\Admin\Controllers\PmdDashboardDataV2::class, 'index']);
// PMD_REAL_DASHBOARD_DATA_V2_ROUTE_END


// PMD_REAL_DASHBOARD_DATA_V3_ROUTE_START
\Illuminate\Support\Facades\Route::get('admin/pmd-dashboard-data-v3', [\Admin\Controllers\PmdDashboardDataV3::class, 'index']);
// PMD_REAL_DASHBOARD_DATA_V3_ROUTE_END

// PMD_WAITER_SAFE_DATA_V101_ROUTE_START
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-assignment-audit-v85', [\Admin\Controllers\PmdWaiterRepairV101::class, 'audit']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-assignment-auto-v85', [\Admin\Controllers\PmdWaiterRepairV101::class, 'auto']);
// PMD_WAITER_SAFE_DATA_V101_ROUTE_END

// PMD_WAITER_MOBILE_ACTION_V107_ROUTE_START
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-data-v84', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-data-v85', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-workspace-v92-data', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v106-data', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'data']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v106-audit', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'audit']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v107-data', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'data']);



\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v107-audit', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'audit']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v107-assign', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'assign']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v107-merge', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'merge']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v107-add-item', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'addItem']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v107-mark-served', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'markServed']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-floor-v107-reset-tables', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'resetTables']);
// PMD_WAITER_MOBILE_ACTION_V107_ROUTE_END


// PMD_FLOOR_PLAN_V136_ROUTES_START
Route::get('admin/pmd-waiter-floor-v136-data', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'data']);
Route::get('admin/pmd-waiter-floor-v136-audit', [\Admin\Controllers\PmdWaiterMobileActionV107::class, 'audit']);
// PMD_FLOOR_PLAN_V136_ROUTES_END
