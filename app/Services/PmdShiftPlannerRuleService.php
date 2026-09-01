<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_SHIFT_PLANNER_RULES_V17
 *
 * Server-side safety rules for the Shifts planner.
 *
 * - New single-person shifts that overlap/touch an existing shift for the same
 *   person are collapsed into one continuous personal coverage range.
 * - Shared shifts are never stretched for unrelated people: the selected person
 *   is detached from an overlapping shared shift and moved into the personal
 *   merged range while the other people keep their original shift unchanged.
 * - Pause defaults are enforced conservatively from the planned start/end span.
 */
class PmdShiftPlannerRuleService
{
    public function minimumBreakMinutes(?string $startsAt, ?string $endsAt): int
    {
        $window = $this->windowMinutes($startsAt, $endsAt);
        if (!$window) return 0;

        $span = max(0, $window['end'] - $window['start']);

        // General adult-rule default under ArbZG §4, applied conservatively to
        // the planned start/end span so PMD never auto-suggests too little.
        if ($span > 9 * 60) return 45;
        if ($span > 6 * 60) return 30;

        return 0;
    }

    public function normalizeBreakMinutes(?string $startsAt, ?string $endsAt, int $requested): int
    {
        // PMD_SHIFTS_PAUSE_RECOMMENDATION_ONLY_V17C
        // Start/end still drive the suggested default in the UI. Persistence
        // only sanitizes the owner's explicit choice and never raises it.
        return max(0, min(240, $requested));
    }

