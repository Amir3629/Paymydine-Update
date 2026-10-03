<?php

namespace Admin\Services;

use Admin\Models\Reservations_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

/**
 * Server-first reservation calendar/hour payload for the clean Reservations Lab.
 * No legacy Reservations2 browser layout runtime is imported.
 */
class PmdReservationsLabScheduleV1
{
    public function payload(?int $locationId, string $locale): array
    {
        $now = Carbon::now('Europe/Berlin');
        $items = $this->reservations($locationId);
        $selected = $now->format('Y-m-d');
        $monthStart = $now->copy()->startOfMonth();
        $gridStart = $monthStart->copy()->startOfWeek(Carbon::MONDAY);

        $byDate = [];
        foreach ($items as $item) {
            $date = (string)($item['date'] ?? '');
            if ($date === '') {
                continue;
            }
            if (!isset($byDate[$date])) {
                $byDate[$date] = [];
            }
            $byDate[$date][] = $item;
        }

        $cells = [];
        for ($i = 0; $i < 42; $i++) {
            $date = $gridStart->copy()->addDays($i);
            $key = $date->format('Y-m-d');
            $cells[] = [
                'date' => $key,
                'day' => (int)$date->format('j'),
                'in_month' => (int)$date->format('n') === (int)$monthStart->format('n'),
                'is_today' => $key === $selected,
                'reservations' => $byDate[$key] ?? [],
            ];
        }

        $hourRows = [];
        for ($hour = 8; $hour <= 23; $hour++) {
            $hourRows[] = [
                'hour' => $hour,
                'label' => sprintf('%02d:00', $hour),
                'reservations' => array_values(array_filter(
                    $byDate[$selected] ?? [],
                    static function (array $item) use ($hour): bool {
                        return (int)substr((string)($item['time'] ?? '00:00'), 0, 2) === $hour;
                    }
                )),
            ];
        }

        return [
            'version' => 'reservations-lab-exact-r2-v2.4',
            'locale' => $locale,
            'locale_tag' => $locale === 'de' ? 'de-DE' : 'en-GB',
            'today' => $selected,
            'selected_date' => $selected,
            'year' => (int)$monthStart->format('Y'),
            'month' => (int)$monthStart->format('n'),
            'month_label' => $this->monthLabel($monthStart, $locale),
            'weekdays' => $locale === 'de'
                ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            'calendar_cells' => $cells,
            'hour_rows' => $hourRows,
            'reservations' => $items,
            'strings' => $this->strings($locale),
        ];
    }

