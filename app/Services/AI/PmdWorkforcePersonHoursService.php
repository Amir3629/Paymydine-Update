<?php

namespace App\Services\AI;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Small, deterministic read authority for one named PMD team member's recorded
 * attendance hours. This exists so Admin AI does not need to infer cumulative
 * hours from a large rota payload.
 *
 * It never exposes contact, credential, payroll or private profile fields and
 * is never registered with Guest AI.
 *
 * IMPORTANT: every read is pinned to the tenant connection. Admin AI may call
 * several report authorities in one turn; none of those calls may make a later
 * attendance lookup drift back to the central/default database.
 */
final class PmdWorkforcePersonHoursService
{
    private const CONNECTION = 'tenant';

    public function enrich(array $metric, array $range): array
    {
        $metric['attendance_source_available'] = false;
        $metric['attendance_identity_linked'] = false;
        $metric['attendance_identity_link_mode'] = null;
        $metric['attendance_read_ok'] = false;
        $metric['attendance_rows_found'] = 0;
        $metric['attendance_coverage_start'] = null;
        $metric['attendance_coverage_complete_for_range'] = false;
        $metric['actual_hours_authoritative'] = false;

        if (!$this->attendanceReady()) return $metric;
        $metric['attendance_source_available'] = true;

        $personId = (int)($metric['person_id'] ?? 0);
        if ($personId < 1) return $metric;

        try {
            $person = $this->db()->table('pmd_operational_people')
                ->where('id', $personId)
                ->first(['id', 'location_id', 'staff_id', 'display_name']);
        } catch (Throwable $error) {
            $this->logReadFailure('person_lookup', $personId, 0, $error);
            return $metric;
        }
        if (!$person) return $metric;

        $locationId = (int)($person->location_id ?? 0);
        if ($locationId < 1) return $metric;

        $staffId = (int)($person->staff_id ?? 0);
        $linkMode = $staffId > 0 ? 'roster_staff_id' : null;

        if ($staffId < 1) {
            $fallback = $this->uniqueStaffIdByName(
                trim((string)($person->display_name ?? ($metric['name'] ?? '')))
            );
            if ($fallback > 0) {
                $staffId = $fallback;
                $linkMode = 'exact_staff_name_fallback';
            }
        }

        if ($staffId < 1) return $metric;

        $metric['attendance_identity_linked'] = true;
        $metric['attendance_identity_link_mode'] = $linkMode;

        try {
            $start = Carbon::createFromFormat('Y-m-d', (string)($range['start_date'] ?? ''))->startOfDay();
            $endExclusive = Carbon::createFromFormat('Y-m-d', (string)($range['end_date'] ?? ''))->addDay()->startOfDay();
        } catch (Throwable $error) {
            return $metric;
        }

        try {
            // Coverage is person-specific. A different employee clocking in in
            // January does not prove that this person's attendance is complete
            // from January onward.
            $coverageQuery = $this->db()->table('staff_attendance')
                ->where('staff_id', $staffId)
                ->whereNotNull('check_in_time');
            $this->applyLocationScope($coverageQuery, $locationId);
            $coverageStart = $coverageQuery->min('check_in_time');
            $coverage = $coverageStart ? Carbon::parse((string)$coverageStart) : null;
            $metric['attendance_coverage_start'] = $coverage ? $coverage->toDateTimeString() : null;
            $metric['attendance_coverage_complete_for_range'] = $coverage
                ? $coverage->lte($start)
                : false;

            $query = $this->db()->table('staff_attendance')
                ->where('staff_id', $staffId)
                ->where('check_in_time', '<', $endExclusive)
                ->where(function ($scope) use ($start) {
                    $scope->whereNull('check_out_time')->orWhere('check_out_time', '>=', $start);
                })
                ->orderBy('check_in_time');
            $this->applyLocationScope($query, $locationId);

            $rows = $query->get(['check_in_time', 'check_out_time']);
            $metric['attendance_read_ok'] = true;
        } catch (Throwable $error) {
            $this->logReadFailure('attendance_lookup', $personId, $locationId, $error);
            return $metric;
        }

        $workedMinutes = 0;
        $workedDates = [];
        $completed = 0;
        $open = 0;
        $anomalous = 0;
        $first = null;
        $last = null;
        $rowCount = 0;

        foreach ($rows as $row) {
            if (empty($row->check_in_time)) continue;
            $rowCount++;

            try {
                $checkIn = Carbon::parse((string)$row->check_in_time);
                $checkOut = !empty($row->check_out_time)
                    ? Carbon::parse((string)$row->check_out_time)
                    : null;
            } catch (Throwable $error) {
                $anomalous++;
                continue;
            }

            if (!$checkOut) {
                $open++;
                continue;
            }
            if ($checkOut->lte($checkIn) || $checkIn->diffInMinutes($checkOut) > 24 * 60) {
                $anomalous++;
                continue;
            }

            $effectiveStart = $checkIn->lt($start) ? $start->copy() : $checkIn;
            $effectiveEnd = $checkOut->gt($endExclusive) ? $endExclusive->copy() : $checkOut;
            if ($effectiveEnd->lte($effectiveStart)) continue;

            $minutes = $effectiveStart->diffInMinutes($effectiveEnd);
            if ($minutes < 1) continue;

            $workedMinutes += $minutes;
            $completed++;
            $workedDates[$effectiveStart->toDateString()] = true;
            $first = $first ?: $checkIn->toDateTimeString();
            $last = $checkOut->toDateTimeString();
        }

        $actual = round($workedMinutes / 60, 2);
        $scheduled = round((float)($metric['scheduled_hours'] ?? 0), 2);

        $metric['actual_worked_hours'] = $actual;
        $metric['worked_days'] = count($workedDates);
        $metric['completed_attendance_sessions'] = $completed;
        $metric['open_attendance_sessions'] = $open;
        $metric['anomalous_attendance_sessions'] = $anomalous;
        $metric['attendance_rows_found'] = $rowCount;
        $metric['first_check_in'] = $first;
        $metric['last_check_out'] = $last;
        $metric['worked_vs_scheduled_hours'] = round($actual - $scheduled, 2);
        $metric['actual_hours_authoritative'] = $rowCount > 0
            && (bool)$metric['attendance_coverage_complete_for_range'];

        return $metric;
    }

