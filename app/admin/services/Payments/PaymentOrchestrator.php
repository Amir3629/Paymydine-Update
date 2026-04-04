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
    ) {}

    public function createSession(Orders_model $order, Payments_model $payment, Request $request): JsonResponse
    {
        return match ($payment->code) {
            'stripe' => $this->stripe->createSession($order, $payment, $request),
            'paypal' => $this->paypal->createSession($order, $payment, $request),
            'square' => $this->square->createSession($order, $payment, $request),
            default => throw new InvalidArgumentException("Unsupported payment_code: {$payment->code}"),
        };
    }
}
