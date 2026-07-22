<?php

use Illuminate\Support\Facades\Route;
use Admin\Controllers\PmdFloorV1;

if (!defined('PMD_FLOOR_V1_ROUTES')) {
    define('PMD_FLOOR_V1_ROUTES', true);

    Route::middleware(['web'])->group(function () {
        Route::get('/admin/floor', [PmdFloorV1::class, 'index'])->name('pmd.floor-v1');
        Route::get('/admin/pmd-floor-v1/state', [PmdFloorV1::class, 'state'])->name('pmd.floor-v1.state');
        Route::post('/admin/pmd-floor-v1/state', [PmdFloorV1::class, 'saveState'])->name('pmd.floor-v1.state.save');
    });
}
