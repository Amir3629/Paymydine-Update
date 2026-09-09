<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Local PMD registry for Türkiye payment acceptance endpoints.
 *
 * A terminal row represents an endpoint, not a payment method. Hardware vendor,
 * bank/provider, acceptance channel and fiscal mode are stored independently.
 */
final class TurkeyTerminalRegistryService
{
    public function __construct(private ?TurkeyTenantContext $context = null)
    {
        $this->context = $context ?: new TurkeyTenantContext();
    }

    public function all(?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $locationId = (int)($state['location_id'] ?? 0);
        if (!Schema::hasTable('terminal_devices')) return [];

        $query = DB::table('terminal_devices');
        if (Schema::hasColumn('terminal_devices', 'location_id') && $locationId > 0) {
            $query->where(function ($q) use ($locationId) {
                $q->where('location_id', $locationId)->orWhereNull('location_id');
            });
        }

        return $query->orderBy('terminal_device_id')->get()->map(function ($row) {
            $meta = json_decode((string)($row->metadata ?? '{}'), true) ?: [];
            if (($meta['market_country'] ?? '') !== 'TR') return null;

            return [
                'terminal_device_id' => (int)($row->terminal_device_id ?? 0),
                'provider_code' => (string)($row->provider_code ?? ''),
                'reader_id' => (string)($row->reader_id ?? ''),
                'reader_label' => (string)($row->reader_label ?? ''),
                'pairing_state' => (string)($row->pairing_state ?? 'unknown'),
                'terminal_status' => (string)($row->terminal_status ?? 'unknown'),
                'environment' => (string)($row->environment ?? 'uat'),
                'is_active' => (bool)($row->is_active ?? false),
                'provider_terminal_id' => $row->provider_terminal_id ?? null,
                'serial_number' => $row->serial_number ?? null,
                'hardware_manufacturer' => (string)($meta['hardware_manufacturer'] ?? ''),
                'hardware_model' => (string)($meta['hardware_model'] ?? ''),
                'acceptance_channel' => (string)($meta['acceptance_channel'] ?? 'physical_terminal'),
                'fiscal_mode' => (string)($meta['fiscal_mode'] ?? 'yn_okc'),
                'fiscal_device_serial' => (string)($meta['fiscal_device_serial'] ?? ''),
                'provider_product' => (string)($meta['provider_product'] ?? ''),
                'remote_sync_status' => (string)($meta['remote_sync_status'] ?? 'not_synced'),
                'verification_reference' => (string)($meta['verification_reference'] ?? ''),
                'verified_at' => $meta['verified_at'] ?? null,
            ];
        })->filter()->values()->all();
    }

    public function save(array $input, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $locationId = (int)($state['location_id'] ?? 0);
        if (!Schema::hasTable('terminal_devices')) throw new \RuntimeException('terminal_devices table is missing.');

        $channel = strtolower(trim((string)($input['acceptance_channel'] ?? 'physical_terminal')));
        if (!in_array($channel, ['physical_terminal', 'softpos'], true)) {
            throw new \InvalidArgumentException('Unsupported Türkiye terminal acceptance channel.');
        }

        $fiscalMode = strtolower(trim((string)($input['fiscal_mode'] ?? 'yn_okc')));
        if (!in_array($fiscalMode, ['yn_okc', 'gmoebys'], true)) {
            throw new \InvalidArgumentException('Unsupported Türkiye fiscal mode.');
        }

        $provider = strtolower(trim((string)($input['provider_code'] ?? 'isbank')));
        $readerId = trim((string)($input['reader_id'] ?? ''));
        if ($readerId === '') {
            $readerId = 'PMD-TR-'.strtoupper($provider).'-'.strtoupper(substr(hash('sha256', json_encode([
                $locationId, $channel, $input['hardware_manufacturer'] ?? '', $input['hardware_model'] ?? '', microtime(true)
            ])), 0, 12));
        }

        $meta = [
            'market_country' => 'TR',
            'hardware_manufacturer' => trim((string)($input['hardware_manufacturer'] ?? '')),
            'hardware_model' => trim((string)($input['hardware_model'] ?? '')),
            'acceptance_channel' => $channel,
            'fiscal_mode' => $fiscalMode,
            'fiscal_device_serial' => trim((string)($input['fiscal_device_serial'] ?? '')),
            'provider_product' => trim((string)($input['provider_product'] ?? '')),
            'remote_sync_status' => 'not_synced',
            'note' => trim((string)($input['note'] ?? '')),
        ];

        $columns = Schema::getColumnListing('terminal_devices');
        $payload = [
            'provider_code' => $provider,
            'reader_id' => $readerId,
            'reader_label' => trim((string)($input['reader_label'] ?? '')) ?: 'Türkiye payment endpoint',
            'pairing_state' => 'unpaired',
            'terminal_status' => 'configured_not_verified',
            'metadata' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'is_active' => 0,
        ];
        if (in_array('location_id', $columns, true)) $payload['location_id'] = $locationId ?: null;
        if (in_array('environment', $columns, true)) {
            $payload['environment'] = strtolower(trim((string)($input['environment'] ?? 'uat'))) === 'production' ? 'production' : 'uat';
        }
        if (in_array('provider_terminal_id', $columns, true)) $payload['provider_terminal_id'] = trim((string)($input['provider_terminal_id'] ?? '')) ?: null;
        if (in_array('serial_number', $columns, true)) $payload['serial_number'] = trim((string)($input['serial_number'] ?? '')) ?: null;
        if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();

        $existing = DB::table('terminal_devices')->where('reader_id', $readerId)->first();
        if ($existing) {
            DB::table('terminal_devices')->where('terminal_device_id', $existing->terminal_device_id)->update($payload);
            $id = (int)$existing->terminal_device_id;
        } else {
            if (in_array('created_at', $columns, true)) $payload['created_at'] = now();
            $id = (int)DB::table('terminal_devices')->insertGetId($payload);
        }

        return $this->findInAll($id, $locationId);
    }

