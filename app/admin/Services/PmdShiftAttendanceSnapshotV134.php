<?php

namespace Admin\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134
 *
 * One read authority for the Shifts first paint and the live attendance
 * endpoint. Planned rota remains owned by pmd_operational_shifts; actual
 * presence comes only from staff_attendance.
 */
final class PmdShiftAttendanceSnapshotV134
{
    public function payload(
        int $locationId,
        Carbon $day,
        ?Collection $people = null,
        ?Collection $shifts = null
    ): array {
        $locationId = max(1, $locationId);
        $day = $day->copy()->startOfDay();

        if (!$this->ready()) {
            return [
                'ok' => true,
                'ready' => false,
                'day' => $day->toDateString(),
                'rows' => [],
                'present_now' => null,
                'missing_now' => null,
            ];
        }

        $dayStart = $day->copy()->setTime(6, 0, 0);
        $dayEnd = $dayStart->copy()->addDay();
        $now = now();
        $openRecordEnd = $now->lt($dayStart)
            ? $dayStart->copy()
            : ($now->lt($dayEnd) ? $now->copy() : $dayEnd->copy());

        $people = $people ?: DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('is_active', 1)
            ->orderBy('id')
            ->get(['id', 'staff_id', 'display_name']);

        $people = collect($people)->values();
        $peopleById = $people->keyBy(
            fn ($person) => (int)$person->id
        );

        $staffIds = $people
            ->pluck('staff_id')
            ->map('intval')
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $shifts = $shifts ?: $this->loadDayShifts(
            $locationId,
            $day
        );
        $shifts = collect($shifts)->values();

        $assignments = $this->assignmentsFor(
            $shifts
        );

        $scheduledPersonIds = $assignments
            ->pluck('person_id')
            ->map('intval')
            ->filter()
            ->unique()
            ->values();

        $activeShiftIds = collect();

        if ($day->isSameDay($now)) {
            foreach ($shifts as $shift) {
                if ($this->shiftContains($shift, $now)) {
                    $activeShiftIds->push((int)$shift->id);
                }
            }
        }

        $activeScheduledPersonIds = $activeShiftIds->isEmpty()
            ? collect()
            : $assignments
                ->whereIn('shift_id', $activeShiftIds->all())
                ->pluck('person_id')
                ->map('intval')
                ->filter()
                ->unique()
                ->values();

        $records = collect();

        if ($staffIds) {
            $query = DB::table('staff_attendance')
                ->whereIn('staff_id', $staffIds)
                ->where(
                    'check_in_time',
                    '<',
                    $dayEnd->toDateTimeString()
                )
                ->where(function ($query) use ($dayStart) {
                    $query
                        ->whereNull('check_out_time')
                        ->orWhere(
                            'check_out_time',
                            '>=',
                            $dayStart->toDateTimeString()
                        );
                });

            if (
                Schema::hasColumn(
                    'staff_attendance',
                    'location_id'
                )
            ) {
                $query->where(
                    function ($query) use ($locationId) {
                        $query
                            ->where(
                                'location_id',
                                $locationId
                            )
                            ->orWhereNull('location_id');
                    }
                );
            }

            $records = $query
                ->orderBy('check_in_time')
                ->orderBy('attendance_id')
                ->get();
        }

        $recordsByStaff = $records->groupBy(
            fn ($record) => (int)$record->staff_id
        );

        $rows = [];
        $activeStaffIds = collect();

        foreach ($people as $person) {
            $personId = (int)$person->id;
            $staffId = (int)($person->staff_id ?? 0);

            $personRecords = $staffId > 0
                ? collect(
                    $recordsByStaff->get(
                        $staffId,
                        []
                    )
                )
                : collect();

            $open = $personRecords
                ->filter(
                    fn ($record) =>
                        empty($record->check_out_time)
                )
                ->sortByDesc('attendance_id')
                ->first();

            $workedSeconds = 0;
            $lastOut = null;

            foreach ($personRecords as $record) {
                try {
                    $checkIn = Carbon::parse(
                        $record->check_in_time
                    );
                    $checkOut = $record->check_out_time
                        ? Carbon::parse(
                            $record->check_out_time
                        )
                        : $openRecordEnd->copy();

                    $from = $checkIn->gt($dayStart)
                        ? $checkIn
                        : $dayStart->copy();

                    $to = $checkOut->lt($dayEnd)
                        ? $checkOut
                        : $dayEnd->copy();

                    if ($to->gt($from)) {
                        $workedSeconds +=
                            $from->diffInSeconds($to);
                    }

                    if (
                        $record->check_out_time
                        && (
                            !$lastOut
                            || $checkOut->gt($lastOut)
                        )
                    ) {
                        $lastOut = $checkOut;
                    }
                } catch (\Throwable $error) {
                }
            }

            $scheduled = $scheduledPersonIds
                ->contains($personId);

            $state = 'off';
            $label = '';
            $checkIn = null;

            if ($open && $day->isSameDay($now)) {
                try {
                    $checkIn = Carbon::parse(
                        $open->check_in_time
                    );

                    if ($checkIn->lte($now)) {
                        $state = 'working';
                        $label =
                            'Working since '
                            .$checkIn->format('H:i');

                        if ($staffId > 0) {
                            $activeStaffIds->push(
                                $staffId
                            );
                        }
                    }
                } catch (\Throwable $error) {
                }
            } elseif ($open && $dayStart->lte($now)) {
                $state = 'open';

                try {
                    $label =
                        'Open session · '
                        .Carbon::parse(
                            $open->check_in_time
                        )->format('H:i');
                } catch (\Throwable $error) {
                    $label = 'Open session';
                }
            } elseif ($workedSeconds > 0) {
                $state = 'worked';
                $label =
                    'Worked '
                    .number_format(
                        $workedSeconds / 3600,
                        2
                    )
                    .'h';

                if ($lastOut) {
                    $label .=
                        ' · out '
                        .$lastOut->format('H:i');
                }
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
                'worked_hours' => round(
                    $workedSeconds / 3600,
                    2
                ),
                'check_in' => $checkIn
                    ? $checkIn->toIso8601String()
                    : null,
            ];
        }

        $presentNow = null;
        $missingNow = null;

        if ($day->isSameDay($now)) {
            $presentNow = $activeStaffIds
                ->unique()
                ->count();

            if ($activeScheduledPersonIds->isNotEmpty()) {
                $presentPersonIds =
                    $activeScheduledPersonIds->filter(
                        function ($personId) use (
                            $peopleById,
                            $activeStaffIds
                        ) {
                            $person = $peopleById->get(
                                (int)$personId
                            );

                            return
                                $person
                                && (
                                    (int)(
                                        $person->staff_id
                                        ?? 0
                                    )
                                    > 0
                                )
                                && $activeStaffIds->contains(
                                    (int)$person->staff_id
                                );
                        }
                    );

                $missingNow = max(
                    0,
                    $activeScheduledPersonIds->count()
                    - $presentPersonIds->count()
                );
            } else {
                $missingNow = 0;
            }
        }

        return [
            'ok' => true,
            'ready' => true,
            'day' => $day->toDateString(),
            'restaurant_day_start' =>
                $dayStart->toIso8601String(),
            'restaurant_day_end' =>
                $dayEnd->toIso8601String(),
            'server_now' => $now->toIso8601String(),
            'rows' => $rows,
            'present_now' => $presentNow,
            'missing_now' => $missingNow,
        ];
    }

