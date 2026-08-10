<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Cash_drawers_model;
use Admin\Models\FingerDevices_model;
use Admin\Models\Kds_stations_model;
use Admin\Models\Pos_devices_model;
use Admin\Models\Terminal_devices_model;
use Illuminate\Support\Facades\Schema;

/**
 * PMD Devices & Hardware
 *
 * One owner-facing overview for all hardware. Existing CRUD controllers and
 * models remain the source of truth; this page never creates parallel data.
 */
class Pmddevices extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-devices-settings-page');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Devices & hardware');
        Template::setHeading('Devices & hardware');

        $pos = $this->safeCollection(Pos_devices_model::class, 'pos_devices', 'name');
        $terminals = $this->safeCollection(Terminal_devices_model::class, 'terminal_devices', 'terminal_device_id');
        $drawers = $this->safeCollection(Cash_drawers_model::class, 'cash_drawers', 'name');
        $biometric = $this->safeCollection(FingerDevices_model::class, 'finger_devices', 'name');
        $kds = $this->safeCollection(Kds_stations_model::class, 'kds_stations', 'priority');

        $this->vars['pmdDevices'] = [
            'pos' => $pos,
            'terminals' => $terminals,
            'drawers' => $drawers,
            'biometric' => $biometric,
            'kds' => $kds,
            'stats' => [
                'pos' => $pos->count(),
                'terminals' => $terminals->count(),
                'drawers' => $drawers->count(),
                'kds' => $kds->count(),
                'biometric' => $biometric->count(),
            ],
        ];

        return $this->makeView('pmddevices/index');
    }

    protected function safeCollection(string $modelClass, string $table, string $orderBy)
    {
        try {
            if (!Schema::hasTable($table)) {
                return collect();
            }

            $query = $modelClass::query();
            if ($orderBy !== '') {
                $query->orderBy($orderBy);
            }

            return $query->get();
        } catch (\Throwable $error) {
            logger()->warning('PMD devices overview query failed', [
                'table' => $table,
                'message' => $error->getMessage(),
            ]);

            return collect();
        }
    }
}
