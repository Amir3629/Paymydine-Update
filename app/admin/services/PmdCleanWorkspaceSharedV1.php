<?php

namespace Admin\Services;

use Admin\Models\Reservations_model;
use Carbon\Carbon;

/**
 * Shared server-first-paint data authority for the clean PMD workspaces.
 *
 * This service intentionally owns only data normalization. It does not render
 * Dashboard2/Reservations2 and it does not load their browser runtimes.
 */
class PmdCleanWorkspaceSharedV1
{
    public const OWNER_KPI_ORDER = [
        'revenue',
        'guests',
        'turnover',
        'channels',
        'kitchen',
        'occupancy',
        'menu',
        'tips',
    ];

    public const RESERVATION_KPI_ORDER = [
        'reservations_today',
        'upcoming_arrivals',
        'pending_confirmations',
        'available_tables',
        'no_show_rate',
        'cancellation_rate',
        'table_occupancy',
        'average_party_size',
        'reservation_tables',
        'total_seats',
        'average_turn_time',
        'waiting_list',
        'revpash',
    ];

    public function locale(): string
    {
        $raw = rawurldecode((string)($_COOKIE['pmd_admin_locale'] ?? ''));
        $raw = strtolower(trim($raw));

        if (strpos($raw, 'de') === 0) {
            return 'de';
        }

        if (strpos($raw, 'en') === 0) {
            return 'en';
        }

        $appLocale = strtolower((string)app()->getLocale());
        return strpos($appLocale, 'de') === 0 ? 'de' : 'en';
    }


    public function locationId(): ?int
    {
        try {
            if ($location = \Admin\Facades\AdminLocation::current()) {
                return (int)$location->location_id;
            }
        } catch (\Throwable $error) {
        }

        try {
            $locationId = (int)\Admin\Facades\AdminLocation::getSession('id');
            if ($locationId > 0) {
                return $locationId;
            }
        } catch (\Throwable $error) {
        }

        try {
            if (is_single_location()) {
                $locationId = (int)params('default_location_id');
                if ($locationId > 0) {
                    $location = \Admin\Models\Locations_model::isEnabled()->find($locationId);
                    if ($location) {
                        \Admin\Facades\AdminLocation::setCurrent($location);
                        return (int)$location->location_id;
                    }
                }
            }
        } catch (\Throwable $error) {
        }

        try {
            $user = \Admin\Facades\AdminAuth::getUser();
            if (!$user) {
                return null;
            }

            $staff = $user->staff;
            $locations = $staff
                ? $staff->locations->where('location_status', true)->values()
                : collect();

            if ($locations->count() !== 1) {
                return null;
            }

            $locationId = (int)$locations->first()->location_id;
            if ($locationId < 1) {
                return null;
            }

            return $locationId;
        } catch (\Throwable $error) {
            return null;
        }
    }

    public function text(string $en, string $de, string $locale = null): string
    {
        $locale = $locale ?: $this->locale();
        return $locale === 'de' ? $de : $en;
    }

    public function ownerKpiCards(string $locale = null): array
    {
        $locale = $locale ?: $this->locale();
        $payload = $this->ownerKpiPayload();
        $cards = [];

        foreach (($payload['cards'] ?? []) as $key => $card) {
            if (!in_array($key, self::OWNER_KPI_ORDER, true)) {
                continue;
            }

            $cards[$key] = $this->normalizeOwnerCard(
                (string)$key,
                is_array($card) ? $card : [],
                $locale
            );
        }

        foreach (self::OWNER_KPI_ORDER as $key) {
            if (!isset($cards[$key])) {
                $cards[$key] = $this->ownerFallbackCard($key, $locale);
            }
        }

        return $cards;
    }

