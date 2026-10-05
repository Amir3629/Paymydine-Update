<?php

namespace Admin\Services;

use Admin\Classes\PmdPlatformI18n;
use Admin\Models\Reservations_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
    public function payload(
        int $locationId,
        string $locale,
        ?string $dateFilter = null
    ): array {
        $dateFilter = preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$dateFilter)
            ? (string)$dateFilter
            : null;
        $now = Carbon::now('Europe/Berlin');
        $locale = PmdPlatformI18n::normalizeLocale($locale);

        if (!in_array($locale, ['en', 'de', 'tr'], true)) {
            $locale = 'en';
        }

        $reservations = [];

        if ($locationId > 0) {
            try {
                $query = Reservations_model::query()
                    ->with(['tables', 'status'])
                    ->where('location_id', $locationId);

                // PMD_QRES_DATE_SCOPED_READ_R131
                // Quick POS asks for one business date at a time. Applying the
                // date at SQL level avoids hydrating up to 1,500 unrelated
                // reservations and their table/status relations on every click.
                if ($dateFilter !== null) {
                    $query->where('reserve_date', $dateFilter);
                }

                $rows = $query
                    ->orderBy('reserve_date', 'desc')
                    ->orderBy('reserve_time', 'desc')
                    ->orderBy('reservation_id', 'desc')
                    ->limit($dateFilter !== null ? 500 : 1500)
                    ->get();

                $guarantees = collect();
                if (
                    $rows->isNotEmpty()
                    && Schema::hasTable('reservation_guarantees')
                ) {
                    $guarantees = DB::table('reservation_guarantees')
                        ->whereIn(
                            'reservation_id',
                            $rows->pluck('reservation_id')
                                ->map(static fn ($id) => (int)$id)
                                ->filter()
                                ->values()
                                ->all()
                        )
                        ->get()
                        ->keyBy('reservation_id');
                }

                $nowUtc = Carbon::now('UTC');

                $reservations = $rows
                    ->map(static function ($reservation) use ($guarantees, $nowUtc): array {
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

                        $guarantee = $guarantees->get(
                            (int)$reservation->reservation_id
                        );
                        $guaranteeStatus = $guarantee
                            ? (string)$guarantee->status
                            : 'none';
                        $guaranteeEligibleAt = $guarantee
                            ? (string)($guarantee->charge_eligible_at ?? '')
                            : '';
                        $guaranteeCanCharge = false;
                        if (
                            $guarantee
                            && in_array(
                                $guaranteeStatus,
                                ['active', 'charge_failed', 'action_required'],
                                true
                            )
                            && $guaranteeEligibleAt !== ''
                        ) {
                            try {
                                $guaranteeCanCharge = $nowUtc
                                    ->greaterThanOrEqualTo(
                                        Carbon::parse(
                                            $guaranteeEligibleAt,
                                            'UTC'
                                        )
                                    );
                            } catch (Throwable $ignored) {
                                $guaranteeCanCharge = false;
                            }
                        }

                        return [
                            'reservation_id' => (int)$reservation->reservation_id,
                            'id' => (int)$reservation->reservation_id,
                            'first_name' => $firstName,
                            'last_name' => $lastName,
                            'customer_name' => $customerName,
                            'guest_name' => $customerName,
                            'email' => (string)$reservation->email,
                            'telephone' => (string)$reservation->telephone,
                            'comment' => trim((string)$reservation->comment),
                            'note' => trim((string)$reservation->comment),
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
                            'guarantee_status' => $guaranteeStatus,
                            'guarantee_amount_cents' => $guarantee
                                ? (int)$guarantee->amount_cents
                                : 0,
                                                        'guarantee_charged_amount_cents' => (
                                $guarantee
                                && isset($guarantee->charged_amount_cents)
                            )
                                ? (int)$guarantee->charged_amount_cents
                                : null,
'guarantee_currency' => $guarantee
                                ? (string)$guarantee->currency
                                : 'EUR',
                            'guarantee_can_charge' => $guaranteeCanCharge,
                            'guarantee_can_release' => $guarantee
                                ? !in_array(
                                    $guaranteeStatus,
                                    ['released', 'charged'],
                                    true
                                )
                                : false,
                            'guarantee_charge_eligible_at' => $guaranteeEligibleAt,
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

    /**
     * PMD_QRES_CROSS_DATE_SEARCH_R136
     *
     * Search is deliberately SQL-scoped instead of hydrating the full
     * reservation history in the browser. The selected date remains owned by
     * payload(); this method only returns matches from other dates.
     */
    public function searchOtherDates(
        int $locationId,
        string $locale,
        string $needle,
        ?string $excludeDate = null,
        ?int $tableId = null,
        int $limit = 80
    ): array {
        $needle = trim($needle);
        $excludeDate = preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', (string)$excludeDate)
            ? (string)$excludeDate
            : null;
        $tableId = max(0, (int)$tableId);
        $limit = max(1, min(120, $limit));

        if ($locationId < 1 || mb_strlen($needle) < 2) {
            return [];
        }

        try {
            $like = '%'.str_replace(
                ['\\', '%', '_'],
                ['\\\\', '\\%', '\\_'],
                $needle
            ).'%';

            $query = Reservations_model::query()
                ->with(['tables', 'status'])
                ->where('location_id', $locationId);

            if ($excludeDate !== null) {
                $query->where('reserve_date', '<>', $excludeDate);
            }

            if ($tableId > 0) {
                $query->whereHas('tables', function ($tableQuery) use ($tableId) {
                    $tableQuery->where('tables.table_id', $tableId);
                });
            }

            $query->where(function ($reservationQuery) use ($like, $needle) {
                $reservationQuery
                    ->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('telephone', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('comment', 'like', $like)
                    ->orWhere('reserve_date', 'like', $like)
                    ->orWhere('reserve_time', 'like', $like)
                    ->orWhereHas('tables', function ($tableQuery) use ($like) {
                        $tableQuery->where('tables.table_name', 'like', $like);
                    });

                if (ctype_digit($needle)) {
                    $reservationQuery->orWhere(
                        'reservation_id',
                        (int)$needle
                    );
                }
            });

            $rows = $query
                ->orderBy('reserve_date', 'desc')
                ->orderBy('reserve_time', 'asc')
                ->orderBy('reservation_id', 'desc')
                ->limit($limit)
                ->get();

            $guarantees = collect();
            if (
                $rows->isNotEmpty()
                && Schema::hasTable('reservation_guarantees')
            ) {
                $guarantees = DB::table('reservation_guarantees')
                    ->whereIn(
                        'reservation_id',
                        $rows->pluck('reservation_id')
                            ->map(static fn ($id) => (int)$id)
                            ->filter()
                            ->values()
                            ->all()
                    )
                    ->get()
                    ->keyBy('reservation_id');
            }

            $nowUtc = Carbon::now('UTC');

            return $rows->map(static function ($reservation) use ($guarantees, $nowUtc): array {
                $date = '';
                try {
                    $date = $reservation->reserve_date
                        ? $reservation->reserve_date->format('Y-m-d')
                        : '';
                } catch (Throwable $ignored) {
                    $date = substr(
                        (string)$reservation->getAttribute('reserve_date'),
                        0,
                        10
                    );
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

                $guarantee = $guarantees->get(
                    (int)$reservation->reservation_id
                );
                $guaranteeStatus = $guarantee
                    ? (string)$guarantee->status
                    : 'none';
                $guaranteeEligibleAt = $guarantee
                    ? (string)($guarantee->charge_eligible_at ?? '')
                    : '';
                $guaranteeCanCharge = false;
                if (
                    $guarantee
                    && in_array(
                        $guaranteeStatus,
                        ['active', 'charge_failed', 'action_required'],
                        true
                    )
                    && $guaranteeEligibleAt !== ''
                ) {
                    try {
                        $guaranteeCanCharge = $nowUtc
                            ->greaterThanOrEqualTo(
                                Carbon::parse(
                                    $guaranteeEligibleAt,
                                    'UTC'
                                )
                            );
                    } catch (Throwable $ignored) {
                        $guaranteeCanCharge = false;
                    }
                }

                return [
                    'reservation_id' => (int)$reservation->reservation_id,
                    'id' => (int)$reservation->reservation_id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'customer_name' => $customerName,
                    'guest_name' => $customerName,
                    'email' => (string)$reservation->email,
                    'telephone' => (string)$reservation->telephone,
                    'comment' => trim((string)$reservation->comment),
                    'note' => trim((string)$reservation->comment),
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
                    'guarantee_status' => $guaranteeStatus,
                    'guarantee_amount_cents' => $guarantee
                        ? (int)$guarantee->amount_cents
                        : 0,
                                                'guarantee_charged_amount_cents' => (
                                $guarantee
                                && isset($guarantee->charged_amount_cents)
                            )
                                ? (int)$guarantee->charged_amount_cents
                                : null,
'guarantee_currency' => $guarantee
                        ? (string)$guarantee->currency
                        : 'EUR',
                    'guarantee_can_charge' => $guaranteeCanCharge,
                    'guarantee_can_release' => $guarantee
                        ? !in_array(
                            $guaranteeStatus,
                            ['released', 'charged'],
                            true
                        )
                        : false,
                    'guarantee_charge_eligible_at' => $guaranteeEligibleAt,
                ];
            })->values()->all();
        } catch (Throwable $error) {
            report($error);
            return [];
        }
    }

}
