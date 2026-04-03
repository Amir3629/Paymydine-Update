<?php

namespace App\Services\Payments\Providers;

use App\Services\Payments\Contracts\PaymentProviderInterface;

class SumUpProvider implements PaymentProviderInterface
{
    public function createPayment(array $payload = []): array
    {
        return [
            'success' => false,
            'provider' => 'sumup',
            'message' => 'Phase 1 stub only. Existing SumUp flow remains active.',
            'payload' => $payload,
        ];
    }

    public function healthCheck(): array
    {
        return [
            'provider' => 'sumup',
            'ok' => true,
            'message' => 'Phase 1 stub ready',
        ];
    }
}
