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
 * PMD Kitchen Operations Foundation R1.
 * Lightweight People + Shifts only; intentionally not payroll/HR software.
 */
class Shifts extends AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-kitchen-shifts-page');
        $this->addCss('css/pmd-shifts-v1.css');
        $this->addJs('js/pmd-shifts-v1.js');
        AdminMenu::setContext('dashboard', 'dashboard');
    }

    public function index()
    {
        $this->assertOwnerOrManager();
        $this->assertFoundationReady();

        Template::setTitle('People & shifts');
        Template::setHeading('People & shifts');

        $locationId = $this->locationId();
        $weekStart = $this->weekStart((string)request()->query('week', ''));
        $weekEnd = $weekStart->copy()->addDays(6);

        $people = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->orderByRaw("CASE WHEN department = 'kitchen' THEN 0 ELSE 1 END")
            ->orderBy('display_name')
            ->get();

        $shifts = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereBetween('shift_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->orderBy('shift_date')->orderBy('starts_at')->orderBy('id')->get();

        $shiftPeople = collect();
        if ($shifts->isNotEmpty()) {
            $shiftPeople = DB::table('pmd_operational_shift_people')
                ->whereIn('shift_id', $shifts->pluck('id')->all())
                ->orderBy('id')->get()->groupBy('shift_id');
        }

        $staff = Staffs_model::with(['role'])
            ->whereNotSuperUser()
            ->where('staff_status', 1)
            ->orderBy('staff_name')->get();

        $workforce = app(PmdKitchenWorkforceService::class);
        $this->vars['pmdKitchenOps'] = [
            'location_id' => $locationId,
            'people' => $people,
            'staff' => $staff,
            'shifts' => $shifts,
            'shift_people' => $shiftPeople,
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'today' => $workforce->todayCard($locationId),
            'roles' => $workforce->roleOptions(),
            'departments' => ['kitchen' => 'Kitchen', 'floor' => 'Floor', 'bar' => 'Bar', 'reception' => 'Reception', 'other' => 'Other'],
            'show_eta' => $this->boolSetting('enable_customer_eta', true),
            'extension_minutes' => app(PmdKitchenEtaLifecycleService::class)->extensionMinutes(),
        ];

        return $this->makeView('pmdshifts/index');
    }

    public function onSavePerson()
    {
        $this->assertOwnerOrManager();
        $this->assertFoundationReady();
        $locationId = $this->locationId();
        $id = max(0, (int)post('person_id', 0));
        $input = [
            'display_name' => trim((string)post('display_name', '')),
            'department' => strtolower(trim((string)post('department', 'kitchen'))),
            'job_role' => trim((string)post('job_role', '')),
            'station_slug' => trim((string)post('station_slug', '')),
            'staff_id' => max(0, (int)post('staff_id', 0)),
        ];
        $validator = Validator::make($input, [
            'display_name' => 'required|string|min:2|max:128',
            'department' => 'required|in:kitchen,floor,bar,reception,other',
            'job_role' => 'nullable|string|max:64',
            'station_slug' => 'nullable|string|max:80',
            'staff_id' => 'nullable|integer',
        ]);
        if ($validator->fails()) throw new ValidationException($validator);

        $row = [
            'location_id' => $locationId,
            'staff_id' => $input['staff_id'] ?: null,
            'display_name' => $input['display_name'],
            'department' => $input['department'],
            'job_role' => $input['job_role'] ?: null,
            'station_slug' => $input['station_slug'] ?: null,
            'is_active' => 1,
            'updated_at' => now(),
        ];
        if ($id > 0) {
            DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($row);
        } else {
            $row['created_at'] = now();
            DB::table('pmd_operational_people')->insert($row);
        }
        flash()->success($id ? 'Person updated.' : 'Person added.');
        return $this->reload();
    }

    public function onRemovePerson()
    {
        $this->assertOwnerOrManager();
        $id = max(0, (int)post('person_id', 0));
        if ($id > 0) DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $this->locationId())->update(['is_active' => 0, 'updated_at' => now()]);
        flash()->success('Person removed from the active roster.');
        return $this->reload();
    }

    public function onSaveShift()
    {
        $this->assertOwnerOrManager();
        $this->assertFoundationReady();
        $locationId = $this->locationId();
        $id = max(0, (int)post('shift_id', 0));
        $date = trim((string)post('shift_date', ''));
        $label = trim((string)post('label', 'Shift')) ?: 'Shift';
        $startsAt = trim((string)post('starts_at', '')) ?: null;
        $endsAt = trim((string)post('ends_at', '')) ?: null;
        $personIds = array_values(array_unique(array_filter(array_map('intval', (array)post('person_ids', [])))));
        $validator = Validator::make(compact('date', 'label', 'startsAt', 'endsAt'), [
            'date' => 'required|date', 'label' => 'required|string|max:64',
            'startsAt' => 'nullable|date_format:H:i', 'endsAt' => 'nullable|date_format:H:i',
        ]);
        if ($validator->fails()) throw new ValidationException($validator);

        DB::transaction(function () use ($id, $locationId, $date, $label, $startsAt, $endsAt, $personIds) {
            $data = [
                'location_id' => $locationId, 'shift_date' => $date, 'label' => $label,
                'starts_at' => $startsAt, 'ends_at' => $endsAt, 'status' => 'planned',
                'confirmed_at' => null, 'confirmed_by_staff_id' => null, 'quick_counts_json' => null,
                'updated_at' => now(),
            ];
            if ($id > 0) {
                DB::table('pmd_operational_shifts')->where('id', $id)->where('location_id', $locationId)->update($data);
                $shiftId = $id;
                DB::table('pmd_operational_shift_people')->where('shift_id', $shiftId)->delete();
            } else {
                $data['created_at'] = now();
                $shiftId = (int)DB::table('pmd_operational_shifts')->insertGetId($data);
            }
            if (!$personIds) return;
            $people = DB::table('pmd_operational_people')->where('location_id', $locationId)->whereIn('id', $personIds)->where('is_active', 1)->get();
            foreach ($people as $person) {
                DB::table('pmd_operational_shift_people')->insert([
                    'shift_id' => $shiftId, 'person_id' => (int)$person->id,
                    'display_name_snapshot' => (string)$person->display_name,
                    'department_snapshot' => (string)$person->department,
                    'job_role_snapshot' => $person->job_role,
                    'attendance_status' => 'planned', 'is_replacement' => 0,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        });
        flash()->success('Shift saved.');
        return $this->reload();
    }

    public function onRemoveShift()
    {
        $this->assertOwnerOrManager();
        $id = max(0, (int)post('shift_id', 0));
        if ($id > 0) DB::table('pmd_operational_shifts')->where('id', $id)->where('location_id', $this->locationId())->update(['status' => 'cancelled', 'updated_at' => now()]);
        flash()->success('Shift removed.');
        return $this->reload();
    }

    public function onCopyWeek()
    {
        $this->assertOwnerOrManager();
        $locationId = $this->locationId();
        $from = $this->weekStart((string)post('week_start', ''));
        $to = $from->copy()->addDays(7);
        $rows = DB::table('pmd_operational_shifts')->where('location_id', $locationId)
            ->whereBetween('shift_date', [$from->toDateString(), $from->copy()->addDays(6)->toDateString()])
            ->whereNotIn('status', ['cancelled', 'canceled'])->orderBy('shift_date')->get();
        DB::transaction(function () use ($rows, $locationId, $from, $to) {
            foreach ($rows as $shift) {
                $offset = Carbon::parse($shift->shift_date)->diffInDays($from);
                $newDate = $to->copy()->addDays($offset)->toDateString();
                $exists = DB::table('pmd_operational_shifts')->where('location_id', $locationId)->whereDate('shift_date', $newDate)->where('label', $shift->label)->whereNotIn('status', ['cancelled', 'canceled'])->exists();
                if ($exists) continue;
                $newId = (int)DB::table('pmd_operational_shifts')->insertGetId([
                    'location_id' => $locationId, 'shift_date' => $newDate, 'label' => $shift->label,
                    'starts_at' => $shift->starts_at, 'ends_at' => $shift->ends_at, 'status' => 'planned',
                    'quick_counts_json' => null, 'confirmed_at' => null, 'confirmed_by_staff_id' => null,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $assigned = DB::table('pmd_operational_shift_people')->where('shift_id', $shift->id)->get();
                foreach ($assigned as $person) DB::table('pmd_operational_shift_people')->insert([
                    'shift_id' => $newId, 'person_id' => $person->person_id,
                    'display_name_snapshot' => $person->display_name_snapshot,
                    'department_snapshot' => $person->department_snapshot,
                    'job_role_snapshot' => $person->job_role_snapshot,
                    'attendance_status' => 'planned', 'is_replacement' => 0,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        });
        flash()->success('Week copied forward.');
        return ['redirect' => admin_url('shifts?week='.$to->toDateString())];
    }

    public function onConfirmTeam()
    {
        $this->assertOwnerOrManager();
        $locationId = $this->locationId();
        $workforce = app(PmdKitchenWorkforceService::class);
        $shift = $workforce->currentShift($locationId);
        $allPresent = !empty(post('all_present', 0));
        $presentIds = array_values(array_unique(array_filter(array_map('intval', (array)post('present_assignment_ids', [])))));
        $staffId = $this->currentStaffId();

        if ($shift) {
            DB::transaction(function () use ($shift, $allPresent, $presentIds, $staffId) {
                $rows = DB::table('pmd_operational_shift_people')->where('shift_id', (int)$shift->id)->get();
                foreach ($rows as $row) {
                    $present = $allPresent || in_array((int)$row->id, $presentIds, true);
                    DB::table('pmd_operational_shift_people')->where('id', (int)$row->id)->update([
                        'attendance_status' => $present ? ($row->is_replacement ? 'replacement' : 'present') : 'absent',
                        'updated_at' => now(),
                    ]);
                }
                DB::table('pmd_operational_shifts')->where('id', (int)$shift->id)->update([
                    'status' => 'confirmed', 'confirmed_at' => now(), 'confirmed_by_staff_id' => $staffId ?: null, 'updated_at' => now(),
                ]);
            });
        } else {
            $counts = [];
            foreach (PmdKitchenWorkforceService::KITCHEN_ROLES as $role) {
                $count = max(0, min(50, (int)post('quick_'.md5($role), 0)));
                if ($count > 0) $counts[$role] = $count;
            }
            DB::table('pmd_operational_shifts')->insert([
                'location_id' => $locationId, 'shift_date' => now()->toDateString(), 'label' => 'Today',
                'starts_at' => null, 'ends_at' => null, 'status' => 'confirmed',
                'quick_counts_json' => json_encode($counts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'confirmed_at' => now(), 'confirmed_by_staff_id' => $staffId ?: null,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        flash()->success('Today’s kitchen team confirmed.');
        return $this->reload();
    }

    public function onSaveEta()
    {
        $this->assertOwnerOrManager();
        $show = !empty(post('show_customer_eta', 0)) ? '1' : '0';
        $preset = max(0, (int)post('extension_preset', 10));
        $custom = max(1, min(120, (int)post('extension_custom', 10)));
        $extension = in_array($preset, [5, 10, 15, 20], true) ? $preset : $custom;
        $this->saveSetting('enable_customer_eta', $show);
        $this->saveSetting('smart_eta_enabled', '1');
        $this->saveSetting('pmd_eta_late_extension_minutes', (string)$extension);
        $this->saveSetting('pmd_eta_auto_extension_cap', '2');
        flash()->success('Preparation & ETA settings saved.');
        return $this->reload();
    }

    protected function assertFoundationReady(): void
    {
        if (!app(PmdKitchenWorkforceService::class)->ready()) abort(503, 'Run the PMD kitchen operations migration first.');
    }

    protected function assertOwnerOrManager(): void
    {
        $user = AdminAuth::getUser();
        $code = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($user);
        if (!in_array($code, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) abort(403);
    }

    protected function locationId(): int
    {
        try { return max(1, (int)AdminLocation::getId()); } catch (\Throwable $error) { return 1; }
    }

    protected function currentStaffId(): int
    {
        try { return max(0, (int)(optional(AdminAuth::getUser()->staff)->staff_id ?? 0)); } catch (\Throwable $error) { return 0; }
    }

    protected function weekStart(string $value): Carbon
    {
        try { $date = $value !== '' ? Carbon::parse($value) : now(); } catch (\Throwable $error) { $date = now(); }
        return $date->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
    }

    protected function saveSetting(string $key, string $value): void
    {
        if (!Schema::hasTable('settings')) return;
        $q = DB::table('settings')->where('item', $key);
        if (Schema::hasColumn('settings', 'setting_id')) {
            $id = (int)((clone $q)->orderByDesc('setting_id')->value('setting_id') ?: 0);
            if ($id > 0) { DB::table('settings')->where('setting_id', $id)->update(['value' => $value]); return; }
        }
        if ($q->exists()) $q->update(['value' => $value]);
        else DB::table('settings')->insert(['item' => $key, 'value' => $value]);
    }

    protected function boolSetting(string $key, bool $default): bool
    {
        try {
            $value = DB::table('settings')->where('item', $key)->orderByDesc(Schema::hasColumn('settings', 'setting_id') ? 'setting_id' : 'item')->value('value');
            if ($value === null || $value === '') return $default;
            return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
        } catch (\Throwable $error) { return $default; }
    }

    protected function reload(): array
    {
        return ['redirect' => admin_url('shifts')];
    }
}
