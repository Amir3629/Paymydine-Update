<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;

/**
 * PayMyDine Waiter Workstation Final V2.
 *
 * This is an isolated, POS-first presentation. It reuses the proven live table,
 * ordering, modifiers, kitchen, payment, coupon and split engines while keeping
 * the V1 and V1.2 URLs untouched.
 */
class PmdWaiterDashboardFinalV2 extends AdminController
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index()
    {
        return view()->file(base_path('app/admin/views/waiter_dashboard_final2.blade.php'), [
            'dataUrl' => '/admin/pmd-waiter-dashboard-v9-tenant-data',
            'overlayUrl' => '/admin/pmd-waiter-pos-v1/overlay/{table}',
            'standaloneUrl' => '/admin/waiter-pos/{table}',
            'notificationsUrl' => '/admin/notifications-api?limit=20',
            'reservationsUrl' => '/admin/reservations-waiter-final',
            'floorOperationsUrl' => '/admin/dashboardwaiter-final-operations',
            'operationsUrl' => '/admin/pmd-waiter-pos-v22/operations/{order}',
        ]);
    }
}
