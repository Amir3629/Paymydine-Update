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

        /* PMD_DEVICE_BACKEND_ONLY_V4
         * Browser GET pages live under /admin/pmddevices/*. This controller
         * remains only the canonical action/model/service authority.
         */
        AdminMenu::setContext('settings', 'system');
    }

    /* PMD_DEVICE_LEGACY_UI_REDIRECT_V4_POS */
    public function index()
    {
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmddevices/pos'));
        }
        $this->asExtension('ListController')->index();
        return request()->ajax() ? null : $this->makeView('posdevices/index');
    }

}
