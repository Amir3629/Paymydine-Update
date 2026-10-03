<?php

namespace Admin\Services\CashDrawerService;

use Admin\Models\Cash_drawers_model;
use Admin\Models\Pos_devices_model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Cashier Lab -> local drawer bridge.
 *
 * This service never makes a successful payment fail because of hardware.
 * It only queues a short-lived, deduplicated drawer command after a successful
 * cash transaction. A stale/offline workstation is rejected so a drawer can
 * never pop open minutes later when the POS reconnects.
 */
class CashDrawerSettlementBridge
{
    public static function enqueueAfterSettlement($order, int $transactionId, string $method, array $payload, string $idempotencyKey): array
    {
        if (strtolower(trim($method)) !== 'cash') {
            return self::skipped('not_cash');
        }

        // PMD_DESKTOP_HARDWARE_OWNER_R1
        // The Electron Cashier owns the local printer/drawer when this flag is
        // present. Never queue a second legacy Connector drawer command.
        if (filter_var($payload['desktop_hardware_managed'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return self::skipped('desktop_hardware_managed');
        }

        if ($transactionId < 1) {
            return self::failed('missing_transaction', 'Cash payment was recorded but no transaction id was available for drawer dedupe.');
        }

        try {
            if (!Schema::hasTable('cash_drawers')) {
                return self::skipped('cash_drawers_missing');
            }

            $locationId = self::resolveLocationId($order);
            $deviceCode = trim((string)($payload['pos_device_code'] ?? $payload['workstation_code'] ?? ''));
            $drawer = null;
            $device = null;

            if ($deviceCode !== '' && Schema::hasTable('pos_devices')) {
                $device = self::findDeviceByCode($deviceCode);
                if ($device) {
                    $drawerQuery = self::eligibleDrawerQuery($locationId)
                        ->where(function ($query) use ($device) {
                            $query->where('local_pos_device_id', (int)$device->device_id)
                                ->orWhere('pos_device_id', (int)$device->device_id);
                        });
                    $drawer = $drawerQuery->orderBy('drawer_id')->first();
                }
            }

            if (!$drawer) {
                $candidates = self::eligibleDrawerQuery($locationId)->orderBy('drawer_id')->get();
                if ($candidates->count() === 0) {
                    return self::skipped('no_enabled_auto_open_drawer');
                }
                if ($candidates->count() > 1) {
                    return self::failed(
                        'ambiguous_drawer_mapping',
                        'Cash payment was recorded, but more than one auto-open drawer exists and this cashier workstation was not mapped.'
                    );
                }
                $drawer = $candidates->first();
            }

            $targetDeviceId = (int)($drawer->local_pos_device_id ?: $drawer->pos_device_id);
            if ($targetDeviceId < 1 || !Schema::hasTable('pos_devices')) {
                return self::failed('drawer_not_paired', 'Cash payment was recorded, but this drawer is not paired with a local POS terminal.');
            }

            if (!$device || (int)$device->device_id !== $targetDeviceId) {
                $device = Pos_devices_model::find($targetDeviceId);
            }
            if (!$device) {
                return self::failed('pos_device_missing', 'Cash payment was recorded, but the paired POS device could not be found.');
            }

            if (!self::isFresh($device)) {
                return self::failed(
                    'agent_offline',
                    'Cash payment was recorded, but the PayMyDine hardware connector is offline. Open the drawer manually.'
                );
            }

            $expiry = max(5, (int)config('cashdrawer.cash_open_expiry_seconds', 20));
            $result = LocalPosHardwareCommandService::queueOpenDrawer($drawer, [
                'order_id' => (int)($order->order_id ?? $order->getKey() ?? 0),
                'transaction_id' => $transactionId,
                'payment_idempotency_key' => $idempotencyKey,
                'dedupe_key' => 'cash-payment:'.$transactionId,
                'expires_in_seconds' => $expiry,
                'trigger_method' => 'cash_payment',
                'pos_device_code' => $deviceCode !== '' ? $deviceCode : ($device->device_code ?? $device->code ?? null),
            ]);

            if (empty($result['success'])) {
                return self::failed('queue_failed', (string)($result['message'] ?? 'Unable to queue drawer command.'), [
                    'drawer_id' => (int)$drawer->drawer_id,
                    'pos_device_id' => $targetDeviceId,
                ]);
            }

            return [
                'ok' => true,
                'queued' => true,
                'skipped' => false,
                'duplicate' => !empty($result['duplicate']),
                'reason' => null,
                'message' => 'Cash drawer command queued.',
                'command_id' => isset($result['command_id']) ? (int)$result['command_id'] : null,
                'drawer_id' => (int)$drawer->drawer_id,
                'pos_device_id' => $targetDeviceId,
            ];
        } catch (\Throwable $error) {
            Log::error('PMD cash settlement drawer bridge failed', [
                'transaction_id' => $transactionId,
                'message' => $error->getMessage(),
            ]);

            return self::failed('exception', 'Cash payment was recorded, but the drawer command could not be prepared.');
        }
    }

    protected static function eligibleDrawerQuery(int $locationId)
    {
        $query = Cash_drawers_model::query()
            ->where('status', true)
            ->where('auto_open_on_cash', true);

        if ($locationId > 0) {
            $query->where('location_id', $locationId);
        }

        return $query;
    }

    protected static function resolveLocationId($order): int
    {
        foreach (['location_id', 'locationId'] as $field) {
            if (isset($order->{$field}) && (int)$order->{$field} > 0) {
                return (int)$order->{$field};
            }
        }

        try {
            $adminLocation = app()->bound('admin.location') ? app('admin.location') : null;
            if ($adminLocation && method_exists($adminLocation, 'getId')) {
                return (int)$adminLocation->getId();
            }
        } catch (\Throwable $ignored) {
        }

        return 0;
    }

    protected static function findDeviceByCode(string $deviceCode): ?Pos_devices_model
    {
        $query = Pos_devices_model::query();
        $hasDeviceCode = Schema::hasColumn('pos_devices', 'device_code');
        $hasCode = Schema::hasColumn('pos_devices', 'code');

        if ($hasDeviceCode && $hasCode) {
            $query->where(function ($q) use ($deviceCode) {
                $q->where('device_code', $deviceCode)->orWhere('code', $deviceCode);
            });
        } elseif ($hasDeviceCode) {
            $query->where('device_code', $deviceCode);
        } elseif ($hasCode) {
            $query->where('code', $deviceCode);
        } else {
            return null;
        }

        if (Schema::hasColumn('pos_devices', 'is_local_terminal')) {
            $query->where('is_local_terminal', true);
        }

        return $query->first();
    }

    protected static function isFresh(Pos_devices_model $device): bool
    {
        if (empty($device->last_seen_at)) {
            return false;
        }

        try {
            $seen = $device->last_seen_at instanceof Carbon
                ? $device->last_seen_at
                : Carbon::parse($device->last_seen_at);
            $maxAge = max(5, (int)config('cashdrawer.cash_agent_fresh_seconds', 15));
            return $seen->diffInSeconds(now(), false) <= $maxAge && $seen->lte(now());
        } catch (\Throwable $ignored) {
            return false;
        }
    }

    protected static function skipped(string $reason): array
    {
        return [
            'ok' => true,
            'queued' => false,
            'skipped' => true,
            'duplicate' => false,
            'reason' => $reason,
            'message' => null,
        ];
    }

    protected static function failed(string $reason, string $message, array $extra = []): array
    {
        return array_merge([
            'ok' => false,
            'queued' => false,
            'skipped' => false,
            'duplicate' => false,
            'reason' => $reason,
            'message' => $message,
        ], $extra);
    }
}