    /** PMD_SHIFTS_GROUP_OVERLAP_UNION_V17D
     * Normalize a new multi-person create independently for every selected person.
     *
     * The shared new shift remains intact for people without existing overlap.
     * A person with existing overlap is detached from that shared new shift, given
     * a temporary one-person clone, then passed through the existing personal-union
     * authority. This prevents a group create from stretching unrelated coworkers.
     */
    public function mergeCreateForPeople(
        int $locationId,
        string $shiftDate,
        int $newShiftId,
        array $personIds
    ): array {
        $personIds = array_values(array_unique(array_filter(array_map('intval', $personIds), function ($id) {
            return $id > 0;
        })));
        sort($personIds);

        if ($locationId < 1 || $newShiftId < 1 || !$personIds) {
            return ['merged_people' => 0, 'separated_people' => 0, 'remaining_group_people' => 0];
        }

        if (count($personIds) === 1) {
            $result = $this->mergeSinglePersonCreate(
                $locationId,
                $shiftDate,
                $newShiftId,
                (int)$personIds[0]
            );

            return [
                'merged_people' => !empty($result['merged']) ? 1 : 0,
                'separated_people' => 0,
                'remaining_group_people' => 1,
            ];
        }

        $newShift = DB::table('pmd_operational_shifts')
            ->where('id', $newShiftId)
            ->where('location_id', $locationId)
            ->whereDate('shift_date', $shiftDate)
            ->lockForUpdate()
            ->first();

        if (!$newShift) {
            return ['merged_people' => 0, 'separated_people' => 0, 'remaining_group_people' => 0];
        }

        $assignments = DB::table('pmd_operational_shift_people')
            ->where('shift_id', $newShiftId)
            ->whereIn('person_id', $personIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('person_id');

        $mergedPeople = 0;
        $separatedPeople = 0;

        foreach ($personIds as $personId) {
            $assignment = $assignments->get($personId);
            if (!$assignment) continue;

            if (!$this->personHasOverlappingCoverage(
                $locationId,
                $shiftDate,
                $newShiftId,
                $personId,
                $newShift->starts_at ?? null,
                $newShift->ends_at ?? null
            )) {
                continue;
            }

            // Remove only this person from the new shared shift. Other selected
            // people keep the exact group timing unless they independently overlap.
            DB::table('pmd_operational_shift_people')
                ->where('shift_id', $newShiftId)
                ->where('person_id', $personId)
                ->delete();

            $clone = [
                'location_id' => $locationId,
                'shift_date' => $shiftDate,
                // A create operation must extend the existing person's coverage,
                // not silently rename or rewrite that existing shift.
                'label' => '',
                'starts_at' => $newShift->starts_at,
                'ends_at' => $newShift->ends_at,
                'status' => 'planned',
                'quick_counts_json' => null,
                'confirmed_at' => null,
                'confirmed_by_staff_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('pmd_operational_shifts', 'notes')) {
                $clone['notes'] = null;
            }
            if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
                $clone['break_minutes'] = max(0, min(240, (int)($newShift->break_minutes ?? 0)));
            }

            $cloneId = (int)DB::table('pmd_operational_shifts')->insertGetId($clone);

            DB::table('pmd_operational_shift_people')->insert([
                'shift_id' => $cloneId,
                'person_id' => $personId,
                'display_name_snapshot' => (string)$assignment->display_name_snapshot,
                'department_snapshot' => (string)($assignment->department_snapshot ?: 'other'),
                'job_role_snapshot' => trim((string)($assignment->job_role_snapshot ?? '')) ?: null,
                'attendance_status' => 'planned',
                'is_replacement' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $result = $this->mergeSinglePersonCreate(
                $locationId,
                $shiftDate,
                $cloneId,
                $personId
            );

            $separatedPeople++;
            if (!empty($result['merged'])) $mergedPeople++;
        }

        $remaining = DB::table('pmd_operational_shift_people')
            ->where('shift_id', $newShiftId)
            ->count();

        if ($separatedPeople > 0) {
            if ($remaining < 1) {
                DB::table('pmd_operational_shifts')
                    ->where('id', $newShiftId)
                    ->update([
                        'status' => 'cancelled',
                        'quick_counts_json' => null,
                        'confirmed_at' => null,
                        'confirmed_by_staff_id' => null,
                        'updated_at' => now(),
                    ]);
            } else {
                DB::table('pmd_operational_shifts')
                    ->where('id', $newShiftId)
                    ->update([
                        'status' => 'planned',
                        'quick_counts_json' => null,
                        'confirmed_at' => null,
                        'confirmed_by_staff_id' => null,
                        'updated_at' => now(),
                    ]);

                DB::table('pmd_operational_shift_people')
                    ->where('shift_id', $newShiftId)
                    ->update([
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'updated_at' => now(),
                    ]);
            }
        }

        return [
            'merged_people' => $mergedPeople,
            'separated_people' => $separatedPeople,
            'remaining_group_people' => (int)$remaining,
        ];
    }

    /**
     * Merge a newly-created one-person shift with every overlapping/touching
     * shift for that person on the same date.
     *
     * Returns ['merged' => bool, 'merged_count' => int, 'start' => ?, 'end' => ?].
     */
    public function mergeSinglePersonCreate(
        int $locationId,
        string $shiftDate,
        int $newShiftId,
        int $personId
    ): array {
        if ($locationId < 1 || $newShiftId < 1 || $personId < 1) {
            return ['merged' => false, 'merged_count' => 0, 'start' => null, 'end' => null];
        }

        $newShift = DB::table('pmd_operational_shifts')
            ->where('id', $newShiftId)
            ->where('location_id', $locationId)
            ->whereDate('shift_date', $shiftDate)
            ->lockForUpdate()
            ->first();

        if (!$newShift) {
            return ['merged' => false, 'merged_count' => 0, 'start' => null, 'end' => null];
        }

        $newWindow = $this->windowMinutes($newShift->starts_at ?? null, $newShift->ends_at ?? null);
        if (!$newWindow) {
            return ['merged' => false, 'merged_count' => 0, 'start' => null, 'end' => null];
        }

        $candidates = DB::table('pmd_operational_shift_people as assignment')
            ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
            ->where('assignment.person_id', $personId)
            ->where('shift.location_id', $locationId)
            ->whereDate('shift.shift_date', $shiftDate)
            ->where('shift.id', '<>', $newShiftId)
            ->whereNotIn('shift.status', ['cancelled', 'canceled'])
            ->whereNotNull('shift.starts_at')
            ->whereNotNull('shift.ends_at')
            ->select('shift.*')
            ->orderBy('shift.starts_at')
            ->orderBy('shift.id')
            ->lockForUpdate()
            ->get();

        if ($candidates->isEmpty()) {
            return [
                'merged' => false,
                'merged_count' => 0,
                'start' => $newWindow['start'],
                'end' => $newWindow['end'],
            ];
        }

        $remaining = [];
        foreach ($candidates as $candidate) {
            $window = $this->windowMinutes($candidate->starts_at ?? null, $candidate->ends_at ?? null);
            if (!$window) continue;
            $remaining[] = [
                'shift' => $candidate,
                'start' => $window['start'],
                'end' => $window['end'],
            ];
        }

        $cluster = [];
        $unionStart = $newWindow['start'];
        $unionEnd = $newWindow['end'];

        // Re-run until stable so chained overlaps also become one range.
        do {
            $changed = false;
            foreach ($remaining as $index => $item) {
                if ($item === null) continue;
                if ($item['start'] <= $unionEnd && $unionStart <= $item['end']) {
                    $cluster[] = $item;
                    $unionStart = min($unionStart, $item['start']);
                    $unionEnd = max($unionEnd, $item['end']);
                    $remaining[$index] = null;
                    $changed = true;
                }
            }
        } while ($changed);

        if (!$cluster) {
            return [
                'merged' => false,
                'merged_count' => 0,
                'start' => $newWindow['start'],
                'end' => $newWindow['end'],
            ];
        }

        $preservedLabel = trim((string)($newShift->label ?? ''));
        $preservedNotes = trim((string)($newShift->notes ?? ''));
        $breakMinutes = Schema::hasColumn('pmd_operational_shifts', 'break_minutes')
            ? max(0, min(240, (int)($newShift->break_minutes ?? 0)))
            : 0;

        foreach ($cluster as $item) {
            $shift = $item['shift'];
            $shiftId = (int)$shift->id;

            if ($preservedLabel === '') {
                $candidateLabel = trim((string)($shift->label ?? ''));
                if ($candidateLabel !== '') $preservedLabel = $candidateLabel;
            }
            if ($preservedNotes === '') {
                $candidateNotes = trim((string)($shift->notes ?? ''));
                if ($candidateNotes !== '') $preservedNotes = $candidateNotes;
            }
            if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
                $breakMinutes = max($breakMinutes, max(0, min(240, (int)($shift->break_minutes ?? 0))));
            }

            $assignmentCount = DB::table('pmd_operational_shift_people')
                ->where('shift_id', $shiftId)
                ->count();

            if ($assignmentCount <= 1) {
                // Pure personal shift: the new record replaces it entirely.
                DB::table('pmd_operational_shifts')
                    ->where('id', $shiftId)
                    ->update([
                        'status' => 'cancelled',
                        'quick_counts_json' => null,
                        'confirmed_at' => null,
                        'confirmed_by_staff_id' => null,
                        'updated_at' => now(),
                    ]);
            } else {
                // Shared shift: keep its timing for everybody else, remove only
                // this person, and invalidate confirmation because team geometry changed.
                DB::table('pmd_operational_shift_people')
                    ->where('shift_id', $shiftId)
                    ->where('person_id', $personId)
                    ->delete();

                DB::table('pmd_operational_shifts')
                    ->where('id', $shiftId)
                    ->update([
                        'status' => 'planned',
                        'quick_counts_json' => null,
                        'confirmed_at' => null,
                        'confirmed_by_staff_id' => null,
                        'updated_at' => now(),
                    ]);

                DB::table('pmd_operational_shift_people')
                    ->where('shift_id', $shiftId)
                    ->update([
                        'attendance_status' => 'planned',
                        'is_replacement' => 0,
                        'updated_at' => now(),
                    ]);
            }
        }

        $mergedStart = $this->minuteToDbTime($unionStart);
        $mergedEnd = $this->minuteToDbTime($unionEnd);
        // V17C: an overlap-union preserves the strongest already-planned
        // pause value, but does not manufacture a new mandatory minimum.
        $breakMinutes = max(0, min(240, $breakMinutes));

        $update = [
            'starts_at' => $mergedStart,
            'ends_at' => $mergedEnd,
            'label' => $preservedLabel,
            'status' => 'planned',
            'quick_counts_json' => null,
            'confirmed_at' => null,
            'confirmed_by_staff_id' => null,
            'updated_at' => now(),
        ];
        if (Schema::hasColumn('pmd_operational_shifts', 'notes')) {
            $update['notes'] = $preservedNotes !== '' ? $preservedNotes : null;
        }
        if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
            $update['break_minutes'] = max(0, min(240, $breakMinutes));
        }

        DB::table('pmd_operational_shifts')->where('id', $newShiftId)->update($update);
        DB::table('pmd_operational_shift_people')
            ->where('shift_id', $newShiftId)
            ->where('person_id', $personId)
            ->update([
                'attendance_status' => 'planned',
                'is_replacement' => 0,
                'updated_at' => now(),
            ]);

        return [
            'merged' => true,
            'merged_count' => count($cluster),
            'start' => $unionStart,
            'end' => $unionEnd,
        ];
    }

