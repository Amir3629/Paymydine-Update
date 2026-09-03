<?php

namespace App\Services\TerminalPayments;

use App\Services\Payments\SquareRuntimeService;
use Illuminate\Support\Facades\Http;

/**
 * Square Terminal API cloud adapter.
 *
 * Production device_id must be a Square Terminal paired through the Devices API.
 * Sandbox supports Square's documented synthetic Terminal device IDs, so the
 * whole card-present request/status contract can be tested without hardware.
 */
final class SquareTerminalProvider implements TerminalPaymentProviderInterface
{
    public function code(): string
    {
        return 'square';
    }

    // PMD_SQUARE_TERMINAL_CANADA_R10_SIMULATORS
    public static function canadaSandboxDevices(): array
    {
        return [
            '388b5a08-a77c-48ef-ad2a-4a790e6f2789' => [
                'name' => 'Square Sandbox Canada - Interac success',
                'expected_status' => 'COMPLETED',
                'currency' => 'CAD',
            ],
            '2b0b734b-b187-47f0-9d6f-288745210bdb' => [
                'name' => 'Square Sandbox Canada - Interac success + 20% tip',
                'expected_status' => 'COMPLETED',
                'currency' => 'CAD',
            ],
            '841100b9-ee60-4537-9bcf-e30b2ba5e215' => [
                'name' => 'Square Sandbox - buyer cancels',
                'expected_status' => 'CANCELED',
                'currency' => 'CAD',
            ],
            '0a956d49-619a-4530-8e5e-8eac603ffc5e' => [
                'name' => 'Square Sandbox - immediate timeout',
                'expected_status' => 'CANCELED',
                'currency' => 'CAD',
            ],
            'da40d603-c2ea-4a65-8cfd-f42e36dab0c7' => [
                'name' => 'Square Sandbox - terminal offline / pending',
                'expected_status' => 'PENDING',
                'currency' => 'CAD',
            ],
        ];
    }

    public static function isCanadaSandboxDeviceId(string $deviceId): bool
    {
        return array_key_exists(trim($deviceId), self::canadaSandboxDevices());
    }

    public function validateConfiguration(array $config): array
    {
        foreach (['access_token', 'location_id', 'device_id'] as $field) {
            if (trim((string)($config[$field] ?? '')) === '') {
                return ['ok' => false, 'message' => 'Missing Square Terminal field: '.$field];
            }
        }

        $pmdCountry = strtoupper(trim((string)($config['pmd_country_code'] ?? '')));
        if (!in_array($pmdCountry, SquareRuntimeService::PMD_SUPPORTED_COUNTRIES, true)) {
            return [
                'ok' => false,
                'message' => 'Square Terminal is enabled in PayMyDine only for Canada (CA).',
            ];
        }

        $currency = strtoupper(trim((string)($config['currency'] ?? '')));
        if ($currency !== '' && $currency !== 'CAD') {
            return [
                'ok' => false,
                'message' => 'Square Canada Terminal payments require CAD.',
            ];
        }

        return ['ok' => true, 'message' => 'Square Canada Terminal API configuration is ready.'];
    }

    public function createPayment(array $attempt, array $config): array
    {
        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) return $validation + ['status' => 'failed'];

