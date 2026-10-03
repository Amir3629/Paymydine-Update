<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Services\PmdTenantQuickSetupServiceV2;

/** PMD_TENANT_QUICK_SETUP_V4_DASHBOARD_INLINE_CONTROLLER */
class Pmdquicksetup extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-quick-setup-page'
        );

        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-tenant-quick-setup-v1.css');
        $this->addJs('js/pmd-tenant-quick-setup-v3.js');

        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        $service = app(PmdTenantQuickSetupServiceV2::class);

        if ((string)request()->query('status', '') === '1') {
            return response()->json($service->status());
        }

        /*
         * PMD_QUICK_SETUP_DASHBOARD_INLINE_V4
         * The old standalone URL is retained only as the handler/bootstrap
         * endpoint. Browser navigation now returns to Dashboard and opens the
         * inline setup cards there instead of rendering a separate page.
         */
        if ((string)request()->query('embed', '') === '1') {
            Template::setTitle('Quick Setup');
            Template::setHeading('Quick Setup');

            $this->vars['pmdQuickSetupStatus'] = $service->status();
            $this->vars['pmdQuickSetupRestaurantTypes'] = $service->restaurantTypes();

            return $this->makeView('pmdquicksetup/index');
        }

        return redirect(
            admin_url('dashboardlab').'?quick_setup=1#pmd-dashboard-quick-setup'
        );
    }

    public function onSkip()
    {
        return response()->json([
            'ok' => true,
            'status' => app(PmdTenantQuickSetupServiceV2::class)->skip(),
        ]);
    }

    public function onCompleteStarterMenu()
    {
        try {
            return response()->json(
                app(PmdTenantQuickSetupServiceV2::class)->completeStarterMenu()
            );
        } catch (\RuntimeException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 409);
        } catch (\Throwable $error) {
            logger()->error('PMD Starter menu completion failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Starter menu could not be completed. Existing menu content was not intentionally changed.',
            ], 500);
        }
    }

    public function onRefreshStarterPhotos()
    {
        try {
            $cursor = max(0, (int)post('cursor', 0));

            return response()->json(
                app(PmdTenantQuickSetupServiceV2::class)->refreshStarterMenuImagesChunk($cursor, 1)
            );
        } catch (\RuntimeException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 409);
        } catch (\Throwable $error) {
            logger()->error('PMD Starter photo refresh failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Starter photos could not be refreshed. Your restaurant setup is already saved.',
            ], 500);
        }
    }

    public function onApply()
    {
        $raw = (string)post('payload', '');
        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            return response()->json([
                'ok' => false,
                'message' => 'Quick Setup payload is invalid.',
            ], 422);
        }

        try {
            return response()->json(
                app(PmdTenantQuickSetupServiceV2::class)->apply($payload)
            );
        } catch (\InvalidArgumentException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        } catch (\RuntimeException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 409);
        } catch (\Throwable $error) {
            logger()->error('PMD Quick Setup failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Quick Setup could not be completed. No existing restaurant data was intentionally removed.',
            ], 500);
        }
    }
}
