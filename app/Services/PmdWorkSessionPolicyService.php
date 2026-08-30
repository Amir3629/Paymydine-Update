<?php

namespace App\Services;

use App\Services\Platform\LocationPlatformContext;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_WORK_SESSION_POLICY_V4
 *
 * Absolute access window in the restaurant location timezone:
 * - fresh login during a scheduled shift: shift end + 1 hour
 * - fresh login before work: nearest next shift end + 1 hour
 * - fresh login after the scheduled shift ended, or no schedule: restaurant day 06:00
 *
 * Therefore an existing shift session receives its one-hour grace, while a new
 * login after shift end is treated as overtime/unplanned work for that day.
 */
class PmdWorkSessionPolicyService
{
    public const SESSION_POLICY = 'pmd_work_session_policy_v1';

    public function apply(array $identity, ?Carbon $now = null): array
    {
        $policy = $this->policy($identity, $now);

        session()->put(
            PmdSiteAccessService::SESSION_VERIFIED_UNTIL,
            $policy['expires_at']->toIso8601String()
        );
        session()->put(self::SESSION_POLICY, [
            'reason' => $policy['reason'],
            'shift_ids' => $policy['shift_ids'],
            'timezone' => $policy['timezone'],
            'expires_at' => $policy['expires_at']->toIso8601String(),
        ]);

        return $policy;
    }

    public function policy(array $identity, ?Carbon $now = null): array
    {
        $locationId = (int)($identity['location_id'] ?? 0);
        $staffId = (int)($identity['staff_id'] ?? 0);
        $timezone = $this->restaurantTimezone($locationId);
        $now = $now
            ? $now->copy()->setTimezone($timezone)
            : Carbon::now($timezone);
        $boundary = $this->nextRestaurantBoundary($now);

        $fallback = [
            'expires_at' => $boundary,
            'reason' => 'restaurant_day_overtime_or_unscheduled',
            'shift_ids' => [],
            'timezone' => $timezone,
        ];

        if ($locationId < 1 || $staffId < 1) return $fallback;
        if (
            !Schema::hasTable('pmd_operational_people')
            || !Schema::hasTable('pmd_operational_shift_people')
            || !Schema::hasTable('pmd_operational_shifts')
        ) {
            return $fallback;
        }

        try {
            $personIds = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
                ->pluck('id')
                ->map('intval')
                ->filter()
                ->unique()
                ->values();
            if ($personIds->isEmpty()) return $fallback;

            $shiftIds = DB::table('pmd_operational_shift_people')
                ->whereIn('person_id', $personIds->all())
                ->pluck('shift_id')
                ->map('intval')
                ->filter()
                ->unique()
                ->values();
            if ($shiftIds->isEmpty()) return $fallback;

            $restaurantStart = $boundary->copy()->subDay();
            $shifts = DB::table('pmd_operational_shifts')
                ->where('location_id', $locationId)
                ->whereIn('id', $shiftIds->all())
                ->whereBetween('shift_date', [
                    $restaurantStart->copy()->subDay()->toDateString(),
                    $boundary->toDateString(),
                ])
                ->whereNotIn('status', ['cancelled', 'canceled'])
                ->get(['id', 'shift_date', 'starts_at', 'ends_at']);

            $current = [];
            $upcoming = [];
            foreach ($shifts as $shift) {
                if (!$shift->shift_date || !$shift->starts_at || !$shift->ends_at) continue;

                $start = Carbon::parse($shift->shift_date.' '.$shift->starts_at, $timezone);
                $end = Carbon::parse($shift->shift_date.' '.$shift->ends_at, $timezone);
                if ($end->lessThanOrEqualTo($start)) $end->addDay();

                if ($end->lessThanOrEqualTo($restaurantStart) || $start->greaterThanOrEqualTo($boundary)) continue;

                $row = [
                    'id' => (int)$shift->id,
                    'start' => $start,
                    'end' => $end,
                    'grace_end' => $end->copy()->addHour(),
                ];

                // A NEW login counts as scheduled only until the actual shift end.
                // The +1 hour is the lifetime granted to that session, not a new
                // login window after the employee's scheduled work already ended.
                if ($now->greaterThanOrEqualTo($start) && $now->lessThanOrEqualTo($end)) {
                    $current[] = $row;
                } elseif ($start->greaterThan($now)) {
                    $upcoming[] = $row;
                }
            }

            if ($current) {
                usort($current, static function ($a, $b) {
                    return $a['end']->timestamp <=> $b['end']->timestamp;
                });
                $selected = end($current);
                return [
                    'expires_at' => $selected['grace_end'],
                    'reason' => 'shift_plus_one_hour',
                    'shift_ids' => [(int)$selected['id']],
                    'timezone' => $timezone,
                ];
            }

            if ($upcoming) {
                usort($upcoming, static function ($a, $b) {
                    return $a['start']->timestamp <=> $b['start']->timestamp;
                });
                $selected = $upcoming[0];
                return [
                    'expires_at' => $selected['grace_end'],
                    'reason' => 'next_shift_plus_one_hour',
                    'shift_ids' => [(int)$selected['id']],
                    'timezone' => $timezone,
                ];
            }

            return $fallback;
        } catch (\Throwable $error) {
            logger()->warning('PMD work-session policy fallback', [
                'staff_id' => $staffId,
                'location_id' => $locationId,
                'timezone' => $timezone,
                'message' => $error->getMessage(),
            ]);
            return $fallback;
        }
    }

    public function isExpired(): bool
    {
        $until = session()->get(PmdSiteAccessService::SESSION_VERIFIED_UNTIL);
        if (!$until) return false;

        try {
            return Carbon::parse($until)->isPast();
        } catch (\Throwable $error) {
            return true;
        }
    }

    public function clear(): void
    {
        session()->forget(self::SESSION_POLICY);
    }

    private function restaurantTimezone(int $locationId): string
    {
        try {
            $timezone = trim((string)app(LocationPlatformContext::class)->timezone($locationId));
            if ($timezone !== '') {
                new \DateTimeZone($timezone);
                return $timezone;
            }
        } catch (\Throwable $error) {
        }

        $fallback = trim((string)config('app.timezone', 'UTC')) ?: 'UTC';
        try {
            new \DateTimeZone($fallback);
            return $fallback;
        } catch (\Throwable $error) {
            return 'UTC';
        }
    }

    private function nextRestaurantBoundary(Carbon $now): Carbon
    {
        $boundary = $now->copy()->startOfDay()->setTime(6, 0, 0);
        if ($now->greaterThanOrEqualTo($boundary)) $boundary->addDay();
        return $boundary;
    }
}
