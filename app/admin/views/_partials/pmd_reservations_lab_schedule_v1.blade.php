@php
    // PMD_RESERVATIONS_LAB_EXACT_RESERVATIONS2_V2_5
    // Complete EN/DE copy is resolved on the server before the browser receives
    // the Calendar/Hour bootstrap. The clean Reservation Lab handlers remain
    // the data/save authority; only the proven Reservations2 visual contract
    // is reused.
    $schedule = $pmdReservationsLabSchedule ?? [];
    $locale = strtolower((string)($schedule['locale'] ?? 'en')) === 'de' ? 'de' : 'en';

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
        ];

    // Keep any extra service-provided keys, but make the audited EN/DE copy above
    // authoritative for every visible Calendar/Hour/Composer string.
    $serverStrings = is_array($schedule['strings'] ?? null)
        ? $schedule['strings']
        : [];
    $strings = array_replace($serverStrings, $pmdReservationsLabStrings);
    $schedule['strings'] = $strings;
    $schedule['locale'] = $locale;
    $schedule['locale_tag'] = $locale === 'de' ? 'de-DE' : 'en-GB';

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

{{-- Reuse the exact current Reservations2 Composer visual authority. --}}
<link
    rel="stylesheet"
    href="{{ asset('app/admin/assets/css/pmd-reservation-composer-v1.css') }}?pmd-reservationslab=2.5.0"
>

<div
    id="pmd-reservation-composer-v1"
    class="modal fade show pmd-reservation-composer-v1"
    data-pmd-res-lab-composer
    tabindex="-1"
    aria-labelledby="pmd-res-lab-composer-title"
    aria-modal="true"
    hidden
