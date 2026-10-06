<?php

use App\Http\Controllers\PmdKioskPublicController;
use Illuminate\Support\Facades\Route;
use Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken;

// PMD_KIOSK_BLADE_TERMINAL_V8
// Public kiosk page uses the same Laravel/Blade + plain asset architecture as
// other PayMyDine public/admin surfaces. A physical /kiosk directory makes
// Nginx try_files select PHP before the customer Next.js fallback.
Route::get('/kiosk', [PmdKioskPublicController::class, 'screen'])
    ->middleware('web');
Route::get('/kiosk-reset', [PmdKioskPublicController::class, 'reset'])
    ->middleware('web');

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

    // PMD_KIOSK_TERMINAL_ONLY_PAYMENT_V18
    // Payment terminals are controlled only through the paired native device.
    Route::post('terminal-payment', [PmdKioskPublicController::class, 'terminalPayment'])
        ->withoutMiddleware([VerifyCsrfToken::class])
        ->middleware('throttle:30,1,pmd-kiosk-terminal-pay');

    Route::get(
        'terminal-payment/{attemptId}',
        [PmdKioskPublicController::class, 'terminalPaymentStatus']
    )
        ->where('attemptId', '[0-9]+')
        ->middleware('throttle:120,1,pmd-kiosk-terminal-status');
});
