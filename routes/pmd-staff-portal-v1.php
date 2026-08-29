<?php

use App\Http\Controllers\PmdStaffPortalController;
use Illuminate\Support\Facades\Route;

/**
 * PMD_STAFF_PORTAL_V3
 *
 * Register the Staff Portal as a real Laravel/TastyIgniter web surface before
 * the public Next.js menu catch-all. The constant guard lets Admin and Main
 * both require this file without ever registering the routes twice.
 */
if (!defined('PMD_STAFF_PORTAL_ROUTES_V3')) {
    define('PMD_STAFF_PORTAL_ROUTES_V3', true);

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
}
