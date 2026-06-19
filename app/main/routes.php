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

