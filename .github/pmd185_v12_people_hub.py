from pathlib import Path

# PMD185 V12 — separate People workspace.
# Product goal: roster-first creation, one profile per person, schedule/messages/access.

people_controller = r'''<?php

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

        return redirect(admin_url('people').'?person='.$personId.'#access')->with('success', 'PMD access saved.');
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
'''

people_view = r'''@php
    $data = $pmdPeople ?? [];
    $people = collect($data['people'] ?? []);
    $unlinkedStaff = collect($data['unlinked_staff'] ?? []);
    $person = $data['selected'] ?? null;
    $access = $data['selected_access'] ?? null;
    $shifts = collect($data['shifts'] ?? []);
    $requests = collect($data['requests'] ?? []);
    $roles = collect($data['roles'] ?? []);
    $departments = $data['departments'] ?? [];
    $today = now()->startOfDay();
    $upcoming = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->gte($today))->values();
    $previous = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->lt($today))->reverse()->take(6)->values();
    $nextShift = $upcoming->first();
    $scheduleDay = $nextShift ? \Carbon\Carbon::parse($nextShift->shift_date) : now();
    $defaultRole = $roles->first(fn($role) => strtolower((string)$role->code) === \Admin\Services\PmdDefaultStaffRoleService::TEAM_MEMBER) ?: $roles->first();
@endphp

<div class="pmd-people" data-pmd-people>
    <header class="pmd-people__top">
        <div><span>Team</span><h1>People</h1></div>
        <div class="pmd-people__top-actions">
            <a href="{{ admin_url('shifts') }}">Shifts</a>
            <button type="button" data-pmd-people-add>+ Person</button>
        </div>
    </header>

    @if(session('success'))<div class="pmd-people__flash is-success">{{ session('success') }}</div>@endif
    @if(session('error'))<div class="pmd-people__flash is-error">{{ session('error') }}</div>@endif

    <section class="pmd-people__quick-add" data-pmd-people-add-form hidden>
        <form method="post" action="{{ admin_url('people/saveperson') }}">
            @csrf
            <label><span>Name</span><input required maxlength="128" name="display_name" placeholder="Name"></label>
            <label><span>Role</span><input maxlength="64" name="job_role" placeholder="Bartender, Chef…"></label>
            <label><span>Area</span><select name="department">@foreach($departments as $key => $label)<option value="{{ $key }}">{{ $label }}</option>@endforeach</select></label>
            <button type="submit">Add</button>
            <button type="button" class="is-cancel" data-pmd-people-add-cancel>Cancel</button>
        </form>
    </section>

    <div class="pmd-people__workspace">
        <aside class="pmd-people__list">
            <div class="pmd-people__search"><input type="search" placeholder="Search people" data-pmd-people-search></div>
            <div class="pmd-people__list-scroll">
                @forelse($people as $item)
                    <a class="pmd-people__person {{ $person && (int)$person->id === (int)$item->id ? 'is-active' : '' }}" href="{{ admin_url('people') }}?person={{ (int)$item->id }}" data-pmd-person-row data-search="{{ strtolower($item->display_name.' '.($item->job_role ?? '').' '.($item->department ?? '')) }}">
                        <span class="pmd-people__avatar">{{ strtoupper(substr(trim((string)$item->display_name),0,1)) }}</span>
                        <span class="pmd-people__person-copy"><strong>{{ $item->display_name }}</strong><small>{{ $item->job_role ?: ($departments[$item->department] ?? 'Team') }}</small></span>
                        @if(!empty($item->staff_id))<em>Login</em>@endif
                    </a>
                @empty
                    <div class="pmd-people__empty">No people yet. Add the first person above.</div>
                @endforelse
            </div>

            @if($unlinkedStaff->isNotEmpty())
                <div class="pmd-people__access-only">
                    <strong>Access only</strong>
                    @foreach($unlinkedStaff as $staff)
                        <form method="post" action="{{ admin_url('people/linkstaff') }}">
                            @csrf
                            <input type="hidden" name="staff_id" value="{{ (int)$staff->staff_id }}">
                            <button type="submit"><span><b>{{ $staff->staff_name }}</b><small>{{ $staff->user ? '@'.$staff->user->username : 'PMD account' }}</small></span><em>+ Team</em></button>
                        </form>
                    @endforeach
                </div>
            @endif
        </aside>

        <main class="pmd-people__profile">
            @if($person)
                <header class="pmd-people__profile-head">
                    <div class="pmd-people__profile-title">
                        <span class="pmd-people__avatar is-large">{{ strtoupper(substr(trim((string)$person->display_name),0,1)) }}</span>
                        <div><h2>{{ $person->display_name }}</h2><p>{{ $person->job_role ?: 'Team member' }} · {{ $departments[$person->department] ?? 'Other' }}</p></div>
                    </div>
                    <nav><a href="#schedule">Schedule</a><a href="#messages">Messages</a><a href="#access">Access</a></nav>
                </header>

                <section id="schedule" class="pmd-people__section">
                    <header><div><span>Schedule</span><h3>Shifts</h3></div><a href="{{ admin_url('shifts') }}?month={{ $scheduleDay->copy()->startOfMonth()->toDateString() }}&day={{ $scheduleDay->toDateString() }}#pmd-shift-day">Open calendar</a></header>
                    <div class="pmd-people__shift-list">
                        @forelse($upcoming->take(8) as $shift)
                            <a class="pmd-people__shift" href="{{ admin_url('shifts') }}?month={{ \Carbon\Carbon::parse($shift->shift_date)->startOfMonth()->toDateString() }}&day={{ \Carbon\Carbon::parse($shift->shift_date)->toDateString() }}#pmd-shift-day">
                                <time><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d') }}</strong><small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('M') }}</small></time>
                                <span><strong>{{ $shift->label ?: 'Shift' }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}@if($shift->ends_at)–{{ substr((string)$shift->ends_at,0,5) }}@endif</small></span>
                                <em>Edit</em>
                            </a>
                        @empty
                            <div class="pmd-people__empty is-inline">No upcoming shifts.</div>
                        @endforelse
                    </div>
                    @if($previous->isNotEmpty())
                        <details class="pmd-people__previous"><summary>Previous shifts</summary>@foreach($previous as $shift)<a href="{{ admin_url('shifts') }}?month={{ \Carbon\Carbon::parse($shift->shift_date)->startOfMonth()->toDateString() }}&day={{ \Carbon\Carbon::parse($shift->shift_date)->toDateString() }}#pmd-shift-day"><span>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d M Y') }}</span><strong>{{ $shift->label }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '—' }}–{{ $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '—' }}</small></a>@endforeach</details>
                    @endif
                </section>

                <section id="messages" class="pmd-people__section">
                    <header><div><span>Messages</span><h3>Conversation & requests</h3></div>@if($requests->where('status','pending')->count())<b>{{ $requests->where('status','pending')->count() }} pending</b>@endif</header>
                    <div class="pmd-people__thread">
                        @forelse($requests->reverse()->take(20) as $request)
                            @php $fromManager = (string)$request->request_type === 'manager_message'; @endphp
                            <article class="{{ $fromManager ? 'is-manager' : 'is-person' }}">
                                <div class="pmd-people__bubble">
                                    <span>{{ $fromManager ? 'Manager' : $person->display_name }} · {{ \Carbon\Carbon::parse($request->created_at)->format('d M H:i') }}</span>
                                    <p>{{ $request->message }}</p>
                                    @if(!$fromManager)<small>{{ ucfirst(str_replace('_',' ',(string)$request->request_type)) }} · {{ ucfirst((string)$request->status) }}</small>@endif
                                </div>
                                @if($request->manager_reply)<div class="pmd-people__bubble is-reply"><span>Manager</span><p>{{ $request->manager_reply }}</p></div>@endif
                                @if(!$fromManager && (string)$request->status === 'pending')
                                    <div class="pmd-people__request-actions">
                                        <form method="post" action="{{ admin_url('people/handlerequest') }}">@csrf<input type="hidden" name="id" value="{{ (int)$request->id }}"><input type="hidden" name="person_id" value="{{ (int)$person->id }}"><input type="hidden" name="decision" value="approved"><button type="submit">Approve</button></form>
                                        <form method="post" action="{{ admin_url('people/handlerequest') }}">@csrf<input type="hidden" name="id" value="{{ (int)$request->id }}"><input type="hidden" name="person_id" value="{{ (int)$person->id }}"><input type="hidden" name="decision" value="declined"><button type="submit" class="is-decline">Decline</button></form>
                                    </div>
                                @endif
                            </article>
                        @empty
                            <div class="pmd-people__empty is-inline">No messages yet.</div>
                        @endforelse
                    </div>
                    @if(!empty($data['requests_ready']) && !empty($person->staff_id))
                        <form class="pmd-people__compose" method="post" action="{{ admin_url('people/sendmessage') }}">
                            @csrf<input type="hidden" name="person_id" value="{{ (int)$person->id }}">
                            <textarea required maxlength="2000" rows="2" name="message" placeholder="Message {{ $person->display_name }}…"></textarea><button type="submit">Send</button>
                        </form>
                    @elseif(empty($person->staff_id))
                        <div class="pmd-people__hint">Enable PMD login in Access to send messages.</div>
                    @endif
                </section>

                <section id="access" class="pmd-people__section">
                    <header><div><span>Profile</span><h3>Details & access</h3></div></header>
                    <div class="pmd-people__settings-grid">
                        <form class="pmd-people__form" method="post" action="{{ admin_url('people/saveperson') }}">
                            @csrf<input type="hidden" name="id" value="{{ (int)$person->id }}">
                            <strong>Person</strong>
                            <label><span>Name</span><input required maxlength="128" name="display_name" value="{{ $person->display_name }}"></label>
                            <div class="pmd-people__form-row"><label><span>Role</span><input maxlength="64" name="job_role" value="{{ $person->job_role }}"></label><label><span>Area</span><select name="department">@foreach($departments as $key => $label)<option value="{{ $key }}" {{ $person->department === $key ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></label></div>
                            <button type="submit">Save details</button>
                        </form>

                        <form class="pmd-people__form" method="post" action="{{ admin_url('people/saveaccess') }}">
                            @csrf<input type="hidden" name="person_id" value="{{ (int)$person->id }}">
                            <strong>PMD login <em>{{ $access ? 'Active' : 'Optional' }}</em></strong>
                            <label><span>Username</span><input required maxlength="32" autocomplete="off" name="username" value="{{ $access && $access->user ? $access->user->username : '' }}" placeholder="username"></label>
                            <label><span>Access</span><select required name="staff_role_id">@foreach($roles as $role)<option value="{{ (int)$role->staff_role_id }}" {{ $access ? ((int)$access->staff_role_id === (int)$role->staff_role_id ? 'selected' : '') : ($defaultRole && (int)$defaultRole->staff_role_id === (int)$role->staff_role_id ? 'selected' : '') }}>{{ $role->name }}</option>@endforeach</select></label>
                            <label><span>Password {{ $access ? '· leave blank to keep' : '' }}</span><input {{ $access ? '' : 'required' }} minlength="6" maxlength="32" type="password" autocomplete="new-password" name="password"></label>
                            <button type="submit">{{ $access ? 'Save access' : 'Enable login' }}</button>
                        </form>
                    </div>
                </section>
            @else
                <div class="pmd-people__welcome"><strong>Add your first person</strong><p>Name is enough. Login is optional and can be enabled later from their profile.</p></div>
            @endif
        </main>
    </div>
</div>

<script>
(function(){
  var root=document.querySelector('[data-pmd-people]'); if(!root)return;
  var form=root.querySelector('[data-pmd-people-add-form]');
  var open=root.querySelector('[data-pmd-people-add]');
  var close=root.querySelector('[data-pmd-people-add-cancel]');
  function show(value){if(form)form.hidden=!value;if(value){var input=form.querySelector('input[name="display_name"]');if(input)input.focus();}}
  if(open)open.addEventListener('click',function(){show(true);});
  if(close)close.addEventListener('click',function(){show(false);});
  var search=root.querySelector('[data-pmd-people-search]');
  if(search)search.addEventListener('input',function(){var q=search.value.trim().toLowerCase();root.querySelectorAll('[data-pmd-person-row]').forEach(function(row){row.hidden=q!=='' && (row.getAttribute('data-search')||'').indexOf(q)===-1;});});
})();
</script>
'''

