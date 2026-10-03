<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdGermanWorkRulesService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/** PMD_STAFF_PORTAL_V4 */
class PmdStaffPortalController extends Controller
{
    public function login()
    {
        if (AdminAuth::isLogged() && $this->currentPerson()) return redirect('/staff');
        return view('pmd-staff-portal.login', ['managementSession' => AdminAuth::isLogged()]);
    }

    public function authenticate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => ['required', 'string', 'max:64'],
            'password' => ['required', 'string', 'min:6', 'max:128'],
        ]);
        if ($validator->fails()) return redirect('/staff/login')->withErrors($validator)->withInput($request->except('password'));

        if (AdminAuth::isLogged()) {
            try { AdminAuth::logout(); } catch (\Throwable $error) {}
            session()->invalidate();
            session()->regenerateToken();
        }

        try {
            if (!AdminAuth::authenticate([
                'username' => trim((string)$validator->validated()['username']),
                'password' => (string)$validator->validated()['password'],
            ], true, true)) {
                return redirect('/staff/login')->with('error', 'Username or password is not correct.')->withInput($request->except('password'));
            }
        } catch (\Throwable $error) {
            report($error);
            return redirect('/staff/login')->with('error', 'Could not sign in. Please try again.')->withInput($request->except('password'));
        }

        session()->regenerate();
        if (!$this->currentPerson()) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'This login still needs a Team profile. Ask the restaurant Owner to open Settings → Team and connect it.');
        }

        try { app(\Admin\Services\PmdAdminPresenceService::class)->loginCurrentSession(); } catch (\Throwable $error) {}
        return redirect('/staff');
    }

    public function index(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');

        $person = $this->currentPerson();
        if (!$person) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'Your PMD login is not connected to the restaurant Team profile.');
        }

        $staffId = $this->staffId();
        $locationId = (int)$person->location_id;
        $avatarReady = $this->avatarSchemaReady();
        $person->avatar_url = $this->avatarUrlForPerson($person);

        $user = AdminAuth::getUser();
        $roleService = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roleService->roleCodeForUser($user);
        $canManage = in_array($roleCode, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true);
        $workspaceRoute = $roleService->routeForRoleCode($roleCode);

        $shifts = collect();
        if (Schema::hasTable('pmd_operational_shift_people') && Schema::hasTable('pmd_operational_shifts')) {
            $from = now()->subMonths(2)->startOfMonth()->toDateString();
            $to = now()->addMonths(3)->endOfMonth()->toDateString();
            $shiftQuery = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('shift.location_id', $locationId)
                ->where('assignment.person_id', (int)$person->id)
                ->whereBetween('shift.shift_date', [$from, $to])
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->select([
                    'shift.id',
                    'shift.shift_date',
                    'shift.label',
                    'shift.starts_at',
                    'shift.ends_at',
                    'shift.status',
                    'assignment.attendance_status',
                ]);

            if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
                $shiftQuery->addSelect('shift.break_minutes');
            } else {
                $shiftQuery->addSelect(DB::raw('0 as break_minutes'));
            }

            $shifts = $shiftQuery
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->get();
        }
        $workRuleWarnings = app(PmdGermanWorkRulesService::class)->analyze($shifts);

        $openShifts = collect();
        if (Schema::hasTable('pmd_operational_shifts') && Schema::hasTable('pmd_operational_shift_people')) {
            $openShifts = DB::table('pmd_operational_shifts as shift')
                ->leftJoin('pmd_operational_shift_people as assignment', 'assignment.shift_id', '=', 'shift.id')
                ->where('shift.location_id', $locationId)
                ->whereDate('shift.shift_date', '>=', now()->toDateString())
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->whereNull('assignment.id')
                ->select(['shift.id','shift.shift_date','shift.label','shift.starts_at','shift.ends_at'])
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->limit(20)
                ->get();
        }

        $requestsReady = Schema::hasTable('pmd_staff_requests');
        $requests = collect();
        $managementRequests = collect();
        if ($requestsReady) {
            $requests = DB::table('pmd_staff_requests as request')
                ->leftJoin('pmd_operational_shifts as shift', 'shift.id', '=', 'request.shift_id')
                ->where('request.location_id', $locationId)
                ->where(function ($query) use ($person, $staffId) {
                    $query->where('request.person_id', (int)$person->id);
                    if ($staffId > 0) $query->orWhere('request.staff_id', $staffId);
                })
                ->select([
                    'request.*',
                    'shift.shift_date as request_shift_date',
                    'shift.label as request_shift_label',
                    'shift.starts_at as request_shift_starts_at',
                    'shift.ends_at as request_shift_ends_at',
                ])
                ->orderByDesc('request.created_at')
                ->limit(60)
                ->get();

            if ($canManage) {
                $managementRequests = DB::table('pmd_staff_requests as request')
                    ->leftJoin('pmd_operational_people as person', 'person.id', '=', 'request.person_id')
                    ->leftJoin('pmd_operational_shifts as shift', 'shift.id', '=', 'request.shift_id')
                    ->where('request.location_id', $locationId)
                    ->where('request.status', 'pending')
                    ->whereIn('request.request_type', ['shift_change','time_off','sick','cover_shift'])
                    ->select([
                        'request.*',
                        'person.display_name as person_name',
                        'shift.shift_date as request_shift_date',
                        'shift.label as request_shift_label',
                        'shift.starts_at as request_shift_starts_at',
                        'shift.ends_at as request_shift_ends_at',
                    ])
                    ->orderBy('request.created_at')
                    ->limit(50)
                    ->get();
            }
        }

        $teamMembers = collect();
        if (Schema::hasTable('pmd_operational_people')) {
            $teamQuery = DB::table('pmd_operational_people as person')
                ->join('staffs as staff', 'staff.staff_id', '=', 'person.staff_id')
                ->where('person.location_id', $locationId)
                ->where('person.is_active', 1)
                ->where('staff.staff_status', 1)
                ->select([
                    'staff.staff_id',
                    'person.id as person_id',
                    'person.display_name',
                    'person.job_role',
                    'person.department',
                ]);

            if ($avatarReady) $teamQuery->addSelect('person.avatar_path');

            $teamMembers = $teamQuery
                ->orderBy('person.display_name')
                ->get()
                ->map(function ($member) {
                    $member->avatar_url = $this->avatarUrlForPerson($member, 'person_id');
                    return $member;
                });
        }
        $teamMembersByStaff = $teamMembers->keyBy('staff_id');

        $groups = collect();
        $messages = collect();
        $activeGroup = null;
        $chatReady = $this->chatReady();
        if ($chatReady) {
            $this->ensureTeamGroup($locationId);
            $groups = DB::table('pmd_staff_chat_groups as group')
                ->join('pmd_staff_chat_group_members as member', 'member.group_id', '=', 'group.id')
                ->where('group.location_id', $locationId)
                ->where('group.is_active', 1)
                ->where('member.staff_id', $staffId)
                ->select(['group.id','group.name','group.group_type'])
                ->orderByDesc('group.group_type')
                ->orderBy('group.name')
                ->get();

            $activeGroupId = max(0, (int)$request->query('group', 0));
            $activeGroup = $groups->firstWhere('id', $activeGroupId) ?: $groups->first();
            if ($activeGroup) {
                $messages = DB::table('pmd_staff_chat_messages as message')
                    ->leftJoin('staffs as staff', 'staff.staff_id', '=', 'message.staff_id')
                    ->where('message.location_id', $locationId)
                    ->where('message.group_id', (int)$activeGroup->id)
                    ->select(['message.id','message.staff_id','message.message','message.created_at','staff.staff_name'])
                    ->orderByDesc('message.id')
                    ->limit(120)
                    ->get()
                    ->reverse()
                    ->values();
            }
        }

        return view('pmd-staff-portal.index', compact(
            'person',
            'shifts',
            'openShifts',
            'requests',
            'managementRequests',
            'groups',
            'messages',
            'activeGroup',
            'teamMembers',
            'teamMembersByStaff',
            'chatReady',
            'requestsReady',
            'avatarReady',
            'roleCode',
            'workspaceRoute',
            'canManage',
            'workRuleWarnings',
            'staffId'
        ));
    }

    public function saveRequest(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');
        if (!Schema::hasTable('pmd_staff_requests')) return redirect('/staff#requests')->with('error', 'Requests are not available yet.');

        $person = $this->currentPerson();
        if (!$person) return redirect('/staff/login');

        $validator = Validator::make($request->all(), [
            'request_type' => ['required', 'in:shift_change,time_off,sick,cover_shift,message'],
            'shift_id' => ['nullable', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'message' => ['required', 'string', 'min:1', 'max:2000'],
        ]);
        if ($validator->fails()) return redirect('/staff#requests')->withErrors($validator)->withInput();

        $clean = $validator->validated();
        $locationId = (int)$person->location_id;
        $shiftId = !empty($clean['shift_id']) ? (int)$clean['shift_id'] : null;
        $type = (string)$clean['request_type'];

        if ($type === 'shift_change' && !$shiftId) {
            return redirect('/staff#requests')->with('error', 'Choose one of your shifts before sending a shift-change request.')->withInput();
        }

        if ($shiftId && $type === 'shift_change') {
            $ownsShift = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('assignment.person_id', (int)$person->id)
                ->where('assignment.shift_id', $shiftId)
                ->where('shift.location_id', $locationId)
                ->whereDate('shift.shift_date', '>=', now()->toDateString())
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->exists();
            if (!$ownsShift) return redirect('/staff#requests')->with('error', 'That shift is no longer available for a change request.');

            $duplicate = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where('person_id', (int)$person->id)
                ->where('request_type', 'shift_change')
                ->where('shift_id', $shiftId)
                ->where('status', 'pending')
                ->exists();
            if ($duplicate) return redirect('/staff#requests')->with('error', 'A shift-change request for this shift is already pending.');
        }

        if ($shiftId && $type === 'cover_shift') {
            $openShift = DB::table('pmd_operational_shifts as shift')
                ->leftJoin('pmd_operational_shift_people as assignment', 'assignment.shift_id', '=', 'shift.id')
                ->where('shift.id', $shiftId)
                ->where('shift.location_id', $locationId)
                ->whereDate('shift.shift_date', '>=', now()->toDateString())
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->whereNull('assignment.id')
                ->select('shift.id')
                ->first();
            if (!$openShift) return redirect('/staff#open-shifts')->with('error', 'That shift is no longer open.');

            $duplicate = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where('person_id', (int)$person->id)
                ->where('request_type', 'cover_shift')
                ->where('shift_id', $shiftId)
                ->where('status', 'pending')
                ->exists();
            if ($duplicate) return redirect('/staff#open-shifts')->with('error', 'You already volunteered for this shift.');
        }

        $dateFrom = !empty($clean['date_from']) ? Carbon::parse($clean['date_from'])->toDateString() : null;
        $dateTo = !empty($clean['date_to']) ? Carbon::parse($clean['date_to'])->toDateString() : null;

        if (in_array($type, ['time_off', 'sick'], true) && !$dateFrom) {
            return redirect('/staff#requests')->with('error', 'Choose the first day for this request.')->withInput();
        }
        if ($dateFrom && $dateTo && $dateTo < $dateFrom) {
            return redirect('/staff#requests')->with('error', 'End date must be after start date.')->withInput();
        }

        DB::table('pmd_staff_requests')->insert([
            'location_id' => $locationId,
            'staff_id' => $this->staffId(),
            'person_id' => (int)$person->id,
            'request_type' => $type,
            'shift_id' => $shiftId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'message' => trim((string)$clean['message']),
            'status' => $type === 'message' ? 'sent' : 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $success = $type === 'shift_change'
            ? 'Shift-change request sent to management.'
            : ($type === 'message' ? 'Message sent.' : 'Request sent to management.');

        return redirect('/staff#requests')->with('success', $success);
    }

    /** PMD_STAFF_PORTAL_SELF_PROFILE_V1 */
    public function updateProfile(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');

        $person = $this->currentPerson();
        if (!$person) return redirect('/staff/login');

        $staffId = $this->staffId();
        $input = [
            'display_name' => trim((string)$request->input('display_name', '')),
            'avatar' => $request->file('avatar'),
            'remove_avatar' => $request->boolean('remove_avatar'),
        ];

        $validator = Validator::make($input, [
            'display_name' => ['required', 'string', 'between:2,128', 'unique:staffs,staff_name,'.$staffId.',staff_id'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=64,min_height=64,max_width=3000,max_height=3000'],
            'remove_avatar' => ['boolean'],
        ], [
            'display_name.unique' => 'That display name is already used by another team member.',
            'avatar.max' => 'Profile photo must be 2 MB or smaller.',
        ]);

        if ($validator->fails()) return redirect('/staff#profile')->withErrors($validator)->withInput();

        $avatarReady = $this->avatarSchemaReady();
        $avatar = $request->file('avatar');
        $removeAvatar = (bool)$input['remove_avatar'];
        if (($avatar || $removeAvatar) && !$avatarReady) {
            return redirect('/staff#profile')->with('error', 'Profile photos are not available for this restaurant yet.');
        }

        $oldPath = $avatarReady ? trim((string)($person->avatar_path ?? '')) : '';
        $newPath = null;

        if ($avatar) {
            $extension = strtolower((string)$avatar->extension());
            if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) $extension = 'jpg';
            $directory = 'pmd-staff-avatars/'.(int)$person->location_id.'/'.(int)$person->id;
            $filename = now()->format('YmdHis').'-'.Str::lower(Str::random(20)).'.'.$extension;
            $newPath = Storage::disk('local')->putFileAs($directory, $avatar, $filename);
            if (!$newPath) return redirect('/staff#profile')->with('error', 'Could not save the profile photo. Please try again.');
        }

        try {
            DB::transaction(function () use ($person, $staffId, $input, $avatarReady, $removeAvatar, $newPath) {
                DB::table('staffs')
                    ->where('staff_id', $staffId)
                    ->update([
                        'staff_name' => $input['display_name'],
                        'updated_at' => now(),
                    ]);

                $personUpdate = [
                    'display_name' => $input['display_name'],
                    'updated_at' => now(),
                ];

                if ($avatarReady && $newPath) $personUpdate['avatar_path'] = $newPath;
                elseif ($avatarReady && $removeAvatar) $personUpdate['avatar_path'] = null;

                DB::table('pmd_operational_people')
                    ->where('id', (int)$person->id)
                    ->where('location_id', (int)$person->location_id)
                    ->where('staff_id', $staffId)
                    ->update($personUpdate);
            });
        } catch (\Throwable $error) {
            if ($newPath) Storage::disk('local')->delete($newPath);
            report($error);
            return redirect('/staff#profile')->with('error', 'Could not update your profile. Please try again.');
        }

        if (($newPath || $removeAvatar) && $oldPath && $oldPath !== $newPath && $this->isManagedAvatarPath($oldPath)) {
            try { Storage::disk('local')->delete($oldPath); } catch (\Throwable $error) {}
        }

        return redirect('/staff#profile')->with('success', 'Profile updated.');
    }

    /** PMD_STAFF_PORTAL_PRIVATE_AVATAR_V1 */
    public function avatar(Request $request)
    {
        if (!AdminAuth::isLogged()) abort(404);

        $viewer = $this->currentPerson();
        if (!$viewer || !$this->avatarSchemaReady()) abort(404);

        $personId = max(1, (int)$request->query('person', (int)$viewer->id));
        $target = DB::table('pmd_operational_people')
            ->where('id', $personId)
            ->where('location_id', (int)$viewer->location_id)
            ->where('is_active', 1)
            ->first();

        $path = $target ? trim((string)($target->avatar_path ?? '')) : '';
        if (!$target || !$path || !$this->isManagedAvatarPath($path) || !Storage::disk('local')->exists($path)) abort(404);

        $fullPath = storage_path('app/'.ltrim($path, '/'));
        return response()->file($fullPath, [
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function createGroup(Request $request)
    {
        if (!AdminAuth::isLogged() || !$this->chatReady()) return redirect('/staff');
        $person = $this->currentPerson();
        if (!$person) return redirect('/staff/login');

        $validator = Validator::make($request->all(), [
            'name' => ['required','string','between:2,96'],
            'member_ids' => ['nullable','array'],
            'member_ids.*' => ['integer','min:1'],
        ]);
        if ($validator->fails()) return redirect('/staff#chat')->withErrors($validator);

        $locationId = (int)$person->location_id;
        $creator = $this->staffId();
        $name = trim((string)$validator->validated()['name']);

        $duplicate = DB::table('pmd_staff_chat_groups')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->exists();
        if ($duplicate) return redirect('/staff#chat')->with('error', 'A group with that name already exists.');

        $allowed = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->whereNotNull('staff_id')
            ->pluck('staff_id')
            ->map('intval');

        $memberIds = collect((array)($validator->validated()['member_ids'] ?? []))
            ->map('intval')
            ->filter(fn($id) => $allowed->contains($id))
            ->push($creator)
            ->unique()
            ->values();

        $groupId = DB::transaction(function () use ($locationId, $creator, $name, $memberIds) {
            $id = (int)DB::table('pmd_staff_chat_groups')->insertGetId([
                'location_id' => $locationId,
                'name' => $name,
                'group_type' => 'custom',
                'created_by_staff_id' => $creator,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            foreach ($memberIds as $memberStaffId) {
                DB::table('pmd_staff_chat_group_members')->insert([
                    'group_id' => $id,
                    'staff_id' => $memberStaffId,
                    'member_role' => $memberStaffId === $creator ? 'admin' : 'member',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            return $id;
        });

        return redirect('/staff?group='.$groupId.'#chat')->with('success', 'Group created.');
    }

    public function sendChatMessage(Request $request)
    {
        if (!AdminAuth::isLogged() || !$this->chatReady()) return redirect('/staff');
        $person = $this->currentPerson();
        if (!$person) return redirect('/staff/login');

        $validator = Validator::make($request->all(), [
            'group_id' => ['required','integer','min:1'],
            'message' => ['required','string','min:1','max:4000'],
        ]);
        if ($validator->fails()) return redirect('/staff#chat')->withErrors($validator);

        $groupId = (int)$validator->validated()['group_id'];
        $staffId = $this->staffId();
        $locationId = (int)$person->location_id;

        $member = DB::table('pmd_staff_chat_groups as group')
            ->join('pmd_staff_chat_group_members as membership', 'membership.group_id', '=', 'group.id')
            ->where('group.id', $groupId)
            ->where('group.location_id', $locationId)
            ->where('group.is_active', 1)
            ->where('membership.staff_id', $staffId)
            ->exists();
        if (!$member) abort(403);

        DB::table('pmd_staff_chat_messages')->insert([
            'location_id' => $locationId,
            'group_id' => $groupId,
            'staff_id' => $staffId,
            'message' => trim((string)$validator->validated()['message']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect('/staff?group='.$groupId.'#chat');
    }

    public function handleRequest(Request $request)
    {
        if (!AdminAuth::isLogged() || !$this->canManage()) abort(403);
        $person = $this->currentPerson();
        if (!$person || !Schema::hasTable('pmd_staff_requests')) abort(403);

        $validator = Validator::make($request->all(), [
            'id' => ['required','integer','min:1'],
            'decision' => ['required','in:approved,declined'],
            'manager_reply' => ['nullable','string','max:1000'],
        ]);
        if ($validator->fails()) return redirect('/staff#management')->withErrors($validator);

        $clean = $validator->validated();
        $locationId = (int)$person->location_id;
        $row = DB::table('pmd_staff_requests')
            ->where('id', (int)$clean['id'])
            ->where('location_id', $locationId)
            ->where('status', 'pending')
            ->first();
        if (!$row) abort(404);

        DB::transaction(function () use ($row, $clean, $locationId) {
            if ($clean['decision'] === 'approved' && (string)$row->request_type === 'cover_shift' && $row->shift_id && $row->person_id) {
                $shift = DB::table('pmd_operational_shifts')
                    ->where('id', (int)$row->shift_id)
                    ->where('location_id', $locationId)
                    ->lockForUpdate()
                    ->first();
                if (!$shift || in_array(strtolower((string)$shift->status), ['cancelled','canceled'], true)) abort(409, 'That shift is no longer available.');

                $occupied = DB::table('pmd_operational_shift_people')->where('shift_id', (int)$row->shift_id)->exists();
                if ($occupied) abort(409, 'That shift has already been assigned.');

                $p = DB::table('pmd_operational_people')
                    ->where('id', (int)$row->person_id)
                    ->where('location_id', $locationId)
                    ->where('is_active', 1)
                    ->first();
                if (!$p) abort(409, 'That team member is no longer active.');

                DB::table('pmd_operational_shift_people')->insert([
                    'shift_id' => (int)$row->shift_id,
                    'person_id' => (int)$p->id,
                    'display_name_snapshot' => (string)$p->display_name,
                    'department_snapshot' => (string)($p->department ?: 'other'),
                    'job_role_snapshot' => trim((string)($p->job_role ?? '')) ?: null,
                    'attendance_status' => 'planned',
                    'is_replacement' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('pmd_staff_requests')
                    ->where('location_id', $locationId)
                    ->where('request_type', 'cover_shift')
                    ->where('shift_id', (int)$row->shift_id)
                    ->where('status', 'pending')
                    ->where('id', '!=', (int)$row->id)
                    ->update([
                        'status' => 'declined',
                        'manager_reply' => 'Another team member was assigned to this open shift.',
                        'handled_by_staff_id' => $this->staffId(),
                        'handled_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            $reply = trim((string)($clean['manager_reply'] ?? '')) ?: null;
            if (!$reply && $clean['decision'] === 'approved' && (string)$row->request_type === 'shift_change') {
                $reply = 'Approved. Management can now apply the agreed change in Shifts.';
            }

            DB::table('pmd_staff_requests')
                ->where('id', (int)$row->id)
                ->update([
                    'status' => $clean['decision'],
                    'manager_reply' => $reply,
                    'handled_by_staff_id' => $this->staffId(),
                    'handled_at' => now(),
                    'updated_at' => now(),
                ]);
        });

        return redirect('/staff#management')->with('success', 'Request updated.');
    }

    public function logout()
    {
        $this->logoutSession();
        return redirect('/staff/login')->with('success', 'Signed out.');
    }

    private function ensureTeamGroup(int $locationId): void
    {
        $group = DB::table('pmd_staff_chat_groups')
            ->where('location_id', $locationId)
            ->where('group_type', 'team')
            ->where('is_active', 1)
            ->first();

        if (!$group) {
            $id = (int)DB::table('pmd_staff_chat_groups')->insertGetId([
                'location_id' => $locationId,
                'name' => 'Team',
                'group_type' => 'team',
                'created_by_staff_id' => null,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $group = (object)['id' => $id];
        }

        $staffIds = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->whereNotNull('staff_id')
            ->pluck('staff_id')
            ->map('intval')
            ->unique();

        foreach ($staffIds as $memberStaffId) {
            $exists = DB::table('pmd_staff_chat_group_members')
                ->where('group_id', (int)$group->id)
                ->where('staff_id', $memberStaffId)
                ->exists();
            if ($exists) {
                DB::table('pmd_staff_chat_group_members')
                    ->where('group_id', (int)$group->id)
                    ->where('staff_id', $memberStaffId)
                    ->update(['member_role' => 'member', 'updated_at' => now()]);
            } else {
                DB::table('pmd_staff_chat_group_members')->insert([
                    'group_id' => (int)$group->id,
                    'staff_id' => $memberStaffId,
                    'member_role' => 'member',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function chatReady(): bool
    {
        return Schema::hasTable('pmd_staff_chat_groups')
            && Schema::hasTable('pmd_staff_chat_group_members')
            && Schema::hasTable('pmd_staff_chat_messages');
    }

    private function avatarSchemaReady(): bool
    {
        return Schema::hasTable('pmd_operational_people')
            && Schema::hasColumn('pmd_operational_people', 'avatar_path');
    }

    private function avatarUrlForPerson($person, string $idKey = 'id'): ?string
    {
        if (!$this->avatarSchemaReady()) return null;
        $path = trim((string)($person->avatar_path ?? ''));
        $personId = (int)($person->{$idKey} ?? 0);
        if ($personId < 1 || !$path || !$this->isManagedAvatarPath($path)) return null;
        try {
            if (!Storage::disk('local')->exists($path)) return null;
        } catch (\Throwable $error) {
            return null;
        }
        return admin_url('mywork/avatar').'?person='.$personId.'&v='.substr(sha1($path), 0, 12);
    }

    private function isManagedAvatarPath(string $path): bool
    {
        $path = ltrim(str_replace('\\', '/', trim($path)), '/');
        return $path !== '' && Str::startsWith($path, 'pmd-staff-avatars/') && !Str::contains($path, '../');
    }

    private function canManage(): bool
    {
        try {
            $code = app(PmdDefaultStaffRoleService::class)->roleCodeForUser(AdminAuth::getUser());
            return in_array($code, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true);
        } catch (\Throwable $error) {
            return false;
        }
    }

    private function currentPerson()
    {
        $staffId = $this->staffId();
        if ($staffId < 1 || !Schema::hasTable('pmd_operational_people')) return null;
        return DB::table('pmd_operational_people')
            ->where('staff_id', $staffId)
            ->where('is_active', 1)
            ->orderBy('location_id')
            ->orderBy('id')
            ->first();
    }

    private function staffId(): int
    {
        try {
            $user = AdminAuth::getUser();
            return (int)optional($user ? $user->staff : null)->staff_id;
        } catch (\Throwable $error) {
            return 0;
        }
    }

    private function logoutSession(): void
    {
        try {
            if (AdminAuth::isLogged()) {
                try { app(\Admin\Services\PmdAdminPresenceService::class)->logoutCurrentSession(); } catch (\Throwable $error) {}
                AdminAuth::logout();
            }
        } catch (\Throwable $error) {}
        session()->invalidate();
        session()->regenerateToken();
    }
}
