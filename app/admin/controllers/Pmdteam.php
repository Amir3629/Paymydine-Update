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
 * PMD Team & Access V5
 *
 * One Team identity owns both the operational profile and the PMD login.
 * Every active restaurant team member is expected to have one Staff account,
 * one username/password and one role. The role decides the operational
 * workspace after login; the same credentials also open the Staff Portal.
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
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Team', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Team', 'settings.'));

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

        $staffById = $staff->keyBy('staff_id');
        $linkedStaffIds = $roster->pluck('staff_id')->filter()->map('intval')->unique();
        $legacyAccessOnly = $staff->reject(fn ($member) => $linkedStaffIds->contains((int)$member->staff_id))->values();

        $this->vars['pmdTeam'] = [
            'staff' => $staff,
            'staff_by_id' => $staffById,
            'legacy_access_only' => $legacyAccessOnly,
            'roles' => $managedRoles->values(),
            'stats' => [
                'total' => $roster->count(),
                'with_login' => $roster->whereNotNull('staff_id')->count(),
                'needs_login' => $roster->whereNull('staff_id')->count(),
            ],
            'roster_ready' => $rosterReady,
            'roster' => $roster,
            'departments' => [
                'kitchen' => 'Kitchen',
                'floor' => 'Floor',
                'bar' => 'Bar',
                'reception' => 'Reception',
                'other' => 'Other',
            ],
            'operational_roles' => app(PmdKitchenWorkforceService::class)->roleOptions(),
        ];

        return $this->makeView('pmdteam/index');
    }

    /**
     * Canonical Team save: operational profile + PMD credentials in one
     * transaction. Existing linked members keep their password when blank.
     */
    public function onSaveOperationalPerson()
    {
        $this->requireRosterSchema();
        $locationId = max(1, $this->currentLocationId());
        $id = max(0, (int)post('person_id', 0));

        $existing = $id > 0
            ? DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->where('is_active', 1)->first()
            : null;
        if ($id > 0 && !$existing) abort(404);

        $existingStaff = $existing && !empty($existing->staff_id)
            ? Staffs_model::with(['role', 'user'])->whereNotSuperUser()->find((int)$existing->staff_id)
            : null;
        $userId = $existingStaff && $existingStaff->user ? (int)$existingStaff->user->user_id : 0;

        $managedRoles = collect(app(PmdDefaultStaffRoleService::class)->ensure())->keyBy('staff_role_id');
        $input = [
            'display_name' => trim((string)post('display_name', '')),
            'department' => trim((string)post('department', '')),
            'job_role' => trim((string)post('job_role', '')),
            'station_slug' => trim((string)post('station_slug', '')),
            'staff_role_id' => max(0, (int)post('staff_role_id', 0)),
            'username' => trim((string)post('username', '')),
            'password' => (string)post('password', ''),
        ];

        $rules = [
            'display_name' => [
                'required', 'string', 'between:2,128',
                'unique:staffs,staff_name'.($existingStaff ? ','.(int)$existingStaff->staff_id.',staff_id' : ''),
            ],
            'department' => ['nullable', 'in:kitchen,floor,bar,reception,other'],
            'job_role' => ['nullable', 'string', 'max:64'],
            'station_slug' => ['nullable', 'string', 'max:80'],
            'staff_role_id' => ['required', 'integer', function ($attribute, $value, $fail) use ($managedRoles) {
                if (!$managedRoles->has((int)$value)) $fail('Choose a PMD role.');
            }],
            'username' => [
                'required', 'alpha_dash', 'between:2,32',
                'unique:users,username'.($userId ? ','.$userId.',user_id' : ''),
            ],
            'password' => [$existingStaff ? 'nullable' : 'required', 'between:6,32'],
        ];

        $validator = Validator::make($input, $rules, [
            'display_name.unique' => 'That name already has a PMD account.',
            'username.unique' => 'That username is already in use.',
            'password.required' => 'Add a password for the new team member.',
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        try {
            DB::transaction(function () use ($existingStaff, $existing, $clean, $locationId, $id) {
                $member = $existingStaff ?: new Staffs_model();
                $member->staff_name = $clean['display_name'];
                $member->staff_role_id = (int)$clean['staff_role_id'];
                $member->staff_status = 1;
                $member->sale_permission = 1;
                if (!$member->staff_email || !$member->exists) {
                    $member->staff_email = $this->technicalStaffEmail($clean['username']);
                }
                $member->save();

                $user = [
                    'username' => $clean['username'],
                    'super_user' => false,
                    'send_invite' => false,
                    'activate' => true,
                ];
                if (($clean['password'] ?? '') !== '') $user['password'] = $clean['password'];
                $member->addStaffUser($user);
                if ($locationId > 0) $member->addStaffLocations([$locationId]);
                $member->addStaffGroups([]);

                $values = [
                    'location_id' => $locationId,
                    'staff_id' => (int)$member->staff_id,
                    'display_name' => $clean['display_name'],
                    'department' => $clean['department'] ?: 'other',
                    'job_role' => $clean['job_role'] ?: null,
                    'station_slug' => $clean['station_slug'] ?: ($existing->station_slug ?? null),
                    'is_active' => 1,
                    'updated_at' => now(),
                ];

                if ($id > 0) {
                    DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($values);
                } else {
                    $values['created_at'] = now();
                    DB::table('pmd_operational_people')->insert($values);
                }
            });
        } catch (\Throwable $error) {
            report($error);
            throw ValidationException::withMessages(['username' => 'Could not save this team member. Check the name, username and password and try again.']);
        }

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish($id ? 'Team member updated.' : 'Team member added.', 'settings.'));
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

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish('Team member removed from the active roster.', 'settings.'));
        return ['ok' => true];
    }

    /**
     * Backwards-compatible account handler. New UI no longer exposes an
     * access-only account flow; this endpoint remains for old AJAX clients.
     */
    public function onSaveSimpleStaff()
    {
        $roleService = app(PmdDefaultStaffRoleService::class);
        $managedRoles = collect($roleService->ensure())->keyBy('staff_role_id');

        $staffId = max(0, (int)post('staff_id', 0));
        $member = $staffId > 0
            ? Staffs_model::with(['role', 'user'])->whereNotSuperUser()->findOrFail($staffId)
            : new Staffs_model();

        $userId = $member->exists && $member->user ? (int)$member->user->user_id : 0;
        $input = [
            'staff_role_id' => (int)post('staff_role_id', 0),
            'staff_name' => trim((string)post('staff_name', '')),
            'username' => trim((string)post('username', '')),
            'password' => (string)post('password', ''),
        ];

        $rules = [
            'staff_role_id' => ['required', 'integer', function ($attribute, $value, $fail) use ($managedRoles) {
                if (!$managedRoles->has((int)$value)) $fail('Choose one of the PMD roles.');
            }],
            'staff_name' => ['required', 'between:2,128', 'unique:staffs,staff_name'.($staffId ? ','.$staffId.',staff_id' : '')],
            'username' => ['required', 'alpha_dash', 'between:2,32', 'unique:users,username'.($userId ? ','.$userId.',user_id' : '')],
            'password' => [$staffId ? 'nullable' : 'required', 'between:6,32'],
        ];
        $validator = Validator::make($input, $rules);
        if ($validator->fails()) throw new ValidationException($validator);

        $locationId = max(1, $this->currentLocationId());
        DB::transaction(function () use ($member, $input, $staffId, $locationId) {
            $member->staff_name = $input['staff_name'];
            $member->staff_role_id = $input['staff_role_id'];
            $member->staff_status = 1;
            $member->sale_permission = 1;
            if (!$member->staff_email || !$staffId) $member->staff_email = $this->technicalStaffEmail($input['username']);
            $member->save();

            $user = ['username' => $input['username'], 'super_user' => false, 'send_invite' => false, 'activate' => true];
            if ($input['password'] !== '') $user['password'] = $input['password'];
            $member->addStaffUser($user);
            $member->addStaffLocations([$locationId]);
            $member->addStaffGroups([]);

            $person = DB::table('pmd_operational_people')->where('location_id', $locationId)->where('staff_id', (int)$member->staff_id)->first();
            if (!$person) {
                DB::table('pmd_operational_people')->insert([
                    'location_id' => $locationId,
                    'staff_id' => (int)$member->staff_id,
                    'display_name' => $input['staff_name'],
                    'department' => 'other',
                    'job_role' => null,
                    'station_slug' => null,
                    'is_active' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish($staffId ? 'Team member updated.' : 'Team member added.', 'settings.'));
        return ['ok' => true];
    }

    private function requireRosterSchema(): void
    {
        if (!app(PmdKitchenOperationsSchemaService::class)->ready()) abort(503, 'Kitchen Operations tenant schema is not ready yet.');
    }

    private function currentLocationId(): int
    {
        try {
            $id = (int)AdminLocation::getId();
            if ($id > 0) return $id;
        } catch (\Throwable $error) {}
        return 1;
    }

    private function technicalStaffEmail(string $username): string
    {
        $local = strtolower(trim(preg_replace('/[^a-z0-9._-]+/i', '-', $username), '-'));
        if ($local === '') $local = 'staff';
        return 'pmd-'.$local.'@staff.local';
    }
}
