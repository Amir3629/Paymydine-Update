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

/**
 * PMD_STAFF_PORTAL_V5
 *
 * Additive Staff Portal authority layered on the proven V4 controller.
 * V5 owns personal month navigation/reporting, historical Team identity
 * reconciliation and explicit avatar delivery. All other public actions are
 * inherited unchanged from PmdStaffPortalController.
 */
class PmdStaffPortalV5Controller extends PmdStaffPortalController
{
    public function index(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');

        $person = $this->currentPersonV5();
        if (!$person) {
            $this->logoutSessionV5();
            return redirect('/staff/login')->with('error', 'Your PMD login is not connected to the restaurant Team profile.');
        }

        $staffId = $this->staffIdV5();
        $locationId = (int)$person->location_id;
        $avatarReady = $this->avatarSchemaReadyV5();
        $person->avatar_url = $this->avatarUrlForPersonV5($person);

        $selectedMonth = $this->selectedMonth($request);
        $monthStart = $selectedMonth->copy()->startOfMonth();
        $monthEnd = $selectedMonth->copy()->endOfMonth();
        $monthKey = $selectedMonth->format('Y-m');
        $previousMonthKey = $selectedMonth->copy()->subMonthNoOverflow()->format('Y-m');
        $nextMonthKey = $selectedMonth->copy()->addMonthNoOverflow()->format('Y-m');
        $currentMonthKey = now()->format('Y-m');

        // One PMD staff account may have older/inactive operational person rows
        // from pre-unification roster work. They are one historical identity.
        $identityPersonIds = $this->identityPersonIds($locationId, $staffId, (int)$person->id);

        $user = AdminAuth::getUser();
        $roleService = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roleService->roleCodeForUser($user);
        $canManage = in_array($roleCode, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true);
        $workspaceRoute = $roleService->routeForRoleCode($roleCode);

        $shifts = collect();
        $nextShift = null;
        if (Schema::hasTable('pmd_operational_shift_people') && Schema::hasTable('pmd_operational_shifts')) {
            $shiftQuery = $this->personalShiftQuery($locationId, $identityPersonIds)
                ->whereBetween('shift.shift_date', [$monthStart->toDateString(), $monthEnd->toDateString()]);
            $this->addBreakSelect($shiftQuery);

            $shifts = $shiftQuery
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->orderBy('shift.id')
                ->get()
                ->unique('id')
                ->values()
                ->map(function ($shift) {
                    $shift->planned_hours = round($this->plannedMinutesForShift($shift) / 60, 2);
                    return $shift;
                });

            $nextQuery = $this->personalShiftQuery($locationId, $identityPersonIds)
                ->whereDate('shift.shift_date', '>=', now()->toDateString());
            $this->addBreakSelect($nextQuery);
            $nextShift = $nextQuery
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->orderBy('shift.id')
                ->first();
            if ($nextShift) $nextShift->planned_hours = round($this->plannedMinutesForShift($nextShift) / 60, 2);
        }

        $workRuleWarnings = app(PmdGermanWorkRulesService::class)->analyze($shifts);
        [$attendanceReady, $monthlyReport] = $this->monthlyAttendanceReport(
            $staffId,
            $locationId,
            $monthStart,
            $monthEnd,
            $shifts
        );

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
                ->where(function ($query) use ($identityPersonIds, $staffId) {
                    if ($identityPersonIds) $query->whereIn('request.person_id', $identityPersonIds);
                    else $query->whereRaw('1 = 0');
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
                    $member->avatar_url = $this->avatarUrlForPersonV5($member, 'person_id');
                    return $member;
                });
        }
        $teamMembersByStaff = $teamMembers->keyBy('staff_id');

        $groups = collect();
        $messages = collect();
        $activeGroup = null;
        $chatReady = $this->chatReadyV5();
        if ($chatReady) {
            $this->ensureTeamGroupV5($locationId);
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

        return view('pmd-staff-portal.index_v5', compact(
            'person',
            'shifts',
            'nextShift',
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
            'attendanceReady',
            'monthlyReport',
            'selectedMonth',
            'monthKey',
            'previousMonthKey',
            'nextMonthKey',
            'currentMonthKey',
            'roleCode',
            'workspaceRoute',
            'canManage',
            'workRuleWarnings',
            'staffId'
        ));
    }