people_css = r'''body.pmd-people-page{background:#f8fbfd;color:#102a43}.pmd-people{width:min(1460px,calc(100% - 40px));margin:0 auto 70px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pmd-people *{box-sizing:border-box}.pmd-people__top{height:68px;display:flex;align-items:center;justify-content:space-between;gap:16px}.pmd-people__top>div:first-child span{display:block;color:#08745c;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.pmd-people__top h1{margin:1px 0 0;font-size:24px;font-weight:900;letter-spacing:-.03em}.pmd-people__top-actions{display:flex;gap:8px}.pmd-people__top-actions a,.pmd-people__top-actions button,.pmd-people__quick-add button,.pmd-people__form button,.pmd-people__compose button,.pmd-people__request-actions button{min-height:38px;padding:0 13px;border:1px solid #cfe0e8;border-radius:10px;background:#fff;color:#173752;font:inherit;font-size:11px;font-weight:850;text-decoration:none;cursor:pointer}.pmd-people__top-actions button,.pmd-people__quick-add button:first-of-type,.pmd-people__form button,.pmd-people__compose button{border-color:#075f4f;background:#075f4f;color:#fff}.pmd-people__flash{margin:0 0 10px;padding:9px 12px;border-radius:10px;font-size:11px;font-weight:800}.pmd-people__flash.is-success{background:#edf9f4;color:#075c47}.pmd-people__flash.is-error{background:#fff0ef;color:#a23b32}.pmd-people__quick-add{margin:0 0 10px;padding:10px;border:1px solid #d9e6ec;border-radius:12px;background:#fff}.pmd-people__quick-add[hidden]{display:none}.pmd-people__quick-add form{display:grid;grid-template-columns:2fr 1.3fr 1fr auto auto;gap:8px;align-items:end}.pmd-people label{display:grid;gap:4px;margin:0;color:#526c77;font-size:9.5px;font-weight:850}.pmd-people input,.pmd-people select,.pmd-people textarea{width:100%;border:1px solid #d2e0e8;border-radius:9px;background:#fff;color:#102a43;font:inherit;font-size:12px;outline:none}.pmd-people input,.pmd-people select{height:38px;padding:0 10px}.pmd-people textarea{padding:9px 10px;resize:vertical}.pmd-people input:focus,.pmd-people select:focus,.pmd-people textarea:focus{border-color:#79bda8;box-shadow:0 0 0 3px rgba(121,189,168,.13)}.pmd-people__quick-add .is-cancel{background:#fff;color:#526c77}.pmd-people__workspace{display:grid;grid-template-columns:292px minmax(0,1fr);min-height:680px;border:1px solid #d7e4ec;border-radius:16px;background:#fff;overflow:hidden}.pmd-people__list{display:flex;min-width:0;flex-direction:column;border-right:1px solid #e0e9ee;background:#f8fbfd}.pmd-people__search{padding:11px;border-bottom:1px solid #e0e9ee}.pmd-people__search input{background:#fff}.pmd-people__list-scroll{display:grid;align-content:start;gap:4px;max-height:550px;overflow:auto;padding:7px}.pmd-people__person{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px;border:1px solid transparent;border-radius:10px;color:#173752;text-decoration:none}.pmd-people__person:hover{background:#fff}.pmd-people__person.is-active{border-color:#b9d9cb;background:#edf9f4}.pmd-people__avatar{display:grid;width:32px;height:32px;place-items:center;border-radius:9px;background:#eaf3ff;color:#173752;font-size:11px;font-weight:900}.pmd-people__avatar.is-large{width:44px;height:44px;border-radius:12px;font-size:15px}.pmd-people__person-copy{display:grid;gap:1px;min-width:0}.pmd-people__person-copy strong,.pmd-people__person-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pmd-people__person-copy strong{font-size:11.5px}.pmd-people__person-copy small{color:#758897;font-size:9.5px}.pmd-people__person em{padding:3px 5px;border-radius:999px;background:#fff;color:#08745c;font-size:7.5px;font-style:normal;font-weight:900;text-transform:uppercase}.pmd-people__access-only{margin-top:auto;padding:10px;border-top:1px solid #e0e9ee}.pmd-people__access-only>strong{display:block;margin-bottom:5px;color:#7a8d96;font-size:9px;text-transform:uppercase;letter-spacing:.06em}.pmd-people__access-only form{margin:0}.pmd-people__access-only button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;padding:7px;border:0;border-radius:8px;background:transparent;text-align:left;cursor:pointer}.pmd-people__access-only button:hover{background:#fff}.pmd-people__access-only button span{display:grid;gap:1px}.pmd-people__access-only b{color:#173752;font-size:10.5px}.pmd-people__access-only small{color:#81929a;font-size:9px}.pmd-people__access-only em{color:#08745c;font-size:9px;font-style:normal;font-weight:850}.pmd-people__profile{min-width:0;padding:18px 22px 28px}.pmd-people__profile-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 0 15px;border-bottom:1px solid #e4ecef}.pmd-people__profile-title{display:flex;align-items:center;gap:11px;min-width:0}.pmd-people__profile-title h2{margin:0;color:#102a43;font-size:21px;font-weight:900;letter-spacing:-.025em}.pmd-people__profile-title p{margin:2px 0 0;color:#718591;font-size:10.5px}.pmd-people__profile-head nav{display:flex;gap:5px}.pmd-people__profile-head nav a{padding:7px 9px;border-radius:8px;color:#526c77;font-size:10px;font-weight:850;text-decoration:none}.pmd-people__profile-head nav a:hover{background:#f1f6f8;color:#075f4f}.pmd-people__section{scroll-margin-top:24px;padding:18px 0;border-bottom:1px solid #e8eef1}.pmd-people__section:last-child{border-bottom:0}.pmd-people__section>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.pmd-people__section>header span{display:block;color:#08745c;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}.pmd-people__section h3{margin:1px 0 0;font-size:15px;font-weight:900}.pmd-people__section>header>a{color:#08745c;font-size:10px;font-weight:850;text-decoration:none}.pmd-people__section>header>b{padding:4px 7px;border-radius:999px;background:#fff1df;color:#9a5a15;font-size:9px}.pmd-people__shift-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.pmd-people__shift{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:9px;padding:8px 10px;border:1px solid #dce7ed;border-radius:10px;color:#173752;text-decoration:none}.pmd-people__shift:hover{border-color:#b8d8ca;background:#f7fcfa}.pmd-people__shift time{display:grid;width:36px;height:36px;place-items:center;border-radius:9px;background:#eef5f9;line-height:1}.pmd-people__shift time strong{font-size:13px}.pmd-people__shift time small{font-size:8px;text-transform:uppercase}.pmd-people__shift>span{display:grid;gap:2px;min-width:0}.pmd-people__shift>span strong{font-size:11px}.pmd-people__shift>span small{color:#748995;font-size:9.5px}.pmd-people__shift em{color:#08745c;font-size:9px;font-style:normal;font-weight:850}.pmd-people__previous{margin-top:8px}.pmd-people__previous summary{color:#6d818c;font-size:10px;font-weight:850;cursor:pointer}.pmd-people__previous a{display:grid;grid-template-columns:90px minmax(0,1fr) 90px;gap:8px;padding:6px 2px;border-bottom:1px solid #eef2f4;color:#4e6672;font-size:9.5px;text-decoration:none}.pmd-people__thread{display:grid;gap:7px;max-height:340px;overflow:auto;padding-right:3px}.pmd-people__thread article{display:grid;gap:5px}.pmd-people__bubble{width:min(70%,620px);padding:8px 10px;border-radius:11px;background:#f2f6f8}.pmd-people__thread article.is-manager .pmd-people__bubble,.pmd-people__bubble.is-reply{margin-left:auto;background:#edf9f4}.pmd-people__bubble span{color:#78909a;font-size:8.5px;font-weight:800}.pmd-people__bubble p{margin:3px 0 0;color:#173752;font-size:11px;line-height:1.4}.pmd-people__bubble small{display:block;margin-top:4px;color:#82949d;font-size:8.5px}.pmd-people__request-actions{display:flex;gap:5px}.pmd-people__request-actions form{margin:0}.pmd-people__request-actions button{min-height:28px;padding:0 8px;border-color:#98cfb9;background:#edf9f4;color:#075c47;font-size:8.5px}.pmd-people__request-actions button.is-decline{border-color:#f0d3cf;background:#fff1ef;color:#a23b32}.pmd-people__compose{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px}.pmd-people__compose textarea{min-height:42px}.pmd-people__compose button{align-self:end}.pmd-people__hint,.pmd-people__empty{padding:10px;border:1px dashed #d6e1e6;border-radius:9px;color:#758994;font-size:10px}.pmd-people__empty.is-inline{grid-column:1/-1}.pmd-people__settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pmd-people__form{display:grid;align-content:start;gap:8px;padding:12px;border:1px solid #dce7ed;border-radius:11px;background:#fbfdfe}.pmd-people__form>strong{display:flex;align-items:center;justify-content:space-between;color:#173752;font-size:11.5px}.pmd-people__form>strong em{padding:3px 6px;border-radius:999px;background:#edf9f4;color:#08745c;font-size:8px;font-style:normal}.pmd-people__form-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pmd-people__form button{justify-self:start}.pmd-people__welcome{display:grid;min-height:560px;place-content:center;text-align:center;color:#6f838d}.pmd-people__welcome strong{color:#173752;font-size:16px}.pmd-people__welcome p{margin:5px 0 0;font-size:11px}@media(max-width:900px){.pmd-people{width:calc(100% - 20px)}.pmd-people__workspace{grid-template-columns:230px minmax(0,1fr)}.pmd-people__shift-list,.pmd-people__settings-grid{grid-template-columns:1fr}.pmd-people__quick-add form{grid-template-columns:1fr 1fr}.pmd-people__quick-add button{width:100%}}@media(max-width:680px){.pmd-people__workspace{display:block}.pmd-people__list{border-right:0;border-bottom:1px solid #e0e9ee}.pmd-people__list-scroll{max-height:250px}.pmd-people__profile{padding:14px}.pmd-people__profile-head{align-items:flex-start;flex-direction:column}.pmd-people__quick-add form{grid-template-columns:1fr}.pmd-people__bubble{width:90%}}
'''

