<?php

namespace App\Services\Payments;

/**
 * PMD_PAYMOB_OMAN_RUNTIME_GATE_R11
 *
 * Production guest offering remains locked until real Paymob Oman sandbox QA
 * proves checkout, callback, duplicate delivery, reconciliation and refunds.
 * A temporary TEST-only QA arm can be enabled explicitly from the server env.
 */
final class PaymobOmanRuntimeGate
{
    public const VERSION = '11.0.0';

    public static function guestReady(): bool
    {
        return false;
    }

    public static function sandboxQaEnabled(array $runtimeConfig = []): bool
    {
        $mode = strtolower(trim((string)($runtimeConfig['mode'] ?? $runtimeConfig['transaction_mode'] ?? 'test')));
        if ($mode !== 'test') return false;

        $raw = env('PMD_PAYMOB_OMAN_SANDBOX_QA', false);
        return filter_var($raw, FILTER_VALIDATE_BOOLEAN);
    }

    public static function checkoutAllowed(array $runtimeConfig = []): bool
    {
        return self::guestReady() || self::sandboxQaEnabled($runtimeConfig);
    }

    public static function state(array $runtimeConfig = []): array
    {
        return [
            'version' => self::VERSION,
            'guest_ready' => self::guestReady(),
            'sandbox_qa_enabled' => self::sandboxQaEnabled($runtimeConfig),
            'checkout_allowed' => self::checkoutAllowed($runtimeConfig),
            'terminal_ready' => false,
        ];
    }
}
