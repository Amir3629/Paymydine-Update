<?php

namespace App\Services\Turkey;

/**
 * Provider-neutral Türkiye payment architecture.
 *
 * Keeps five concepts separate:
 * 1) payment method   - what the guest chooses (card, FAST, cash)
 * 2) channel          - where/how it is accepted (terminal, SoftPOS, online)
 * 3) provider         - bank/PSP/payment institution
 * 4) device           - optional physical endpoint/manufacturer/model
 * 5) fiscal mode      - YN ÖKC or an approved GMÖEBYS/e-document route
 *
 * Tap vs chip/insert are card entry modes, NOT separate payment methods.
 */
final class TurkeyPaymentArchitectureService
{
    public function methods(): array
    {
        return [
            'card' => [
                'label' => 'Card',
                'currency' => 'TRY',
                'channels' => ['online_checkout', 'physical_terminal', 'softpos'],
                'entry_modes' => ['contactless', 'chip', 'magstripe', 'manual_online'],
                'brands' => ['TROY', 'Visa', 'Mastercard', 'American Express', 'UnionPay', 'JCB'],
            ],
            'fast_request' => [
                'label' => 'FAST Ödeme İste',
                'currency' => 'TRY',
                'channels' => ['bank_app_request_to_pay'],
                'same_phone' => true,
            ],
            'tr_qr_fast' => [
                'label' => 'TR Karekod / FAST QR',
                'currency' => 'TRY',
                'channels' => ['dynamic_payment_qr'],
                'same_phone' => false,
            ],
            'ispay' => [
                'label' => 'İş\'le Öde',
                'currency' => 'TRY',
                'channels' => ['provider_redirect_or_embedded'],
                'same_phone' => true,
                'optional' => true,
            ],
            'cash' => [
                'label' => 'Cash',
                'currency' => 'TRY',
                'channels' => ['cash'],
            ],
        ];
    }

    public function channels(): array
    {
        return [
            'online_checkout' => [
                'label' => 'Online card checkout',
                'device_required' => false,
                'example' => 'Guest pays on the PMD checkout page using a bank/PSP virtual POS flow.',
            ],
            'physical_terminal' => [
                'label' => 'Physical payment terminal / Yazarkasa POS',
                'device_required' => true,
                'example' => 'Guest taps or inserts a card on a physical terminal.',
            ],
            'softpos' => [
                'label' => 'SoftPOS / Tap on Phone',
                'device_required' => false,
                'example' => 'An NFC Android phone/tablet becomes the card-present acceptance device.',
                'turkey_warning' => 'A normal SoftPOS product is not automatically valid for an ÖKC-obligated restaurant. The selected provider/fiscal route must explicitly support the merchant topology.',
            ],
            'bank_app_request_to_pay' => [
                'label' => 'FAST Request-to-Pay',
                'device_required' => false,
                'example' => 'PMD sends a payment request; the guest approves it in their own banking app.',
            ],
            'dynamic_payment_qr' => [
                'label' => 'TR Karekod / payment QR',
                'device_required' => false,
                'example' => 'A payment-specific QR is shown on another screen/terminal and scanned in the guest banking app.',
            ],
            'provider_redirect_or_embedded' => [
                'label' => 'Provider app/redirect/embedded flow',
                'device_required' => false,
                'example' => 'Provider-controlled digital checkout such as İş\'le Öde.',
            ],
            'cash' => [
                'label' => 'Cash',
                'device_required' => false,
            ],
        ];
    }

    public function fiscalModes(): array
    {
        return [
            'yn_okc' => [
                'label' => 'YN ÖKC',
                'physical_device' => true,
                'description' => 'GİB-approved fiscal cash-register route. The payment terminal may be integrated in the YN ÖKC or connected to it.',
            ],
            'gmoebys' => [
                'label' => 'GMÖEBYS / secure mobile payment + e-document',
                'physical_device' => false,
                'description' => 'Approved mobile/e-document fiscal route. It can remove the need for a separate ÖKC device only when the merchant/provider setup is actually approved for this regime.',
            ],
        ];
    }

    public function isBankCapabilities(): array
    {
        return [
            'virtual_pos' => [
                'method' => 'card',
                'channel' => 'online_checkout',
                'status' => 'commercial_and_api_activation_required',
            ],
            'physical_pos_yazarkasa' => [
                'method' => 'card',
                'channel' => 'physical_terminal',
                'status' => 'merchant_and_device_activation_required',
            ],
            'softpos_posum_cepte' => [
                'method' => 'card',
                'channel' => 'softpos',
                'status' => 'restricted_for_merchants_not_subject_to_yazarkasa_okc_unless_an_approved_fiscal_route_is_supplied',
            ],
            'fast_request' => [
                'method' => 'fast_request',
                'channel' => 'bank_app_request_to_pay',
                'status' => 'api_subscription_and_merchant_activation_required',
            ],
            'tr_qr' => [
                'method' => 'tr_qr_fast',
                'channel' => 'dynamic_payment_qr',
                'status' => 'merchant_activation_required',
            ],
            'payment_facilitator' => [
                'method' => null,
                'channel' => null,
                'status' => 'api_subscription_required',
                'description' => 'Sub-merchant and physical/virtual POS terminal lifecycle/transaction-query capability. It is not itself a guest payment method.',
            ],
            'ispay' => [
                'method' => 'ispay',
                'channel' => 'provider_redirect_or_embedded',
                'status' => 'optional_api_subscription_required',
            ],
        ];
    }
}
