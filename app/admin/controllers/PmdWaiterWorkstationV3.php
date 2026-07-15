<?php

namespace Admin\Controllers;

require_once __DIR__.'/PmdWaiterPosV1.php';
require_once __DIR__.'/concerns/PmdWaiterPosOperationsV22Concern.php';

/**
 * PayMyDine Waiter Workstation V3.
 *
 * A single, direct POS workflow: live tables -> ordering -> inline payment.
 * It deliberately avoids legacy overlays, payment modals and mutation loops.
 */
class PmdWaiterWorkstationV3 extends PmdWaiterPosV1
{
    use \Admin\Controllers\Concerns\PmdWaiterPosOperationsV22Concern;

    protected $requiredPermissions = 'Admin.Orders';

    public function workstation()
    {
        return view()->file(base_path('app/admin/views/waiter_workstation_v3.blade.php'), [
            'launcherUrl' => '/admin/pmd-waiter-dashboard-v9-tenant-data',
            'notificationsUrl' => '/admin/notifications-api?limit=30',
            'reservationsUrl' => '/admin/reservations-waiter-final',
            'tableDataUrl' => '/admin/pmd-waiter-workstation-v3/data/{table}',
            'saveUrl' => '/admin/pmd-waiter-workstation-v3/save/{table}',
            'paymentSummaryUrl' => '/admin/pmd-waiter-workstation-v3/payment-summary/{order}',
            'paymentCouponUrl' => '/admin/pmd-waiter-workstation-v3/payment-coupon/{order}',
            'paymentSettleUrl' => '/admin/pmd-waiter-workstation-v3/payment-settle/{order}',
            'terminalPaymentUrl' => '/admin/pmd-waiter-workstation-v3/terminal-payment/{order}',
            'operationsUrl' => '/admin/pmd-waiter-workstation-v3/operations/{order}',
            'tableStateUrl' => '/admin/pmd-waiter-table-states-v154/{table}',
        ]);
    }
}
