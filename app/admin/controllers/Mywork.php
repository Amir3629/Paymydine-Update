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
        // PMD_STAFF_PORTAL_COMPAT_V1
        // Keep the old authenticated route as a bridge only. Staff work lives
        // on the standalone /staff surface with no Admin chrome.
        return redirect('/staff');
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

        return redirect('/staff#messages')->with('success', 'Request sent to your manager.');
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
