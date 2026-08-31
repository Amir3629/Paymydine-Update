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
use App\Services\PmdOperationalRosterReconciler;
use App\Services\PmdKitchenWorkforceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD Shifts V3
 *
 * Team owns people. Shifts owns schedule planning and attendance confirmation.
 * ETA consumes aggregate Kitchen staffing plus the simple Kitchen capacity
 * settings exposed from this workspace.
 */
class Shifts extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        // PMD_SHIFTS_DEDICATED_SHELL_V14
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-shifts-page');
        $this->addCss('css/pmd-shifts-v1.css');
        // PMD_SHIFTS_FINGERPRINTED_ASSETS_V1
        $this->addCss('css/pmd-shifts-canonical-92a6ad0051a5.css');
        $this->addCss('css/pmd-shifts-first-paint-v15.css');
        $this->addJs('js/pmd-shifts-canonical-b4d2e55c5e6d.js');
        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        $this->assertOwnerOrManager();
        Template::setTitle('Shifts');
        Template::setHeading('Shifts');

        $locationId = $this->locationId();
        $selectedDay = $this->selectedDay();
        $monthStart = $this->monthStart($selectedDay);
        $monthEnd = $monthStart->copy()->endOfMonth();
        $calendarStart = $monthStart->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $calendarEnd = $monthEnd->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();
        $weekStart = $selectedDay->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $weekEnd = $weekStart->copy()->addDays(6)->endOfDay();

        $people = collect();
        $shifts = collect();
        $ready = $this->ready();

        if ($ready) {
            // PMD_SHIFTS_CANONICAL_ROSTER_V1
            // Existing enabled Staff/User logins must be real operational people
            // before the rota reads the location roster. Failure is non-fatal so
            // one legacy account can never blank the whole Shifts workspace.
            try {
                app(PmdOperationalRosterReconciler::class)->reconcileLocation($locationId);
            } catch (\Throwable $error) {
                logger()->warning('PMD Shifts roster reconciliation failed', [
                    'location_id' => $locationId,
                    'message' => $error->getMessage(),
                ]);
            }

            // PMD_SHIFTS_COALESCE_RECONFIRM_V1
            // Enforce one continuous shift for an identical assigned team.
            // Legacy overlaps/touching shifts are collapsed before rendering;
            // changing schedule geometry invalidates the previous confirmation.
            try {
                $this->coalesceShiftRange($locationId, $calendarStart, $calendarEnd);
            } catch (\Throwable $error) {
                logger()->warning('PMD Shifts overlap normalization failed', [
                    'location_id' => $locationId,
                    'message' => $error->getMessage(),
                ]);
            }

            $people = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('is_active', 1)
                ->orderByRaw("CASE department WHEN 'kitchen' THEN 0 WHEN 'floor' THEN 1 WHEN 'bar' THEN 2 WHEN 'reception' THEN 3 ELSE 4 END")
                ->orderBy('display_name')
                ->get();

            $shifts = DB::table('pmd_operational_shifts')
                ->where('location_id', $locationId)
                ->whereBetween('shift_date', [$calendarStart->toDateString(), $calendarEnd->toDateString()])
                ->whereNotIn('status', ['cancelled', 'canceled'])
                ->orderBy('shift_date')
                ->orderByRaw('CASE WHEN starts_at IS NULL THEN 1 ELSE 0 END')
                ->orderBy('starts_at')
                ->orderBy('id')
                ->get();

            $ids = $shifts->pluck('id')->map('intval')->all();
            $assignments = $ids
                ? DB::table('pmd_operational_shift_people')->whereIn('shift_id', $ids)->orderBy('id')->get()->groupBy('shift_id')
                : collect();

            $shifts = $shifts->map(function ($shift) use ($assignments) {
                $shift->people = ($assignments->get($shift->id) ?: collect())->values();
                return $shift;
            });
        }

        $workforce = app(PmdKitchenWorkforceService::class);
        $currentShift = $ready ? $workforce->currentShift($locationId) : null;
        $currentPeople = collect();
        if ($currentShift) {
            $currentPeople = DB::table('pmd_operational_shift_people')
                ->where('shift_id', (int)$currentShift->id)
                ->orderBy('id')
                ->get();
        }

        $todayDate = now()->toDateString();
        $todayShifts = $shifts->filter(fn ($shift) => Carbon::parse($shift->shift_date)->toDateString() === $todayDate)->values();
        $todayAssignments = $todayShifts->flatMap(fn ($shift) => collect($shift->people ?? []));
        $todayUnique = $todayAssignments
            ->map(fn ($row) => $row->person_id ? 'p:'.(int)$row->person_id : 'n:'.strtolower(trim((string)$row->display_name_snapshot)))
            ->filter()->unique();

        $presentCurrent = $currentPeople->filter(function ($row) {
            return in_array(strtolower((string)$row->attendance_status), ['present', 'replacement'], true);
        })->count();
        $missingCurrent = $currentPeople->filter(fn ($row) => strtolower((string)$row->attendance_status) === 'absent')->count();
        $currentConfirmed = $currentShift && (!empty($currentShift->confirmed_at) || strtolower((string)$currentShift->status) === 'confirmed');

        $scheduledHoursMonth = 0.0;
        $hasBreakMinutes = $ready && Schema::hasColumn('pmd_operational_shifts', 'break_minutes');
        foreach ($shifts as $shift) {
            $date = Carbon::parse($shift->shift_date);
            if (!$date->betweenIncluded($monthStart, $monthEnd)) continue;
            $start = $this->minutesOfDay($shift->starts_at ?? null);
            $end = $this->minutesOfDay($shift->ends_at ?? null);
            if ($start === null || $end === null) continue;
            if ($end <= $start) $end += 1440;
            $assigned = collect($shift->people ?? [])->count();
            if ($assigned < 1) continue;
            $breakMinutes = $hasBreakMinutes ? max(0, min(240, (int)($shift->break_minutes ?? 0))) : 0;
            $workedMinutes = max(0, ($end - $start) - $breakMinutes);
            $scheduledHoursMonth += ($workedMinutes / 60) * $assigned;
        }

        $monthShifts = $shifts->filter(fn ($shift) => Carbon::parse($shift->shift_date)->betweenIncluded($monthStart, $monthEnd))->values();
        $selectedDayShifts = $shifts->filter(fn ($shift) => Carbon::parse($shift->shift_date)->toDateString() === $selectedDay->toDateString())->values();
        $calendarDays = collect(range(0, $calendarStart->diffInDays($calendarEnd)))
            ->map(fn ($offset) => $calendarStart->copy()->addDays($offset));

        $busyThreshold = $this->settingInt('eta_busy_item_threshold', 10, 1, 500);
        $veryBusyThreshold = $this->settingInt('eta_very_busy_item_threshold', 25, 2, 1000);
        if ($veryBusyThreshold <= $busyThreshold) $veryBusyThreshold = min(1000, $busyThreshold + 1);

        $accessRoleService = app(PmdDefaultStaffRoleService::class);
        $accessRoles = collect($accessRoleService->ensure())
            ->reject(fn ($role) => strtolower((string)$role->code) === PmdDefaultStaffRoleService::OWNER)
            ->values();
        $accessStaff = Staffs_model::with(['role', 'user'])
            ->whereNotSuperUser()
            ->orderBy('staff_name')
            ->get()
            ->keyBy('staff_id');

        $teamRequests = collect();
        if (Schema::hasTable('pmd_staff_requests')) {
            $teamRequests = DB::table('pmd_staff_requests as request')
                ->leftJoin('pmd_operational_people as person', 'person.id', '=', 'request.person_id')
                ->where('request.location_id', $locationId)
                ->where('request.status', 'pending')
                ->select(['request.*', 'person.display_name as person_name'])
                ->orderByDesc('request.created_at')
                ->limit(20)
                ->get();
        }

        $this->vars['pmdShifts'] = [
            'ready' => $ready,
            'location_id' => $locationId,
            'people' => $people,
            'shifts' => $shifts,
            'month_shifts' => $monthShifts,
            'selected_day_shifts' => $selectedDayShifts,
            'calendar_days' => $calendarDays,
            'month_start' => $monthStart,
            'month_end' => $monthEnd,
            'calendar_start' => $calendarStart,
            'calendar_end' => $calendarEnd,
            'selected_day' => $selectedDay,
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'departments' => ['kitchen' => 'Kitchen', 'floor' => 'Floor', 'bar' => 'Bar', 'reception' => 'Reception', 'other' => 'Other'],
            'roles' => $workforce->roleOptions(),
            'access_roles' => $accessRoles,
            'access_staff' => $accessStaff,
            'team_requests' => $teamRequests,
            'current_shift' => $currentShift,
            'current_people' => $currentPeople,
            'current_confirmed' => (bool)$currentConfirmed,
            'stats' => [
                'scheduled_today' => $todayUnique->count(),
                'present_now' => $currentConfirmed ? $presentCurrent : null,
                'missing_now' => $currentConfirmed ? $missingCurrent : null,
                'month_hours' => round($scheduledHoursMonth, 1),
                'month_shifts' => $monthShifts->count(),
                'scheduled_days' => $monthShifts->pluck('shift_date')->map(fn ($d) => Carbon::parse($d)->toDateString())->unique()->count(),
            ],
            'capacity' => [
                'busy_item_threshold' => $busyThreshold,
                'very_busy_item_threshold' => $veryBusyThreshold,
                'busy_extra_minutes' => $this->settingInt('eta_busy_extra_minutes', 5, 0, 120),
                'very_busy_extra_minutes' => $this->settingInt('eta_very_busy_extra_minutes', 10, 0, 240),
                'peak_enabled' => $this->settingBool('pmd_kitchen_peak_enabled', false),
                'peak_start' => $this->settingTime('pmd_kitchen_peak_start', '18:00'),
                'peak_end' => $this->settingTime('pmd_kitchen_peak_end', '21:00'),
                'peak_extra_minutes' => $this->settingInt('pmd_kitchen_peak_extra_minutes', 5, 0, 120),
            ],
        ];

        return $this->makeView('pmdshifts/index');
    }

    /**
     * Unified Team editor. Operational identity remains separate from PMD access,
     * but an Owner/Manager can create both in one quick form.
     */
    public function saveperson()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();

        $locationId = $this->locationId();
        $id = max(0, (int)request()->input('id', 0));
        $existing = $id > 0
            ? DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->first()
            : null;
        if ($id > 0 && !$existing) abort(404);

        $existingStaff = $existing && !empty($existing->staff_id)
            ? Staffs_model::with(['role', 'user'])->whereNotSuperUser()->find((int)$existing->staff_id)
            : null;
        // PMD_SHIFTS_MEMBER_LOGIN_REQUIRED_V17
        // Every newly saved restaurant member must have a PMD login. Existing
        // linked members keep their current password unless a new one is supplied.
        $wantsAccess = true;

        $roleService = app(PmdDefaultStaffRoleService::class);
        $managedRoles = collect($roleService->ensure())
            ->reject(fn ($role) => strtolower((string)$role->code) === PmdDefaultStaffRoleService::OWNER)
            ->keyBy('staff_role_id');

        $input = [
            'display_name' => trim((string)request()->input('display_name', '')),
            'job_role' => trim((string)request()->input('job_role', '')),
            'staff_role_id' => max(0, (int)request()->input('staff_role_id', 0)),
            'username' => trim((string)request()->input('username', '')),
            'password' => (string)request()->input('password', ''),
        ];

        $userId = $existingStaff && $existingStaff->user ? (int)$existingStaff->user->user_id : 0;
        $rules = [
            'display_name' => ['required', 'string', 'min:2', 'max:128'],
            'job_role' => ['required', 'string', 'min:2', 'max:64'],
        ];
        if ($wantsAccess) {
            // Mirror the canonical Team account guard before touching the DB.
            // This converts duplicate staff names into a normal form error
            // instead of allowing a lower-level account save to explode.
            $rules['display_name'][] = 'unique:staffs,staff_name'.($existingStaff ? ','.(int)$existingStaff->staff_id.',staff_id' : '');
            $rules['staff_role_id'] = ['required', 'integer', function ($attribute, $value, $fail) use ($managedRoles) {
                if (!$managedRoles->has((int)$value)) $fail('Choose a PMD access role.');
            }];
            $rules['username'] = [
                'required', 'alpha_dash', 'between:2,32',
                'unique:users,username'.($userId ? ','.$userId.',user_id' : ''),
            ];
            $rules['password'] = [$existingStaff ? 'nullable' : 'required', 'between:6,32'];
        }

        $validator = Validator::make($input, $rules, [
            'display_name.unique' => 'That name already has a PMD account. Use Advanced to manage the existing account.',
            'username.unique' => 'That username is already in use.',
            'password.required' => 'Add a password for the new PMD login.',
        ]);
        if ($validator->fails()) {
            return $this->redirectTeamFailure($validator->errors()->first());
        }
        $clean = $validator->validated();

        try {
            DB::transaction(function () use ($existing, $existingStaff, $wantsAccess, $clean, $locationId, $id) {
            $linkedStaffId = $existingStaff ? (int)$existingStaff->staff_id : null;

            if ($wantsAccess) {
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
                $linkedStaffId = (int)$member->staff_id;
            }

            $values = [
                'location_id' => $locationId,
                'staff_id' => $linkedStaffId,
                'display_name' => $clean['display_name'],
                // PMD_SHIFTS_ROLE_ONLY_MEMBER_V1
                'department' => $this->departmentForMemberRole((string)($clean['job_role'] ?? '')),
                'job_role' => trim((string)($clean['job_role'] ?? '')) ?: 'Sonstige',
                'station_slug' => $existing ? ($existing->station_slug ?? null) : null,
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
            // A bad account edge-case must never surface as a raw HTTP 500
            // from the Owner's simple Team form. Keep the transaction atomic,
            // report the real exception server-side, and return a clean error.
            report($error);
            return $this->redirectTeamFailure('Could not save this member. Check the name, username and password, then try again.');
        }

        return $this->redirectBackToSchedule($wantsAccess ? 'Member + login saved.' : 'Member saved.');
    }

    public function removeperson()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $id = max(0, (int)request()->input('id', 0));
        if ($id > 0) {
            DB::table('pmd_operational_people')
                ->where('id', $id)
                ->where('location_id', $this->locationId())
                ->update(['is_active' => 0, 'updated_at' => now()]);
        }
        return $this->redirectBackToSchedule('Person removed from the active roster.');
    }

    public function handlerequest()
    {
        $this->assertOwnerOrManager();
        if (!Schema::hasTable('pmd_staff_requests')) abort(503, 'Staff request schema is not ready.');

        $validator = Validator::make(request()->all(), [
            'id' => ['required', 'integer', 'min:1'],
            'decision' => ['required', 'in:approved,declined'],
            'manager_reply' => ['nullable', 'string', 'max:1000'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        $row = DB::table('pmd_staff_requests')
            ->where('id', (int)$clean['id'])
            ->where('location_id', $this->locationId())
            ->where('status', 'pending')
            ->first();
        if (!$row) abort(404);

        $staffId = 0;
        try { $staffId = (int)optional(AdminAuth::getUser()->staff)->staff_id; } catch (\Throwable $error) {}

        DB::table('pmd_staff_requests')->where('id', (int)$row->id)->update([
            'status' => $clean['decision'],
            'manager_reply' => trim((string)($clean['manager_reply'] ?? '')) ?: null,
            'handled_by_staff_id' => $staffId ?: null,
            'handled_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->redirectBackToSchedule('Team request updated.');
    }

    public function saveshift()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $input = request()->all();
        $validator = Validator::make($input, [
            'id' => ['nullable', 'integer', 'min:1'],
            'shift_date' => ['required', 'date'],
            'label' => ['required', 'string', 'max:64'],
            'starts_at' => ['nullable', 'date_format:H:i'],
            'ends_at' => ['nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'break_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'person_ids' => ['nullable', 'array'],
            'person_ids.*' => ['integer', 'min:1'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();
        $locationId = $this->locationId();
        $personIds = array_values(array_unique(array_map('intval', (array)($clean['person_ids'] ?? []))));
        sort($personIds);
        $message = 'Shift saved.';

        // PMD_SHIFTS_EXTEND_EXISTING_V1
        // One team cannot have stacked records for continuous coverage. Save the
        // requested record first, then collapse identical-team overlap/touching
        // records into the earliest continuous shift. Any schedule change resets
        // confirmation/attendance to planned so the team must be confirmed again.
        DB::transaction(function () use ($clean, $locationId, $personIds, &$message) {
            $id = (int)($clean['id'] ?? 0);
            $shiftDate = Carbon::parse($clean['shift_date'])->toDateString();
            $values = [
                'location_id' => $locationId,
                'shift_date' => $shiftDate,
                'label' => trim((string)$clean['label']) ?: 'Shift',
                'starts_at' => !empty($clean['starts_at']) ? $clean['starts_at'].':00' : null,
                'ends_at' => !empty($clean['ends_at']) ? $clean['ends_at'].':00' : null,
                'status' => 'planned',
                'quick_counts_json' => null,
                'confirmed_at' => null,
                'confirmed_by_staff_id' => null,
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('pmd_operational_shifts', 'notes')) {
                $values['notes'] = trim((string)($clean['notes'] ?? '')) ?: null;
            }
            if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
                $values['break_minutes'] = max(0, min(240, (int)($clean['break_minutes'] ?? 30)));
            }

            if ($id > 0) {
                $exists = DB::table('pmd_operational_shifts')
                    ->where('id', $id)
                    ->where('location_id', $locationId)
                    ->exists();
                if (!$exists) abort(404);
                DB::table('pmd_operational_shifts')->where('id', $id)->update($values);
                $shiftId = $id;
                DB::table('pmd_operational_shift_people')->where('shift_id', $shiftId)->delete();
            } else {
                $values['created_at'] = now();
                $shiftId = (int)DB::table('pmd_operational_shifts')->insertGetId($values);
            }

            if ($personIds) {
                $people = DB::table('pmd_operational_people')
                    ->where('location_id', $locationId)
                    ->where('is_active', 1)
                    ->whereIn('id', $personIds)
                    ->get()->keyBy('id');
                $rows = [];
                foreach ($personIds as $personId) {
                    $person = $people->get($personId);
                    if (!$person) continue;
                    $rows[] = [
                        'shift_id' => $shiftId,
                        'person_id' => (int)$person->id,
                        'display_name_snapshot' => (string)$person->display_name,
                        'department_snapshot' => (string)($person->department ?: 'other'),
                        'job_role_snapshot' => trim((string)($person->job_role ?? '')) ?: null,
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if ($rows) DB::table('pmd_operational_shift_people')->insert($rows);
            }

            $merged = $this->coalesceShiftRange(
                $locationId,
                Carbon::parse($shiftDate)->startOfDay(),
                Carbon::parse($shiftDate)->endOfDay()
            );
            if ($merged > 0) {
                $message = 'Existing shift extended. Team confirmation is required again.';
            }
        });

        return $this->redirectBackToSchedule($message);
    }

    private function coalesceShiftRange(int $locationId, Carbon $from, Carbon $to): int
    {
        if ($locationId < 1) return 0;

        $shifts = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereBetween('shift_date', [$from->toDateString(), $to->toDateString()])
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->whereNotNull('starts_at')
            ->whereNotNull('ends_at')
            ->orderBy('shift_date')
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get();

        if ($shifts->count() < 2) return 0;

        $shiftIds = $shifts->pluck('id')->map('intval')->all();
        $assignments = DB::table('pmd_operational_shift_people')
            ->whereIn('shift_id', $shiftIds)
            ->whereNotNull('person_id')
            ->orderBy('person_id')
            ->get()
            ->groupBy('shift_id');

        $buckets = [];
        foreach ($shifts as $shift) {
            $personIds = collect($assignments->get($shift->id) ?: [])
                ->pluck('person_id')
                ->map('intval')
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();
            if (!$personIds) continue;

            $window = $this->shiftWindowMinutes($shift->starts_at, $shift->ends_at);
            if (!$window) continue;

            $key = Carbon::parse($shift->shift_date)->toDateString().'|'.implode(',', $personIds);
            $buckets[$key][] = [
                'shift' => $shift,
                'start' => $window['start'],
                'end' => $window['end'],
            ];
        }

        $mergedCount = 0;
        foreach ($buckets as $items) {
            usort($items, function ($left, $right) {
                if ($left['start'] !== $right['start']) return $left['start'] <=> $right['start'];
                return (int)$left['shift']->id <=> (int)$right['shift']->id;
            });

            $cluster = [];
            $clusterStart = null;
            $clusterEnd = null;

            foreach ($items as $item) {
                if (!$cluster || $item['start'] <= $clusterEnd) {
                    $cluster[] = $item;
                    $clusterStart = $clusterStart === null ? $item['start'] : min($clusterStart, $item['start']);
                    $clusterEnd = $clusterEnd === null ? $item['end'] : max($clusterEnd, $item['end']);
                    continue;
                }

                $mergedCount += $this->collapseShiftCluster($cluster, (int)$clusterStart, (int)$clusterEnd);
                $cluster = [$item];
                $clusterStart = $item['start'];
                $clusterEnd = $item['end'];
            }

            if ($cluster) {
                $mergedCount += $this->collapseShiftCluster($cluster, (int)$clusterStart, (int)$clusterEnd);
            }
        }

        return $mergedCount;
    }

    private function collapseShiftCluster(array $cluster, int $start, int $end): int
    {
        if (count($cluster) < 2) return 0;

        $canonical = $cluster[0]['shift'];
        $canonicalId = (int)$canonical->id;
        $redundantIds = array_values(array_filter(array_map(
            fn ($item) => (int)$item['shift']->id,
            array_slice($cluster, 1)
        )));

        DB::table('pmd_operational_shifts')
            ->where('id', $canonicalId)
            ->update([
                'starts_at' => $this->shiftMinuteToDbTime($start),
                'ends_at' => $this->shiftMinuteToDbTime($end),
                'status' => 'planned',
                'quick_counts_json' => null,
                'confirmed_at' => null,
                'confirmed_by_staff_id' => null,
                'updated_at' => now(),
            ]);

        DB::table('pmd_operational_shift_people')
            ->where('shift_id', $canonicalId)
            ->update([
                'attendance_status' => 'planned',
                'is_replacement' => 0,
                'updated_at' => now(),
            ]);

        if ($redundantIds) {
            DB::table('pmd_operational_shifts')
                ->whereIn('id', $redundantIds)
                ->update([
                    'status' => 'cancelled',
                    'quick_counts_json' => null,
                    'confirmed_at' => null,
                    'confirmed_by_staff_id' => null,
                    'updated_at' => now(),
                ]);
        }

        return count($redundantIds);
    }

    private function shiftWindowMinutes($startsAt, $endsAt): ?array
    {
        $start = $this->minutesOfDay($startsAt);
        $end = $this->minutesOfDay($endsAt);
        if ($start === null || $end === null) return null;
        if ($end <= $start) $end += 1440;
        return ['start' => $start, 'end' => $end];
    }

    private function shiftMinuteToDbTime(int $minutes): string
    {
        $minutes %= 1440;
        if ($minutes < 0) $minutes += 1440;
        return sprintf('%02d:%02d:00', intdiv($minutes, 60), $minutes % 60);
    }

    public function removeshift()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $id = max(0, (int)request()->input('id', 0));
        if ($id > 0) {
            DB::table('pmd_operational_shifts')
                ->where('id', $id)
                ->where('location_id', $this->locationId())
                ->update(['status' => 'cancelled', 'updated_at' => now()]);
        }
        return $this->redirectBackToSchedule('Shift removed.');
    }

    public function copyweek()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $locationId = $this->locationId();
        $raw = trim((string)request()->input('week', ''));
        try {
            $from = ($raw !== '' ? Carbon::parse($raw) : $this->selectedDay())->startOfWeek(Carbon::MONDAY)->startOfDay();
        } catch (\Throwable $error) {
            $from = now()->startOfWeek(Carbon::MONDAY)->startOfDay();
        }
        $to = $from->copy()->addWeek();

        DB::transaction(function () use ($locationId, $from) {
            $source = DB::table('pmd_operational_shifts')
                ->where('location_id', $locationId)
                ->whereBetween('shift_date', [$from->toDateString(), $from->copy()->addDays(6)->toDateString()])
                ->whereNotIn('status', ['cancelled', 'canceled'])
                ->orderBy('id')->get();

            foreach ($source as $shift) {
                $targetDate = Carbon::parse($shift->shift_date)->addWeek()->toDateString();
                $duplicate = DB::table('pmd_operational_shifts')
                    ->where('location_id', $locationId)
                    ->whereDate('shift_date', $targetDate)
                    ->where('label', (string)$shift->label)
                    ->where('starts_at', $shift->starts_at)
                    ->exists();
                if ($duplicate) continue;

                $insert = [
                    'location_id' => $locationId,
                    'shift_date' => $targetDate,
                    'label' => (string)$shift->label,
                    'starts_at' => $shift->starts_at,
                    'ends_at' => $shift->ends_at,
                    'status' => 'planned',
                    'quick_counts_json' => null,
                    'confirmed_at' => null,
                    'confirmed_by_staff_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (Schema::hasColumn('pmd_operational_shifts', 'notes')) $insert['notes'] = $shift->notes ?? null;
                if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) $insert['break_minutes'] = max(0, min(240, (int)($shift->break_minutes ?? 0)));
                $newId = (int)DB::table('pmd_operational_shifts')->insertGetId($insert);

                $rows = DB::table('pmd_operational_shift_people')->where('shift_id', (int)$shift->id)->orderBy('id')->get();
                foreach ($rows as $row) {
                    DB::table('pmd_operational_shift_people')->insert([
                        'shift_id' => $newId,
                        'person_id' => $row->person_id,
                        'display_name_snapshot' => (string)$row->display_name_snapshot,
                        'department_snapshot' => (string)($row->department_snapshot ?: 'other'),
                        'job_role_snapshot' => $row->job_role_snapshot,
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });

        return redirect(admin_url('shifts').'?month='.$to->copy()->startOfMonth()->toDateString().'&day='.$to->toDateString().'#pmd-shift-day')->with('success', 'Week copied.');
    }

    public function confirm()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $locationId = $this->locationId();
        $shiftId = max(0, (int)request()->input('shift_id', 0));
        $scope = strtolower(trim((string)request()->input('confirmation_scope', 'all')));
        if (!in_array($scope, ['all', 'kitchen'], true)) $scope = 'all';

        // The compact Dashboard card is Kitchen-only and is never allowed to
        // create an ad-hoc fallback Shift. It confirms the existing plan only.
        if ($scope === 'kitchen' && $shiftId < 1) abort(422, 'Choose a planned Kitchen shift first.');

        DB::transaction(function () use ($locationId, &$shiftId, $scope) {
            if ($shiftId < 1) {
                $insert = [
                    'location_id' => $locationId,
                    'shift_date' => now()->toDateString(),
                    'label' => 'Today',
                    'starts_at' => null,
                    'ends_at' => null,
                    'status' => 'planned',
                    'quick_counts_json' => null,
                    'confirmed_at' => null,
                    'confirmed_by_staff_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (Schema::hasColumn('pmd_operational_shifts', 'notes')) $insert['notes'] = null;
                $shiftId = (int)DB::table('pmd_operational_shifts')->insertGetId($insert);
            }

            $shift = DB::table('pmd_operational_shifts')->where('id', $shiftId)->where('location_id', $locationId)->lockForUpdate()->first();
            if (!$shift) abort(404);

            $allRows = DB::table('pmd_operational_shift_people')->where('shift_id', $shiftId)->get();
            $rows = $scope === 'kitchen'
                ? $allRows->filter(fn ($row) => strtolower((string)$row->department_snapshot) === 'kitchen')->values()
                : $allRows;
            $everything = (bool)request()->input('everything_as_planned', false);
            $presentIds = array_values(array_unique(array_map('intval', (array)request()->input('present_ids', []))));

            foreach ($rows as $row) {
                $present = $everything || in_array((int)$row->id, $presentIds, true);
                DB::table('pmd_operational_shift_people')->where('id', (int)$row->id)->update([
                    'attendance_status' => $present ? ((bool)$row->is_replacement ? 'replacement' : 'present') : 'absent',
                    'updated_at' => now(),
                ]);
            }

            $replacementPersonIds = array_values(array_unique(array_filter(array_map('intval', (array)request()->input('replacement_person_ids', [])))));
            if ($replacementPersonIds) {
                $existingPersonIds = $allRows->pluck('person_id')->map('intval')->filter()->unique()->all();
                $replacementPeople = DB::table('pmd_operational_people')
                    ->where('location_id', $locationId)
                    ->where('is_active', 1)
                    ->whereIn('id', $replacementPersonIds)
                    ->when($scope === 'kitchen', fn ($query) => $query->where('department', 'kitchen'))
                    ->get();
                foreach ($replacementPeople as $person) {
                    if (in_array((int)$person->id, $existingPersonIds, true)) continue;
                    DB::table('pmd_operational_shift_people')->insert([
                        'shift_id' => $shiftId,
                        'person_id' => (int)$person->id,
                        'display_name_snapshot' => (string)$person->display_name,
                        'department_snapshot' => (string)($person->department ?: 'other'),
                        'job_role_snapshot' => trim((string)($person->job_role ?? '')) ?: null,
                        'attendance_status' => 'replacement',
                        'is_replacement' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $quick = [];
            if ($scope === 'all') {
                foreach (PmdKitchenWorkforceService::KITCHEN_ROLES as $role) {
                    $key = 'quick_'.strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $role), '_'));
                    $count = max(0, min(100, (int)request()->input($key, 0)));
                    if ($count > 0) $quick[$role] = $count;
                }
            }

            DB::table('pmd_operational_shifts')->where('id', $shiftId)->update([
                'status' => 'confirmed',
                'quick_counts_json' => $quick ? json_encode($quick, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
                'confirmed_at' => now(),
                'confirmed_by_staff_id' => $this->staffId(),
                'updated_at' => now(),
            ]);
        });

        $back = trim((string)request()->input('return_to', ''));
        if ($back !== '' && str_starts_with($back, '/admin/')) return redirect($back)->with('success', 'Today’s team confirmed.');
        return redirect(admin_url('shifts'))->with('success', 'Today’s team confirmed.');
    }

    /** Simple Owner-facing Kitchen capacity and ETA write authority. */
    public function saveeta()
    {
        $this->assertOwnerOrManager();

        $values = [];

        // Compatibility with the existing ETA visibility/extension form. Only
        // write these values if that form actually supplied the relevant input.
        if (request()->has('show_customer_eta_present')) {
            $values['enable_customer_eta'] = !empty(request()->input('show_customer_eta')) ? 1 : 0;
        }

        if (request()->has('extension_minutes') || request()->has('custom_extension_minutes')) {
            $extension = (int)request()->input('extension_minutes', 10);
            if (!in_array($extension, [5, 10, 15, 20], true)) {
                $extension = max(1, min(120, (int)request()->input('custom_extension_minutes', $extension)));
            }
            $values['pmd_eta_late_extension_minutes'] = $extension;
            $values['pmd_eta_auto_extension_cap'] = 2;
            $values['smart_eta_enabled'] = 1;
        }

        if (request()->has('busy_item_threshold') || request()->has('very_busy_item_threshold')) {
            $busy = max(1, min(500, (int)request()->input('busy_item_threshold', 10)));
            $veryBusy = max($busy + 1, min(1000, (int)request()->input('very_busy_item_threshold', max(25, $busy + 1))));

            $values['eta_busy_item_threshold'] = $busy;
            $values['eta_very_busy_item_threshold'] = $veryBusy;
            $values['eta_busy_extra_minutes'] = max(0, min(120, (int)request()->input('busy_extra_minutes', 5)));
            $values['eta_very_busy_extra_minutes'] = max(0, min(240, (int)request()->input('very_busy_extra_minutes', 10)));
            $values['smart_eta_enabled'] = 1;
        }

        if (request()->has('peak_enabled_present')) {
            $values['pmd_kitchen_peak_enabled'] = !empty(request()->input('peak_enabled')) ? 1 : 0;
            $values['pmd_kitchen_peak_start'] = $this->cleanClock((string)request()->input('peak_start', '18:00'), '18:00');
            $values['pmd_kitchen_peak_end'] = $this->cleanClock((string)request()->input('peak_end', '21:00'), '21:00');
            $values['pmd_kitchen_peak_extra_minutes'] = max(0, min(120, (int)request()->input('peak_extra_minutes', 5)));
            $values['smart_eta_enabled'] = 1;
        }

        if ($values) {
            setting()->set($values);
            setting()->save();
        }

        $back = trim((string)request()->input('return_to', ''));
        if ($back !== '' && str_starts_with($back, '/admin/')) return redirect($back)->with('success', 'Kitchen timing settings saved.');
        return redirect(admin_url('shifts'))->with('success', 'Kitchen timing settings saved.');
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

    private function ready(): bool
    {
        return app(PmdKitchenOperationsSchemaService::class)->ready();
    }

    private function requireReady(): void
    {
        if (!$this->ready()) abort(503, 'Kitchen Operations tenant schema has not been applied yet.');
    }

    private function locationId(): int
    {
        try {
            return max(1, (int)AdminLocation::getId());
        } catch (\Throwable $error) {
            return 1;
        }
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

    private function selectedDay(): Carbon
    {
        $day = trim((string)request()->input('day', ''));
        $month = trim((string)request()->input('month', ''));
        $raw = $day !== '' ? $day : $month;
        try {
            return ($raw !== '' ? Carbon::parse($raw) : now())->startOfDay();
        } catch (\Throwable $error) {
            return now()->startOfDay();
        }
    }

    private function monthStart(Carbon $selectedDay): Carbon
    {
        $raw = trim((string)request()->input('month', ''));
        try {
            return ($raw !== '' ? Carbon::parse($raw) : $selectedDay->copy())->startOfMonth()->startOfDay();
        } catch (\Throwable $error) {
            return $selectedDay->copy()->startOfMonth()->startOfDay();
        }
    }

    private function minutesOfDay($value): ?int
    {
        $value = trim((string)$value);
        if ($value === '') return null;
        $parts = explode(':', $value);
        if (count($parts) < 2) return null;
        return max(0, min(1439, ((int)$parts[0] * 60) + (int)$parts[1]));
    }

    private function settingValue(string $key, $default)
    {
        try {
            if (!Schema::hasTable('settings')) return $default;
            $query = DB::table('settings')->where('item', $key);
            if (Schema::hasColumn('settings', 'setting_id')) $query->orderByDesc('setting_id');
            $value = $query->value('value');
            return ($value === null || $value === '') ? $default : $value;
        } catch (\Throwable $error) {
            return $default;
        }
    }

    private function settingInt(string $key, int $default, int $min, int $max): int
    {
        return max($min, min($max, (int)$this->settingValue($key, $default)));
    }

    private function settingBool(string $key, bool $default): bool
    {
        $value = $this->settingValue($key, $default ? 1 : 0);
        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'on'], true);
    }

    private function settingTime(string $key, string $default): string
    {
        return $this->cleanClock((string)$this->settingValue($key, $default), $default);
    }

    private function cleanClock(string $value, string $default): string
    {
        $value = trim($value);
        return preg_match('/^(?:[01]\\d|2[0-3]):[0-5]\\d$/', $value) ? $value : $default;
    }


    private function departmentForMemberRole(string $jobRole): string
    {
        $role = strtolower(trim((string)preg_replace('/[_-]+/', ' ', $jobRole)));
        $role = trim((string)preg_replace('/\s+/', ' ', $role));
        if (str_contains($role, 'kitchen') || str_contains($role, 'chef') || str_contains($role, 'cook') || str_contains($role, 'kds') || str_contains($role, 'dish') || str_contains($role, 'prep') || str_contains($role, 'boh')) return 'kitchen';
        if (str_contains($role, 'bartender') || str_contains($role, 'barman') || str_contains($role, 'barmaid') || $role === 'bar') return 'bar';
        if (str_contains($role, 'reservation') || str_contains($role, 'reception') || str_contains($role, 'host') || str_contains($role, 'front desk')) return 'reception';
        if (str_contains($role, 'waiter') || str_contains($role, 'server') || str_contains($role, 'service') || str_contains($role, 'runner') || str_contains($role, 'floor') || str_contains($role, 'cashier') || str_contains($role, 'till') || str_contains($role, 'checkout') || $role === 'pos') return 'floor';
        return 'other';
    }

    private function technicalStaffEmail(string $username): string
    {
        $local = strtolower(trim(preg_replace('/[^a-z0-9._-]+/i', '-', $username), '-'));
        if ($local === '') $local = 'staff';
        return 'pmd-'.$local.'@staff.local';
    }

    private function redirectTeamFailure(string $message)
    {
        $back = trim((string)request()->input('return_to', ''));
        $target = ($back !== '' && str_starts_with($back, '/admin/')) ? $back : admin_url('shifts');
        return redirect($target)->with('error', $message)->withInput();
    }

    private function redirectBackToSchedule(string $message)
    {
        $back = trim((string)request()->input('return_to', ''));
        if ($back !== '' && str_starts_with($back, '/admin/')) return redirect($back)->with('success', $message);

        $day = trim((string)request()->input('shift_date', '')) ?: now()->toDateString();
        try { $month = Carbon::parse($day)->startOfMonth()->toDateString(); }
        catch (\Throwable $error) { $month = now()->startOfMonth()->toDateString(); }
        return redirect(admin_url('shifts').'?month='.$month.'&day='.$day.'#pmd-shift-day')->with('success', $message);
    }
}