    private function loadDayShifts(
        int $locationId,
        Carbon $day
    ): Collection {
        $shifts = DB::table(
            'pmd_operational_shifts'
        )
            ->where('location_id', $locationId)
            ->whereDate(
                'shift_date',
                $day->toDateString()
            )
            ->whereNotIn(
                'status',
                ['cancelled', 'canceled']
            )
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get([
                'id',
                'shift_date',
                'starts_at',
                'ends_at',
            ]);

        $ids = $shifts
            ->pluck('id')
            ->map('intval')
            ->all();

        $assignments = $ids
            ? DB::table(
                'pmd_operational_shift_people'
            )
                ->whereIn('shift_id', $ids)
                ->get([
                    'shift_id',
                    'person_id',
                ])
                ->groupBy('shift_id')
            : collect();

        return $shifts->map(
            function ($shift) use ($assignments) {
                $shift->people = collect(
                    $assignments->get(
                        (int)$shift->id,
                        []
                    )
                )->values();

                return $shift;
            }
        );
    }

    private function assignmentsFor(
        Collection $shifts
    ): Collection {
        return $shifts
            ->flatMap(
                function ($shift) {
                    $shiftId = (int)$shift->id;

                    return collect(
                        $shift->people ?? []
                    )->map(
                        static function ($assignment)
                        use ($shiftId) {
                            return (object)[
                                'shift_id' => $shiftId,
                                'person_id' => (int)(
                                    $assignment->person_id
                                    ?? 0
                                ),
                            ];
                        }
                    );
                }
            )
            ->values();
    }

    private function ready(): bool
    {
        return
            Schema::hasTable(
                'pmd_operational_people'
            )
            && Schema::hasTable(
                'pmd_operational_shifts'
            )
            && Schema::hasTable(
                'pmd_operational_shift_people'
            )
            && Schema::hasTable(
                'staff_attendance'
            )
            && Schema::hasColumn(
                'staff_attendance',
                'attendance_id'
            )
            && Schema::hasColumn(
                'staff_attendance',
                'staff_id'
            )
            && Schema::hasColumn(
                'staff_attendance',
                'check_in_time'
            )
            && Schema::hasColumn(
                'staff_attendance',
                'check_out_time'
            );
    }

    private function shiftContains(
        $shift,
        Carbon $cursor
    ): bool {
        try {
            $date = Carbon::parse(
                $shift->shift_date
            )->startOfDay();

            $startText = $shift->starts_at
                ? substr(
                    (string)$shift->starts_at,
                    0,
                    8
                )
                : '06:00:00';

            $endText = $shift->ends_at
                ? substr(
                    (string)$shift->ends_at,
                    0,
                    8
                )
                : null;

            $start = Carbon::parse(
                $date->toDateString()
                .' '
                .$startText
            );

            $end = $endText
                ? Carbon::parse(
                    $date->toDateString()
                    .' '
                    .$endText
                )
                : $start->copy()->addHours(8);

            if ($end->lte($start)) {
                $end->addDay();
            }

            return
                $cursor->gte($start)
                && $cursor->lt($end);
        } catch (\Throwable $error) {
            return false;
        }
    }
}
