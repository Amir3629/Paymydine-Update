<?php

namespace App\Services\AI;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

/**
 * Small, deterministic read authority for one named PMD team member's recorded
 * attendance hours. This exists so Admin AI does not need to infer cumulative
 * hours from a large rota payload.
 *
 * It never exposes contact, credential, payroll or private profile fields and
 * is never registered with Guest AI.
 *
 * IMPORTANT: workforce attendance reads stay on the already-live, verified
 * tenant request connection and use Laravel's canonical logical table names.
 * The tenant connection owns the configured PMD table prefix, exactly like the
 * existing Staff_attendance_model and kitchen workforce authority. Do not add a
 * second physical-table resolver here: that creates a parallel schema authority.
 */
final class PmdWorkforcePersonHoursService
{
    private const CONNECTION = 'tenant';

    private ?string $resolvedDatabase = null;

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
            $person = $this->table('pmd_operational_people')
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
            $coverageQuery = $this->table('staff_attendance')
                ->where('staff_id', $staffId)
                ->whereNotNull('check_in_time');
            $this->applyLocationScope($coverageQuery, $locationId);
            $coverageStart = $coverageQuery->min('check_in_time');
            $coverage = $coverageStart ? Carbon::parse((string)$coverageStart) : null;
            $metric['attendance_coverage_start'] = $coverage ? $coverage->toDateTimeString() : null;
            $metric['attendance_coverage_complete_for_range'] = $coverage
                ? $coverage->lte($start)
                : false;

            $query = $this->table('staff_attendance')
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
     * A successful zero-row read still proves the attendance source exists.
     * Laravel applies the verified tenant connection's canonical PMD prefix.
     */
    private function attendanceReady(): bool
    {
        try {
            $this->table('staff_attendance')
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
            $ids = $this->table('staffs')
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

    /**
     * Use PMD's existing logical relation names and let the verified Laravel
     * tenant connection apply its configured prefix exactly once. This matches
     * the canonical Staff_attendance_model and existing workforce services.
     */
    private function table(string $logical)
    {
        if (!preg_match('/^[A-Za-z0-9_]+$/', $logical)) {
            throw new RuntimeException('PMD workforce logical table name is invalid.');
        }

        return $this->db()->table($logical);
    }

    /**
     * Use the already-live request tenant connection. The request tenant and
     * active database must agree before any workforce row is read. We never
     * mutate the default connection or reconstruct credentials here.
     */
    private function db()
    {
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $database = trim((string)($tenant->database ?? ''));
        if ($database === '') {
            throw new RuntimeException('PMD tenant context is unavailable for workforce attendance.');
        }
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $database)) {
            throw new RuntimeException('PMD tenant database identity is invalid.');
        }

        $connection = DB::connection(self::CONNECTION);
        $connection->getPdo();
        $actualDatabase = trim((string)$connection->getDatabaseName());
        if ($actualDatabase === '' || strcasecmp($actualDatabase, $database) !== 0) {
            throw new RuntimeException('PMD live tenant connection does not match request tenant.');
        }

        $this->resolvedDatabase = $actualDatabase;
        return $connection;
    }

    private function failureReason(Throwable $error): string
    {
        if (!$error instanceof RuntimeException) return 'database_error';

        $message = $error->getMessage();
        if (str_contains($message, 'does not match request tenant')) return 'tenant_database_mismatch';
        if (str_contains($message, 'tenant context is unavailable')) return 'tenant_context_unavailable';
        if (str_contains($message, 'database identity is invalid')) return 'tenant_database_identity_invalid';
        if (str_contains($message, 'logical table name is invalid')) return 'logical_relation_invalid';

        return 'runtime_guard_failed';
    }

    private function logReadFailure(string $stage, int $personId, int $locationId, Throwable $error): void
    {
        $database = $this->resolvedDatabase;
        if ($database === null && app()->bound('tenant')) {
            $tenant = app('tenant');
            $database = trim((string)($tenant->database ?? '')) ?: null;
        }

        logger()->warning('PMD workforce person-hours read failed', [
            'stage' => $stage,
            'connection' => self::CONNECTION,
            'database' => $database,
            'table_prefix' => $this->safeTablePrefix(),
            'person_id' => $personId,
            'location_id' => $locationId,
            'type' => get_class($error),
            'error_code' => (string)$error->getCode(),
            'reason' => $this->failureReason($error),
        ]);
    }

    private function safeTablePrefix(): ?string
    {
        try {
            return (string)DB::connection(self::CONNECTION)->getTablePrefix();
        } catch (Throwable $ignored) {
            return null;
        }
    }
}
