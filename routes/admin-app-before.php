<?php

// PMD_DASHBOARD_KPI_REPAIR_ROUTE_V1
// Keep the long-lived Admin route file byte-for-byte in the base include and
// add only focused PMD runtime endpoints/guards here.
require_once __DIR__.'/admin-app-before-r1-base.php';
require_once __DIR__.'/pmd-tenant-runtime-guard-r1.php';

App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::get(
            'pmd-dashboard-kpi-repair-v1-data',
            [\Admin\Controllers\PmdDashboardKpiRepairV1::class, 'data']
        )->name('pmd.dashboard.kpi.repair.v1');
    });
});