<?php

/*
|--------------------------------------------------------------------------
| PMD_MAIN_APP_BEFORE_MODULE_LOADER_FIX_20260606
|--------------------------------------------------------------------------
| Keep original main route context/order:
| 1) PMD Staff Portal routes are registered immediately while the Main route
|    table is being built
| 2) web group
| 3) assets combiner
| 4) /api and /api/v1 modules
| 5) public theme/VAT/coupon routes
| 6) Next.js proxy catch-all last
|--------------------------------------------------------------------------
*/

// PMD_STAFF_PORTAL_ROUTE_TABLE_V4
// This file is required directly by app/main/routes.php while Laravel is
// building the route collection. Register /staff here, before App::before(),
// so the public Next.js catch-all can never win because of late registration.
require_once base_path('routes/pmd-staff-portal-v1.php');

App::before(function () {
    Route::group([
        'middleware' => ['web'],
    ], function () {
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\\Classes\\Controller@combineAssets');

        require_once __DIR__.'/api-health-media.php';

        require_once __DIR__.'/theme-settings.php';
        require_once __DIR__.'/pmd-frontend-v2-theme.php';
        require_once __DIR__.'/pmd-frontend-v2-media.php';
        require_once __DIR__.'/coupon.php';

        require_once __DIR__.'/main-public-compat.php';
        require_once __DIR__.'/next-proxy.php';
    });
});
