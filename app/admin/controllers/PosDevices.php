<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;

class PosDevices extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Pos_devices_model',
            'title' => 'lang:admin::lang.pos_devices.text_title',
            'emptyMessage' => 'lang:admin::lang.pos_devices.text_empty',
            'defaultSort' => ['device_id', 'DESC'],
            'configFile' => 'pos_devices_model',
        ],
    ];

    protected $requiredPermissions = 'Admin.PosDevices';

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('pos_devices', 'system');

        /* PMD_DEVICE_SETTINGS_SUITE_V1_CONTROLLER */
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-device-suite-shell');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-device-suite-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        AdminMenu::setContext('settings', 'system');

    }
}
