<?php

namespace App\Services\Turkey;

/**
 * Checkout-facing description of Türkiye payment rails.
 *
 * PMD's table QR remains ONLY the guest/menu entry QR. Payment happens later at
 * checkout. FAST Request-to-Pay is the preferred same-phone banking flow; a
 * dynamic TR Karekod is a separate payment QR and is best when another screen
 * is available, unless the selected provider exposes an app/deep-link flow.
 */
final class TurkeyPaymentMethodService
{
    public function __construct(
        private ?TurkeyTenantContext $context = null,
        private ?TurkeyIntegrationConfigurationService $integrations = null
    ) {
        $this->context = $context ?: new TurkeyTenantContext();
        $this->integrations = $integrations ?: new TurkeyIntegrationConfigurationService();
    }

    public function methods(?int $locationId = null): array
    {
        $this->context->requireTurkey($locationId);

        $acquirer = $this->integrations->state('acquirer', $locationId);
        $trQr = $this->integrations->state('tr_qr_fast', $locationId);
        $request = $this->integrations->state('fast_request', $locationId);

        return [
            'card' => [
                'code' => 'card',
                'label' => 'Card',
                'flow' => 'provider_checkout',
                'same_phone' => true,
                'requires_second_scan' => false,
                'available' => (bool)($acquirer['production_ready'] ?? false),
                'integration' => 'acquirer',
            ],
            'fast_request' => [
                'code' => 'fast_request',
                'label' => 'FAST Ödeme İste',
                'flow' => 'request_to_pay',
                'same_phone' => true,
                'requires_second_scan' => false,
                'available' => (bool)($request['production_ready'] ?? false),
                'integration' => 'fast_request',
                'guest_experience' => 'Tap Pay → payment request reaches the customer bank/financial app → customer approves → PMD receives provider confirmation.',
            ],
            'tr_qr_fast' => [
                'code' => 'tr_qr_fast',
                'label' => 'FAST / TR Karekod',
                'flow' => 'dynamic_payment_qr',
                'same_phone' => false,
                'requires_second_scan' => true,
                'available' => (bool)($trQr['production_ready'] ?? false),
                'integration' => 'tr_qr_fast',
                'guest_experience' => 'PMD creates a payment-specific QR via the selected financial provider. The customer scans it in a participating bank/financial app.',
            ],
            'cash' => [
                'code' => 'cash',
                'label' => 'Cash',
                'flow' => 'cash_request',
                'same_phone' => true,
                'requires_second_scan' => false,
                'available' => true,
                'integration' => null,
            ],
        ];
    }

    public function offerable(?int $locationId = null): array
    {
        return array_values(array_filter(
            $this->methods($locationId),
            static fn (array $method): bool => (bool)$method['available']
        ));
    }
}
