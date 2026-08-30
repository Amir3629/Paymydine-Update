<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Cash_drawers_model;
use Admin\Models\FingerDevices_model;
use Admin\Models\Kds_stations_model;
use Admin\Models\Pos_configs_model;
use Admin\Models\Pos_devices_model;
use Admin\Models\Terminal_devices_model;
use Illuminate\Support\Facades\Schema;

/**
 * PMD Devices & Hardware
 *
 * V4 clean-room device settings. Every visible /admin/pmddevices/* page is
 * server-first native PMD markup. Legacy device controllers remain backend
 * action authorities only and their GET UI routes redirect back here.
 */
class Pmddevices extends AdminController
{
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();

        // PMD_DEVICE_SETTINGS_INLINE_V6
        // /admin/pmddevices is the only visible Devices UI. Create/Edit is handled
        // by one smooth in-page modal card; child routes only redirect back here.
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-devices-settings-page pmd-device-inline-v6');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-device-inline-v6.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        $this->addJs('js/pmd-device-inline-v6.js');

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Devices & hardware', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Devices & hardware', 'settings.'));

        // PMD_WORKPLACE_ACCESS_DEVICES_ENTRY_V2
        Template::setButton('Workplace Access', [
            'class' => 'btn btn-primary',
            'role' => 'button',
            'href' => admin_url('siteaccess/hub'),
        ]);

        $pos = $this->safeCollection(Pos_devices_model::class, 'pos_devices', 'name');
        $terminals = $this->safeCollection(Terminal_devices_model::class, 'terminal_devices', 'terminal_device_id');
        $drawers = $this->safeCollection(Cash_drawers_model::class, 'cash_drawers', 'name');
        $biometric = $this->safeCollection(FingerDevices_model::class, 'finger_devices', 'name');
        $kds = $this->safeCollection(Kds_stations_model::class, 'kds_stations', 'name');
        $integrations = collect();
        try {
            if (Schema::hasTable('pos_configs')) {
                $integrations = Pos_configs_model::with('devices')->orderBy('config_id', 'desc')->get();
            }
        } catch (\Throwable $e) {}

        $this->vars['pmdDevices'] = [
            'pos' => $pos,
            'terminals' => $terminals,
            'drawers' => $drawers,
            'biometric' => $biometric,
            'kds' => $kds,
            'integrations' => $integrations,
            'stats' => [
                'pos' => $pos->count(),
                'terminals' => $terminals->count(),
                'drawers' => $drawers->count(),
                'kds' => $kds->count(),
                'biometric' => $biometric->count(),
            ],
        ];

        // One server-rendered modal catalog. Existing device controllers remain
        // the POST/AJAX authority; this only supplies values/options to the card.
        $this->vars['pmdDeviceModalCatalog'] = [
            'pos' => $this->buildDevicePage('pos', 'list', null),
            'terminals' => $this->buildDevicePage('terminals', 'list', null),
            'kds' => $this->buildDevicePage('kds', 'list', null),
            'drawers' => $this->buildDevicePage('drawers', 'list', null),
            'biometric' => $this->buildDevicePage('biometric', 'list', null),
            'integrations' => $this->buildDevicePage('integrations', 'list', null),
        ];

        return $this->makeView('pmddevices/index');
    }

    public function pos($mode = null, $recordId = null)
    {
        return $this->redirectToOverview('pos', $mode, $recordId);
    }

    public function terminals($mode = null, $recordId = null)
    {
        return $this->redirectToOverview('terminals', $mode, $recordId);
    }

    public function kds($mode = null, $recordId = null)
    {
        return $this->redirectToOverview('kds', $mode, $recordId);
    }

    public function drawers($mode = null, $recordId = null)
    {
        return $this->redirectToOverview('drawers', $mode, $recordId);
    }

    public function biometric($mode = null, $recordId = null)
    {
        return $this->redirectToOverview('biometric', $mode, $recordId);
    }

    public function integrations($mode = null, $recordId = null)
    {
        return $this->redirectToOverview('integrations', $mode, $recordId);
    }

    protected function redirectToOverview(string $kind, $mode = null, $recordId = null)
    {
        [$mode, $recordId] = $this->normalizeMode($mode, $recordId);
        $section = [
            'pos' => 'pos-devices',
            'terminals' => 'payment-terminals',
            'kds' => 'kds',
            'drawers' => 'cash-drawers',
            'biometric' => 'biometric',
            'integrations' => 'device-configuration',
        ][$kind] ?? 'pmd-devices-page';

        if ($mode === 'list' || $kind === 'pos') {
            return redirect(admin_url('pmddevices').'#'.$section);
        }

        $query = http_build_query(array_filter([
            'pmd_device' => $kind,
            'pmd_mode' => $mode,
            'pmd_id' => $recordId,
        ], static fn($value) => $value !== null && $value !== ''));

        return redirect(admin_url('pmddevices').'?'.$query.'#'.$section);
    }

    protected function normalizeMode($mode, $recordId): array
    {
        if ($mode === null || $mode === '') return ['list', null];
        if (is_numeric($mode) && $recordId === null) return ['edit', (int)$mode];
        $mode = strtolower(trim((string)$mode));
        if ($mode === 'create') return ['create', null];
        if ($mode === 'edit') return ['edit', is_numeric($recordId) ? (int)$recordId : null];
        return ['list', null];
    }

    protected function buildDevicePage(string $kind, string $mode, ?int $recordId): ?array
    {
        $posOptions = $this->optionPosDevices();
        $base = [
            'kind' => $kind,
            'mode' => $mode,
            'record' => null,
            'items' => collect(),
            'options' => ['pos_devices' => $posOptions],
        ];

        if ($kind === 'pos') {
            return array_merge($base, [
                'title' => 'POS devices',
                'items' => $this->safeCollection(Pos_devices_model::class, 'pos_devices', 'name'),
                'list_url' => admin_url('pmddevices/pos'),
                'create_url' => null,
            ]);
        }

        if ($kind === 'kds') {
            $items = $this->safeCollection(Kds_stations_model::class, 'kds_stations', 'name');
            $record = $mode === 'edit' && $recordId ? Kds_stations_model::find($recordId) : new Kds_stations_model;
            if ($mode === 'edit' && !$record) return null;
            return array_merge($base, [
                'title' => $mode === 'create' ? 'Create KDS station' : ($mode === 'edit' ? 'Edit KDS station' : 'Kitchen display stations'),
                'items' => $items,
                'record' => $record,
                'record_id' => $recordId,
                'array_name' => 'Kds_station',
                'backend_url' => $mode === 'create' ? admin_url('kds_stations/create') : ($mode === 'edit' ? admin_url('kds_stations/edit/'.$recordId) : null),
                'list_url' => admin_url('pmddevices/kds'),
                'create_url' => admin_url('pmddevices/kds/create'),
                'options' => array_merge($base['options'], [
                    'categories' => Kds_stations_model::pmdKdsCategoryOptionsV46(),
                ]),
            ]);
        }

        if ($kind === 'terminals') {
            $items = $this->safeCollection(Terminal_devices_model::class, 'terminal_devices', 'terminal_device_id');
            $record = $mode === 'edit' && $recordId ? Terminal_devices_model::find($recordId) : new Terminal_devices_model;
            if ($mode === 'edit' && !$record) return null;
            return array_merge($base, [
                'title' => $mode === 'create' ? 'Create payment terminal' : ($mode === 'edit' ? 'Edit payment terminal' : 'Payment terminals'),
                'items' => $items,
                'record' => $record,
                'record_id' => $recordId,
                'array_name' => 'Terminal_device',
                'backend_url' => $mode === 'create' ? admin_url('terminal_devices/create') : ($mode === 'edit' ? admin_url('terminal_devices/edit/'.$recordId) : null),
                'list_url' => admin_url('pmddevices/terminals'),
                'create_url' => admin_url('pmddevices/terminals/create'),
                'options' => array_merge($base['options'], [
                    'providers' => Terminal_devices_model::listProviderOptions(),
                    'pairing' => Terminal_devices_model::listPairingStateOptions(),
                ]),
            ]);
        }

        if ($kind === 'drawers') {
            $items = $this->safeCollection(Cash_drawers_model::class, 'cash_drawers', 'name');
            $record = $mode === 'edit' && $recordId ? Cash_drawers_model::find($recordId) : new Cash_drawers_model;
            if ($mode === 'edit' && !$record) return null;
            $localPos = [];
            try {
                $localPos = Pos_devices_model::query()->where('is_local_terminal', 1)->orderBy('name')->pluck('name', 'device_id')->toArray();
            } catch (\Throwable $e) {}
            return array_merge($base, [
                'title' => $mode === 'create' ? 'Create cash drawer' : ($mode === 'edit' ? 'Edit cash drawer' : 'Cash drawers'),
                'items' => $items,
                'record' => $record,
                'record_id' => $recordId,
                'array_name' => 'Cash_drawer',
                'backend_url' => $mode === 'create' ? admin_url('cash_drawers/create') : ($mode === 'edit' ? admin_url('cash_drawers/edit/'.$recordId) : null),
                'list_url' => admin_url('pmddevices/drawers'),
                'create_url' => admin_url('pmddevices/drawers/create'),
                'options' => array_merge($base['options'], [
                    'local_pos' => $localPos,
                    'connection_types' => method_exists(Cash_drawers_model::class, 'getConnectionTypeOptions') ? Cash_drawers_model::getConnectionTypeOptions() : [],
                    'voltages' => method_exists(Cash_drawers_model::class, 'getVoltageOptions') ? Cash_drawers_model::getVoltageOptions() : ['12V'=>'12V','24V'=>'24V'],
                ]),
            ]);
        }

        if ($kind === 'biometric') {
            $items = $this->safeCollection(FingerDevices_model::class, 'finger_devices', 'name');
            $record = $mode === 'edit' && $recordId ? FingerDevices_model::find($recordId) : new FingerDevices_model;
            if ($mode === 'edit' && !$record) return null;
            return array_merge($base, [
                'title' => $mode === 'create' ? 'Create biometric device' : ($mode === 'edit' ? 'Edit biometric device' : 'Biometric devices'),
                'items' => $items,
                'record' => $record,
                'record_id' => $recordId,
                'array_name' => 'FingerDevice',
                'backend_url' => $mode === 'create' ? admin_url('biometric_devices/create') : ($mode === 'edit' ? admin_url('biometric_devices/edit/'.$recordId) : null),
                'list_url' => admin_url('pmddevices/biometric'),
                'create_url' => admin_url('pmddevices/biometric/create'),
            ]);
        }

        if ($kind === 'integrations') {
            $items = collect();
            try { $items = Pos_configs_model::with('devices')->orderBy('config_id', 'desc')->get(); } catch (\Throwable $e) {}
            $record = $mode === 'edit' && $recordId ? Pos_configs_model::with('devices')->find($recordId) : new Pos_configs_model;
            if ($mode === 'edit' && !$record) return null;
            return array_merge($base, [
                'title' => $mode === 'create' ? 'Create POS integration' : ($mode === 'edit' ? 'Edit POS integration' : 'POS integrations'),
                'items' => $items,
                'record' => $record,
                'record_id' => $recordId,
                'array_name' => 'Pos_config',
                'backend_url' => $mode === 'create' ? admin_url('pos_configs/create') : ($mode === 'edit' ? admin_url('pos_configs/edit/'.$recordId) : null),
                'list_url' => admin_url('pmddevices/integrations'),
                'create_url' => admin_url('pmddevices/integrations/create'),
            ]);
        }

        return null;
    }

    protected function optionPosDevices(): array
    {
        try {
            if (!Schema::hasTable('pos_devices')) return [];
            return Pos_devices_model::query()->orderBy('name')->pluck('name', 'device_id')->toArray();
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function safeCollection(string $modelClass, string $table, string $orderBy)
    {
        try {
            if (!Schema::hasTable($table)) return collect();
            $query = $modelClass::query();
            if ($orderBy !== '') $query->orderBy($orderBy);
            return $query->get();
        } catch (\Throwable $error) {
            logger()->warning('PMD devices query failed', ['table' => $table, 'message' => $error->getMessage()]);
            return collect();
        }
    }
}
