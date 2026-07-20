<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;

/**
 * Standalone waiter launcher for fast table selection and embedded ordering.
 *
 * This page intentionally does not reuse the legacy waiter dashboard layout.
 * The existing floor-operations page remains untouched at /admin/dashboardwaiter.
 */
class PmdWaiterDashboardNewV1 extends AdminController
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index()
    {
        return view()->file(base_path('app/admin/views/waiter_dashboard_new.blade.php'), [
            'dataUrl' => '/admin/pmd-waiter-dashboard-v9-tenant-data',
            'overlayUrl' => '/admin/pmd-waiter-pos-v1/overlay/{table}',
            'standaloneUrl' => '/admin/waiter-pos/{table}',
            'floorOperationsUrl' => '/admin/dashboardwaiter',
        ]);
    }
}