    private function personHasOverlappingCoverage(
        int $locationId,
        string $shiftDate,
        int $excludedShiftId,
        int $personId,
        ?string $startsAt,
        ?string $endsAt
    ): bool {
        $newWindow = $this->windowMinutes($startsAt, $endsAt);
        if (!$newWindow) return false;

        $candidates = DB::table('pmd_operational_shift_people as assignment')
            ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
            ->where('assignment.person_id', $personId)
            ->where('shift.location_id', $locationId)
            ->whereDate('shift.shift_date', $shiftDate)
            ->where('shift.id', '<>', $excludedShiftId)
            ->whereNotIn('shift.status', ['cancelled', 'canceled'])
            ->whereNotNull('shift.starts_at')
            ->whereNotNull('shift.ends_at')
            ->select(['shift.starts_at', 'shift.ends_at'])
            ->lockForUpdate()
            ->get();

        foreach ($candidates as $candidate) {
            $window = $this->windowMinutes($candidate->starts_at ?? null, $candidate->ends_at ?? null);
            if (!$window) continue;
            if ($window['start'] <= $newWindow['end'] && $newWindow['start'] <= $window['end']) {
                return true;
            }
        }

        return false;
    }

    private function windowMinutes(?string $startsAt, ?string $endsAt): ?array
    {
        $start = $this->minutesOfDay($startsAt);
        $end = $this->minutesOfDay($endsAt);
        if ($start === null || $end === null) return null;
        if ($end <= $start) $end += 1440;
        return ['start' => $start, 'end' => $end];
    }

    private function minutesOfDay(?string $clock): ?int
    {
        $clock = trim((string)$clock);
        if (!preg_match('/^([01][0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/', $clock, $match)) {
            return null;
        }
        return ((int)$match[1] * 60) + (int)$match[2];
    }

    private function minuteToDbTime(int $minutes): string
    {
        $minutes %= 1440;
        if ($minutes < 0) $minutes += 1440;
        return sprintf('%02d:%02d:00', intdiv($minutes, 60), $minutes % 60);
    }
}