Path('app/admin/controllers/People.php').write_text(people_controller)
Path('app/admin/views/pmdpeople').mkdir(parents=True, exist_ok=True)
Path('app/admin/views/pmdpeople/index.blade.php').write_text(people_view)
Path('app/admin/assets/css/pmd-people-v1.css').write_text(people_css)

# Shifts: Team becomes a real People workspace link, not another modal.
view_path = Path('app/admin/views/pmdshifts/index.blade.php')
view = view_path.read_text()
old = '''            <button type="button" class="pmd-shifts__header-button is-soft" data-pmd-team-open aria-label="Restaurant team">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
                <span>Team</span>
            </button>'''
new = '''            <a class="pmd-shifts__header-button is-soft" href="{{ admin_url('people') }}" aria-label="People">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
                <span>People</span>
            </a>'''
if old not in view: raise SystemExit('Shifts Team button anchor not found')
view = view.replace(old, new, 1)
view_path.write_text(view)

# Day sheet: employee name opens that person's People profile.
js_path = Path('app/admin/assets/js/pmd-shifts-v1.js')
js = js_path.read_text()
old = "'<span class=\"pmd-shifts-resource-person__copy\"><strong>' + escapeHtml(person.name || 'Team member') + '</strong><small>' + escapeHtml(person.role || 'Team') + '</small></span>' +"
new = "'<span class=\"pmd-shifts-resource-person__copy\"><a class=\"pmd-shifts-resource-person__link\" href=\"/admin/people?person=' + Number(person.id || 0) + '\">' + escapeHtml(person.name || 'Team member') + '</a><small>' + escapeHtml(person.role || 'Team') + '</small></span>' +"
if old not in js: raise SystemExit('resource person header anchor not found')
js = js.replace(old, new, 1)
js_path.write_text(js)

