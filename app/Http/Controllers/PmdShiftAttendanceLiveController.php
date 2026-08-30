<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Services\PmdDefaultStaffRoleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_SHIFT_ATTENDANCE_LIVE_V1
 *
 * Read-only Owner/Manager endpoint for the Shifts day board. The rota remains
 * planning authority. Real presence comes from staff_attendance and is shown as
 * an overlay, so a Staff Portal clock-in never rewrites planned assignments.
 */
class PmdShiftAttendanceLiveController
{
    public function __invoke(Request $request)
    {
        if (!AdminAuth::isLogged()) {
            return response()->json(['ok' => false, 'message' => 'Authentication required.'], 401);
        }

        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser(AdminAuth::getUser());
        if (!in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) {
            return response()->json(['ok' => false, 'message' => 'Owner or Manager access required.'], 403);
        }

        if (!$this->ready()) {
            return response()->json([
                'ok' => true,
                'ready' => false,
                'rows' => [],
                'present_now' => null,
                'missing_now' => null,
            ]);
        }

        $locationId = $this->locationId();
        $day = $this->selectedDay($request);
        $dayStart = $day->copy()->setTime(6, 0, 0);
        $dayEnd = $dayStart->copy()->addDay();
        $now = now();

        $people = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->orderBy('id')
            ->get(['id', 'staff_id', 'display_name']);

        $peopleById = $people->keyBy(fn ($person) => (int)$person->id);
        $staffIds = $people->pluck('staff_id')->map('intval')->filter(fn ($id) => $id > 0)->unique()->values()->all();

        $shifts = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereDate('shift_date', $day->toDateString())
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get(['id', 'shift_date', 'starts_at', 'ends_at']);

        $shiftIds = $shifts->pluck('id')->map('intval')->all();
        $assignments = $shiftIds
            ? DB::table('pmd_operational_shift_people')->whereIn('shift_id', $shiftIds)->get(['shift_id', 'person_id'])
            : collect();

        $scheduledPersonIds = $assignments->pluck('person_id')->map('intval')->filter()->unique()->values();
        $activeShiftIds = collect();
        if ($day->isSameDay($now)) {
            foreach ($shifts as $shift) {
                if ($this->shiftContains($shift, $now)) $activeShiftIds->push((int)$shift->id);
            }
        }
        $activeScheduledPersonIds = $activeShiftIds->isEmpty()
            ? collect()
            : $assignments->whereIn('shift_id', $activeShiftIds->all())->pluck('person_id')->map('intval')->filter()->unique()->values();

        $records = collect();
        if ($staffIds) {
            $query = DB::table('staff_attendance')
                ->whereIn('staff_id', $staffIds)
                ->where('check_in_time', '<', $dayEnd->toDateTimeString())
                ->where(function ($q) use ($dayStart) {
                    $q->whereNull('check_out_time')
                        ->orWhere('check_out_time', '>=', $dayStart->toDateTimeString());
                });
            if (Schema::hasColumn('staff_attendance', 'location_id')) {
                $query->where(function ($q) use ($locationId) {
                    $q->where('location_id', $locationId)->orWhereNull('location_id');
                });
            }
            $records = $query->orderBy('check_in_time')->orderBy('attendance_id')->get();
        }

        $recordsByStaff = $records->groupBy(fn ($record) => (int)$record->staff_id);
        $rows = [];
        $activeStaffIds = collect();

        foreach ($people as $person) {
            $personId = (int)$person->id;
            $staffId = (int)($person->staff_id ?? 0);
            $personRecords = $staffId > 0 ? collect($recordsByStaff->get($staffId, [])) : collect();
            $open = $personRecords->filter(fn ($record) => empty($record->check_out_time))->sortByDesc('attendance_id')->first();
            $workedSeconds = 0;
            $lastOut = null;

            foreach ($personRecords as $record) {
                try {
                    $in = Carbon::parse($record->check_in_time);
                    $out = $record->check_out_time ? Carbon::parse($record->check_out_time) : ($day->isSameDay($now) ? $now->copy() : $dayEnd->copy());
                    $from = $in->gt($dayStart) ? $in : $dayStart->copy();
                    $to = $out->lt($dayEnd) ? $out : $dayEnd->copy();
                    if ($to->gt($from)) $workedSeconds += $from->diffInSeconds($to);
                    if ($record->check_out_time && (!$lastOut || $out->gt($lastOut))) $lastOut = $out;
                } catch (\Throwable $error) {
                }
            }

            $scheduled = $scheduledPersonIds->contains($personId);
            $state = 'off';
            $label = '';
            $checkIn = null;

            if ($open && $day->isSameDay($now)) {
                try {
                    $checkIn = Carbon::parse($open->check_in_time);
                    if ($checkIn->lte($now)) {
                        $state = 'working';
                        $label = 'Working since '.$checkIn->format('H:i');
                        if ($staffId > 0) $activeStaffIds->push($staffId);
                    }
                } catch (\Throwable $error) {
                }
            } elseif ($open) {
                $state = 'open';
                try { $label = 'Open session · '.Carbon::parse($open->check_in_time)->format('H:i'); } catch (\Throwable $error) { $label = 'Open session'; }
            } elseif ($workedSeconds > 0) {
                $state = 'worked';
                $label = 'Worked '.number_format($workedSeconds / 3600, 2).'h';
                if ($lastOut) $label .= ' · out '.$lastOut->format('H:i');
            } elseif ($scheduled) {
                $state = 'not_started';
                $label = 'Not checked in';
            }

            $rows[(string)$personId] = [
                'person_id' => $personId,
                'staff_id' => $staffId ?: null,
                'state' => $state,
                'label' => $label,
                'scheduled' => $scheduled,
                'worked_hours' => round($workedSeconds / 3600, 2),
                'check_in' => $checkIn ? $checkIn->toIso8601String() : null,
            ];
        }

        $presentNow = null;
        $missingNow = null;
        if ($day->isSameDay($now)) {
            $presentNow = $activeStaffIds->unique()->count();
            if ($activeScheduledPersonIds->isNotEmpty()) {
                $presentPersonIds = $activeScheduledPersonIds->filter(function ($personId) use ($peopleById, $activeStaffIds) {
                    $person = $peopleById->get((int)$personId);
                    return $person && (int)($person->staff_id ?? 0) > 0 && $activeStaffIds->contains((int)$person->staff_id);
                });
                $missingNow = max(0, $activeScheduledPersonIds->count() - $presentPersonIds->count());
            } else {
                $missingNow = 0;
            }
        }

        return response()->json([
            'ok' => true,
            'ready' => true,
            'day' => $day->toDateString(),
            'restaurant_day_start' => $dayStart->toIso8601String(),
            'restaurant_day_end' => $dayEnd->toIso8601String(),
            'server_now' => $now->toIso8601String(),
            'rows' => $rows,
            'present_now' => $presentNow,
            'missing_now' => $missingNow,
        ])->header('Cache-Control', 'no-store, private, max-age=0');
    }

