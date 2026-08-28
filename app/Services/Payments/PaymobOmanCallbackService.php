<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * PMD_PAYMOB_OMAN_CALLBACK_SETTLEMENT_R11
 *
 * Paymob callbacks and server-side inquiry are the only Paymob paths allowed to
 * request canonical settlement. Browser redirects are UX-only and never mark an
 * order paid.
 */
final class PaymobOmanCallbackService
{
    public const VERSION = '11.0.0';

    public function __construct(
        private ?PaymobOmanConnectionService $connection = null,
        private ?PaymobOmanPaymentAttemptService $attempts = null,
        private ?CanonicalProviderSettlementService $settlement = null
    ) {
        $this->connection = $connection ?: new PaymobOmanConnectionService();
        $this->attempts = $attempts ?: new PaymobOmanPaymentAttemptService();
        $this->settlement = $settlement ?: new CanonicalProviderSettlementService();
    }

    public function handleCallback(array $payload, ?string $receivedHmac): array
    {
        $runtimeConfig = $this->connection->runtimeConfig();
        $runtime = new PaymobOmanRuntimeService($runtimeConfig);

        // Verify HMAC before using any callback field for financial decisions.
        $firstPass = $runtime->verifyTransactionCallback($payload, $receivedHmac, null, '', null);
        if (!($firstPass['verified'] ?? false)) {
            return ['ok' => false, 'http_status' => 401, 'message' => (string)($firstPass['message'] ?? 'Invalid Paymob HMAC.')];
        }

        $transaction = (array)($firstPass['transaction'] ?? []);
        $reference = trim((string)($transaction['merchant_order_id'] ?? ''));
        if ($reference === '') {
            return ['ok' => false, 'http_status' => 422, 'message' => 'Verified Paymob callback did not include PMD special_reference.'];
        }

        $attempt = $this->attempts->findByReference($reference);
        if (!$attempt) {
            Log::warning('PMD_PAYMOB_VERIFIED_CALLBACK_ATTEMPT_NOT_FOUND_R11', [
                'special_reference' => $reference,
                'provider_transaction_id' => $transaction['transaction_id'] ?? null,
            ]);
            // HMAC is valid, but there is no durable local attempt. Keep this as a
            // reconciliation incident rather than creating a payment from callback data.
            return ['ok' => true, 'http_status' => 200, 'status' => 'ignored_unknown_reference', 'settled_by_backend' => false];
        }

        $verified = $runtime->verifyTransactionCallback(
            $payload,
            $receivedHmac,
            (int)$attempt->amount_minor,
            (string)$attempt->currency,
            (string)$attempt->special_reference
        );
        if (!($verified['ok'] ?? false)) {
            $this->attempts->markReconciliation((int)$attempt->id, 'reconciliation_required', (string)($verified['message'] ?? 'Verified callback did not match local attempt.'), [
                'source' => 'callback',
                'transaction' => $verified['transaction'] ?? $transaction,
            ]);
            return ['ok' => true, 'http_status' => 200, 'status' => 'reconciliation_required', 'settled_by_backend' => false];
        }

        $transaction = (array)$verified['transaction'];
        $this->attempts->markCallback((int)$attempt->id, $transaction, ['source' => 'callback', 'verified_hmac' => true]);

        if (!($verified['settlement_candidate'] ?? false)) {
            return [
                'ok' => true,
                'http_status' => 200,
                'status' => (string)($transaction['status'] ?? 'pending'),
                'is_paid' => false,
                'settled_by_backend' => false,
                'provider_reference' => (string)$attempt->special_reference,
            ];
        }

        return $this->settleAttempt($attempt, $transaction, 'callback');
    }

    public function status(string $reference): array
    {
        $attempt = $this->attempts->findByReference($reference);
        if (!$attempt) {
            return ['ok' => false, 'http_status' => 404, 'message' => 'Paymob payment attempt was not found.'];
        }

        if ((string)$attempt->status === 'settled') {
            return $this->statusResponse($attempt, 'paid', true, true);
        }

        return $this->reconcile($attempt);
    }

