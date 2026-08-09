<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staff_roles_model;
use Admin\Models\Staffs_model;

/**
 * PMD Team & Access
 *
 * Consolidated owner-facing team, role and authentication overview.
 * Existing Staff/Role models remain the data authority.
 */
class Pmdteam extends AdminController
{
    protected $requiredPermissions = 'Admin.Staffs';

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Team & access');
        Template::setHeading('Team & access');

        $staffQuery = Staffs_model::with(['role', 'user'])
            ->orderBy('staff_name');

        if (!AdminAuth::isSuperUser()) {
            $staffQuery->whereNotSuperUser();
        }

        $staff = $staffQuery->get();
        $roles = Staff_roles_model::with('staffs')
            ->orderBy('name')
            ->get();

        $this->vars['pmdTeam'] = [
            'staff' => $staff,
            'roles' => $roles,
            'stats' => [
                'total' => $staff->count(),
                'active' => $staff->where('staff_status', true)->count(),
                'biometric' => $staff->where('biometric_enabled', true)->count(),
                'roles' => $roles->count(),
            ],
        ];

        return $this->makeView('pmdteam/index');
    }
}
