<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Payments_model;
use Admin\Models\Terminal_devices_model;
use App\Services\TerminalPayments\WorldlineTerminalProvider;
use App\Services\TerminalPayments\SquareTerminalProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class TerminalDevices extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\\Actions\\ListController',
        'Admin\\Actions\\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\\Models\\Terminal_devices_model',
            'title' => 'Terminal Devices',
            'emptyMessage' => 'No terminal devices configured',
            'defaultSort' => ['updated_at', 'DESC'],
            'configFile' => 'terminal_devices_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Terminal Device',
        'model' => 'Admin\\Models\\Terminal_devices_model',
        'request' => 'Admin\\Requests\\TerminalDevices',
        'create' => [
            'title' => 'Create Terminal Device',
            'redirect' => 'terminal_devices/edit/{terminal_device_id}',
            'redirectClose' => 'terminal_devices',
            'redirectNew' => 'terminal_devices/create',
        ],
        'edit' => [
            'title' => 'Edit Terminal Device',
            'redirect' => 'terminal_devices',
            'redirectClose' => 'terminal_devices',
            'redirectNew' => 'terminal_devices/create',
        ],
        'delete' => [
            'redirect' => 'terminal_devices',
        ],
        'configFile' => 'terminal_devices_model',
    ];

    protected $requiredPermissions = 'Admin.Pos';

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmddevices/terminals'));
        }

        $this->asExtension('ListController')->index();
        return $this->makeView('terminaldevices/index');
    }

    public function create()
    {
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmddevices/terminals/create'));
        }

        $this->asExtension('FormController')->create();
        return $this->makeView('terminaldevices/create');
    }

    public function edit($context = null, $recordId = null)
    {
        if (request()->isMethod('get') && !request()->ajax()) {
            return redirect(admin_url('pmddevices/terminals/edit/'.(int)basename(request()->path())));
        }

        if ($recordId === null && is_numeric($context)) {
            $recordId = (int)$context;
            $context = null;
        }

        $this->asExtension('FormController')->edit($context, $recordId);
        return $this->makeView('terminaldevices/edit');
    }

    public function formExtendFields($form)
    {
        $model = $form->model;
        $providerCode = strtolower(trim((string)$model->provider_code));
        $status = $this->buildStatusSnapshot($providerCode, (string)$model->reader_id, (bool)$model->is_active);

        $guideLabel = 'Payment Terminal Setup';
        $guideComment = 'Choose the terminal provider, enter the provider-issued terminal identifier, assign the restaurant location, validate the provider configuration, then mark the terminal active only after the physical device is ready.';

        if ($providerCode === 'worldline') {
            $guideLabel = 'Worldline Terminal API Setup';
            $guideComment = 'Reader ID must be the Worldline-issued UTID — never a Connect Webhook Key ID. Configure the Terminal API UMID, separate Bearer key and API URL in Payments & Finance > Worldline. On the physical SmartPOS terminal install/open Terminal API cloud, enter the same UMID/UTID, select INTEGRATION for testing and turn Terminal API on until the cloud icon is green.';
        } elseif ($providerCode === 'sumup' || $providerCode === '') {
            $guideLabel = 'SumUp Terminal Setup';
            $guideComment = 'Keep your SumUp merchant credentials, discover the readers connected to that account, copy/select the Reader ID, test it, then mark the terminal active.';
        } elseif ($providerCode === 'square') {
            $guideLabel = 'Square Terminal API Setup';
            $guideComment = 'Reader ID = Square device_id. PayMyDine Canada Sandbox uses the documented CAD simulator 388b5a08-a77c-48ef-ad2a-4a790e6f2789 for a successful Interac checkout. Production requires the paired Square Terminal device_id returned by the Devices API.';
        } elseif ($providerCode === 'vr_payment') {
            $guideLabel = 'VR Payment Terminal Setup';
            $guideComment = 'Use a terminal identifier returned by the configured VR Payment merchant account. Do not mark a terminal active until provider synchronization has confirmed it.';
        }

        $form->addFields([
            'terminal_setup_guide' => [
                'type' => 'section',
                'label' => $guideLabel,
                'comment' => $guideComment,
            ],
            'status_snapshot' => [
                'label' => 'Readiness Snapshot',
                'type' => 'textarea',
                'span' => 'full',
                'attributes' => ['rows' => 5, 'readonly' => 'readonly'],
                'default' => "provider_ready: {$status['provider_ready']}\nterminal_ready: {$status['terminal_ready']}\ncard_online_ready: {$status['card_online_ready']}\ncard_present_ready: {$status['card_present_ready']}\nnetwork_probe: {$status['network_probe']}",
            ],
        ]);
    }

    public function formBeforeSave($model)
    {
        // PMD_SQUARE_TERMINAL_CANADA_R10_SAVE_NORMALIZATION
        $providerCode = strtolower(trim((string)($model->provider_code ?? post('Terminal_device.provider_code', ''))));
        $readerId = trim((string)($model->reader_id ?? post('Terminal_device.reader_id', '')));

        // Affiliate key belongs to SumUp only. Never let a Square/Worldline/VR
        // device accidentally retain a copied reader/device ID in that field.
        if ($providerCode !== 'sumup') {
            $model->affiliate_key = '';
        }

        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';
                $model->environment = $mode;

                if (empty($model->location_id)) {
                    $state = app(\App\Services\Platform\LocationPlatformContext::class)->state();
                    if (!empty($state['location_id'])) {
                        $model->location_id = (int)$state['location_id'];
                    }
                }

                if ($mode === 'test' && SquareTerminalProvider::isCanadaSandboxDeviceId($readerId)) {
                    $model->pairing_state = 'paired';
                    $model->terminal_status = 'sandbox_simulator_ready';
                } elseif ($readerId !== '' && trim((string)($model->terminal_status ?? '')) === '') {
                    $model->terminal_status = 'configured';
                }
            } catch (\Throwable $error) {
                Log::warning('PMD_SQUARE_TERMINAL_SAVE_NORMALIZATION_FAILED_R10', [
                    'message' => $error->getMessage(),
                ]);
            }
            return;
        }

        if ($providerCode !== 'worldline') {
            return;
        }

        $readerLabel = trim((string)($model->reader_label ?? post('Terminal_device.reader_label', '')));
        $worldline = (array)post('Worldline_terminal', []);
        $environment = strtolower(trim((string)($worldline['terminal_environment'] ?? ($model->environment ?? 'test'))));
        $environment = $environment === 'live' ? 'live' : 'test';
        $model->environment = $environment;

        app(\App\Services\TerminalPayments\WorldlineTerminalSettingsService::class)
            ->saveForTerminal($worldline, $readerId, $readerLabel, $environment);
    }

    // PMD_SQUARE_TERMINAL_CANADA_R11_INLINE_RECORD_RESOLVER
    private function resolveInlineTerminalRecord()
    {
        $recordId = (int)post('_pmd_terminal_device_id', 0);

        if ($recordId <= 0) {
            $routeTail = trim((string)basename((string)request()->path()));
            if ($routeTail !== '' && ctype_digit($routeTail)) {
                $recordId = (int)$routeTail;
            }
        }

        if ($recordId > 0) {
            try {
                $record = Terminal_devices_model::query()->find($recordId);
                if ($record) {
                    return $record;
                }
            } catch (\Throwable $error) {
                Log::error('PMD_TERMINAL_INLINE_RECORD_QUERY_FAILED_R11', [
                    'terminal_device_id' => $recordId,
                    'message' => $error->getMessage(),
                ]);
            }
        }

        try {
            $record = $this->formGetModel();
            if ($record) {
                return $record;
            }
        } catch (\Throwable $error) {
            Log::warning('PMD_TERMINAL_INLINE_FORM_MODEL_UNAVAILABLE_R11', [
                'terminal_device_id' => $recordId ?: null,
                'message' => $error->getMessage(),
            ]);
        }

        return null;
    }

    public function onDiscoverReaders()
    {
        // PMD_SQUARE_TERMINAL_CANADA_R11_DISCOVERY_RECORD
        $model = $this->resolveInlineTerminalRecord();
        if (!$model) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to resolve this terminal record in the current restaurant database.',
                'terminal_device_id' => (int)post('_pmd_terminal_device_id', 0) ?: null,
            ], 422);
        }

        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));

        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';
                $locationId = (int)post('Terminal_device.location_id', (int)($model->location_id ?? 0));
                $platform = app(\App\Services\Platform\LocationPlatformContext::class)->state($locationId ?: null);
                $pmdCountry = strtoupper(trim((string)($platform['country_code'] ?? '')));
                $pmdCurrency = strtoupper(trim((string)($platform['profile']['currency']['code'] ?? '')));

                if ($pmdCountry !== 'CA' || $pmdCurrency !== 'CAD') {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => 'Square Terminal discovery is enabled in PayMyDine only for Canada / CAD.',
                    ], 422);
                }

                if ($mode === 'test') {
                    $readers = [];
                    foreach (SquareTerminalProvider::canadaSandboxDevices() as $deviceId => $scenario) {
                        $readers[] = [
                            'id' => $deviceId,
                            'name' => (string)($scenario['name'] ?? $deviceId),
                            'status' => 'SIMULATED',
                            'expected_status' => $scenario['expected_status'] ?? null,
                            'currency' => 'CAD',
                        ];
                    }

                    return response()->json([
                        'success' => true,
                        'provider' => 'square',
                        'mode' => 'test',
                        'sandbox' => true,
                        'payment_sent' => false,
                        'message' => 'Square Canada Sandbox simulators loaded. The first device simulates a successful CAD Interac checkout.',
                        'readers' => $readers,
                    ]);
                }

                $token = trim((string)($config['access_token'] ?? ''));
                $squareLocationId = trim((string)($config['location_id'] ?? ''));
                if ($token === '' || $squareLocationId === '') {
                    return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square production Access Token and Location ID are required.'], 422);
                }

                $response = Http::withToken($token)
                    ->withHeaders(['Square-Version' => \App\Services\Payments\SquareRuntimeService::API_VERSION])
                    ->acceptJson()
                    ->timeout(20)
                    ->get('https://connect.squareup.com/v2/devices', ['location_id' => $squareLocationId, 'limit' => 100]);
                $json = (array)$response->json();
                if (!$response->successful()) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => (string)($json['errors'][0]['detail'] ?? 'Unable to list Square Terminal devices. Ensure the token has DEVICES_READ permission.'),
                        'status' => $response->status(),
                    ], 422);
                }

                $readers = [];
                foreach ((array)($json['devices'] ?? []) as $device) {
                    $device = (array)$device;
                    $attributes = (array)($device['attributes'] ?? []);
                    $status = (array)($device['status'] ?? []);
                    $deviceId = trim((string)($device['id'] ?? ''));
                    if ($deviceId === '') continue;
                    $readers[] = [
                        'id' => $deviceId,
                        'name' => (string)($attributes['name'] ?? $attributes['model'] ?? $deviceId),
                        'model' => $attributes['model'] ?? null,
                        'status' => $status['category'] ?? null,
                    ];
                }

                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'mode' => 'live',
                    'location_id' => $squareLocationId,
                    'payment_sent' => false,
                    'readers' => $readers,
                    'message' => count($readers).' Square Terminal device(s) returned by the Devices API.',
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD_SQUARE_TERMINAL_DISCOVERY_FAILED_R10', ['message' => $error->getMessage()]);
                return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square Terminal discovery failed: '.$error->getMessage()], 422);
            }
        }

        // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
        if ($providerCode === 'vr_payment') {
            try {
                $service = app(\Admin\Classes\VRPaymentGatewayService::class);
                $probe = $service->probeConnectivity();

                if (!($probe['ok'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'error' => (string)($probe['message'] ?? 'VR Payment terminal discovery failed.'),
                    ], 422);
                }

                $columns = Schema::hasTable('terminal_devices')
                    ? Schema::getColumnListing('terminal_devices')
                    : [];

                $rows = Schema::hasTable('terminal_devices')
                    ? DB::table('terminal_devices')
                        ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                        ->orderBy('terminal_device_id')
                        ->get()
                    : collect();

                $readers = [];
                foreach ($rows as $row) {
                    $readerId = trim((string)($row->reader_id ?? ''));
                    $readers[] = [
                        'terminal_device_id' => (int)($row->terminal_device_id ?? 0),
                        'provider_terminal_id' => in_array('provider_terminal_id', $columns, true)
                            ? ($row->provider_terminal_id ?? null)
                            : null,
                        'id' => $readerId,
                        'name' => trim((string)($row->reader_label ?? '')) ?: $readerId,
                        'status' => (string)($row->terminal_status ?? 'unknown'),
                        'pairing_state' => (string)($row->pairing_state ?? 'unknown'),
                        'environment' => in_array('environment', $columns, true)
                            ? (string)($row->environment ?? 'test')
                            : 'test',
                        'active' => !empty($row->is_active),
                        'simulator' => str_starts_with(strtoupper($readerId), 'PMD-VR-SIM-'),
                    ];
                }

                return response()->json([
                    'success' => true,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'message' => 'VR Payment inventory synchronized. No payment or terminal command was sent.',
                    'api_terminal_count' => (int)($probe['api_terminal_count'] ?? $probe['terminal_count'] ?? 0),
                    'usable_terminal_count' => (int)($probe['usable_terminal_count'] ?? $probe['terminal_count'] ?? 0),
                    'pmd_simulator_count' => (int)($probe['pmd_simulator_count'] ?? 0),
                    'readers' => $readers,
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD_VR_TERMINAL_DISCOVERY_FAILED_R5', ['message' => $error->getMessage()]);
                return response()->json([
                    'success' => false,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'error' => 'VR Payment terminal discovery failed: '.$error->getMessage(),
                ], 422);
            }
        }

        if ($providerCode !== 'sumup') {
            return response()->json([
                'success' => false,
                'provider' => $providerCode,
                'error' => 'Automatic device discovery is not available for this terminal provider.',
            ], 422);
        }

        $config = $this->sumupConfig();
        if (!$config['ready']) {
            return response()->json(['success' => false, 'error' => $config['message']], 422);
        }

        $merchantCode = $this->resolveMerchantCode($config);
        if ($merchantCode === '') {
            return response()->json(['success' => false, 'error' => 'SumUp merchant code could not be resolved.'], 422);
        }

        $resp = Http::withToken($config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->get($config['url'].'/v0.1/merchants/'.rawurlencode($merchantCode).'/readers');

        if (!$resp->ok()) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to list SumUp readers. Ensure the token has readers.read permission.',
                'status' => $resp->status(),
                'details' => $resp->json(),
            ], 502);
        }

        $body = (array)$resp->json();
        $items = array_values((array)($body['items'] ?? $body['readers'] ?? []));

        return response()->json([
            'success' => true,
            'provider' => 'sumup',
            'merchant_code' => $merchantCode,
            'readers' => $items,
        ]);
    }

    public function onTestTerminalConnection()
    {
        // PMD_SQUARE_TERMINAL_CANADA_R11_TEST_RECORD
        $model = $this->resolveInlineTerminalRecord();
        if (!$model) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to resolve this terminal record in the current restaurant database.',
                'terminal_device_id' => (int)post('_pmd_terminal_device_id', 0) ?: null,
            ], 422);
        }
        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));
        $readerId = trim((string)post('Terminal_device.reader_id', (string)($model->reader_id ?? '')));

        if ($readerId === '') {
            return response()->json(['success' => false, 'error' => 'Reader / Terminal ID is required.'], 422);
        }

        if ($providerCode === 'worldline') {
            $config = $this->worldlineConfig();
            $config['terminal_id'] = $readerId;
            $config['reader_id'] = $readerId;
            $config['terminal_environment'] = strtolower(trim((string)($model->environment ?: ($config['terminal_environment'] ?? 'test'))));

            $validation = (new WorldlineTerminalProvider())->validateConfiguration($config);
            if (!($validation['ok'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'provider' => 'worldline',
                    'configuration_ready' => false,
                    'network_probe_performed' => false,
                    'error' => $validation['message'] ?? 'Worldline Terminal API configuration is incomplete.',
                ], 422);
            }

            $model->terminal_status = 'configured';
            $model->pairing_state = in_array(strtolower((string)$model->pairing_state), ['paired', 'needs_attention'], true)
                ? $model->pairing_state
                : 'unknown';
            $model->metadata = array_merge((array)$model->metadata, [
                'last_configuration_tested_at' => now()->toIso8601String(),
                'worldline_terminal_api' => [
                    'configuration_ready' => true,
                    'network_probe_performed' => false,
                    'terminal_id' => $readerId,
                ],
            ]);
            $model->save();

            return response()->json([
                'success' => true,
                'provider' => 'worldline',
                'reader_id' => $readerId,
                'configuration_ready' => true,
                'network_probe_performed' => false,
                'message' => 'Worldline Terminal API configuration is complete. No payment or device command was sent. Confirm the Terminal API cloud icon is green, then validate reachability with an Integration test transaction.',
                'status' => $this->buildStatusSnapshot('worldline', $readerId, (bool)$model->is_active),
            ]);
        }

        if ($providerCode === 'square') {
            // PMD_SQUARE_TERMINAL_CANADA_R10_READ_ONLY_TEST
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';
                $locationId = (int)post('Terminal_device.location_id', (int)($model->location_id ?? 0));
                $platform = app(\App\Services\Platform\LocationPlatformContext::class)->state($locationId ?: null);
                $pmdCountry = strtoupper(trim((string)($platform['country_code'] ?? '')));
                $pmdCurrency = strtoupper(trim((string)($platform['profile']['currency']['code'] ?? '')));

                $config['device_id'] = $readerId;
                $config['pmd_country_code'] = $pmdCountry;
                $config['currency'] = $pmdCurrency !== '' ? $pmdCurrency : strtoupper(trim((string)($config['configured_currency'] ?? '')));

                $validation = (new SquareTerminalProvider())->validateConfiguration($config);
                if (!($validation['ok'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => $validation['message'] ?? 'Square Terminal configuration is incomplete.',
                    ], 422);
                }

                $location = $runtime->location($config);
                $squareCountry = strtoupper(trim((string)($location['country'] ?? '')));
                $squareCurrency = strtoupper(trim((string)($location['currency'] ?? '')));
                if ($pmdCountry !== 'CA' || $pmdCurrency !== 'CAD' || $squareCountry !== 'CA' || $squareCurrency !== 'CAD') {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => 'Square Terminal requires PayMyDine Canada/CAD and a Square Canada/CAD location.',
                        'restaurant_country' => $pmdCountry,
                        'restaurant_currency' => $pmdCurrency,
                        'square_country' => $squareCountry,
                        'square_currency' => $squareCurrency,
                    ], 422);
                }

                $sandboxSimulator = false;
                $scenario = null;
                if ($mode === 'test') {
                    $sandboxSimulator = SquareTerminalProvider::isCanadaSandboxDeviceId($readerId);
                    if (!$sandboxSimulator) {
                        return response()->json([
                            'success' => false,
                            'provider' => 'square',
                            'mode' => 'test',
                            'error' => 'For PayMyDine Canada Sandbox, choose one of the documented CAD Terminal simulator device IDs from Discover / load devices.',
                            'supported_device_ids' => array_keys(SquareTerminalProvider::canadaSandboxDevices()),
                        ], 422);
                    }
                    $scenario = SquareTerminalProvider::canadaSandboxDevices()[$readerId] ?? null;
                } else {
                    // Safe read-only production device validation. No checkout,
                    // charge, action, or pairing command is sent.
                    $deviceResponse = Http::withToken((string)$config['access_token'])
                        ->withHeaders(['Square-Version' => \App\Services\Payments\SquareRuntimeService::API_VERSION])
                        ->acceptJson()
                        ->timeout(20)
                        ->get($runtime->baseUrl($config).'/v2/devices/'.rawurlencode($readerId));
                    $deviceJson = (array)$deviceResponse->json();
                    if (!$deviceResponse->successful()) {
                        return response()->json([
                            'success' => false,
                            'provider' => 'square',
                            'mode' => 'live',
                            'error' => (string)($deviceJson['errors'][0]['detail'] ?? 'Square device was not found. Ensure DEVICES_READ permission and use the paired device_id from the Devices API.'),
                            'status' => $deviceResponse->status(),
                        ], 422);
                    }
                    $device = (array)($deviceJson['device'] ?? []);
                    if (trim((string)($device['id'] ?? '')) === '') {
                        return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square Devices API returned no matching terminal device.'], 422);
                    }
                }

                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'reader_id' => $readerId,
                    'mode' => $mode,
                    'location' => [
                        'id' => $config['location_id'] ?? null,
                        'name' => $location['name'] ?? null,
                        'country' => $squareCountry,
                        'currency' => $squareCurrency,
                    ],
                    'sandbox_simulator' => $sandboxSimulator,
                    'scenario' => $scenario,
                    'network_probe_performed' => true,
                    'payment_sent' => false,
                    'recommended_terminal_status' => $sandboxSimulator ? 'sandbox_simulator_ready' : 'configured',
                    'recommended_pairing_state' => $sandboxSimulator ? 'paired' : ((string)($model->pairing_state ?? '') ?: 'unknown'),
                    'message' => $sandboxSimulator
                        ? 'Square Canada Sandbox Terminal configuration is valid. No charge was created. Run a CAD order through Direct terminal to test the simulated checkout.'
                        : 'Square production credentials, location and device are readable. No checkout or charge was created.',
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD_SQUARE_TERMINAL_TEST_FAILED_R10', [
                    'reader_id' => $readerId,
                    'message' => $error->getMessage(),
                ]);
                return response()->json([
                    'success' => false,
                    'provider' => 'square',
                    'error' => 'Square Terminal test failed: '.$error->getMessage(),
                ], 422);
            }
        }

        // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
        if ($providerCode === 'vr_payment') {
            try {
                $service = app(\Admin\Classes\VRPaymentGatewayService::class);
                $config = $service->getConfig();
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';

                $readerId = trim((string)($model->reader_id ?? ''));
                $isSimulator = str_starts_with(strtoupper($readerId), 'PMD-VR-SIM-');

                if ($isSimulator) {
                    if ($mode !== 'test') {
                        return response()->json([
                            'success' => false,
                            'provider' => 'vr_payment',
                            'simulator' => true,
                            'payment_sent' => false,
                            'error' => 'PMD VR Simulator is TEST-only and is blocked while VR Payment is in live mode.',
                        ], 422);
                    }

                    $metadata = $model->metadata ?? [];
                    if (is_string($metadata)) {
                        $decoded = json_decode($metadata, true);
                        $metadata = is_array($decoded) ? $decoded : [];
                    }
                    if (!is_array($metadata)) {
                        $metadata = [];
                    }

                    return response()->json([
                        'success' => true,
                        'provider' => 'vr_payment',
                        'simulator' => true,
                        'payment_sent' => false,
                        'network_probe_performed' => false,
                        'reader_id' => $readerId,
                        'scenario' => $metadata['scenario'] ?? null,
                        'message' => 'PMD VR Simulator is ready. This is an internal TEST-only simulator and no request was sent to VR Payment.',
                    ]);
                }

                $client = new \App\Services\Payments\VrPaymentApiClient($config);
                $validation = $client->validateConfiguration();
                if (!($validation['ok'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'error' => (string)($validation['message'] ?? 'VR Payment configuration is invalid.'),
                    ], 422);
                }

                $providerTerminalId = Schema::hasColumn('terminal_devices', 'provider_terminal_id')
                    ? (int)($model->provider_terminal_id ?? 0)
                    : 0;

                if ($providerTerminalId <= 0) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'error' => 'This VR terminal has no provider object ID. Run Test saved connection in Payments & finance to synchronize terminals.',
                    ], 422);
                }

                $response = $client->terminal($providerTerminalId);
                if (!($response['ok'] ?? false) || !is_array($response['data'] ?? null)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'provider_terminal_id' => $providerTerminalId,
                        'error' => (string)($response['message'] ?? 'Unable to read the VR Payment terminal object.'),
                        'status' => $response['status'] ?? null,
                    ], 422);
                }

                $terminal = (array)$response['data'];
                $state = strtolower(trim((string)($terminal['state'] ?? 'unknown')));
                $serial = trim((string)(
                    $terminal['deviceSerialNumber']
                    ?? $terminal['serialNumber']
                    ?? ((array)($terminal['device'] ?? []))['serialNumber']
                    ?? ''
                ));
                $plannedPurge = $terminal['plannedPurgeDate'] ?? null;
                $usable = $state === 'active' && $serial !== '' && empty($plannedPurge);

                return response()->json([
                    'success' => true,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'network_probe_performed' => true,
                    'provider_terminal_id' => $providerTerminalId,
                    'identifier' => $terminal['identifier'] ?? $readerId,
                    'state' => $terminal['state'] ?? null,
                    'planned_purge_date' => $plannedPurge,
                    'device_serial_number' => $serial !== '' ? $serial : null,
                    'usable_for_payment' => $usable,
                    'message' => $usable
                        ? 'VR Payment terminal object is reachable and exposes a linked device.'
                        : 'VR Payment terminal object is reachable, but it is not a linked/usable payment device yet.',
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD_VR_TERMINAL_SAFE_TEST_FAILED_R5', ['message' => $error->getMessage()]);
                return response()->json([
                    'success' => false,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'error' => 'VR Payment terminal read-only test failed: '.$error->getMessage(),
                ], 422);
            }
        }

        if ($providerCode !== 'sumup') {
            return response()->json([
                'success' => false,
                'error' => 'This provider does not expose a safe non-charging terminal connection test here.',
            ], 422);
        }

        $config = $this->sumupConfig();
        if (!$config['ready']) {
            return response()->json(['success' => false, 'error' => $config['message']], 422);
        }

        $merchantCode = $this->resolveMerchantCode($config);
        if ($merchantCode === '') {
            return response()->json(['success' => false, 'error' => 'SumUp merchant code could not be resolved.'], 422);
        }

        $base = $config['url'].'/v0.1/merchants/'.rawurlencode($merchantCode).'/readers/'.rawurlencode($readerId);
        $readerResp = Http::withToken($config['access_token'])->acceptJson()->timeout(20)->get($base);
        if (!$readerResp->ok()) {
            return response()->json([
                'success' => false,
                'error' => 'SumUp reader was not found for this merchant.',
                'status' => $readerResp->status(),
                'details' => $readerResp->json(),
            ], 404);
        }

        $statusResp = Http::withToken($config['access_token'])->acceptJson()->timeout(20)->get($base.'/status');
        $statusJson = $statusResp->ok() ? (array)$statusResp->json() : [];
        $reader = (array)$readerResp->json();
        $readerData = (array)($reader['data'] ?? $reader);
        $statusData = (array)($statusJson['data'] ?? $statusJson);

        $model->terminal_status = (string)($statusData['device_status'] ?? $statusData['status'] ?? $readerData['status'] ?? 'online');
        $model->pairing_state = strtolower((string)($readerData['status'] ?? 'paired')) === 'processing' ? 'unpaired' : 'paired';
        if (empty($model->reader_label)) {
            $model->reader_label = (string)($readerData['name'] ?? 'SumUp Reader');
        }
        $model->metadata = array_merge((array)$model->metadata, [
            'last_tested_at' => now()->toIso8601String(),
            'sumup_reader' => $readerData,
            'sumup_status' => $statusData,
        ]);
        $model->save();

        $status = $this->buildStatusSnapshot('sumup', $readerId, (bool)$model->is_active);

        return response()->json([
            'success' => true,
            'provider' => 'sumup',
            'reader_id' => $readerId,
            'reader_found' => true,
            'reader' => $readerData,
            'reader_status' => $statusData,
            'status' => $status,
        ]);
    }

    protected function buildStatusSnapshot(?string $providerCode, string $readerId, bool $isActive): array
    {
        $providerCode = strtolower(trim((string)$providerCode));
        $providerReady = false;
        $networkProbe = 'not-run';

        if ($providerCode === 'sumup') {
            $providerReady = (bool)($this->sumupConfig()['ready'] ?? false);
            $networkProbe = 'available';
        } elseif ($providerCode === 'worldline') {
            $config = $this->worldlineConfig();
            $config['terminal_id'] = $readerId;
            $config['reader_id'] = $readerId;
            $providerReady = (bool)((new WorldlineTerminalProvider())->validateConfiguration($config)['ok'] ?? false);
            $networkProbe = 'integration-payment-required';
        }

        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $config['device_id'] = $readerId;
                $config['pmd_country_code'] = strtoupper((string)(app(\App\Services\Platform\LocationPlatformContext::class)->countryCode() ?? ''));
                $providerReady = (bool)((new SquareTerminalProvider())->validateConfiguration($config)['ok'] ?? false);
                $networkProbe = 'locations-api';
            } catch (\Throwable $ignored) {
                $providerReady = false;
                $networkProbe = 'not-run';
            }
        }

        $terminalReady = $providerReady && trim($readerId) !== '';

        return [
            'provider_ready' => $providerReady ? 'yes' : 'no',
            'terminal_ready' => $terminalReady ? 'yes' : 'no',
            'card_online_ready' => $providerCode === 'worldline' ? 'separate-connect-runtime' : ($providerReady ? 'yes' : 'no'),
            'card_present_ready' => ($terminalReady && $isActive) ? 'yes' : 'no',
            'network_probe' => $networkProbe,
        ];
    }

    private function worldlineConfig(): array
    {
        $data = [];
        try {
            if (Schema::hasTable('payment_methods') || Schema::hasTable('payments')) {
                $provider = Payments_model::query()->where('code', 'worldline')->where('status', 1)->first();
                if ($provider && method_exists($provider, 'getConfigData')) {
                    $data = (array)$provider->getConfigData();
                }
            }
        } catch (\Throwable $ignored) {
        }

        return [
            'merchant_id' => trim((string)($data['merchant_id'] ?? '')),
            'terminal_merchant_id' => trim((string)($data['terminal_merchant_id'] ?? '')),
            'terminal_id' => trim((string)($data['terminal_id'] ?? '')),
            'terminal_api_token' => trim((string)($data['terminal_api_token'] ?? '')),
            'terminal_api_base_url' => trim((string)($data['terminal_api_base_url'] ?? '')),
            'terminal_environment' => strtolower(trim((string)($data['terminal_environment'] ?? 'test'))),
            'currency' => 'EUR',
        ];
    }

    private function sumupConfig(): array
    {
        $data = [];

        try {
            if (Schema::hasTable('payment_methods') || Schema::hasTable('payments')) {
                $provider = Payments_model::query()->where('code', 'sumup')->where('status', 1)->first();
                if ($provider && method_exists($provider, 'getConfigData')) {
                    $data = (array)$provider->getConfigData();
                }
            }
        } catch (\Throwable $ignored) {
        }

        if (empty($data['access_token']) && Schema::hasTable('pos_configs') && Schema::hasTable('pos_devices')) {
            try {
                $legacy = DB::table('pos_configs as pc')
                    ->join('pos_devices as pd', 'pd.device_id', '=', 'pc.device_id')
                    ->whereRaw('LOWER(pd.code) = ?', ['sumup'])
                    ->orderByDesc('pc.config_id')
                    ->select('pc.*')
                    ->first();

                if ($legacy) {
                    $data = array_merge([
                        'url' => (string)($legacy->url ?? 'https://api.sumup.com'),
                        'access_token' => (string)($legacy->access_token ?? ''),
                        'id_application' => (string)($legacy->id_application ?? ''),
                        'affiliate_key' => (string)($legacy->sumup_affiliate_key ?? ''),
                    ], $data);
                }
            } catch (\Throwable $ignored) {
            }
        }

        $token = trim((string)($data['access_token'] ?? ''));
        $url = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');
        $merchantCode = trim((string)($data['merchant_code'] ?? $data['id_application'] ?? ''));

        return [
            'ready' => $token !== '',
            'message' => $token !== '' ? 'SumUp credentials ready.' : 'SumUp access token is missing.',
            'access_token' => $token,
            'url' => $url,
            'merchant_code' => $merchantCode,
            'affiliate_key' => trim((string)($data['affiliate_key'] ?? '')),
        ];
    }

    private function resolveMerchantCode(array $config): string
    {
        $merchantCode = trim((string)($config['merchant_code'] ?? ''));
        if ($merchantCode !== '') {
            return $merchantCode;
        }

        try {
            $resp = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(20)
                ->get($config['url'].'/v0.1/me');
            if (!$resp->ok()) {
                return '';
            }
            $json = (array)$resp->json();
            return trim((string)(
                $json['merchant_profile']['merchant_code']
                ?? $json['merchant_code']
                ?? ''
            ));
        } catch (\Throwable $ignored) {
            return '';
        }
    }
}
