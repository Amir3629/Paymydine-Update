<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Facades\Template;

class Dashboard2 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();

        /*
         * Keep Dashboard2 highlighted under the same main dashboard icon.
         * This does not touch /admin/dashboard.
         */
        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        /*
         * Dashboard2 is its own real page.
         * It intentionally renders a dedicated clone view, not dashboard.blade.php
         * and not reservations2/index.blade.php.
         */
        Template::setTitle('Dashboard');
        Template::setHeading('Dashboard');

        return $this->makeView('dashboard2_reservations_clone');
    }
}
