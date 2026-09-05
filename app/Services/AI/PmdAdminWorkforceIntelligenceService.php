<?php

namespace App\Services\AI;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Internal, read-only workforce detail adapter for PMD Intelligence.
 *
 * This service is intentionally NOT used by Guest AI. It exposes only the
 * operational fields an authenticated Admin/Owner needs for scheduling:
 * display name, role/department, shift time, scheduled hours, attendance state
 * and replacement state. Contact, authentication, payroll and private profile
 * fields are never returned to the model.
 */
final class PmdAdminWorkforceIntelligenceService
{
    public function range(PmdReadAuthority $authority, string $startDate, string $endDate): array
    {
        $base = $authority->workforceScheduleRange($startDate, $endDate);
        if (empty($base['available'])) return $base;

        $locationId = (int)($authority->canonicalLocationId() ?: 0);
        if (
            $locationId < 1
            || !Schema::hasTable('pmd_operational_shifts')
            || !Schema::hasTable('pmd_operational_shift_people')
        ) {
            $base['people_detail_available'] = false;
            return $base;
        }

        $start = (string)($base['range']['start_date'] ?? $startDate);
        $end = (string)($base['range']['end_date'] ?? $endDate);

        $shifts = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereBetween('shift_date', [$start, $end])
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->orderBy('shift_date')
            ->orderBy('starts_at')
            ->orderBy('id')
            ->limit(100)
            ->get();

        $shiftIds = $shifts->pluck('id')->map('intval')->filter()->values()->all();
        $assignments = collect();
        if ($shiftIds) {
            $assignments = DB::table('pmd_operational_shift_people')
                ->whereIn('shift_id', $shiftIds)
                ->orderBy('shift_id')
                ->orderBy('id')
                ->get();
        }

        $rosterByPerson = collect();
        $activeRoster = collect();
        if (Schema::hasTable('pmd_operational_people')) {
            $activeRoster = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('is_active', 1)
                ->orderBy('display_name')
                ->get(['id', 'staff_id', 'display_name', 'department', 'job_role']);
            $rosterByPerson = $activeRoster->keyBy(fn ($row) => (int)$row->id);
        }

        $actualHours = $this->actualHoursByPersonDate(
            $locationId,
            $start,
            $end,
            $rosterByPerson
        );

        $detailShifts = [];
        $scheduledPersonIds = [];
        $scheduledHoursByPerson = [];

        foreach ($shifts as $shift) {
            $shiftHours = $this->scheduledHours(
                (string)$shift->shift_date,
                $shift->starts_at ?? null,
                $shift->ends_at ?? null,
                (int)($shift->break_minutes ?? 0)
            );

            $people = [];
            foreach ($assignments->where('shift_id', (int)$shift->id) as $assignment) {
                $personId = $assignment->person_id ? (int)$assignment->person_id : null;
                if ($personId) $scheduledPersonIds[$personId] = true;

                $name = trim((string)($assignment->display_name_snapshot ?? ''));
                if ($name === '' && $personId && $rosterByPerson->has($personId)) {
                    $name = trim((string)$rosterByPerson->get($personId)->display_name);
                }

                $role = trim((string)($assignment->job_role_snapshot ?? ''));
                $department = strtolower(trim((string)($assignment->department_snapshot ?? '')));
                $key = $personId ? (string)$personId : 'name:'.strtolower($name);
                if ($shiftHours !== null) {
                    $scheduledHoursByPerson[$key] = round(
                        (float)($scheduledHoursByPerson[$key] ?? 0) + $shiftHours,
                        2
                    );
                }

                $dayKey = $personId ? $personId.'|'.(string)$shift->shift_date : null;
                $people[] = [
                    'person_id' => $personId,
                    'name' => $name !== '' ? $name : 'Unnamed team member',
                    'department' => $department !== '' ? $department : 'other',
                    'job_role' => $role !== '' ? $role : 'Team member',
                    'attendance_status' => strtolower(trim((string)($assignment->attendance_status ?? 'planned'))) ?: 'planned',
                    'is_replacement' => (bool)($assignment->is_replacement ?? false),
                    'scheduled_hours' => $shiftHours,
                    'actual_hours_on_date' => $dayKey && array_key_exists($dayKey, $actualHours)
                        ? $actualHours[$dayKey]
                        : null,
                ];
            }

            $detailShifts[] = [
                'shift_id' => (int)$shift->id,
                'date' => (string)$shift->shift_date,
                'label' => (string)$shift->label,
                'starts_at' => $shift->starts_at ? substr((string)$shift->starts_at, 0, 5) : null,
                'ends_at' => $shift->ends_at ? substr((string)$shift->ends_at, 0, 5) : null,
                'break_minutes' => (int)($shift->break_minutes ?? 0),
                'scheduled_hours' => $shiftHours,
                'status' => (string)$shift->status,
                'confirmed' => !empty($shift->confirmed_at)
                    || strtolower((string)$shift->status) === 'confirmed',
                'people' => $people,
            ];
        }

        $notScheduled = [];
        foreach ($activeRoster as $person) {
            $personId = (int)$person->id;
            if (isset($scheduledPersonIds[$personId])) continue;

            $notScheduled[] = [
                'person_id' => $personId,
                'name' => trim((string)$person->display_name),
                'department' => strtolower(trim((string)($person->department ?? ''))) ?: 'other',
                'job_role' => trim((string)($person->job_role ?? '')) ?: 'Team member',
            ];
        }

        $base['people_detail_available'] = true;
        $base['detailed_shifts'] = $detailShifts;
        $base['not_scheduled_in_range'] = array_slice($notScheduled, 0, 100);
        $base['scheduled_hours_by_person'] = $scheduledHoursByPerson;
        $base['privacy_scope'] = 'Operational scheduling only: no contact, login, payroll or private profile data.';
        $base['source'] = 'PMD operational roster, shift assignments and optional attendance; internal Admin AI read-only authority.';

        return $base;
    }