# Tiny visual inheritance for clickable person names in Day sheet.
shift_css_path = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')
shift_css = shift_css_path.read_text()
shift_css += '''\n/* PMD_SHIFTS_PERSON_PROFILE_LINK_V12 */\nbody.pmd-shifts-page .pmd-shifts-resource-person__link{display:block;overflow:hidden;color:#18364c;font-size:11px;font-weight:900;text-decoration:none;text-overflow:ellipsis;white-space:nowrap}\nbody.pmd-shifts-page .pmd-shifts-resource-person__link:hover{color:#08745c;text-decoration:underline}\n'''
shift_css_path.write_text(shift_css)

# Side navigation: People is a first-class Owner/Manager workspace next to Shifts.
menu_path = Path('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php')
menu = menu_path.read_text()
anchor = '''        <a class="pmd-sm2__item {{ $pmdActive(['shifts']) ? 'is-active' : '' }}" href="{{ admin_url('shifts') }}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v15h-16z"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M8 14h3M13 14h3M8 17h3"/></svg>
            <span class="pmd-sm2__label">{{ $pmdSm2T('nav.shifts', 'Shifts') }}</span>
        </a>'''
replacement = anchor + '''
        <a class="pmd-sm2__item {{ $pmdActive(['people']) ? 'is-active' : '' }}" href="{{ admin_url('people') }}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"/></svg>
            <span class="pmd-sm2__label">{{ $pmdSm2T('nav.people', 'People') }}</span>
        </a>'''
