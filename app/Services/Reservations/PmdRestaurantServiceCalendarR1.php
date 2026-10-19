<?php

namespace App\Services\Reservations;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * PMD_RESTAURANT_SERVICE_CALENDAR_R1
 *
 * A location-scoped, tenant-DB-local booking schedule. No new tables or
 * destructive migration: one JSON location_option owns extra intervals,
 * exception closures and advance-booking horizon. Historical single-window
 * working_hours remains as a backwards-compatible first-window projection.
 *
 * All booking decisions are recomputed on the server, never trusted from JS.
 * Existing reservations are NOT deleted or rewritten by schedule edits.
 */
final class PmdRestaurantServiceCalendarR1
{
    public const KEY = 'pmd_reservation_service_calendar_r1';
    public const DEFAULT_ADVANCE_DAYS = 180;
    public const MAX_ADVANCE_DAYS = 365;
    public const MAX_WINDOWS = 4;
    private array $cache = [];

    public function policy(int $locationId): array
    {
        if ($locationId < 1) return $this->emptyPolicy();
        if (isset($this->cache[$locationId])) return $this->cache[$locationId];

        $fallback = $this->legacyPolicy($locationId);
        try {
            if (Schema::hasTable('location_options')) {
                $value = DB::table('location_options')
                    ->where('location_id', $locationId)
                    ->where('item', self::KEY)
                    ->value('value');
                $stored = is_string($value) ? json_decode($value, true) : $value;
                if (is_array($stored) && (int)($stored['version'] ?? 0) === 1) {
                    $fallback = $this->normalizePersisted($stored, $fallback);
                }
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD restaurant calendar read failed', [
                'location_id' => $locationId,
                'class' => get_class($error),
            ]);
            // Use the existing weekly policy; never invent unrestricted hours.
        }
        return $this->cache[$locationId] = $fallback;
    }

    public function weeklyRows(int $locationId): array
    {
        $policy = $this->policy($locationId);
        $dates = $policy['closed_dates'];
        return array_map(static function ($row) use ($dates) {
            $row['closed_dates'] = $dates;
            return $row;
        }, $policy['weekly']);
    }

    public function forget(int $locationId): void
    {
        unset($this->cache[$locationId]);
    }

    public function advanceDays(int $locationId): int
    {
        return (int)$this->policy($locationId)['advance_days'];
    }

    public function closedDates(int $locationId): array
    {
        return $this->policy($locationId)['closed_dates'];
    }

    public function isClosedDate(int $locationId, string $date): bool
    {
        return in_array($date, $this->closedDates($locationId), true);
    }

    /**
     * Normalized ISO-local-day ranges; a late service can extend past 24:00.
     * Previous-day overnight tails are available on the next calendar date,
     * except where a closed-date override explicitly forbids that whole date.
     *
     * @return array<int,array{start:Carbon,end:Carbon}>
     */
    public function windowsForDate(int $locationId, Carbon $date): array
    {
        $day = $date->copy()->startOfDay();
        $today = $day->toDateString();
        if ($this->isClosedDate($locationId, $today)) return [];

        $weekly = $this->policy($locationId)['weekly'];
        $rows = [];
        foreach ([-1, 0] as $offset) {
            $serviceDay = $day->copy()->addDays($offset);
            if ($this->isClosedDate($locationId, $serviceDay->toDateString())) continue;
            $weekday = $serviceDay->isoWeekday() - 1;
            $item = $weekly[$weekday] ?? null;
            if (!$item || empty($item['enabled'])) continue;

            foreach ((array)($item['windows'] ?? []) as $window) {
                $open = (string)($window['opening_time'] ?? '');
                $close = (string)($window['closing_time'] ?? '');
                if (!$this->validClock($open) || !$this->validClock($close)) continue;

                $start = Carbon::parse($serviceDay->toDateString().' '.$open, $day->getTimezone());
                $end = Carbon::parse($serviceDay->toDateString().' '.$close, $day->getTimezone());
                if ($end->lte($start)) $end->addDay();

                // Only publish starts on the date being requested; do not
                // expose tomorrow's 01:00 as a booking on yesterday's date.
                if ($start->lt($day)) $start = $day->copy();
                if ($start->gte($day->copy()->addDay())) continue;
                if ($end->lte($start)) continue;

                $rows[] = ['start' => $start, 'end' => $end];
            }
        }

        usort($rows, static fn ($a, $b) => $a['start']->timestamp <=> $b['start']->timestamp);
        // Adjacent and overlapping windows are one continuous service.
        $merged = [];
        foreach ($rows as $range) {
            $index = count($merged) - 1;
            if ($index >= 0 && $range['start']->lte($merged[$index]['end'])) {
                if ($range['end']->gt($merged[$index]['end'])) {
                    $merged[$index]['end'] = $range['end'];
                }
            } else {
                $merged[] = $range;
            }
        }
        return $merged;
    }

    public function allows(int $locationId, string $date, string $time, int $duration): bool
    {
        if (!$this->validDate($date) || !$this->validClock($time) || $duration < 1) {
            return false;
        }

        try {
            $start = Carbon::parse($date.' '.$time, $this->timezone());
            // Daylight-saving gaps such as 02:30 during spring-forward
            // must never silently normalize into an unrelated service slot.
            if ($start->format('Y-m-d H:i') !== $date.' '.$time) return false;
            $end = $start->copy()->addMinutes($duration);
            if ($this->isClosedDate($locationId, $end->toDateString())
                && $end->toDateString() !== $date) {
                return false;
            }

            foreach ($this->windowsForDate($locationId, $start) as $range) {
                if ($start->gte($range['start']) && $end->lte($range['end'])) {
                    return true;
                }
            }
        } catch (\Throwable $ignored) {}
        return false;
    }

    public function validateSubmission(array $hours, array $schedule): array
    {
        $days = [];
        for ($weekday = 0; $weekday < 7; $weekday++) {
            $row = (array)($hours[$weekday] ?? []);
            $enabled = !empty($row['enabled']);
            $windows = [];

            if ($enabled) {
                $submitted = (array)($row['windows'] ?? []);
                if (!$submitted && isset($row['opening_time'], $row['closing_time'])) {
                    $submitted = [[
                        'opening_time' => $row['opening_time'],
                        'closing_time' => $row['closing_time'],
                    ]];
                }

                if (!$submitted || count($submitted) > self::MAX_WINDOWS) {
                    throw ValidationException::withMessages([
                        'hours.'.$weekday => ['Set between 1 and 4 service periods for an open day.'],
                    ]);
                }

                foreach ($submitted as $window) {
                    if (!is_array($window)) {
                        throw ValidationException::withMessages([
                            'hours.'.$weekday => ['Invalid service period.'],
                        ]);
                    }
                    $open = substr(trim((string)($window['opening_time'] ?? '')), 0, 5);
                    $close = substr(trim((string)($window['closing_time'] ?? '')), 0, 5);
                    if (!$this->validClock($open) || !$this->validClock($close)) {
                        throw ValidationException::withMessages([
                            'hours.'.$weekday => ['Every service period needs valid opening and closing times.'],
                        ]);
                    }
                    $windows[] = ['opening_time' => $open, 'closing_time' => $close];
                }
                usort($windows, static fn ($a, $b) => strcmp($a['opening_time'], $b['opening_time']));

                $lastEnd = -1;
                foreach ($windows as $window) {
                    $openingMinutes = $this->minutes($window['opening_time']);
                    $closingMinutes = $this->minutes($window['closing_time']);
                    $end = $closingMinutes <= $openingMinutes
                        ? $closingMinutes + 1440 : $closingMinutes;
                    if ($openingMinutes < $lastEnd) {
                        throw ValidationException::withMessages([
                            'hours.'.$weekday => ['Service periods cannot overlap. A period after midnight must be the last one.'],
                        ]);
                    }
                    $lastEnd = $end;
                }
                if (count($windows) > 1 && $this->minutes($windows[0]['opening_time']) === $this->minutes($windows[0]['closing_time'])) {
                    throw ValidationException::withMessages([
                        'hours.'.$weekday => ['A 24-hour period cannot be combined with another period.'],
                    ]);
                }
            }

            $days[] = $this->dayRow($weekday, $windows);
        }

        $daysAhead = filter_var($schedule['advance_days'] ?? self::DEFAULT_ADVANCE_DAYS, FILTER_VALIDATE_INT);
        if ($daysAhead === false || $daysAhead < 1 || $daysAhead > self::MAX_ADVANCE_DAYS) {
            throw ValidationException::withMessages([
                'schedule.advance_days' => ['Reservation calendar must be between 1 and 365 days ahead.'],
            ]);
        }

        $rawClosed = $schedule['closed_dates_json'] ?? '[]';
        $closed = is_string($rawClosed) ? json_decode($rawClosed, true) : $rawClosed;
        if (!is_array($closed) || count($closed) > 366 || array_values($closed) !== $closed) {
            throw ValidationException::withMessages([
                'schedule.closed_dates_json' => ['Invalid calendar closure dates.'],
            ]);
        }
        foreach ($closed as $value) {
            if (!is_string($value) || !$this->validDate($value)) {
                throw ValidationException::withMessages([
                    'schedule.closed_dates_json' => ['Closed dates must use YYYY-MM-DD.'],
                ]);
            }
        }
        $closed = array_values(array_unique($closed));
        sort($closed, SORT_STRING);

        return [
            'version' => 1,
            'advance_days' => $daysAhead,
            'weekly' => $days,
            'closed_dates' => $closed,
        ];
    }

    public function save(int $locationId, array $policy): void
    {
        if ($locationId <= 0 || !Schema::hasTable('location_options')) {
            throw new \RuntimeException('Restaurant calendar options storage is unavailable.');
        }
        // Caller owns the transaction together with location/legacy-hours save.
        DB::table('location_options')->updateOrInsert(
            ['location_id' => $locationId, 'item' => self::KEY],
            ['value' => json_encode($policy, JSON_UNESCAPED_SLASHES)]
        );
        unset($this->cache[$locationId]);
    }

    private function emptyPolicy(): array
    {
        return [
            'version' => 1,
            'advance_days' => self::DEFAULT_ADVANCE_DAYS,
            'closed_dates' => [],
            'weekly' => array_map(fn ($weekday) => $this->dayRow($weekday, []), range(0, 6)),
        ];
    }

    private function legacyPolicy(int $locationId): array
    {
        $policy = $this->emptyPolicy();
        try {
            if (!Schema::hasTable('working_hours')) return $policy;
            $rows = DB::table('working_hours')
                ->where('location_id', $locationId)
                ->where('type', 'opening')
                ->orderBy('weekday')
                ->orderBy('id')
                ->get();
            foreach ($rows as $row) {
                $weekday = (int)$row->weekday;
                if ($weekday < 0 || $weekday > 6) continue;
                $open = substr((string)$row->opening_time, 0, 5);
                $close = substr((string)$row->closing_time, 0, 5);
                $windows = ((bool)$row->status && $this->validClock($open) && $this->validClock($close))
                    ? [['opening_time' => $open, 'closing_time' => $close]]
                    : [];
                $policy['weekly'][$weekday] = $this->dayRow($weekday, $windows);
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD restaurant calendar legacy hours read failed', [
                'location_id' => $locationId,
                'class' => get_class($error),
            ]);
        }
        return $policy;
    }

    private function normalizePersisted(array $stored, array $fallback): array
    {
        $weekly = [];
        for ($day = 0; $day < 7; $day++) {
            $row = (array)($stored['weekly'][$day] ?? []);
            $windows = [];
            if (!empty($row['enabled'])) {
                foreach (array_slice((array)($row['windows'] ?? []), 0, self::MAX_WINDOWS) as $window) {
                    if (!is_array($window)) continue;
                    $open = (string)($window['opening_time'] ?? '');
                    $close = (string)($window['closing_time'] ?? '');
                    if ($this->validClock($open) && $this->validClock($close)) {
                        $windows[] = ['opening_time' => $open, 'closing_time' => $close];
                    }
                }
            }
            $weekly[] = $this->dayRow($day, $windows);
        }
        $closed = array_values(array_filter((array)($stored['closed_dates'] ?? []), fn ($d) => is_string($d) && $this->validDate($d)));
        $closed = array_values(array_unique($closed));
        sort($closed);
        return [
            'version' => 1,
            'advance_days' => max(1, min(self::MAX_ADVANCE_DAYS, (int)($stored['advance_days'] ?? self::DEFAULT_ADVANCE_DAYS))),
            'closed_dates' => $closed,
            'weekly' => $weekly,
        ];
    }

    private function dayRow(int $weekday, array $windows): array
    {
        return [
            'weekday' => $weekday,
            'enabled' => count($windows) > 0,
            'windows' => array_values($windows),
            'opening_time' => $windows[0]['opening_time'] ?? null,
            'closing_time' => $windows[0]['closing_time'] ?? null,
        ];
    }

    private function timezone(): string
    {
        $timezone = (string)setting(
            'timezone', config('app.timezone', 'Europe/Berlin')
        );
        try {
            new \DateTimeZone($timezone);
            return $timezone;
        } catch (\Throwable $error) {
            return 'Europe/Berlin';
        }
    }

    private function validClock(string $clock): bool
    {
        return (bool)preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $clock);
    }

    private function validDate(string $date): bool
    {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $match)) return false;
        return checkdate((int)$match[2], (int)$match[3], (int)$match[1]);
    }

    private function minutes(string $clock): int
    {
        return ((int)substr($clock, 0, 2)) * 60 + (int)substr($clock, 3, 2);
    }
}
