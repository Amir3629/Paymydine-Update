<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdRoleDashboardDataV1;
use Admin\Services\PmdAdminPresenceService;
use Illuminate\Support\Carbon;

/**
 * PMD_MANAGER_EXACT_OWNER_COMPONENT_V3_5_2
 * PMD_MANAGER_REMOVE_ROLE_INSIGHT_CARDS_V3_5_2
 * PMD_MANAGER_ONLINE_STAFF_CARD_V3_5_2
 *
 * Manager keeps the approved four top KPI cards and exact Owner analytics.
 * The six V3.5 manager-only insight cards are removed completely. A single
 * Manager-only online-staff card is rendered AFTER all Owner analytics cards.
 */
class Managerlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        $this->addCss('css/pmd-dashboard-lab-analytics-v1.css');
        $this->addCss('css/pmd-role-dashboard-v1.css');
        $this->addCss('css/pmd-manager-online-staff-v1.css');
        $this->addCss('css/pmd-kitchen-today-team-v1.css');
        $this->addJs('js/pmd-dashboard-lab-analytics-v1.js');
    }

    protected function pmdWorkspaceKey(): string
    {
        return 'manager';
    }

    protected function pmdKpiMode(): string
    {
        return 'owner';
    }

    protected function pmdKpiDefaults(): array
    {
        return [
            'live_orders',
            'open_alerts',
            'occupied_tables',
            'upcoming_reservations',
        ];
    }

    protected function pmdAfterFloorPartial(): ?string
    {
        return 'admin::_partials.pmd_manager_dashboard_v1';
    }

    public function index()
    {
        if ((string)request()->query('pmd_analytics', '') === '1') {
            /** @var PmdRoleDashboardDataV1 $dashboard */
            $dashboard = app(PmdRoleDashboardDataV1::class);
            return response()->json(
                $dashboard->ownerAnalyticsPayload(
                    (string)request()->query('period', 'month'),
                    null
                )
            );
        }

        return parent::index();
    }

    protected function pmdPrepareWorkspaceVars(
        PmdCleanWorkspaceSharedV1 $shared,
        string $locale,
        array $floorBootstrap
    ): void {
        /** @var PmdRoleDashboardDataV1 $dashboard */
        $dashboard = app(PmdRoleDashboardDataV1::class);

        /*
         * PMD_MANAGER_RESERVATION_CALENDAR_PAYLOAD_V1
         *
         * SAME authority as ReservationsLab.
         * Manager is only another host surface.
         */
        try {
            $this->vars['pmdReservationsLabSchedule'] =
                app(
                    \Admin\Services\PmdReservationsLabScheduleV1::class
                )->payload(
                    $shared->locationId(),
                    $locale
                );
        } catch (\Throwable $error) {
            $this->vars['pmdReservationsLabSchedule'] = [];
        }


        $bundle = $dashboard->bundle([
            'liveorders' => ['type' => 'liveorders', 'period' => 'today'],
            'alerts' => ['type' => 'alerts', 'period' => 'today'],
            'reservations' => ['type' => 'reservations', 'period' => 'today'],
        ], $shared->locationId(), $locale);

        /*
         * PMD_MANAGER_FLOOR_VISIBLE_OCCUPANCY_V3_3_2
         * The Manager sees the Floor directly above these cards. Use that same
         * already-resolved Floor display authority for table counts so KPI and
         * visible Floor cannot disagree.
         */
        $bundle = $this->syncVisibleFloorCounts($bundle, $floorBootstrap);

        $this->vars['pmdRoleDashboardMode'] = 'manager';
        $this->vars['pmdRoleDashboardBundle'] = $bundle;
        $this->vars['pmdRoleOwnerAnalyticsBootstrap'] =
            $dashboard->ownerAnalyticsBootstrap($shared->locationId());
        $this->vars['pmdRoleOwnerAnalyticsEndpoint'] =
            admin_url('managerlab').'?pmd_analytics=1';
        // PMD_MANAGER_REMOVE_ROLE_INSIGHT_CARDS_V3_5_2
        // Service pulse / Floor pressure / Guest flow / Menu demand /
        // Operational exceptions / Guest feedback are intentionally gone.
        $this->vars['pmdRoleInsightCards'] = [];
        $this->vars['pmdManagerOnlineStaff'] =
            $this->managerOnlineStaffSnapshot($shared->locationId(), $locale);
        try {
            $this->vars['pmdKitchenTodayTeam'] = app(\App\Services\PmdKitchenWorkforceService::class)
                ->todayCard(max(1, (int)$shared->locationId()));
        } catch (\Throwable $error) {
            $this->vars['pmdKitchenTodayTeam'] = ['ready' => false];
        }
        $this->installManagerKpis($bundle, $locale, $shared);
    }

    private function syncVisibleFloorCounts(array $bundle, array $floorBootstrap): array
    {
        $tables = is_array($floorBootstrap['display_tables'] ?? null)
            ? array_values($floorBootstrap['display_tables'])
            : [];

        if (!$tables) {
            return $bundle;
        }

        $enabled = count($tables);
        $occupied = 0;

        foreach ($tables as $table) {
            if (!is_array($table)) continue;
            $status = strtolower(trim((string)($table['status'] ?? '')));
            if (in_array($status, ['occupied', 'attention', 'waiter-call'], true)) {
                $occupied++;
            }
        }

        if (!isset($bundle['reports']['liveorders']) || !is_array($bundle['reports']['liveorders'])) {
            return $bundle;
        }

        $stats = is_array($bundle['reports']['liveorders']['stats'] ?? null)
            ? $bundle['reports']['liveorders']['stats']
            : [];

        foreach ($stats as &$stat) {
            $label = (string)($stat['label'] ?? '');
            if ($label === 'Occupied tables') {
                $stat['value'] = (string)$occupied;
                $stat['meta'] = 'Visible Floor authority';
            } elseif ($label === 'Enabled tables') {
                $stat['value'] = (string)$enabled;
                $stat['meta'] = 'Visible Floor authority';
            }
        }
        unset($stat);

        $bundle['reports']['liveorders']['stats'] = $stats;
        $bundle['reports']['liveorders']['floor_visible_tables'] = $enabled;
        $bundle['reports']['liveorders']['floor_occupied_tables'] = $occupied;

        return $bundle;
    }

    private function installManagerKpis(
        array $bundle,
        string $locale,
        PmdCleanWorkspaceSharedV1 $shared
    ): void
    {
        $reports = is_array($bundle['reports'] ?? null)
            ? $bundle['reports']
            : [];

        $live = is_array($reports['liveorders'] ?? null) ? $reports['liveorders'] : [];
        $alerts = is_array($reports['alerts'] ?? null) ? $reports['alerts'] : [];
        $reservations = is_array($reports['reservations'] ?? null) ? $reports['reservations'] : [];
        $de = strtolower($locale) === 'de';

        /*
         * PMD_MANAGER_KPI_CHOICES_V3_6
         *
         * Available tables:
         * same visible Floor count authority.
         *
         * Staff online:
         * same already-resolved PmdAdminPresenceService snapshot.
         */
        $enabledTables = max(
            0,
            (int)$this->statValue(
                $live,
                'Enabled tables'
            )
        );

        $occupiedTables = max(
            0,
            (int)$this->statValue(
                $live,
                'Occupied tables'
            )
        );

        $availableTables = max(
            0,
            $enabledTables - $occupiedTables
        );

        $onlineStaff = is_array(
            $this->vars['pmdManagerOnlineStaff'] ?? null
        )
            ? $this->vars['pmdManagerOnlineStaff']
            : [];


        $cards = [
            'live_orders' => $this->roleCard(
                $de ? 'Live-Bestellungen' : 'Live orders',
                $this->statValue($live, 'Live orders'),
                $de ? 'Aktive Bestellungen im laufenden Service' : 'Active orders in the current service',
                'list',
                'orange',
                $live,
                'current'
            ),
            'open_alerts' => $this->roleCard(
                $de ? 'Benötigt Aufmerksamkeit' : 'Needs attention',
                $this->statValue($alerts, 'Open alerts'),
                $de ? 'Operative Ausnahmen, die heute geprüft werden sollten' : 'Operational exceptions to review today',
                'pending',
                'red',
                $alerts,
                'today'
            ),
            'occupied_tables' => $this->roleCard(
                $de ? 'Belegte Tische' : 'Occupied tables',
                $this->statValue($live, 'Occupied tables'),
                $de ? 'Belegte Tische aus der sichtbaren Floor-Ansicht' : 'Occupied tables from the visible Floor state',
                'occupancy',
                'green',
                $live,
                'current'
            ),
            'upcoming_reservations' => $this->roleCard(
                $de ? 'Kommende Reservierungen' : 'Upcoming reservations',
                $this->statValue($reservations, 'Upcoming'),
                $de ? 'Noch erwartete Ankünfte heute' : 'Remaining expected arrivals today',
                'calendar',
                'blue',
                $reservations,
                'today'
            ),
            'available_tables' => $this->roleCard(
                $de
                    ? 'Verfügbare Tische'
                    : 'Available tables',
                (string)$availableTables,
                $de
                    ? 'Freie Tische aus dem aktuell sichtbaren Floor'
                    : 'Free tables from the currently visible Floor',
                'table',
                'green',
                $live,
                'current'
            ),

            'staff_online' => [
                'title' => $de
                    ? 'Mitarbeiter online'
                    : 'Staff online',

                'value' => (string)max(
                    0,
                    (int)($onlineStaff['count'] ?? 0)
                ),

                'description' => $de
                    ? 'Aktuell angemeldete Mitarbeiter an diesem Standort'
                    : 'Staff currently signed in at this location',

                'icon' => 'users',
                'tone' => 'blue',
                'period' => 'current',

                'connected' =>
                    ($onlineStaff['connected'] ?? false)
                    === true,

                'source' => (string)(
                    $onlineStaff['source']
                    ?? 'PmdAdminPresenceService'
                ),
            ],
        ];

        foreach ($cards as $cardKey => &$card) {
            $card['key'] = (string)$cardKey;
        }
        unset($card);

        $managerKpiOrder = array_keys($cards);

        /*
         * Six available choices.
         * Four visible slots remain personalized through the
         * existing Manager KPI cookie authority.
         */
        $managerKpiSelection =
            $shared->readSelection(
                'pmd_manager_lab_kpis',
                $managerKpiOrder,
                $this->pmdKpiDefaults()
            );

        $this->vars['pmdCleanWorkspaceKpiCards'] =
            $cards;

        $this->vars['pmdCleanWorkspaceKpiOrder'] =
            $managerKpiOrder;

        $this->vars['pmdCleanWorkspaceKpiSelection'] =
            $managerKpiSelection;

        $this->vars['pmdCleanWorkspaceKpiAriaLabel'] = $de ? 'Manager-KPIs' : 'Manager KPIs';
    }


    private function managerOnlineStaffSnapshot(int $locationId, string $locale): array
    {
        $de = strtolower($locale) === 'de';
        $businessTimezone = 'Europe/Berlin';
        $now = Carbon::now($businessTimezone);

        try {
            /*
             * PMD_MANAGER_ONLINE_STAFF_SESSION_PRESENCE_V1
             *
             * "Online" means an authenticated admin session still exists.
             * It ends immediately on Logout and otherwise expires with the
             * configured Laravel session lifetime. Biometric/time-clock
             * attendance remains a separate workforce concept.
             */
            $snapshot = app(PmdAdminPresenceService::class)
                ->onlineStaffAtLocation($locationId);

            $rows = [];
            foreach (($snapshot['rows'] ?? []) as $row) {
                $loginAt = null;
                try {
                    $loginAt = Carbon::parse((string)($row['login_at'] ?? ''), config('app.timezone'))
                        ->setTimezone($businessTimezone);
                } catch (\Throwable $error) {}

                $minutes = $loginAt ? max(0, $loginAt->diffInMinutes($now)) : 0;
                $duration = $minutes < 60
                    ? $minutes.' min'
                    : intdiv($minutes, 60).'h '.($minutes % 60).'m';

                $rows[] = [
                    'staff_id' => (int)($row['staff_id'] ?? 0),
                    'user_id' => (int)($row['user_id'] ?? 0),
                    'name' => (string)($row['name'] ?? ($de ? 'Mitarbeiter' : 'Staff')),
                    'role' => (string)($row['role'] ?? ($de ? 'Mitarbeiter' : 'Staff')),
                    'since' => $loginAt
                        ? (($de ? 'Seit ' : 'Since ').$loginAt->format('H:i'))
                        : ($de ? 'Angemeldet' : 'Signed in'),
                    'duration' => $duration,
                    'session_count' => (int)($row['session_count'] ?? 1),
                    'device' => '',
                ];
            }

            $connected = ($snapshot['connected'] ?? false) === true;
            $source = (string)($snapshot['source'] ?? 'PmdAdminPresenceService session registry');
        } catch (\Throwable $error) {
            $rows = [];
            $connected = false;
            $source = 'PmdAdminPresenceService unavailable: '.$error->getMessage();
        }

        return [
            'title' => $de ? 'Mitarbeiter online' : 'Staff online',
            'subtitle' => $de
                ? 'Angemeldete Admin-Sitzungen an diesem Standort'
                : 'Signed-in admin sessions at this location',
            'count' => count($rows),
            'count_label' => 'online',
            'empty' => $de
                ? 'Aktuell ist kein Mitarbeiter angemeldet.'
                : 'No staff are currently signed in.',
            'as_of' => ($de ? 'Stand ' : 'As of ').$now->format('H:i'),
            'connected' => $connected,
            'rows' => $rows,
            'source' => $source,
        ];
    }

    private function roleCard(
        string $title,
        string $value,
        string $description,
        string $icon,
        string $tone,
        array $report,
        string $period
    ): array {
        return [
            'title' => $title,
            'value' => $value,
            'description' => $description,
            'icon' => $icon,
            'tone' => $tone,
            'period' => $period,
            'connected' => empty($report['error']),
            'source' => (string)($report['source'] ?? 'Dashboard2 manager authority'),
        ];
    }

    private function statValue(array $report, string $label): string
    {
        foreach (($report['stats'] ?? []) as $stat) {
            if (strcasecmp((string)($stat['label'] ?? ''), $label) === 0) {
                return (string)($stat['value'] ?? '—');
            }
        }
        return '—';
    }
}