    public function reservationKpiCards(array $floorBootstrap, string $locale = null): array
    {
        $locale = $locale ?: $this->locale();
        $reservations = $this->reservationRows();
        $rawTables = $floorBootstrap['data']['tables']
            ?? ($floorBootstrap['data']['sections']['floor_plan']['tables'] ?? []);

        if (!is_array($rawTables)) {
            $rawTables = [];
        }

        $now = Carbon::now();
        $todayKey = $now->format('Y-m-d');
        $allCount = count($reservations);

        $todayItems = [];
        $activeToday = [];
        $upcoming = [];
        $noShows = 0;
        $cancellations = 0;
        $pending = 0;
        $guestTotal = 0;

        foreach ($reservations as $reservation) {
            $start = $this->reservationDate($reservation);
            $status = $this->reservationStatus($reservation);
            $cancelled = $this->isCancelled($status);

            if ($this->isNoShow($status)) {
                $noShows++;
            }

            if ($cancelled) {
                $cancellations++;
            }

            if ($this->isPending($status)) {
                $pending++;
            }

            if ($start && $start->format('Y-m-d') === $todayKey) {
                $todayItems[] = $reservation;

                if (!$cancelled) {
                    $activeToday[] = $reservation;
                    $guestTotal += max(0, (int)($reservation['guest_num']
                        ?? $reservation['guests']
                        ?? $reservation['party_size']
                        ?? $reservation['covers']
                        ?? 0));
                }
            }

            if ($start && $start->greaterThanOrEqualTo($now) && !$cancelled) {
                $upcoming[] = $reservation;
            }
        }

        $enabledTables = [];
        $occupiedTables = [];
        $availableTables = [];
        $totalSeats = 0;

        foreach ($rawTables as $table) {
            if (!is_array($table) || !$this->enabledReservationTable($table)) {
                continue;
            }

            $enabledTables[] = $table;
            $totalSeats += max(0, (int)($table['max_capacity']
                ?? $table['preferred_capacity']
                ?? $table['capacity']
                ?? $table['table_capacity']
                ?? 0));

            if ($this->occupiedReservationTable($table)) {
                $occupiedTables[] = $table;
            }

            if ($this->availableReservationTable($table)) {
                $availableTables[] = $table;
            }
        }

        $activeCount = count($activeToday);
        $enabledCount = count($enabledTables);
        $availableCount = count($availableTables);
        $occupiedCount = count($occupiedTables);
        $upcomingCount = count($upcoming);

        $definitions = $this->reservationDefinitions($locale);
        $values = [
            'reservations_today' => [
                'value' => (string)$activeCount,
                'description' => $this->text(
                    'Active bookings scheduled today',
                    'Aktive Reservierungen für heute',
                    $locale
                ),
                'connected' => true,
                'period' => 'today',
            ],
            'upcoming_arrivals' => [
                'value' => (string)$upcomingCount,
                'description' => $this->text(
                    'Future active reservations',
                    'Kommende aktive Reservierungen',
                    $locale
                ),
                'connected' => true,
                'period' => 'current',
            ],
            'pending_confirmations' => [
                'value' => (string)$pending,
                'description' => $this->text(
                    'Reservations awaiting confirmation',
                    'Reservierungen mit ausstehender Bestätigung',
                    $locale
                ),
                'connected' => true,
                'period' => 'current',
            ],
            'available_tables' => [
                'value' => (string)$availableCount,
                'description' => $locale === 'de'
                    ? $availableCount.' von '.$enabledCount.' Tischen verfügbar'
                    : $availableCount.' of '.$enabledCount.' tables available',
                'connected' => true,
                'period' => 'current',
            ],
            'no_show_rate' => [
                'value' => $this->percentage($noShows, $allCount),
                'description' => $locale === 'de'
                    ? $noShows.' No-Shows aus '.$allCount.' Reservierungen'
                    : $noShows.' no-shows from '.$allCount.' reservations',
                'connected' => true,
                'period' => 'current',
            ],
            'cancellation_rate' => [
                'value' => $this->percentage($cancellations, $allCount),
                'description' => $locale === 'de'
                    ? $cancellations.' Stornierungen aus '.$allCount.' Reservierungen'
                    : $cancellations.' cancelled from '.$allCount.' reservations',
                'connected' => true,
                'period' => 'current',
            ],
            'table_occupancy' => [
                'value' => $this->percentage($occupiedCount, $enabledCount),
                'description' => $locale === 'de'
                    ? $occupiedCount.' von '.$enabledCount.' Tischen belegt'
                    : $occupiedCount.' of '.$enabledCount.' tables occupied',
                'connected' => true,
                'period' => 'current',
            ],
            'average_party_size' => [
                'value' => $activeCount
                    ? rtrim(rtrim(number_format($guestTotal / $activeCount, 1, '.', ''), '0'), '.')
                    : '0',
                'description' => $this->text(
                    'Average guests per booking today',
                    'Durchschnittliche Gäste pro Reservierung heute',
                    $locale
                ),
                'connected' => true,
                'period' => 'today',
            ],
            'reservation_tables' => [
                'value' => (string)$enabledCount,
                'description' => $this->text(
                    'Tables enabled for reservations',
                    'Für Reservierungen aktivierte Tische',
                    $locale
                ),
                'connected' => true,
                'period' => 'current',
            ],
            'total_seats' => [
                'value' => (string)$totalSeats,
                'description' => $this->text(
                    'Combined enabled table capacity',
                    'Gesamtkapazität der aktivierten Tische',
                    $locale
                ),
                'connected' => true,
                'period' => 'current',
            ],
            'average_turn_time' => [
                'value' => '—',
                'description' => $this->text(
                    'Data required: seated and completed timestamps',
                    'Daten erforderlich: Sitz- und Abschlusszeitpunkte',
                    $locale
                ),
                'connected' => false,
                'period' => 'current',
            ],
            'waiting_list' => [
                'value' => '—',
                'description' => $this->text(
                    'Data required: waiting-list records',
                    'Daten erforderlich: Wartelisteneinträge',
                    $locale
                ),
                'connected' => false,
                'period' => 'current',
            ],
            'revpash' => [
                'value' => '—',
                'description' => $this->text(
                    'Data required: linked revenue and service hours',
                    'Daten erforderlich: Umsatz und Servicezeiten',
                    $locale
                ),
                'connected' => false,
                'period' => 'current',
            ],
        ];

        $cards = [];
        foreach (self::RESERVATION_KPI_ORDER as $key) {
            $definition = $definitions[$key];
            $metric = $values[$key];

            $cards[$key] = [
                'key' => $key,
                'title' => $definition['title'],
                'tone' => $definition['tone'],
                'icon' => $definition['icon'],
                'format' => 'display',
                'period' => $metric['period'],
                'value' => $metric['value'],
                'description' => $metric['description'],
                'connected' => $metric['connected'],
                'source' => 'Reservations2 reservation model + shared live floor data',
            ];
        }

        return $cards;
    }

