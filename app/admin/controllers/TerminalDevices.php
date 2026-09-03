<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\WorldlineTerminalProvider;
use App\Services\TerminalPayments\SquareTerminalProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
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
            $guideComment = 'Reader ID = Square device_id. In Sandbox you may use Square documented simulator ID 9fa747a2-25ff-48ee-b078-04381f7c828f for a successful card checkout. Production requires a paired Square Terminal device_id and a Square-supported seller country.';
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
        $providerCode = strtolower(trim((string)($model->provider_code ?? post('Terminal_device.provider_code', ''))));
        if ($providerCode !== 'worldline') {
            return;
        }

        $readerId = trim((string)($model->reader_id ?? post('Terminal_device.reader_id', '')));
        $readerLabel = trim((string)($model->reader_label ?? post('Terminal_device.reader_label', '')));
        $worldline = (array)post('Worldline_terminal', []);
        $environment = strtolower(trim((string)($worldline['terminal_environment'] ?? ($model->environment ?? 'test'))));
        $environment = $environment === 'live' ? 'live' : 'test';
        $model->environment = $environment;

        app(\App\Services\TerminalPayments\WorldlineTerminalSettingsService::class)
            ->saveForTerminal($worldline, $readerId, $readerLabel, $environment);
    }

    public function onDiscoverReaders()
    {
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
        $model = $this->formGetModel();
        $providerCode = strtolower(trim((string)$model->provider_code));
        $readerId = trim((string)$model->reader_id);

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
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $config['device_id'] = $readerId;
                $config['pmd_country_code'] = strtoupper((string)(app(\App\Services\Platform\LocationPlatformContext::class)->countryCode((int)($model->location_id ?? 0) ?: null) ?? ''));
                $validation = (new SquareTerminalProvider())->validateConfiguration($config);
                if (!($validation['ok'] ?? false)) {
                    return response()->json(['success' => false, 'provider' => 'square', 'error' => $validation['message'] ?? 'Square Terminal configuration is incomplete.'], 422);
                }
                $location = $runtime->location($config);
                $mode = (string)($config['mode'] ?? 'test');
                $sandboxIds = ['9fa747a2-25ff-48ee-b078-04381f7c828f', '22cd266c-6246-4c06-9983-67f0c26346b0', '4mp4e78c-88ed-4d55-a269-8008dfe14e9'];
                $model->terminal_status = $mode === 'test' && in_array($readerId, $sandboxIds, true) ? 'sandbox_simulator_ready' : 'configured';
                $model->pairing_state = $mode === 'test' && in_array($readerId, $sandboxIds, true) ? 'paired' : ((string)$model->pairing_state ?: 'unknown');
                if (empty($model->reader_label)) $model->reader_label = $mode === 'test' ? 'Square Sandbox Terminal' : 'Square Terminal';
                $model->metadata = array_merge((array)$model->metadata, [
                    'last_configuration_tested_at' => now()->toIso8601String(),
                    'square_terminal_api' => [
                        'mode' => $mode,
                        'location_id' => $config['location_id'] ?? null,
                        'location_name' => $location['name'] ?? null,
                        'country' => $location['country'] ?? null,
                        'currency' => $location['currency'] ?? null,
                        'device_id' => $readerId,
                        'sandbox_simulator' => $mode === 'test' && in_array($readerId, $sandboxIds, true),
                    ],
                ]);
                $model->save();
                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'reader_id' => $readerId,
                    'mode' => $mode,
                    'location' => ['id' => $config['location_id'] ?? null, 'name' => $location['name'] ?? null, 'country' => $location['country'] ?? null, 'currency' => $location['currency'] ?? null],
                    'sandbox_simulator' => $mode === 'test' && in_array($readerId, $sandboxIds, true),
                    'network_probe_performed' => true,
                    'payment_sent' => false,
                    'message' => 'Square credentials/location are valid. No charge was created. Use a real Terminal payment attempt to validate checkout settlement.',
                    'status' => $this->buildStatusSnapshot('square', $readerId, (bool)$model->is_active),
                ]);
            } catch (\Throwable $e) {
                return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage()], 422);
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
