<?php

namespace App\Support\Payments;

class PaymentMethodNormalizer
{
    public const METHOD_CARD = 'card';
    public const METHOD_PAYPAL = 'paypal';
    public const METHOD_CASH = 'cash';
    public const METHOD_APPLE_PAY = 'apple_pay';
    public const METHOD_GOOGLE_PAY = 'google_pay';
    public const METHOD_COD = 'cod';

    public static function normalizeMethod(?string $raw): ?string
    {
        $value = strtolower(trim((string) $raw));

        return match ($value) {
            'stripe', 'card', 'credit_card', 'debit_card' => self::METHOD_CARD,
            'paypal', 'paypalexpress', 'paypal_express' => self::METHOD_PAYPAL,
            'cash', 'cod', 'cash_on_delivery' => self::METHOD_CASH,
            'apple_pay', 'applepay' => self::METHOD_APPLE_PAY,
            'google_pay', 'googlepay', 'gpay' => self::METHOD_GOOGLE_PAY,
            default => null,
        };
    }

    public static function methodFromPaymentCode(?string $paymentCode): ?string
    {
        $value = strtolower(trim((string) $paymentCode));

        return match ($value) {
            'stripe' => self::METHOD_CARD,
            'paypal', 'paypalexpress', 'paypal_express' => self::METHOD_PAYPAL,
            'cash', 'cod' => self::METHOD_CASH,
            'apple_pay', 'applepay' => self::METHOD_APPLE_PAY,
            'google_pay', 'googlepay' => self::METHOD_GOOGLE_PAY,
            'square' => self::METHOD_CARD,
            'sumup' => self::METHOD_CARD,
            'worldline' => self::METHOD_CARD,
            default => null,
        };
    }

    public static function normalizePublicCode(?string $paymentCode, ?string $method = null): ?string
    {
        $code = strtolower(trim((string) $paymentCode));
        $normalizedMethod = self::normalizeMethod($method) ?? self::methodFromPaymentCode($code);

        return match (true) {
            $normalizedMethod === self::METHOD_CARD && $code === 'stripe' => 'stripe',
            $normalizedMethod === self::METHOD_PAYPAL => 'paypal',
            $normalizedMethod === self::METHOD_APPLE_PAY => 'apple_pay',
            $normalizedMethod === self::METHOD_GOOGLE_PAY => 'google_pay',
            $normalizedMethod === self::METHOD_CASH => 'cash',
            default => null,
        };
    }
}
