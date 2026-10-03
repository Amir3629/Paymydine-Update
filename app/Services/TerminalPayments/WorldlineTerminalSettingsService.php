<?php

namespace App\Services\TerminalPayments;

use Admin\Models\Payments_model;

final class WorldlineTerminalSettingsService
{
    public function read(): array
    {
        $model = Payments_model::query()->where('code', 'worldline')->first();
        if (!$model) {
            return [
                'provider_exists' => false,
                'terminal_merchant_id' => '',
                'terminal_api_base_url' => '',
                'terminal_api_token_present' => false,
                'terminal_id' => '',
                'terminal_label' => '',
                'terminal_environment' => 'test',
            ];
        }

        $data = method_exists($model, 'getConfigData')
            ? (array)$model->getConfigData()
            : (array)$model->data;

        return [
            'provider_exists' => true,
            'terminal_merchant_id' => trim((string)($data['terminal_merchant_id'] ?? '')),
            'terminal_api_base_url' => trim((string)($data['terminal_api_base_url'] ?? '')),
            'terminal_api_token_present' => trim((string)($data['terminal_api_token'] ?? '')) !== '',
            'terminal_id' => trim((string)($data['terminal_id'] ?? '')),
            'terminal_label' => trim((string)($data['terminal_label'] ?? '')),
            'terminal_environment' => strtolower(trim((string)($data['terminal_environment'] ?? 'test'))) === 'live' ? 'live' : 'test',
        ];
    }

    public function saveForTerminal(array $input, string $terminalId, string $terminalLabel = '', string $environment = 'test'): array
    {
        $model = Payments_model::query()->where('code', 'worldline')->first();
        if (!$model) {
            throw new \RuntimeException('Worldline payment provider record is missing. Configure Worldline in Payments first.');
        }

        $data = method_exists($model, 'getConfigData')
            ? (array)$model->getConfigData()
            : (array)$model->data;

        $merchantId = trim((string)($input['terminal_merchant_id'] ?? ''));
        $baseUrl = rtrim(trim((string)($input['terminal_api_base_url'] ?? '')), '/');
        $tokenInput = trim((string)($input['terminal_api_token'] ?? ''));
        $environmentInput = strtolower(trim((string)($input['terminal_environment'] ?? $environment)));
        $environmentInput = $environmentInput === 'live' ? 'live' : 'test';
        $terminalId = trim($terminalId);
        $terminalLabel = trim($terminalLabel);

        if ($baseUrl !== '' && stripos($baseUrl, 'https://') !== 0) {
            throw new \InvalidArgumentException('Worldline Terminal API base URL must use HTTPS.');
        }
        if ($terminalId === '') {
            throw new \InvalidArgumentException('Worldline Reader ID / UTID is required.');
        }

        if ($merchantId !== '') $data['terminal_merchant_id'] = $merchantId;
        else unset($data['terminal_merchant_id']);

        if ($baseUrl !== '') $data['terminal_api_base_url'] = $baseUrl;
        else unset($data['terminal_api_base_url']);

        if ($tokenInput === '__clear__') unset($data['terminal_api_token']);
        elseif ($tokenInput !== '') $data['terminal_api_token'] = $tokenInput;

        $data['terminal_id'] = $terminalId;
        $data['terminal_environment'] = $environmentInput;
        if ($terminalLabel !== '') $data['terminal_label'] = $terminalLabel;

        $model->data = $data;
        $model->save();

        return $this->read();
    }
}
