<?php

namespace App\Services\Payments\Providers;

use App\Services\Payments\Contracts\PaymentProviderInterface;

class StripeProvider implements PaymentProviderInterface
{
    public function createPayment(array $payload = []): array
    {
        return [
            'success' => false,
            'provider' => 'stripe',
            'message' => 'Phase 1 stub only. Existing Stripe flow remains active.',
            'payload' => $payload,
        ];
    }

    public function healthCheck(): array
    {
        return [
            'provider' => 'stripe',
            'ok' => true,
            'message' => 'Phase 1 stub ready',
        ];
    }
}
