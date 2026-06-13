<?php

/*
|--------------------------------------------------------------------------
| PMD_MAIN_APP_BEFORE_MODULE_LOADER_FIX_20260606
|--------------------------------------------------------------------------
| Keep original main route context/order:
| 1) web group
| 2) assets combiner
| 3) /api and /api/v1 modules
| 4) public theme/VAT/coupon routes
| 5) Next.js proxy catch-all last
|--------------------------------------------------------------------------
*/

App::before(function () {
    Route::group([
        'middleware' => ['web'],
    ], function () {
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

        require_once __DIR__.'/api-health-media.php';

        require_once __DIR__.'/theme-settings.php';
        require_once __DIR__.'/coupon.php';

        require_once __DIR__.'/main-public-compat.php';
        require_once __DIR__.'/next-proxy.php';
    });
});
