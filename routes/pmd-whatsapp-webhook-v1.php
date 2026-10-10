<?php

use App\Http\Controllers\PmdWhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

// PMD_WHATSAPP_CENTRAL_WEBHOOK_R30
// Single Meta App callback, NOT attached to the Admin catch-all and NOT
// resolved by a user-controlled tenant-host header. No session/CSRF here;
// Meta GET challenge and signed POST have their own strict authentication.
Route::group(['middleware' => ['api']], function (): void {
    Route::get('api/pmd/whatsapp/webhook', [PmdWhatsAppWebhookController::class, 'verify'])
        ->middleware('throttle:30,1')
        ->name('pmd.whatsapp.meta.verify');

    Route::post('api/pmd/whatsapp/webhook', [PmdWhatsAppWebhookController::class, 'receive'])
        ->middleware('throttle:120,1')
        ->name('pmd.whatsapp.meta.receive');
});
