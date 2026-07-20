<?php

namespace App\Services\TerminalPayments;

interface TerminalPaymentProviderInterface
{
    public function code(): string;
    public function validateConfiguration(array $config): array;
    public function createPayment(array $attempt, array $config): array;
    public function checkStatus(array $attempt, array $config): array;
}
