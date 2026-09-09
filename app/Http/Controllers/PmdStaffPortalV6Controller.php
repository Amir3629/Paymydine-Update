<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\View\View;

/**
 * PMD_STAFF_PORTAL_V6_TIME_CLOCK
 *
 * Additive V6 layer over the proven V5 Staff Portal. V5 remains the authority
 * for schedule, requests, chat, profile and reporting. V6 adds a server-time
 * attendance clock backed by the canonical staff_attendance table and injects
 * the small clock UI into the standalone Staff Portal document.
 *
 * Planning and attendance intentionally remain separate: clock-in/out does not
 * rewrite pmd_operational_shift_people.attendance_status or the rota itself.
 */
class PmdStaffPortalV6Controller extends PmdStaffPortalV5Controller
{
    public function index(Request $request)
    {
        $view = parent::index($request);
        if (!$view instanceof View) return $view;

        $clock = $this->clockState();
        $payload = json_encode(array_merge($clock, [
            'clock_in_url' => admin_url('mywork/clockin'),
            'clock_out_url' => admin_url('mywork/clockout'),
        ]), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        if ($payload === false) $payload = '{}';

        $html = $view->render();
        $css = asset('app/admin/assets/css/pmd-staff-time-clock-v1.css').'?v=1';
        $js = asset('app/admin/assets/js/pmd-staff-time-clock-v1.js').'?v=1';

        $html = str_replace(
            '</head>',
            '<link rel="stylesheet" href="'.e($css).'">'."\n".'</head>',
            $html
        );
        $html = str_replace(
            '</body>',
            '<script>window.PMD_STAFF_TIME_CLOCK='.$payload.';</script>'."\n".
            '<script src="'.e($js).'"></script>'."\n".
            '</body>',
            $html
        );

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function clockIn(Request $request): RedirectResponse
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');

        $identity = $this->clockIdentity();
        if (!$identity) {
            return redirect('/staff#schedule')->with('error', 'Your PMD login is not connected to an active Team profile.');
        }
        if (!$this->attendanceReady()) {
            return redirect('/staff#schedule')->with('error', 'Time clock is not available for this restaurant yet.');
        }

        $now = now();
        $staffId = (int)$identity['staff_id'];
        $locationId = (int)$identity['location_id'];

        try {
            $result = DB::transaction(function () use ($staffId, $locationId, $identity, $now) {
                // Serialize clock operations per staff member so a double-click
                // cannot create two open attendance rows.
                DB::table('staffs')->where('staff_id', $staffId)->lockForUpdate()->first();

                $open = DB::table('staff_attendance')
                    ->where('staff_id', $staffId)
                    ->whereNull('check_out_time')
                    ->orderByDesc('attendance_id')
                    ->first();
                if ($open) return ['ok' => false, 'reason' => 'already_open', 'row' => $open];

                $values = [
                    'staff_id' => $staffId,
                    'check_in_time' => $now,
                    'check_out_time' => null,
                ];
                if (Schema::hasColumn('staff_attendance', 'location_id')) $values['location_id'] = $locationId;
                if (Schema::hasColumn('staff_attendance', 'created_at')) $values['created_at'] = $now;
                if (Schema::hasColumn('staff_attendance', 'updated_at')) $values['updated_at'] = $now;
                if (Schema::hasColumn('staff_attendance', 'metadata')) {
                    $values['metadata'] = json_encode([
                        'source' => 'staff_portal',
                        'person_id' => (int)$identity['person_id'],
                    ], JSON_UNESCAPED_SLASHES);
                }

                $id = (int)DB::table('staff_attendance')->insertGetId($values, 'attendance_id');
                return ['ok' => true, 'attendance_id' => $id];
            });
        } catch (\Throwable $error) {
            logger()->error('PMD Staff Portal clock-in failed', [
                'staff_id' => $staffId,
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);
            return redirect('/staff#schedule')->with('error', 'Shift could not be started. Please try again.');
        }

        if (empty($result['ok'])) {
            return redirect('/staff#schedule')->with('error', 'Your shift is already running.');
        }

        return redirect('/staff#schedule')->with('success', 'Shift started at '.$now->format('H:i').'.');
    }

    public function clockOut(Request $request): RedirectResponse
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');

        $identity = $this->clockIdentity();
        if (!$identity) {
            return redirect('/staff#schedule')->with('error', 'Your PMD login is not connected to an active Team profile.');
        }
        if (!$this->attendanceReady()) {
            return redirect('/staff#schedule')->with('error', 'Time clock is not available for this restaurant yet.');
        }

        $now = now();
        $staffId = (int)$identity['staff_id'];
        $locationId = (int)$identity['location_id'];

        try {
            $result = DB::transaction(function () use ($staffId, $now) {
                DB::table('staffs')->where('staff_id', $staffId)->lockForUpdate()->first();

                $open = DB::table('staff_attendance')
                    ->where('staff_id', $staffId)
                    ->whereNull('check_out_time')
                    ->orderByDesc('attendance_id')
                    ->lockForUpdate()
                    ->first();
                if (!$open) return ['ok' => false, 'reason' => 'not_open'];

                try {
                    $checkIn = Carbon::parse($open->check_in_time);
                } catch (\Throwable $error) {
                    return ['ok' => false, 'reason' => 'invalid_start'];
                }

                $seconds = $checkIn->lt($now) ? $checkIn->diffInSeconds($now) : 0;
                $hours = round($seconds / 3600, 2);
                $values = ['check_out_time' => $now];
                if (Schema::hasColumn('staff_attendance', 'hours_worked')) $values['hours_worked'] = $hours;
                if (Schema::hasColumn('staff_attendance', 'updated_at')) $values['updated_at'] = $now;

                DB::table('staff_attendance')
                    ->where('attendance_id', (int)$open->attendance_id)
                    ->update($values);

                return ['ok' => true, 'hours' => $hours];
            });
        } catch (\Throwable $error) {
            logger()->error('PMD Staff Portal clock-out failed', [
                'staff_id' => $staffId,
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);
            return redirect('/staff#schedule')->with('error', 'Shift could not be ended. Please try again.');
        }

        if (empty($result['ok'])) {
            return redirect('/staff#schedule')->with('error', 'There is no running shift to end.');
        }

        return redirect('/staff#schedule')->with(
            'success',
            'Shift ended at '.$now->format('H:i').' · '.number_format((float)$result['hours'], 2).'h recorded.'
        );
    }

    private function clockState(): array
    {
        $base = [
            'ready' => false,
            'active' => false,
            'attendance_id' => null,
            'check_in_iso' => null,
            'check_in_label' => null,
            'elapsed_seconds' => 0,
            'last_check_out_label' => null,
            'last_hours' => null,
            'scheduled_label' => null,
            'server_now' => now()->toIso8601String(),
        ];

        $identity = $this->clockIdentity();
        if (!$identity || !$this->attendanceReady()) return $base;
        $base['ready'] = true;

        $staffId = (int)$identity['staff_id'];
        $locationId = (int)$identity['location_id'];
        $personIds = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('staff_id', $staffId)
            ->pluck('id')->map('intval')->filter()->unique()->values()->all();

        $open = DB::table('staff_attendance')
            ->where('staff_id', $staffId)
            ->whereNull('check_out_time')
            ->orderByDesc('attendance_id')
            ->first();

        if ($open) {
            try {
                $checkIn = Carbon::parse($open->check_in_time);
                $base['active'] = true;
                $base['attendance_id'] = (int)$open->attendance_id;
                $base['check_in_iso'] = $checkIn->toIso8601String();
                $base['check_in_label'] = $checkIn->format('H:i');
                $base['elapsed_seconds'] = max(0, $checkIn->diffInSeconds(now()));
            } catch (\Throwable $error) {
            }
        }

        $lastQuery = DB::table('staff_attendance')
            ->where('staff_id', $staffId)
            ->whereNotNull('check_out_time');
        if (Schema::hasColumn('staff_attendance', 'location_id')) {
            $lastQuery->where(function ($q) use ($locationId) {
                $q->where('location_id', $locationId)->orWhereNull('location_id');
            });
        }
        $last = $lastQuery
            ->orderByDesc('check_out_time')
            ->orderByDesc('attendance_id')
            ->first();
        if ($last) {
            try {
                $in = Carbon::parse($last->check_in_time);
                $out = Carbon::parse($last->check_out_time);
                $base['last_check_out_label'] = $out->format('d M · H:i');
                if (Schema::hasColumn('staff_attendance', 'hours_worked') && $last->hours_worked !== null && $last->hours_worked !== '') {
                    $base['last_hours'] = round((float)$last->hours_worked, 2);
                } else {
                    $base['last_hours'] = round(max(0, $in->diffInSeconds($out)) / 3600, 2);
                }
            } catch (\Throwable $error) {
            }
        }

        if ($personIds && Schema::hasTable('pmd_operational_shifts') && Schema::hasTable('pmd_operational_shift_people')) {
            $shift = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->whereIn('assignment.person_id', $personIds)
                ->where('shift.location_id', $locationId)
                ->whereDate('shift.shift_date', now()->toDateString())
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->select(['shift.label', 'shift.starts_at', 'shift.ends_at'])
                ->orderBy('shift.starts_at')
                ->orderBy('shift.id')
                ->first();
            if ($shift) {
                $time = $shift->starts_at ? substr((string)$shift->starts_at, 0, 5) : 'All day';
                if ($shift->ends_at) $time .= ' – '.substr((string)$shift->ends_at, 0, 5);
                $base['scheduled_label'] = trim((string)($shift->label ?: 'Shift')).' · '.$time;
            }
        }

        return $base;
    }

    private function clockIdentity(): ?array
    {
        if (!AdminAuth::isLogged() || !Schema::hasTable('pmd_operational_people')) return null;

        try {
            $user = AdminAuth::getUser();
            $staffId = (int)optional($user ? $user->staff : null)->staff_id;
            if ($staffId < 1) return null;

            $person = DB::table('pmd_operational_people')
                ->where('staff_id', $staffId)
                ->where('is_active', 1)
                ->orderBy('location_id')
                ->orderBy('id')
                ->first();
            if (!$person || (int)$person->location_id < 1) return null;

            return [
                'staff_id' => $staffId,
                'person_id' => (int)$person->id,
                'location_id' => (int)$person->location_id,
            ];
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function attendanceReady(): bool
    {
        return Schema::hasTable('staff_attendance')
            && Schema::hasColumn('staff_attendance', 'attendance_id')
            && Schema::hasColumn('staff_attendance', 'staff_id')
            && Schema::hasColumn('staff_attendance', 'check_in_time')
            && Schema::hasColumn('staff_attendance', 'check_out_time');
    }
}
