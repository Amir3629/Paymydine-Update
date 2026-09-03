<?php

namespace App\Services\TerminalPayments;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Worldline Terminal API cloud adapter.
 *
 * Uses the documented v1 synchronous endpoint because v1 remains supported and
 * does not require the v2 IntegratorId / SalesSystemInfo values. The adapter is
 * fail-closed: no payment is settled unless the NEXO response explicitly says
 * Success/Approved and contains no failure signal.
 */
final class WorldlineTerminalProvider implements TerminalPaymentProviderInterface
{
    public function code(): string
    {
        return 'worldline';
    }

    public function validateConfiguration(array $config): array
    {
        $merchantId = $this->merchantId($config);
        $terminalId = trim((string)($config['terminal_id'] ?? $config['reader_id'] ?? ''));
        $token = $this->apiToken($config);
        $baseUrl = $this->baseUrl($config);

        $missing = [];
        if ($merchantId === '') $missing[] = 'terminal merchant ID';
        if ($terminalId === '') $missing[] = 'terminal ID';
        if ($token === '') $missing[] = 'Terminal API bearer token';
        if ($baseUrl === '') $missing[] = 'Terminal API base URL';

        if ($missing) {
            return [
                'ok' => false,
                'message' => 'Worldline Terminal API is not ready: missing '.implode(', ', $missing).'.',
            ];
        }

        return ['ok' => true, 'message' => 'Worldline Terminal API configuration is ready.'];
    }

    public function createPayment(array $attempt, array $config): array
    {
        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return ['ok' => false, 'status' => 'failed', 'message' => $validation['message'] ?? 'Worldline terminal is not configured.'];
        }

        $merchantId = $this->merchantId($config);
        $terminalId = trim((string)($config['terminal_id'] ?? $config['reader_id'] ?? ''));
        $token = $this->apiToken($config);
        $baseUrl = $this->baseUrl($config);
        $amount = round((float)($attempt['amount'] ?? 0), 2);
        $currency = strtoupper(trim((string)($attempt['currency'] ?? $config['currency'] ?? 'EUR')));
        $orderId = (int)($attempt['order_id'] ?? 0);
        $attemptId = (int)($attempt['id'] ?? 0);
        $reference = 'PMD-'.($orderId > 0 ? 'O'.$orderId : 'A'.$attemptId).'-'.substr(str_replace('-', '', (string)Str::uuid()), 0, 12);
        $timestamp = now()->toIso8601String();
        $exchangeId = (string)Str::uuid();

