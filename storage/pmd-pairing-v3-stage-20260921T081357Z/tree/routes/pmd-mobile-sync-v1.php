<?php

use App\Http\Controllers\PmdMobileBootstrapController;
use App\Http\Controllers\PmdMobileEdgeController;
use App\Http\Controllers\PmdMobileKdsController;
use App\Http\Controllers\PmdMobilePairController;
use App\Http\Controllers\PmdMobileSyncController;
use Illuminate\Support\Facades\Route;
use Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken;

/**
 * PMD_MOBILE_SYNC_V1_ROUTES
 *
 * Routes intentionally keep tenant middleware via the normal Admin request
 * stack. Authentication is native bearer-device authentication, not AdminAuth.
 */
App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::get('mobile/pair/start', [PmdMobilePairController::class, 'start']);
        Route::post('mobile/pair/approve', [PmdMobilePairController::class, 'approve']);
        Route::get('mobile/pair/finish', [PmdMobilePairController::class, 'finish']);
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

        Route::post('pair/exchange', [PmdMobilePairController::class, 'exchange'])
            ->withoutMiddleware([VerifyCsrfToken::class]);

        Route::post('sync/commands', [PmdMobileSyncController::class, 'commands'])
            ->withoutMiddleware([VerifyCsrfToken::class]);
    });
});