        $runtime = app(SquareRuntimeService::class);
        $currency = strtoupper(trim((string)($attempt['currency'] ?? $config['currency'] ?? '')));
        if ($currency !== 'CAD') {
            return ['ok' => false, 'status' => 'failed', 'message' => 'Square Canada Terminal checkout currency must be CAD.'];
        }
        $amountMinor = $runtime->toMinor((float)($attempt['amount'] ?? 0), $currency);
        if ($amountMinor <= 0) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'Square Terminal amount must be greater than zero.'];
        }

        $referenceId = $this->referenceId($attempt);
        $payload = [
            'idempotency_key' => substr('pmd-terminal-'.hash('sha256', $referenceId.'|'.(string)($config['device_id'] ?? '')), 0, 64),
            'checkout' => [
                'amount_money' => ['amount' => $amountMinor, 'currency' => $currency],
                'reference_id' => $referenceId,
                'device_options' => [
                    'device_id' => (string)$config['device_id'],
                    'skip_receipt_screen' => false,
                    'tip_settings' => ['allow_tipping' => false],
                ],
                'payment_options' => ['autocomplete' => true],
                'note' => 'PayMyDine order #'.(int)($attempt['order_id'] ?? 0),
            ],
        ];

        try {
            $response = Http::withToken((string)$config['access_token'])
                ->withHeaders(['Square-Version' => SquareRuntimeService::API_VERSION])
                ->acceptJson()->asJson()->timeout(30)
                ->post($this->baseUrl($config).'/v2/terminals/checkouts', $payload);
            $json = (array)$response->json();
            if (!$response->successful()) {
                return [
                    'ok' => false,
                    'status' => 'failed',
                    'message' => (string)($json['errors'][0]['detail'] ?? 'Square rejected the Terminal checkout.'),
                    'http_status' => $response->status(),
                    'response' => $json,
                ];
            }

            $checkout = (array)($json['checkout'] ?? []);
            $checkoutId = trim((string)($checkout['id'] ?? ''));
            if ($checkoutId === '') {
                return ['ok' => false, 'status' => 'failed', 'message' => 'Square did not return a Terminal checkout ID.', 'response' => $json];
            }

            $status = strtoupper(trim((string)($checkout['status'] ?? 'PENDING')));
            return [
                'ok' => true,
                'status' => $status === 'COMPLETED' ? $this->verifiedCompletedStatus($attempt, $config, $checkout)['status'] : 'sent_to_terminal',
                'provider_reference' => $checkoutId,
                'square_checkout_status' => $status,
                'reference_id' => $referenceId,
                'message' => $status === 'COMPLETED'
                    ? 'Square Terminal checkout completed.'
                    : 'Payment sent to Square Terminal. Waiting for the customer.',
                'response' => $json,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'Could not contact Square Terminal API: '.$e->getMessage()];
        }
    }

    public function checkStatus(array $attempt, array $config): array
    {
        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) return $validation + ['status' => (string)($attempt['status'] ?? 'pending')];

        $checkoutId = trim((string)($attempt['provider_reference'] ?? ''));
        if ($checkoutId === '') {
            return ['ok' => false, 'status' => 'pending', 'message' => 'Missing Square Terminal checkout ID.'];
        }

        try {
            $response = Http::withToken((string)$config['access_token'])
                ->withHeaders(['Square-Version' => SquareRuntimeService::API_VERSION])
                ->acceptJson()->timeout(20)
                ->get($this->baseUrl($config).'/v2/terminals/checkouts/'.rawurlencode($checkoutId));
            $json = (array)$response->json();
            if (!$response->successful()) {
                return [
                    'ok' => false,
                    'status' => (string)($attempt['status'] ?? 'pending'),
                    'message' => (string)($json['errors'][0]['detail'] ?? 'Unable to read Square Terminal checkout status.'),
                    'http_status' => $response->status(),
                    'response' => $json,
                ];
            }

            $checkout = (array)($json['checkout'] ?? []);
            $status = strtoupper(trim((string)($checkout['status'] ?? 'PENDING')));
            if ($status === 'COMPLETED') {
                $verified = $this->verifiedCompletedStatus($attempt, $config, $checkout);
                $verified['response'] = $json;
                return $verified;
            }
            if (in_array($status, ['CANCELED', 'CANCELLED'], true)) {
                return ['ok' => true, 'status' => 'cancelled', 'square_checkout_status' => $status, 'message' => 'Square Terminal checkout was cancelled.', 'response' => $json];
            }

            return [
                'ok' => true,
                'status' => 'sent_to_terminal',
                'square_checkout_status' => $status,
                'message' => 'Square Terminal checkout status: '.$status,
                'response' => $json,
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => (string)($attempt['status'] ?? 'pending'),
                'message' => 'Could not check Square Terminal status: '.$e->getMessage(),
            ];
        }
    }

    private function verifiedCompletedStatus(array $attempt, array $config, array $checkout): array
    {
        $runtime = app(SquareRuntimeService::class);
        $currency = strtoupper(trim((string)($attempt['currency'] ?? $config['currency'] ?? '')));
        $expectedMinor = $runtime->toMinor((float)($attempt['amount'] ?? 0), $currency);
        $referenceId = $this->referenceId($attempt);
        $checkoutAmount = (int)($checkout['amount_money']['amount'] ?? -1);
        $checkoutCurrency = strtoupper(trim((string)($checkout['amount_money']['currency'] ?? '')));
        $checkoutReference = trim((string)($checkout['reference_id'] ?? ''));
        $checkoutLocation = trim((string)($checkout['location_id'] ?? ''));
        $paymentIds = array_values(array_filter(array_map('strval', (array)($checkout['payment_ids'] ?? []))));

        if ($checkoutAmount !== $expectedMinor
            || !hash_equals($currency, $checkoutCurrency)
            || !hash_equals($referenceId, $checkoutReference)
            || ($checkoutLocation !== '' && !hash_equals((string)$config['location_id'], $checkoutLocation))
            || empty($paymentIds)) {
            return [
                'ok' => false,
                'status' => 'reconciliation_required',
                'message' => 'Square Terminal reported COMPLETED but checkout amount/currency/reference/location/payment IDs did not verify.',
                'square_checkout_status' => 'COMPLETED',
            ];
        }

        $payment = $runtime->verifyPayment(
            $paymentIds[0],
            $expectedMinor,
            $currency,
            $referenceId,
            (string)$config['location_id']
        );
        if (!($payment['is_paid'] ?? false)) {
            return [
                'ok' => false,
                'status' => 'reconciliation_required',
                'message' => 'Square Terminal checkout completed but the linked Square Payment is not fully verified as paid.',
                'square_checkout_status' => 'COMPLETED',
                'square_payment' => $payment,
            ];
        }

        return [
            'ok' => true,
            'status' => 'paid',
            'provider_reference' => (string)($checkout['id'] ?? $attempt['provider_reference'] ?? ''),
            'square_checkout_status' => 'COMPLETED',
            'square_payment_id' => $paymentIds[0],
            'reference_id' => $referenceId,
            'message' => 'Square Terminal payment approved and server-verified.',
            'square_payment' => $payment,
        ];
    }

    private function referenceId(array $attempt): string
    {
        return substr('PMD-'.(int)($attempt['order_id'] ?? 0).'-T-'.(int)($attempt['id'] ?? 0), 0, 40);
    }

    private function baseUrl(array $config): string
    {
        $mode = strtolower(trim((string)($config['transaction_mode'] ?? $config['mode'] ?? 'test')));
        return $mode === 'live' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    }
}
