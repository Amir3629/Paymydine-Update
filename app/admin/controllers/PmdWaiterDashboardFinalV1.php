<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;

/**
 * Final isolated waiter workstation.
 *
 * The page owns its launcher, responsive shell and theme. It intentionally
 * reuses the proven order/payment engines and does not load the experimental
 * V2.2.1 theme/payment decorator that caused rendering and modal freezes.
 */
class PmdWaiterDashboardFinalV1 extends AdminController
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index()
    {
        return view()->file(base_path('app/admin/views/waiter_dashboard_final.blade.php'), [
            'dataUrl' => '/admin/pmd-waiter-dashboard-v9-tenant-data',
            'overlayUrl' => '/admin/pmd-waiter-pos-v1/overlay/{table}',
            'standaloneUrl' => '/admin/waiter-pos/{table}',
            'notificationsUrl' => '/admin/notifications-api?limit=20',
            'reservationsUrl' => '/admin/reservations',
            'floorOperationsUrl' => '/admin/dashboardwaiter',
            'operationsUrl' => '/admin/pmd-waiter-pos-v22/operations/{order}',
        ]);
    }
}
