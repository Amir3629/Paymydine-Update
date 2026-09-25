<?php

namespace Admin\Services;

use Admin\Classes\PmdPlatformI18n;
use Admin\Models\Reservations_model;
use Carbon\Carbon;
use Throwable;

/**
 * Canonical read-only schedule authority for PayMyDine Reservations.
 *
 * It owns the server payload used by the Reservations, Manager and Dashboard
 * calendar surfaces. Business dates are resolved in Europe/Berlin, matching
 * the existing booking policy.
 */
final class PmdReservationsScheduleV1
{
    public function payload(int $locationId, string $locale): array
    {
        $now = Carbon::now('Europe/Berlin');
        $locale = PmdPlatformI18n::normalizeLocale($locale);

        if (!in_array($locale, ['en', 'de', 'tr'], true)) {
            $locale = 'en';
        }

        $reservations = [];

        if ($locationId > 0) {
            try {
                $rows = Reservations_model::query()
                    ->with(['tables', 'status'])
                    ->where('location_id', $locationId)
                    ->orderBy('reserve_date', 'desc')
                    ->orderBy('reserve_time', 'desc')
                    ->orderBy('reservation_id', 'desc')
                    ->limit(1500)
                    ->get();

                $reservations = $rows
                    ->map(static function ($reservation): array {
                        $date = '';
                        try {
                            $date = $reservation->reserve_date
                                ? $reservation->reserve_date->format('Y-m-d')
                                : '';
                        } catch (Throwable $ignored) {
                            $date = substr((string)$reservation->getAttribute('reserve_date'), 0, 10);
                        }

                        $time = substr(
                            trim((string)$reservation->getAttribute('reserve_time')),
                            0,
                            5
                        );

                        $tables = $reservation->tables;
                        $tableNames = $tables
                            ? $tables->pluck('table_name')
                                ->map(static fn ($name) => trim((string)$name))
                                ->filter()
                                ->values()
                                ->all()
                            : [];

                        $tableIds = $tables
                            ? $tables->pluck('table_id')
                                ->map(static fn ($id) => (int)$id)
                                ->filter()
                                ->values()
                                ->all()
                            : [];

                        $status = $reservation->status;
                        $statusName = $status
                            ? trim((string)($status->status_name ?? ''))
                            : '';

                        $firstName = trim((string)$reservation->first_name);
                        $lastName = trim((string)$reservation->last_name);
                        $customerName = trim($firstName.' '.$lastName);

                        return [
                            'reservation_id' => (int)$reservation->reservation_id,
                            'id' => (int)$reservation->reservation_id,
                            'first_name' => $firstName,
                            'last_name' => $lastName,
                            'customer_name' => $customerName,
                            'guest_name' => $customerName,
                            'email' => (string)$reservation->email,
                            'telephone' => (string)$reservation->telephone,
                            'guest_num' => max(0, (int)$reservation->guest_num),
                            'guests' => max(0, (int)$reservation->guest_num),
                            'reserve_date' => $date,
                            'reservation_date' => $date,
                            'reserve_time' => $time,
                            'reservation_time' => $time,
                            'duration' => max(1, (int)($reservation->duration ?: 45)),
                            'status_id' => (int)$reservation->status_id,
                            'status_name' => $statusName,
                            'status' => $statusName,
                            'table_ids' => $tableIds,
                            'table_names' => $tableNames,
                            'table_id' => (int)($tableIds[0] ?? 0),
                            'table_name' => implode(', ', $tableNames),
                        ];
                    })
                    ->values()
                    ->all();
            } catch (Throwable $error) {
                report($error);
                $reservations = [];
            }
        }

        return [
            'location_id' => max(0, $locationId),
            'locale' => $locale,
            'locale_tag' => $locale === 'de'
                ? 'de-DE'
                : ($locale === 'tr' ? 'tr-TR' : 'en-GB'),
            'today' => $now->format('Y-m-d'),
            'year' => (int)$now->format('Y'),
            'month' => (int)$now->format('n'),
            'reservations' => $reservations,
            'events' => [],
            'strings' => [],
        ];
    }
}
