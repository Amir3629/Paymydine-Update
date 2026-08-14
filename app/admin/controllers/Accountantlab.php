<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdRoleDashboardDataV1;
use Admin\Services\PmdCleanWorkspaceFinanceV1;

/**
 * PMD_ACCOUNTANT_EXACT_OWNER_COMPONENT_V3_5_1
 *
 * Accountant keeps the approved four visible top KPI cards. Additional
 * accountant-specific finance cards render in the white-card area below, while
 * the exact live Dashboard Lab partial/CSS/JS component remains the visual authority.
 */
class Accountantlab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function __construct()
    {
        parent::__construct();
        $this->addCss('css/pmd-dashboard-lab-analytics-v1.css');
        $this->addCss('css/pmd-role-dashboard-v1.css');
        $this->addJs('js/pmd-dashboard-lab-analytics-v1.js');
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

        $this->vars['pmdRoleDashboardMode'] = 'accountant';
        $this->vars['pmdRoleOwnerAnalyticsBootstrap'] =
            $dashboard->ownerAnalyticsBootstrap($shared->locationId());
        $this->vars['pmdRoleOwnerAnalyticsEndpoint'] =
            admin_url('accountantlab').'?pmd_analytics=1';

        /*
         * PMD_ACCOUNTANT_TOP_KPI_SURFACE_RESTORE_V3_5_1
         * V3.5 accidentally made all eight finance KPIs visible at once.
         * Keep the original four-card surface. If the V3.5 cookie still
         * contains eight keys, truncate the server-first selection to four;
         * the normal chooser can still swap any of the audited finance KPIs.
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

        /** @var PmdCleanWorkspaceFinanceV1 $finance */
        $finance = app(PmdCleanWorkspaceFinanceV1::class);
        $this->vars['pmdRoleInsightCards'] =
            $finance->accountantInsightCards($shared->locationId(), $locale);
    }
}