    public function reconcile(object|string $attemptOrReference): array
    {
        $attempt = is_object($attemptOrReference)
            ? $attemptOrReference
            : $this->attempts->findByReference((string)$attemptOrReference);
        if (!$attempt) return ['ok' => false, 'http_status' => 404, 'message' => 'Paymob payment attempt was not found.'];

        $runtimeConfig = $this->connection->runtimeConfig();
        $runtime = new PaymobOmanRuntimeService($runtimeConfig);
        $client = new PaymobApiClient($runtimeConfig);
        $transaction = null;
        $inquirySummary = [];

        $knownTransactionId = trim((string)($attempt->provider_transaction_id ?? ''));
        if ($knownTransactionId !== '') {
            $result = $runtime->reconcileTransaction($knownTransactionId);
            $inquirySummary['transaction_inquiry'] = $this->safeInquirySummary($result);
            if ($result['ok'] ?? false) $transaction = (array)($result['transaction'] ?? []);
        }

        if (!$transaction) {
            $clientSecret = $this->attempts->clientSecret($attempt);
            if ($clientSecret !== '') {
                $intention = $this->retrieveIntention($client, $clientSecret);
                $inquirySummary['intention_inquiry'] = $this->safeInquirySummary($intention);
                if ($intention['ok'] ?? false) {
                    $transaction = $this->bestTransactionFromPayload($client, (array)($intention['response'] ?? []));
                }
            }
        }

        if (!$transaction) {
            $providerOrderId = trim((string)($attempt->provider_order_id ?? ''));
            if ($providerOrderId !== '') {
                $orderResult = $runtime->reconcilePaymobOrder($providerOrderId);
                $inquirySummary['order_inquiry'] = $this->safeInquirySummary($orderResult);
                if ($orderResult['ok'] ?? false) {
                    $transaction = $this->bestTransactionFromPayload($client, (array)($orderResult['response'] ?? []));
                }
            }
        }

        if (!$transaction) {
            $current = (string)$attempt->status;
            $status = in_array($current, ['failed', 'cancelled', 'canceled'], true) ? $current : 'pending';
            $this->attempts->markReconciliation((int)$attempt->id, $status, null, ['source' => 'inquiry', 'summary' => $inquirySummary]);
            $attempt = $this->attempts->findById((int)$attempt->id) ?? $attempt;
            return $this->statusResponse($attempt, $status, false, false, $inquirySummary);
        }

        $validation = $this->validateInquiredTransaction($attempt, $transaction);
        if (!($validation['ok'] ?? false)) {
            $this->attempts->markReconciliation((int)$attempt->id, 'reconciliation_required', (string)$validation['message'], [
                'source' => 'inquiry',
                'transaction' => $transaction,
                'summary' => $inquirySummary,
            ]);
            $attempt = $this->attempts->findById((int)$attempt->id) ?? $attempt;
            return $this->statusResponse($attempt, 'reconciliation_required', false, false, $inquirySummary);
        }

        $this->attempts->markCallback((int)$attempt->id, $transaction, ['source' => 'inquiry', 'summary' => $inquirySummary]);
        if ((string)($transaction['status'] ?? '') === 'paid') {
            return $this->settleAttempt($attempt, $transaction, 'inquiry');
        }

        $status = (string)($transaction['status'] ?? 'pending');
        $this->attempts->markReconciliation((int)$attempt->id, $status, null, ['source' => 'inquiry', 'transaction' => $transaction]);
        $attempt = $this->attempts->findById((int)$attempt->id) ?? $attempt;
        return $this->statusResponse($attempt, $status, false, false, $inquirySummary);
    }

