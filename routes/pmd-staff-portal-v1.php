<?php

use App\Http\Controllers\PmdStaffPortalController;
use Illuminate\Support\Facades\Route;

/** PMD_STAFF_PORTAL_V2 */
App::before(function () {
    Route::group(['middleware' => ['web']], function () {
        Route::get('/staff/login', [PmdStaffPortalController::class, 'login'])->name('pmd.staff.login');
        Route::post('/staff/login', [PmdStaffPortalController::class, 'authenticate'])->middleware('throttle:8,15')->name('pmd.staff.authenticate');
        Route::get('/staff', [PmdStaffPortalController::class, 'index'])->name('pmd.staff.home');
        Route::post('/staff/request', [PmdStaffPortalController::class, 'saveRequest'])->middleware('throttle:30,1')->name('pmd.staff.request');
        Route::post('/staff/request/handle', [PmdStaffPortalController::class, 'handleRequest'])->middleware('throttle:60,1')->name('pmd.staff.request.handle');
        Route::post('/staff/groups', [PmdStaffPortalController::class, 'createGroup'])->middleware('throttle:20,1')->name('pmd.staff.groups.create');
        Route::post('/staff/chat/message', [PmdStaffPortalController::class, 'sendChatMessage'])->middleware('throttle:120,1')->name('pmd.staff.chat.message');
        Route::post('/staff/logout', [PmdStaffPortalController::class, 'logout'])->name('pmd.staff.logout');
    });
});