        if ($amount <= 0) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'Worldline terminal amount must be greater than zero.'];
        }

        $payload = [
            'SaleToPOIServiceRequest' => [
                'Header' => [
                    'MessageFunction' => 'SaleFinancialServiceRequest',
                    'ProtocolVersion' => '5.1-WL1.0.0',
                    'ExchangeIdentification' => $exchangeId,
                    'CreationDateTime' => $timestamp,
                    'InitiatingParty' => [
                        'Identification' => $merchantId,
                        'Type' => 'Merchant',
                    ],
                ],
                'ServiceRequest' => [
                    'ServiceContent' => 'FinancialPaymentRequest',
                    'PaymentRequest' => [
                        'PaymentTransaction' => [
                            'TransactionType' => 'CardPayment',
                            'TransactionIdentification' => [
                                'TransactionDateTime' => $timestamp,
                                'TransactionReference' => $reference,
                            ],
                            'TransactionDetails' => [
                                'Currency' => $currency,
                                'TotalAmount' => $amount,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $url = $baseUrl.'/api/v1/merchants/'.rawurlencode($merchantId).'/terminals/'.rawurlencode($terminalId).'/payments/sync';

        try {
            $response = Http::withToken($token)->acceptJson()->asJson()->timeout(120)->post($url, $payload);
            $json = (array)$response->json();

            if (!$response->successful()) {
                Log::warning('PMD_WORLDLINE_TERMINAL_HTTP_FAILED', [
                    'attempt_id' => $attemptId,
                    'order_id' => $orderId,
                    'terminal_id' => $terminalId,
                    'http_status' => $response->status(),
                ]);
                return [
                    'ok' => false,
                    'status' => 'failed',
                    'provider_reference' => $reference,
                    'message' => 'Worldline Terminal API returned HTTP '.$response->status().'.',
                    'http_status' => $response->status(),
                ];
            }

            $classification = $this->classifyNexoResponse($json);
            Log::info('PMD_WORLDLINE_TERMINAL_RESPONSE', [
                'attempt_id' => $attemptId,
                'order_id' => $orderId,
                'terminal_id' => $terminalId,
                'classification' => $classification,
                'http_status' => $response->status(),
            ]);

            return [
                'ok' => $classification !== 'failed',
                'status' => $classification,
                'provider_reference' => $reference,
                'message' => $classification === 'paid'
                    ? 'Worldline terminal payment approved.'
                    : ($classification === 'failed'
                        ? 'Worldline terminal payment was declined or rejected.'
                        : 'Worldline terminal response received but no final approval was present.'),
                'http_status' => $response->status(),
                'response' => $this->safeResponseSummary($json),
            ];
        } catch (\Throwable $e) {
            Log::warning('PMD_WORLDLINE_TERMINAL_EXCEPTION', [
                'attempt_id' => $attemptId,
                'order_id' => $orderId,
                'terminal_id' => $terminalId,
                'error_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return [
                'ok' => false,
                'status' => 'failed',
                'provider_reference' => $reference,
                'message' => 'Worldline Terminal API request failed before a confirmed approval was received.',
            ];
        }
    }

    public function checkStatus(array $attempt, array $config): array
    {
        $stored = json_decode((string)($attempt['response_payload'] ?? ''), true);
        $status = strtolower(trim((string)($attempt['status'] ?? 'pending')));
        if ($status === 'paid') {
            return ['ok' => true, 'status' => 'paid', 'message' => 'Worldline terminal payment already confirmed.'];
        }
        if ($status === 'failed') {
            return ['ok' => false, 'status' => 'failed', 'message' => 'Worldline terminal payment failed.'];
        }
        if (is_array($stored) && strtolower((string)($stored['status'] ?? '')) === 'paid') {
            return ['ok' => true, 'status' => 'paid', 'message' => 'Worldline terminal payment confirmed from stored synchronous response.'];
        }
        return [
            'ok' => true,
            'status' => 'pending',
            'message' => 'No final Worldline terminal approval is available. Do not settle this order automatically.',
        ];
    }

    private function merchantId(array $config): string
    {
        return trim((string)($config['terminal_merchant_id'] ?? env('WORLDLINE_TERMINAL_MERCHANT_ID') ?? ''));
    }

    private function apiToken(array $config): string
    {
        return trim((string)($config['terminal_api_token'] ?? env('WORLDLINE_TERMINAL_API_TOKEN') ?? ''));
    }

    private function baseUrl(array $config): string
    {
        $explicit = trim((string)($config['terminal_api_base_url'] ?? env('WORLDLINE_TERMINAL_API_BASE_URL') ?? ''));
        if ($explicit !== '') {
            return rtrim($explicit, '/');
        }

        // The public Worldline guide publishes this integration URL. For live,
        // require the production URL supplied with the merchant's Terminal API
        // credentials rather than guessing a hostname.
        $environment = strtolower(trim((string)($config['terminal_environment'] ?? 'test')));
        return $environment === 'live'
            ? ''
            : 'https://api.terminal.iacc.global.worldline-solutions.com';
    }

    private function classifyNexoResponse(array $payload): string
    {
        $values = [];
        $walk = function ($value, $key = '') use (&$walk, &$values): void {
            if (is_array($value)) {
                foreach ($value as $childKey => $childValue) {
                    $walk($childValue, (string)$childKey);
                }
                return;
            }
            if (is_scalar($value) || $value === null) {
                $keyLower = strtolower($key);
                if (preg_match('/response|result|reason|status|authori[sz]ation/', $keyLower)) {
                    $values[] = strtolower(trim((string)$value));
                }
            }
        };
        $walk($payload);
        $haystack = ' '.implode(' ', $values).' ';

        foreach (['declined', 'rejected', 'failed', 'failure', 'cancelled', 'canceled', 'error', 'notallowed', 'not allowed', 'aborted'] as $negative) {
            if (str_contains($haystack, $negative)) return 'failed';
        }
        foreach (['approved', 'success', 'successful'] as $positive) {
            if (str_contains($haystack, $positive)) return 'paid';
        }
        return 'pending';
    }

    private function safeResponseSummary(array $payload): array
    {
        $summary = [];
        $walk = function ($value, string $path = '') use (&$walk, &$summary): void {
            if (count($summary) >= 40) return;
            if (is_array($value)) {
                foreach ($value as $key => $child) {
                    $walk($child, $path === '' ? (string)$key : $path.'.'.$key);
                }
                return;
            }
            if (!is_scalar($value) && $value !== null) return;
            if (preg_match('/card|pan|track|token|secret|authorizationheader|receipt/i', $path)) return;
            if (preg_match('/response|result|reason|status|reference|identification|amount|currency/i', $path)) {
                $summary[$path] = $value;
            }
        };
        $walk($payload);
        return $summary;
    }
}