    public function markVerified(int $terminalDeviceId, array $evidence, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $locationId = (int)($state['location_id'] ?? 0);
        $row = DB::table('terminal_devices')->where('terminal_device_id', $terminalDeviceId)->first();
        if (!$row) throw new \RuntimeException('Türkiye payment endpoint not found.');

        $approval = strtolower(trim((string)($evidence['external_approval_status'] ?? '')));
        $reference = trim((string)($evidence['verification_reference'] ?? ''));
        if (!in_array($approval, ['approved', 'active', 'certified'], true) || $reference === '') {
            throw new \RuntimeException('Endpoint activation requires approved/active/certified external evidence and a verification reference.');
        }

        $meta = json_decode((string)($row->metadata ?? '{}'), true) ?: [];
        if (($meta['market_country'] ?? '') !== 'TR') throw new \RuntimeException('Endpoint is not a Türkiye endpoint.');
        $meta['verification_reference'] = $reference;
        $meta['verified_at'] = now()->toIso8601String();
        $meta['remote_sync_status'] = trim((string)($evidence['remote_sync_status'] ?? 'verified')) ?: 'verified';

        $payload = [
            'pairing_state' => 'paired',
            'terminal_status' => 'verified',
            'metadata' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'is_active' => 1,
        ];
        if (Schema::hasColumn('terminal_devices', 'provider_terminal_id') && !empty($evidence['provider_terminal_id'])) {
            $payload['provider_terminal_id'] = trim((string)$evidence['provider_terminal_id']);
        }
        if (Schema::hasColumn('terminal_devices', 'updated_at')) $payload['updated_at'] = now();

        DB::table('terminal_devices')->where('terminal_device_id', $terminalDeviceId)->update($payload);
        return $this->findInAll($terminalDeviceId, $locationId);
    }

    public function disable(int $terminalDeviceId, ?int $locationId = null, ?string $reason = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $locationId = (int)($state['location_id'] ?? 0);
        $row = DB::table('terminal_devices')->where('terminal_device_id', $terminalDeviceId)->first();
        if (!$row) throw new \RuntimeException('Türkiye payment endpoint not found.');
        $meta = json_decode((string)($row->metadata ?? '{}'), true) ?: [];
        $meta['disabled_reason'] = trim((string)$reason);
        $payload = [
            'terminal_status' => 'disabled',
            'is_active' => 0,
            'metadata' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ];
        if (Schema::hasColumn('terminal_devices', 'updated_at')) $payload['updated_at'] = now();
        DB::table('terminal_devices')->where('terminal_device_id', $terminalDeviceId)->update($payload);
        return $this->findInAll($terminalDeviceId, $locationId);
    }

    private function findInAll(int $id, int $locationId): array
    {
        foreach ($this->all($locationId) as $row) {
            if ((int)$row['terminal_device_id'] === $id) return $row;
        }
        throw new \RuntimeException('Türkiye terminal configuration was saved but could not be reloaded.');
    }
}
