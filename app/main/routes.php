<?php

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

// PMD_WAITER_MENU_BRIDGE_V105_ROUTE_START
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-data-v84', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'dashboardData']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-dashboard-data-v85', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'dashboardData']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-workspace-v92-data', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'workspaceData']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-real-v104-audit', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'audit']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-real-v104-clean-fake', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'cleanFake']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-menu-v105-audit', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'audit']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-menu-v105-source', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'source']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-menu-v105-assign', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'assign']);
\Illuminate\Support\Facades\Route::get('admin/pmd-waiter-menu-v105-clean-fake', [\Admin\Controllers\PmdWaiterMenuBridgeV105::class, 'cleanFake']);
// PMD_WAITER_MENU_BRIDGE_V105_ROUTE_END