>
    <div
        class="pmd-reservation-composer-backdrop-v1 show"
        data-pmd-res-lab-close
        aria-hidden="true"
    ></div>

    <div
        class="modal-dialog modal-dialog-centered modal-xl"
        id="pmd-reservation-composer-dialog-v1"
    >
        <div class="modal-content">
            <form
                id="pmd-reservation-composer-form-v1"
                data-pmd-res-lab-form
                novalidate
            >
                <header class="pmd-reservation-composer-v1__header">
                    <div>
                        <small>{{ $t('reservation', 'Reservation') }}</small>
                        <h2
                            id="pmd-res-lab-composer-title"
                            data-pmd-res-lab-composer-title
                        >{{ $t('new_reservation', 'New reservation') }}</h2>
                    </div>

                    <button
                        type="button"
                        data-pmd-res-lab-close
                        aria-label="{{ $t('close', 'Close') }}"
                    >
                        <svg aria-hidden="true"><use href="#pmd-composer-icon-x"></use></svg>
                    </button>
                </header>

                <div
                    class="pmd-reservation-composer-v1__loading"
                    data-pmd-res-lab-loading
                    role="status"
                >{{ $t('loading', 'Loading reservation…') }}</div>

                <div
                    class="pmd-reservation-composer-v1__content"
                    data-pmd-res-lab-content
                    hidden
                >
                    <div
                        class="pmd-reservation-composer-v1__summary"
                        data-pmd-res-lab-error
                        hidden
                        tabindex="-1"
                    ></div>

                    <input type="hidden" name="reservation_id">
                    <input type="hidden" name="source" value="reservationslab">
                    <input type="hidden" name="location_id">
                    <input type="hidden" name="occasion_id" value="0">
                    <input type="hidden" name="notify" value="0">
                    <input type="hidden" name="last_name" value="">

                    <section class="pmd-reservation-composer-v1__grid">
                        <label class="pmd-reservation-composer-v1__single-name">
                            <span>
                                <svg aria-hidden="true"><use href="#pmd-composer-icon-user"></use></svg>
                                {{ $t('name', 'Name') }}
                            </span>
                            <input name="first_name" autocomplete="name" required>
                        </label>

                        <label>
                            <span>
                                <svg aria-hidden="true"><use href="#pmd-composer-icon-phone"></use></svg>
                                {{ $t('phone_optional', 'Phone (optional)') }}
                            </span>
                            <input name="telephone" type="tel" autocomplete="tel">
                        </label>

                        <label>
                            <span>
                                <svg aria-hidden="true"><use href="#pmd-composer-icon-mail"></use></svg>
                                {{ $t('email_optional', 'Email (optional)') }}
                            </span>
                            <input name="email" type="email" autocomplete="email">
                        </label>

                        <label>
                            <span>
                                <svg aria-hidden="true"><use href="#pmd-composer-icon-users"></use></svg>
                                {{ $t('guests', 'Guests') }}
                            </span>
                            <input name="guest_num" type="number" min="1" step="1" required>
                        </label>

                        <label>
                            <span>
                                <svg aria-hidden="true"><use href="#pmd-composer-icon-calendar"></use></svg>
                                {{ $t('date', 'Reservation date') }}
                            </span>
                            <input name="reserve_date" type="date" required>
                        </label>

                        <label>
                            <span>
                                <svg aria-hidden="true"><use href="#pmd-composer-icon-clock"></use></svg>
                                {{ $t('time', 'Reservation time') }}
                            </span>
                            <input name="reserve_time" type="time" step="900" required>
                        </label>

                        <label>
                            <span>{{ $t('duration', 'Duration') }}</span>
                            <select name="duration">
                                <option value="30">30 min</option>
                                <option value="45" selected>45 min</option>
                                <option value="60">60 min</option>
                                <option value="75">75 min</option>
                                <option value="90">90 min</option>
                                <option value="120">120 min</option>
                                <option value="150">150 min</option>
                                <option value="180">180 min</option>
                            </select>
                        </label>
                    </section>

                    <section
                        class="pmd-reservation-composer-v1__assignment"
                        aria-labelledby="pmd-res-lab-assignment-title"
                    >
                        <h3 id="pmd-res-lab-assignment-title">
                            <svg aria-hidden="true"><use href="#pmd-composer-icon-table"></use></svg>
                            {{ $t('table_assignment', 'Table assignment') }}
                        </h3>

                        <div class="pmd-reservation-composer-v1__modes">
                            <label>
                                <input type="radio" name="assignment_mode" value="auto" checked>
                                <span>{{ $t('auto_assign', 'Auto assign') }}</span>
                            </label>
                            <label>
                                <input type="radio" name="assignment_mode" value="choose">
                                <span>{{ $t('choose_tables', 'Choose table(s)') }}</span>
                            </label>
                            <label>
                                <input type="radio" name="assignment_mode" value="later">
                                <span>{{ $t('assign_later', 'Assign later') }}</span>
                            </label>
                        </div>

                        <label
                            class="pmd-reservation-composer-v1__tables"
                            data-pmd-res-lab-table-field
                            hidden
                        >
                            <span>{{ $t('tables', 'Tables') }}</span>
                            <select name="tables[]" multiple></select>
                        </label>

                        <div
                            class="pmd-reservation-composer-v1__availability"
                            data-pmd-res-lab-availability
                            aria-live="polite"
                        ></div>

                        <button
                            type="button"
                            class="pmd-reservation-composer-v1__check"
                            data-pmd-res-lab-check
                        >{{ $t('check_availability', 'Check availability') }}</button>
                    </section>

                    <label class="pmd-reservation-composer-v1__notes">
                        <span>
                            <svg aria-hidden="true"><use href="#pmd-composer-icon-notes"></use></svg>
                            {{ $t('notes', 'Notes') }}
                        </span>
                        <textarea name="comment" rows="3"></textarea>
                    </label>
                </div>

                <footer class="pmd-reservation-composer-v1__footer">
                    <button
                        type="button"
                        data-pmd-res-lab-close
                    >{{ $t('close', 'Close') }}</button>

                    <button
                        type="submit"
                        data-pmd-res-lab-save
                    >
                        <svg aria-hidden="true"><use href="#pmd-composer-icon-device-floppy"></use></svg>
                        <span>{{ $t('save', 'Save reservation') }}</span>
                    </button>
                </footer>
            </form>
        </div>
    </div>
</div>

<svg
    class="pmd-reservation-composer-v1__sprite"
    aria-hidden="true"
    width="0"
    height="0"
>
    <defs>
        <symbol id="pmd-composer-icon-calendar" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 3v4M8 3v4M4 11h16"></path></symbol>
        <symbol id="pmd-composer-icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></symbol>
        <symbol id="pmd-composer-icon-users" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"></circle><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"></path></symbol>
        <symbol id="pmd-composer-icon-user" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"></circle><path d="M5.5 21a6.5 6.5 0 0 1 13 0"></path></symbol>
        <symbol id="pmd-composer-icon-phone" viewBox="0 0 24 24"><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2"></path></symbol>
        <symbol id="pmd-composer-icon-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></symbol>
        <symbol id="pmd-composer-icon-table" viewBox="0 0 24 24"><path d="M3 10h18M5 10v8M19 10v8M4 6h16a1 1 0 0 1 1 1v3H3V7a1 1 0 0 1 1-1"></path></symbol>
        <symbol id="pmd-composer-icon-notes" viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M7 7h10M7 11h10M7 15h4"></path></symbol>
        <symbol id="pmd-composer-icon-x" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12"></path></symbol>
        <symbol id="pmd-composer-icon-device-floppy" viewBox="0 0 24 24"><path d="M6 4h11l3 3v13H4V6a2 2 0 0 1 2-2M8 4v6h8V4M8 20v-6h8v6"></path></symbol>
    </defs>
</svg>

<script
    type="application/json"
    id="pmd-reservations-lab-schedule-bootstrap-v1"
>{!! $bootstrapJson !!}</script>
