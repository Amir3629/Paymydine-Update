<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * PMD_GERMAN_WORK_RULES_V1
 *
 * Scheduling guidance for German restaurant operations.
 *
 * This service deliberately returns warnings, never legal decisions or hard
 * blocks. ArbZG contains exceptions, collective-agreement rules and required
 * compensation periods that cannot be inferred from one shift row alone.
 * Keeping the engine read-only also makes it safe to reuse later in Shifts,
 * Staff Portal and PMD intelligence/shadow-mode features.
 */
class PmdGermanWorkRulesService
{
    public function analyze(Collection $shifts): array
    {
        $ordered = $shifts
            ->filter(fn ($shift) => !empty($shift->shift_date) && !empty($shift->starts_at) && !empty($shift->ends_at))
            ->sortBy(fn ($shift) => $this->start($shift)->timestamp)
            ->values();

        $result = [];
        $previousEnd = null;

        foreach ($ordered as $shift) {
            $shiftId = (int)($shift->id ?? 0);
            if ($shiftId < 1) continue;

            $start = $this->start($shift);
            $end = $this->end($shift, $start);
            $breakMinutes = max(0, min(240, (int)($shift->break_minutes ?? 0)));
            $grossMinutes = max(0, $start->diffInMinutes($end));
            $workMinutes = max(0, $grossMinutes - $breakMinutes);
            $warnings = [];

            if ($workMinutes > 600) {
                $warnings[] = $this->warning(
                    'working_time_over_10h',
                    'high',
                    'Scheduled working time is over 10 hours. Review before publishing.'
                );
            } elseif ($workMinutes > 480) {
                $warnings[] = $this->warning(
                    'working_time_over_8h',
                    'info',
                    'Scheduled working time is over 8 hours. The legal balancing requirement must be respected.'
                );
            }

            $requiredBreak = $workMinutes > 540 ? 45 : ($workMinutes > 360 ? 30 : 0);
            if ($requiredBreak > 0 && $breakMinutes < $requiredBreak) {
                $warnings[] = $this->warning(
                    'break_too_short',
                    'high',
                    'Planned break is '.$breakMinutes.' min; this shift needs at least '.$requiredBreak.' min based on scheduled working time.'
                );
            }

            if ($previousEnd) {
                $restMinutes = $previousEnd->diffInMinutes($start, false);
                if ($restMinutes >= 0 && $restMinutes < 600) {
                    $warnings[] = $this->warning(
                        'rest_below_10h',
                        'high',
                        'Rest before this shift is under 10 hours. Review before publishing.'
                    );
                } elseif ($restMinutes >= 600 && $restMinutes < 660) {
                    $warnings[] = $this->warning(
                        'rest_below_11h',
                        'info',
                        'Rest is below the standard 11 hours. Gastronomy can have a limited reduction to 10 hours only with required compensation.'
                    );
                }
            }

            if ($start->isSunday()) {
                $warnings[] = $this->warning(
                    'sunday_shift',
                    'info',
                    'Sunday work is permitted in gastronomy, but substitute-rest obligations must be tracked.'
                );
            }

            $result[$shiftId] = [
                'gross_minutes' => $grossMinutes,
                'break_minutes' => $breakMinutes,
                'work_minutes' => $workMinutes,
                'warnings' => $warnings,
                'has_high_warning' => collect($warnings)->contains(fn ($warning) => $warning['level'] === 'high'),
            ];

            $previousEnd = $end;
        }

        return $result;
    }

    private function start($shift): Carbon
    {
        return Carbon::parse((string)$shift->shift_date.' '.substr((string)$shift->starts_at, 0, 5), 'Europe/Berlin');
    }

    private function end($shift, Carbon $start): Carbon
    {
        $end = Carbon::parse((string)$shift->shift_date.' '.substr((string)$shift->ends_at, 0, 5), 'Europe/Berlin');
        if ($end->lte($start)) $end->addDay();
        return $end;
    }

    private function warning(string $code, string $level, string $message): array
    {
        return compact('code', 'level', 'message');
    }
}
