<?php

namespace App\Services\TerminalPayments;

class WorldlineTerminalProvider extends NullTerminalProvider
{
    public function __construct() { parent::__construct('worldline'); }
    public function validateConfiguration(array $config): array
    {
        foreach (['api_endpoint', 'merchant_id', 'api_key_id', 'terminal_id'] as $field) {
            if (empty($config[$field])) return ['ok' => false, 'message' => "Missing Worldline terminal field: {$field}"];
        }
        return ['ok' => true, 'message' => 'Worldline terminal fields are present. Live terminal charge API mapping still requires provider-certified request/response documentation.'];
    }
}
