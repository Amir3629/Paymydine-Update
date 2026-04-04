<?php

namespace App\Services\Payments\Providers;

use App\Services\Payments\Contracts\PaymentProviderInterface;

class PaypalProvider implements PaymentProviderInterface
{
    public function createPayment(array $payload = []): array
    {
        return [
            'success' => false,
            'provider' => 'paypal',
            'message' => 'Phase 1 stub only. Existing PayPal flow remains active.',
            'payload' => $payload,
        ];
    }

    public function healthCheck(): array
    {
        return [
            'provider' => 'paypal',
            'ok' => true,
            'message' => 'Phase 1 stub ready',
        ];
    }
}
