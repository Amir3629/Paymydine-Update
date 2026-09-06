<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;

/**
 * Durable outbox/inbox-style event state for the future PMD Edge runtime.
 * Transport is intentionally not implemented here; this service provides the
 * idempotent local/cloud contract used by an edge agent.
 */
final class TurkeyEdgeEventService
{
    public function __construct(private ?TurkeyTenantContext $context = null)
    {
        $this->context = $context ?: new TurkeyTenantContext();
    }

    public function enqueue(array $event, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $eventId = trim((string)($event['event_id'] ?? ''));
        $idempotencyKey = trim((string)($event['idempotency_key'] ?? ''));
        if ($eventId === '' || $idempotencyKey === '') {
            throw new \InvalidArgumentException('event_id and idempotency_key are required.');
        }

        $existing = DB::table('pmd_tr_edge_events')
            ->where('event_id', $eventId)
            ->orWhere('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) return $this->serialize($existing, true);

        $id = (int)DB::table('pmd_tr_edge_events')->insertGetId([
            'event_id' => $eventId,
            'location_id' => (int)($state['location_id'] ?? 0),
            'aggregate' => (string)($event['aggregate'] ?? ''),
            'aggregate_id' => (string)($event['aggregate_id'] ?? ''),
            'aggregate_version' => (int)($event['aggregate_version'] ?? 0),
            'event_type' => (string)($event['event_type'] ?? ''),
            'device_id' => $event['device_id'] ?? null,
            'idempotency_key' => $idempotencyKey,
            'payload_json' => json_encode((array)($event['payload'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'sync_status' => 'PENDING',
            'retry_count' => 0,
            'created_at_local' => $event['created_at_local'] ?? now(),
            'updated_at' => now(),
        ]);

        return $this->serialize(DB::table('pmd_tr_edge_events')->where('id', $id)->first(), false);
    }

    public function pending(?int $locationId = null, int $limit = 100): array
    {
        $state = $this->context->requireTurkey($locationId);
        $rows = DB::table('pmd_tr_edge_events')
            ->where('location_id', (int)($state['location_id'] ?? 0))
            ->whereIn('sync_status', ['PENDING', 'RETRY'])
            ->orderBy('id')
            ->limit(max(1, min(500, $limit)))
            ->get();
        return array_map(fn ($row) => $this->serialize($row, false), $rows->all());
    }

    public function acknowledge(string $eventId, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $row = DB::table('pmd_tr_edge_events')
            ->where('location_id', (int)($state['location_id'] ?? 0))
            ->where('event_id', $eventId)
            ->first();
        if (!$row) throw new \RuntimeException('Unknown edge event.');

        DB::table('pmd_tr_edge_events')->where('id', $row->id)->update([
            'sync_status' => 'ACKED',
            'acked_at' => now(),
            'updated_at' => now(),
        ]);
        return $this->serialize(DB::table('pmd_tr_edge_events')->where('id', $row->id)->first(), false);
    }

    public function markRetry(string $eventId, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $row = DB::table('pmd_tr_edge_events')
            ->where('location_id', (int)($state['location_id'] ?? 0))
            ->where('event_id', $eventId)
            ->first();
        if (!$row) throw new \RuntimeException('Unknown edge event.');

        DB::table('pmd_tr_edge_events')->where('id', $row->id)->update([
            'sync_status' => 'RETRY',
            'retry_count' => ((int)$row->retry_count) + 1,
            'updated_at' => now(),
        ]);
        return $this->serialize(DB::table('pmd_tr_edge_events')->where('id', $row->id)->first(), false);
    }

    private function serialize($row, bool $duplicate): array
    {
        return [
            'id' => (int)$row->id,
            'event_id' => (string)$row->event_id,
            'location_id' => (int)$row->location_id,
            'aggregate' => (string)$row->aggregate,
            'aggregate_id' => (string)$row->aggregate_id,
            'aggregate_version' => (int)$row->aggregate_version,
            'event_type' => (string)$row->event_type,
            'status' => (string)$row->sync_status,
            'retry_count' => (int)$row->retry_count,
            'duplicate' => $duplicate,
        ];
    }
}
