<?php

use App\Http\Controllers\PmdOwnerStaffHourNotesR11Controller;
use Illuminate\Support\Facades\Route;

/** PMD_OWNER_STAFF_HOUR_NOTES_ROUTES_R11
 * Register BEFORE the Admin catch-all. No public, unauthenticated or
 * CSRF-exempt write endpoints. Each action checks the resolved identity.
 */
Route::group([
    'middleware' => ['web'],
    'prefix' => config('system.adminUri', 'admin').'/_pmd',
], function () {
    Route::get('owner-hour-notes-r11', [PmdOwnerStaffHourNotesR11Controller::class, 'ownerIndex'])
        ->middleware('throttle:60,1');
    Route::post('owner-hour-notes-r11', [PmdOwnerStaffHourNotesR11Controller::class, 'ownerPublish'])
        ->middleware('throttle:15,1');
    Route::post('owner-hour-notes-r11/{id}/remove', [PmdOwnerStaffHourNotesR11Controller::class, 'ownerRemove'])
        ->where('id', '[1-9][0-9]*')->middleware('throttle:30,1');
    Route::get('staff-hour-notes-r11', [PmdOwnerStaffHourNotesR11Controller::class, 'staffIndex'])
        ->middleware('throttle:60,1');
    Route::post('staff-hour-notes-r11/{id}/confirm', [PmdOwnerStaffHourNotesR11Controller::class, 'staffConfirm'])
        ->where('id', '[1-9][0-9]*')->middleware('throttle:60,1');
});
