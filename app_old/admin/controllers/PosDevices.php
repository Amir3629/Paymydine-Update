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
    }
}
