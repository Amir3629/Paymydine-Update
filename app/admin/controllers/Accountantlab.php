<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdRoleDashboardDataV1;
use Admin\Services\PmdDashboardAnalyticsSnapshotV132;

/**
 * PMD_ACCOUNTANT_EXACT_OWNER_COMPONENT_V3_5_4
 * PMD_ACCOUNTANT_NO_FINANCE_INSIGHT_CARDS_V3_5_4
 *
 * Accountant keeps the approved four configurable top KPI cards and the
 * shared Owner analytics below them. The six intermediate finance insight
 * cards are intentionally not rendered on this workspace.
 */
class Accountantlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        $this->addCss('css/pmd-dashboard-lab-analytics-v1.css');
        $this->addCss('css/pmd-role-dashboard-v1.css');
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
        return 'accountant';
    }

    protected function pmdKpiMode(): string
    {
        return 'accountant';
    }

    protected function pmdKpiDefaults(): array
    {
        return [
            'vat_month',
            'gross_to_net',
            'total_loss',
            'cash_percent',
        ];
    }

    protected function pmdUsesFloor(): bool
    {
        return false;
    }

    protected function pmdAfterFloorPartial(): ?string
    {
        return 'admin::_partials.pmd_role_dashboard_v1';
    }

    public function index()
    {
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

        $this->vars['pmdRoleDashboardMode'] = 'accountant';
        // PMD_DASHBOARD_ANALYTICS_SWR_V132
        // Read-only snapshot lookup only; no heavy analytics query runs here.
        $analyticsBootstrap = app(
            PmdDashboardAnalyticsSnapshotV132::class
        )->bootstrap(
            max(0, (int)$shared->locationId())
        );
        $this->vars['pmdRoleOwnerAnalyticsBootstrap'] = $analyticsBootstrap;
        $this->vars['pmdRoleOwnerAnalyticsEndpoint'] =
            admin_url('accountantlab').'?pmd_analytics=1';

        /*
         * PMD_ACCOUNTANT_EXTRA_CHOOSER_KPIS_V161
         *
         * Accountant still shows exactly four cards, but a chooser with only
         * those same four cards has nothing actionable to select. Add two
         * finance-relevant alternatives from the already-cached shared
         * analytics snapshot. No extra DB query is introduced here.
         */
        $monthPayload = is_array(
            $analyticsBootstrap['periods']['month'] ?? null
        )
            ? $analyticsBootstrap['periods']['month']
            : [];

        $tipsPayload = is_array($monthPayload['tips'] ?? null)
            ? $monthPayload['tips']
            : [];

        $tipsConnected =
            !empty($tipsPayload)
            && (($tipsPayload['available'] ?? true) !== false);

        $tipsMonth = (float)($tipsPayload['month'] ?? 0);
        $tippedOrders = max(
            0,
            (int)($tipsPayload['tipped_orders'] ?? 0)
        );

        try {
            $tipsMonthDisplay = function_exists('currency_format')
                ? currency_format($tipsMonth)
                : '€'.number_format($tipsMonth, 2);
        } catch (\Throwable $ignored) {
            $tipsMonthDisplay = '€'.number_format($tipsMonth, 2);
        }

        $pmdAccountantText = static function (
            string $english,
            string $german
        ) use ($shared, $locale): string {
            if ($locale === 'tr') {
                return \Admin\Classes\PmdPlatformI18n::fromEnglish(
                    $english,
                    '',
                    [],
                    'tr',
                    $english
                );
            }

            return $shared->text(
                $english,
                $german,
                $locale
            );
        };

        $accountantCards = is_array(
            $this->vars['pmdCleanWorkspaceKpiCards'] ?? null
        )
            ? $this->vars['pmdCleanWorkspaceKpiCards']
            : [];

        $accountantOrder = is_array(
            $this->vars['pmdCleanWorkspaceKpiOrder'] ?? null
        )
            ? array_values($this->vars['pmdCleanWorkspaceKpiOrder'])
            : array_keys($accountantCards);

        $extraAccountantCards = [
            'tips_month' => [
                'key' => 'tips_month',
                'title' => $pmdAccountantText(
                    'Tips this month',
                    'Trinkgeld diesen Monat'
                ),
                'value' => $tipsMonthDisplay,
                'description' => $pmdAccountantText(
                    'Tips recorded during the current month.',
                    'Im aktuellen Monat erfasstes Trinkgeld.'
                ),
                'info' => $pmdAccountantText(
                    'Total tips recorded during the current month.',
                    'Gesamtes im aktuellen Monat erfasstes Trinkgeld.'
                ),
                'icon' => 'star',
                'tone' => 'green',
                'connected' => $tipsConnected,
                'period' => 'month',
                'source' => 'Shared analytics snapshot · tips.month',
            ],
            'tipped_orders' => [
                'key' => 'tipped_orders',
                'title' => $pmdAccountantText(
                    'Tipped orders',
                    'Bestellungen mit Trinkgeld'
                ),
                'value' => (string)$tippedOrders,
                'description' => $pmdAccountantText(
                    'Orders with recorded tips in the current month.',
                    'Bestellungen mit erfasstem Trinkgeld im aktuellen Monat.'
                ),
                'info' => $pmdAccountantText(
                    'Number of orders with recorded tips in the current month.',
                    'Anzahl der Bestellungen mit erfasstem Trinkgeld im aktuellen Monat.'
                ),
                'icon' => 'list',
                'tone' => 'blue',
                'connected' => $tipsConnected,
                'period' => 'month',
                'source' => 'Shared analytics snapshot · tips.tipped_orders',
            ],
        ];

        foreach ($extraAccountantCards as $extraKey => $extraCard) {
            $accountantCards[$extraKey] = $extraCard;

            if (!in_array($extraKey, $accountantOrder, true)) {
                $accountantOrder[] = $extraKey;
            }
        }

        $this->vars['pmdCleanWorkspaceKpiCards'] =
            $accountantCards;
        $this->vars['pmdCleanWorkspaceKpiOrder'] =
            $accountantOrder;

        /*
         * PMD_ACCOUNTANT_TOP_KPI_SURFACE_RESTORE_V3_5_1
         * Keep exactly four top KPI cards visible. The chooser can still swap
         * any audited Accountant KPI into those four positions.
         */
        $selection = is_array($this->vars['pmdCleanWorkspaceKpiSelection'] ?? null)
            ? array_values($this->vars['pmdCleanWorkspaceKpiSelection'])
            : $this->pmdKpiDefaults();
        if (count($selection) > 4) {
            $selection = array_slice($selection, 0, 4);
        }
        if (!$selection) {
            $selection = $this->pmdKpiDefaults();
        }
        $this->vars['pmdCleanWorkspaceKpiSelection'] = $selection;

        // PMD_ACCOUNTANT_NO_FINANCE_INSIGHT_CARDS_V3_5_4
        // Revenue bridge / Settlement totals / Payment mix / Tips ledger /
        // Average checks / Tax & loss control are intentionally removed.
        $this->vars['pmdRoleInsightCards'] = [];
    }
}
