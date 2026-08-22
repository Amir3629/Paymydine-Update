<?php

namespace App\Services\TerminalPayments;

use Illuminate\Support\Facades\Http;

class SumupTerminalProvider implements TerminalPaymentProviderInterface
{
    public function code(): string
    {
        return 'sumup';
    }

    public function validateConfiguration(array $config): array
    {
        foreach (['access_token', 'merchant_code', 'reader_id'] as $field) {
            if (trim((string)($config[$field] ?? '')) === '') {
                return ['ok' => false, 'message' => "Missing SumUp terminal field: {$field}"];
            }
        }

        return ['ok' => true, 'message' => 'SumUp terminal configuration is ready.'];
    }

    public function createPayment(array $attempt, array $config): array
    {
        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return $validation;
        }

        $baseUrl = rtrim((string)($config['url'] ?? 'https://api.sumup.com'), '/');
        $merchantCode = rawurlencode((string)$config['merchant_code']);
        $readerId = rawurlencode((string)$config['reader_id']);
        $amountMinor = (int)round(((float)($attempt['amount'] ?? 0)) * 100);
        $currency = strtoupper((string)($attempt['currency'] ?? 'EUR'));

        if ($amountMinor <= 0) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'SumUp terminal amount must be greater than zero.'];
        }

        // SumUp requires an Affiliate Key for card-present / Cloud API payments.
        // Keep the key tenant/provider-specific when present, while the app ID can
        // be configured once for the PayMyDine integration in the server env.
        $affiliateKey = trim((string)($config['affiliate_key'] ?? env('SUMUP_AFFILIATE_KEY', '')));
        $affiliateAppId = trim((string)($config['affiliate_app_id'] ?? env('SUMUP_AFFILIATE_APP_ID', '')));

        if ($affiliateKey === '' || $affiliateAppId === '') {
            return [
                'ok' => false,
                'status' => 'failed',
                'message' => 'SumUp Cloud API requires an Affiliate Key and matching App ID. Configure SUMUP_AFFILIATE_APP_ID and an affiliate key before charging a reader.',
            ];
        }

        $foreignTransactionId = sprintf(
            'pmd-%d-%d',
            (int)($attempt['order_id'] ?? 0),
            (int)($attempt['id'] ?? 0)
        );

        $payload = [
            'total_amount' => [
                'currency' => $currency,
                'minor_unit' => 2,
                'value' => $amountMinor,
            ],
            'affiliate' => [
                'app_id' => $affiliateAppId,
                'foreign_transaction_id' => $foreignTransactionId,
                'key' => $affiliateKey,
            ],
            'description' => 'PayMyDine order #'.(int)($attempt['order_id'] ?? 0),
        ];

        if (!empty($config['return_url'])) {
            $payload['return_url'] = (string)$config['return_url'];
        }

        try {
            $response = Http::withToken((string)$config['access_token'])
                ->acceptJson()
                ->asJson()
                ->timeout(20)
                ->post("{$baseUrl}/v0.1/merchants/{$merchantCode}/readers/{$readerId}/checkout", $payload);

            $json = (array)$response->json();
            $data = (array)($json['data'] ?? $json);

            if (!$response->successful()) {
                return [
                    'ok' => false,
                    'status' => 'failed',
                    'message' => (string)($json['detail'] ?? $json['message'] ?? 'SumUp rejected the terminal checkout.'),
                    'http_status' => $response->status(),
                    'response' => $json,
                ];
            }

            $checkoutId = (string)($data['checkout_id'] ?? $data['client_transaction_id'] ?? '');
            if ($checkoutId === '') {
                return [
                    'ok' => false,
                    'status' => 'failed',
                    'message' => 'SumUp accepted the request but did not return a checkout identifier.',
                    'response' => $json,
                ];
            }

            return [
                'ok' => true,
                'status' => 'sent_to_terminal',
                'provider_reference' => $checkoutId,
                'client_transaction_id' => $data['client_transaction_id'] ?? null,
                'checkout_id' => $data['checkout_id'] ?? $checkoutId,
                'foreign_transaction_id' => $foreignTransactionId,
                'message' => 'Payment sent to SumUp terminal. Waiting for the customer.',
                'response' => $json,
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => 'failed',
                'message' => 'Could not contact SumUp: '.$e->getMessage(),
            ];
        }
    }

    public function checkStatus(array $attempt, array $config): array
    {
        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return $validation;
        }

        $checkoutId = trim((string)($attempt['provider_reference'] ?? ''));
        if ($checkoutId === '') {
            return ['ok' => false, 'status' => 'pending', 'message' => 'Missing SumUp checkout identifier.'];
        }

        $baseUrl = rtrim((string)($config['url'] ?? 'https://api.sumup.com'), '/');
        $merchantCode = rawurlencode((string)$config['merchant_code']);
        $readerId = rawurlencode((string)$config['reader_id']);
        $checkout = rawurlencode($checkoutId);

        try {
            $response = Http::withToken((string)$config['access_token'])
                ->acceptJson()
                ->timeout(20)
                ->get("{$baseUrl}/v0.1/merchants/{$merchantCode}/readers/{$readerId}/checkout/{$checkout}");

            $json = (array)$response->json();
            $data = (array)($json['data'] ?? $json);

            if (!$response->successful()) {
                return [
                    'ok' => false,
                    'status' => (string)($attempt['status'] ?? 'pending'),
                    'message' => (string)($json['detail'] ?? $json['message'] ?? 'Unable to read SumUp checkout status.'),
                    'http_status' => $response->status(),
                    'response' => $json,
                ];
            }

            $sumupStatus = strtolower((string)($data['status'] ?? 'pending'));
            $mapped = match ($sumupStatus) {
                'successful' => 'paid',
                'failed' => 'failed',
                'cancelled', 'canceled' => 'cancelled',
                default => 'sent_to_terminal',
            };

            return [
                'ok' => true,
                'status' => $mapped,
                'sumup_status' => $sumupStatus,
                'payment_status' => $data['payment_status'] ?? null,
                'message' => $mapped === 'paid' ? 'SumUp payment approved.' : 'SumUp payment status: '.$sumupStatus,
                'response' => $json,
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => (string)($attempt['status'] ?? 'pending'),
                'message' => 'Could not check SumUp status: '.$e->getMessage(),
            ];
        }
    }
}
