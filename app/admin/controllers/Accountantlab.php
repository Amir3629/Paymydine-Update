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
        $this->vars['pmdRoleOwnerAnalyticsBootstrap'] = app(
            PmdDashboardAnalyticsSnapshotV132::class
        )->bootstrap(
            max(0, (int)$shared->locationId())
        );
        $this->vars['pmdRoleOwnerAnalyticsEndpoint'] =
            admin_url('accountantlab').'?pmd_analytics=1';

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