    public function readSelection(
        string $cookieName,
        array $order,
        array $defaults
    ): array {
        $raw = (string)request()->cookie($cookieName, '');

        if ($raw === '') {
            $raw = rawurldecode((string)($_COOKIE[$cookieName] ?? ''));
        }

        $requested = array_values(array_filter(array_map(
            'trim',
            explode(',', $raw)
        )));

        $selection = [];

        foreach ($requested as $key) {
            if (in_array($key, $order, true) && !in_array($key, $selection, true)) {
                $selection[] = $key;
            }

            if (count($selection) === 4) {
                break;
            }
        }

        foreach ($defaults as $key) {
            if (in_array($key, $order, true) && !in_array($key, $selection, true)) {
                $selection[] = $key;
            }

            if (count($selection) === 4) {
                break;
            }
        }

        foreach ($order as $key) {
            if (!in_array($key, $selection, true)) {
                $selection[] = $key;
            }

            if (count($selection) === 4) {
                break;
            }
        }

        return array_slice($selection, 0, 4);
    }

    /**
     * Same proven server-first Floor data/layout/state authority used by the
     * current Dashboard Lab. The visual/runtime authority remains the existing
     * shared Floor files; this method only prepares first-paint data.
     */
    public function floorBootstrap(): array
    {
        $data = [];
        $layout = [
            'ok' => true,
            'tables' => [],
            'floor' => ['width' => 1000, 'height' => 560],
        ];
        $state = [
            'tables' => [],
            'merges' => [],
        ];
        $errors = [];

        try {
            $source = new class extends \Admin\Controllers\PmdWaiterDashboardV151 {
                public function pmdCleanWorkspaceFloorData(): array
                {
                    return $this->v9CompatiblePayload();
                }
            };

            $data = $source->pmdCleanWorkspaceFloorData();
        } catch (\Throwable $error) {
            $errors['data'] = $error->getMessage();
        }

        try {
            $source = new class extends \Admin\Controllers\PmdFloorV1 {
                public function pmdCleanWorkspaceFloorState(): array
                {
                    return $this->canonicalizeState($this->readState());
                }
            };

            $state = $source->pmdCleanWorkspaceFloorState();
        } catch (\Throwable $error) {
            $errors['state'] = $error->getMessage();
        }

        try {
            $source = new \Admin\Controllers\PmdOwnerDashboardCleanV1();
            $response = $source->floorLayout();

            if (is_object($response) && method_exists($response, 'getData')) {
                $decoded = $response->getData(true);

                if (is_array($decoded) && ($decoded['ok'] ?? false) === true) {
                    $layout = $decoded;
                }
            }
        } catch (\Throwable $error) {
            $errors['layout'] = $error->getMessage();
        }

        $modeRaw = strtolower(trim(rawurldecode((string)(
            $_COOKIE['pmd_dashboard_lab_floor_mode'] ?? 'row'
        ))));
        $mode = $modeRaw === 'full' ? 'full' : 'row';

        $zoomRaw = rawurldecode((string)(
            $_COOKIE['pmd_dashboard_lab_floor_zoom'] ?? '1'
        ));
        $zoom = is_numeric($zoomRaw)
            ? max(0.4, min(1.6, (float)$zoomRaw))
            : 1.0;

        $displayTables = $this->buildFloorDisplayTables(
            is_array($data) ? $data : [],
            is_array($layout) ? $layout : [],
            is_array($state) ? $state : [],
            $mode
        );

        return [
            'version' => 'clean-workspace-shared-floor-v1',
            'server_first_paint' => true,
            'mode' => $mode,
            'zoom' => $zoom,
            'data' => is_array($data) ? $data : [],
            'layout' => is_array($layout) ? $layout : [],
            'state' => is_array($state) ? $state : [],
            'display_tables' => $displayTables,
            'endpoints' => [
                'data' => admin_url('pmd-waiter-dashboard-v9-tenant-data'),
                'layout' => admin_url('pmd-owner-dashboard-floor-layout'),
                'state' => admin_url('pmd-floor-v1/state'),
                'order' => admin_url('waiter-pos/{table}'),
            ],
            'errors' => $errors,
        ];
    }

