<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;

/**
 * PMD-side evidence/state around the authoritative YN ÖKC fiscal record.
 * PMD never fabricates fiscal success: FISCALIZED requires an external fiscal
 * identifier/document reference produced by the configured fiscal ecosystem.
 */
final class TurkeyFiscalStateService
{
    private const STATES = [
        'ORDER_OPEN',
        'ORDER_PREPARING',
        'ORDER_AWAITING_FISCAL',
        'FISCAL_OPEN',
        'PAYMENT_PENDING',
        'PAYMENT_APPROVED_FISCAL_PENDING',
        'FISCALIZED',
        'SETTLED',
        'FISCAL_FAILED_REQUIRES_STAFF',
    ];

    public function __construct(private ?TurkeyTenantContext $context = null)
    {
        $this->context = $context ?: new TurkeyTenantContext();
    }

    public function open(int $orderId, array $amounts = [], ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $locationId = (int)($state['location_id'] ?? 0);
        $existing = DB::table('pmd_tr_fiscal_transactions')->where('order_id', $orderId)->where('location_id', $locationId)->first();
        if ($existing) return $this->serialize($existing);

        $id = DB::table('pmd_tr_fiscal_transactions')->insertGetId([
            'order_id' => $orderId,
            'location_id' => $locationId,
            'transaction_state' => 'ORDER_OPEN',
            'gross' => (float)($amounts['gross'] ?? 0),
            'vat_breakdown_json' => json_encode((array)($amounts['vat_breakdown'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'payment_allocation_json' => json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return $this->serialize(DB::table('pmd_tr_fiscal_transactions')->where('id', $id)->first());
    }

    public function attachFiscalOpen(int $orderId, array $evidence, ?int $locationId = null): array
    {
        $row = $this->row($orderId, $locationId);
        $fiscalUniqueId = trim((string)($evidence['fiscal_unique_id'] ?? ''));
        $deviceSerial = trim((string)($evidence['yn_okc_serial'] ?? ''));
        if ($fiscalUniqueId === '' || $deviceSerial === '') {
            throw new \InvalidArgumentException('Fiscal unique ID and YN ÖKC serial are required.');
        }
        return $this->update($row, 'FISCAL_OPEN', [
            'fiscal_provider' => $evidence['fiscal_provider'] ?? null,
            'fiscal_device_id' => $evidence['fiscal_device_id'] ?? null,
            'fiscal_unique_id' => $fiscalUniqueId,
            'yn_okc_serial' => $deviceSerial,
            'external_order_number' => $evidence['external_order_number'] ?? null,
        ]);
    }

    public function markPaymentPending(int $orderId, array $allocation = [], ?int $locationId = null): array
    {
        $row = $this->row($orderId, $locationId);
        return $this->update($row, 'PAYMENT_PENDING', [
            'payment_allocation_json' => json_encode($allocation, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    public function markPaymentApproved(int $orderId, array $paymentEvidence, ?int $locationId = null): array
    {
        $row = $this->row($orderId, $locationId);
        if (trim((string)($paymentEvidence['provider_reference'] ?? '')) === '') {
            throw new \InvalidArgumentException('provider_reference is required for approved payment evidence.');
        }
        $allocation = json_decode((string)($row->payment_allocation_json ?? ''), true) ?: [];
        $allocation['provider_evidence'] = $paymentEvidence;
        return $this->update($row, 'PAYMENT_APPROVED_FISCAL_PENDING', [
            'payment_allocation_json' => json_encode($allocation, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    public function markFiscalized(int $orderId, array $fiscalEvidence, ?int $locationId = null): array
    {
        $row = $this->row($orderId, $locationId);
        $documentNumber = trim((string)($fiscalEvidence['fiscal_document_number'] ?? ''));
        $documentType = trim((string)($fiscalEvidence['fiscal_document_type'] ?? ''));
        if ($documentNumber === '' || $documentType === '') {
            throw new \InvalidArgumentException('Fiscal document type and number are required; PMD cannot fabricate fiscal success.');
        }
        return $this->update($row, 'FISCALIZED', [
            'fiscal_document_type' => $documentType,
            'fiscal_document_number' => $documentNumber,
            'fiscal_references_json' => json_encode((array)($fiscalEvidence['references'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'fiscalized_at' => $fiscalEvidence['fiscalized_at'] ?? now(),
        ]);
    }

    public function settle(int $orderId, ?int $locationId = null): array
    {
        $row = $this->row($orderId, $locationId);
        if ((string)$row->transaction_state !== 'FISCALIZED') {
            throw new \RuntimeException('A Türkiye order cannot be SETTLED before authoritative fiscalization evidence exists.');
        }
        return $this->update($row, 'SETTLED');
    }

    public function failForStaff(int $orderId, string $reason, ?int $locationId = null): array
    {
        $row = $this->row($orderId, $locationId);
        $refs = json_decode((string)($row->fiscal_references_json ?? ''), true) ?: [];
        $refs['last_failure'] = ['reason' => $reason, 'at' => (string)now()];
        return $this->update($row, 'FISCAL_FAILED_REQUIRES_STAFF', [
            'fiscal_references_json' => json_encode($refs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    private function row(int $orderId, ?int $locationId)
    {
        $state = $this->context->requireTurkey($locationId);
        $row = DB::table('pmd_tr_fiscal_transactions')
            ->where('order_id', $orderId)
            ->where('location_id', (int)($state['location_id'] ?? 0))
            ->first();
        if (!$row) throw new \RuntimeException('Fiscal transaction has not been opened for this order.');
        return $row;
    }

    private function update($row, string $state, array $fields = []): array
    {
        if (!in_array($state, self::STATES, true)) throw new \InvalidArgumentException('Unknown fiscal state.');
        $fields['transaction_state'] = $state;
        $fields['updated_at'] = now();
        DB::table('pmd_tr_fiscal_transactions')->where('id', $row->id)->update($fields);
        return $this->serialize(DB::table('pmd_tr_fiscal_transactions')->where('id', $row->id)->first());
    }

    private function serialize($row): array
    {
        return [
            'id' => (int)$row->id,
            'order_id' => (int)$row->order_id,
            'location_id' => (int)$row->location_id,
            'state' => (string)$row->transaction_state,
            'fiscal_unique_id' => $row->fiscal_unique_id ?? null,
            'yn_okc_serial' => $row->yn_okc_serial ?? null,
            'fiscal_document_type' => $row->fiscal_document_type ?? null,
            'fiscal_document_number' => $row->fiscal_document_number ?? null,
            'fiscalized_at' => $row->fiscalized_at ?? null,
        ];
    }
}