    private function ready(): bool
    {
        return Schema::hasTable('pmd_operational_people')
            && Schema::hasTable('pmd_operational_shifts')
            && Schema::hasTable('pmd_operational_shift_people')
            && Schema::hasTable('staff_attendance')
            && Schema::hasColumn('staff_attendance', 'attendance_id')
            && Schema::hasColumn('staff_attendance', 'staff_id')
            && Schema::hasColumn('staff_attendance', 'check_in_time')
            && Schema::hasColumn('staff_attendance', 'check_out_time');
    }

    private function locationId(): int
    {
        try { return max(1, (int)AdminLocation::getId()); } catch (\Throwable $error) { return 1; }
    }

    private function selectedDay(Request $request): Carbon
    {
        $raw = trim((string)$request->query('day', ''));
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            try { return Carbon::parse($raw)->startOfDay(); } catch (\Throwable $error) {}
        }
        return now()->startOfDay();
    }

    private function shiftContains($shift, Carbon $cursor): bool
    {
        try {
            $date = Carbon::parse($shift->shift_date)->startOfDay();
            $startText = $shift->starts_at ? substr((string)$shift->starts_at, 0, 8) : '06:00:00';
            $endText = $shift->ends_at ? substr((string)$shift->ends_at, 0, 8) : null;
            $start = Carbon::parse($date->toDateString().' '.$startText);
            $end = $endText
                ? Carbon::parse($date->toDateString().' '.$endText)
                : $start->copy()->addHours(8);
            if ($end->lte($start)) $end->addDay();
            return $cursor->gte($start) && $cursor->lt($end);
        } catch (\Throwable $error) {
            return false;
        }
    }
}
