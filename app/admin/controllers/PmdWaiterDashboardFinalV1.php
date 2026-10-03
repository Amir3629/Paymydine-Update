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
            'reservationsUrl' => '/admin/reservations-waiter-final',
            'floorOperationsUrl' => '/admin/dashboardwaiter-final-operations',
            'operationsUrl' => '/admin/pmd-waiter-pos-v22/operations/{order}',
        ]);
    }

    public function reservationsBridge()
    {
        return response($this->bridgeDocument(
            'Reservations',
            'Open the restaurant reservation workspace in the authenticated admin application.',
            '/admin/reservations',
            'OPEN RESERVATIONS'
        ), 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function operationsBridge()
    {
        return response($this->bridgeDocument(
            'Table Operations',
            'Open the existing floor operations workspace for transfers, merges and long-running table actions.',
            '/admin/dashboardwaiter',
            'OPEN TABLE OPERATIONS'
        ), 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    protected function bridgeDocument(string $title, string $message, string $target, string $button): string
    {
        $title = e($title);
        $message = e($message);
        $target = e($target);
        $button = e($button);

        return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>'.$title.' · PayMyDine</title><style>'
            .'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1720;color:#f8fafc;font:700 15px Inter,system-ui,sans-serif}'
            .'main{width:min(560px,calc(100% - 32px));padding:32px;border:1px solid #41505e;background:#19242e;border-radius:8px;box-shadow:0 18px 60px rgba(0,0,0,.35)}'
            .'h1{margin:0 0 10px;font-size:28px}p{margin:0 0 24px;color:#b8c4cf;line-height:1.55}'
            .'a{display:flex;min-height:52px;align-items:center;justify-content:center;background:#f8fafc;color:#101820;text-decoration:none;border-radius:5px;font-size:13px;letter-spacing:.04em}'
            .'</style></head><body><main><h1>'.$title.'</h1><p>'.$message.'</p><a href="'.$target.'">'.$button.'</a></main></body></html>';
    }
}
