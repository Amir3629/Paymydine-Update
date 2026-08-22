<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD Team & Access V2
 *
 * Product roles are managed/locked by PmdDefaultStaffRoleService. The Team
 * page intentionally exposes only Role, Name, Username and Password for staff.
 * Existing Staff/User models remain the persistence authority.
 */
class Pmdteam extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-team-settings-page');
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

        $roleService = app(PmdDefaultStaffRoleService::class);
        $managedRoles = collect($roleService->ensure())->keyBy('staff_role_id');

        $staffQuery = Staffs_model::with(['role', 'user'])
            ->orderBy('staff_name');

        if (!AdminAuth::isSuperUser()) {
            $staffQuery->whereNotSuperUser();
        }

        $staff = $staffQuery->get();

        $this->vars['pmdTeam'] = [
            'staff' => $staff,
            'roles' => $managedRoles->values(),
            'stats' => [
                'total' => $staff->count(),
                'active' => $staff->where('staff_status', true)->count(),
                'roles' => $managedRoles->count(),
            ],
        ];

        return $this->makeView('pmdteam/index');
    }

    public function onSaveSimpleStaff()
    {
        $roleService = app(PmdDefaultStaffRoleService::class);
        $managedRoles = collect($roleService->ensure())->keyBy('staff_role_id');

        $staffId = max(0, (int)post('staff_id', 0));
        $member = $staffId > 0
            ? Staffs_model::with(['role', 'user'])->findOrFail($staffId)
            : new Staffs_model();

        $userId = $member->exists && $member->user
            ? (int)$member->user->user_id
            : 0;

        $input = [
            'staff_role_id' => (int)post('staff_role_id', 0),
            'staff_name' => trim((string)post('staff_name', '')),
            'username' => trim((string)post('username', '')),
            'password' => (string)post('password', ''),
        ];

        $rules = [
            'staff_role_id' => ['required', 'integer', function ($attribute, $value, $fail) use ($managedRoles) {
                if (!$managedRoles->has((int)$value)) {
                    $fail('Choose one of the default staff roles.');
                }
            }],
            'staff_name' => [
                'required', 'between:2,128',
                'unique:staffs,staff_name'.($staffId ? ','.$staffId.',staff_id' : ''),
            ],
            'username' => [
                'required', 'alpha_dash', 'between:2,32',
                'unique:users,username'.($userId ? ','.$userId.',user_id' : ''),
            ],
            'password' => [$staffId ? 'nullable' : 'required', 'between:6,32'],
        ];

        $validator = Validator::make($input, $rules);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        DB::transaction(function () use ($member, $input, $staffId) {
            $member->staff_name = $input['staff_name'];
            $member->staff_role_id = $input['staff_role_id'];
            $member->staff_status = 1;
            $member->sale_permission = 1;
            $member->biometric_enabled = 0;
            $member->card_id = null;

            // The legacy schema requires a staff_email value for several mail/avatar
            // helpers. It is generated internally and is never requested in Team UI.
            if (!$member->staff_email || !$staffId) {
                $member->staff_email = $this->technicalStaffEmail($input['username']);
            }

            $user = [
                'username' => $input['username'],
                'super_user' => false,
                'send_invite' => false,
                'activate' => true,
            ];
            if ($input['password'] !== '') {
                $user['password'] = $input['password'];
            }

            $member->user = $user;
            $member->save();

            // Product decision: simple Team staff do not require group assignment.
            // Existing legacy/custom staff groups are not deleted globally.
            if ($member->relationLoaded('groups') || method_exists($member, 'groups')) {
                try {
                    $member->groups()->sync([]);
                } catch (\Throwable $error) {
                }
            }
        });

        flash()->success($staffId ? 'Staff member updated.' : 'Staff member added.');

        return ['ok' => true];
    }

    private function technicalStaffEmail(string $username): string
    {
        $local = strtolower(trim(preg_replace('/[^a-z0-9._-]+/i', '-', $username), '-'));
        if ($local === '') $local = 'staff';
        return 'pmd-'.$local.'@staff.local';
    }
}
