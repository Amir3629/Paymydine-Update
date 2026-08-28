<?php

namespace App\Services\Payments;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PAYMOB_OMAN_ATTEMPT_STORE_R11
 *
 * Durable tenant-scoped Paymob attempt state. A stable special_reference is
 * persisted before the first provider request. Browser redirects never become
 * payment authority; this table exists so callbacks and inquiry can recover the
 * same attempt after network loss, duplicate delivery or a closed browser.
 */
final class PaymobOmanPaymentAttemptService
{
    public const VERSION = '11.1.0';
    public const TABLE = 'pmd_paymob_payment_attempts';

    public function ensureSchema(): void
    {
        if (!Schema::hasTable(self::TABLE)) {
            Schema::create(self::TABLE, function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('order_id')->index();
                $table->string('client_request_id', 191)->nullable()->index();
                $table->string('special_reference', 96)->unique();
                $table->string('payment_intent_token', 64)->nullable()->index();
                $table->string('guest_session_id', 191)->nullable()->index();
                $table->string('method_variant', 50)->index();
                $table->decimal('principal_amount', 15, 4)->default(0);
                $table->decimal('tip_amount', 15, 4)->default(0);
                $table->decimal('coupon_discount', 15, 4)->default(0);
                $table->string('coupon_code', 191)->nullable();
                $table->decimal('payable_amount', 15, 4)->default(0);
                $table->unsignedBigInteger('amount_minor')->default(0);
                $table->char('currency', 3)->default('OMR');
                $table->longText('selected_items')->nullable();
                $table->longText('order_allocations')->nullable();
                $table->longText('integration_ids')->nullable();
                $table->string('provider_intention_id', 191)->nullable()->index();
                $table->string('provider_order_id', 191)->nullable()->index();
                $table->string('provider_transaction_id', 191)->nullable()->index();
                $table->longText('client_secret_ciphertext')->nullable();
                $table->string('status', 40)->default('created')->index();
                $table->unsignedBigInteger('canonical_transaction_id')->nullable()->index();
                $table->integer('last_http_status')->nullable();
                $table->text('last_error')->nullable();
                $table->longText('provider_response')->nullable();
                $table->longText('callback_summary')->nullable();
                // Per-order map is required because one Paymob Intention can settle
                // several PMD orders in a grouped table payment.
                $table->longText('financial_adjustment_state')->nullable();
                $table->timestamp('provider_call_started_at')->nullable();
                $table->timestamp('callback_received_at')->nullable();
                $table->timestamp('reconciled_at')->nullable();
                $table->timestamp('settled_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamps();
                $table->unique(['order_id', 'client_request_id'], 'pmd_paymob_order_client_request_unique');
            });
            return;
        }

        // R11 is deliberately additive so an interrupted deployment can resume.
        $columns = [
            'order_allocations' => fn (Blueprint $table) => $table->longText('order_allocations')->nullable(),
            'provider_order_id' => fn (Blueprint $table) => $table->string('provider_order_id', 191)->nullable()->index(),
            'provider_transaction_id' => fn (Blueprint $table) => $table->string('provider_transaction_id', 191)->nullable()->index(),
            'client_secret_ciphertext' => fn (Blueprint $table) => $table->longText('client_secret_ciphertext')->nullable(),
            'canonical_transaction_id' => fn (Blueprint $table) => $table->unsignedBigInteger('canonical_transaction_id')->nullable()->index(),
            'callback_summary' => fn (Blueprint $table) => $table->longText('callback_summary')->nullable(),
            'financial_adjustment_state' => fn (Blueprint $table) => $table->longText('financial_adjustment_state')->nullable(),
            'reconciled_at' => fn (Blueprint $table) => $table->timestamp('reconciled_at')->nullable(),
            'settled_at' => fn (Blueprint $table) => $table->timestamp('settled_at')->nullable(),
        ];

        foreach ($columns as $column => $definition) {
            if (!Schema::hasColumn(self::TABLE, $column)) {
                Schema::table(self::TABLE, $definition);
            }
        }
    }

