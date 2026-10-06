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

    Route::post('hardware', [PmdDevicePlatformController::class, 'hardware'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:60,1,pmd-device-platform-hardware');

    Route::post('hardware/configure', [PmdDevicePlatformController::class, 'configureHardware'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:30,1,pmd-device-platform-hardware-config');

    Route::post('kiosk/terminal-payment', [PmdDevicePlatformController::class, 'kioskTerminalPayment'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:30,1,pmd-kiosk-terminal-payment');

    Route::post('kiosk/terminal-payment/refresh', [PmdDevicePlatformController::class, 'kioskTerminalPaymentRefresh'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:120,1,pmd-kiosk-terminal-payment-refresh');

    Route::post('logs', [PmdDevicePlatformController::class, 'log'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:60,1,pmd-device-platform-logs');

    Route::post('ack', [PmdDevicePlatformController::class, 'acknowledge'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:120,1,pmd-device-platform-ack');
});
