<?php

use App\Http\Controllers\PmdDevicePlatformController;
use Illuminate\Support\Facades\Route;
use Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken;

/**
 * PMD_DEVICE_PLATFORM_V1
 *
 * Shared native control channel for trusted PayMyDine devices. The bearer
 * credential is the device identity; human passwords never enter this API.
 */
Route::group([
    'middleware' => ['web'],
    'prefix' => 'api/v1/device-platform',
], function () {
    Route::post('heartbeat', [PmdDevicePlatformController::class, 'heartbeat'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:120,1,pmd-device-platform-heartbeat');

    Route::post('ack', [PmdDevicePlatformController::class, 'acknowledge'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:120,1,pmd-device-platform-ack');
});
