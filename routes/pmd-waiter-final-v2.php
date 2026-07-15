<?php

use Illuminate\Support\Facades\Route;

// PMD Waiter Final V2 — separate sharp workstation URL.
Route::middleware(['web'])->group(function () {
    Route::get('/admin/dashboardwaiternewfinal2', [\Admin\Controllers\PmdWaiterDashboardFinalV2::class, 'index'])
        ->name('pmd.waiter-dashboard-final2');

    Route::get('/admin/waiter-final2', [\Admin\Controllers\PmdWaiterDashboardFinalV2::class, 'index'])
        ->name('pmd.waiter-final2');
});