    public function createOrReuse(array $data): object
    {
        $this->ensureSchema();

        $orderId = (int)($data['order_id'] ?? 0);
        if ($orderId < 1) throw new \InvalidArgumentException('Paymob attempt requires order_id.');

        $clientRequestId = $this->clean((string)($data['client_request_id'] ?? ''), 191);
        if ($clientRequestId !== '') {
            $existing = DB::table(self::TABLE)
                ->where('order_id', $orderId)
                ->where('client_request_id', $clientRequestId)
                ->orderByDesc('id')
                ->first();
            if ($existing) return $existing;
        }

        $specialReference = $this->newSpecialReference($orderId);
        $insert = [
            'order_id' => $orderId,
            'client_request_id' => $clientRequestId !== '' ? $clientRequestId : null,
            'special_reference' => $specialReference,
            'payment_intent_token' => $this->nullableString($data['payment_intent_token'] ?? null, 64),
            'guest_session_id' => $this->nullableString($data['guest_session_id'] ?? null, 191),
            'method_variant' => $this->clean((string)($data['method_variant'] ?? ''), 50),
            'principal_amount' => $this->money($data['principal_amount'] ?? 0),
            'tip_amount' => $this->money($data['tip_amount'] ?? 0),
            'coupon_discount' => $this->money($data['coupon_discount'] ?? 0),
            'coupon_code' => $this->nullableString($data['coupon_code'] ?? null, 191),
            'payable_amount' => $this->money($data['payable_amount'] ?? 0),
            'amount_minor' => max(0, (int)($data['amount_minor'] ?? 0)),
            'currency' => strtoupper($this->clean((string)($data['currency'] ?? 'OMR'), 3)) ?: 'OMR',
            'selected_items' => $this->json($data['selected_items'] ?? []),
            'order_allocations' => $this->json($data['order_allocations'] ?? []),
            'integration_ids' => $this->json($data['integration_ids'] ?? []),
            'financial_adjustment_state' => $this->json([]),
            'status' => 'created',
            'expires_at' => $data['expires_at'] ?? now()->addMinutes(30),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if ($insert['method_variant'] === '') {
            throw new \InvalidArgumentException('Paymob attempt requires method_variant.');
        }
        if ($insert['principal_amount'] <= 0 || $insert['payable_amount'] <= 0 || $insert['amount_minor'] <= 0) {
            throw new \InvalidArgumentException('Paymob attempt amount must be greater than zero.');
        }

        $id = (int)DB::table(self::TABLE)->insertGetId($this->filterColumns($insert));
        return $this->findById($id) ?? throw new \RuntimeException('Paymob attempt could not be reloaded.');
    }

    public function findById(int $id): ?object
    {
        $this->ensureSchema();
        return DB::table(self::TABLE)->where('id', $id)->first();
    }

    public function findByReference(string $reference): ?object
    {
        $this->ensureSchema();
        $reference = trim($reference);
        if ($reference === '') return null;
        return DB::table(self::TABLE)->where('special_reference', $reference)->first();
    }

    public function findByProviderTransaction(string|int $transactionId): ?object
    {
        $this->ensureSchema();
        $transactionId = trim((string)$transactionId);
        if ($transactionId === '') return null;
        return DB::table(self::TABLE)->where('provider_transaction_id', $transactionId)->first();
    }

    public function markProviderCallStarted(int $id): void
    {
        $this->update($id, [
            'status' => 'provider_call_started',
            'provider_call_started_at' => now(),
            'last_error' => null,
        ]);
    }

    public function markIntentionCreated(int $id, array $result): object
    {
        $response = is_array($result['response'] ?? null) ? (array)$result['response'] : [];
        $paymentKeys = is_array($response['payment_keys'] ?? null) ? $response['payment_keys'] : [];
        $firstPaymentKey = is_array($paymentKeys[0] ?? null) ? $paymentKeys[0] : [];
        $clientSecret = trim((string)($result['client_secret'] ?? $response['client_secret'] ?? ''));
        $providerOrderId = trim((string)(
            $response['intention_order_id']
            ?? $firstPaymentKey['order_id']
            ?? ''
        ));

        $safeResponse = [
            'id' => $result['id'] ?? $response['id'] ?? null,
            'status' => $result['status'] ?? $response['status'] ?? null,
            'intention_order_id' => $providerOrderId !== '' ? $providerOrderId : null,
            'special_reference' => $response['special_reference'] ?? null,
            'payment_methods' => array_values(array_map(static function ($row) {
                $row = is_array($row) ? $row : [];
                return [
                    'integration_id' => $row['integration_id'] ?? null,
                    'name' => $row['name'] ?? null,
                    'method_type' => $row['method_type'] ?? null,
                    'currency' => $row['currency'] ?? null,
                ];
            }, is_array($response['payment_methods'] ?? null) ? $response['payment_methods'] : [])),
        ];

        $this->update($id, [
            'provider_intention_id' => $this->nullableString($result['id'] ?? $response['id'] ?? null, 191),
            'provider_order_id' => $providerOrderId !== '' ? $providerOrderId : null,
            'client_secret_ciphertext' => $clientSecret !== '' ? Crypt::encryptString($clientSecret) : null,
            'provider_response' => $this->json($safeResponse),
            'last_http_status' => isset($result['http_status']) ? (int)$result['http_status'] : 201,
            'last_error' => null,
            'status' => 'intention_created',
        ]);

        return $this->findById($id) ?? throw new \RuntimeException('Paymob attempt disappeared after intention creation.');
    }

    public function markProviderFailure(int $id, array $result, bool $ambiguous = false): void
    {
        $message = trim((string)($result['message'] ?? 'Paymob request failed.'));
        $this->update($id, [
            'status' => $ambiguous ? 'reconciliation_required' : 'failed',
            'last_http_status' => isset($result['http_status']) ? (int)$result['http_status'] : null,
            'last_error' => mb_substr($message, 0, 2000),
            'provider_response' => $this->json([
                'http_status' => $result['http_status'] ?? null,
                'message' => $message,
            ]),
        ]);
    }

    public function markCallback(int $id, array $transaction, array $summary = []): void
    {
        $this->update($id, [
            'provider_transaction_id' => $this->nullableString($transaction['transaction_id'] ?? null, 191),
            'provider_order_id' => $this->nullableString($transaction['paymob_order_id'] ?? null, 191),
            'status' => (string)($transaction['status'] ?? '') === 'paid' ? 'provider_paid' : (string)($transaction['status'] ?? 'callback_received'),
            'callback_summary' => $this->json($summary + ['transaction' => $transaction]),
            'callback_received_at' => now(),
            'last_error' => null,
        ]);
    }

    public function markSettled(int $id, string|int $providerTransactionId, array $settlementResults): void
    {
        $primaryTransactionId = null;
        foreach ($settlementResults as $result) {
            if (is_array($result) && !empty($result['transaction_id'])) {
                $primaryTransactionId = (int)$result['transaction_id'];
                break;
            }
        }

        $this->update($id, [
            'provider_transaction_id' => $this->nullableString($providerTransactionId, 191),
            'canonical_transaction_id' => $primaryTransactionId,
            'status' => 'settled',
            'settled_at' => now(),
            'last_error' => null,
            'callback_summary' => $this->json(['settlements' => $settlementResults]),
        ]);
    }

    public function markReconciliation(int $id, string $status, ?string $message = null, array $summary = []): void
    {
        $this->update($id, [
            'status' => $status,
            'last_error' => $message !== null ? mb_substr(trim($message), 0, 2000) : null,
            'callback_summary' => $summary ? $this->json($summary) : null,
            'reconciled_at' => now(),
        ]);
    }

    public function clientSecret(object $attempt): string
    {
        $ciphertext = trim((string)($attempt->client_secret_ciphertext ?? ''));
        if ($ciphertext === '') return '';
        try {
            return Crypt::decryptString($ciphertext);
        } catch (\Throwable) {
            return '';
        }
    }

    public function selectedItems(object $attempt): array
    {
        return $this->decodeJson($attempt->selected_items ?? null);
    }

    public function orderAllocations(object $attempt): array
    {
        $rows = $this->decodeJson($attempt->order_allocations ?? null);
        return array_values(array_filter($rows, 'is_array'));
    }

    public function financialAdjustmentState(object $attempt): array
    {
        return $this->decodeJson($attempt->financial_adjustment_state ?? null);
    }

    public function safeState(object $attempt): array
    {
        return [
            'id' => (int)$attempt->id,
            'reference' => (string)$attempt->special_reference,
            'order_id' => (int)$attempt->order_id,
            'method_variant' => (string)$attempt->method_variant,
            'currency' => (string)$attempt->currency,
            'principal_amount' => (float)$attempt->principal_amount,
            'tip_amount' => (float)$attempt->tip_amount,
            'coupon_discount' => (float)$attempt->coupon_discount,
            'payable_amount' => (float)$attempt->payable_amount,
            'amount_minor' => (int)$attempt->amount_minor,
            'provider_intention_id' => $attempt->provider_intention_id ?? null,
            'provider_order_id' => $attempt->provider_order_id ?? null,
            'provider_transaction_id' => $attempt->provider_transaction_id ?? null,
            'status' => (string)$attempt->status,
            'settled_at' => $attempt->settled_at ?? null,
            'expires_at' => $attempt->expires_at ?? null,
        ];
    }

    private function update(int $id, array $values): void
    {
        $values['updated_at'] = now();
        DB::table(self::TABLE)->where('id', $id)->update($this->filterColumns($values));
    }

    private function filterColumns(array $values): array
    {
        return array_intersect_key($values, array_flip(Schema::getColumnListing(self::TABLE)));
    }

    private function newSpecialReference(int $orderId): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $reference = 'PMD-OM-'.$orderId.'-'.strtoupper(bin2hex(random_bytes(10)));
            if (!DB::table(self::TABLE)->where('special_reference', $reference)->exists()) return $reference;
        }
        throw new \RuntimeException('Could not allocate a unique Paymob reference.');
    }

    private function json($value): ?string
    {
        if ($value === null) return null;
        $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return $encoded === false ? null : $encoded;
    }

    private function decodeJson($value): array
    {
        if (is_array($value)) return $value;
        $decoded = json_decode((string)$value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function nullableString($value, int $max): ?string
    {
        $value = $this->clean((string)$value, $max);
        return $value !== '' ? $value : null;
    }

    private function clean(string $value, int $max): string
    {
        return mb_substr(trim($value), 0, $max);
    }

    private function money($value): float
    {
        return round(max(0, is_numeric($value) ? (float)$value : 0.0), 4);
    }
}
