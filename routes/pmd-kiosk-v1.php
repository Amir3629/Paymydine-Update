<?php

use App\Http\Controllers\PmdKioskPublicController;
use Illuminate\Support\Facades\Route;
use Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken;

/**
 * Native self-service kiosk API.
 *
 * Pairing is anonymous only for the short-lived six-digit deployment code.
 * All state and Device Platform traffic uses the kiosk bearer credential.
 */
Route::group([
    'middleware' => ['web'],
    'prefix' => 'api/v1/kiosk',
], function () {
    Route::post('pair', [PmdKioskPublicController::class, 'pair'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:20,1,pmd-kiosk-pair');

    Route::get('state', [PmdKioskPublicController::class, 'state'])
        ->middleware('throttle:120,1,pmd-kiosk-state');
});
