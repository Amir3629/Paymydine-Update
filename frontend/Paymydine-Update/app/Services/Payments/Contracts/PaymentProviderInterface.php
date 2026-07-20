<?php

namespace App\Services\Payments\Contracts;

interface PaymentProviderInterface
{
    public function createPayment(array $payload = []): array;
    public function healthCheck(): array;
}
