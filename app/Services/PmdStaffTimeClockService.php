<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * PMD_STAFF_TIME_CLOCK_V1
 *
 * Staff Portal clock-in/out authority built on the existing staff_attendance
 * table. Planned rota and recorded attendance remain separate concerns:
 * pmd_operational_* says who should work, staff_attendance says who actually
 * clocked in and out.
 */
class PmdStaffTimeClockService
{
    public const SOURCE = 'staff_portal';
    public const RESTAURANT_DAY_START_HOUR = 6;

    public function ready(): bool
    {
        return Schema::hasTable('staff_attendance')
            && Schema::hasColumn('staff_attendance', 'staff_id')
            && Schema::hasColumn('staff_attendance', 'check_in_time')
            && Schema::hasColumn('staff_attendance', 'check_out_time');
    }

    public function state(int $staffId, int $locationId, int $personId = 0, ?Carbon $at = null): array
    {
        $at = $at ?: now();
        $base = [
            'ready' => $this->ready(),
            'active' => false,
            'active_id' => null,
            'check_in_at' => null,
            'check_in_label' => null,
            'elapsed_seconds' => 0,
            'latest_check_out_at' => null,
            'latest_check_out_label' => null,
            'latest_hours' => null,
            'scheduled' => null,
            'month_worked_hours' => null,
            'restaurant_day' => $this->restaurantDayStart($at)->toDateString(),
        ];

        if (!$base['ready'] || $staffId < 1 || $locationId < 1) return $base;

        $active = $this->attendanceQuery($staffId, $locationId)
            ->whereNull('check_out_time')
            ->orderByDesc('check_in_time')
            ->first();

        $dayStart = $this->restaurantDayStart($at);
        $dayEnd = $dayStart->copy()->addDay();
        $latest = $this->attendanceQuery($staffId, $locationId)
            ->whereBetween('check_in_time', [$dayStart->toDateTimeString(), $dayEnd->toDateTimeString()])
            ->whereNotNull('check_out_time')
            ->orderByDesc('check_out_time')
            ->first();

        $scheduled = $this->scheduledShift($staffId, $locationId, $personId, $at);
        if ($scheduled) $base['scheduled'] = $scheduled;

        if ($active) {
            try {
                $checkIn = Carbon::parse($active->check_in_time);
                $base['active'] = true;
                $base['active_id'] = (int)($active->attendance_id ?? 0) ?: null;
                $base['check_in_at'] = $checkIn->toIso8601String();
                $base['check_in_label'] = $checkIn->format('H:i');
                $base['elapsed_seconds'] = max(0, $checkIn->diffInSeconds($at));
            } catch (\Throwable $error) {
            }
        }

        if ($latest) {
            try {
                $checkOut = Carbon::parse($latest->check_out_time);
                $base['latest_check_out_at'] = $checkOut->toIso8601String();
                $base['latest_check_out_label'] = $checkOut->format('H:i');
                $base['latest_hours'] = $this->workedHoursForRecord($latest);
            } catch (\Throwable $error) {
            }
        }

        $base['month_worked_hours'] = $this->workedHoursForMonth(
            $staffId,
            $locationId,
            $at->copy()->startOfMonth(),
            $at->copy()->endOfMonth()
        );

        return $base;
    }

