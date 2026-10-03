<?php

namespace App\Services\AI;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

/**
 * Internal, read-only workforce authority for PMD Intelligence.
 *
 * This service is intentionally NOT used by Guest AI. It exposes operational
 * scheduling/attendance facts an authenticated Admin/Owner needs: names, roles,
 * scheduled hours, actual worked hours, attendance state and immutable shift
 * audit events. Contact, authentication, payroll, salary and private profile
 * fields are never returned to the model.
 */
final class PmdAdminWorkforceIntelligenceService
{
    private const MAX_RANGE_DAYS = 730;
    private const MAX_SHIFTS = 5000;
    private const MAX_DETAIL_SHIFTS = 140;

    public function range(PmdReadAuthority $authority, string $startDate, string $endDate): array
    {
        [$start, $end] = $this->normalizeRange($startDate, $endDate);
        $locationId = (int)($authority->canonicalLocationId() ?: 0);

        if (
            $locationId < 1
            || !Schema::hasTable('pmd_operational_shifts')
            || !Schema::hasTable('pmd_operational_shift_people')
        ) {
            return [
                'available' => false,
                'reason' => 'Operational workforce tables are unavailable.',
                'range' => ['start_date' => $start, 'end_date' => $end],
            ];
        }

        // Preserve the canonical report/count authority for ranges it supports,
        // but do not let its 90-day cap block Admin historical/YTD intelligence.
        $base = [
            'available' => true,
            'range' => ['start_date' => $start, 'end_date' => $end],
        ];
        try {
            if (Carbon::parse($start)->diffInDays(Carbon::parse($end)) <= 90) {
                $canonical = $authority->workforceScheduleRange($start, $end);
                if (is_array($canonical)) $base = array_merge($base, $canonical);
            }
        } catch (Throwable $error) {
            // Detailed Admin workforce authority below remains available even if
            // the aggregate report authority rejects a long historical range.
            $base['canonical_schedule_summary_available'] = false;
        }

        $roster = collect();
        $rosterByPerson = collect();
        if (Schema::hasTable('pmd_operational_people')) {
            $roster = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->orderBy('display_name')
                ->get(['id', 'staff_id', 'display_name', 'department', 'job_role', 'is_active']);
            $rosterByPerson = $roster->keyBy(fn ($row) => (int)$row->id);
        }

        $shifts = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereBetween('shift_date', [$start, $end])
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->orderBy('shift_date')
            ->orderBy('starts_at')
            ->orderBy('id')
            ->limit(self::MAX_SHIFTS)
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

        $actual = $this->actualAttendanceMetrics(
            $locationId,
            $start,
            $end,
            $rosterByPerson
        );

        $confirmedByNames = $this->confirmedByNames($shifts);
        $detailShifts = [];
        $scheduledPersonIds = [];
        $personMetrics = [];

        foreach ($roster as $person) {
            $personId = (int)$person->id;
            $actualMetric = $actual['by_person'][$personId] ?? [];
            $personMetrics[$personId] = [
                'person_id' => $personId,
                'name' => trim((string)$person->display_name) ?: 'Unnamed team member',
                'department' => strtolower(trim((string)($person->department ?? ''))) ?: 'other',
                'job_role' => trim((string)($person->job_role ?? '')) ?: 'Team member',
                'active' => (bool)($person->is_active ?? false),
                'scheduled_shift_count' => 0,
                'scheduled_hours' => 0.0,
                'present_marked_shifts' => 0,
                'absent_marked_shifts' => 0,
                'replacement_shifts' => 0,
                'actual_worked_hours' => round((float)($actualMetric['actual_worked_hours'] ?? 0), 2),
                'worked_days' => (int)($actualMetric['worked_days'] ?? 0),
                'completed_attendance_sessions' => (int)($actualMetric['completed_sessions'] ?? 0),
                'open_attendance_sessions' => (int)($actualMetric['open_sessions'] ?? 0),
                'anomalous_attendance_sessions' => (int)($actualMetric['anomalous_sessions'] ?? 0),
                'first_check_in' => $actualMetric['first_check_in'] ?? null,
                'last_check_out' => $actualMetric['last_check_out'] ?? null,
            ];
        }

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
                if ($name === '') $name = 'Unnamed team member';

                $role = trim((string)($assignment->job_role_snapshot ?? ''));
                $department = strtolower(trim((string)($assignment->department_snapshot ?? ''))) ?: 'other';
                $attendanceStatus = strtolower(trim((string)($assignment->attendance_status ?? 'planned'))) ?: 'planned';

                if ($personId) {
                    if (!isset($personMetrics[$personId])) {
                        $personMetrics[$personId] = [
                            'person_id' => $personId,
                            'name' => $name,
                            'department' => $department,
                            'job_role' => $role !== '' ? $role : 'Team member',
                            'active' => null,
                            'scheduled_shift_count' => 0,
                            'scheduled_hours' => 0.0,
                            'present_marked_shifts' => 0,
                            'absent_marked_shifts' => 0,
                            'replacement_shifts' => 0,
                            'actual_worked_hours' => 0.0,
                            'worked_days' => 0,
                            'completed_attendance_sessions' => 0,
                            'open_attendance_sessions' => 0,
                            'anomalous_attendance_sessions' => 0,
                            'first_check_in' => null,
                            'last_check_out' => null,
                        ];
                    }

                    $personMetrics[$personId]['scheduled_shift_count']++;
                    if ($shiftHours !== null) {
                        $personMetrics[$personId]['scheduled_hours'] = round(
                            (float)$personMetrics[$personId]['scheduled_hours'] + $shiftHours,
                            2
                        );
                    }
                    if (in_array($attendanceStatus, ['present', 'replacement'], true)) {
                        $personMetrics[$personId]['present_marked_shifts']++;
                    }
                    if ($attendanceStatus === 'absent') {
                        $personMetrics[$personId]['absent_marked_shifts']++;
                    }
                    if (!empty($assignment->is_replacement)) {
                        $personMetrics[$personId]['replacement_shifts']++;
                    }
                }

                $dayKey = $personId ? $personId.'|'.(string)$shift->shift_date : null;
                $people[] = [
                    'person_id' => $personId,
                    'name' => $name,
                    'department' => $department,
                    'job_role' => $role !== '' ? $role : 'Team member',
                    'attendance_status' => $attendanceStatus,
                    'is_replacement' => (bool)($assignment->is_replacement ?? false),
                    'scheduled_hours' => $shiftHours,
                    'actual_hours_on_date' => $dayKey && array_key_exists($dayKey, $actual['by_person_date'])
                        ? $actual['by_person_date'][$dayKey]
                        : null,
                    'assignment_added_at' => !empty($assignment->created_at) ? (string)$assignment->created_at : null,
                    'assignment_updated_at' => !empty($assignment->updated_at) ? (string)$assignment->updated_at : null,
                ];
            }

