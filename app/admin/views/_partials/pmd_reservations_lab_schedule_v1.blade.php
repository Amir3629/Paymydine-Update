@php
    // PMD_RESERVATIONS_LAB_EXACT_RESERVATIONS2_V2_5
    // Complete EN/DE copy is resolved on the server before the browser receives
    // the Calendar/Hour bootstrap. The clean Reservation Lab handlers remain
    // the data/save authority; only the proven Reservations2 visual contract
    // is reused.
    $schedule = $pmdReservationsLabSchedule ?? [];
    // PMD_RESERVATIONS_SCHEDULE_TR_R2A
    $locale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(
        (string)($schedule['locale'] ?? app()->getLocale())
    );
    if (!in_array($locale, ['en', 'de', 'tr'], true)) {
        $locale = 'en';
    }

    $pmdReservationsLabStrings = $locale === 'de'
        ? [
            'reservation' => 'Reservierung',
            'reservations' => 'Reservierungen',
            'reservation_lower' => 'Reservierung',
            'reservations_title' => 'Reservierungen',
            'new_reservation' => 'Neue Reservierung',
            'edit_reservation' => 'Reservierung bearbeiten',
            'name' => 'Name',
            'phone_optional' => 'Telefon (optional)',
            'email_optional' => 'E-Mail (optional)',
            'guests' => 'Gäste',
            'guest' => 'Gast',
            'date' => 'Reservierungsdatum',
            'time' => 'Reservierungszeit',
            'duration' => 'Dauer',
            'table_assignment' => 'Tischzuweisung',
            'auto_assign' => 'Automatisch zuweisen',
            'choose_tables' => 'Tisch(e) auswählen',
            'assign_later' => 'Später zuweisen',
            'tables' => 'Tische',
            'table' => 'Tisch',
            'no_table' => 'Kein Tisch',
            'check_availability' => 'Verfügbarkeit prüfen',
            'notes' => 'Notizen',
            'note' => 'Notiz',
            'event' => 'Ereignis',
            'events' => 'Ereignisse',
            'calendar' => 'Kalender',
            'year' => 'Jahr',
            'month' => 'Monat',
            'all' => 'Alle',
            'previous' => 'Zurück',
            'next' => 'Weiter',
            'day_note' => 'Tagesnotiz',
            'write_note' => 'Notiz für diesen Tag schreiben',
            'delete' => 'Löschen',
            'cancel' => 'Abbrechen',
            'close' => 'Schließen',
            'save_note' => 'Notiz speichern',
            'save' => 'Reservierung speichern',
            'loading' => 'Reservierung wird geladen…',
            'checking' => 'Verfügbarkeit wird geprüft…',
            'available' => 'Verfügbar',
            'not_available' => 'Nicht verfügbar',
            'availability_requirements' => 'Datum, Uhrzeit, Dauer und Gäste auswählen.',
            'recommended_tables' => 'Empfohlene Tische',
            'no_reservations' => 'Keine Reservierungen',
            'booking' => 'Reservierung',
            'bookings' => 'Reservierungen',
            'time_slots' => 'Zeitfenster',
            'time_not_set' => 'Keine Uhrzeit',
            'open' => 'Öffnen',
            'scheduled' => 'Geplant',
            'load_failed' => 'Anfrage fehlgeschlagen.',
            'save_failed' => 'Die Reservierung konnte nicht gespeichert werden.',
            'past_slot' => 'Vergangene Uhrzeit',
            'future_only' => 'Reservierungen können nicht in der Vergangenheit erstellt werden.',
            'restaurant_closed' => 'Restaurant geschlossen',
            'outside_opening_hours' => 'Außerhalb der Öffnungszeiten',
        ]
        : [
            'reservation' => 'Reservation',
            'reservations' => 'Reservations',
            'reservation_lower' => 'reservation',
            'reservations_title' => 'Reservations',
            'new_reservation' => 'New reservation',
            'edit_reservation' => 'Edit reservation',
            'name' => 'Name',
            'phone_optional' => 'Phone (optional)',
            'email_optional' => 'Email (optional)',
            'guests' => 'Guests',
            'guest' => 'Guest',
            'date' => 'Reservation date',
            'time' => 'Reservation time',
            'duration' => 'Duration',
            'table_assignment' => 'Table assignment',
            'auto_assign' => 'Auto assign',
            'choose_tables' => 'Choose table(s)',
            'assign_later' => 'Assign later',
            'tables' => 'Tables',
            'table' => 'Table',
            'no_table' => 'No table',
            'check_availability' => 'Check availability',
            'notes' => 'Notes',
            'note' => 'Note',
            'event' => 'Event',
            'events' => 'Events',
            'calendar' => 'Calendar',
            'year' => 'Year',
            'month' => 'Month',
            'all' => 'All',
            'previous' => 'Previous',
            'next' => 'Next',
            'day_note' => 'Day note',
            'write_note' => 'Write a note for this day',
            'delete' => 'Delete',
            'cancel' => 'Cancel',
            'close' => 'Close',
            'save_note' => 'Save note',
            'save' => 'Save reservation',
            'loading' => 'Loading reservation…',
            'checking' => 'Checking availability…',
            'available' => 'Available',
            'not_available' => 'Not available',
            'availability_requirements' => 'Choose date, time, duration and guests.',
            'recommended_tables' => 'Recommended tables',
            'no_reservations' => 'No reservations',
            'booking' => 'Reservation',
            'bookings' => 'Reservations',
            'time_slots' => 'Time slots',
            'time_not_set' => 'Time not set',
            'open' => 'Open',
            'scheduled' => 'Scheduled',
            'load_failed' => 'Request failed.',
            'save_failed' => 'The reservation could not be saved.',
            'past_slot' => 'Past time',
            'future_only' => 'Reservations cannot be created in the past.',
            'restaurant_closed' => 'Restaurant closed',
            'outside_opening_hours' => 'Outside opening hours',
        ];

    if ($locale === 'tr') {
        $pmdReservationsLabStrings = \Admin\Classes\PmdPlatformI18n::translateStructure(
            $pmdReservationsLabStrings,
            '',
            'tr'
        );
    }

    // Keep any extra service-provided keys, but make the audited EN/DE copy above
    // authoritative for every visible Calendar/Hour/Composer string.
    $serverStrings = is_array($schedule['strings'] ?? null)
        ? $schedule['strings']
        : [];
    $strings = array_replace($serverStrings, $pmdReservationsLabStrings);
    $schedule['strings'] = $strings;
    $schedule['locale'] = $locale;
    $schedule['locale_tag'] = $locale === 'de'
        ? 'de-DE'
        : ($locale === 'tr' ? 'tr-TR' : 'en-GB');

    /* PMD_RESERVATIONSLAB_BERLIN_BOOKING_CLOCK_V1
       Keep past-slot decisions independent of the browser's local timezone. */
    $pmdReservationsLabBerlinNow = \Carbon\Carbon::now('Europe/Berlin');
    $schedule['today'] = (string)($schedule['today'] ?? $pmdReservationsLabBerlinNow->format('Y-m-d'));
    $schedule['server_now_berlin'] = $pmdReservationsLabBerlinNow->format('Y-m-d\TH:i:sP');

    /* PMD_RESERVATIONSLAB_SHARED_OPENING_HOURS_AUTHORITY_V1
       Read the SAME location-scoped working_hours rows written by
       PMD Settings > Restaurant profile > Opening hours. This is read-only
       bootstrap data for the Hour view; no duplicate schedule is created. */
    $pmdReservationsLabOpeningHours = [];
    $pmdReservationsLabLocationId = (int)($schedule['location_id'] ?? 0);

    if ($pmdReservationsLabLocationId < 1) {
        try {
            $pmdCurrentLocation = \Admin\Facades\AdminLocation::current();
            if ($pmdCurrentLocation && (int)$pmdCurrentLocation->location_id > 0) {
                $pmdReservationsLabLocationId = (int)$pmdCurrentLocation->location_id;
            }
        } catch (\Throwable $pmdOpeningHoursLocationError) {
        }
    }

    if ($pmdReservationsLabLocationId < 1) {
        try {
            $pmdReservationsLabLocationId = (int)\Admin\Facades\AdminLocation::getSession('id');
        } catch (\Throwable $pmdOpeningHoursSessionError) {
        }
    }

    if ($pmdReservationsLabLocationId > 0) {
        try {
            $pmdOpeningHourRows = \Illuminate\Support\Facades\DB::table('working_hours')
                ->where('location_id', $pmdReservationsLabLocationId)
                ->where('type', 'opening')
                ->orderBy('weekday')
                ->get();

            foreach ($pmdOpeningHourRows as $pmdOpeningHourRow) {
                $pmdWeekday = (int)$pmdOpeningHourRow->weekday;
                if ($pmdWeekday < 0 || $pmdWeekday > 6) {
                    continue;
                }

                $pmdReservationsLabOpeningHours[$pmdWeekday] = [
                    'weekday' => $pmdWeekday,
                    'enabled' => (bool)$pmdOpeningHourRow->status,
                    'opening_time' => substr((string)$pmdOpeningHourRow->opening_time, 0, 5),
                    'closing_time' => substr((string)$pmdOpeningHourRow->closing_time, 0, 5),
                ];
            }
        } catch (\Throwable $pmdOpeningHoursReadError) {
            $pmdReservationsLabOpeningHours = [];
        }
    }

    ksort($pmdReservationsLabOpeningHours);
    $schedule['opening_hours'] = array_values($pmdReservationsLabOpeningHours);

    $bootstrapJson = json_encode(
        $schedule,
        JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE
        | JSON_HEX_TAG
        | JSON_HEX_AMP
        | JSON_HEX_APOS
        | JSON_HEX_QUOT
    );
    if ($bootstrapJson === false) {
        $bootstrapJson = '{}';
    }

    $t = static function ($key, $fallback = '') use ($strings) {
        return (string)($strings[$key] ?? $fallback);
    };
@endphp

{{-- PMD_RESERVATIONSLAB_EXACT_R2_COMPOSER_RUNTIME_V2
     The canonical Composer is emitted after the Floor by the shared workspace.
     This schedule partial owns only Calendar/Hour bootstrap data. --}}

<script
    type="application/json"
    id="pmd-reservations-lab-schedule-bootstrap-v1"
>{!! $bootstrapJson !!}</script>
