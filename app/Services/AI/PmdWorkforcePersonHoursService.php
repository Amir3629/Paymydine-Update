<?php

namespace App\Services\AI;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
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
 * IMPORTANT: workforce attendance reads use a dedicated, freshly reconstructed
 * tenant connection built from the canonical request tenant. This prevents a
 * prior Admin AI tool from leaving a stale/shared connection object behind and
 * makes cross-tenant drift fail closed before any staff record is read.
 */
final class PmdWorkforcePersonHoursService
{
    private const BASE_CONNECTION = 'tenant';
    private const RUNTIME_CONNECTION = 'pmd_ai_workforce_tenant';

    private ?string $resolvedConnectionName = null;
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
     * A successful zero-row read still proves the attendance source exists.
     * The connection itself is reconstructed and tenant-verified by db().
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

    /**
     * Build a private workforce-read connection from the canonical tenant object
     * attached by TenantDatabaseMiddleware. Never fall back to the central DB.
     */
    private function db()
    {
        if ($this->resolvedConnectionName !== null) {
            return DB::connection($this->resolvedConnectionName);
        }

        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $database = trim((string)($tenant->database ?? ''));
        if ($database === '') {
            throw new RuntimeException('PMD tenant context is unavailable for workforce attendance.');
        }
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $database)) {
            throw new RuntimeException('PMD tenant database identity is invalid.');
        }

        $config = (array)Config::get('database.connections.'.self::BASE_CONNECTION, []);
        if (!$config) {
            throw new RuntimeException('PMD tenant database configuration is unavailable.');
        }

        $config['database'] = $database;
        $this->applyTenantConnectionField($config, 'host', $tenant, ['db_host']);
        $this->applyTenantConnectionField($config, 'port', $tenant, ['db_port']);
        $this->applyTenantConnectionField($config, 'username', $tenant, ['db_user', 'db_username']);
        $this->applyTenantConnectionField($config, 'password', $tenant, ['db_pass', 'db_password'], true);

        Config::set('database.connections.'.self::RUNTIME_CONNECTION, $config);
        DB::purge(self::RUNTIME_CONNECTION);

        $connection = DB::connection(self::RUNTIME_CONNECTION);
        $connection->getPdo();
        $actualDatabase = trim((string)$connection->getDatabaseName());
        if ($actualDatabase === '' || strcasecmp($actualDatabase, $database) !== 0) {
            DB::disconnect(self::RUNTIME_CONNECTION);
            throw new RuntimeException('PMD workforce tenant connection verification failed.');
        }

        $this->resolvedConnectionName = self::RUNTIME_CONNECTION;
        $this->resolvedDatabase = $actualDatabase;

        return $connection;
    }

    private function applyTenantConnectionField(
        array &$config,
        string $target,
        object $tenant,
        array $sourceFields,
        bool $allowEmpty = false
    ): void {
        foreach ($sourceFields as $field) {
            if (!property_exists($tenant, $field)) continue;
            $value = $tenant->{$field};
            if ($value === null) continue;
            if (!$allowEmpty && trim((string)$value) === '') continue;
            $config[$target] = $value;
            return;
        }
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
            'connection' => $this->resolvedConnectionName ?: self::RUNTIME_CONNECTION,
            'database' => $database,
            'person_id' => $personId,
            'location_id' => $locationId,
            'type' => get_class($error),
            'error_code' => (string)$error->getCode(),
        ]);
    }
}
