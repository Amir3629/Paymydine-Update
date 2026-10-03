<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Turkey-native customer/loyalty state with explicit consent separation.
 */
final class TurkeyLoyaltyService
{
    public function __construct(private ?TurkeyTenantContext $context = null)
    {
        $this->context = $context ?: new TurkeyTenantContext();
    }

    public function ensureCustomer(array $data, ?int $locationId = null): array
    {
        $this->context->requireTurkey($locationId);
        if (!Schema::hasTable('pmd_tr_customers')) throw new \RuntimeException('Türkiye CRM foundation is not provisioned.');

        $phone = $this->normalizePhone($data['phone'] ?? null);
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $query = DB::table('pmd_tr_customers');
        if ($phone !== null) $query->where('normalized_phone', $phone);
        elseif ($email !== '') $query->where('email', $email);
        else throw new \InvalidArgumentException('phone or email is required.');

        $existing = $query->first();
        $values = [
            'locale' => (string)($data['locale'] ?? 'tr'),
            'last_seen_at' => now(),
            'updated_at' => now(),
        ];
        if ($phone !== null) $values['normalized_phone'] = $phone;
        if ($email !== '') $values['email'] = $email;
        if (isset($data['birthday_month_day'])) $values['birthday_month_day'] = (string)$data['birthday_month_day'];

        if ($existing) {
            DB::table('pmd_tr_customers')->where('id', $existing->id)->update($values);
            return ['ok' => true, 'created' => false, 'customer_id' => (int)$existing->id];
        }

        $values['first_seen_at'] = now();
        $values['created_at'] = now();
        $id = (int)DB::table('pmd_tr_customers')->insertGetId($values);
        return ['ok' => true, 'created' => true, 'customer_id' => $id];
    }

    public function markPhoneVerified(int $customerId, string $normalizedPhone): void
    {
        $this->context->requireTurkey();
        DB::table('pmd_tr_customers')->where('id', $customerId)->update([
            'normalized_phone' => $this->normalizePhone($normalizedPhone),
            'verified_phone_hash' => hash('sha256', $this->normalizePhone($normalizedPhone) ?: ''),
            'updated_at' => now(),
        ]);
    }

    public function recordConsent(int $customerId, array $consent): int
    {
        $this->context->requireTurkey();
        $channel = strtoupper(trim((string)($consent['channel'] ?? '')));
        if (!in_array($channel, ['SMS', 'EMAIL', 'WHATSAPP', 'CALL'], true)) {
            throw new \InvalidArgumentException('Unsupported consent channel.');
        }
        $status = strtoupper(trim((string)($consent['status'] ?? 'PENDING')));
        if (!in_array($status, ['GRANTED', 'REVOKED', 'PENDING'], true)) {
            throw new \InvalidArgumentException('Unsupported consent status.');
        }

        $id = DB::table('pmd_tr_communication_consents')->insertGetId([
            'customer_id' => $customerId,
            'brand_legal_entity' => (string)($consent['brand_legal_entity'] ?? ''),
            'channel' => $channel,
            'purpose' => strtoupper((string)($consent['purpose'] ?? 'MARKETING')),
            'status' => $status,
            'evidence' => isset($consent['evidence']) ? (string)$consent['evidence'] : null,
            'source' => isset($consent['source']) ? (string)$consent['source'] : null,
            'iys_status' => isset($consent['iys_status']) ? (string)$consent['iys_status'] : null,
            'obtained_at' => $status === 'GRANTED' ? ($consent['obtained_at'] ?? now()) : null,
            'revoked_at' => $status === 'REVOKED' ? ($consent['revoked_at'] ?? now()) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return (int)$id;
    }

    public function canMarket(int $customerId, string $channel, string $brandLegalEntity): bool
    {
        $this->context->requireTurkey();
        $row = DB::table('pmd_tr_communication_consents')
            ->where('customer_id', $customerId)
            ->where('channel', strtoupper($channel))
            ->where('brand_legal_entity', $brandLegalEntity)
            ->where('purpose', 'MARKETING')
            ->orderByDesc('id')
            ->first();
        return $row && strtoupper((string)$row->status) === 'GRANTED';
    }

    public function ensureAccount(int $customerId, string $programCode = 'default'): int
    {
        $this->context->requireTurkey();
        $row = DB::table('pmd_tr_loyalty_accounts')
            ->where('customer_id', $customerId)
            ->where('program_code', $programCode)
            ->first();
        if ($row) return (int)$row->id;

        return (int)DB::table('pmd_tr_loyalty_accounts')->insertGetId([
            'customer_id' => $customerId,
            'program_code' => $programCode,
            'active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function addPoints(int $accountId, float $delta, string $reason, string $idempotencyKey, ?int $orderId = null, $expiresAt = null): array
    {
        $this->context->requireTurkey();
        $existing = DB::table('pmd_tr_loyalty_points')->where('idempotency_key', $idempotencyKey)->first();
        if ($existing) return ['ok' => true, 'duplicate' => true, 'id' => (int)$existing->id, 'balance' => $this->balance($accountId)];

        $id = (int)DB::table('pmd_tr_loyalty_points')->insertGetId([
            'account_id' => $accountId,
            'delta' => $delta,
            'reason' => $reason,
            'order_id' => $orderId,
            'idempotency_key' => $idempotencyKey,
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['ok' => true, 'duplicate' => false, 'id' => $id, 'balance' => $this->balance($accountId)];
    }

    public function balance(int $accountId): float
    {
        $this->context->requireTurkey();
        return (float)DB::table('pmd_tr_loyalty_points')
            ->where('account_id', $accountId)
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->sum('delta');
    }

    private function normalizePhone($phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string)$phone);
        if (!$digits) return null;
        if (substr($digits, 0, 2) === '90') return '+'.$digits;
        if (substr($digits, 0, 1) === '0') return '+90'.substr($digits, 1);
        if (strlen($digits) === 10) return '+90'.$digits;
        return '+'.$digits;
    }
}
