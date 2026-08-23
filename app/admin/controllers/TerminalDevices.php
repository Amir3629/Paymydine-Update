<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Payments_model;
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
        $status = $this->buildStatusSnapshot($model->provider_code, (string)$model->reader_id, (bool)$model->is_active);

        $form->addFields([
            'terminal_setup_guide' => [
                'type' => 'section',
                'label' => 'SumUp Terminal Setup',
                'comment' => 'Simple setup: keep your SumUp merchant credentials, discover the readers already connected to that account, copy/select the Reader ID, test it, then mark the terminal active.',
            ],
            'status_snapshot' => [
                'label' => 'Readiness Snapshot',
                'type' => 'textarea',
                'span' => 'full',
                'attributes' => ['rows' => 4, 'readonly' => 'readonly'],
                'default' => "provider_ready: {$status['provider_ready']}\nterminal_ready: {$status['terminal_ready']}\ncard_online_ready: {$status['card_online_ready']}\ncard_present_ready: {$status['card_present_ready']}",
            ],
        ]);
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
        $providerCode = strtolower((string)$model->provider_code);
        $readerId = trim((string)$model->reader_id);

        if ($providerCode !== 'sumup') {
            return response()->json(['success' => false, 'error' => 'Only SumUp is supported currently.'], 422);
        }
        if ($readerId === '') {
            return response()->json(['success' => false, 'error' => 'Reader ID is required.'], 422);
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
        $config = strtolower((string)$providerCode) === 'sumup' ? $this->sumupConfig() : ['ready' => false];
        $providerReady = (bool)($config['ready'] ?? false);
        $terminalReady = $providerReady && trim($readerId) !== '';

        return [
            'provider_ready' => $providerReady ? 'yes' : 'no',
            'terminal_ready' => $terminalReady ? 'yes' : 'no',
            'card_online_ready' => $providerReady ? 'yes' : 'no',
            'card_present_ready' => ($terminalReady && $isActive) ? 'yes' : 'no',
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

        // Older tenants, including the current Mimoza schema, may still keep
        // SumUp credentials in pos_configs. Reuse them instead of making the
        // restaurant configure the same merchant twice.
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
