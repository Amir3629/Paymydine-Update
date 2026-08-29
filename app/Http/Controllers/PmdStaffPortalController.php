<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/** PMD_STAFF_PORTAL_V1 */
class PmdStaffPortalController extends Controller
{
    public function login()
    {
        if (AdminAuth::isLogged() && $this->currentPerson()) {
            return redirect('/staff');
        }

        return view('pmd-staff-portal.login', [
            'managementSession' => AdminAuth::isLogged(),
        ]);
    }

    public function authenticate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => ['required', 'string', 'max:64'],
            'password' => ['required', 'string', 'min:6', 'max:128'],
        ]);

        if ($validator->fails()) {
            return redirect('/staff/login')->withErrors($validator)->withInput($request->except('password'));
        }

        if (AdminAuth::isLogged()) {
            try { AdminAuth::logout(); } catch (\Throwable $error) {}
            session()->invalidate();
            session()->regenerateToken();
        }

        $clean = $validator->validated();
        $credentials = [
            'username' => trim((string)$clean['username']),
            'password' => (string)$clean['password'],
        ];

        try {
            if (!AdminAuth::authenticate($credentials, true, true)) {
                return redirect('/staff/login')->with('error', 'Username or password is not correct.')->withInput($request->except('password'));
            }
        } catch (\Throwable $error) {
            report($error);
            return redirect('/staff/login')->with('error', 'Could not sign in. Please try again.')->withInput($request->except('password'));
        }

        session()->regenerate();

        $person = $this->currentPerson();
        if (!$person) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'This account is not connected to a restaurant People profile yet. Ask your manager to open People → Access.');
        }

        try {
            app(\Admin\Services\PmdAdminPresenceService::class)->loginCurrentSession();
        } catch (\Throwable $error) {
            logger()->warning('PMD staff portal presence registration failed', ['message' => $error->getMessage()]);
        }

        return redirect('/staff');
    }

    public function index()
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');

        $person = $this->currentPerson();
        if (!$person) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'Your PMD login is not connected to a restaurant People profile. Ask your manager to reconnect it.');
        }

        $staffId = $this->staffId();
        $locationId = (int)$person->location_id;
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
                ->select([
                    'shift.id', 'shift.shift_date', 'shift.label', 'shift.starts_at',
                    'shift.ends_at', 'shift.status', 'assignment.attendance_status',
                ])
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->get();
        }

        $requests = collect();
        if (Schema::hasTable('pmd_staff_requests')) {
            $requests = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where(function ($query) use ($person, $staffId) {
                    $query->where('person_id', (int)$person->id);
                    if ($staffId > 0) $query->orWhere('staff_id', $staffId);
                })
                ->orderByDesc('created_at')
                ->limit(40)
                ->get();
        }

        return view('pmd-staff-portal.index', [
            'person' => $person,
            'shifts' => $shifts,
            'requests' => $requests,
            'requestsReady' => Schema::hasTable('pmd_staff_requests'),
        ]);
    }

    public function saveRequest(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');
        if (!Schema::hasTable('pmd_staff_requests')) return redirect('/staff')->with('error', 'Requests are not available yet.');

        $person = $this->currentPerson();
        if (!$person) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'Your PMD login is not connected to a People profile.');
        }

        $validator = Validator::make($request->all(), [
            'request_type' => ['required', 'in:shift_change,time_off,message'],
            'shift_id' => ['nullable', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'message' => ['required', 'string', 'min:1', 'max:2000'],
        ]);
        if ($validator->fails()) return redirect('/staff#requests')->withErrors($validator)->withInput();
        $clean = $validator->validated();

        $locationId = (int)$person->location_id;
        $shiftId = !empty($clean['shift_id']) ? (int)$clean['shift_id'] : null;
        if ($shiftId) {
            $ownsShift = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('assignment.person_id', (int)$person->id)
                ->where('assignment.shift_id', $shiftId)
                ->where('shift.location_id', $locationId)
                ->exists();
            if (!$ownsShift) return redirect('/staff#requests')->with('error', 'Choose one of your own shifts.');
        }

        $dateFrom = !empty($clean['date_from']) ? Carbon::parse($clean['date_from'])->toDateString() : null;
        $dateTo = !empty($clean['date_to']) ? Carbon::parse($clean['date_to'])->toDateString() : null;
        if ($dateFrom && $dateTo && $dateTo < $dateFrom) {
            return redirect('/staff#requests')->with('error', 'End date must be after start date.');
        }

        $type = (string)$clean['request_type'];
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

        return redirect('/staff#messages')->with('success', $type === 'message' ? 'Message sent.' : 'Request sent.');
    }

    public function logout()
    {
        $this->logoutSession();
        return redirect('/staff/login')->with('success', 'Signed out.');
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
        } catch (\Throwable $error) {
        }
        session()->invalidate();
        session()->regenerateToken();
    }
}
