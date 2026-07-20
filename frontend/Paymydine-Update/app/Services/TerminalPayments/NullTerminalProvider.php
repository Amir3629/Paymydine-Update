<?php

namespace App\Services\TerminalPayments;

class NullTerminalProvider implements TerminalPaymentProviderInterface
{
    public function __construct(private string $providerCode = 'manual') {}
    public function code(): string { return $this->providerCode; }
    public function validateConfiguration(array $config): array
    {
        return ['ok' => false, 'message' => 'Terminal provider is not fully configured. Add provider credentials/API documentation before sending terminal charges.'];
    }
    public function createPayment(array $attempt, array $config): array
    {
        return ['ok' => false, 'status' => 'failed', 'message' => 'No terminal API is configured; fake payment success is disabled.'];
    }
    public function checkStatus(array $attempt, array $config): array
    {
        return ['ok' => false, 'status' => $attempt['status'] ?? 'pending', 'message' => 'No provider status endpoint is configured.'];
    }
}
