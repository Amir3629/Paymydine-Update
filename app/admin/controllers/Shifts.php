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
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-shifts-page');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-shifts-v1.css');
        $this->addCss('css/pmd-shifts-dashboard-reservations-v4.css');
        $this->addJs('js/pmd-shifts-v1.js');
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
        foreach ($shifts as $shift) {
            $date = Carbon::parse($shift->shift_date);
            if (!$date->betweenIncluded($monthStart, $monthEnd)) continue;
            $start = $this->minutesOfDay($shift->starts_at ?? null);
            $end = $this->minutesOfDay($shift->ends_at ?? null);
            if ($start === null || $end === null) continue;
            if ($end <= $start) $end += 1440;
            $assigned = collect($shift->people ?? [])->count();
            if ($assigned < 1) continue;
            $scheduledHoursMonth += (($end - $start) / 60) * $assigned;
        }

        $monthShifts = $shifts->filter(fn ($shift) => Carbon::parse($shift->shift_date)->betweenIncluded($monthStart, $monthEnd))->values();
        $selectedDayShifts = $shifts->filter(fn ($shift) => Carbon::parse($shift->shift_date)->toDateString() === $selectedDay->toDateString())->values();
        $calendarDays = collect(range(0, $calendarStart->diffInDays($calendarEnd)))
            ->map(fn ($offset) => $calendarStart->copy()->addDays($offset));

        $busyThreshold = $this->settingInt('eta_busy_item_threshold', 10, 1, 500);
        $veryBusyThreshold = $this->settingInt('eta_very_busy_item_threshold', 25, 2, 1000);
        if ($veryBusyThreshold <= $busyThreshold) $veryBusyThreshold = min(1000, $busyThreshold + 1);

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

    /** Compatibility endpoint. New people should normally be created from Team. */
    public function saveperson()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $input = request()->all();
        $validator = Validator::make($input, [
            'id' => ['nullable', 'integer', 'min:1'],
            'display_name' => ['required', 'string', 'min:2', 'max:128'],
            'department' => ['nullable', 'in:kitchen,floor,bar,reception,other'],
            'job_role' => ['nullable', 'string', 'max:64'],
            'station_slug' => ['nullable', 'string', 'max:80'],
            'staff_id' => ['nullable', 'integer', 'min:1'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();
        $locationId = $this->locationId();
        $id = (int)($clean['id'] ?? 0);
        $existing = $id > 0
            ? DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->first()
            : null;

        // PMD_SHIFTS_SIMPLE_PERSON_EDITOR_V8
        // Shifts edits only operational identity. If access/station fields were
        // not posted, preserve the advanced values already owned by Team & Access.
        $linkedStaffId = request()->exists('staff_id')
            ? (!empty($clean['staff_id']) ? (int)$clean['staff_id'] : null)
            : ($existing && !empty($existing->staff_id) ? (int)$existing->staff_id : null);
        if ($linkedStaffId) {
            $validStaff = Staffs_model::whereNotSuperUser()->where('staff_status', 1)->where('staff_id', $linkedStaffId)->exists();
            if (!$validStaff) throw ValidationException::withMessages(['staff_id' => 'Choose an active PMD staff account.']);
        }

        $stationSlug = request()->exists('station_slug')
            ? (trim((string)($clean['station_slug'] ?? '')) ?: null)
            : ($existing ? ($existing->station_slug ?? null) : null);

        $values = [
            'location_id' => $locationId,
            'staff_id' => $linkedStaffId,
            'display_name' => trim((string)$clean['display_name']),
            'department' => trim((string)($clean['department'] ?? '')) ?: 'other',
            'job_role' => trim((string)($clean['job_role'] ?? '')) ?: null,
            'station_slug' => $stationSlug,
            'is_active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($values);
        } else {
            $values['created_at'] = now();
            DB::table('pmd_operational_people')->insert($values);
        }

        return $this->redirectBackToSchedule('Person saved.');
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
            'person_ids' => ['nullable', 'array'],
            'person_ids.*' => ['integer', 'min:1'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();
        $locationId = $this->locationId();
        $personIds = array_values(array_unique(array_map('intval', (array)($clean['person_ids'] ?? []))));

        DB::transaction(function () use ($clean, $locationId, $personIds) {
            $id = (int)($clean['id'] ?? 0);
            $values = [
                'location_id' => $locationId,
                'shift_date' => Carbon::parse($clean['shift_date'])->toDateString(),
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

            if ($id > 0) {
                $exists = DB::table('pmd_operational_shifts')->where('id', $id)->where('location_id', $locationId)->exists();
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
        });

        return $this->redirectBackToSchedule('Shift saved.');
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
        $raw = trim((string)request()->input('day', ''));
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
