<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/** PMD_MY_WORK_V1 */
class Mywork extends AdminController
{
    protected $requiredPermissions = null;

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-my-work-page');
        $this->addCss('css/pmd-my-work-v1.css');
        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        Template::setTitle('My Work');
        Template::setHeading('My Work');

        $locationId = $this->locationId();
        $staffId = $this->staffId();
        $person = null;
        if ($staffId > 0 && Schema::hasTable('pmd_operational_people')) {
            $person = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
                ->where('is_active', 1)
                ->first();
        }

        $shifts = collect();
        if ($person && Schema::hasTable('pmd_operational_shift_people') && Schema::hasTable('pmd_operational_shifts')) {
            $from = now()->subMonth()->startOfDay()->toDateString();
            $to = now()->addMonths(2)->endOfDay()->toDateString();
            $shifts = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('shift.location_id', $locationId)
                ->where('assignment.person_id', (int)$person->id)
                ->whereBetween('shift.shift_date', [$from, $to])
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->select(['shift.id', 'shift.shift_date', 'shift.label', 'shift.starts_at', 'shift.ends_at', 'shift.status', 'assignment.attendance_status'])
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->get();
        }

        $requests = collect();
        if ($staffId > 0 && Schema::hasTable('pmd_staff_requests')) {
            $requests = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();
        }

        $this->vars['pmdMyWork'] = [
            'staff_id' => $staffId,
            'person' => $person,
            'shifts' => $shifts,
            'requests' => $requests,
            'requests_ready' => Schema::hasTable('pmd_staff_requests'),
        ];

        return $this->makeView('pmdmywork/index');
    }

    public function saverequest()
    {
        if (!Schema::hasTable('pmd_staff_requests')) abort(503, 'Staff request schema is not ready.');
        $staffId = $this->staffId();
        if ($staffId < 1) abort(403);
        $locationId = $this->locationId();
        $person = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('staff_id', $staffId)
            ->where('is_active', 1)
            ->first();
        if (!$person) abort(403, 'Your PMD account is not linked to a restaurant team profile yet.');

        $validator = Validator::make(request()->all(), [
            'request_type' => ['required', 'in:shift_change,time_off,message'],
            'shift_id' => ['nullable', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'message' => ['required', 'string', 'min:2', 'max:2000'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        $shiftId = !empty($clean['shift_id']) ? (int)$clean['shift_id'] : null;
        if ($shiftId) {
            $ownsShift = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('assignment.person_id', (int)$person->id)
                ->where('assignment.shift_id', $shiftId)
                ->where('shift.location_id', $locationId)
                ->exists();
            if (!$ownsShift) throw ValidationException::withMessages(['shift_id' => 'Choose one of your own shifts.']);
        }

        $dateFrom = !empty($clean['date_from']) ? Carbon::parse($clean['date_from'])->toDateString() : null;
        $dateTo = !empty($clean['date_to']) ? Carbon::parse($clean['date_to'])->toDateString() : null;
        if ($dateFrom && $dateTo && $dateTo < $dateFrom) throw ValidationException::withMessages(['date_to' => 'End date must be after start date.']);

        DB::table('pmd_staff_requests')->insert([
            'location_id' => $locationId,
            'staff_id' => $staffId,
            'person_id' => (int)$person->id,
            'request_type' => $clean['request_type'],
            'shift_id' => $shiftId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'message' => trim((string)$clean['message']),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect(admin_url('mywork'))->with('success', 'Request sent to your manager.');
    }

    private function staffId(): int
    {
        try { return (int)optional(AdminAuth::getUser()->staff)->staff_id; }
        catch (\Throwable $error) { return 0; }
    }

    private function locationId(): int
    {
        try { $id = (int)AdminLocation::getId(); if ($id > 0) return $id; }
        catch (\Throwable $error) {}
        return 1;
    }
}
