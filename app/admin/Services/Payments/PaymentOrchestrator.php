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
        Payments_model $paymentMethod,
        Request $request
    ): JsonResponse {
        $methodCode = strtolower(trim((string)$paymentMethod->code));
        $providerCode = $this->resolveProviderCode($paymentMethod);
        $provider = $this->resolveProviderRecord($providerCode, $paymentMethod);

        // Keep the business payment method available to provider drivers even
        // though the provider record is what owns credentials/configuration.
        $request->attributes->set('pmd_payment_method_code', $methodCode);
        $request->attributes->set('pmd_payment_provider_code', $providerCode);

        return match ($providerCode) {
            'stripe' => $this->stripe->createSession($order, $provider, $request),
            'paypal' => $this->paypal->createSession($order, $provider, $request),
            'square' => $this->square->createSession($order, $provider, $request),
            default => throw new InvalidArgumentException(
                "Payment method '{$methodCode}' is assigned to provider '{$providerCode}', but that provider does not have an online checkout driver yet."
            ),
        };
    }

    protected function resolveProviderCode(Payments_model $paymentMethod): string
    {
        $methodCode = strtolower(trim((string)$paymentMethod->code));
        $providerCode = strtolower(trim((string)($paymentMethod->provider_code ?? '')));

        if ($providerCode === '') {
            $config = method_exists($paymentMethod, 'getConfigData')
                ? (array)$paymentMethod->getConfigData()
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

    protected function resolveProviderRecord(
        string $providerCode,
        Payments_model $paymentMethod
    ): Payments_model {
        if (strtolower((string)$paymentMethod->code) === $providerCode) {
            $paymentMethod->applyGatewayClass();
            return $paymentMethod;
        }

        $provider = Payments_model::query()
            ->where('code', $providerCode)
            ->first();

        if (!$provider) {
            throw new InvalidArgumentException(
                "Provider '{$providerCode}' is assigned but its connection record does not exist."
            );
        }

        if ((int)$provider->status !== 1) {
            throw new InvalidArgumentException(
                "Provider '{$providerCode}' is assigned but disabled for this restaurant."
            );
        }

        $provider->applyGatewayClass();

        return $provider;
    }
}
