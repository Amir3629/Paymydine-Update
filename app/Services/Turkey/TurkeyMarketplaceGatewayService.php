<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Provider-neutral inbox for Turkish delivery marketplaces.
 *
 * Network adapters should authenticate/verify webhooks first, then pass a
 * normalized payload here. This class does not pretend private partner API
 * credentials exist and therefore performs no outbound provider calls.
 */
final class TurkeyMarketplaceGatewayService
{
    private const SUPPORTED = ['yemeksepeti', 'uber_trendyol_go'];

    public function __construct(private ?TurkeyTenantContext $context = null)
    {
        $this->context = $context ?: new TurkeyTenantContext();
    }

    public function ingest(string $provider, array $payload, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $provider = strtolower(trim($provider));
        if (!in_array($provider, self::SUPPORTED, true)) {
            throw new \InvalidArgumentException('Unsupported Türkiye marketplace provider: '.$provider);
        }
        if (!Schema::hasTable('pmd_tr_marketplace_orders')) {
            throw new \RuntimeException('Türkiye marketplace foundation is not provisioned.');
        }

        $externalOrderId = trim((string)($payload['external_order_id'] ?? ''));
        if ($externalOrderId === '') throw new \InvalidArgumentException('external_order_id is required.');

        $locationId = (int)($state['location_id'] ?? 0);
        $rawHash = hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');
        $where = ['provider' => $provider, 'external_order_id' => $externalOrderId];
        $existing = DB::table('pmd_tr_marketplace_orders')->where($where)->first();

        if ($existing && (string)($existing->raw_payload_hash ?? '') === $rawHash) {
            return ['ok' => true, 'duplicate' => true, 'id' => (int)$existing->id, 'order_id' => $existing->order_id ?? null];
        }

        $values = [
            'location_id' => $locationId,
            'external_store_id' => $this->nullable($payload['external_store_id'] ?? null),
            'order_id' => isset($payload['order_id']) ? (int)$payload['order_id'] : null,
            'channel' => $payload['channel'] ?? $provider,
            'status' => (string)($payload['status'] ?? 'RECEIVED'),
            'fulfillment_mode' => $this->nullable($payload['fulfillment_mode'] ?? null),
            'courier_mode' => $this->nullable($payload['courier_mode'] ?? null),
            'gross_amount' => (float)($payload['gross_amount'] ?? 0),
            'platform_discount' => (float)($payload['platform_discount'] ?? 0),
            'restaurant_discount' => (float)($payload['restaurant_discount'] ?? 0),
            'delivery_fee' => (float)($payload['delivery_fee'] ?? 0),
            'commission_estimate' => (float)($payload['commission_estimate'] ?? 0),
            'payment_method' => $this->nullable($payload['payment_method'] ?? null),
            'fiscal_order_id' => $this->nullable($payload['fiscal_order_id'] ?? null),
            'customer_reference' => $this->nullable($payload['customer_reference'] ?? null),
            'order_created_at' => $payload['order_created_at'] ?? null,
            'accepted_at' => $payload['accepted_at'] ?? null,
            'promised_at' => $payload['promised_at'] ?? null,
            'raw_payload_hash' => $rawHash,
            'updated_at' => now(),
        ];

        if ($existing) {
            DB::table('pmd_tr_marketplace_orders')->where('id', $existing->id)->update($values);
            $id = (int)$existing->id;
        } else {
            $values['provider'] = $provider;
            $values['external_order_id'] = $externalOrderId;
            $values['created_at'] = now();
            $id = (int)DB::table('pmd_tr_marketplace_orders')->insertGetId($values);
        }

        return ['ok' => true, 'duplicate' => false, 'id' => $id, 'provider' => $provider, 'external_order_id' => $externalOrderId];
    }

    public function recordSettlement(string $provider, array $line, ?int $locationId = null): int
    {
        $state = $this->context->requireTurkey($locationId);
        if (!Schema::hasTable('pmd_tr_marketplace_settlements')) throw new \RuntimeException('Türkiye marketplace settlement table is missing.');

        return (int)DB::table('pmd_tr_marketplace_settlements')->insertGetId([
            'location_id' => (int)($state['location_id'] ?? 0),
            'provider' => strtolower(trim($provider)),
            'external_order_id' => (string)($line['external_order_id'] ?? ''),
            'fee_type' => (string)($line['fee_type'] ?? 'unknown'),
            'gross' => (float)($line['gross'] ?? 0),
            'tax' => (float)($line['tax'] ?? 0),
            'net' => (float)($line['net'] ?? 0),
            'payment_batch' => $this->nullable($line['payment_batch'] ?? null),
            'settlement_date' => $line['settlement_date'] ?? null,
            'source_reference' => $this->nullable($line['source_reference'] ?? null),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function nullable($value): ?string
    {
        $value = trim((string)$value);
        return $value === '' ? null : $value;
    }
}
