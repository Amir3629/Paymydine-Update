<?php

use Illuminate\Support\Facades\Route;

Route::get('/admin/dashboardwaiternewfinal3', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'index'])
    ->name('pmd.waiter.workstation.v3.final3');

Route::get('/admin/dashboardwaiterworkstation', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'index'])
    ->name('pmd.waiter.workstation.v3');

Route::get('/admin/waiter-workstation', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'index'])
    ->name('pmd.waiter.workstation.v3.short');
