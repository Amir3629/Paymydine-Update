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
use App\Services\PmdKitchenWorkforceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD People & Shifts.
 * Lightweight restaurant operations only; never payroll or access/RBAC.
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
        Template::setTitle('People & shifts');
        Template::setHeading('People & shifts');

        $locationId = $this->locationId();
        $weekStart = $this->weekStart();
        $weekEnd = $weekStart->copy()->addDays(6);

        $people = collect();
        $shifts = collect();
        if ($this->ready()) {
            $people = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('is_active', 1)
                ->orderByRaw("CASE department WHEN 'kitchen' THEN 0 ELSE 1 END")
                ->orderBy('display_name')
                ->get();

            $shifts = DB::table('pmd_operational_shifts')
                ->where('location_id', $locationId)
                ->whereBetween('shift_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                ->whereNotIn('status', ['cancelled', 'canceled'])
                ->orderBy('shift_date')
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
        $eta = app(PmdKitchenEtaLifecycleService::class);
        $staffOptions = collect();
        try {
            $staffOptions = Staffs_model::with('role')
                ->whereNotSuperUser()
                ->where('staff_status', 1)
                ->orderBy('staff_name')
                ->get();
        } catch (\Throwable $error) {
            $staffOptions = collect();
        }

        $this->vars['pmdShifts'] = [
            'ready' => $this->ready(),
            'location_id' => $locationId,
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'people' => $people,
            'shifts' => $shifts,
            'roles' => $workforce->roleOptions(),
            'departments' => ['kitchen' => 'Kitchen', 'floor' => 'Floor', 'bar' => 'Bar', 'reception' => 'Reception', 'other' => 'Other'],
            'staff_options' => $staffOptions,
            'today' => $workforce->todayCard($locationId),
            'eta' => [
                'show' => $this->boolSetting('enable_customer_eta', true),
                'extension_minutes' => $eta->extensionMinutes(),
                'extension_cap' => $eta->extensionCap(),
            ],
        ];

        return $this->makeView('pmdshifts/index');
    }

    public function saveperson()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $input = request()->all();
        $validator = Validator::make($input, [
            'id' => ['nullable', 'integer', 'min:1'],
            'display_name' => ['required', 'string', 'min:2', 'max:128'],
            'department' => ['required', 'in:kitchen,floor,bar,reception,other'],
            'job_role' => ['nullable', 'string', 'max:64'],
            'station_slug' => ['nullable', 'string', 'max:64'],
            'staff_id' => ['nullable', 'integer', 'min:1'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();
        $locationId = $this->locationId();

        $linkedStaffId = !empty($clean['staff_id']) ? (int)$clean['staff_id'] : null;
        if ($linkedStaffId) {
            $validStaff = Staffs_model::whereNotSuperUser()->where('staff_status', 1)->where('staff_id', $linkedStaffId)->exists();
            if (!$validStaff) throw ValidationException::withMessages(['staff_id' => 'Choose an active PMD staff account.']);

            $duplicate = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('staff_id', $linkedStaffId)
                ->where('is_active', 1);
            $editingId = (int)($clean['id'] ?? 0);
            if ($editingId > 0) $duplicate->where('id', '!=', $editingId);
            if ($duplicate->exists()) throw ValidationException::withMessages(['staff_id' => 'That PMD account is already linked to another active roster person.']);
        }

        $values = [
            'location_id' => $locationId,
            'staff_id' => $linkedStaffId,
            'display_name' => trim((string)$clean['display_name']),
            'department' => (string)$clean['department'],
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

        return redirect(admin_url('shifts'))->with('success', 'Person saved.');
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
        return redirect(admin_url('shifts'))->with('success', 'Person removed from the active roster.');
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
                'label' => trim((string)$clean['label']) ?: 'Full day',
                'starts_at' => !empty($clean['starts_at']) ? $clean['starts_at'].':00' : null,
                'ends_at' => !empty($clean['ends_at']) ? $clean['ends_at'].':00' : null,
                'status' => 'planned',
                'quick_counts_json' => null,
                'confirmed_at' => null,
                'confirmed_by_staff_id' => null,
                'updated_at' => now(),
            ];

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
                        'department_snapshot' => (string)($person->department ?: 'kitchen'),
                        'job_role_snapshot' => (string)($person->job_role ?: 'Kitchen'),
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if ($rows) DB::table('pmd_operational_shift_people')->insert($rows);
            }
        });

        return redirect(admin_url('shifts').'?week='.$this->weekStart()->toDateString())->with('success', 'Shift saved.');
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
        return redirect(admin_url('shifts'))->with('success', 'Shift removed.');
    }

    public function copyweek()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $locationId = $this->locationId();
        $from = $this->weekStart();
        $to = $from->copy()->addWeek();

        DB::transaction(function () use ($locationId, $from, $to) {
            $source = DB::table('pmd_operational_shifts')
                ->where('location_id', $locationId)
                ->whereBetween('shift_date', [$from->toDateString(), $from->copy()->addDays(6)->toDateString()])
                ->whereNotIn('status', ['cancelled', 'canceled'])
                ->orderBy('id')->get();

            foreach ($source as $shift) {
                $sourceDate = Carbon::parse($shift->shift_date);
                $targetDate = $sourceDate->copy()->addWeek()->toDateString();
                $duplicate = DB::table('pmd_operational_shifts')
                    ->where('location_id', $locationId)
                    ->whereDate('shift_date', $targetDate)
                    ->where('label', (string)$shift->label)
                    ->where('starts_at', $shift->starts_at)
                    ->exists();
                if ($duplicate) continue;

                $newId = (int)DB::table('pmd_operational_shifts')->insertGetId([
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
                ]);

                $rows = DB::table('pmd_operational_shift_people')->where('shift_id', (int)$shift->id)->orderBy('id')->get();
                foreach ($rows as $row) {
                    DB::table('pmd_operational_shift_people')->insert([
                        'shift_id' => $newId,
                        'person_id' => $row->person_id,
                        'display_name_snapshot' => (string)$row->display_name_snapshot,
                        'department_snapshot' => (string)($row->department_snapshot ?: 'kitchen'),
                        'job_role_snapshot' => $row->job_role_snapshot,
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });

        return redirect(admin_url('shifts').'?week='.$to->toDateString())->with('success', 'Week copied.');
    }

    public function confirm()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();
        $locationId = $this->locationId();
        $shiftId = max(0, (int)request()->input('shift_id', 0));

        DB::transaction(function () use ($locationId, &$shiftId) {
            if ($shiftId < 1) {
                $shiftId = (int)DB::table('pmd_operational_shifts')->insertGetId([
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
                ]);
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
                    ->where('department', 'kitchen')
                    ->where('is_active', 1)
                    ->whereIn('id', $replacementPersonIds)
                    ->get();
                foreach ($replacementPeople as $person) {
                    if (in_array((int)$person->id, $existingPersonIds, true)) continue;
                    DB::table('pmd_operational_shift_people')->insert([
                        'shift_id' => $shiftId,
                        'person_id' => (int)$person->id,
                        'display_name_snapshot' => (string)$person->display_name,
                        'department_snapshot' => 'kitchen',
                        'job_role_snapshot' => (string)($person->job_role ?: 'Kitchen'),
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

        return redirect(admin_url('shifts'))->with('success', 'Kitchen ETA settings saved.');
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
        return app(PmdKitchenWorkforceService::class)->ready();
    }

    private function requireReady(): void
    {
        if (!$this->ready()) abort(503, 'Kitchen Operations migration has not been applied yet.');
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

    private function weekStart(): Carbon
    {
        $raw = trim((string)request()->input('week', ''));
        try {
            return ($raw !== '' ? Carbon::parse($raw) : now())->startOfWeek(Carbon::MONDAY)->startOfDay();
        } catch (\Throwable $error) {
            return now()->startOfWeek(Carbon::MONDAY)->startOfDay();
        }
    }

    private function boolSetting(string $key, bool $fallback): bool
    {
        try {
            if (!Schema::hasTable('settings')) return $fallback;
            $query = DB::table('settings')->where('item', $key);
            if (Schema::hasColumn('settings', 'setting_id')) $query->orderByDesc('setting_id');
            $value = $query->value('value');
            if ($value === null || $value === '') return $fallback;
            return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
        } catch (\Throwable $error) {
            return $fallback;
        }
    }
}