    private function settleAttempt(object $attempt, array $transaction, string $source): array
    {
        $providerTransactionId = trim((string)($transaction['transaction_id'] ?? ''));
        if ($providerTransactionId === '') {
            $this->attempts->markReconciliation((int)$attempt->id, 'reconciliation_required', 'Paymob reports paid but no transaction ID is available.', [
                'source' => $source,
                'transaction' => $transaction,
            ]);
            return $this->statusResponse($attempt, 'reconciliation_required', true, false);
        }

        $validation = $this->validateInquiredTransaction($attempt, $transaction);
        if (!($validation['ok'] ?? false)) {
            $this->attempts->markReconciliation((int)$attempt->id, 'reconciliation_required', (string)$validation['message'], [
                'source' => $source,
                'transaction' => $transaction,
            ]);
            return $this->statusResponse($attempt, 'reconciliation_required', true, false);
        }

        $allocations = $this->attempts->orderAllocations($attempt);
        if (!$allocations) {
            $allocations = [[
                'order_id' => (int)$attempt->order_id,
                'payment_intent_token' => $attempt->payment_intent_token ?? null,
                'principal_amount' => (float)$attempt->principal_amount,
                'tip_amount' => (float)$attempt->tip_amount,
                'coupon_discount' => (float)$attempt->coupon_discount,
                'coupon_code' => $attempt->coupon_code ?? null,
                'payable_amount' => (float)$attempt->payable_amount,
                'selected_items' => $this->attempts->selectedItems($attempt),
            ]];
        }

        $results = [];
        try {
            foreach ($allocations as $allocation) {
                $orderId = (int)($allocation['order_id'] ?? 0);
                if ($orderId < 1) throw new \RuntimeException('Paymob settlement allocation has no order_id.');

                $results[] = $this->settlement->settleVerified([
                    'order_id' => $orderId,
                    'provider_code' => 'paymob',
                    'payment_method' => (string)$attempt->method_variant,
                    'provider_reference' => $providerTransactionId,
                    'idempotency_key' => 'paymob-tx-'.$providerTransactionId.'-order-'.$orderId,
                    'currency' => 'OMR',
                    'payable_amount' => (float)($allocation['payable_amount'] ?? 0),
                    'principal_amount' => (float)($allocation['principal_amount'] ?? 0),
                    'tip_amount' => (float)($allocation['tip_amount'] ?? 0),
                    'coupon_discount' => (float)($allocation['coupon_discount'] ?? 0),
                    'coupon_code' => $allocation['coupon_code'] ?? null,
                    'payment_intent_token' => $allocation['payment_intent_token'] ?? null,
                    'selected_items' => is_array($allocation['selected_items'] ?? null) ? $allocation['selected_items'] : [],
                    'metadata' => [
                        'paymob_special_reference' => (string)$attempt->special_reference,
                        'paymob_order_id' => $transaction['paymob_order_id'] ?? $attempt->provider_order_id ?? null,
                        'paymob_integration_id' => $transaction['integration_id'] ?? null,
                        'paymob_source' => $source,
                        'paymob_attempt_id' => (int)$attempt->id,
                    ],
                ]);
            }
        } catch (\Throwable $error) {
            Log::critical('PMD_PAYMOB_PROVIDER_PAID_CANONICAL_SETTLEMENT_FAILED_R11', [
                'attempt_id' => (int)$attempt->id,
                'special_reference' => (string)$attempt->special_reference,
                'provider_transaction_id' => $providerTransactionId,
                'completed_allocations' => count($results),
                'message' => $error->getMessage(),
            ]);
            $this->attempts->markReconciliation((int)$attempt->id, 'reconciliation_required', 'Provider charge is paid but PMD canonical settlement requires reconciliation.', [
                'source' => $source,
                'provider_transaction_id' => $providerTransactionId,
                'completed_settlements' => $results,
            ]);
            $attempt = $this->attempts->findById((int)$attempt->id) ?? $attempt;
            return $this->statusResponse($attempt, 'reconciliation_required', true, false, ['settlements' => $results]);
        }

        $this->attempts->markSettled((int)$attempt->id, $providerTransactionId, $results);
        $attempt = $this->attempts->findById((int)$attempt->id) ?? $attempt;
        return $this->statusResponse($attempt, 'paid', true, true, ['settlements' => $results]);
    }

