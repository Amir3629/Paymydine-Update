{{-- PMD_RESERVATIONS_TITLELESS_TOOLS_V3_3_2 --}}
{{-- PMD_RESERVATIONS_LAB_BELOW_FLOOR_CARDS_V2_1 --}}
@php
    $pmdOpsSchedule = $pmdReservationsLabSchedule ?? [];
    $pmdOpsLocale = strtolower((string)($pmdCleanWorkspaceLocale ?? ($pmdOpsSchedule['locale'] ?? 'en')));
    $pmdOpsLocale = strpos($pmdOpsLocale, 'de') === 0 ? 'de' : 'en';
    $pmdOpsIsGerman = $pmdOpsLocale === 'de';

    $pmdOpsText = $pmdOpsIsGerman
        ? [
            'title_today' => 'Heutige Reservierungen',
            'title_range' => 'Reservierungen',
            'subtitle_today' => 'Reservierungen für heute · nach Uhrzeit sortiert',
            'subtitle_range' => 'Reservierungen im gewählten Zeitraum · nach Datum und Uhrzeit sortiert',
            'reservation' => 'Reservierung',
            'reservations' => 'Reservierungen',
            'time' => 'Uhrzeit',
            'guests' => 'Gäste',
            'table' => 'Tisch',
            'open' => 'Reservierung öffnen',
            'add_reservation' => 'Reservierung hinzufügen',
            'no_table' => 'Noch kein Tisch',
            'empty_title' => 'Keine Reservierungen in diesem Zeitraum',
            'empty_text' => 'Für den ausgewählten Zeitraum wurden keine Reservierungen gefunden.',
            'empty_card' => 'Keine Reservierung',
            'confirmed' => 'Bestätigt',
            'pending' => 'Ausstehend',
            'cancelled' => 'Storniert',
            'arrived' => 'Angekommen',
            'completed' => 'Abgeschlossen',
            'scheduled' => 'Geplant',
            'date_range' => 'Datumsbereich',
            'today' => 'Heute',
            'yesterday' => 'Gestern',
            'last_7_days' => 'Letzte 7 Tage',
            'from' => 'Von',
            'to' => 'Bis',
            'apply' => 'Anwenden',
        ]
        : [
            'title_today' => "Today's reservations",
            'title_range' => 'Reservations',
            'subtitle_today' => "Reservations for today · sorted by time",
            'subtitle_range' => 'Reservations in the selected date range · sorted by date and time',
            'reservation' => 'Reservation',
            'reservations' => 'Reservations',
            'time' => 'Time',
            'guests' => 'Guests',
            'table' => 'Table',
            'open' => 'Open reservation',
            'add_reservation' => 'Add reservation',
            'no_table' => 'No table yet',
            'empty_title' => 'No reservations in this date range',
            'empty_text' => 'No reservations were found for the selected date range.',
            'empty_card' => 'No Reservation',
            'confirmed' => 'Confirmed',
            'pending' => 'Pending',
            'cancelled' => 'Cancelled',
            'arrived' => 'Arrived',
            'completed' => 'Completed',
            'scheduled' => 'Scheduled',
            'date_range' => 'Date range',
            'today' => 'Today',
            'yesterday' => 'Yesterday',
            'last_7_days' => 'Last 7 days',
            'from' => 'From',
            'to' => 'To',
            'apply' => 'Apply',
        ];

    $pmdOpsToday = (string)($pmdOpsSchedule['today'] ?? now('Europe/Berlin')->format('Y-m-d'));

    $pmdOpsValidDate = static function ($value, $fallback) {
        $value = trim((string)$value);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : $fallback;
    };

    $pmdOpsFrom = $pmdOpsValidDate(request()->query('pmd_from'), $pmdOpsToday);
    $pmdOpsTo = $pmdOpsValidDate(request()->query('pmd_to'), $pmdOpsFrom);

    if ($pmdOpsTo < $pmdOpsFrom) {
        [$pmdOpsFrom, $pmdOpsTo] = [$pmdOpsTo, $pmdOpsFrom];
    }

    try {
        $pmdOpsTodayCarbon = \Carbon\Carbon::createFromFormat(
            'Y-m-d',
            $pmdOpsToday,
            'Europe/Berlin'
        )->startOfDay();
    } catch (\Throwable $error) {
        $pmdOpsTodayCarbon = \Carbon\Carbon::now('Europe/Berlin')->startOfDay();
        $pmdOpsToday = $pmdOpsTodayCarbon->format('Y-m-d');
    }

    $pmdOpsYesterday = $pmdOpsTodayCarbon->copy()->subDay()->format('Y-m-d');
    $pmdOpsLast7 = $pmdOpsTodayCarbon->copy()->subDays(6)->format('Y-m-d');

    $pmdOpsRangeLabel = $pmdOpsFrom === $pmdOpsToday && $pmdOpsTo === $pmdOpsToday
        ? $pmdOpsText['today']
        : (
            $pmdOpsFrom === $pmdOpsTo
                ? \Carbon\Carbon::parse($pmdOpsFrom)->format('d.m.Y')
                : \Carbon\Carbon::parse($pmdOpsFrom)->format('d.m.Y').' – '.\Carbon\Carbon::parse($pmdOpsTo)->format('d.m.Y')
        );

    $pmdOpsRange = [
        'base_url' => admin_url('reservationslab'),
        'from' => $pmdOpsFrom,
        'to' => $pmdOpsTo,
        'today' => $pmdOpsToday,
        'yesterday' => $pmdOpsYesterday,
        'last7_from' => $pmdOpsLast7,
        'label' => $pmdOpsRangeLabel,
        'text' => [
            'date_range' => $pmdOpsText['date_range'],
            'today' => $pmdOpsText['today'],
            'yesterday' => $pmdOpsText['yesterday'],
            'last_7_days' => $pmdOpsText['last_7_days'],
            'from' => $pmdOpsText['from'],
            'to' => $pmdOpsText['to'],
            'apply' => $pmdOpsText['apply'],
        ],
    ];

    /* PMD_RESERVATION_CARD_TABLE_VALUE_NUMBERS_ONLY_V1
       The fact box already owns the localized TABLE/TISCH label. Keep the
       value itself compact: "8, 12, 16" instead of repeating "Table". */
    $pmdOpsNormalizeTable = static function ($value) use ($pmdOpsText) {
        $value = trim((string)$value);

        if ($value === '') {
            return $pmdOpsText['no_table'];
        }

        if (preg_match('/^(?:table|tisch)\s*#?\s*(\d+)$/iu', $value, $match)) {
            return $match[1];
        }

        if (ctype_digit($value)) {
            return $value;
        }

        return preg_replace('/^(?:table|tisch)\s*#?\s*/iu', '', $value);
    };

    $pmdOpsCards = [];

    foreach ((array)($pmdOpsSchedule['reservations'] ?? []) as $reservation) {
        if (!is_array($reservation)) continue;

        $date = substr((string)(
            $reservation['reserve_date']
            ?? $reservation['reservation_date']
            ?? $reservation['date']
            ?? ''
        ), 0, 10);

        if (
            !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            || $date < $pmdOpsFrom
            || $date > $pmdOpsTo
        ) {
            continue;
        }

        $id = (int)(
            $reservation['reservation_id']
            ?? $reservation['id']
            ?? $reservation['booking_id']
            ?? 0
        );
        if ($id < 1) continue;

        $timeRaw = trim((string)(
            $reservation['reserve_time']
            ?? $reservation['reservation_time']
            ?? $reservation['time']
            ?? ''
        ));
        $time = preg_match('/(\d{1,2}):(\d{2})/', $timeRaw, $timeMatch)
            ? sprintf('%02d:%02d', (int)$timeMatch[1], (int)$timeMatch[2])
            : '—';

        $name = trim(preg_replace(
            '/\s+/u',
            ' ',
            (string)(
                $reservation['guest_name']
                ?? $reservation['customer_name']
                ?? $reservation['name']
                ?? trim(
                    (string)($reservation['first_name'] ?? '')
                    .' '
                    .(string)($reservation['last_name'] ?? '')
                )
            )
        ));

        if ($name === '') {
            $name = $pmdOpsText['reservation'].' #'.$id;
        }

        $guests = max(0, (int)(
            $reservation['guest_num']
            ?? $reservation['guests']
            ?? $reservation['party_size']
            ?? $reservation['number_of_guests']
            ?? 0
        ));

        $tableValues = [];
        if (isset($reservation['table_names']) && is_array($reservation['table_names'])) {
            $tableValues = array_values(array_filter(array_map('strval', $reservation['table_names'])));
        }

        if (!$tableValues) {
            $singleTable = (string)(
                $reservation['table_name']
                ?? $reservation['table']
                ?? $reservation['table_number']
                ?? $reservation['table_id']
                ?? ''
            );
            if (trim($singleTable) !== '') {
                $tableValues = [$singleTable];
            }
        }

        $tables = $tableValues
            ? implode(', ', array_map($pmdOpsNormalizeTable, $tableValues))
            : $pmdOpsText['no_table'];

        $rawStatus = $reservation['status'] ?? '';
        if (is_array($rawStatus)) {
            $rawStatus =
                $rawStatus['name']
                ?? $rawStatus['label']
                ?? $rawStatus['status']
                ?? $rawStatus['status_name']
                ?? '';
        }

        $rawStatus = strtolower(trim((string)(
            $rawStatus
            ?: ($reservation['status_name'] ?? $reservation['state'] ?? '')
        )));

        if (preg_match('/cancel|declin|reject|no.?show|storn|abgelehnt/', $rawStatus)) {
            $statusKey = 'cancelled';
        } elseif (preg_match('/pending|request|wait|aussteh|wart/', $rawStatus)) {
            $statusKey = 'pending';
        } elseif (preg_match('/arriv|seat|angekommen|platziert/', $rawStatus)) {
            $statusKey = 'arrived';
        } elseif (preg_match('/complete|finished|abgesch/', $rawStatus)) {
            $statusKey = 'completed';
        } elseif (preg_match('/confirm|approved|bestät/', $rawStatus)) {
            $statusKey = 'confirmed';
        } else {
            $statusKey = 'scheduled';
        }

        $dateLabel = $pmdOpsIsGerman
            ? \Carbon\Carbon::parse($date)->format('d.m.Y')
            : \Carbon\Carbon::parse($date)->format('d M Y');

        $pmdOpsCards[] = [
            'id' => $id,
            'date' => $date,
            'date_label' => $dateLabel,
            'time' => $time,
            'name' => $name,
            'guests' => $guests,
            'table' => $tables,
            'status_key' => $statusKey,
            'status_label' => $pmdOpsText[$statusKey],
            'sort_key' => $date.' '.($time === '—' ? '99:99' : $time).' '.str_pad((string)$id, 12, '0', STR_PAD_LEFT),
        ];
    }

    usort($pmdOpsCards, static function ($left, $right) {
        return strcmp($left['sort_key'], $right['sort_key']);
    });

    $pmdOpsCount = count($pmdOpsCards);
    $pmdOpsIsToday = $pmdOpsFrom === $pmdOpsToday && $pmdOpsTo === $pmdOpsToday;
