<?php

use Illuminate\Support\Facades\Route;

Route::get('/admin/dashboardwaiternewfinal3', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'index'])
    ->name('pmd.waiter.workstation.v3.final3');

Route::get('/admin/dashboardwaiterworkstation', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'index'])
    ->name('pmd.waiter.workstation.v3');

Route::get('/admin/waiter-workstation', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'index'])
    ->name('pmd.waiter.workstation.v3.short');


/* PMD-WAITER-NEW2-ROUTE */
(function () {
    $original = null;
    foreach (\Illuminate\Support\Facades\Route::getRoutes() as $candidate) {
        if (in_array('GET', $candidate->methods(), true) && trim($candidate->uri(), '/') === 'admin/dashboardwaiternew') {
            $original = $candidate;
            break;
        }
    }
    if ($original) {
        $action = $original->getAction();
        $uses = $action['uses'] ?? $action['controller'] ?? null;
        if ($uses) {
            \Illuminate\Support\Facades\Route::get('admin/dashboardwaiternew2', $uses)
                ->middleware($original->middleware())
                ->name('admin.dashboardwaiternew2');
        }
    }
})();
