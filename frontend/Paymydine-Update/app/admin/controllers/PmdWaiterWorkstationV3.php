<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;

/**
 * PayMyDine Waiter Workstation V3.
 *
 * An isolated POS-first waiter surface. It intentionally reuses the proven
 * tenant table feed and waiter order/payment engines without changing them.
 */
class PmdWaiterWorkstationV3 extends AdminController
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index()
    {
        return view()->file(base_path('app/admin/views/waiter_workstation_v3.blade.php'), [
            'dataUrl' => '/admin/pmd-waiter-dashboard-v9-tenant-data',
            'overlayUrl' => '/admin/pmd-waiter-pos-v1/overlay/{table}',
            'notificationsUrl' => '/admin/notifications-api?limit=30',
            'reservationsUrl' => '/admin/reservations-waiter-final',
            'floorOperationsUrl' => '/admin/dashboardwaiter-final-operations',
        ]);
    }
}
