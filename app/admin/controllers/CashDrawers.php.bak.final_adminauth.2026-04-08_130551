<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\AdminLocation;
use Admin\Models\Cash_drawers_model;
use Admin\Models\Pos_devices_model;
use Admin\Services\CashDrawerService\CashDrawerService;
use Admin\Services\CashDrawerService\LocalPosHardwareCommandService;
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

        if (config('cashdrawer.local_agent_enabled')) {
            $availability = $this->validateLocalDeviceAvailability($drawer);
            if (!$availability['ok']) {
                flash()->error($availability['message']);
                return $this->refresh();
            }

            $result = LocalPosHardwareCommandService::queueTestConnection($drawer, [
                'trigger_method' => 'manual_test',
                'requested_by' => optional(admin_auth()->user())->staff_id,
            ]);
        } else {
            $result = CashDrawerService::testDrawer($drawer);
        }

        if ($result['success']) {
            flash()->success(!empty($result['queued'])
                ? 'Test command sent to POS terminal. Waiting for device response.'
                : 'Connection test successful! Drawer opened.');
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

        if (config('cashdrawer.local_agent_enabled')) {
            $availability = $this->validateLocalDeviceAvailability($drawer);
            if (!$availability['ok']) {
                flash()->error($availability['message']);
                return $this->refresh();
            }

            $result = LocalPosHardwareCommandService::queueOpenDrawer($drawer, [
                'trigger_method' => 'manual',
                'requested_by' => optional(admin_auth()->user())->staff_id,
            ]);
        } else {
            $result = CashDrawerService::openDrawer($drawer, [
                'trigger_method' => 'manual',
            ]);
        }

        if ($result['success']) {
            flash()->success(!empty($result['queued'])
                ? 'Open command sent to POS terminal. Waiting for device response.'
                : 'Cash drawer opened successfully!');
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
        $posDevices = Pos_devices_model::get();
        $posDeviceOptions = ['' => '-- None (Location Default) --'];
        foreach ($posDevices as $device) {
            $posDeviceOptions[$device->device_id] = $device->name;
        }

        if (isset($form->fields['pos_device_id'])) {
            $form->fields['pos_device_id']['options'] = $posDeviceOptions;
        }

        // Local POS terminal options for non-technical hardware pairing
        $localTerminalOptions = ['' => '-- Select Local POS Terminal --'];
        $localDevices = Pos_devices_model::where('is_local_terminal', true)->get();
        foreach ($localDevices as $device) {
            $status = $device->isOnline() ? 'online' : (!empty($device->last_seen_at) ? 'offline' : 'never connected');
            $localTerminalOptions[$device->device_id] = sprintf('%s (%s)', $device->name, $status);
        }
        if (isset($form->fields['local_pos_device_id'])) {
            $form->fields['local_pos_device_id']['options'] = $localTerminalOptions;
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
            if (config('cashdrawer.local_agent_enabled')) {
                $availability = $this->validateLocalDeviceAvailability($model);
                if (!$availability['ok']) {
                    flash()->warning($availability['message']);
                    return;
                }

                $result = LocalPosHardwareCommandService::queueTestConnection($model, [
                    'trigger_method' => 'save_test',
                    'requested_by' => optional(admin_auth()->user())->staff_id,
                ]);
            } else {
                $result = CashDrawerService::testDrawer($model);
            }

            if ($result['success']) {
                flash()->success(!empty($result['queued'])
                    ? 'Cash drawer saved. Test command sent to POS terminal.'
                    : 'Cash drawer saved and connection test successful!');
            } else {
                flash()->warning('Cash drawer saved but connection test failed: ' . $result['message']);
            }
        }
    }

    protected function validateLocalDeviceAvailability($drawer): array
    {
        $deviceId = $drawer->local_pos_device_id ?: $drawer->pos_device_id;
        if (empty($deviceId)) {
            return ['ok' => false, 'message' => 'No local POS terminal is paired with this cash drawer.'];
        }

        $device = Pos_devices_model::find($deviceId);
        if (!$device) {
            return ['ok' => false, 'message' => 'The selected POS terminal could not be found.'];
        }

        if (isset($device->is_local_terminal) && !$device->is_local_terminal) {
            return ['ok' => false, 'message' => 'The selected device is a cloud integration provider, not a local POS terminal.'];
        }

        if (method_exists($device, 'isOnline') && !$device->isOnline()) {
            return ['ok' => false, 'message' => 'The selected POS terminal is offline.'];
        }

        return ['ok' => true, 'message' => 'OK'];
    }
}
