<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdKitchenOperationsSchemaService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/** PMD_PEOPLE_WORKSPACE_V1 */
class People extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-people-page');
        $this->addCss('css/pmd-people-v1.css');
        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        Template::setTitle('People');
        Template::setHeading('People');

        $locationId = $this->locationId();
        $people = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->orderByRaw("CASE department WHEN 'kitchen' THEN 0 WHEN 'floor' THEN 1 WHEN 'bar' THEN 2 WHEN 'reception' THEN 3 ELSE 4 END")
            ->orderBy('display_name')
            ->get();

        $accessStaff = Staffs_model::with(['role', 'user'])
            ->whereNotSuperUser()
            ->orderBy('staff_name')
            ->get()
            ->keyBy('staff_id');

        $linkedStaffIds = $people->pluck('staff_id')->filter()->map('intval')->unique();
        $unlinkedStaff = $accessStaff->reject(fn ($staff) => $linkedStaffIds->contains((int)$staff->staff_id))->values();

        $selectedId = max(0, (int)request()->input('person', 0));
        $selected = $selectedId > 0 ? $people->firstWhere('id', $selectedId) : $people->first();
        $selectedAccess = $selected && !empty($selected->staff_id)
            ? $accessStaff->get((int)$selected->staff_id)
            : null;

        $shifts = collect();
        $requests = collect();
        if ($selected) {
            $from = now()->subMonths(3)->startOfMonth()->toDateString();
            $to = now()->addMonths(6)->endOfMonth()->toDateString();
            $shifts = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('shift.location_id', $locationId)
                ->where('assignment.person_id', (int)$selected->id)
                ->whereBetween('shift.shift_date', [$from, $to])
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->select([
                    'shift.id', 'shift.shift_date', 'shift.label', 'shift.starts_at',
                    'shift.ends_at', 'shift.status', 'assignment.attendance_status',
                ])
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->get();

            if (Schema::hasTable('pmd_staff_requests')) {
                $requests = DB::table('pmd_staff_requests')
                    ->where('location_id', $locationId)
                    ->where(function ($query) use ($selected) {
                        $query->where('person_id', (int)$selected->id);
                        if (!empty($selected->staff_id)) $query->orWhere('staff_id', (int)$selected->staff_id);
                    })
                    ->orderByDesc('created_at')
                    ->limit(40)
                    ->get();
            }
        }

        $roles = collect(app(PmdDefaultStaffRoleService::class)->ensure())
            ->reject(fn ($role) => strtolower((string)$role->code) === PmdDefaultStaffRoleService::OWNER)
            ->values();

        $this->vars['pmdPeople'] = [
            'people' => $people,
            'unlinked_staff' => $unlinkedStaff,
            'selected' => $selected,
            'selected_access' => $selectedAccess,
            'shifts' => $shifts,
            'requests' => $requests,
            'requests_ready' => Schema::hasTable('pmd_staff_requests'),
            'roles' => $roles,
            'departments' => [
                'kitchen' => 'Kitchen',
                'floor' => 'Floor',
                'bar' => 'Bar',
                'reception' => 'Reception',
                'other' => 'Other',
            ],
        ];

        return $this->makeView('pmdpeople/index');
    }

    /** Roster-first save. Login is intentionally not part of this form. */
    public function saveperson()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $locationId = $this->locationId();
        $id = max(0, (int)request()->input('id', 0));

        $validator = Validator::make(request()->all(), [
            'display_name' => ['required', 'string', 'min:2', 'max:128'],
            'job_role' => ['nullable', 'string', 'max:64'],
            'department' => ['nullable', 'in:kitchen,floor,bar,reception,other'],
        ]);
        if ($validator->fails()) return $this->error($validator->errors()->first(), $id);
        $clean = $validator->validated();

        $values = [
            'display_name' => trim((string)$clean['display_name']),
            'job_role' => trim((string)($clean['job_role'] ?? '')) ?: null,
            'department' => trim((string)($clean['department'] ?? '')) ?: 'other',
            'is_active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            $exists = DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->exists();
            if (!$exists) abort(404);
            DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($values);
        } else {
            $values['location_id'] = $locationId;
            $values['staff_id'] = null;
            $values['station_slug'] = null;
            $values['created_at'] = now();
            $id = (int)DB::table('pmd_operational_people')->insertGetId($values);
        }

        return redirect(admin_url('people').'?person='.$id)->with('success', 'Person saved.');
    }

    /** Bring an existing PMD access-only account into the restaurant roster. */
    public function linkstaff()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $locationId = $this->locationId();
        $staffId = max(0, (int)request()->input('staff_id', 0));
        $staff = Staffs_model::with(['role', 'user'])->whereNotSuperUser()->find($staffId);
        if (!$staff) return redirect(admin_url('people'))->with('error', 'PMD account not found.');

        $existing = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('staff_id', $staffId)
            ->where('is_active', 1)
            ->first();
        if ($existing) return redirect(admin_url('people').'?person='.(int)$existing->id);

        $id = (int)DB::table('pmd_operational_people')->insertGetId([
            'location_id' => $locationId,
            'staff_id' => $staffId,
            'display_name' => trim((string)$staff->staff_name) ?: 'Team member',
            'department' => 'other',
            'job_role' => null,
            'station_slug' => null,
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($locationId > 0) $staff->addStaffLocations([$locationId]);
        return redirect(admin_url('people').'?person='.$id.'#access')->with('success', 'Existing PMD account added to the Team.');
    }

    /** Create/update PMD login only after the restaurant person already exists. */
    public function saveaccess()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $locationId = $this->locationId();
        $personId = max(0, (int)request()->input('person_id', 0));
        $person = DB::table('pmd_operational_people')
            ->where('id', $personId)->where('location_id', $locationId)->where('is_active', 1)->first();
        if (!$person) abort(404);

        $existingStaff = !empty($person->staff_id)
            ? Staffs_model::with(['role', 'user'])->whereNotSuperUser()->find((int)$person->staff_id)
            : null;
        $userId = $existingStaff && $existingStaff->user ? (int)$existingStaff->user->user_id : 0;
        $managedRoles = collect(app(PmdDefaultStaffRoleService::class)->ensure())
            ->reject(fn ($role) => strtolower((string)$role->code) === PmdDefaultStaffRoleService::OWNER)
            ->keyBy('staff_role_id');

        $input = [
            'staff_role_id' => max(0, (int)request()->input('staff_role_id', 0)),
            'username' => trim((string)request()->input('username', '')),
            'password' => (string)request()->input('password', ''),
        ];
        $rules = [
            'staff_role_id' => ['required', 'integer', function ($attribute, $value, $fail) use ($managedRoles) {
                if (!$managedRoles->has((int)$value)) $fail('Choose an access role.');
            }],
            'username' => ['required', 'alpha_dash', 'between:2,32', 'unique:users,username'.($userId ? ','.$userId.',user_id' : '')],
            'password' => [$existingStaff ? 'nullable' : 'required', 'between:6,32'],
        ];
        if (!$existingStaff) $rules['username'][] = function ($attribute, $value, $fail) use ($person) {
            $sameName = Staffs_model::where('staff_name', (string)$person->display_name)->exists();
            if ($sameName) $fail('An access account with this person name already exists. Use “Access only” to connect it instead.');
        };

        $validator = Validator::make($input, $rules, [
            'username.unique' => 'That username is already in use.',
            'password.required' => 'Add a password for the new login.',
        ]);
        if ($validator->fails()) return $this->error($validator->errors()->first(), $personId, 'access');
        $clean = $validator->validated();

        try {
            DB::transaction(function () use ($existingStaff, $person, $clean, $locationId) {
                $staff = $existingStaff ?: new Staffs_model();
                $staff->staff_name = (string)$person->display_name;
                $staff->staff_role_id = (int)$clean['staff_role_id'];
                $staff->staff_status = 1;
                $staff->sale_permission = 1;
                if (!$staff->staff_email || !$staff->exists) $staff->staff_email = $this->technicalStaffEmail($clean['username']);
                $staff->save();

                $user = [
                    'username' => $clean['username'],
                    'super_user' => false,
                    'send_invite' => false,
                    'activate' => true,
                ];
                if (($clean['password'] ?? '') !== '') $user['password'] = $clean['password'];
                $staff->addStaffUser($user);
                if ($locationId > 0) $staff->addStaffLocations([$locationId]);
                $staff->addStaffGroups([]);

                DB::table('pmd_operational_people')
                    ->where('id', (int)$person->id)->where('location_id', $locationId)
                    ->update(['staff_id' => (int)$staff->staff_id, 'updated_at' => now()]);
            });
        } catch (\Throwable $error) {
            report($error);
            return $this->error('Could not save PMD access. Check the username/password and try again.', $personId, 'access');
        }

        return redirect(admin_url('people').'?person='.$personId.'#access')->with('success', 'PMD access saved. Staff sign in at /staff/login.');
    }

    public function sendmessage()
    {
        $this->assertOwnerOrManager();
        if (!Schema::hasTable('pmd_staff_requests')) abort(503, 'Messages are not ready yet.');
        $locationId = $this->locationId();
        $personId = max(0, (int)request()->input('person_id', 0));
        $person = DB::table('pmd_operational_people')
            ->where('id', $personId)->where('location_id', $locationId)->where('is_active', 1)->first();
        if (!$person) abort(404);
        if (empty($person->staff_id)) return $this->error('Enable PMD login first so this person can receive messages.', $personId, 'messages');

        $validator = Validator::make(request()->all(), ['message' => ['required', 'string', 'min:1', 'max:2000']]);
        if ($validator->fails()) return $this->error($validator->errors()->first(), $personId, 'messages');
        $message = trim((string)$validator->validated()['message']);

        DB::table('pmd_staff_requests')->insert([
            'location_id' => $locationId,
            'staff_id' => (int)$person->staff_id,
            'person_id' => $personId,
            'request_type' => 'manager_message',
            'shift_id' => null,
            'date_from' => null,
            'date_to' => null,
            'message' => $message,
            'status' => 'sent',
            'manager_reply' => null,
            'handled_by_staff_id' => $this->staffId(),
            'handled_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect(admin_url('people').'?person='.$personId.'#messages')->with('success', 'Message sent.');
    }

    public function handlerequest()
    {
        $this->assertOwnerOrManager();
        if (!Schema::hasTable('pmd_staff_requests')) abort(503, 'Messages are not ready yet.');
        $locationId = $this->locationId();
        $personId = max(0, (int)request()->input('person_id', 0));
        $decision = trim((string)request()->input('decision', ''));
        if (!in_array($decision, ['approved', 'declined'], true)) abort(422);
        $requestId = max(0, (int)request()->input('id', 0));
        $row = DB::table('pmd_staff_requests')
            ->where('id', $requestId)->where('location_id', $locationId)->where('person_id', $personId)->where('status', 'pending')->first();
        if (!$row) abort(404);

        DB::table('pmd_staff_requests')->where('id', $requestId)->update([
            'status' => $decision,
            'manager_reply' => trim((string)request()->input('manager_reply', '')) ?: null,
            'handled_by_staff_id' => $this->staffId(),
            'handled_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect(admin_url('people').'?person='.$personId.'#messages')->with('success', 'Request updated.');
    }

    private function assertOwnerOrManager(): void
    {
        try {
            $code = app(PmdDefaultStaffRoleService::class)->roleCodeForUser(AdminAuth::getUser());
            if (in_array($code, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) return;
        } catch (\Throwable $error) {
        }
        abort(403);
    }

    private function requireReady(): void
    {
        if (!app(PmdKitchenOperationsSchemaService::class)->ready()) abort(503, 'Team schema is not ready yet.');
    }

    private function locationId(): int
    {
        try { return max(1, (int)AdminLocation::getId()); }
        catch (\Throwable $error) { return 1; }
    }

    private function staffId(): ?int
    {
        try {
            $user = AdminAuth::getUser();
            return $user && !empty($user->staff_id) ? (int)$user->staff_id : null;
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function technicalStaffEmail(string $username): string
    {
        $local = strtolower(trim(preg_replace('/[^a-z0-9._-]+/i', '-', $username), '-'));
        if ($local === '') $local = 'staff';
        return 'pmd-'.$local.'@staff.local';
    }

    private function error(string $message, int $personId = 0, string $anchor = '')
    {
        $url = admin_url('people');
        if ($personId > 0) $url .= '?person='.$personId;
        if ($anchor !== '') $url .= '#'.$anchor;
        return redirect($url)->with('error', $message)->withInput();
    }
}
