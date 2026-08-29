<?php

use App\Http\Controllers\PmdStaffPortalController;
use Illuminate\Support\Facades\Route;

/** PMD_STAFF_PORTAL_V1
 * Loaded from app/main/routes/main-app-before.php inside the canonical web group,
 * immediately before the Next.js catch-all route module.
 */
Route::get('/staff/login', [PmdStaffPortalController::class, 'login'])->name('pmd.staff.login');
Route::post('/staff/login', [PmdStaffPortalController::class, 'authenticate'])
    ->middleware('throttle:8,15')
    ->name('pmd.staff.authenticate');
Route::get('/staff', [PmdStaffPortalController::class, 'index'])->name('pmd.staff.home');
Route::post('/staff/request', [PmdStaffPortalController::class, 'saveRequest'])->name('pmd.staff.request');
Route::post('/staff/logout', [PmdStaffPortalController::class, 'logout'])->name('pmd.staff.logout');
