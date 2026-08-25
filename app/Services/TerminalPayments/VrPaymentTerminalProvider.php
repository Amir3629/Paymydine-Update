<?php

namespace App\Services\TerminalPayments;

use App\Services\Payments\VrPaymentApiClient;

/**
 * PMD_VR_PAYMENT_TERMINAL_R1
 *
 * Real VR Payment Cloud Till implementation using API v2.0.
 * A transaction is created first, then handed to a concrete VR terminal through
 * /payment/terminals/{id}/perform-transaction. HTTP 543 is treated as the
 * documented long-poll continuation state, never as payment success.
 */
class VrPaymentTerminalProvider implements TerminalPaymentProviderInterface
{
    public function code(): string
    {
        return 'vr_payment';
    }

    public function validateConfiguration(array $config): array
    {
        $client = new VrPaymentApiClient($config);
        $validation = $client->validateConfiguration();
        if (!($validation['ok'] ?? false)) return $validation;

        $terminalId = trim((string)($config['terminal_id'] ?? $config['provider_terminal_id'] ?? ''));
        if ($terminalId === '' || !ctype_digit($terminalId) || (int)$terminalId <= 0) {
            return ['ok' => false, 'message' => 'Select a synced VR Payment terminal before charging.'];
        }

        return ['ok' => true, 'message' => 'VR Payment Cloud Till configuration is ready.'];
    }

    public function createPayment(array $attempt, array $config): array
    {
        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return ['ok' => false, 'status' => 'failed', 'message' => $validation['message'] ?? 'VR Payment terminal configuration is invalid.'];
        }

        $amount = round((float)($attempt['amount'] ?? 0), 2);
        if ($amount <= 0) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'VR Payment terminal amount must be greater than zero.'];
        }

        $currency = strtoupper(trim((string)($attempt['currency'] ?? $config['currency'] ?? 'EUR'))) ?: 'EUR';
        $terminalId = (int)($config['terminal_id'] ?? $config['provider_terminal_id'] ?? 0);
        $attemptId = (int)($attempt['id'] ?? 0);
        $orderId = (int)($attempt['order_id'] ?? 0);
        $merchantReference = substr('PMD-POS-'.$orderId.'-'.$attemptId, 0, 100);
        $language = trim((string)($config['language'] ?? 'de-DE')) ?: 'de-DE';

        $transactionPayload = [
            'currency' => $currency,
            'customersPresence' => 'PHYSICAL_PRESENT',
            'language' => str_replace('_', '-', $language),
            'lineItems' => [[
                'amountIncludingTax' => number_format($amount, 2, '.', ''),
                'name' => 'PayMyDine order #'.$orderId,
                'quantity' => '1',
                'shippingRequired' => false,
                'sku' => 'pmd-pos-order',
                'type' => 'PRODUCT',
                'uniqueId' => $merchantReference,
            ]],
            'merchantReference' => $merchantReference,
            'autoConfirmationEnabled' => true,
            'metaData' => [
                'pmd_surface' => 'waiter_pos',
                'pmd_attempt_id' => (string)$attemptId,
                'pmd_order_id' => (string)$orderId,
                'pmd_terminal_id' => (string)$terminalId,
            ],
        ];

        $client = new VrPaymentApiClient($config);
        $created = $client->createTransaction($transactionPayload);
        if (!($created['ok'] ?? false) || !is_array($created['data'] ?? null)) {
            return [
                'ok' => false,
                'status' => 'failed',
                'message' => $created['message'] ?? 'VR Payment transaction creation failed.',
                'http_status' => $created['status'] ?? null,
            ];
        }

        $transaction = (array)$created['data'];
        $transactionId = (int)($transaction['id'] ?? 0);
        if ($transactionId <= 0) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'VR Payment did not return a transaction ID.'];
        }

        $performed = $client->performTerminalTransaction($terminalId, $transactionId, $language);
        if (!($performed['ok'] ?? false)) {
            // VR Payment documents HTTP 543 as a long-poll timeout. The same
            // transaction must be resumed/read; it is NOT a failed payment.
            if ((int)($performed['status'] ?? 0) === 543) {
                return [
                    'ok' => true,
                    'status' => 'sent_to_terminal',
                    'provider_reference' => (string)$transactionId,
                    'transaction_id' => (string)$transactionId,
                    'merchant_reference' => $merchantReference,
                    'message' => 'VR terminal is still processing the payment.',
                    'provider_http_status' => 543,
                ];
            }

            return [
                'ok' => false,
                'status' => 'failed',
                'provider_reference' => (string)$transactionId,
                'transaction_id' => (string)$transactionId,
                'message' => $performed['message'] ?? 'VR Payment terminal request failed.',
                'http_status' => $performed['status'] ?? null,
            ];
        }

        $resolved = is_array($performed['data'] ?? null) ? (array)$performed['data'] : $transaction;
        $status = $client->normalizeTransactionStatus($resolved);

        return [
            'ok' => true,
            'status' => $status === 'paid' ? 'paid' : ($status === 'failed' ? 'failed' : ($status === 'cancelled' ? 'cancelled' : 'sent_to_terminal')),
            'provider_reference' => (string)$transactionId,
            'transaction_id' => (string)$transactionId,
            'merchant_reference' => $merchantReference,
            'terminal_id' => $terminalId,
            'vr_state' => $resolved['state'] ?? null,
            'message' => $status === 'paid'
                ? 'VR Payment terminal approved the payment.'
                : 'VR Payment terminal transaction state: '.strtolower((string)($resolved['state'] ?? 'processing')),
        ];
    }

    public function checkStatus(array $attempt, array $config): array
    {
        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return ['ok' => false, 'status' => (string)($attempt['status'] ?? 'pending'), 'message' => $validation['message'] ?? 'VR Payment terminal configuration is invalid.'];
        }

        $reference = trim((string)($attempt['provider_reference'] ?? ''));
        if ($reference === '' || !ctype_digit($reference)) {
            return ['ok' => false, 'status' => (string)($attempt['status'] ?? 'pending'), 'message' => 'VR Payment transaction reference is missing.'];
        }

        $client = new VrPaymentApiClient($config);
        $response = $client->readTransaction((int)$reference);
        if (!($response['ok'] ?? false) || !is_array($response['data'] ?? null)) {
            return [
                'ok' => false,
                'status' => (string)($attempt['status'] ?? 'pending'),
                'message' => $response['message'] ?? 'Unable to read VR Payment terminal transaction.',
                'http_status' => $response['status'] ?? null,
            ];
        }

        $transaction = (array)$response['data'];
        $status = $client->normalizeTransactionStatus($transaction);
        $mapped = match ($status) {
            'paid' => 'paid',
            'failed' => 'failed',
            'cancelled' => 'cancelled',
            default => 'sent_to_terminal',
        };

        return [
            'ok' => true,
            'status' => $mapped,
            'provider_reference' => $reference,
            'transaction_id' => $reference,
            'vr_state' => $transaction['state'] ?? null,
            'authorization_amount' => $transaction['authorizationAmount'] ?? null,
            'currency' => $transaction['currency'] ?? null,
            'message' => $mapped === 'paid'
                ? 'VR Payment terminal payment approved.'
                : 'VR Payment terminal transaction state: '.strtolower((string)($transaction['state'] ?? 'processing')),
        ];
    }
}
