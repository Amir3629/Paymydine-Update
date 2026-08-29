<?php

use App\Http\Controllers\PmdStaffPortalController;
use Illuminate\Support\Facades\Route;

/** PMD_STAFF_PORTAL_V1 */
App::before(function () {
    Route::group(['middleware' => ['web']], function () {
        Route::get('/staff/login', [PmdStaffPortalController::class, 'login'])->name('pmd.staff.login');
        Route::post('/staff/login', [PmdStaffPortalController::class, 'authenticate'])
            ->middleware('throttle:8,15')
            ->name('pmd.staff.authenticate');
        Route::get('/staff', [PmdStaffPortalController::class, 'index'])->name('pmd.staff.home');
        Route::post('/staff/request', [PmdStaffPortalController::class, 'saveRequest'])->name('pmd.staff.request');
        Route::post('/staff/logout', [PmdStaffPortalController::class, 'logout'])->name('pmd.staff.logout');
    });
});
