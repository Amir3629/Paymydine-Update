<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdKitchenOperationsSchemaService;
use App\Services\PmdKitchenWorkforceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD Team & Access V4
 *
 * Restaurant people and PMD access are intentionally separate:
 * - Restaurant person: name only is enough; role/area/login are optional.
 * - PMD staff account: explicit RBAC/login for people who need app access.
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
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Team & access', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Team & access', 'settings.'));

        $roleService = app(PmdDefaultStaffRoleService::class);
        $managedRoles = collect($roleService->ensure())->keyBy('staff_role_id');

        $staff = Staffs_model::with(['role', 'user'])
            ->whereNotSuperUser()
            ->orderBy('staff_name')
            ->get();

        $locationId = $this->currentLocationId();
        $rosterReady = app(PmdKitchenOperationsSchemaService::class)->ready();
        $roster = collect();

        if ($rosterReady) {
            $roster = DB::table('pmd_operational_people')
                ->where('location_id', max(1, $locationId))
                ->where('is_active', 1)
                ->orderByRaw("CASE department WHEN 'kitchen' THEN 0 WHEN 'floor' THEN 1 WHEN 'bar' THEN 2 WHEN 'reception' THEN 3 ELSE 4 END")
                ->orderBy('display_name')
                ->get();
        }

        $this->vars['pmdTeam'] = [
            'staff' => $staff,
            'roles' => $managedRoles->values(),
            'stats' => [
                'total' => $staff->count(),
                'active' => $staff->where('staff_status', true)->count(),
                'roles' => $managedRoles->count(),
            ],
            'roster_ready' => $rosterReady,
            'roster' => $roster,
            'roster_stats' => [
                'total' => $roster->count(),
                'kitchen' => $roster->where('department', 'kitchen')->count(),
                'with_access' => $roster->whereNotNull('staff_id')->count(),
            ],
            'departments' => [
                'kitchen' => 'Kitchen',
                'floor' => 'Floor',
                'bar' => 'Bar',
                'reception' => 'Reception',
                'other' => 'Other',
            ],
            'operational_roles' => app(PmdKitchenWorkforceService::class)->roleOptions(),
            'staff_options' => $staff->where('staff_status', true)->values(),
        ];

        return $this->makeView('pmdteam/index');
    }

    /**
     * Save a restaurant person. This never creates credentials and never
     * requires email/mobile/username/password.
     */
    public function onSaveOperationalPerson()
    {
        $this->requireRosterSchema();
        $locationId = max(1, $this->currentLocationId());
        $id = max(0, (int)post('person_id', 0));

        $input = [
            'display_name' => trim((string)post('display_name', '')),
            'department' => trim((string)post('department', '')),
            'job_role' => trim((string)post('job_role', '')),
            'station_slug' => trim((string)post('station_slug', '')),
            'staff_id' => post('staff_id', ''),
        ];

        $validator = Validator::make($input, [
            'display_name' => ['required', 'string', 'between:2,128'],
            'department' => ['nullable', 'in:kitchen,floor,bar,reception,other'],
            'job_role' => ['nullable', 'string', 'max:64'],
            'station_slug' => ['nullable', 'string', 'max:80'],
            'staff_id' => ['nullable', 'integer', 'min:1'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        $linkedStaffId = !empty($clean['staff_id']) ? (int)$clean['staff_id'] : null;
        if ($linkedStaffId) {
            $validStaff = Staffs_model::whereNotSuperUser()
                ->where('staff_status', 1)
                ->where('staff_id', $linkedStaffId)
                ->exists();
            if (!$validStaff) {
                throw ValidationException::withMessages(['staff_id' => 'Choose an active PMD access account.']);
            }

            $duplicate = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('staff_id', $linkedStaffId)
                ->where('is_active', 1);
            if ($id > 0) $duplicate->where('id', '!=', $id);
            if ($duplicate->exists()) {
                throw ValidationException::withMessages(['staff_id' => 'That PMD account is already linked to another person.']);
            }
        }

        $values = [
            'location_id' => $locationId,
            'staff_id' => $linkedStaffId,
            'display_name' => $clean['display_name'],
            'department' => $clean['department'] ?: 'other',
            'job_role' => $clean['job_role'] ?: null,
            'station_slug' => $clean['station_slug'] ?: null,
            'is_active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            DB::table('pmd_operational_people')
                ->where('id', $id)
                ->where('location_id', $locationId)
                ->update($values);
        } else {
            $values['created_at'] = now();
            DB::table('pmd_operational_people')->insert($values);
        }

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish($id ? 'Team person updated.' : 'Team person added.', 'settings.'));
        return ['ok' => true];
    }

    public function onRemoveOperationalPerson()
    {
        $this->requireRosterSchema();
        $locationId = max(1, $this->currentLocationId());
        $id = max(0, (int)post('person_id', 0));

        if ($id > 0) {
            DB::table('pmd_operational_people')
                ->where('id', $id)
                ->where('location_id', $locationId)
                ->update(['is_active' => 0, 'updated_at' => now()]);
        }

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish('Person removed from the active roster.', 'settings.'));
        return ['ok' => true];
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
                    $fail(\Admin\Classes\PmdPlatformI18n::fromEnglish('Choose one of the default staff roles.', 'settings.'));
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

            if (!$member->staff_email || !$staffId) {
                $member->staff_email = $this->technicalStaffEmail($input['username']);
            }

            $member->save();

            $user = [
                'username' => $input['username'],
                'super_user' => false,
                'send_invite' => false,
                'activate' => true,
            ];
            if ($input['password'] !== '') $user['password'] = $input['password'];
            $member->addStaffUser($user);

            if ($locationId > 0) {
                $member->addStaffLocations([$locationId]);
            }

            $member->addStaffGroups([]);
        });

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish($staffId ? 'Staff member updated.' : 'Staff member added.', 'settings.'));
        return ['ok' => true];
    }

    private function requireRosterSchema(): void
    {
        if (!app(PmdKitchenOperationsSchemaService::class)->ready()) {
            abort(503, 'Kitchen Operations tenant schema is not ready yet.');
        }
    }

    private function currentLocationId(): int
    {
        try {
            $id = (int)AdminLocation::getId();
            if ($id > 0) return $id;
        } catch (\Throwable $error) {
        }

        return 1;
    }

    private function technicalStaffEmail(string $username): string
    {
        $local = strtolower(trim(preg_replace('/[^a-z0-9._-]+/i', '-', $username), '-'));
        if ($local === '') $local = 'staff';
        return 'pmd-'.$local.'@staff.local';
    }
}
