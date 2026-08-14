<?php

namespace Admin\Classes;

use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdCleanWorkspaceFinanceV1;

/**
 * Shared controller shell for the new clean PMD workspaces.
 *
 * Contract:
 * - one server-rendered header/KPI/Floor shell
 * - no Dashboard2/Reservations2 browser runtime
 * - no Analytics/content below the Floor at this stage
 */
abstract class PmdCleanWorkspaceControllerV1 extends AdminController
{
    abstract protected function pmdWorkspaceKey(): string;
    abstract protected function pmdKpiMode(): string;
    abstract protected function pmdKpiDefaults(): array;

    protected function pmdUsesFloor(): bool
    {
        return true;
    }

    protected function pmdAfterFloorPartial(): ?string
    {
        return null;
    }

    protected function pmdBelowFloorPartial(): ?string
    {
        return null;
    }

    protected function pmdPrepareWorkspaceVars(
        PmdCleanWorkspaceSharedV1 $shared,
        string $locale,
        array $floorBootstrap
    ): void {
    }

    protected function pmdMenuContext(): array
    {
        return ['dashboard'];
    }

    public function __construct()
    {
        parent::__construct();

        $key = $this->pmdWorkspaceKey();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-dashboard-lab-page'
            .' pmd-clean-workspace-page pmd-clean-workspace-'.$key
        );

        // Exact same proven shell and KPI visual authorities as Dashboard Lab.
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-reservations2-kpis-v307.css');
        $this->addCss('css/pmd-dashboard-lab-v1.css');

        // Exact same proven shared Floor visual authorities as Dashboard Lab.
        if ($this->pmdUsesFloor()) {
            $this->addCss('css/pmd-floor-v1.css');
            $this->addCss('css/pmd-floor-v1-stable-v11.css');
            $this->addCss('css/pmd-floor-v1-native-smart-v20.css');
            $this->addCss('css/pmd-reservations2-floor-canvas-v310.css');
            $this->addCss('css/pmd-reservations2-floor-toolbar-v316.css');
            $this->addCss('css/pmd-reservations2-floor-reservation-v312.css');
            $this->addCss('css/pmd-dashboard-lab-exact-floor-v1.css');
        }

        // Generic clean-workspace KPI chooser. Zero boot fetch/layout writes.
        $this->addJs('js/pmd-clean-workspace-kpis-v1.js');

        // Existing proven Floor interaction runtime. Initial geometry is Blade.
        if ($this->pmdUsesFloor()) {
            $this->addJs('js/pmd-dashboard-lab-exact-floor-v1.js');
        }

