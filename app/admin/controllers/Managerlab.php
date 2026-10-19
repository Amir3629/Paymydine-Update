<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdRoleDashboardDataV1;
use Admin\Services\PmdDashboardAnalyticsSnapshotV132;
use Admin\Services\PmdOnlineStaffCardV1;

// Runtime-safe before the module's generated classmap is rebuilt on VPS.
require_once dirname(__DIR__).'/services/PmdOnlineStaffCardV1.php';

/**
 * PMD_MANAGER_EXACT_OWNER_COMPONENT_V3_5_2
 * PMD_MANAGER_REMOVE_ROLE_INSIGHT_CARDS_V3_5_2
 * PMD_MANAGER_ONLINE_STAFF_CARD_V3_5_2
 *
 * Manager keeps the approved four top KPI cards and exact Owner analytics.
 * The six V3.5 manager-only insight cards are removed completely. The
 * shared Owner/Manager online-staff card follows all analytics cards.
 */
class Managerlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        $this->addCss('css/pmd-dashboard-lab-analytics-v1.css');
        $this->addCss('css/pmd-role-dashboard-v1.css');
        // PMD_SHARED_STAFF_CARD_RHYTHM_R2 - force new CSS onto browsers/CDNs.
        $this->addCss(
            asset('app/admin/assets/css/pmd-manager-online-staff-v1.css')
            .'?v='.(string)(
                @filemtime(
                    base_path('app/admin/assets/css/pmd-manager-online-staff-v1.css')
                ) ?: 'r2'
            )
        );
        $this->addJs('js/pmd-online-staff-live-v1.js');
        $this->addCss('css/pmd-kitchen-today-team-v1.css');
        // PMD_DASHBOARD_FIRSTPAINT_V141
        // Keep the shared KPI grid at final geometry on the first visible paint.
        $this->addCss('css/pmd-dashboard-kpi-recovery-v136.css');
        // PMD_DASHBOARD_ANALYTICS_ASSET_URL_V133
        // AssetMaker resolves local files before building their public URL.
        // A query string inside a local relative path makes File::isFile()
        // fail and leaves the browser with the wrong /js/... URL. Build the
        // canonical public asset URL first, then append filemtime.
        $this->addJs(
            asset('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js')
            .'?v='
            .(string)(
                @filemtime(
                    base_path(
                        'app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js'
                    )
                ) ?: '133'
            )
        );
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
        // PMD_ONLINE_STAFF_LIGHTWEIGHT_ENDPOINT_V1
        // The authenticated Manager route avoids loading full Floor/Analytics.
        if ((string)request()->query('pmd_staff_online', '') === '1') {
            $locationId = 0;
            try {
                $locationId = max(
                    0,
                    (int)app(PmdCleanWorkspaceSharedV1::class)->locationId()
                );
            } catch (\Throwable $ignored) {}

            return response()->json([
                'success' => true,
                'staff' => app(PmdOnlineStaffCardV1::class)->snapshot(
                    $locationId,
                    (string)request()->cookie('pmd_admin_locale', app()->getLocale())
                ),
            ])->header('Cache-Control', 'private, no-store');
        }

        if ((string)request()->query('pmd_analytics', '') === '1') {
            /** @var PmdRoleDashboardDataV1 $dashboard */
            $dashboard = app(PmdRoleDashboardDataV1::class);
            $period = (string)request()->query(
                'period',
                'month'
            );

            $payload = $dashboard->ownerAnalyticsPayload(
                $period,
                null
            );

            // PMD_DASHBOARD_ANALYTICS_SWR_V132
            // The endpoint remains the heavy-data authority; successful work
            // is simply remembered for the next zero-query first paint.
            $locationId = 0;
            try {
                $locationId = max(
                    0,
                    (int)$dashboard->resolveWorkspaceLocation()
                );
            } catch (\Throwable $ignored) {
                $locationId = 0;
            }

            app(
                PmdDashboardAnalyticsSnapshotV132::class
            )->store(
                $locationId,
                $period,
                is_array($payload) ? $payload : []
            );

            return response()->json($payload);
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
         * SAME authority as Reservations.
         * Manager is only another host surface.
         */
        try {
            $this->vars['pmdReservationsSchedule'] =
                app(
                    \Admin\Services\PmdReservationsScheduleV1::class
                )->payload(
                    $shared->locationId(),
                    $locale
                );
        } catch (\Throwable $error) {
            $this->vars['pmdReservationsSchedule'] = [];
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
        // PMD_DASHBOARD_ANALYTICS_SWR_V132
        // Read-only snapshot lookup only; no heavy analytics query runs here.
        $this->vars['pmdRoleOwnerAnalyticsBootstrap'] = app(
            PmdDashboardAnalyticsSnapshotV132::class
        )->bootstrap(
            max(0, (int)$shared->locationId())
        );
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

        // PMD_MANAGER_TR_FINISHED_PAYLOAD_R2A
        // Translate presentation payloads only after their English lookup keys
        // have finished all calculations.
        if (strtolower($locale) === 'tr') {
            $pmdManagerT = static function (string $source): string {
                return \Admin\Classes\PmdPlatformI18n::fromEnglish(
                    $source,
                    '',
                    [],
                    'tr',
                    $source
                );
            };

            foreach ([
                'pmdCleanWorkspaceKpiCards',
                'pmdRoleDashboardBundle',
            ] as $pmdManagerVar) {
                if (isset($this->vars[$pmdManagerVar]) && is_array($this->vars[$pmdManagerVar])) {
                    $this->vars[$pmdManagerVar] =
                        \Admin\Classes\PmdPlatformI18n::translateStructure(
                            $this->vars[$pmdManagerVar],
                            '',
                            'tr'
                        );
                }
            }

            $this->vars['pmdCleanWorkspaceKpiAriaLabel'] = $pmdManagerT('Manager KPIs');


        }
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

                'value' => ($onlineStaff['connected'] ?? false) === true
                    ? (string)max(0, (int)($onlineStaff['count'] ?? 0))
                    : '—',

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
        return app(PmdOnlineStaffCardV1::class)->snapshot($locationId, $locale);
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