@endphp

<section
    data-pmd-titleless-v3-3-2="true"
    data-pmd-i18n-skip="true"
    data-pmd-no-translate="true"
    id="pmd-reservations-lab-cards-v2-1"
    class="pmd-ops-section pmd-i18n-skip"
    aria-label="{{ $pmdOpsText['reservations'] }}"
    data-pmd-ops-kind="reservations"
    data-pmd-range-from="{{ $pmdOpsFrom }}"
    data-pmd-range-to="{{ $pmdOpsTo }}"
>
    <header class="pmd-ops-section__header pmd-ops-section__header--tools-only">
        <div class="pmd-ops-section__tools">
            @include('admin::_partials.pmd_operational_date_range_v1', [
                'pmdOpsRange' => $pmdOpsRange,
            ])

            <span class="pmd-ops-section__count">
                <strong>{{ $pmdOpsCount }}</strong>
                {{ $pmdOpsCount === 1
                    ? $pmdOpsText['reservation']
                    : $pmdOpsText['reservations'] }}
            </span>
        </div>
    </header>

    {{-- PMD_RESERVATIONSLAB_ADD_CARD_FIRST_V1
         Server-localized and excluded from the late global i18n rewrite.
         The href is a no-JS fallback; the schedule runtime opens the canonical
         Reservations2 Composer on click. --}}
    <div class="pmd-ops-grid">
        <a
            class="pmd-ops-add-card pmd-r2-simple-add-link-v460"
            href="{{ admin_url('reservations/create').'?reserve_date='.$pmdOpsToday }}"
            aria-label="{{ $pmdOpsText['add_reservation'] }}"
            data-pmd-res-lab-card-create="1"
            data-pmd-res-lab-create-date="{{ $pmdOpsToday }}"
        >
            <span class="pmd-r2-simple-add-icon-v460" aria-hidden="true">＋</span>
            <span class="pmd-r2-simple-add-title-v460">{{ $pmdOpsText['add_reservation'] }}</span>
        </a>

        @if($pmdOpsCount === 0)
            <article class="pmd-ops-inline-empty-card" data-pmd-reservations-empty-card="1">
                <strong>{{ $pmdOpsText['empty_card'] }}</strong>
            </article>
        @endif

        @foreach($pmdOpsCards as $card)
                <article
                    class="pmd-ops-card"
                    data-pmd-reservation-card="{{ $card['id'] }}"
                >
                    <header class="pmd-ops-card__head">
                        <strong class="pmd-ops-card__title">
                            {{ $card['name'] }}
                        </strong>
                        <span class="pmd-ops-card__status is-{{ $card['status_key'] }}">
                            {{ $card['status_label'] }}
                        </span>
                    </header>

                    <div class="pmd-ops-card__meta">
                        <strong>#{{ $card['id'] }}</strong>
                        <span>{{ $card['date_label'] }}</span>
                    </div>

                    <dl class="pmd-ops-card__facts">
                        <div>
                            <dt>{{ $pmdOpsText['time'] }}</dt>
                            <dd>{{ $card['time'] }}</dd>
                        </div>
                        <div>
                            <dt>{{ $pmdOpsText['guests'] }}</dt>
                            <dd>{{ $card['guests'] }}</dd>
                        </div>
                        <div>
                            <dt>{{ $pmdOpsText['table'] }}</dt>
                            <dd>{{ $card['table'] }}</dd>
                        </div>
                    </dl>

                    <footer class="pmd-ops-card__footer">
                        <a
                            href="{{ admin_url('reservations/edit/'.$card['id']) }}"
                            data-pmd-res-lab-card-edit="{{ $card['id'] }}"
                            data-pmd-res-lab-card-date="{{ $card['date'] }}"
                            data-pmd-res-lab-card-time="{{ $card['time'] === '—' ? '' : $card['time'] }}"
                        >
                            {{ $pmdOpsText['open'] }}
                        </a>
                    </footer>
                </article>
        @endforeach
    </div>

</section>
