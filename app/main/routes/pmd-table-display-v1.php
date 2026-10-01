<?php

use App\Http\Controllers\PmdTableDisplayAdminSetupController;
use App\Http\Controllers\PmdTableDisplayPublicController;
use Illuminate\Support\Facades\Route;
use Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken;

Route::post(
    '/admin/table-display/setup-code',
    PmdTableDisplayAdminSetupController::class
)->middleware(['web']);

 /**
 * PMD_TABLE_DISPLAY_PAIRING_V1
 *
 * Public means "outside Admin session", not unauthenticated after setup.
 * Only the one-time six-digit exchange is anonymous. Every tables/bind/state
 * request uses the random bearer credential stored in Android Keystore.
 */
Route::prefix('api/v1/table-display')
    ->middleware(['web'])
    ->group(function () {
        Route::post('pair', [PmdTableDisplayPublicController::class, 'pair'])
            ->withoutMiddleware([VerifyCsrfToken::class])
            ->middleware('throttle:20,1');

        Route::get('tables', [PmdTableDisplayPublicController::class, 'tables'])
            ->middleware('throttle:60,1');

        Route::post('bind', [PmdTableDisplayPublicController::class, 'bind'])
            ->withoutMiddleware([VerifyCsrfToken::class])
            ->middleware('throttle:30,1');

        Route::get('state', [PmdTableDisplayPublicController::class, 'state'])
            ->middleware('throttle:120,1');
    });