if anchor not in menu: raise SystemExit('side menu Shifts anchor not found')
menu = menu.replace(anchor, replacement, 1)
menu_path.write_text(menu)

# My Work: manager-initiated messages should read like messages, not approved requests.
mywork_path = Path('app/admin/views/pmdmywork/index.blade.php')
mywork = mywork_path.read_text()
old = '''                    @forelse($requests as $request)
                        <article><div><strong>{{ ucfirst(str_replace('_',' ',(string)$request->request_type)) }}</strong><small>{{ \\Carbon\\Carbon::parse($request->created_at)->format('d M · H:i') }}</small><p>{{ $request->message }}</p>@if($request->manager_reply)<em>{{ $request->manager_reply }}</em>@endif</div><span class="is-{{ $request->status }}">{{ ucfirst((string)$request->status) }}</span></article>
                    @empty'''
new = '''                    @forelse($requests as $request)
                        @php $pmdManagerMessage = (string)$request->request_type === 'manager_message'; @endphp
                        <article class="{{ $pmdManagerMessage ? 'is-manager-message' : '' }}"><div><strong>{{ $pmdManagerMessage ? 'Manager' : ucfirst(str_replace('_',' ',(string)$request->request_type)) }}</strong><small>{{ \\Carbon\\Carbon::parse($request->created_at)->format('d M · H:i') }}</small><p>{{ $request->message }}</p>@if($request->manager_reply)<em>{{ $request->manager_reply }}</em>@endif</div>@if(!$pmdManagerMessage)<span class="is-{{ $request->status }}">{{ ucfirst((string)$request->status) }}</span>@endif</article>
                    @empty'''
if old not in mywork: raise SystemExit('My Work request row anchor not found')
mywork = mywork.replace(old, new, 1)
mywork_path.write_text(mywork)

print('PMD People V12 staged')
