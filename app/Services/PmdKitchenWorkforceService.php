<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Aggregate Kitchen workforce authority for ETA and Owner/Manager surfaces.
 *
 * PMD access/RBAC roles are intentionally separate. A roster person may have
 * no PMD account at all; staff_id only links optional attendance data.
 */
class PmdKitchenWorkforceService
{
    public const KITCHEN_ROLES = [
        'Head Chef',
        'Chef',
        'Kitchen Assistant',
        'Prep',
        'Dishwasher / Support',
    ];

    public function ready(): bool
    {
        return Schema::hasTable('pmd_operational_people')
            && Schema::hasTable('pmd_operational_shifts')
            && Schema::hasTable('pmd_operational_shift_people');
    }

    public function snapshot(int $locationId, ?Carbon $at = null): array
    {
        $locationId = max(1, $locationId);
        $at = $at ?: now();
        $base = [
            'source' => 'unknown',
            'shift_id' => null,
            'shift_label' => null,
            'confirmed' => false,
            'expected_count' => null,
            'actual_count' => null,
            'missing_count' => 0,
            'role_counts' => [],
            'planned_role_counts' => [],
            'has_roster' => false,
            'has_plan' => false,
            'confidence' => 'low',
        ];
        if (!$this->ready()) return $base;

        try {
            $base['has_roster'] = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('department', 'kitchen')
                ->where('is_active', 1)
                ->exists();

            $shift = $this->currentShift($locationId, $at);
            if ($shift) {
                $base['shift_id'] = (int)$shift->id;
                $base['shift_label'] = (string)$shift->label;
                $base['has_plan'] = true;

                $people = DB::table('pmd_operational_shift_people')
                    ->where('shift_id', (int)$shift->id)
                    ->where('department_snapshot', 'kitchen')
                    ->orderBy('id')
                    ->get();

                $plannedPeople = $people->filter(fn ($row) => empty($row->is_replacement));
                $plannedRoles = $this->roleCounts($plannedPeople);
                $base['planned_role_counts'] = $plannedRoles;
                $quickCounts = $this->decodeCounts($shift->quick_counts_json ?? null);
                $plannedCount = max($plannedPeople->count(), array_sum($quickCounts));

                if (!empty($shift->confirmed_at) || strtolower((string)$shift->status) === 'confirmed') {
                    $present = $people->filter(function ($row) {
                        return in_array(strtolower((string)$row->attendance_status), ['present', 'replacement'], true);
                    });
                    $actualRoles = $this->roleCounts($present);
                    foreach ($quickCounts as $role => $count) {
                        $actualRoles[$role] = max((int)($actualRoles[$role] ?? 0), (int)$count);
                    }
                    $actualCount = max($present->count(), array_sum($quickCounts));
                    $expected = max($plannedCount, $actualCount);

                    return array_merge($base, [
                        'source' => 'confirmed_shift',
                        'confirmed' => true,
                        'expected_count' => $expected ?: null,
                        'actual_count' => $actualCount,
                        'missing_count' => max(0, $expected - $actualCount),
                        'role_counts' => $actualRoles,
                        'confidence' => 'high',
                    ]);
                }

                // Attendance is optional and only valid for Kitchen roster people
                // explicitly linked to a PMD staff account.
                $attendance = $this->attendanceSnapshot($locationId, $at);
                if ($attendance['actual_count'] !== null) {
                    $expected = $plannedCount ?: $attendance['actual_count'];
                    return array_merge($base, [
                        'source' => 'attendance',
                        'expected_count' => $expected ?: null,
                        'actual_count' => $attendance['actual_count'],
                        'missing_count' => max(0, $expected - $attendance['actual_count']),
                        'role_counts' => $attendance['role_counts'],
                        'confidence' => 'medium',
                    ]);
                }

                if ($plannedCount > 0) {
                    return array_merge($base, [
                        'source' => 'planned_shift',
                        'expected_count' => $plannedCount,
                        'actual_count' => null,
                        'role_counts' => $plannedRoles,
                        'confidence' => 'medium',
                    ]);
                }
            }

            $attendance = $this->attendanceSnapshot($locationId, $at);
            if ($attendance['actual_count'] !== null) {
                return array_merge($base, [
                    'source' => 'attendance',
                    'actual_count' => $attendance['actual_count'],
                    'role_counts' => $attendance['role_counts'],
                    'confidence' => 'medium',
                ]);
            }

            $baseline = $this->baselineCount();
            if ($baseline > 0) {
                return array_merge($base, [
                    'source' => 'baseline',
                    'expected_count' => $baseline,
                    'actual_count' => null,
                    'confidence' => 'low',
                ]);
            }
        } catch (\Throwable $error) {
            \Log::warning('PMD_KITCHEN_WORKFORCE_SNAPSHOT_FAILED', [
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);
        }

        return $base;
    }

    public function currentShift(int $locationId, ?Carbon $at = null)
    {
        if (!$this->ready()) return null;
        $at = $at ?: now();
        $today = $at->toDateString();
        $yesterday = $at->copy()->subDay()->toDateString();
        $time = $at->format('H:i:s');

        $rows = DB::table('pmd_operational_shifts')
            ->where('location_id', max(1, $locationId))
            ->whereIn('shift_date', [$yesterday, $today])
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->orderBy('shift_date')
            ->orderByRaw('CASE WHEN starts_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get();
        if ($rows->isEmpty()) return null;

        foreach ($rows as $row) {
            $date = Carbon::parse($row->shift_date)->toDateString();
            $start = $row->starts_at ? substr((string)$row->starts_at, 0, 8) : null;
            $end = $row->ends_at ? substr((string)$row->ends_at, 0, 8) : null;
            if (!$start && !$end && $date === $today) return $row;
            if ($date === $today) {
                if ($start && !$end && $time >= $start) return $row;
                if (!$start && $end && $time < $end) return $row;
                if ($start && $end && $end > $start && $time >= $start && $time < $end) return $row;
                if ($start && $end && $end <= $start && $time >= $start) return $row;
            }
            if ($date === $yesterday && $start && $end && $end <= $start && $time < $end) return $row;
        }

        $todayRows = $rows->filter(fn ($row) => Carbon::parse($row->shift_date)->toDateString() === $today)->values();
        if ($todayRows->isEmpty()) return null;
        $upcoming = $todayRows->first(fn ($row) => $row->starts_at && substr((string)$row->starts_at, 0, 8) > $time);
        return $upcoming ?: $todayRows->last();
    }

    public function todayCard(int $locationId): array
    {
        $snapshot = $this->snapshot($locationId);
        $shift = $snapshot['shift_id']
            ? DB::table('pmd_operational_shifts')->where('id', (int)$snapshot['shift_id'])->first()
            : null;
        $people = collect();
        if ($shift) {
            $people = DB::table('pmd_operational_shift_people')
                ->where('shift_id', (int)$shift->id)
                ->where('department_snapshot', 'kitchen')
                ->orderBy('id')
                ->get()
                ->map(function ($row) {
                    return [
                        'id' => (int)$row->id,
                        'person_id' => $row->person_id ? (int)$row->person_id : null,
                        'name' => (string)$row->display_name_snapshot,
                        'job_role' => (string)($row->job_role_snapshot ?: 'Kitchen'),
                        'attendance_status' => (string)$row->attendance_status,
                        'is_replacement' => (bool)$row->is_replacement,
                    ];
                })->values();
        }

        return [
            'ready' => $this->ready(),
            'snapshot' => $snapshot,
            'shift' => $shift,
            'people' => $people->all(),
            'needs_confirmation' => !$snapshot['confirmed'],
            'quick_roles' => self::KITCHEN_ROLES,
        ];
    }

    public function roleOptions(): array
    {
        return self::KITCHEN_ROLES;
    }

    protected function roleCounts($rows): array
    {
        $counts = [];
        foreach ($rows as $row) {
            $role = trim((string)($row->job_role_snapshot ?? '')) ?: 'Kitchen';
            $counts[$role] = ($counts[$role] ?? 0) + 1;
        }
        return $counts;
    }

    protected function attendanceSnapshot(int $locationId, Carbon $at): array
    {
        $empty = ['actual_count' => null, 'role_counts' => []];
        if (!Schema::hasTable('staff_attendance') || !Schema::hasColumn('staff_attendance', 'staff_id')) return $empty;
        if (!Schema::hasColumn('staff_attendance', 'check_in_time')) return $empty;

        $linked = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('department', 'kitchen')
            ->where('is_active', 1)
            ->whereNotNull('staff_id')
            ->get(['staff_id', 'job_role']);
        if ($linked->isEmpty()) return $empty;

        $staffIds = $linked->pluck('staff_id')->map('intval')->filter()->unique()->values()->all();
        if (!$staffIds) return $empty;

        $query = DB::table('staff_attendance')
            ->whereIn('staff_id', $staffIds)
            ->whereDate('check_in_time', $at->toDateString())
            ->where('check_in_time', '<=', $at);
        if (Schema::hasColumn('staff_attendance', 'location_id')) $query->where('location_id', $locationId);
        if (Schema::hasColumn('staff_attendance', 'check_out_time')) {
            $query->where(function ($q) use ($at) {
                $q->whereNull('check_out_time')->orWhere('check_out_time', '>', $at);
            });
        }

        $activeIds = $query->pluck('staff_id')->map('intval')->filter()->unique()->values();
        if ($activeIds->isEmpty()) return $empty;
        $rolesByStaff = $linked->keyBy(fn ($row) => (int)$row->staff_id);
        $roleCounts = [];
        foreach ($activeIds as $staffId) {
            $person = $rolesByStaff->get((int)$staffId);
            $role = trim((string)($person->job_role ?? '')) ?: 'Kitchen';
            $roleCounts[$role] = ($roleCounts[$role] ?? 0) + 1;
        }
        return ['actual_count' => $activeIds->count(), 'role_counts' => $roleCounts];
    }

    protected function decodeCounts($raw): array
    {
        $data = is_array($raw) ? $raw : json_decode((string)$raw, true);
        if (!is_array($data)) $data = [];
        $clean = [];
        foreach ($data as $role => $count) {
            $count = max(0, min(100, (int)$count));
            if ($count > 0) $clean[trim((string)$role) ?: 'Kitchen'] = $count;
        }
        return $clean;
    }

    protected function baselineCount(): int
    {
        try {
            if (!Schema::hasTable('settings')) return 0;
            $query = DB::table('settings')->where('item', 'pmd_kitchen_baseline_staff');
            if (Schema::hasColumn('settings', 'setting_id')) $query->orderByDesc('setting_id');
            return max(0, min(100, (int)$query->value('value')));
        } catch (\Throwable $error) {
            return 0;
        }
    }
}
