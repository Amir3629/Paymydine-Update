<?php

namespace Admin\Services\Payments;

use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

class PaymentOrchestrator
{
    public function __construct(
        protected StripeDriver $stripe,
        protected PaypalDriver $paypal,
        protected SquareDriver $square,
    ) {
    }

    public function createSession(
        Orders_model $order,
        Payments_model $payment,
        Request $request
    ): JsonResponse {
        $methodCode = strtolower(trim((string)$payment->code));
        $providerCode = $this->resolveProviderCode($payment);

        return match ($providerCode) {
            'stripe' => $this->stripe->createSession($order, $payment, $request),
            'paypal' => $this->paypal->createSession($order, $payment, $request),
            'square' => $this->square->createSession($order, $payment, $request),
            default => throw new InvalidArgumentException(
                "Payment method '{$methodCode}' is assigned to provider '{$providerCode}', but that provider does not have an online checkout driver yet."
            ),
        };
    }

    protected function resolveProviderCode(Payments_model $payment): string
    {
        $methodCode = strtolower(trim((string)$payment->code));
        $providerCode = strtolower(trim((string)($payment->provider_code ?? '')));

        if ($providerCode === '') {
            $config = method_exists($payment, 'getConfigData')
                ? (array)$payment->getConfigData()
                : [];

            $providerCode = strtolower(trim((string)($config['provider_code'] ?? '')));
        }

        // Backward compatibility: older callers used provider codes directly
        // as payment_code (stripe/paypal/square). Keep those flows working.
        if ($providerCode === '' && in_array($methodCode, ['stripe', 'paypal', 'square'], true)) {
            $providerCode = $methodCode;
        }

        if ($providerCode === '') {
            throw new InvalidArgumentException(
                "Payment method '{$methodCode}' has no provider assigned."
            );
        }

        $supported = Payments_model::supportedProvidersForMethod($methodCode);
        if (!empty($supported) && !in_array($providerCode, $supported, true)) {
            throw new InvalidArgumentException(
                "Provider '{$providerCode}' is not compatible with payment method '{$methodCode}'."
            );
        }

        return $providerCode;
    }
}