    /**
     * Verify the exact tenant attendance contract with a real read rather than
     * relying on framework schema metadata. Production diagnostics showed the
     * tenant table and columns can be readable even when metadata introspection
     * returns a false negative in the long-lived Admin request. A successful
     * zero-row SELECT still proves the source exists.
     */
    private function attendanceReady(): bool
    {
        try {
            $this->db()->table('staff_attendance')
                ->select(['staff_id', 'location_id', 'check_in_time', 'check_out_time'])
                ->limit(1)
                ->get();
            return true;
        } catch (Throwable $error) {
            $this->logReadFailure('attendance_probe', 0, 0, $error);
            return false;
        }
    }

    private function uniqueStaffIdByName(string $name): int
    {
        if ($name === '') return 0;

        try {
            $ids = $this->db()->table('staffs')
                ->whereRaw('LOWER(TRIM(staff_name)) = ?', [mb_strtolower(trim($name))])
                ->limit(2)
                ->pluck('staff_id')
                ->map('intval')
                ->filter()
                ->values();
            return $ids->count() === 1 ? (int)$ids->first() : 0;
        } catch (Throwable $error) {
            $this->logReadFailure('staff_name_fallback', 0, 0, $error);
            return 0;
        }
    }

    private function applyLocationScope($query, int $locationId): void
    {
        $query->where(function ($scope) use ($locationId) {
            $scope->where('location_id', $locationId)->orWhereNull('location_id');
        });
    }

    private function db()
    {
        return DB::connection(self::CONNECTION);
    }

    private function logReadFailure(string $stage, int $personId, int $locationId, Throwable $error): void
    {
        $database = null;
        try {
            $database = (string)$this->db()->getDatabaseName();
        } catch (Throwable $ignored) {
            $database = null;
        }

        logger()->warning('PMD workforce person-hours read failed', [
            'stage' => $stage,
            'connection' => self::CONNECTION,
            'database' => $database,
            'person_id' => $personId,
            'location_id' => $locationId,
            'type' => get_class($error),
        ]);
    }
}
