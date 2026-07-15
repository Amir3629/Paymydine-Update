<?php

use Illuminate\Support\Facades\Route;

// PMD Waiter Final V1 — isolated launcher using the proven POS backend.
Route::middleware(['web'])->group(function () {
    Route::get('/admin/dashboardwaiternewfinal', [\Admin\Controllers\PmdWaiterDashboardFinalV1::class, 'index'])
        ->name('pmd.waiter-dashboard-final');

    Route::get('/admin/waiter-final', [\Admin\Controllers\PmdWaiterDashboardFinalV1::class, 'index'])
        ->name('pmd.waiter-final');
});
