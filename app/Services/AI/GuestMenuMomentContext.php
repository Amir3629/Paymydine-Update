<?php

namespace App\Services\AI;

use Admin\Models\Mealtimes_model;
use Admin\Models\Menus_model;
use App\Services\Platform\LocationClockStateService;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Public-safe, read-only "restaurant now" context for Guest Menu AI.
 *
 * This deliberately exposes only location-local time, active meal windows and
 * the names of currently orderable menu items. It never exposes staff, orders,
 * revenue, customers or private restaurant configuration.
 */
final class GuestMenuMomentContext
{
    public function compact(int $locationId, int $maxChars = 260): string
    {
        $locationId = max(0, $locationId);
        if ($locationId < 1) {
            return '';
        }

        try {
            $clock = app(LocationClockStateService::class)->state($locationId);
            $timezone = $this->validTimezone((string)($clock['timezone'] ?? 'UTC'));
            $now = CarbonImmutable::now($timezone);

            $mealtimes = Mealtimes_model::query()
                ->whereHasOrDoesntHaveLocation($locationId)
                ->isEnabled()
                ->orderBy('start_time')
                ->get(['mealtime_id', 'mealtime_name', 'start_time', 'end_time']);

            $activeIds = [];
            $activeNames = [];
            foreach ($mealtimes as $mealtime) {
                if (!$this->isActiveWindow($now, (string)$mealtime->start_time, (string)$mealtime->end_time)) {
                    continue;
                }

                $activeIds[(int)$mealtime->mealtime_id] = true;
                $name = trim((string)$mealtime->mealtime_name);
                if ($name !== '') {
                    $activeNames[] = $name;
                }
            }

            $menus = Menus_model::query()
                ->whereHasOrDoesntHaveLocation($locationId)
                ->isEnabled()
                ->inStock()
                ->with(['mealtimes' => function ($query) use ($locationId) {
                    $query->whereHasOrDoesntHaveLocation($locationId)->isEnabled();
                }])
                ->orderBy('menu_priority')
                ->limit(120)
                ->get(['menu_id', 'menu_name']);

            $availableNow = [];
            foreach ($menus as $menu) {
                $relations = $menu->mealtimes;
                $hasWindow = $relations && $relations->count() > 0;
                $activeNow = !$hasWindow;

                if ($hasWindow) {
                    foreach ($relations as $mealtime) {
                        if (isset($activeIds[(int)$mealtime->mealtime_id])) {
                            $activeNow = true;
                            break;
                        }
                    }
                }

                if (!$activeNow) {
                    continue;
                }

                $name = trim((string)$menu->menu_name);
                if ($name !== '') {
                    $availableNow[] = $name;
                }

                if (count($availableNow) >= 12) {
                    break;
                }
            }

            $daypart = $this->daypart((int)$now->format('G'));
            $active = $activeNames ? implode('/', array_slice(array_values(array_unique($activeNames)), 0, 3)) : 'none';
            $items = $availableNow ? implode('|', $availableNow) : 'none-listed';

            $context = sprintf(
                'local=%s;tz=%s;daypart=%s;active_meals=%s;orderable_now=%s',
                $now->format('Y-m-d D H:i'),
                $timezone,
                $daypart,
                $active,
                $items
            );

            $maxChars = max(120, min(420, $maxChars));
            return mb_strlen($context) > $maxChars
                ? rtrim(mb_substr($context, 0, max(1, $maxChars - 1))).'…'
                : $context;
        } catch (Throwable $error) {
            logger()->warning('PMD Guest AI moment context unavailable', [
                'location_id' => $locationId,
                'error_type' => get_class($error),
            ]);

            return '';
        }
    }

    private function isActiveWindow(CarbonImmutable $now, string $start, string $end): bool
    {
        $start = trim($start);
        $end = trim($end);
        if ($start === '' || $end === '') {
            return false;
        }

        try {
            $from = $now->setTimeFromTimeString($start);
            $until = $now->setTimeFromTimeString($end);

            if ($until->greaterThanOrEqualTo($from)) {
                return $now->between($from, $until, true);
            }

            // Overnight service window, e.g. 18:00 -> 02:00.
            return $now->greaterThanOrEqualTo($from) || $now->lessThanOrEqualTo($until);
        } catch (Throwable $error) {
            return false;
        }
    }

    private function daypart(int $hour): string
    {
        if ($hour >= 5 && $hour < 11) return 'morning';
        if ($hour >= 11 && $hour < 16) return 'midday';
        if ($hour >= 16 && $hour < 22) return 'evening';
        return 'late-night';
    }

    private function validTimezone(string $timezone): string
    {
        $timezone = trim($timezone);
        if ($timezone === '') return 'UTC';

        try {
            new \DateTimeZone($timezone);
            return $timezone;
        } catch (Throwable $error) {
            return 'UTC';
        }
    }
}
