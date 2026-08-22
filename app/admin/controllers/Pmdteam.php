<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD Team & Access V3
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

        // The built-in super user is an installation authority, not a Team
        // member that may be edited/demoted from this simplified surface.
        $staff = Staffs_model::with(['role', 'user'])
            ->whereNotSuperUser()
            ->orderBy('staff_name')
            ->get();

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
            ? Staffs_model::with(['role', 'user'])
                ->whereNotSuperUser()
                ->findOrFail($staffId)
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
        if ($validator->fails()) throw new ValidationException($validator);

        $locationId = $this->currentLocationId();

        DB::transaction(function () use ($member, $input, $staffId, $locationId) {
            $member->staff_name = $input['staff_name'];
            $member->staff_role_id = $input['staff_role_id'];
            $member->staff_status = 1;
            $member->sale_permission = 1;
            $member->biometric_enabled = 0;
            $member->card_id = null;
            if ($locationId > 0) $member->staff_location_id = $locationId;

            // Legacy mail/avatar helpers expect a staff_email value. Team does
            // not ask for it; this internal non-delivery address is technical.
            if (!$member->staff_email || !$staffId) {
                $member->staff_email = $this->technicalStaffEmail($input['username']);
            }

            $user = [
                'username' => $input['username'],
                'super_user' => false,
                'send_invite' => false,
                'activate' => true,
            ];
            if ($input['password'] !== '') $user['password'] = $input['password'];

            $member->user = $user;
            $member->save();

            // Location is implicit from the restaurant currently being managed,
            // not another staff-form choice. This keeps login location access valid.
            if ($locationId > 0) {
                $member->addStaffLocations([$locationId]);
            }

            // Product decision: simplified Team staff have no group assignment.
            $member->addStaffGroups([]);
        });

        flash()->success($staffId ? 'Staff member updated.' : 'Staff member added.');
        return ['ok' => true];
    }

    private function currentLocationId(): int
    {
        try {
            $id = (int)AdminLocation::getId();
            if ($id > 0) return $id;
        } catch (\Throwable $error) {
        }

        return 0;
    }

    private function technicalStaffEmail(string $username): string
    {
        $local = strtolower(trim(preg_replace('/[^a-z0-9._-]+/i', '-', $username), '-'));
        if ($local === '') $local = 'staff';
        return 'pmd-'.$local.'@staff.local';
    }
}