    private function reservations(?int $locationId): array
    {
        try {
            $model = new Reservations_model();
            $query = Reservations_model::query()->with(['tables', 'status']);

            if (
                $locationId
                && Schema::hasColumn($model->getTable(), 'location_id')
            ) {
                $query->where($model->getTable().'.location_id', $locationId);
            }

            $rows = $query
                ->orderBy('reserve_date')
                ->orderBy('reserve_time')
                ->orderBy('reservation_id')
                ->limit(1500)
                ->get();

            return $rows->map(function ($reservation) {
                $tableIds = [];
                $tableNames = [];

                if ($reservation->tables) {
                    foreach ($reservation->tables as $table) {
                        $id = (int)($table->table_id ?? 0);
                        if ($id > 0) {
                            $tableIds[] = $id;
                        }
                        $name = trim((string)(
                            $table->pos_table_label
                            ?? $table->table_name
                            ?? $table->table_no
                            ?? ''
                        ));
                        if ($name !== '') {
                            $tableNames[] = $name;
                        }
                    }
                }

                if (!$tableIds && (int)($reservation->table_id ?? 0) > 0) {
                    $tableIds[] = (int)$reservation->table_id;
                }

                $first = trim((string)($reservation->first_name ?? ''));
                $last = trim((string)($reservation->last_name ?? ''));
                $name = trim($first.' '.$last);
                if ($name === '') {
                    $name = 'Reservation #'.(int)$reservation->reservation_id;
                }

                $status = '';
                if ($reservation->status) {
                    $status = trim((string)($reservation->status->status_name ?? ''));
                }

                return [
                    'reservation_id' => (int)$reservation->reservation_id,
                    'date' => substr((string)$reservation->reserve_date, 0, 10),
                    'time' => substr((string)$reservation->reserve_time, 0, 5),
                    'duration' => max(1, (int)($reservation->duration ?? 45)),
                    'guests' => max(0, (int)($reservation->guest_num ?? 0)),
                    'name' => $name,
                    'first_name' => $first,
                    'last_name' => $last,
                    'telephone' => trim((string)($reservation->telephone ?? '')),
                    'email' => trim((string)($reservation->email ?? '')),
                    'comment' => trim((string)($reservation->comment ?? '')),
                    'status' => $status !== '' ? $status : 'Scheduled',
                    'table_ids' => array_values(array_unique($tableIds)),
                    'table_names' => array_values(array_unique($tableNames)),
                ];
            })->values()->all();
        } catch (\Throwable $error) {
            logger()->warning('Reservations Lab schedule query failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);
            return [];
        }
    }

    private function monthLabel(Carbon $date, string $locale): string
    {
        $monthsEn = [
            1 => 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];
        $monthsDe = [
            1 => 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
        ];
        $month = (int)$date->format('n');
        return ($locale === 'de' ? $monthsDe[$month] : $monthsEn[$month]).' '.$date->format('Y');
    }

    private function strings(string $locale): array
    {
        $text = function (string $en, string $de) use ($locale): string {
            return $locale === 'de' ? $de : $en;
        };

        return [
            'reservations_workspace' => $text('Reservations workspace', 'Reservierungsbereich'),
            'floor_map' => $text('Floor map', 'Tischplan'),
            'back_to_calendar' => $text('Back to calendar', 'Zurück zum Kalender'),
            'reservations' => $text('reservations', 'Reservierungen'),
            'time_slots' => $text('time slots', 'Zeitfenster'),
            'booking' => $text('booking', 'Reservierung'),
            'bookings' => $text('bookings', 'Reservierungen'),
            'calendar' => $text('Calendar', 'Kalender'),
            'hour' => $text('Hour', 'Stunde'),
            'new_reservation' => $text('New reservation', 'Neue Reservierung'),
            'edit_reservation' => $text('Edit reservation', 'Reservierung bearbeiten'),
            'today' => $text('Today', 'Heute'),
            'previous' => $text('Previous', 'Zurück'),
            'next' => $text('Next', 'Weiter'),
            'selected_day' => $text('Selected day', 'Ausgewählter Tag'),
            'no_reservations' => $text('No reservations', 'Keine Reservierungen'),
            'guests' => $text('Guests', 'Gäste'),
            'table' => $text('Table', 'Tisch'),
            'tables' => $text('Tables', 'Tische'),
            'status' => $text('Status', 'Status'),
            'edit' => $text('Edit', 'Bearbeiten'),
            'reservation' => $text('Reservation', 'Reservierung'),
            'name' => $text('Name', 'Name'),
            'phone_optional' => $text('Phone (optional)', 'Telefon (optional)'),
            'email_optional' => $text('Email (optional)', 'E-Mail (optional)'),
            'date' => $text('Date', 'Datum'),
            'time' => $text('Time', 'Uhrzeit'),
            'duration' => $text('Duration', 'Dauer'),
            'notes' => $text('Notes', 'Notizen'),
            'table_assignment' => $text('Table assignment', 'Tischzuweisung'),
            'auto_assign' => $text('Auto assign', 'Automatisch zuweisen'),
            'choose_tables' => $text('Choose table(s)', 'Tisch(e) auswählen'),
            'assign_later' => $text('Assign later', 'Später zuweisen'),
            'check_availability' => $text('Check availability', 'Verfügbarkeit prüfen'),
            'save' => $text('Save reservation', 'Reservierung speichern'),
            'cancel' => $text('Cancel', 'Abbrechen'),
            'close' => $text('Close', 'Schließen'),
            'loading' => $text('Loading reservation…', 'Reservierung wird geladen…'),
            'checking' => $text('Checking availability…', 'Verfügbarkeit wird geprüft…'),
            'availability_requirements' => $text('Choose date, time, duration and guests.', 'Datum, Uhrzeit, Dauer und Gäste auswählen.'),
            'recommended_tables' => $text('Recommended tables', 'Empfohlene Tische'),
            'available' => $text('Available', 'Verfügbar'),
            'not_available' => $text('Not available', 'Nicht verfügbar'),
            'save_failed' => $text('The reservation could not be saved.', 'Die Reservierung konnte nicht gespeichert werden.'),
            'load_failed' => $text('The reservation could not be loaded.', 'Die Reservierung konnte nicht geladen werden.'),
            'year' => $text('Year', 'Jahr'),
            'month' => $text('Month', 'Monat'),
            'all' => $text('All', 'Alle'),
            'events' => $text('Events', 'Ereignisse'),
            'event' => $text('Event', 'Ereignis'),
            'note' => $text('Note', 'Notiz'),
            'day_note' => $text('Day note', 'Tagesnotiz'),
            'write_note' => $text('Write a note for this day', 'Notiz für diesen Tag schreiben'),
            'delete' => $text('Delete', 'Löschen'),
            'save_note' => $text('Save note', 'Notiz speichern'),
            'reservations_title' => $text('Reservations', 'Reservierungen'),
            'reservation_lower' => $text('reservation', 'Reservierung'),
            'guest' => $text('guest', 'Gast'),
            'open' => $text('Open', 'Öffnen'),
            'no_table' => $text('No table', 'Kein Tisch'),
            'time_not_set' => $text('Time not set', 'Keine Uhrzeit'),
            'scheduled' => $text('Scheduled', 'Geplant'),
        ];
    }
}
