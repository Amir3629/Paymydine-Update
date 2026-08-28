<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdKitchenEtaLifecycleService;
use App\Services\PmdKitchenOperationsSchemaService;
use App\Services\PmdKitchenWorkforceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD Shifts V2
 *
 * Team owns people. This surface owns schedule planning and today's attendance
 * confirmation. ETA consumes only aggregate Kitchen staffing from the same data.
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
        ];

        return $this->makeView('pmdshifts/index');
    }

    /** Compatibility endpoint. New people should be created from Team. */
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

        $linkedStaffId = !empty($clean['staff_id']) ? (int)$clean['staff_id'] : null;
        if ($linkedStaffId) {
            $validStaff = Staffs_model::whereNotSuperUser()->where('staff_status', 1)->where('staff_id', $linkedStaffId)->exists();
            if (!$validStaff) throw ValidationException::withMessages(['staff_id' => 'Choose an active PMD staff account.']);
        }

        $values = [
            'location_id' => $locationId,
            'staff_id' => $linkedStaffId,
            'display_name' => trim((string)$clean['display_name']),
            'department' => trim((string)($clean['department'] ?? '')) ?: 'other',
            'job_role' => trim((string)($clean['job_role'] ?? '')) ?: null,
            'station_slug' => trim((string)($clean['station_slug'] ?? '')) ?: null,
            'is_active' => 1,
            'updated_at' => now(),
        ];

        $id = (int)($clean['id'] ?? 0);
        if ($id > 0) {
            DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($values);
        } else {
            $values['created_at'] = now();
            DB::table('pmd_operational_people')->insert($values);
        }

        return redirect(admin_url('settings/team'))->with('success', 'Person saved.');
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
        return redirect(admin_url('settings/team'))->with('success', 'Person removed from the active roster.');
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

        DB::transaction(function () use ($locationId, &$shiftId) {
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

            $rows = DB::table('pmd_operational_shift_people')->where('shift_id', $shiftId)->get();
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
                $existingPersonIds = $rows->pluck('person_id')->map('intval')->filter()->unique()->all();
                $replacementPeople = DB::table('pmd_operational_people')
                    ->where('location_id', $locationId)
                    ->where('is_active', 1)
                    ->whereIn('id', $replacementPersonIds)
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
            foreach (PmdKitchenWorkforceService::KITCHEN_ROLES as $role) {
                $key = 'quick_'.strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $role), '_'));
                $count = max(0, min(100, (int)request()->input($key, 0)));
                if ($count > 0) $quick[$role] = $count;
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

    /** Kitchen ETA settings are edited from Menu, kept here as write authority. */
    public function saveeta()
    {
        $this->assertOwnerOrManager();
        $extension = (int)request()->input('extension_minutes', 10);
        if (!in_array($extension, [5, 10, 15, 20], true)) {
            $extension = max(1, min(120, (int)request()->input('custom_extension_minutes', $extension)));
        }

        setting()->set([
            'enable_customer_eta' => !empty(request()->input('show_customer_eta')) ? 1 : 0,
            'smart_eta_enabled' => 1,
            'pmd_eta_late_extension_minutes' => $extension,
            'pmd_eta_auto_extension_cap' => 2,
        ]);
        setting()->save();

        $back = trim((string)request()->input('return_to', ''));
        if ($back !== '' && str_starts_with($back, '/admin/')) return redirect($back)->with('success', 'Kitchen timing settings saved.');
        return redirect(admin_url('menu'))->with('success', 'Kitchen timing settings saved.');
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