    public function clockIn(int $staffId, int $locationId, int $personId = 0, ?Carbon $at = null): array
    {
        if (!$this->ready()) throw new RuntimeException('Time clock is not available for this restaurant yet.');
        if ($staffId < 1 || $locationId < 1) throw new RuntimeException('Your PMD Team account is not connected to this restaurant.');

        $at = $at ?: now();
        $scheduled = $this->scheduledShift($staffId, $locationId, $personId, $at);

        DB::transaction(function () use ($staffId, $locationId, $personId, $at, $scheduled) {
            $open = $this->attendanceQuery($staffId, $locationId)
                ->whereNull('check_out_time')
                ->lockForUpdate()
                ->orderByDesc('check_in_time')
                ->first();

            if ($open) throw new RuntimeException('Your shift is already running.');

            $values = [
                'staff_id' => $staffId,
                'check_in_time' => $at->toDateTimeString(),
                'check_out_time' => null,
            ];

            if ($this->hasColumn('location_id')) $values['location_id'] = $locationId;
            if ($this->hasColumn('status')) $values['status'] = 'checked_in';
            if ($this->hasColumn('verification_method')) $values['verification_method'] = self::SOURCE;
            if ($this->hasColumn('device_type')) $values['device_type'] = self::SOURCE;
            if ($this->hasColumn('created_at')) $values['created_at'] = $at->toDateTimeString();
            if ($this->hasColumn('updated_at')) $values['updated_at'] = $at->toDateTimeString();
            if ($this->hasColumn('metadata')) {
                $values['metadata'] = json_encode([
                    'source' => self::SOURCE,
                    'person_id' => $personId > 0 ? $personId : null,
                    'shift_id' => $scheduled['id'] ?? null,
                    'restaurant_day' => $this->restaurantDayStart($at)->toDateString(),
                    'planned_start' => $scheduled['start_at'] ?? null,
                    'planned_end' => $scheduled['end_at'] ?? null,
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            }

            DB::table('staff_attendance')->insert($values);
        });

        return $this->state($staffId, $locationId, $personId, $at);
    }

    public function clockOut(int $staffId, int $locationId, int $personId = 0, ?Carbon $at = null): array
    {
        if (!$this->ready()) throw new RuntimeException('Time clock is not available for this restaurant yet.');
        if ($staffId < 1 || $locationId < 1) throw new RuntimeException('Your PMD Team account is not connected to this restaurant.');

        $at = $at ?: now();

        DB::transaction(function () use ($staffId, $locationId, $at) {
            $open = $this->attendanceQuery($staffId, $locationId)
                ->whereNull('check_out_time')
                ->lockForUpdate()
                ->orderByDesc('check_in_time')
                ->first();

            if (!$open) throw new RuntimeException('No running shift was found.');

            $checkIn = Carbon::parse($open->check_in_time);
            if ($at->lt($checkIn)) throw new RuntimeException('The current time is before your check-in time.');

            $hours = round(max(0, $checkIn->diffInSeconds($at)) / 3600, 2);
            $values = ['check_out_time' => $at->toDateTimeString()];
            if ($this->hasColumn('hours_worked')) $values['hours_worked'] = $hours;
            if ($this->hasColumn('status')) $values['status'] = 'checked_out';
            if ($this->hasColumn('updated_at')) $values['updated_at'] = $at->toDateTimeString();
            if ($this->hasColumn('metadata')) {
                $metadata = $this->decodeMetadata($open->metadata ?? null);
                $metadata['checkout_source'] = self::SOURCE;
                $metadata['checked_out_at'] = $at->toIso8601String();
                $values['metadata'] = json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            }

            $key = (int)($open->attendance_id ?? 0);
            if ($key > 0) {
                DB::table('staff_attendance')->where('attendance_id', $key)->update($values);
            } else {
                DB::table('staff_attendance')
                    ->where('staff_id', $staffId)
                    ->where('check_in_time', $open->check_in_time)
                    ->whereNull('check_out_time')
                    ->update($values);
            }
        });

        return $this->state($staffId, $locationId, $personId, $at);
    }

    /**
     * Live Owner/Manager view: presence is derived from active staff_attendance,
     * while "missing" means scheduled right now but not clocked in.
     */
    public function locationSnapshot(int $locationId, ?Carbon $at = null): array
    {
        $at = $at ?: now();
        $base = [
            'ready' => $this->ready(),
            'generated_at' => $at->toIso8601String(),
            'present_now' => 0,
            'missing_now' => 0,
            'people' => [],
        ];

        if (!$base['ready'] || $locationId < 1 || !Schema::hasTable('pmd_operational_people')) return $base;

        $people = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->whereNotNull('staff_id')
            ->get(['id', 'staff_id', 'display_name']);
        if ($people->isEmpty()) return $base;

        $staffIds = $people->pluck('staff_id')->map('intval')->filter()->unique()->values()->all();
        $activeQuery = DB::table('staff_attendance')
            ->whereIn('staff_id', $staffIds)
            ->whereNull('check_out_time');
        if ($this->hasColumn('location_id')) {
            $activeQuery->where(function ($query) use ($locationId) {
                $query->where('location_id', $locationId)->orWhereNull('location_id');
            });
        }
        $activeRows = $activeQuery->orderByDesc('check_in_time')->get()->unique('staff_id')->keyBy('staff_id');

        $dayStart = $this->restaurantDayStart($at);
        $dayEnd = $dayStart->copy()->addDay();
        $finishedQuery = DB::table('staff_attendance')
            ->whereIn('staff_id', $staffIds)
            ->whereBetween('check_in_time', [$dayStart->toDateTimeString(), $dayEnd->toDateTimeString()])
            ->whereNotNull('check_out_time');
        if ($this->hasColumn('location_id')) {
            $finishedQuery->where(function ($query) use ($locationId) {
                $query->where('location_id', $locationId)->orWhereNull('location_id');
            });
        }
        $finishedRows = $finishedQuery->orderByDesc('check_out_time')->get()->unique('staff_id')->keyBy('staff_id');

        $scheduledStaffIds = $this->scheduledNowStaffIds($locationId, $at);
        $scheduledLookup = array_fill_keys($scheduledStaffIds, true);
        $present = 0;
        $missing = 0;
        $rows = [];

        foreach ($people as $person) {
            $staffId = (int)$person->staff_id;
            $active = $activeRows->get($staffId);
            $finished = $finishedRows->get($staffId);
            $scheduledNow = isset($scheduledLookup[$staffId]);
            $state = 'off';
            $since = null;
            $lastOut = null;

            if ($active) {
                $state = 'working';
                $present++;
                try { $since = Carbon::parse($active->check_in_time)->format('H:i'); } catch (\Throwable $error) {}
            } elseif ($scheduledNow) {
                $state = 'missing';
                $missing++;
            } elseif ($finished) {
                $state = 'finished';
                try { $lastOut = Carbon::parse($finished->check_out_time)->format('H:i'); } catch (\Throwable $error) {}
            }

            $rows[] = [
                'person_id' => (int)$person->id,
                'staff_id' => $staffId,
                'name' => (string)$person->display_name,
                'state' => $state,
                'scheduled_now' => $scheduledNow,
                'since' => $since,
                'last_out' => $lastOut,
            ];
        }

        $base['present_now'] = $present;
        $base['missing_now'] = $missing;
        $base['people'] = $rows;
        return $base;
    }

    public function workedHoursForMonth(int $staffId, int $locationId, Carbon $start, Carbon $end): float
    {
        if (!$this->ready() || $staffId < 1) return 0.0;

        $query = $this->attendanceQuery($staffId, $locationId)
            ->whereBetween('check_in_time', [
                $start->copy()->startOfDay()->toDateTimeString(),
                $end->copy()->endOfDay()->toDateTimeString(),
            ])
            ->whereNotNull('check_out_time')
            ->orderBy('check_in_time');

        if ($this->hasColumn('hours_worked')) {
            $query->addSelect('hours_worked');
        }
        $query->addSelect(['attendance_id', 'check_in_time', 'check_out_time']);

        return round($query->get()->sum(function ($row) {
            return $this->workedHoursForRecord($row);
        }), 2);
    }

    private function attendanceQuery(int $staffId, int $locationId)
    {
        $query = DB::table('staff_attendance')->where('staff_id', $staffId);
        if ($this->hasColumn('location_id')) {
            $query->where(function ($scope) use ($locationId) {
                $scope->where('location_id', $locationId)->orWhereNull('location_id');
            });
        }
        return $query;
    }

    private function scheduledShift(int $staffId, int $locationId, int $personId, Carbon $at): ?array
    {
        if (!Schema::hasTable('pmd_operational_people')
            || !Schema::hasTable('pmd_operational_shifts')
            || !Schema::hasTable('pmd_operational_shift_people')) {
            return null;
        }

        $personIds = collect([$personId]);
        if ($staffId > 0) {
            $personIds = $personIds->merge(
                DB::table('pmd_operational_people')
                    ->where('location_id', $locationId)
                    ->where('staff_id', $staffId)
                    ->pluck('id')
            );
        }
        $personIds = $personIds->map('intval')->filter()->unique()->values()->all();
        if (!$personIds) return null;

        $workDate = $this->restaurantDayStart($at)->toDateString();
        $rows = DB::table('pmd_operational_shift_people as assignment')
            ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
            ->whereIn('assignment.person_id', $personIds)
            ->where('shift.location_id', $locationId)
            ->whereDate('shift.shift_date', $workDate)
            ->whereNotIn('shift.status', ['cancelled', 'canceled'])
            ->select(['shift.id', 'shift.shift_date', 'shift.label', 'shift.starts_at', 'shift.ends_at'])
            ->orderBy('shift.starts_at')
            ->get();

        if ($rows->isEmpty()) return null;
        $best = null;
        $bestDistance = PHP_INT_MAX;
        foreach ($rows as $row) {
            [$startAt, $endAt] = $this->shiftInterval($row);
            $active = $at->gte($startAt) && $at->lt($endAt);
            $distance = $active ? 0 : min(abs($at->diffInSeconds($startAt, false)), abs($at->diffInSeconds($endAt, false)));
            if ($best === null || $distance < $bestDistance) {
                $bestDistance = $distance;
                $best = [
                    'id' => (int)$row->id,
                    'label' => trim((string)$row->label) ?: 'Shift',
                    'date' => (string)$row->shift_date,
                    'start' => $row->starts_at ? substr((string)$row->starts_at, 0, 5) : null,
                    'end' => $row->ends_at ? substr((string)$row->ends_at, 0, 5) : null,
                    'start_at' => $startAt->toIso8601String(),
                    'end_at' => $endAt->toIso8601String(),
                    'active_now' => $active,
                ];
            }
        }

        return $best;
    }

    private function scheduledNowStaffIds(int $locationId, Carbon $at): array
    {
        if (!Schema::hasTable('pmd_operational_shifts')
            || !Schema::hasTable('pmd_operational_shift_people')
            || !Schema::hasTable('pmd_operational_people')) {
            return [];
        }

        $workDate = $this->restaurantDayStart($at)->toDateString();
        $shiftIds = DB::table('pmd_operational_shifts')
            ->where('location_id', $locationId)
            ->whereDate('shift_date', $workDate)
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->get(['id', 'shift_date', 'starts_at', 'ends_at'])
            ->filter(function ($shift) use ($at) {
                [$startAt, $endAt] = $this->shiftInterval($shift);
                return $at->gte($startAt) && $at->lt($endAt);
            })
            ->pluck('id')
            ->map('intval')
            ->all();
        if (!$shiftIds) return [];

        return DB::table('pmd_operational_shift_people as assignment')
            ->join('pmd_operational_people as person', 'person.id', '=', 'assignment.person_id')
            ->whereIn('assignment.shift_id', $shiftIds)
            ->where('person.location_id', $locationId)
            ->where('person.is_active', 1)
            ->whereNotNull('person.staff_id')
            ->pluck('person.staff_id')
            ->map('intval')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function shiftInterval($shift): array
    {
        $date = Carbon::parse((string)$shift->shift_date)->startOfDay();
        $startMinutes = $this->minutesOfDay($shift->starts_at ?? null);
        $endMinutes = $this->minutesOfDay($shift->ends_at ?? null);
        if ($startMinutes === null) $startMinutes = self::RESTAURANT_DAY_START_HOUR * 60;
        if ($endMinutes === null) $endMinutes = $startMinutes + (8 * 60);

        $startOffset = $startMinutes < self::RESTAURANT_DAY_START_HOUR * 60 ? 1440 + $startMinutes : $startMinutes;
        $endOffset = $endMinutes < self::RESTAURANT_DAY_START_HOUR * 60 ? 1440 + $endMinutes : $endMinutes;
        if ($endOffset <= $startOffset) $endOffset += 1440;

        return [
            $date->copy()->addMinutes($startOffset),
            $date->copy()->addMinutes($endOffset),
        ];
    }

    private function restaurantDayStart(Carbon $at): Carbon
    {
        $start = $at->copy()->startOfDay()->addHours(self::RESTAURANT_DAY_START_HOUR);
        if ($at->lt($start)) $start->subDay();
        return $start;
    }

    private function minutesOfDay($value): ?int
    {
        $value = trim((string)$value);
        if ($value === '') return null;
        $parts = explode(':', $value);
        if (count($parts) < 2) return null;
        return max(0, min(1439, ((int)$parts[0] * 60) + (int)$parts[1]));
    }

    private function workedHoursForRecord($row): float
    {
        if ($this->hasColumn('hours_worked') && isset($row->hours_worked) && $row->hours_worked !== null && $row->hours_worked !== '') {
            return max(0, (float)$row->hours_worked);
        }
        if (empty($row->check_in_time) || empty($row->check_out_time)) return 0.0;
        try {
            $checkIn = Carbon::parse($row->check_in_time);
            $checkOut = Carbon::parse($row->check_out_time);
            if (!$checkOut->gt($checkIn)) return 0.0;
            return round($checkIn->diffInSeconds($checkOut) / 3600, 2);
        } catch (\Throwable $error) {
            return 0.0;
        }
    }

    private function decodeMetadata($raw): array
    {
        if (is_array($raw)) return $raw;
        $decoded = json_decode((string)$raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function hasColumn(string $column): bool
    {
        static $cache = [];
        if (!array_key_exists($column, $cache)) {
            $cache[$column] = Schema::hasTable('staff_attendance') && Schema::hasColumn('staff_attendance', $column);
        }
        return $cache[$column];
    }
}
