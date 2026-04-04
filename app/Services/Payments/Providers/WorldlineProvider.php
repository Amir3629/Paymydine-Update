<?php

namespace App\Services\Payments\Providers;

use App\Services\Payments\Contracts\PaymentProviderInterface;

class WorldlineProvider implements PaymentProviderInterface
{
    public function createPayment(array $payload = []): array
    {
        return [
            'success' => false,
            'provider' => 'worldline',
            'message' => 'Phase 1 stub only. Existing Worldline flow remains active.',
            'payload' => $payload,
        ];
    }

    public function healthCheck(): array
    {
        return [
            'provider' => 'worldline',
            'ok' => true,
            'message' => 'Phase 1 stub ready',
        ];
    }
}