    /**
     * V5 shift changes accept any historical operational person row already
     * linked to the same PMD staff account. Other request behavior is unchanged.
     */
    public function saveRequest(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');
        if (!Schema::hasTable('pmd_staff_requests')) return redirect('/staff#requests')->with('error', 'Requests are not available yet.');

        $person = $this->currentPersonV5();
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
        $staffId = $this->staffIdV5();
        $locationId = (int)$person->location_id;
        $identityPersonIds = $this->identityPersonIds($locationId, $staffId, (int)$person->id);
        $shiftId = !empty($clean['shift_id']) ? (int)$clean['shift_id'] : null;
        $type = (string)$clean['request_type'];

        if ($type === 'shift_change' && !$shiftId) {
            return redirect('/staff#requests')->with('error', 'Choose one of your shifts before sending a shift-change request.')->withInput();
        }

        if ($shiftId && $type === 'shift_change') {
            $ownsShift = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->whereIn('assignment.person_id', $identityPersonIds)
                ->where('assignment.shift_id', $shiftId)
                ->where('shift.location_id', $locationId)
                ->whereDate('shift.shift_date', '>=', now()->toDateString())
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->exists();
            if (!$ownsShift) return redirect('/staff#requests')->with('error', 'That shift is no longer available for a change request.');

            $duplicate = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
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
                ->where('staff_id', $staffId)
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
            'staff_id' => $staffId,
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

    /** PMD_STAFF_PORTAL_AVATAR_DELIVERY_V2 */
    public function avatar(Request $request)
    {
        if (!AdminAuth::isLogged()) abort(404);

        $viewer = $this->currentPersonV5();
        if (!$viewer || !$this->avatarSchemaReadyV5()) abort(404);

        $personId = max(1, (int)$request->query('person', (int)$viewer->id));
        $target = DB::table('pmd_operational_people')
            ->where('id', $personId)
            ->where('location_id', (int)$viewer->location_id)
            ->where('is_active', 1)
            ->first();

        $path = $target ? trim((string)($target->avatar_path ?? '')) : '';
        if (!$target || !$path || !$this->isManagedAvatarPathV5($path)) abort(404);

        $disk = Storage::disk('local');
        if (!$disk->exists($path)) abort(404);

        $mime = null;
        try { $mime = (string)$disk->mimeType($path); } catch (\Throwable $error) {}
        if (!$mime || strpos($mime, 'image/') !== 0) $mime = 'image/jpeg';

        return response($disk->get($path), 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline',
        ]);
    }

    private function personalShiftQuery(int $locationId, array $identityPersonIds)
    {
        return DB::table('pmd_operational_shift_people as assignment')
            ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
            ->where('shift.location_id', $locationId)
            ->whereIn('assignment.person_id', $identityPersonIds)
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
    }

    private function addBreakSelect($query): void
    {
        if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
            $query->addSelect('shift.break_minutes');
        } else {
            $query->addSelect(DB::raw('0 as break_minutes'));
        }
    }

    private function identityPersonIds(int $locationId, int $staffId, int $currentPersonId): array
    {
        $ids = collect([$currentPersonId]);
        if ($staffId > 0 && Schema::hasTable('pmd_operational_people')) {
            $linked = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
                ->pluck('id')
                ->map('intval');
            $ids = $ids->merge($linked);
        }
        return $ids->map('intval')->filter(fn($id) => $id > 0)->unique()->values()->all();
    }

    private function selectedMonth(Request $request): Carbon
    {
        $selected = now()->startOfMonth();
        $raw = trim((string)$request->query('month', ''));
        if (preg_match('/^\d{4}-\d{2}$/', $raw)) {
            try { $selected = Carbon::parse($raw.'-01')->startOfMonth(); } catch (\Throwable $error) {}
        }

        $minimum = now()->subYears(5)->startOfMonth();
        $maximum = now()->addYears(2)->startOfMonth();
        if ($selected->lt($minimum)) return $minimum;
        if ($selected->gt($maximum)) return $maximum;
        return $selected;
    }

    private function plannedMinutesForShift($shift): int
    {
        $start = $this->minutesOfDay($shift->starts_at ?? null);
        $end = $this->minutesOfDay($shift->ends_at ?? null);
        if ($start === null || $end === null) return 0;
        if ($end <= $start) $end += 1440;
        $break = max(0, min(240, (int)($shift->break_minutes ?? 0)));
        return max(0, ($end - $start) - $break);
    }

    private function minutesOfDay($value): ?int
    {
        if ($value === null || trim((string)$value) === '') return null;
        $parts = explode(':', (string)$value);
        if (count($parts) < 2) return null;
        return ((int)$parts[0] * 60) + (int)$parts[1];
    }