            if (count($detailShifts) < self::MAX_DETAIL_SHIFTS) {
                $confirmerId = (int)($shift->confirmed_by_staff_id ?? 0);
                $detailShifts[] = [
                    'shift_id' => (int)$shift->id,
                    'date' => (string)$shift->shift_date,
                    'label' => (string)$shift->label,
                    'starts_at' => $shift->starts_at ? substr((string)$shift->starts_at, 0, 5) : null,
                    'ends_at' => $shift->ends_at ? substr((string)$shift->ends_at, 0, 5) : null,
                    'break_minutes' => (int)($shift->break_minutes ?? 0),
                    'scheduled_hours_per_person' => $shiftHours,
                    'status' => (string)$shift->status,
                    'created_at' => !empty($shift->created_at) ? (string)$shift->created_at : null,
                    'updated_at' => !empty($shift->updated_at) ? (string)$shift->updated_at : null,
                    'confirmed_at' => !empty($shift->confirmed_at) ? (string)$shift->confirmed_at : null,
                    'confirmed_by' => $confirmerId > 0 ? ($confirmedByNames[$confirmerId] ?? null) : null,
                    'people' => $people,
                ];
            }
        }

        $metrics = array_values($personMetrics);
        usort($metrics, fn (array $a, array $b) => strcasecmp((string)$a['name'], (string)$b['name']));
        foreach ($metrics as &$metric) {
            $metric['scheduled_hours'] = round((float)$metric['scheduled_hours'], 2);
            $metric['actual_worked_hours'] = round((float)$metric['actual_worked_hours'], 2);
            $metric['worked_vs_scheduled_hours'] = round(
                (float)$metric['actual_worked_hours'] - (float)$metric['scheduled_hours'],
                2
            );
        }
        unset($metric);

        $notScheduled = [];
        foreach ($roster as $person) {
            $personId = (int)$person->id;
            if (isset($scheduledPersonIds[$personId])) continue;
            $notScheduled[] = [
                'person_id' => $personId,
                'name' => trim((string)$person->display_name),
                'department' => strtolower(trim((string)($person->department ?? ''))) ?: 'other',
                'job_role' => trim((string)($person->job_role ?? '')) ?: 'Team member',
                'active' => (bool)($person->is_active ?? false),
            ];
        }

        $audit = app(PmdShiftAuditService::class)->events(
            $locationId,
            $start,
            $end,
            array_keys($personMetrics),
            null,
            80,
            $shiftIds
        );

        $base['available'] = true;
        $base['range'] = ['start_date' => $start, 'end_date' => $end];
        $base['people_detail_available'] = true;
        $base['historical_hours_available'] = (bool)$actual['attendance_table_available'];
        $base['people_metrics'] = $metrics;
        $base['detailed_shifts'] = $detailShifts;
        $base['detail_shift_limit'] = self::MAX_DETAIL_SHIFTS;
        $base['schedule_truncated'] = $shifts->count() >= self::MAX_SHIFTS;
        $base['not_scheduled_in_range'] = array_slice($notScheduled, 0, 150);
        $base['shift_audit'] = $audit;
        $base['worked_hours_rule'] = 'Actual worked hours are summed only from completed staff_attendance check-in/check-out sessions. Open or implausible sessions are reported separately and excluded from totals.';
        $base['privacy_scope'] = 'Internal operational workforce only: names, roles, shifts and attendance. No contact, login credentials, salary/payroll or private profile data.';
        $base['source'] = 'PMD operational roster + shift assignments + staff_attendance + immutable shift audit; internal Admin AI read-only authority.';

        return $base;
    }

    /** @return array{0:string,1:string} */
    private function normalizeRange(string $startDate, string $endDate): array
    {
        try {
            $start = Carbon::createFromFormat('Y-m-d', trim($startDate))->startOfDay();
            $end = Carbon::createFromFormat('Y-m-d', trim($endDate))->startOfDay();
        } catch (Throwable $error) {
            throw new RuntimeException('Workforce date range must use YYYY-MM-DD dates.');
        }

        if ($end->lt($start)) [$start, $end] = [$end, $start];
        if ($start->diffInDays($end) > self::MAX_RANGE_DAYS) {
            throw new RuntimeException('Workforce date range may not exceed 730 days.');
        }

        return [$start->toDateString(), $end->toDateString()];
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

    /**
     * @return array{attendance_table_available:bool,by_person:array<int,array>,by_person_date:array<string,float>}
     */
    private function actualAttendanceMetrics(
        int $locationId,
        string $startDate,
        string $endDate,
        $rosterByPerson
    ): array {
        $empty = [
            'attendance_table_available' => false,
            'by_person' => [],
            'by_person_date' => [],
        ];

        if (
            !Schema::hasTable('staff_attendance')
            || !Schema::hasColumn('staff_attendance', 'staff_id')
            || !Schema::hasColumn('staff_attendance', 'check_in_time')
        ) {
            return $empty;
        }

        $staffToPerson = [];
        foreach ($rosterByPerson as $personId => $person) {
            $staffId = (int)($person->staff_id ?? 0);
            if ($staffId > 0) $staffToPerson[$staffId] = (int)$personId;
        }
        if (!$staffToPerson) {
            $empty['attendance_table_available'] = true;
            return $empty;
        }

        try {
            $rangeStart = Carbon::parse($startDate)->startOfDay();
            $rangeEndExclusive = Carbon::parse($endDate)->addDay()->startOfDay();
            $hasCheckout = Schema::hasColumn('staff_attendance', 'check_out_time');

            $query = DB::table('staff_attendance')
                ->whereIn('staff_id', array_keys($staffToPerson))
                ->where('check_in_time', '<', $rangeEndExclusive)
                ->orderBy('check_in_time');

            if ($hasCheckout) {
                $query->where(function ($scope) use ($rangeStart) {
                    $scope->whereNull('check_out_time')->orWhere('check_out_time', '>=', $rangeStart);
                });
            } else {
                $query->where('check_in_time', '>=', $rangeStart);
            }

            if (Schema::hasColumn('staff_attendance', 'location_id')) {
                $query->where(function ($scope) use ($locationId) {
                    $scope->whereNull('location_id')->orWhere('location_id', $locationId);
                });
            }

            $columns = ['staff_id', 'check_in_time'];
            if ($hasCheckout) $columns[] = 'check_out_time';
            $rows = $query->get($columns);

            $byPerson = [];
            $byDate = [];
            $workedDates = [];

            foreach ($rows as $row) {
                $staffId = (int)$row->staff_id;
                $personId = $staffToPerson[$staffId] ?? null;
                if (!$personId || empty($row->check_in_time)) continue;

                $checkIn = Carbon::parse((string)$row->check_in_time);
                $checkOut = $hasCheckout && !empty($row->check_out_time)
                    ? Carbon::parse((string)$row->check_out_time)
                    : null;

                if (!isset($byPerson[$personId])) {
                    $byPerson[$personId] = [
                        'actual_worked_hours' => 0.0,
                        'worked_days' => 0,
                        'completed_sessions' => 0,
                        'open_sessions' => 0,
                        'anomalous_sessions' => 0,
                        'first_check_in' => null,
                        'last_check_out' => null,
                    ];
                    $workedDates[$personId] = [];
                }

                if (!$checkOut || $checkOut->lte($checkIn)) {
                    $byPerson[$personId]['open_sessions']++;
                    continue;
                }

                $effectiveStart = $checkIn->lt($rangeStart) ? $rangeStart->copy() : $checkIn;
                $effectiveEnd = $checkOut->gt($rangeEndExclusive) ? $rangeEndExclusive->copy() : $checkOut;
                $minutes = $effectiveStart->diffInMinutes($effectiveEnd);

                // A single attendance session over 24h almost always represents
                // a missed checkout. Surface it, but never silently count it as
                // worked time in Owner analytics.
                if ($checkIn->diffInMinutes($checkOut) > 24 * 60) {
                    $byPerson[$personId]['anomalous_sessions']++;
                    continue;
                }

                if ($minutes <= 0) continue;
                $hours = $minutes / 60;
                $byPerson[$personId]['actual_worked_hours'] = round(
                    (float)$byPerson[$personId]['actual_worked_hours'] + $hours,
                    2
                );
                $byPerson[$personId]['completed_sessions']++;
                $byPerson[$personId]['first_check_in'] = $byPerson[$personId]['first_check_in']
                    ?: $checkIn->toDateTimeString();
                $byPerson[$personId]['last_check_out'] = $checkOut->toDateTimeString();

                $dateKey = $checkIn->toDateString();
                $workedDates[$personId][$dateKey] = true;
                $personDateKey = $personId.'|'.$dateKey;
                $byDate[$personDateKey] = round((float)($byDate[$personDateKey] ?? 0) + $hours, 2);
            }

            foreach ($byPerson as $personId => &$metric) {
                $metric['worked_days'] = count($workedDates[$personId] ?? []);
            }
            unset($metric);

            return [
                'attendance_table_available' => true,
                'by_person' => $byPerson,
                'by_person_date' => $byDate,
            ];
        } catch (Throwable $error) {
            logger()->warning('PMD Admin workforce attendance aggregation failed', [
                'location_id' => $locationId,
                'type' => get_class($error),
            ]);
            return $empty;
        }
    }

    /** @return array<int,string> */
    private function confirmedByNames($shifts): array
    {
        if (!Schema::hasTable('staffs')) return [];

        $ids = $shifts->pluck('confirmed_by_staff_id')->map('intval')->filter()->unique()->values()->all();
        if (!$ids) return [];

        try {
            return DB::table('staffs')
                ->whereIn('staff_id', $ids)
                ->pluck('staff_name', 'staff_id')
                ->mapWithKeys(fn ($name, $id) => [(int)$id => (string)$name])
                ->all();
        } catch (Throwable $error) {
            return [];
        }
    }
}
