<?php

/*
|--------------------------------------------------------------------------
| PMD_MAIN_APP_BEFORE_MODULE_LOADER_FIX_20260606
|--------------------------------------------------------------------------
| Keep original main route context/order:
| 1) PMD Staff Portal routes
| 2) web group
| 3) assets combiner
| 4) /api and /api/v1 modules
| 5) public theme/VAT/coupon routes
| 6) Next.js proxy catch-all last
|--------------------------------------------------------------------------
*/

App::before(function () {
    // PMD_STAFF_PORTAL_BEFORE_NEXT_PROXY_V3
    // /staff is an application surface, never a guest menu route. Register it
    // before the Main web catch-all. The route file owns its web middleware.
    require_once base_path('routes/pmd-staff-portal-v1.php');

    Route::group([
        'middleware' => ['web'],
    ], function () {
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

        require_once __DIR__.'/api-health-media.php';

        require_once __DIR__.'/theme-settings.php';
        require_once __DIR__.'/pmd-frontend-v2-theme.php';
        require_once __DIR__.'/pmd-frontend-v2-media.php';
        require_once __DIR__.'/coupon.php';

        require_once __DIR__.'/main-public-compat.php';
        require_once __DIR__.'/next-proxy.php';
    });
});