    private function scheduledHours(string $date, $startsAt, $endsAt, int $breakMinutes): ?float
    {
        $startText = $startsAt ? substr((string)$startsAt, 0, 8) : '';
        $endText = $endsAt ? substr((string)$endsAt, 0, 8) : '';
        if ($startText === '' || $endText === '') return null;

        try {
            $start = Carbon::parse($date.' '.$startText);
            $end = Carbon::parse($date.' '.$endText);
            if ($end->lte($start)) $end->addDay();

            $minutes = max(0, $start->diffInMinutes($end) - max(0, $breakMinutes));
            return round($minutes / 60, 2);
        } catch (Throwable $error) {
            return null;
        }
    }

    private function actualHoursByPersonDate(
        int $locationId,
        string $startDate,
        string $endDate,
        $rosterByPerson
    ): array {
        if (
            !Schema::hasTable('staff_attendance')
            || !Schema::hasColumn('staff_attendance', 'staff_id')
            || !Schema::hasColumn('staff_attendance', 'check_in_time')
        ) {
            return [];
        }

        $staffToPerson = [];
        foreach ($rosterByPerson as $personId => $person) {
            $staffId = (int)($person->staff_id ?? 0);
            if ($staffId > 0) $staffToPerson[$staffId] = (int)$personId;
        }
        if (!$staffToPerson) return [];

        try {
            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->addDay()->startOfDay();

            $query = DB::table('staff_attendance')
                ->whereIn('staff_id', array_keys($staffToPerson))
                ->where('check_in_time', '>=', $start)
                ->where('check_in_time', '<', $end)
                ->orderBy('check_in_time');

            if (Schema::hasColumn('staff_attendance', 'location_id')) {
                $query->where('location_id', $locationId);
            }

            $columns = ['staff_id', 'check_in_time'];
            $hasCheckout = Schema::hasColumn('staff_attendance', 'check_out_time');
            if ($hasCheckout) $columns[] = 'check_out_time';

            $rows = $query->get($columns);
            $totals = [];
            foreach ($rows as $row) {
                $staffId = (int)$row->staff_id;
                $personId = $staffToPerson[$staffId] ?? null;
                if (!$personId || empty($row->check_in_time)) continue;

                $checkIn = Carbon::parse((string)$row->check_in_time);
                $checkOut = $hasCheckout && !empty($row->check_out_time)
                    ? Carbon::parse((string)$row->check_out_time)
                    : null;
                if (!$checkOut || $checkOut->lte($checkIn)) continue;

                $key = $personId.'|'.$checkIn->toDateString();
                $totals[$key] = round(
                    (float)($totals[$key] ?? 0) + ($checkIn->diffInMinutes($checkOut) / 60),
                    2
                );
            }

            return $totals;
        } catch (Throwable $error) {
            return [];
        }
    }
}
