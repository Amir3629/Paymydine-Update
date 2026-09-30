<?php

use App\Http\Controllers\PmdTableDisplayAdminSetupController;
use App\Http\Controllers\PmdTableDisplayPublicController;
use Illuminate\Support\Facades\Route;
use Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken;

/**
 * PMD_TABLE_DISPLAY_PAIRING_V2
 *
 * Loaded before the Admin catch-all, just like the canonical mobile sync
 * routes. Native requests use the device bearer credential; only the one-time
 * pair exchange is anonymous.
 */

Route::post(
    config('system.adminUri', 'admin').'/table-display/setup-code',
    PmdTableDisplayAdminSetupController::class
)->middleware(['web']);

$registerPmdTableDisplayApiV2 = static function (string $prefix): void {
    Route::group([
        'middleware' => ['web'],
        'prefix' => $prefix,
    ], function () {
        Route::post('pair', [PmdTableDisplayPublicController::class, 'pair'])
            ->withoutMiddleware([VerifyCsrfToken::class])
            ->middleware('throttle:20,1,pmd-table-display-pair');

        Route::get('tables', [PmdTableDisplayPublicController::class, 'tables'])
            ->middleware('throttle:60,1,pmd-table-display-tables');

        Route::post('bind', [PmdTableDisplayPublicController::class, 'bind'])
            ->withoutMiddleware([VerifyCsrfToken::class])
            ->middleware('throttle:30,1,pmd-table-display-bind');

        Route::get('state', [PmdTableDisplayPublicController::class, 'state'])
            ->middleware('throttle:120,1,pmd-table-display-state');
    });
};

// Canonical native-device path.
$registerPmdTableDisplayApiV2(
    config('system.adminUri', 'admin').'/api/table-display/v1'
);

// Compatibility for the already-built 0.1.0 preview APK.
$registerPmdTableDisplayApiV2('api/v1/table-display');

unset($registerPmdTableDisplayApiV2);
