<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Payments_model;
use Illuminate\Support\Facades\Http;

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
        AdminMenu::setContext('terminal_devices', 'system');
    }

    public function formExtendFields($form)
    {
        $model = $form->model;
        $status = $this->buildStatusSnapshot($model->provider_code, (string)$model->reader_id, (bool)$model->is_active);

        $form->addFields([
            'terminal_setup_guide' => [
                'type' => 'section',
                'label' => 'Terminal Setup Guide',
                'comment' => 'Use this page for card-present reader setup. Online checkout credentials stay in Payments > Providers > SumUp. Recommended flow: 1) Configure SumUp provider, 2) Discover readers, 3) Select reader_id, 4) Test terminal connection, 5) Mark active reader.',
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
        $provider = Payments_model::query()->where('code', 'sumup')->first();
        $data = is_array(optional($provider)->data) ? (array)$provider->data : [];
        $token = trim((string)($data['access_token'] ?? ''));
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');

        if (!$provider || !$provider->status || $token === '') {
            return response()->json([
                'success' => false,
                'error' => 'SumUp provider is not ready. Configure and enable Payments > Providers > SumUp first.',
            ], 422);
        }

        $merchantCode = trim((string)($data['id_application'] ?? ''));
        if ($merchantCode === '') {
            $merchantResponse = Http::withToken($token)->acceptJson()->get($baseUrl.'/v0.1/me');
            $merchantCode = (string)(($merchantResponse->json()['merchant_code'] ?? '') ?: '');
        }

        $resp = Http::withToken($token)
            ->acceptJson()
            ->get($baseUrl.'/v0.1/me/readers', array_filter(['merchant_code' => $merchantCode ?: null]));

        if (!$resp->ok()) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to list SumUp readers',
                'details' => $resp->json(),
            ], 502);
        }

        $body = (array)$resp->json();
        $items = (array)($body['items'] ?? $body['readers'] ?? $body);

        return response()->json([
            'success' => true,
            'provider' => 'sumup',
            'merchant_code' => $merchantCode ?: null,
            'readers' => array_values($items),
        ]);
    }

    public function onTestTerminalConnection()
    {
        $model = $this->formGetModel();
        $providerCode = strtolower((string)$model->provider_code);
        $readerId = trim((string)$model->reader_id);

        if ($providerCode !== 'sumup') {
            return response()->json(['success' => false, 'error' => 'Only SumUp is supported currently'], 422);
        }

        if ($readerId === '') {
            return response()->json(['success' => false, 'error' => 'Reader ID is required for terminal readiness test'], 422);
        }

        $provider = Payments_model::query()->where('code', 'sumup')->first();
        $data = is_array(optional($provider)->data) ? (array)$provider->data : [];
        $token = trim((string)($data['access_token'] ?? ''));
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');

        if (!$provider || !$provider->status || $token === '') {
            return response()->json(['success' => false, 'error' => 'SumUp provider is not ready'], 422);
        }

        $resp = Http::withToken($token)
            ->acceptJson()
            ->get($baseUrl.'/v0.1/me/readers');

        if (!$resp->ok()) {
            return response()->json(['success' => false, 'error' => 'Failed to contact SumUp readers endpoint', 'details' => $resp->json()], 502);
        }

        $items = (array)(($resp->json()['items'] ?? $resp->json()['readers'] ?? $resp->json()) ?: []);
        $matched = collect($items)->first(function ($item) use ($readerId) {
            return strtolower((string)($item['id'] ?? $item['reader_id'] ?? '')) === strtolower($readerId);
        });

        $status = $this->buildStatusSnapshot('sumup', $readerId, (bool)$model->is_active);

        return response()->json([
            'success' => (bool)$matched,
            'provider' => 'sumup',
            'reader_id' => $readerId,
            'reader_found' => (bool)$matched,
            'reader' => $matched ?: null,
            'status' => $status,
        ], $matched ? 200 : 404);
    }

    protected function buildStatusSnapshot(?string $providerCode, string $readerId, bool $isActive): array
    {
        $providerReady = false;

        if (strtolower((string)$providerCode) === 'sumup') {
            $provider = Payments_model::query()->where('code', 'sumup')->first();
            $data = is_array(optional($provider)->data) ? (array)$provider->data : [];
            $providerReady = (bool)optional($provider)->status && trim((string)($data['access_token'] ?? '')) !== '';
        }

        $terminalReady = $providerReady && trim($readerId) !== '';

        return [
            'provider_ready' => $providerReady ? 'yes' : 'no',
            'terminal_ready' => $terminalReady ? 'yes' : 'no',
            'card_online_ready' => $providerReady ? 'yes' : 'no',
            'card_present_ready' => ($terminalReady && $isActive) ? 'yes' : 'no',
        ];
    }
}
