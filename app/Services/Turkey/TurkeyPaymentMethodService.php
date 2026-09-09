<?php

namespace App\Services\Turkey;

/**
 * Checkout-facing Türkiye payment rails.
 *
 * Important separation:
 * - Card is ONE payment method.
 * - Tap/contactless vs chip/insert are card entry modes.
 * - Physical terminal, SoftPOS and online checkout are acceptance channels.
 * - Bank/PSP is the provider.
 * - YN ÖKC / GMÖEBYS is the fiscal route.
 */
final class TurkeyPaymentMethodService
{
    public function __construct(
        private ?TurkeyTenantContext $context = null,
        private ?TurkeyIntegrationConfigurationService $integrations = null,
        private ?TurkeyPaymentArchitectureService $architecture = null,
        private ?TurkeyTerminalRegistryService $terminals = null
    ) {
        $this->context = $context ?: new TurkeyTenantContext();
        $this->integrations = $integrations ?: new TurkeyIntegrationConfigurationService();
        $this->architecture = $architecture ?: new TurkeyPaymentArchitectureService();
        $this->terminals = $terminals ?: new TurkeyTerminalRegistryService();
    }

    public function methods(?int $locationId = null): array
    {
        $this->context->requireTurkey($locationId);

        $acquirer = $this->integrations->state('acquirer', $locationId);
        $sanalPos = $this->integrations->state('isbank_sanal_pos', $locationId);
        $trQr = $this->integrations->state('tr_qr_fast', $locationId);
        $request = $this->integrations->state('fast_request', $locationId);
        $ispay = $this->integrations->state('ispay', $locationId);
        $catalogue = $this->architecture->methods();

        $physicalOrSoftPosReady = false;
        try {
            foreach ($this->terminals->all($locationId) as $terminal) {
                if (!empty($terminal['is_active']) && in_array((string)($terminal['acceptance_channel'] ?? ''), ['physical_terminal', 'softpos'], true)) {
                    $physicalOrSoftPosReady = true;
                    break;
                }
            }
        } catch (\Throwable) {
        }
        $onlineCardReady = (bool)($sanalPos['production_ready'] ?? false);
        $cardChannelReady = $physicalOrSoftPosReady || $onlineCardReady;

        return [
            'card' => array_merge($catalogue['card'], [
                'code' => 'card',
                'flow' => 'provider_card',
                'same_phone' => true,
                'requires_second_scan' => false,
                'available' => (bool)($acquirer['production_ready'] ?? false) && $cardChannelReady,
                'integration' => 'acquirer',
                'channel_ready' => $cardChannelReady,
                'online_channel_ready' => $onlineCardReady,
                'terminal_or_softpos_ready' => $physicalOrSoftPosReady,
                'guest_experience' => 'One Card method. The selected provider may accept it online, on a physical terminal, or through an approved SoftPOS channel. Tap vs insert is handled by the card-acceptance endpoint, not exposed as separate PMD methods.',
            ]),
            'fast_request' => array_merge($catalogue['fast_request'], [
                'code' => 'fast_request',
                'flow' => 'request_to_pay',
                'requires_second_scan' => false,
                'available' => (bool)($request['production_ready'] ?? false),
                'integration' => 'fast_request',
                'guest_experience' => 'Guest chooses FAST → PMD sends a request through the configured provider → the request appears in the guest bank app → guest approves → PMD receives provider confirmation.',
            ]),
            'tr_qr_fast' => array_merge($catalogue['tr_qr_fast'], [
                'code' => 'tr_qr_fast',
                'flow' => 'dynamic_payment_qr',
                'requires_second_scan' => true,
                'available' => (bool)($trQr['production_ready'] ?? false),
                'integration' => 'tr_qr_fast',
                'guest_experience' => 'PMD creates a payment-specific TR Karekod via the selected financial provider. The guest scans it in a participating bank/financial app.',
            ]),
            'ispay' => array_merge($catalogue['ispay'], [
                'code' => 'ispay',
                'flow' => 'provider_redirect_or_embedded',
                'requires_second_scan' => false,
                'available' => (bool)($ispay['production_ready'] ?? false),
                'integration' => 'ispay',
                'guest_experience' => 'Optional İş Bankası digital checkout. PMD offers it only after the merchant has the matching İşPay API subscriptions/activation.',
            ]),
            'cash' => array_merge($catalogue['cash'], [
                'code' => 'cash',
                'flow' => 'cash_request',
                'same_phone' => true,
                'requires_second_scan' => false,
                'available' => true,
                'integration' => null,
            ]),
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
