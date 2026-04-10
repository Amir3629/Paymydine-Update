<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\AdminLocation;
use Admin\Models\Cash_drawers_model;
use Admin\Models\Pos_devices_model;
use Admin\Services\CashDrawerService\CashDrawerService;
use Admin\Services\CashDrawerService\LocalPosHardwareCommandService;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

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
        $model = $this->formFindModelObject($recordId);
        $this->vars['localHardwareStatus'] = $this->buildLocalHardwareStatus($model);
        
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
        if (!$result['success'] && $this->hasLocalHardwareColumns()) {
            $availability = $this->validateLocalDeviceAvailability($drawer);
            if (!$availability['ok']) {
                flash()->error($availability['message']);
                return $this->refresh();
            }
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

        $result = CashDrawerService::openDrawer($drawer, [
            'trigger_method' => 'manual',
            'requested_by' => optional(AdminAuth::user())->staff_id,
        ]);

        if (!$result['success'] && $this->hasLocalHardwareColumns()) {
            $availability = $this->validateLocalDeviceAvailability($drawer);
            if (!$availability['ok']) {
                flash()->error($availability['message']);
                return $this->refresh();
            }
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
                    'requested_by' => optional(AdminAuth::user())->staff_id,
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

    public function onEnableLocalHardware($context = null, $recordId = null)
    {
        $drawer = $this->formFindModelObject($recordId);
        if (!$drawer) {
            throw new \Exception('Cash drawer not found');
        }

        if (!$this->hasLocalHardwareColumns()) {
            flash()->error('Local hardware setup is not available yet for this tenant. Please run the latest update.');
            return $this->refresh();
        }

        $device = $drawer->localPosDevice;
        if (!$device) {
            $device = Pos_devices_model::create([
                'name' => $drawer->name.' POS',
                'code' => 'local-pos-'.$drawer->drawer_id,
                'device_type' => 'local_terminal',
                'description' => 'Auto-created for cash drawer '.$drawer->name,
                'is_local_terminal' => true,
                'pairing_token' => bin2hex(random_bytes(16)),
                'device_status' => 'offline',
                'capabilities' => ['cash_drawer' => true, 'printer' => true],
            ]);
        } else {
            if (!$device->pairing_token) {
                $device->pairing_token = bin2hex(random_bytes(16));
            }
            $device->is_local_terminal = true;
            $device->save();
        }

        $drawer->local_pos_device_id = $device->device_id;
        $drawer->local_mapping_invalid = false;
        $drawer->save();

        flash()->success('Local hardware setup is ready. Download the Windows connector on the POS terminal to finish.');
        return $this->refresh();
    }

    public function onSetupOnThisPos($context = null, $recordId = null)
    {
        $drawer = $this->formFindModelObject($recordId);
        if (!$drawer) {
            throw new \Exception('Cash drawer not found');
        }

        if (!$this->hasLocalHardwareColumns()) {
            flash()->error('Local hardware setup is not available yet for this tenant. Please run the latest update.');
            return $this->refresh();
        }

        $this->setSetupState($drawer, 'setting_up', 'Preparing local POS setup...');

        $this->onEnableLocalHardware($context, $recordId);
        $drawer->refresh();

        $availability = $this->validateLocalDeviceAvailability($drawer);
        if (!$availability['ok']) {
            $this->setSetupState($drawer, 'offline', $availability['message']);
            flash()->warning($availability['message'].' Use the Advanced section if the POS still needs connector install.');
            return $this->refresh();
        }

        $result = LocalPosHardwareCommandService::queueTestConnection($drawer, [
            'trigger_method' => 'setup_wizard',
            'requested_by' => optional(AdminAuth::user())->staff_id,
        ]);

        if ($result['success']) {
            $this->setSetupState($drawer, 'ready', 'POS connected. Test command sent successfully.');
            flash()->success('POS connected. Local hardware is ready. Test command sent to POS terminal.');
        } else {
            $this->setSetupState($drawer, 'test_failed', $result['message'] ?? 'Setup test failed.');
            flash()->warning('Setup completed but test command failed: '.($result['message'] ?? 'Unknown error'));
        }

        return $this->refresh();
    }

    public function onRepairLocalHardware($context = null, $recordId = null)
    {
        $drawer = $this->formFindModelObject($recordId);
        if (!$drawer) {
            throw new \Exception('Cash drawer not found');
        }

        if (!empty($drawer->local_pos_device_id)) {
            flash()->success('Local hardware mapping is already configured. If terminal is offline, run the Windows connector again.');
            return $this->refresh();
        }

        return $this->onEnableLocalHardware($context, $recordId);
    }

    public function onCopySetupLink($context = null, $recordId = null)
    {
        $drawer = $this->formFindModelObject($recordId);
        if (!$drawer) {
            throw new \Exception('Cash drawer not found');
        }

        $url = admin_url('cash_drawers/windows_connector/'.$drawer->drawer_id);
        flash()->info('Setup link: '.$url);
        return $this->refresh();
    }

    public function windowsConnector($recordId)
    {
        $drawer = Cash_drawers_model::find($recordId);
        if (!$drawer) {
            abort(404, 'Cash drawer not found');
        }

        $device = $drawer->localPosDevice;
        if (!$device) {
            abort(400, 'No local POS terminal paired');
        }

        if (!$device->pairing_token) {
            $device->pairing_token = bin2hex(random_bytes(16));
            $device->save();
        }

        $content = $this->buildWindowsConnectorScript($drawer, $device);
        $filename = 'paymydine-connector-drawer-'.$drawer->drawer_id.'.bat';
        $tmpFile = storage_path('app/'.$filename);
        file_put_contents($tmpFile, $content);

        return response()->download($tmpFile, $filename, [
            'Content-Type' => 'application/octet-stream',
        ])->deleteFileAfterSend(true);
    }

    public function windowsConnectorAgent($recordId)
    {
        $drawer = Cash_drawers_model::find($recordId);
        if (!$drawer) {
            abort(404, 'Cash drawer not found');
        }

        $agentPath = base_path('tools/local-pos-agent/agent.js');
        if (!file_exists($agentPath)) {
            abort(404, 'Agent package not found');
        }

        return response(file_get_contents($agentPath), 200, [
            'Content-Type' => 'application/javascript',
        ]);
    }

    protected function buildWindowsConnectorScript($drawer, $device): string
    {
        $adminBase = rtrim(url(admin_url('/')), '/');
        $token = config('cashdrawer.agent_token');
        $deviceCode = $device->device_code ?: ('POS-'.$device->device_id.'-'.substr(md5($drawer->drawer_id.'-'.time()), 0, 6));
        $agentUrl = $adminBase.'/cash_drawers/windows_connector_agent/'.$drawer->drawer_id;

        return "@echo off\r\n"
            ."setlocal\r\n"
            ."set PMD_DIR=%ProgramData%\\PayMyDine\\LocalPosAgent\r\n"
            ."if not exist \"%PMD_DIR%\" mkdir \"%PMD_DIR%\"\r\n"
            ."powershell -Command \"Invoke-WebRequest -Uri '".$agentUrl."' -OutFile '%PMD_DIR%\\agent.js'\" >nul\r\n"
            ."(echo BACKEND_BASE_URL={$adminBase}&echo POS_AGENT_TOKEN={$token}&echo POS_DEVICE_CODE={$deviceCode}&echo POS_PAIRING_TOKEN={$device->pairing_token}&echo POS_DISPLAY_NAME={$device->name}&echo POLL_INTERVAL_MS=2000) > \"%PMD_DIR%\\.env\"\r\n"
            ."schtasks /create /tn \"PayMyDineLocalPosAgent\" /tr \"node \\\"%PMD_DIR%\\agent.js\\\"\" /sc onlogon /f >nul 2>&1\r\n"
            ."start \"PayMyDine Local Agent\" /min cmd /c \"cd /d %PMD_DIR% && node agent.js >> %PMD_DIR%\\agent.log 2>&1\"\r\n"
            ."echo PayMyDine local connector installed.\r\n"
            ."echo You can close this window.\r\n";
    }

    protected function buildLocalHardwareStatus($drawer): array
    {
        if (!$drawer) {
            return ['state' => 'not_configured', 'message' => 'Local hardware is not configured.'];
        }

        if (!$this->hasLocalHardwareColumns()) {
            return ['state' => 'not_configured', 'message' => 'Local hardware setup is unavailable for this tenant version.'];
        }

        $device = $drawer->localPosDevice;
        if (!$device) {
            if (!empty($drawer->local_mapping_invalid)) {
                return ['state' => 'invalid_mapping', 'message' => 'This drawer is linked to a cloud provider, not a local terminal.', 'drawer' => $drawer];
            }
            return ['state' => 'not_paired', 'message' => 'No local POS terminal is paired with this cash drawer.', 'drawer' => $drawer];
        }

        $online = method_exists($device, 'isOnline') ? $device->isOnline() : false;
        if (!$online) {
            return array_merge([
                'state' => 'offline',
                'message' => 'This POS terminal is offline.',
                'device' => $device,
                'drawer' => $drawer,
            ], $this->lastCommandSnapshot($drawer));
        }

        return array_merge([
            'state' => 'online',
            'message' => 'Local hardware is enabled and terminal is online.',
            'device' => $device,
            'drawer' => $drawer,
        ], $this->lastCommandSnapshot($drawer));
    }

    protected function lastCommandSnapshot($drawer): array
    {
        if (!$drawer) {
            return [];
        }

        $cmd = DB::table('pos_hardware_commands')
            ->where('drawer_id', $drawer->drawer_id)
            ->orderBy('id', 'desc')
            ->first();

        if (!$cmd) {
            return [];
        }

        return [
            'command' => $cmd,
        ];
    }

    protected function hasLocalHardwareColumns(): bool
    {
        return Schema::hasColumn('cash_drawers', 'local_pos_device_id')
            && Schema::hasColumn('cash_drawers', 'setup_state')
            && Schema::hasColumn('pos_devices', 'is_local_terminal');
    }

    protected function setSetupState($drawer, string $state, string $message): void
    {
        if (!$this->hasLocalHardwareColumns()) {
            return;
        }

        $drawer->setup_state = $state;
        $drawer->setup_message = $message;
        if ($state === 'ready') {
            $drawer->setup_completed_at = now();
        }
        $drawer->save();
    }
}
