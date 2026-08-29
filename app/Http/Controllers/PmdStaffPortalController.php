<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdGermanWorkRulesService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/** PMD_STAFF_PORTAL_V2 */
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
        $user = AdminAuth::getUser();
        $roleService = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roleService->roleCodeForUser($user);
        $canManage = in_array($roleCode, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true);
        $workspaceRoute = $roleService->routeForRoleCode($roleCode);

        $shifts = collect();
        if (Schema::hasTable('pmd_operational_shift_people') && Schema::hasTable('pmd_operational_shifts')) {
            $from = now()->subMonths(2)->startOfMonth()->toDateString();
            $to = now()->addMonths(3)->endOfMonth()->toDateString();
            $shifts = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('shift.location_id', $locationId)
                ->where('assignment.person_id', (int)$person->id)
                ->whereBetween('shift.shift_date', [$from, $to])
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->select(['shift.id','shift.shift_date','shift.label','shift.starts_at','shift.ends_at','shift.break_minutes','shift.status','assignment.attendance_status'])
                ->orderBy('shift.shift_date')->orderBy('shift.starts_at')->get();
        }
        $workRuleWarnings = app(PmdGermanWorkRulesService::class)->analyze($shifts);

        $openShifts = collect();
        if (Schema::hasTable('pmd_operational_shifts') && Schema::hasTable('pmd_operational_shift_people')) {
            $openShifts = DB::table('pmd_operational_shifts as shift')
                ->leftJoin('pmd_operational_shift_people as assignment', 'assignment.shift_id', '=', 'shift.id')
                ->where('shift.location_id', $locationId)
                ->whereDate('shift.shift_date', '>=', now()->toDateString())
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->groupBy('shift.id','shift.shift_date','shift.label','shift.starts_at','shift.ends_at')
                ->havingRaw('COUNT(assignment.id) = 0')
                ->select(['shift.id','shift.shift_date','shift.label','shift.starts_at','shift.ends_at'])
                ->orderBy('shift.shift_date')->orderBy('shift.starts_at')->limit(20)->get();
        }

        $requests = collect();
        $managementRequests = collect();
        if (Schema::hasTable('pmd_staff_requests')) {
            $requests = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where(function ($query) use ($person, $staffId) {
                    $query->where('person_id', (int)$person->id);
                    if ($staffId > 0) $query->orWhere('staff_id', $staffId);
                })->orderByDesc('created_at')->limit(60)->get();

            if ($canManage) {
                $managementRequests = DB::table('pmd_staff_requests as request')
                    ->leftJoin('pmd_operational_people as person', 'person.id', '=', 'request.person_id')
                    ->where('request.location_id', $locationId)->where('request.status', 'pending')
                    ->whereIn('request.request_type', ['shift_change','time_off','sick','cover_shift'])
                    ->select(['request.*','person.display_name as person_name'])
                    ->orderBy('request.created_at')->limit(50)->get();
            }
        }

        $groups = collect();
        $messages = collect();
        $activeGroup = null;
        $chatReady = $this->chatReady();
        if ($chatReady) {
            $this->ensureTeamGroup($locationId);
            $groups = DB::table('pmd_staff_chat_groups as group')
                ->join('pmd_staff_chat_group_members as member', 'member.group_id', '=', 'group.id')
                ->where('group.location_id', $locationId)->where('group.is_active', 1)->where('member.staff_id', $staffId)
                ->select(['group.id','group.name','group.group_type'])->orderByRaw("CASE group.group_type WHEN 'team' THEN 0 ELSE 1 END")->orderBy('group.name')->get();

            $activeGroupId = max(0, (int)$request->query('group', 0));
            $activeGroup = $groups->firstWhere('id', $activeGroupId) ?: $groups->first();
            if ($activeGroup) {
                $messages = DB::table('pmd_staff_chat_messages as message')
                    ->leftJoin('staffs as staff', 'staff.staff_id', '=', 'message.staff_id')
                    ->where('message.location_id', $locationId)->where('message.group_id', (int)$activeGroup->id)
                    ->select(['message.id','message.staff_id','message.message','message.created_at','staff.staff_name'])
                    ->orderByDesc('message.id')->limit(120)->get()->reverse()->values();
            }
        }

        $teamMembers = collect();
        if (Schema::hasTable('pmd_operational_people')) {
            $teamMembers = DB::table('pmd_operational_people as person')
                ->join('staffs as staff', 'staff.staff_id', '=', 'person.staff_id')
                ->where('person.location_id', $locationId)->where('person.is_active', 1)->where('staff.staff_status', 1)
                ->select(['staff.staff_id','person.display_name','person.job_role','person.department'])->orderBy('person.display_name')->get();
        }

        return view('pmd-staff-portal.index', compact(
            'person','shifts','openShifts','requests','managementRequests','groups','messages','activeGroup','teamMembers','chatReady','roleCode','workspaceRoute','canManage','workRuleWarnings'
        ) + ['requestsReady' => Schema::hasTable('pmd_staff_requests'), 'staffId' => $staffId]);
    }

    public function saveRequest(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');
        if (!Schema::hasTable('pmd_staff_requests')) return redirect('/staff')->with('error', 'Requests are not available yet.');
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

        if ($shiftId && $type === 'shift_change') {
            $ownsShift = DB::table('pmd_operational_shift_people as assignment')->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('assignment.person_id', (int)$person->id)->where('assignment.shift_id', $shiftId)->where('shift.location_id', $locationId)->exists();
            if (!$ownsShift) return redirect('/staff#requests')->with('error', 'Choose one of your own shifts.');
        }
        if ($shiftId && $type === 'cover_shift') {
            $openShift = DB::table('pmd_operational_shifts as shift')->leftJoin('pmd_operational_shift_people as assignment', 'assignment.shift_id', '=', 'shift.id')
                ->where('shift.id', $shiftId)->where('shift.location_id', $locationId)->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->groupBy('shift.id')->havingRaw('COUNT(assignment.id) = 0')->select('shift.id')->first();
            if (!$openShift) return redirect('/staff#open-shifts')->with('error', 'That shift is no longer open.');
        }

        $dateFrom = !empty($clean['date_from']) ? Carbon::parse($clean['date_from'])->toDateString() : null;
        $dateTo = !empty($clean['date_to']) ? Carbon::parse($clean['date_to'])->toDateString() : null;
        if ($dateFrom && $dateTo && $dateTo < $dateFrom) return redirect('/staff#requests')->with('error', 'End date must be after start date.');

        DB::table('pmd_staff_requests')->insert([
            'location_id' => $locationId,'staff_id' => $this->staffId(),'person_id' => (int)$person->id,'request_type' => $type,
            'shift_id' => $shiftId,'date_from' => $dateFrom,'date_to' => $dateTo,'message' => trim((string)$clean['message']),
            'status' => $type === 'message' ? 'sent' : 'pending','created_at' => now(),'updated_at' => now(),
        ]);
        return redirect('/staff#requests')->with('success', $type === 'message' ? 'Message sent.' : 'Request sent.');
    }

    public function createGroup(Request $request)
    {
        if (!AdminAuth::isLogged() || !$this->chatReady()) return redirect('/staff');
        $person = $this->currentPerson(); if (!$person) return redirect('/staff/login');
        $validator = Validator::make($request->all(), ['name' => ['required','string','between:2,96'], 'member_ids' => ['nullable','array'], 'member_ids.*' => ['integer','min:1']]);
        if ($validator->fails()) return redirect('/staff#chat')->withErrors($validator);
        $locationId = (int)$person->location_id; $creator = $this->staffId();
        $allowed = DB::table('pmd_operational_people')->where('location_id', $locationId)->where('is_active', 1)->whereNotNull('staff_id')->pluck('staff_id')->map('intval');
        $memberIds = collect((array)($validator->validated()['member_ids'] ?? []))->map('intval')->filter(fn($id) => $allowed->contains($id))->push($creator)->unique()->values();
        $groupId = DB::transaction(function () use ($locationId, $creator, $validator, $memberIds) {
            $id = (int)DB::table('pmd_staff_chat_groups')->insertGetId(['location_id'=>$locationId,'name'=>trim((string)$validator->validated()['name']),'group_type'=>'custom','created_by_staff_id'=>$creator,'is_active'=>1,'created_at'=>now(),'updated_at'=>now()]);
            foreach ($memberIds as $staffId) DB::table('pmd_staff_chat_group_members')->insert(['group_id'=>$id,'staff_id'=>$staffId,'member_role'=>$staffId === $creator ? 'admin' : 'member','created_at'=>now(),'updated_at'=>now()]);
            return $id;
        });
        return redirect('/staff?group='.$groupId.'#chat')->with('success', 'Group created.');
    }

    public function sendChatMessage(Request $request)
    {
        if (!AdminAuth::isLogged() || !$this->chatReady()) return redirect('/staff');
        $person = $this->currentPerson(); if (!$person) return redirect('/staff/login');
        $validator = Validator::make($request->all(), ['group_id'=>['required','integer','min:1'], 'message'=>['required','string','min:1','max:4000']]);
        if ($validator->fails()) return redirect('/staff#chat')->withErrors($validator);
        $groupId = (int)$validator->validated()['group_id']; $staffId = $this->staffId(); $locationId = (int)$person->location_id;
        $member = DB::table('pmd_staff_chat_groups as group')->join('pmd_staff_chat_group_members as membership','membership.group_id','=','group.id')->where('group.id',$groupId)->where('group.location_id',$locationId)->where('group.is_active',1)->where('membership.staff_id',$staffId)->exists();
        if (!$member) abort(403);
        DB::table('pmd_staff_chat_messages')->insert(['location_id'=>$locationId,'group_id'=>$groupId,'staff_id'=>$staffId,'message'=>trim((string)$validator->validated()['message']),'created_at'=>now(),'updated_at'=>now()]);
        return redirect('/staff?group='.$groupId.'#chat');
    }

    public function handleRequest(Request $request)
    {
        if (!AdminAuth::isLogged() || !$this->canManage()) abort(403);
        $person = $this->currentPerson(); if (!$person || !Schema::hasTable('pmd_staff_requests')) abort(403);
        $validator = Validator::make($request->all(), ['id'=>['required','integer','min:1'],'decision'=>['required','in:approved,declined'],'manager_reply'=>['nullable','string','max:1000']]);
        if ($validator->fails()) return redirect('/staff#management')->withErrors($validator);
        $clean = $validator->validated(); $locationId = (int)$person->location_id;
        $row = DB::table('pmd_staff_requests')->where('id',(int)$clean['id'])->where('location_id',$locationId)->where('status','pending')->first();
        if (!$row) abort(404);

        DB::transaction(function () use ($row, $clean, $locationId) {
            if ($clean['decision'] === 'approved' && (string)$row->request_type === 'cover_shift' && $row->shift_id && $row->person_id) {
                $shift = DB::table('pmd_operational_shifts')->where('id',(int)$row->shift_id)->where('location_id',$locationId)->lockForUpdate()->first();
                if (!$shift || in_array(strtolower((string)$shift->status), ['cancelled','canceled'], true)) abort(409, 'That shift is no longer available.');

                $occupied = DB::table('pmd_operational_shift_people')->where('shift_id',(int)$row->shift_id)->exists();
                if ($occupied) abort(409, 'That shift has already been assigned.');

                $p = DB::table('pmd_operational_people')->where('id',(int)$row->person_id)->where('location_id',$locationId)->where('is_active',1)->first();
                if (!$p) abort(409, 'That team member is no longer active.');

                DB::table('pmd_operational_shift_people')->insert([
                    'shift_id'=>(int)$row->shift_id,
                    'person_id'=>(int)$p->id,
                    'display_name_snapshot'=>(string)$p->display_name,
                    'department_snapshot'=>(string)($p->department ?: 'other'),
                    'job_role_snapshot'=>trim((string)($p->job_role ?? '')) ?: null,
                    'attendance_status'=>'planned',
                    'is_replacement'=>0,
                    'created_at'=>now(),
                    'updated_at'=>now(),
                ]);

                DB::table('pmd_staff_requests')
                    ->where('location_id',$locationId)
                    ->where('request_type','cover_shift')
                    ->where('shift_id',(int)$row->shift_id)
                    ->where('status','pending')
                    ->where('id','!=',(int)$row->id)
                    ->update([
                        'status'=>'declined',
                        'manager_reply'=>'Another team member was assigned to this open shift.',
                        'handled_by_staff_id'=>$this->staffId(),
                        'handled_at'=>now(),
                        'updated_at'=>now(),
                    ]);
            }

            DB::table('pmd_staff_requests')->where('id',(int)$row->id)->update([
                'status'=>$clean['decision'],
                'manager_reply'=>trim((string)($clean['manager_reply'] ?? '')) ?: null,
                'handled_by_staff_id'=>$this->staffId(),
                'handled_at'=>now(),
                'updated_at'=>now(),
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
        $group = DB::table('pmd_staff_chat_groups')->where('location_id',$locationId)->where('group_type','team')->where('is_active',1)->first();
        if (!$group) {
            $id = (int)DB::table('pmd_staff_chat_groups')->insertGetId(['location_id'=>$locationId,'name'=>'Team','group_type'=>'team','created_by_staff_id'=>null,'is_active'=>1,'created_at'=>now(),'updated_at'=>now()]);
            $group = (object)['id'=>$id];
        }
        $staffIds = DB::table('pmd_operational_people')->where('location_id',$locationId)->where('is_active',1)->whereNotNull('staff_id')->pluck('staff_id')->map('intval')->unique();
        foreach ($staffIds as $staffId) DB::table('pmd_staff_chat_group_members')->updateOrInsert(['group_id'=>(int)$group->id,'staff_id'=>$staffId],['member_role'=>'member','updated_at'=>now(),'created_at'=>now()]);
    }

    private function chatReady(): bool
    {
        return Schema::hasTable('pmd_staff_chat_groups') && Schema::hasTable('pmd_staff_chat_group_members') && Schema::hasTable('pmd_staff_chat_messages');
    }

    private function canManage(): bool
    {
        try {
            $code = app(PmdDefaultStaffRoleService::class)->roleCodeForUser(AdminAuth::getUser());
            return in_array($code, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true);
        } catch (\Throwable $error) { return false; }
    }

    private function currentPerson()
    {
        $staffId = $this->staffId();
        if ($staffId < 1 || !Schema::hasTable('pmd_operational_people')) return null;
        return DB::table('pmd_operational_people')->where('staff_id',$staffId)->where('is_active',1)->orderBy('location_id')->orderBy('id')->first();
    }

    private function staffId(): int
    {
        try { $user = AdminAuth::getUser(); return (int)optional($user ? $user->staff : null)->staff_id; } catch (\Throwable $error) { return 0; }
    }

    private function logoutSession(): void
    {
        try { if (AdminAuth::isLogged()) { try { app(\Admin\Services\PmdAdminPresenceService::class)->logoutCurrentSession(); } catch (\Throwable $error) {} AdminAuth::logout(); } } catch (\Throwable $error) {}
        session()->invalidate(); session()->regenerateToken();
    }
}
