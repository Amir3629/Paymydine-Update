<?php

namespace App\Services\TerminalPayments;

use App\Services\Payments\PaymentMarketRegistry;

/**
 * PMD_PAYMOB_OMAN_TERMINAL_CONTRACT_R1
 *
 * Explicit future adapter for Paymob Oman in-person payments.
 *
 * Public Paymob material confirms Tap to Pay through the Paymob App, but it does
 * not currently publish the Cloud Terminal/ECR contract PMD needs to send a charge
 * to a specific terminal. This adapter therefore fails closed by design.
 *
 * Do NOT route TerminalPaymentService to this class until Paymob Oman supplies the
 * private/certified terminal API contract and these methods are implemented.
 */
final class PaymobOmanTerminalProvider implements TerminalPaymentProviderInterface
{
    public function code(): string
    {
        return 'paymob';
    }

    public function validateConfiguration(array $config): array
    {
        $state = (new PaymentMarketRegistry())->terminalState('OM');

        return [
            'ok' => false,
            'provider' => 'paymob',
            'country_code' => 'OM',
            'status' => $state['status'] ?? 'waiting_for_paymob_oman_ecr_terminal_contract',
            'message' => 'Paymob Oman Tap to Pay exists as a provider product, but PMD remote terminal charging is disabled until Paymob supplies its POS/ECR or Cloud Terminal API contract.',
            'required_from_provider' => $state['required_from_provider'] ?? [],
        ];
    }

    public function createPayment(array $attempt, array $config): array
    {
        return [
            'ok' => false,
            'status' => 'failed',
            'provider' => 'paymob',
            'message' => 'Paymob Oman terminal payment was not sent. No certified remote terminal API is configured; fake terminal success is disabled.',
        ];
    }

    public function checkStatus(array $attempt, array $config): array
    {
        return [
            'ok' => false,
            'status' => (string)($attempt['status'] ?? 'pending'),
            'provider' => 'paymob',
            'message' => 'Paymob Oman terminal status cannot be queried until the provider supplies the POS/ECR terminal status contract.',
        ];
    }
}
