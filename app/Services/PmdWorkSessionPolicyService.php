<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_WORK_SESSION_POLICY_V2
 *
 * Absolute access window for restaurant users:
 * - current scheduled work: until that shift end + 1 hour
 * - before work: until the nearest next shift end + 1 hour
 * - login after the scheduled grace window, or no schedule: until restaurant-day 06:00
 *
 * This is independent from Laravel's generic idle session lifetime.
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
            'expires_at' => $policy['expires_at']->toIso8601String(),
        ]);

        return $policy;
    }

    public function policy(array $identity, ?Carbon $now = null): array
    {
        $now = $now ? $now->copy() : now();
        $boundary = $this->nextRestaurantBoundary($now);
        $locationId = (int)($identity['location_id'] ?? 0);
        $staffId = (int)($identity['staff_id'] ?? 0);

        $fallback = [
            'expires_at' => $boundary,
            'reason' => 'restaurant_day',
            'shift_ids' => [],
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

                $start = Carbon::parse($shift->shift_date.' '.$shift->starts_at, $now->getTimezone());
                $end = Carbon::parse($shift->shift_date.' '.$shift->ends_at, $now->getTimezone());
                if ($end->lessThanOrEqualTo($start)) $end->addDay();

                if ($end->lessThanOrEqualTo($restaurantStart) || $start->greaterThanOrEqualTo($boundary)) continue;

                $row = [
                    'id' => (int)$shift->id,
                    'start' => $start,
                    'grace_end' => $end->copy()->addHour(),
                ];

                if ($now->greaterThanOrEqualTo($start) && $now->lessThanOrEqualTo($row['grace_end'])) {
                    $current[] = $row;
                } elseif ($start->greaterThan($now)) {
                    $upcoming[] = $row;
                }
            }

            if ($current) {
                usort($current, static function ($a, $b) {
                    return $a['grace_end']->timestamp <=> $b['grace_end']->timestamp;
                });
                $selected = end($current);
                return [
                    'expires_at' => $selected['grace_end'],
                    'reason' => 'shift_plus_one_hour',
                    'shift_ids' => [(int)$selected['id']],
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
                ];
            }

            // The scheduled window is over (or there is no current-day shift).
            // A fresh login now is treated as overtime/unplanned work and lasts
            // only until the current restaurant day closes at 06:00.
            return $fallback;
        } catch (\Throwable $error) {
            logger()->warning('PMD work-session policy fallback', [
                'staff_id' => $staffId,
                'location_id' => $locationId,
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

    private function nextRestaurantBoundary(Carbon $now): Carbon
    {
        $boundary = $now->copy()->startOfDay()->setTime(6, 0, 0);
        if ($now->greaterThanOrEqualTo($boundary)) $boundary->addDay();
        return $boundary;
    }
}