    private function validateInquiredTransaction(object $attempt, array $transaction): array
    {
        $currency = strtoupper(trim((string)($transaction['currency'] ?? '')));
        if ($currency !== strtoupper((string)$attempt->currency)) {
            return ['ok' => false, 'message' => 'Paymob inquiry currency does not match the PMD attempt.'];
        }
        if ((int)($transaction['amount_minor'] ?? 0) !== (int)$attempt->amount_minor) {
            return ['ok' => false, 'message' => 'Paymob inquiry amount does not match the PMD attempt.'];
        }
        $merchantReference = trim((string)($transaction['merchant_order_id'] ?? ''));
        if ($merchantReference !== '' && !hash_equals((string)$attempt->special_reference, $merchantReference)) {
            return ['ok' => false, 'message' => 'Paymob inquiry merchant reference does not match the PMD attempt.'];
        }
        return ['ok' => true];
    }

    private function retrieveIntention(PaymobApiClient $client, string $clientSecret): array
    {
        $config = $client->config();
        $publicKey = trim((string)($config['public_key'] ?? ''));
        if ($publicKey === '' || trim($clientSecret) === '') {
            return ['ok' => false, 'message' => 'Paymob intention inquiry keys are unavailable.'];
        }

        try {
            $url = rtrim((string)$config['api_base_url'], '/').'/v1/intention/element/'.rawurlencode($publicKey).'/'.rawurlencode($clientSecret).'/';
            $response = Http::acceptJson()->timeout(20)->get($url);
            $body = $response->json();
            $body = is_array($body) ? $body : [];
            if (!$response->successful()) {
                return ['ok' => false, 'http_status' => $response->status(), 'message' => 'Paymob intention inquiry failed.'];
            }
            // client_secret may be echoed by this public-key endpoint. Do not keep it.
            unset($body['client_secret']);
            return ['ok' => true, 'http_status' => $response->status(), 'response' => $body];
        } catch (\Throwable $error) {
            return ['ok' => false, 'message' => 'Unable to inquire Paymob intention: '.$error->getMessage()];
        }
    }

    private function bestTransactionFromPayload(PaymobApiClient $client, array $payload): ?array
    {
        $candidates = [];
        foreach (['transactions', 'transaction_records'] as $key) {
            foreach ((array)($payload[$key] ?? []) as $row) {
                if (is_array($row)) $candidates[] = $row;
            }
        }

        if (is_array($payload['transaction'] ?? null)) $candidates[] = (array)$payload['transaction'];
        if (!$candidates && array_key_exists('amount_cents', $payload) && array_key_exists('id', $payload)) $candidates[] = $payload;

        $normalized = array_map(fn (array $row) => $client->normalizeTransactionState($row), $candidates);
        foreach ($normalized as $row) if (($row['status'] ?? '') === 'paid') return $row;
        foreach ($normalized as $row) if (($row['status'] ?? '') === 'pending') return $row;
        return $normalized ? $normalized[count($normalized) - 1] : null;
    }

    private function statusResponse(object $attempt, string $status, bool $providerPaid, bool $settled, array $extra = []): array
    {
        return [
            'ok' => true,
            'success' => true,
            'http_status' => 200,
            'provider' => 'paymob',
            'status' => $status,
            'is_paid' => $settled,
            'provider_paid' => $providerPaid,
            'settled_by_backend' => $settled,
            'pending' => in_array($status, ['created', 'provider_call_started', 'intention_created', 'pending', 'provider_paid'], true),
            'cancelled' => in_array($status, ['cancelled', 'canceled', 'expired', 'failed'], true),
            'provider_reference' => (string)$attempt->special_reference,
            'transaction_id' => $attempt->provider_transaction_id ?? null,
            'attempt' => $this->attempts->safeState($attempt),
        ] + $extra;
    }

    private function safeInquirySummary(array $result): array
    {
        return [
            'ok' => (bool)($result['ok'] ?? false),
            'http_status' => $result['http_status'] ?? null,
            'message' => $result['ok'] ?? false ? null : mb_substr((string)($result['message'] ?? ''), 0, 500),
        ];
    }
}
