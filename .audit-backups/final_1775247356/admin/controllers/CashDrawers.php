<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\AdminLocation;
use Admin\Models\Cash_drawers_model;
use Admin\Services\CashDrawerService\CashDrawerService;
use Illuminate\Support\Facades\Log;

/**
 * Cash Drawers Controller
 */
class CashDrawers extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Cash_drawers_model',
            'title' => 'Cash Drawers',
            'emptyMessage' => 'No cash drawers found. Create your first cash drawer to get started.',
            'defaultSort' => ['drawer_id', 'DESC'],
            'configFile' => 'cash_drawers_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Cash Drawer',
        'model' => 'Admin\Models\Cash_drawers_model',
        'create' => [
            'title' => 'Create Cash Drawer',
            'redirect' => 'cash_drawers/edit/{drawer_id}',
            'redirectClose' => 'cash_drawers',
        ],
        'edit' => [
            'title' => 'Edit Cash Drawer',
            'redirect' => 'cash_drawers/edit/{drawer_id}',
            'redirectClose' => 'cash_drawers',
        ],
        'preview' => [
            'title' => 'Preview Cash Drawer',
            'redirect' => 'cash_drawers',
        ],
        'delete' => [
            'redirect' => 'cash_drawers',
        ],
        'configFile' => 'cash_drawers_model',
    ];

    protected $requiredPermissions = ['Admin.CashDrawers'];

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('cash_drawers', 'system');
    }

    /**
     * Create page
     */
    public function create()
    {
        $this->asExtension('FormController')->create();
        
        return $this->makeView('cashdrawers/create');
    }

    /**
     * Edit page
     */
    public function edit($context = null, $recordId = null)
    {
        $this->asExtension('FormController')->edit($context, $recordId);
        
        return $this->makeView('cashdrawers/edit');
    }

    /**
     * Test drawer connection
     */
    public function onTestConnection($context = null, $recordId = null)
    {
        $drawer = $this->formFindModelObject($recordId);
        if (!$drawer) {
            throw new \Exception('Cash drawer not found');
        }

        $result = CashDrawerService::testDrawer($drawer);

        if ($result['success']) {
            flash()->success('Connection test successful! Drawer opened.');
        } else {
            flash()->error('Connection test failed: ' . $result['message']);
        }

        return $this->refresh();
    }

    /**
     * Open drawer manually
     */
    public function onOpenDrawer($context = null, $recordId = null)
    {
        $drawer = $this->formFindModelObject($recordId);
        if (!$drawer) {
            throw new \Exception('Cash drawer not found');
        }

        $result = CashDrawerService::openDrawer($drawer, [
            'trigger_method' => 'manual',
        ]);

        if ($result['success']) {
            flash()->success('Cash drawer opened successfully!');
        } else {
            flash()->error('Failed to open drawer: ' . $result['message']);
        }

        return $this->refresh();
    }

    /**
     * Extend form fields
     */
    public function formExtendFields($form)
    {
        // Add location options
        $locations = \Admin\Models\Locations_model::where('location_status', 1)->get();
        $locationOptions = ['' => '-- Select Location --'];
        foreach ($locations as $location) {
            $locationOptions[$location->location_id] = $location->location_name;
        }

        if (isset($form->fields['location_id'])) {
            $form->fields['location_id']['options'] = $locationOptions;
        }

        // Add POS device options
        $posDevices = \Admin\Models\Pos_devices_model::get();
        $posDeviceOptions = ['' => '-- None (Location Default) --'];
        foreach ($posDevices as $device) {
            $posDeviceOptions[$device->device_id] = $device->name;
        }

        if (isset($form->fields['pos_device_id'])) {
            $form->fields['pos_device_id']['options'] = $posDeviceOptions;
        }

        // Add printer device options (for RJ11 connection)
        $printerOptions = ['' => '-- Select Printer --'];
        foreach ($posDevices as $device) {
            // Filter for printer devices if needed, or use all POS devices
            $printerOptions[$device->device_id] = $device->name;
        }

        if (isset($form->fields['printer_id'])) {
            $form->fields['printer_id']['options'] = $printerOptions;
        }

        // Add connection type options
        if (isset($form->fields['connection_type'])) {
            $form->fields['connection_type']['options'] = Cash_drawers_model::getConnectionTypeOptions();
        }

        // Add voltage options
        if (isset($form->fields['voltage'])) {
            $form->fields['voltage']['options'] = Cash_drawers_model::getVoltageOptions();
        }
    }

    /**
     * After save - test connection if enabled
     */
    public function formAfterSave($model)
    {
        if ($model->test_on_save && $this->action == 'create') {
            $result = CashDrawerService::testDrawer($model);
            if ($result['success']) {
                flash()->success('Cash drawer saved and connection test successful!');
            } else {
                flash()->warning('Cash drawer saved but connection test failed: ' . $result['message']);
            }
        }
    }
}
