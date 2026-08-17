<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Widgets\DashboardContainer;
use Admin\Services\PmdRoleLandingService;
use Illuminate\Support\Facades\Request;

class Dashboard extends \Admin\Classes\AdminController
{
    public $containerConfig = [];

    protected $callbacks = [];

    // PMD_NATIVE_DASHBOARD_RETIRE_V1: any authenticated role may reach this
    // redirector; destination controllers keep their own permission checks.
    protected $requiredPermissions = null;

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        // PMD_NATIVE_DASHBOARD_RETIRE_V1
        // /admin and /admin/dashboard are redirect-only entry points now.
        // The legacy native dashboard is never rendered for an authenticated user.
        $landing = app(PmdRoleLandingService::class)->routeFor(AdminAuth::getUser());

        if ($landing)
            return $this->redirect($landing);

        return \Illuminate\Support\Facades\Response::make(
            $this->makeView('access_denied'),
            403
        );
    }

    public function initDashboardContainer()
    {
        $this->containerConfig['canManage'] = array_get($this->containerConfig, 'canManage', $this->canManageWidgets());
        $this->containerConfig['canSetDefault'] = array_get($this->containerConfig, 'canSetDefault', AdminAuth::isSuperUser());
        $this->containerConfig['defaultWidgets'] = array_get($this->containerConfig, 'defaultWidgets', $this->getDefaultWidgets());

        $widget = new DashboardContainer($this, $this->containerConfig);

        foreach ($this->callbacks as $callback) {
            $callback($widget);
        }

        $widget->bindToController();
    }

    protected function getDefaultWidgets()
    {
        return [
            'onboarding' => [
                'priority' => 10,
                'width' => '6',
            ],
            'news' => [
                'priority' => 10,
                'width' => '6',
            ],
            'order_stats' => [
                'widget' => 'stats',
                'priority' => 20,
                'card' => 'sale',
                'width' => '4',
            ],
            'reservation_stats' => [
                'widget' => 'stats',
                'priority' => 20,
                'card' => 'lost_sale',
                'width' => '4',
            ],
            'customer_stats' => [
                'widget' => 'stats',
                'priority' => 20,
                'card' => 'cash_payment',
                'width' => '4',
            ],
            'reports' => [
                'widget' => 'charts',
                'priority' => 30,
                'width' => '12',
            ],
            'recent-activities' => [
                'widget' => 'recent-activities',
                'priority' => 40,
                'width' => '6',
            ],
            'cache' => [
                'priority' => 90,
                'width' => '6',
            ],
        ];
    }

    protected function canManageWidgets()
    {
        return $this->getUser()->hasPermission('Admin.Dashboard');
    }

    public function extendDashboard(callable $callback)
    {
        $this->callbacks[] = $callback;
    }
}
