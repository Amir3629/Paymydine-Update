<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Classes\PermissionManager;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staff_groups_model;
use Admin\Models\Staff_roles_model;
use Admin\Models\Staffs_model;
use System\Models\Languages_model;

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

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-team-settings-page');

        // Head-loaded authorities prevent warm shell/card restyling after refresh.
        $this->addCss('css/pmd-team-v1.css');
        $this->addCss('css/pmd-team-notification-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-settings-inline-detail-v1.css');
        $this->addJs('js/pmd-settings-inline-detail-v1.js');

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Team & access');
        Template::setHeading('Team & access');

        $staffQuery = Staffs_model::with(['role', 'user', 'groups', 'language'])
            ->orderBy('staff_name');

        if (!AdminAuth::isSuperUser()) {
            $staffQuery->whereNotSuperUser();
        }

        $staff = $staffQuery->get();
        $roles = Staff_roles_model::with('staffs')
            ->orderBy('name')
            ->get();
        $groups = Staff_groups_model::query()->orderBy('staff_group_name')->get();
        $languages = Languages_model::query()->where('status', 1)->orderBy('name')->get();

        $this->vars['pmdTeam'] = [
            'staff' => $staff,
            'roles' => $roles,
            'groups' => $groups,
            'languages' => $languages,
            'permissions' => PermissionManager::instance()->listGroupedPermissions(),
            'can_super_user' => AdminAuth::isSuperUser(),
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
