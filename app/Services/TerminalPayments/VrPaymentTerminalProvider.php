<?php

namespace App\Services\TerminalPayments;

class VrPaymentTerminalProvider extends NullTerminalProvider
{
    public function __construct() { parent::__construct('vr_payment'); }
    public function validateConfiguration(array $config): array
    {
        foreach (['api_endpoint', 'merchant_id', 'terminal_id'] as $field) {
            if (empty($config[$field])) return ['ok' => false, 'message' => "Missing VR Payment terminal field: {$field}"];
        }
        return ['ok' => true, 'message' => 'VR Payment terminal fields are present. Live terminal charge API mapping still requires VR Payment credentials and certified API documentation.'];
    }
}
