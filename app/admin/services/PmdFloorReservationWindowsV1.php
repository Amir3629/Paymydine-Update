<?php

namespace Admin\Services;

use Admin\Models\Reservations_model;
use App\Services\Platform\LocationClockStateService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_FLOOR_RESERVATION_WINDOWS_R1
 *
 * One tenant/location-scoped, read-only reservation time authority for all
 * shared dashboard/Reservations/Quick POS Floors. Do not derive floor status
 * from order payment state, raw reservation statuses, or browser timezone.
 */
final class PmdFloorReservationWindowsV1
{
    public const SETTING_KEY = 'pmd_floor_reservation_notice_minutes';
    public const DEFAULT_NOTICE_MINUTES = 15;
    public const MAX_NOTICE_MINUTES = 120;

    public static function normalizeNoticeMinutes($value): int
    {
        if (!is_numeric($value) || (string)$value === '') {
            return self::DEFAULT_NOTICE_MINUTES;
        }
        return max(0, min(self::MAX_NOTICE_MINUTES, (int)$value));
    }

    public function noticeMinutes(): int
    {
        try {
            if (!Schema::hasTable('settings')) {
                return self::DEFAULT_NOTICE_MINUTES;
            }
            $value = DB::table('settings')->where('item', self::SETTING_KEY)->value('value');
            return $value === null
                ? self::DEFAULT_NOTICE_MINUTES
                : self::normalizeNoticeMinutes($value);
        } catch (\Throwable $ignored) {
            return self::DEFAULT_NOTICE_MINUTES;
        }
    }

    public function windows(int $locationId): array
    {
        if ($locationId < 1) return [];

        try {
            if (!Schema::hasTable('reservations')
                || !Schema::hasTable('reservation_tables')
                || !Schema::hasTable('tables')) {
                return [];
            }

            // Canonical restaurant/location-local timezone, not the VPS or
            // browser timezone. Epoch milliseconds remain timezone-neutral.
            $clock = app(LocationClockStateService::class)->state($locationId);
            $timezone = (string)($clock['timezone'] ?? 'Europe/Berlin');
            $now = Carbon::now($timezone);

            $reservations = Reservations_model::with('tables')
                ->where('location_id', $locationId)
                ->whereBetween('reserve_date', [
                    $now->copy()->subDay()->toDateString(),
                    $now->copy()->addDay()->toDateString(),
                ])->get();

            $windows = [];
            $seen = [];
            foreach ($reservations as $reservation) {
                if (!$reservation || $reservation->isCanceled()) continue;

                $date = substr(trim((string)$reservation->getOriginal('reserve_date')), 0, 10);
                $time = substr(trim((string)$reservation->getOriginal('reserve_time')), 0, 8);
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
                    || !preg_match('/^\d{2}:\d{2}(?::\d{2})?$/', $time)) {
                    continue;
                }
                if (strlen($time) === 5) $time .= ':00';

                try {
                    $start = Carbon::createFromFormat('Y-m-d H:i:s', $date.' '.$time, $timezone);
                } catch (\Throwable $ignored) {
                    continue;
                }
                if (!$start) continue;

                $duration = max(1, (int)($reservation->duration ?? 0));
                $end = $start->copy()->addMinutes($duration);

                foreach ($reservation->tables as $table) {
                    if (!$table) continue;
                    $tableId = (int)($table->table_id ?? 0);
                    $tableNo = trim((string)($table->table_no ?? ''));
                    if ($tableId < 1 && $tableNo === '') continue;

                    $key = implode(':', [
                        (int)($reservation->reservation_id ?? 0),
                        $tableId > 0 ? 'id-'.$tableId : 'no-'.$tableNo,
                        $start->getTimestamp(),
                    ]);
                    if (isset($seen[$key])) continue;
                    $seen[$key] = true;

                    $windows[] = [
                        'reservation_id' => (int)($reservation->reservation_id ?? 0),
                        'table_id' => $tableId,
                        'table_no' => $tableNo,
                        'start_ms' => $start->getTimestamp() * 1000,
                        'end_ms' => $end->getTimestamp() * 1000,
                    ];
                }
            }
            return $windows;
        } catch (\Throwable $error) {
            logger()->warning('Floor reservation window read failed', [
                'location_id' => $locationId,
                'type' => get_class($error),
            ]);
            return [];
        }
    }

    /**
     * Pure status classifier shared with initial Blade render.
     * Reservation windows are authoritative only for their own table ID.
     * Never mark two different tables busy merely because they share a label.
     */
    public static function phase(
        array $windows,
        int $tableId,
        string $tableNo,
        int $nowMs,
        int $noticeMinutes
    ): string {
        $upcoming = false;
        $noticeMs = max(0, min(self::MAX_NOTICE_MINUTES, $noticeMinutes)) * 60000;
        $tableNo = trim($tableNo);
        foreach ($windows as $window) {
            if (!is_array($window)) continue;
            $rowId = (int)($window['table_id'] ?? 0);
            $rowNo = trim((string)($window['table_no'] ?? ''));
            $matches = ($tableId > 0 && $rowId > 0)
                ? $tableId === $rowId
                : ($tableNo !== '' && $rowNo !== '' && $tableNo === $rowNo);
            if (!$matches) continue;

            $start = (int)($window['start_ms'] ?? 0);
            $end = (int)($window['end_ms'] ?? 0);
            if ($start < 1 || $end <= $start) continue;
            if ($nowMs >= $start && $nowMs < $end) return 'busy';
            if ($noticeMs > 0 && $nowMs < $start
                && $nowMs >= $start - $noticeMs) $upcoming = true;
        }
        return $upcoming ? 'upcoming' : 'free';
    }
}