    private function ownerKpiPayload(): array
    {
        try {
            $source = new class extends \Admin\Controllers\Dashboard2 {
                public function pmdCleanWorkspaceOwnerPayload(): array
                {
                    return $this->kpiPayload();
                }
            };

            $payload = $source->pmdCleanWorkspaceOwnerPayload();

            if (
                !is_array($payload)
                || ($payload['success'] ?? false) !== true
                || !isset($payload['cards'])
                || !is_array($payload['cards'])
            ) {
                throw new \RuntimeException('Dashboard2 KPI payload contract invalid.');
            }

            return $payload;
        } catch (\Throwable $error) {
            logger()->warning('Clean workspace owner KPI render failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);

            return [
                'success' => false,
                'version' => 'fallback',
                'cards' => [],
            ];
        }
    }

    private function normalizeOwnerCard(string $key, array $card, string $locale): array
    {
        $period = in_array($key, ['occupancy', 'menu'], true)
            ? 'current'
            : 'today';

        $periods = $card['periods'] ?? null;
        $aggregate = $period === 'current'
            ? $periods
            : (is_array($periods) ? ($periods[$period] ?? null) : null);

        if (!is_array($aggregate)) {
            $aggregate = [
                'available' => false,
                'value' => null,
                'sample_count' => 0,
                'reason' => 'Source unavailable',
                'source' => 'KPI aggregate unavailable',
            ];
        }

        $available = ($aggregate['available'] ?? false) === true;
        $value = $aggregate['value'] ?? null;

        if (!$available) {
            $status = $this->text('Source unavailable', 'Quelle nicht verfügbar', $locale);
        } elseif ($value === null) {
            $status = $locale === 'de'
                ? $this->translateOwnerReason((string)($aggregate['reason'] ?? 'Keine abgeschlossenen Datensätze'))
                : (string)($aggregate['reason'] ?? 'No completed records');
        } else {
            $status = $this->text('Connected', 'Verbunden', $locale);
        }

        $samples = isset($aggregate['sample_count'])
            ? (int)$aggregate['sample_count']
            : null;

        $periodLabel = $period === 'today'
            ? $this->text('Today', 'Heute', $locale)
            : $this->text('Current', 'Aktuell', $locale);

        $description = $periodLabel.' · '.$status;

        if ($samples !== null) {
            $description .= ' · '.$samples.' '.$this->text('samples', 'Daten', $locale);
        }

        $identity = $this->ownerIdentity($key, $locale);

        return [
            'key' => $key,
            'title' => $identity['title'],
            'tone' => (string)($card['tone'] ?? $identity['tone']),
            'icon' => (string)($card['icon'] ?? $identity['icon']),
            'format' => (string)($card['format'] ?? $identity['format']),
            'period' => $period,
            'value' => $this->formatValue(
                (string)($card['format'] ?? $identity['format']),
                $value,
                is_array($card['currency'] ?? null) ? $card['currency'] : []
            ),
            'description' => $description,
            'connected' => $available,
            'source' => (string)($aggregate['source'] ?? ''),
        ];
    }

    private function ownerFallbackCard(string $key, string $locale): array
    {
        $identity = $this->ownerIdentity($key, $locale);

        return [
            'key' => $key,
            'title' => $identity['title'],
            'tone' => $identity['tone'],
            'icon' => $identity['icon'],
            'format' => $identity['format'],
            'period' => in_array($key, ['occupancy', 'menu'], true) ? 'current' : 'today',
            'value' => '—',
            'description' => $this->text('Source unavailable', 'Quelle nicht verfügbar', $locale),
            'connected' => false,
            'source' => 'Clean workspace fallback',
        ];
    }

    private function ownerIdentity(string $key, string $locale): array
    {
        $definitions = [
            'revenue' => [
                'Revenue', 'Umsatz', 'green', 'money', 'money',
            ],
            'guests' => [
                'Guests Served', 'Bediente Gäste', 'purple', 'users', 'number',
            ],
            'turnover' => [
                'Table Turnover', 'Tischumschlag', 'orange', 'timer', 'minutes',
            ],
            'channels' => [
                'Dine In / Take Away', 'Vor Ort / Zum Mitnehmen', 'blue', 'utensils', 'channels',
            ],
            'kitchen' => [
                'Kitchen Ticket Time', 'Küchen-Ticketzeit', 'orange', 'flame', 'minutes',
            ],
            'occupancy' => [
                'Table Occupancy', 'Tischbelegung', 'green', 'table', 'percent',
            ],
            'menu' => [
                'Menu Availability', 'Menüverfügbarkeit', 'red', 'menu', 'menu',
            ],
            'tips' => [
                'Tips', 'Trinkgeld', 'green', 'star', 'money',
            ],
        ];

        $definition = $definitions[$key]
            ?? [$key, $key, 'green', 'money', 'number'];

        return [
            'title' => $locale === 'de' ? $definition[1] : $definition[0],
            'tone' => $definition[2],
            'icon' => $definition[3],
            'format' => $definition[4],
        ];
    }

    private function translateOwnerReason(string $reason): string
    {
        $map = [
            'No completed records' => 'Keine abgeschlossenen Datensätze',
            'No activity in this period' => 'Keine Aktivität in diesem Zeitraum',
            'Source unavailable' => 'Quelle nicht verfügbar',
        ];

        return $map[$reason] ?? $reason;
    }

    private function reservationDefinitions(string $locale): array
    {
        $rows = [
            'reservations_today' => ['Reservations Today', 'Heutige Reservierungen', 'calendar', 'green'],
            'upcoming_arrivals' => ['Upcoming Arrivals', 'Bevorstehende Ankünfte', 'clock', 'orange'],
            'pending_confirmations' => ['Pending Confirmations', 'Ausstehende Bestätigungen', 'pending', 'blue'],
            'available_tables' => ['Available Tables', 'Freie Tische', 'table', 'green'],
            'no_show_rate' => ['No-show Rate', 'No-Show-Rate', 'user-off', 'red'],
            'cancellation_rate' => ['Cancellation Rate', 'Stornierungsrate', 'cancel', 'red'],
            'table_occupancy' => ['Table Occupancy', 'Tischbelegung', 'occupancy', 'blue'],
            'average_party_size' => ['Average Party Size', 'Ø Gruppengröße', 'users', 'purple'],
            'reservation_tables' => ['Reservation Tables', 'Reservierungstische', 'table', 'orange'],
            'total_seats' => ['Total Seats', 'Sitzplätze gesamt', 'seats', 'purple'],
            'average_turn_time' => ['Average Table Turn Time', 'Ø Tischumschlagszeit', 'timer', 'orange'],
            'waiting_list' => ['Waiting List', 'Warteliste', 'list', 'blue'],
            'revpash' => ['Revenue per Available Seat Hour', 'Umsatz pro verfügbarem Sitzplatz und Stunde', 'money', 'green'],
        ];

        $definitions = [];
        foreach ($rows as $key => $row) {
            $definitions[$key] = [
                'title' => $locale === 'de' ? $row[1] : $row[0],
                'icon' => $row[2],
                'tone' => $row[3],
            ];
        }

        return $definitions;
    }

    private function reservationRows(): array
    {
        try {
            $query = Reservations_model::query()
                ->with(['tables', 'status']);

            $locationId = $this->locationId();
            if ($locationId && in_array('location_id', $query->getModel()->getFillable(), true)) {
                $query->where('location_id', $locationId);
            } elseif ($locationId) {
                // location_id is part of the live reservation schema even when not fillable.
                $query->where($query->getModel()->getTable().'.location_id', $locationId);
            }

            $reservations = $query
                ->orderBy('reservation_id', 'desc')
                ->orderBy('reserve_date')
                ->orderBy('reserve_time')
                ->limit(1500)
                ->get();

            return $reservations->map(function ($reservation) {
                $payload = $reservation->attributesToArray();

                $payload['status_name'] = $reservation->status
                    ? (string)$reservation->status->status_name
                    : (string)($payload['status_name'] ?? '');

                return $payload;
            })->values()->all();
        } catch (\Throwable $error) {
            logger()->warning('Clean Reservations workspace KPI query failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);

            return [];
        }
    }

    private function reservationDate(array $item)
    {
        $direct = $item['reservation_datetime']
            ?? $item['start_at']
            ?? $item['starts_at']
            ?? null;

        if ($direct) {
            try {
                return Carbon::parse((string)$direct);
            } catch (\Throwable $error) {
                // Fall through to date + time fields.
            }
        }

        $rawDate = $item['reserve_date']
            ?? $item['reservation_date']
            ?? $item['booking_date']
            ?? $item['date']
            ?? null;

        if (!$rawDate) {
            return null;
        }

        $rawTime = $item['reserve_time']
            ?? $item['reservation_time']
            ?? $item['booking_time']
            ?? $item['time']
            ?? '00:00';

        try {
            return Carbon::parse(
                trim((string)$rawDate).' '.trim((string)$rawTime)
            );
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function reservationStatus(array $item): string
    {
        $value = $item['status_name']
            ?? $item['reservation_status']
            ?? $item['status']
            ?? '';

        if (is_array($value)) {
            $value = $value['status_name']
                ?? $value['name']
                ?? $value['label']
                ?? '';
        }

        return strtolower(trim(preg_replace('/\s+/', ' ', (string)$value)));
    }

    private function isCancelled(string $status): bool
    {
        return preg_match('/cancel|declin|reject|storniert/i', $status) === 1;
    }

    private function isNoShow(string $status): bool
    {
        return preg_match('/no[\s_-]?show|nicht erschienen/i', $status) === 1;
    }

    private function isPending(string $status): bool
    {
        return preg_match('/pending|received|await|unconfirmed|offen/i', $status) === 1;
    }

    private function enabledReservationTable(array $table): bool
    {
        if (!array_key_exists('table_status', $table) || $table['table_status'] === null) {
            return true;
        }

        return $table['table_status'] === true || (int)$table['table_status'] === 1;
    }

    private function occupiedReservationTable(array $table): bool
    {
        $state = strtolower(trim((string)(
            $table['operational_status']
            ?? $table['status']
            ?? ''
        )));

        if (preg_match('/occupied|reserved|busy|booked|belegt/i', $state) === 1) {
            return true;
        }

        return (int)($table['open_orders'] ?? 0) > 0;
    }

    private function availableReservationTable(array $table): bool
    {
        if (!$this->enabledReservationTable($table)) {
            return false;
        }

        $state = strtolower(trim((string)(
            $table['operational_status']
            ?? $table['status']
            ?? ''
        )));

        if (preg_match('/occupied|reserved|busy|booked|blocked|merged|unavailable|belegt/i', $state) === 1) {
            return false;
        }

        return (int)($table['open_orders'] ?? 0) === 0;
    }

    private function percentage(int $part, int $total): string
    {
        if ($total <= 0) {
            return '0%';
        }

        $value = number_format(($part / $total) * 100, 1, '.', '');
        $value = preg_replace('/\.0$/', '', $value);
        return $value.'%';
    }

    private function buildFloorDisplayTables(
        array $data,
        array $layout,
        array $state,
        string $mode
    ): array {
        $rawTables = $data['tables']
            ?? ($data['sections']['floor_plan']['tables'] ?? []);

        if (!is_array($rawTables)) {
            $rawTables = [];
        }

        $orders = $data['orders'] ?? ($data['current_orders'] ?? []);
        if (!is_array($orders)) {
            $orders = [];
        }

        $tables = [];

        foreach ($rawTables as $index => $raw) {
            if (!is_array($raw)) {
                continue;
            }

            $id = trim((string)(
                $raw['id']
                ?? $raw['table_id']
                ?? $raw['location_table_id']
                ?? $raw['number']
                ?? $raw['table_number']
                ?? ''
            ));

            $number = trim((string)(
                $raw['number']
                ?? $raw['table_number']
                ?? $raw['table_no']
                ?? $raw['id']
                ?? $raw['table_id']
                ?? ''
            ));

            if ($id === '' || $number === '') {
                continue;
            }

            $cleanFloorKey = static function ($value): string {
                return trim((string)preg_replace('/\s+/', ' ', (string)$value));
            };

            $tableKeys = array_values(array_filter(array_map(
                $cleanFloorKey,
                [
                    $raw['id'] ?? null,
                    $raw['table_id'] ?? null,
                    $raw['number'] ?? null,
                    $raw['table_number'] ?? null,
                    $raw['table_no'] ?? null,
                    $raw['name'] ?? null,
                    $raw['label'] ?? null,
                ]
            ), static function ($value) {
                return $value !== '';
            }));

            $linkedOrders = array_values(array_filter(
                $orders,
                static function ($order) use ($tableKeys, $cleanFloorKey): bool {
                    if (!is_array($order)) {
                        return false;
                    }

                    $orderKeys = array_values(array_filter(array_map(
                        $cleanFloorKey,
                        [
                            $order['table_id'] ?? null,
                            $order['location_table_id'] ?? null,
                            $order['table_number'] ?? null,
                            $order['table_no'] ?? null,
                            $order['table_ref'] ?? null,
                            $order['table'] ?? null,
                            $order['table_label'] ?? null,
                        ]
                    ), static function ($value) {
                        return $value !== '';
                    }));

                    return count(array_intersect($tableKeys, $orderKeys)) > 0;
                }
            ));

            $linkedOrderHasNote = count(array_filter(
                $linkedOrders,
                static function ($order): bool {
                    return trim((string)(
                        $order['note'] ?? $order['comment'] ?? ''
                    )) !== '';
                }
            )) > 0;

            $custom = is_array($state['tables'][$id] ?? null)
                ? $state['tables'][$id]
                : [];

            $rawStatus = strtolower(trim((string)(
                $custom['status']
                ?? $raw['status']
                ?? $raw['latest_order_status']
                ?? ''
            )));

            $waiterCall = $rawStatus === 'waiter-call'
                || $this->floorBool($raw['waiter_call'] ?? false)
                || $this->floorBool($raw['needs_waiter'] ?? false)
                || $this->floorBool($raw['call_waiter'] ?? false);

            $cleaning = $rawStatus === 'cleaning'
                || $this->floorBool($raw['cleaning_required'] ?? false)
                || $this->floorBool($raw['needs_cleaning'] ?? false);

            $reserved = $rawStatus === 'reserved'
                || $this->floorBool($raw['reserved'] ?? false)
                || $this->floorBool($raw['is_reserved'] ?? false);

            $occupied = $rawStatus === 'occupied'
                || count($linkedOrders) > 0
                || (int)($raw['open_orders'] ?? 0) > 0;

            $note = trim((string)(
                $custom['note'] ?? $raw['note'] ?? $raw['comment'] ?? ''
            ));

            $status = ($waiterCall || $note !== '' || $linkedOrderHasNote)
                ? 'attention'
                : ($cleaning
                    ? 'cleaning'
                    : ($reserved
                        ? 'reserved'
                        : ($occupied ? 'occupied' : 'available')));

            $floor = is_array($raw['floor'] ?? null) ? $raw['floor'] : [];

            $x = $this->floorNumber(
                $raw['floor_x'] ?? $floor['x'] ?? null,
                80 + (($index % 6) * 150)
            );
            $y = $this->floorNumber(
                $raw['floor_y'] ?? $floor['y'] ?? null,
                60 + (floor($index / 6) * 110)
            );

            $x = max(64.0, min(936.0, $x));
            $y = max(54.0, min(506.0, $y));

            $tables[$id] = [
                'id' => $id,
                'number' => $number,
                'name' => trim((string)(
                    $raw['name'] ?? $raw['label'] ?? ('Table '.$number)
                )),
                'area' => trim((string)(
                    $raw['section']
                    ?? $raw['table_section']
                    ?? $raw['table_zone']
                    ?? $raw['zone']
                    ?? $raw['floor_name']
                    ?? 'Main'
                )),
                'capacity' => (int)(
                    $raw['capacity'] ?? $raw['table_capacity'] ?? 0
                ),
                'status' => $status,
                'waiter_call' => $waiterCall,
                'cleaning' => $cleaning,
                'note' => $note,
                'open_orders' => (int)($raw['open_orders'] ?? 0),
                'x' => $x,
                'y' => $y,
                'w' => 108,
                'h' => 88,
                'is_merged' => false,
                'merge_id' => null,
                'member_ids' => [],
                'smallest_number' => is_numeric($number) ? (float)$number : 999999,
            ];
        }

        $handled = [];
        $display = [];
        $merges = is_array($state['merges'] ?? null) ? $state['merges'] : [];

        foreach ($tables as $id => $table) {
            if (isset($handled[$id])) {
                continue;
            }

            $mergeId = null;
            $memberIds = [];

            foreach ($merges as $candidateId => $merge) {
                $ids = array_map('strval', (array)($merge['table_ids'] ?? []));

                if (in_array((string)$id, $ids, true)) {
                    $mergeId = (string)$candidateId;
                    $memberIds = $ids;
                    break;
                }
            }

            if ($mergeId === null) {
                $display[] = $table;
                $handled[$id] = true;
                continue;
            }

            $members = [];
            foreach ($memberIds as $memberId) {
                if (isset($tables[$memberId])) {
                    $members[] = $tables[$memberId];
                    $handled[$memberId] = true;
                }
            }

            if (count($members) < 2) {
                $display[] = $table;
                continue;
            }

            usort($members, static function ($left, $right) {
                return ($left['smallest_number'] <=> $right['smallest_number'])
                    ?: strnatcasecmp($left['number'], $right['number']);
            });

            $priority = [
                'available' => 1,
                'occupied' => 2,
                'reserved' => 3,
                'cleaning' => 4,
                'attention' => 5,
                'waiter-call' => 5,
            ];

            $status = 'available';
            foreach ($members as $member) {
                if (($priority[$member['status']] ?? 0) > ($priority[$status] ?? 0)) {
                    $status = $member['status'];
                }
            }

            $numbers = array_column($members, 'number');
            $display[] = [
                'id' => $members[0]['id'],
                'number' => implode(' + ', $numbers),
                'name' => 'Merged tables '.implode(', ', $numbers),
                'area' => $members[0]['area'],
                'capacity' => array_sum(array_column($members, 'capacity')),
                'status' => $status,
                'waiter_call' => count(array_filter($members, static function ($member) {
                    return $member['waiter_call'];
                })) > 0,
                'cleaning' => count(array_filter($members, static function ($member) {
                    return $member['cleaning'];
                })) > 0,
                'note' => implode(' · ', array_values(array_filter(
                    array_column($members, 'note')
                ))),
                'open_orders' => array_sum(array_column($members, 'open_orders')),
                'x' => array_sum(array_column($members, 'x')) / count($members),
                'y' => array_sum(array_column($members, 'y')) / count($members),
                'w' => $mode === 'row' ? 270 : 178,
                'h' => $mode === 'row' ? 104 : 146,
                'is_merged' => true,
                'merge_id' => $mergeId,
                'member_ids' => array_column($members, 'id'),
                'smallest_number' => min(array_column($members, 'smallest_number')),
            ];
        }

        if ($mode === 'row') {
            usort($display, static function ($left, $right) {
                return ($left['smallest_number'] <=> $right['smallest_number'])
                    ?: strnatcasecmp($left['number'], $right['number']);
            });

            $cursor = 24.0;
            foreach ($display as &$table) {
                $table['x'] = $cursor + ($table['w'] / 2);
                $table['y'] = 22 + ($table['h'] / 2);
                $cursor += $table['w'] + 18;
            }
            unset($table);
        }

        return array_values($display);
    }

    private function floorBool($value): bool
    {
        return in_array($value, [true, 1, '1', 'true'], true);
    }

    private function floorNumber($value, float $fallback): float
    {
        return is_numeric($value) ? (float)$value : $fallback;
    }

    private function formatValue(string $format, $value, array $currency): string
    {
        if ($value === null) {
            return '—';
        }

        if ($format === 'money') {
            $symbol = (string)($currency['symbol'] ?? '€');
            return $symbol.number_format((float)$value, 2, '.', ',');
        }

        if ($format === 'minutes') {
            return (string)round((float)$value).' min';
        }

        if ($format === 'channels') {
            $channels = is_array($value) ? $value : [];
            return (string)(int)($channels['dine_in'] ?? 0)
                .' / '.(string)(int)($channels['takeaway'] ?? 0);
        }

        if ($format === 'percent') {
            return (string)(float)$value.'%';
        }

        if ($format === 'menu') {
            $menu = is_array($value) ? $value : [];
            return (string)(int)($menu['available_now'] ?? 0)
                .' / '.(string)(int)($menu['total'] ?? 0);
        }

        if (is_float($value)) {
            return rtrim(rtrim(number_format($value, 1, '.', ''), '0'), '.');
        }

        return (string)$value;
    }
}
