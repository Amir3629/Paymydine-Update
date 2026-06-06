<?php

App::before(function () {
    /*
     * Register Main app routes
     *
     * The Main module intercepts all URLs that were not
     * handled by the admin modules.
     */

    Route::group([
        'middleware' => ['web'],
    ], function () {
        // Register Assets Combiner routes
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');


        require __DIR__.'/api-health-media.php';

        require __DIR__.'/theme-settings.php';
        require __DIR__.'/coupon.php';
        require __DIR__.'/next-proxy.php';
    });
});
