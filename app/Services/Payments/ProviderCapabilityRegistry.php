<?php

namespace App\Services\Payments;

final class ProviderCapabilityRegistry
{
    public const CAPABILITY_ONLINE_PAYMENTS = 'online_payments';
    public const CAPABILITY_TERMINAL_PAYMENTS = 'terminal_payments';
    public const CAPABILITY_REFUNDS = 'refunds';
    public const CAPABILITY_PARTIAL_REFUNDS = 'partial_refunds';
    public const CAPABILITY_PAYMENT_LINKS = 'payment_links';
    public const CAPABILITY_SAVED_PAYMENT_METHODS = 'saved_payment_methods';
    public const CAPABILITY_WEBHOOKS = 'webhooks';
    public const CAPABILITY_OAUTH = 'oauth';

    public const METHOD_CARD = 'card';
    public const METHOD_APPLE_PAY = 'apple_pay';
    public const METHOD_GOOGLE_PAY = 'google_pay';
    public const METHOD_OMANNET = 'omannet';
    public const METHOD_WERO = 'wero';
    public const METHOD_PAYPAL = 'paypal';
    public const METHOD_KLARNA = 'klarna';
    public const METHOD_SEPA_DEBIT = 'sepa_debit';
    public const METHOD_CASH_APP = 'cash_app';

    /**
     * Catalogue capability and implemented runtime capability are deliberately
     * separate. A method can only be offered when both this implemented matrix
     * and the tenant/provider runtime readiness checks pass.
     */
    public function definitions(): array
    {
        return [
            'sumup' => [
                'label' => 'SumUp',
                'capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_REFUNDS,
                    self::CAPABILITY_PAYMENT_LINKS,
                    self::CAPABILITY_WEBHOOKS,
                    self::CAPABILITY_OAUTH,
                ],
                'payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                ],
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                ],
            ],
            'stripe' => [
                'label' => 'Stripe',
                'capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_REFUNDS,
                    self::CAPABILITY_PARTIAL_REFUNDS,
                    self::CAPABILITY_PAYMENT_LINKS,
                    self::CAPABILITY_SAVED_PAYMENT_METHODS,
                    self::CAPABILITY_WEBHOOKS,
                    self::CAPABILITY_OAUTH,
                ],
                'payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                    self::METHOD_WERO,
                    self::METHOD_KLARNA,
                    self::METHOD_SEPA_DEBIT,
                ],
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                ],
            ],
            'square' => [
                'label' => 'Square',
                'capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_REFUNDS,
                    self::CAPABILITY_PAYMENT_LINKS,
                    self::CAPABILITY_SAVED_PAYMENT_METHODS,
                    self::CAPABILITY_WEBHOOKS,
                    self::CAPABILITY_OAUTH,
                ],
                'payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                    self::METHOD_CASH_APP,
                ],
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_PAYMENT_LINKS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_CARD,
                ],
            ],
            'vr_payment' => [
                'label' => 'VR Payment',
                'capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_REFUNDS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                    self::METHOD_WERO,
                    self::METHOD_PAYPAL,
                ],
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                    self::METHOD_WERO,
                    self::METHOD_PAYPAL,
                ],
            ],
            'paymob' => [
                'label' => 'Paymob',
                'capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_REFUNDS,
                    self::CAPABILITY_PAYMENT_LINKS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_OMANNET,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                ],
                'implemented_capabilities' => [],
                'implemented_payment_methods' => [],
            ],
            'worldline' => [
                'label' => 'Worldline',
                'capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_REFUNDS,
                    self::CAPABILITY_PARTIAL_REFUNDS,
                    self::CAPABILITY_SAVED_PAYMENT_METHODS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                    self::METHOD_WERO,
                    self::METHOD_PAYPAL,
                    self::METHOD_KLARNA,
                    self::METHOD_SEPA_DEBIT,
                ],
                // PMD has concrete provider-hosted Connect routes for these
                // methods. Account/product entitlement is still checked by
                // Worldline when MyCheckout is created; unavailable products
                // fail closed and are never treated as paid.
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                    self::METHOD_WERO,
                    self::METHOD_PAYPAL,
                ],
            ],
            'paypal' => [
                'label' => 'PayPal',
                'capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_REFUNDS,
                    self::CAPABILITY_WEBHOOKS,
                    self::CAPABILITY_OAUTH,
                ],
                'payment_methods' => [
                    self::METHOD_PAYPAL,
                ],
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_PAYPAL,
                ],
            ],
        ];
    }

    public function provider(string $providerCode): array
    {
        $providerCode = strtolower(trim($providerCode));

        return $this->definitions()[$providerCode] ?? [
            'label' => $providerCode,
            'capabilities' => [],
            'payment_methods' => [],
            'implemented_capabilities' => [],
            'implemented_payment_methods' => [],
        ];
    }

    public function supportsCapability(string $providerCode, string $capability): bool
    {
        return in_array($capability, $this->provider($providerCode)['capabilities'] ?? [], true);
    }

    public function supportsPaymentMethod(string $providerCode, string $method): bool
    {
        return in_array($method, $this->provider($providerCode)['payment_methods'] ?? [], true);
    }

    public function implementsCapability(string $providerCode, string $capability): bool
    {
        return in_array($capability, $this->provider($providerCode)['implemented_capabilities'] ?? [], true);
    }

    public function implementsPaymentMethod(string $providerCode, string $method): bool
    {
        return in_array($method, $this->provider($providerCode)['implemented_payment_methods'] ?? [], true);
    }
}
