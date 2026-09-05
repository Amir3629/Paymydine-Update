<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Services\PmdTenantQuickSetupService;

/** PMD_TENANT_QUICK_SETUP_V1_CONTROLLER */
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
        $this->addJs('js/pmd-tenant-quick-setup-v1.js');

        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        $service = app(PmdTenantQuickSetupService::class);

        if ((string)request()->query('status', '') === '1') {
            return response()->json($service->status());
        }

        Template::setTitle('Quick Setup');
        Template::setHeading('Quick Setup');

        $this->vars['pmdQuickSetupStatus'] = $service->status();
        $this->vars['pmdQuickSetupRestaurantTypes'] = $service->restaurantTypes();

        return $this->makeView('pmdquicksetup/index');
    }

    public function onSkip()
    {
        return response()->json([
            'ok' => true,
            'status' => app(PmdTenantQuickSetupService::class)->skip(),
        ]);
    }

    public function onRefreshStarterPhotos()
    {
        try {
            return response()->json(
                app(PmdTenantQuickSetupService::class)->refreshStarterMenuImages()
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
                'message' => 'Starter photos could not be refreshed. Existing photos were preserved where replacement failed.',
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
                app(PmdTenantQuickSetupService::class)->apply($payload)
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
