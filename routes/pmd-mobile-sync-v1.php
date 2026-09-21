<?php

use App\Http\Controllers\PmdMobileBootstrapController;
use App\Http\Controllers\PmdMobileEdgeController;
use App\Http\Controllers\PmdMobileKdsController;
use App\Http\Controllers\PmdMobilePairController;
use App\Http\Controllers\PmdMobilePosSessionController;
use App\Http\Controllers\PmdMobileSyncController;
use Illuminate\Support\Facades\Route;
use Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken;

/**
 * PMD_MOBILE_SYNC_V1_ROUTES
 *
 * PMD_MOBILE_SYNC_DIRECT_REGISTER_V8
 *
 * IMPORTANT: these routes are loaded directly from app/admin/routes.php,
 * already early in the tenant Admin route bootstrap. Do NOT defer them through
 * App::before(). On production the Admin catch-all/auth redirect is resolved
 * before that deferred callback, causing /admin/mobile/pair/start to be
 * redirected to /admin/login without ever reaching PmdMobilePairController.
 *
 * Authentication for native API calls remains bearer-device authentication,
 * not AdminAuth. Browser pairing still performs canonical Admin security in
 * PmdMobilePairController/Login.
 */
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin'),
], function () {
        Route::get('mobile/pair/start', [PmdMobilePairController::class, 'start']);
        Route::post('mobile/pair/approve', [PmdMobilePairController::class, 'approve']);
        Route::get('mobile/pair/finish', [PmdMobilePairController::class, 'finish']);
    Route::get('mobile/pos/open', PmdMobilePosSessionController::class)
        ->middleware('throttle:30,1');
});

Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin').'/api/mobile/v1',
], function () {
        Route::get('bootstrap', PmdMobileBootstrapController::class);
        Route::get('kds/snapshot', [PmdMobileKdsController::class, 'snapshot']);
        Route::post('edge/register', [PmdMobileEdgeController::class, 'register'])
            ->withoutMiddleware([VerifyCsrfToken::class]);
        Route::post('edge/heartbeat', [PmdMobileEdgeController::class, 'heartbeat'])
            ->withoutMiddleware([VerifyCsrfToken::class]);
        Route::post('edge/disable', [PmdMobileEdgeController::class, 'disable'])
            ->withoutMiddleware([VerifyCsrfToken::class]);
        Route::get('sync/events', [PmdMobileSyncController::class, 'events']);

        Route::post('pair/status', [PmdMobilePairController::class, 'status'])
            ->withoutMiddleware([VerifyCsrfToken::class])
            ->middleware('throttle:60,1');

        Route::post('pair/exchange', [PmdMobilePairController::class, 'exchange'])
            ->withoutMiddleware([VerifyCsrfToken::class])
            ->middleware('throttle:30,1');

    Route::post('sync/commands', [PmdMobileSyncController::class, 'commands'])
        ->withoutMiddleware([VerifyCsrfToken::class]);
});