    private function monthlyAttendanceReport(int $staffId, int $locationId, Carbon $monthStart, Carbon $monthEnd, $shifts): array
    {
        $plannedMinutes = collect($shifts)->sum(fn($shift) => $this->plannedMinutesForShift($shift));
        $base = [
            'planned_hours' => round($plannedMinutes / 60, 1),
            'worked_hours' => null,
            'scheduled_shifts' => collect($shifts)->count(),
            'scheduled_days' => collect($shifts)->pluck('shift_date')->map(fn($date) => Carbon::parse($date)->toDateString())->unique()->count(),
            'recorded_days' => 0,
            'open_sessions' => 0,
        ];

        $ready = $staffId > 0
            && Schema::hasTable('staff_attendance')
            && Schema::hasColumn('staff_attendance', 'staff_id')
            && Schema::hasColumn('staff_attendance', 'check_in_time')
            && Schema::hasColumn('staff_attendance', 'check_out_time');
        if (!$ready) return [false, $base];

        $query = DB::table('staff_attendance')
            ->where('staff_id', $staffId)
            ->whereBetween('check_in_time', [
                $monthStart->copy()->startOfDay()->toDateTimeString(),
                $monthEnd->copy()->endOfDay()->toDateTimeString(),
            ])
            ->select(['check_in_time', 'check_out_time']);

        if (Schema::hasColumn('staff_attendance', 'location_id')) {
            $query->where(function ($q) use ($locationId) {
                $q->where('location_id', $locationId)->orWhereNull('location_id');
            });
        }

        $records = $query->orderBy('check_in_time')->get();
        $workedSeconds = 0;
        $recordedDays = collect();
        $openSessions = 0;
        foreach ($records as $record) {
            if (empty($record->check_out_time)) {
                $openSessions++;
                continue;
            }
            try {
                $checkIn = Carbon::parse($record->check_in_time);
                $checkOut = Carbon::parse($record->check_out_time);
                if ($checkOut->lt($checkIn)) continue;
                $workedSeconds += $checkIn->diffInSeconds($checkOut);
                $recordedDays->push($checkIn->toDateString());
            } catch (\Throwable $error) {}
        }

        $base['worked_hours'] = round($workedSeconds / 3600, 1);
        $base['recorded_days'] = $recordedDays->unique()->count();
        $base['open_sessions'] = $openSessions;
        return [true, $base];
    }

    private function avatarSchemaReadyV5(): bool
    {
        return Schema::hasTable('pmd_operational_people')
            && Schema::hasColumn('pmd_operational_people', 'avatar_path');
    }

    private function avatarUrlForPersonV5($person, string $idKey = 'id'): ?string
    {
        if (!$this->avatarSchemaReadyV5()) return null;
        $path = trim((string)($person->avatar_path ?? ''));
        $personId = (int)($person->{$idKey} ?? 0);
        if ($personId < 1 || !$path || !$this->isManagedAvatarPathV5($path)) return null;
        try { if (!Storage::disk('local')->exists($path)) return null; } catch (\Throwable $error) { return null; }
        return admin_url('mywork/avatar/'.$personId).'?v='.substr(sha1($path), 0, 12);
    }

    private function isManagedAvatarPathV5(string $path): bool
    {
        $path = ltrim(str_replace('\\', '/', trim($path)), '/');
        return $path !== '' && Str::startsWith($path, 'pmd-staff-avatars/') && !Str::contains($path, '../');
    }

    private function chatReadyV5(): bool
    {
        return Schema::hasTable('pmd_staff_chat_groups')
            && Schema::hasTable('pmd_staff_chat_group_members')
            && Schema::hasTable('pmd_staff_chat_messages');
    }

    private function ensureTeamGroupV5(int $locationId): void
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
            ->pluck('staff_id')->map('intval')->unique();
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

    private function currentPersonV5()
    {
        $staffId = $this->staffIdV5();
        if ($staffId < 1 || !Schema::hasTable('pmd_operational_people')) return null;
        return DB::table('pmd_operational_people')
            ->where('staff_id', $staffId)
            ->where('is_active', 1)
            ->orderBy('location_id')
            ->orderBy('id')
            ->first();
    }

    private function staffIdV5(): int
    {
        try {
            $user = AdminAuth::getUser();
            return (int)optional($user ? $user->staff : null)->staff_id;
        } catch (\Throwable $error) {
            return 0;
        }
    }

    private function logoutSessionV5(): void
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