        $this->applyMenuContext();
    }

    public function index()
    {
        /** @var PmdCleanWorkspaceSharedV1 $shared */
        $shared = app(PmdCleanWorkspaceSharedV1::class);
        $locale = $shared->locale();

        /*
         * PMD_CLEAN_WORKSPACE_REQUEST_COOKIE_LOCALE_V3
         * Use Laravel's decrypted request cookie, matching the official
         * language-switch route and global Admin i18n boot authority.
         */
        $adminLocale = strtolower(trim((string)request()->cookie(
            'pmd_admin_locale',
            ''
        )));

        if (preg_match('/^(en|de)(?:[-_][a-z0-9]+)?$/i', $adminLocale, $match)) {
            $locale = strtolower($match[1]);
        } else {
            $locale = strtolower(trim((string)$locale));
            $locale = strpos($locale, 'de') === 0 ? 'de' : 'en';
        }

        app()->setLocale($locale);

        if (app()->bound('translator.localization')) {
            app('translator.localization')->setLocale($locale, false);
        }

        $key = $this->pmdWorkspaceKey();
        $title = $this->pmdWorkspaceTitle($locale);

        Template::setTitle($title);
        Template::setHeading($title);

        // Floor is resolved once and reused by Reservations KPI calculations.
        $floorBootstrap = $this->pmdUsesFloor()
            ? $shared->floorBootstrap()
            : [];

        $mode = $this->pmdKpiMode();

        if ($mode === 'reservations') {
            $kpiOrder = PmdCleanWorkspaceSharedV1::RESERVATION_KPI_ORDER;
            $kpiCards = $shared->reservationKpiCards($floorBootstrap, $locale);
        } elseif ($mode === 'cashier') {
            /** @var PmdCleanWorkspaceFinanceV1 $finance */
            $finance = app(PmdCleanWorkspaceFinanceV1::class);
            $kpiOrder = PmdCleanWorkspaceFinanceV1::CASHIER_KPI_ORDER;
            $kpiCards = $finance->cashierCards($shared->locationId(), $locale);
        } elseif ($mode === 'accountant') {
            /** @var PmdCleanWorkspaceFinanceV1 $finance */
            $finance = app(PmdCleanWorkspaceFinanceV1::class);
            $kpiOrder = PmdCleanWorkspaceFinanceV1::ACCOUNTANT_KPI_ORDER;
            $kpiCards = $finance->accountantCards($shared->locationId(), $locale);
        } else {
            $kpiOrder = PmdCleanWorkspaceSharedV1::OWNER_KPI_ORDER;
            $kpiCards = $shared->ownerKpiCards($locale);
        }

        $cookieName = 'pmd_'.$key.'_lab_kpis';
        $selection = $shared->readSelection(
            $cookieName,
            $kpiOrder,
            $this->pmdKpiDefaults()
        );

        $this->vars['pmdCleanWorkspaceKey'] = $key;
        $this->vars['pmdCleanWorkspaceTitle'] = $title;
        $this->vars['pmdCleanWorkspacePath'] = '/admin/'.$key.'lab';
        $this->vars['pmdCleanWorkspaceLocale'] = $locale;
        $this->vars['pmdCleanWorkspaceKpiCookie'] = $cookieName;
        $this->vars['pmdCleanWorkspaceKpiStorage'] = 'pmd:clean:'.$key.':kpis:v1';
        $this->vars['pmdCleanWorkspaceKpiCards'] = $kpiCards;
        $this->vars['pmdCleanWorkspaceKpiSelection'] = $selection;
        $this->vars['pmdCleanWorkspaceKpiOrder'] = $kpiOrder;
        $authorityMap = [
            'reservations' => 'reservations-server-first-paint',
            'cashier' => 'cashier-finance-server-first-paint',
            'accountant' => 'accountant-finance-server-first-paint',
            'owner' => 'dashboard2-server-first-paint',
        ];
        $this->vars['pmdCleanWorkspaceKpiAuthority'] = $authorityMap[$mode]
            ?? 'clean-workspace-server-first-paint';
        $this->vars['pmdCleanWorkspaceKpiAriaLabel'] = $mode === 'reservations'
            ? $shared->text('Reservation KPIs', 'Reservierungs-KPIs', $locale)
            : ($mode === 'cashier'
                ? $shared->text('Cashier KPIs', 'Kassen-KPIs', $locale)
                : ($mode === 'accountant'
                    ? $shared->text('Accounting KPIs', 'Buchhaltungs-KPIs', $locale)
                    : $shared->text('Workspace KPIs', 'Workspace-KPIs', $locale)));

        $this->vars['pmdCleanWorkspaceText'] = [
            'choose_kpi' => $shared->text('Choose KPI', 'KPI auswählen', $locale),
            'visible' => $shared->text('Visible in this card', 'In dieser Karte sichtbar', $locale),
            'already_visible' => $shared->text('Already visible', 'Bereits sichtbar', $locale),
            'show_here' => $shared->text('Show in this card', 'In dieser Karte anzeigen', $locale),
        ];

        $this->vars['pmdCleanWorkspaceUsesFloor'] = $this->pmdUsesFloor();
        $this->vars['pmdCleanWorkspaceAfterFloorPartial'] = $this->pmdAfterFloorPartial();
        $this->vars['pmdCleanWorkspaceBelowFloorPartial'] = $this->pmdBelowFloorPartial();
        $this->vars['pmdCleanWorkspaceFloorBootstrap'] = $floorBootstrap;
        $this->vars['pmdCleanWorkspaceFloorDisplayTables'] = $floorBootstrap['display_tables'] ?? [];
        $this->vars['pmdCleanWorkspaceFloorMode'] = $floorBootstrap['mode'] ?? 'row';
        $this->vars['pmdCleanWorkspaceFloorZoom'] = $floorBootstrap['zoom'] ?? 1.0;

        $this->pmdPrepareWorkspaceVars($shared, $locale, $floorBootstrap);

        // Dashboard2/Floor data controllers may change AdminMenu context.
        $this->applyMenuContext();

        return $this->makeView($key.'lab/index');
    }

    protected function pmdWorkspaceTitle(string $locale): string
    {
        $key = $this->pmdWorkspaceKey();

        $titles = [
            'reservations' => ['Reservations', 'Reservierungen'],
            'cashier' => ['Cashier', 'Kasse'],
            'manager' => ['Manager', 'Manager'],
            'accountant' => ['Accountant', 'Buchhaltung'],
        ];

        $title = $titles[$key] ?? [ucfirst($key), ucfirst($key)];
        return $locale === 'de' ? $title[1] : $title[0];
    }

    private function applyMenuContext(): void
    {
        $context = $this->pmdMenuContext();

        if (count($context) >= 2) {
            AdminMenu::setContext($context[0], $context[1]);
            return;
        }

        AdminMenu::setContext($context[0] ?? 'dashboard');
    }
}
