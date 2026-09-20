<?php

namespace App\Services\PmdMobileSync;

use Admin\Controllers\KitchenDisplay;
use Admin\Controllers\PmdWaiterPosV1;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * PMD_MOBILE_COMMAND_PROCESSOR_V1
 *
 * Exactly-once transport wrapper around existing canonical POS persistence.
 * A command row, business mutation, aggregate-version bump and emitted event
 * commit in one tenant-database transaction.
 */
final class PmdMobileCommandProcessor
{
    private const PROTOCOL = 'pmd-sync-v1';

    public function execute(array $identity, array $input): array
    {
        $this->assertSchema();

        $command = $this->normalize($identity, $input);

        try {
            return DB::transaction(function () use ($identity, $command) {
                $existing = $this->findExistingCommand(
                    $command['command_id'],
                    $command['idempotency_key']
                );

                if ($existing) {
                    return $this->replayExisting($existing, $command);
                }

                $inserted = DB::table('pmd_sync_commands')->insertOrIgnore([
                    'command_id' => $command['command_id'],
                    'idempotency_key' => $command['idempotency_key'],
                    'request_hash' => $command['request_hash'],
                    'location_id' => $command['location_id'],
                    'device_id' => $command['device_id'],
                    'user_id' => $command['user_id'],
                    'staff_id' => $command['staff_id'],
                    'aggregate' => $command['aggregate'],
                    'aggregate_id' => $command['aggregate_id'],
                    'base_version' => $command['base_version'],
                    'command_type' => $command['command_type'],
                    'payload' => json_encode(
                        $command['payload'],
                        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                    ),
                    'status' => 'PROCESSING',
                    'received_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (!$inserted) {
                    $existing = $this->findExistingCommand(
                        $command['command_id'],
                        $command['idempotency_key'],
                        true
                    );

                    if (!$existing) {
                        throw new \RuntimeException(
                            'The idempotent command could not be acquired.'
                        );
                    }

                    return $this->replayExisting($existing, $command);
                }

                $ledger = DB::table('pmd_sync_commands')
                    ->where('command_id', $command['command_id'])
                    ->lockForUpdate()
                    ->first();

                if (!$ledger) {
                    throw new \RuntimeException(
                        'The PayMyDine command ledger row disappeared.'
                    );
                }

                $versionKey = $this->versionKey($command);
                $currentVersion = $this->lockAggregateVersion(
                    $command['location_id'],
                    $versionKey
                );

                if ($currentVersion !== $command['base_version']) {
                    DB::table('pmd_sync_commands')
                        ->where('id', (int)$ledger->id)
                        ->update([
                            'status' => 'REJECTED',
                            'error_code' => 'aggregate_version_conflict',
                            'result_payload' => json_encode([
                                'ok' => false,
                                'error' => 'aggregate_version_conflict',
                                'expected_version' => $currentVersion,
                                'received_version' => $command['base_version'],
                            ]),
                            'rejected_at' => now(),
                            'updated_at' => now(),
                        ]);

                    abort(
                        409,
                        'This order changed on another device. Refresh before sending.'
                    );
                }

                $result = $this->applyCommand($identity, $command);
                $newVersion = $currentVersion + 1;
                $canonicalAggregateId = 'order:'.(int)$result['order_id'];

                $this->setAggregateVersion(
                    $command['location_id'],
                    $versionKey,
                    $newVersion
                );
                $this->setAggregateVersion(
                    $command['location_id'],
                    $canonicalAggregateId,
                    $newVersion
                );

                $eventId = $this->uuid();
                DB::table('pmd_sync_events')->insert([
                    'event_id' => $eventId,
                    'location_id' => $command['location_id'],
                    'device_id' => $command['device_id'],
                    'user_id' => $command['user_id'],
                    'staff_id' => $command['staff_id'],
                    'aggregate' => 'order',
                    'aggregate_id' => $canonicalAggregateId,
                    'aggregate_version' => $newVersion,
                    'event_type' => match ($command['command_type']) {
                        'ORDER_HOLD_V1' => 'ORDER_HELD_V1',
                        'KDS_STATUS_V1' => 'KDS_STATUS_CHANGED_V1',
                        default => 'ORDER_SENT_V1',
                    },
                    'payload' => json_encode([
                        'command_id' => $command['command_id'],
                        'client_aggregate_id' => $command['aggregate_id'],
                        'order' => $result,
                    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    'occurred_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $sequence = (int)DB::getPdo()->lastInsertId();

                $response = [
                    'ok' => true,
                    'protocol' => self::PROTOCOL,
                    'command_id' => $command['command_id'],
                    'idempotency_key' => $command['idempotency_key'],
                    'aggregate' => 'order',
                    'aggregate_id' => $canonicalAggregateId,
                    'aggregate_version' => $newVersion,
                    'sequence' => $sequence,
                    'event_id' => $eventId,
                    'replayed' => false,
                    'result' => $result,
                ];

                DB::table('pmd_sync_commands')
                    ->where('id', (int)$ledger->id)
                    ->update([
                        'status' => 'APPLIED',
                        'result_payload' => json_encode(
                            $response,
                            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                        ),
                        'applied_at' => now(),
                        'updated_at' => now(),
                    ]);

                return $response;
            }, 3);
        } catch (QueryException $error) {
            // Concurrent duplicate insert: after the winner commits, return the
            // exact stored result instead of executing the business mutation.
            $existing = $this->findExistingCommand(
                $command['command_id'],
                $command['idempotency_key']
            );

            if ($existing) {
                return $this->replayExisting($existing, $command);
            }

            throw $error;
        }
    }

    private function applyCommand(array $identity, array $command): array
    {
        if ($command['command_type'] === 'KDS_STATUS_V1') {
            return $this->applyKdsStatusCommand($identity, $command);
        }

        if (!in_array(
            $command['command_type'],
            ['ORDER_SEND_V1', 'ORDER_HOLD_V1'],
            true
        )) {
            throw ValidationException::withMessages([
                'command_type' => 'Unsupported PayMyDine mobile command.',
            ]);
        }

        $payload = $command['payload'];
        $tableId = (int)($payload['table_id'] ?? 0);
        if ($tableId < 1) {
            throw ValidationException::withMessages([
                'table_id' => 'A restaurant table is required.',
            ]);
        }

        $payload['mode'] = $command['command_type'] === 'ORDER_HOLD_V1'
            ? 'hold'
            : 'send';

        // For a new local draft, never append to an unrelated latest open bill.
        if ((int)($payload['order_id'] ?? 0) < 1) {
            $payload['force_new_check'] = true;
        }

        /** @var PmdWaiterPosV1 $pos */
        $pos = app(PmdWaiterPosV1::class);
        $pos->pmdUseMobileIdentity($identity);

        return $pos->saveMobilePayload($tableId, $payload);
    }

    private function applyKdsStatusCommand(
        array $identity,
        array $command
    ): array {
        $user = $identity['user'] ?? null;
        if (!$user) {
            abort(401, 'Authenticated PayMyDine user required.');
        }

        try {
            if (!$user->hasPermission('Admin.KitchenDisplay')) {
                abort(403, 'Kitchen Display permission required.');
            }
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $error) {
            throw $error;
        } catch (\Throwable $error) {
            abort(403, 'Kitchen Display permission required.');
        }

        $payload = $command['payload'];
        $orderId = (int)($payload['order_id'] ?? 0);
        $statusId = (int)($payload['status_id'] ?? 0);
        $expectedStatusId = (int)($payload['expected_status_id'] ?? 0);
        $stationSlug = trim((string)($payload['station_slug'] ?? ''));

        /** @var KitchenDisplay $kds */
        $kds = app(KitchenDisplay::class);

        return $kds->pmdMobileUpdateStatus(
            $identity,
            $orderId,
            $statusId,
            $expectedStatusId,
            $stationSlug !== '' ? $stationSlug : null
        );
    }

    private function normalize(array $identity, array $input): array
    {
        $commandId = strtolower(trim((string)($input['command_id'] ?? '')));
        $idempotencyKey = trim((string)(
            $input['idempotency_key'] ?? $commandId
        ));
        $aggregate = strtolower(trim((string)($input['aggregate'] ?? '')));
        $aggregateId = trim((string)($input['aggregate_id'] ?? ''));
        $commandType = strtoupper(trim((string)($input['command_type'] ?? '')));
        $baseVersion = max(0, (int)($input['base_version'] ?? 0));
        $payload = $input['payload'] ?? [];

        if (!$this->validUuid($commandId)) {
            throw ValidationException::withMessages([
                'command_id' => 'command_id must be a UUID.',
            ]);
        }
        if (
            $idempotencyKey === ''
            || strlen($idempotencyKey) > 96
        ) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'A valid idempotency key is required.',
            ]);
        }
        if ($aggregate !== 'order') {
            throw ValidationException::withMessages([
                'aggregate' => 'Mobile sync V1 currently accepts order aggregates only.',
            ]);
        }
        if ($aggregateId === '' || strlen($aggregateId) > 128) {
            throw ValidationException::withMessages([
                'aggregate_id' => 'A valid order aggregate id is required.',
            ]);
        }
        if (!is_array($payload)) {
            throw ValidationException::withMessages([
                'payload' => 'Command payload must be an object.',
            ]);
        }

        $normalized = [
            'command_id' => $commandId,
            'idempotency_key' => $idempotencyKey,
            'location_id' => (int)$identity['location_id'],
            'device_id' => (int)$identity['device_id'],
            'user_id' => (int)$identity['user_id'],
            'staff_id' => (int)$identity['staff_id'],
            'aggregate' => $aggregate,
            'aggregate_id' => $aggregateId,
            'base_version' => $baseVersion,
            'command_type' => $commandType,
            'payload' => $payload,
        ];

        $normalized['request_hash'] = hash(
            'sha256',
            json_encode(
                $normalized,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            )
        );

        return $normalized;
    }

    private function replayExisting($row, array $command): array
    {
        if (
            !hash_equals(
                (string)($row->request_hash ?? ''),
                $command['request_hash']
            )
            || (int)$row->location_id !== $command['location_id']
            || (int)$row->device_id !== $command['device_id']
        ) {
            abort(
                409,
                'This idempotency key was already used for a different command.'
            );
        }

        if ((string)$row->status === 'APPLIED') {
            $stored = json_decode((string)$row->result_payload, true);
            if (!is_array($stored)) {
                throw new \RuntimeException(
                    'Stored PayMyDine command result is unreadable.'
                );
            }
            $stored['replayed'] = true;
            return $stored;
        }

        if ((string)$row->status === 'REJECTED') {
            $stored = json_decode((string)$row->result_payload, true);
            $message = is_array($stored)
                ? (string)($stored['message'] ?? $stored['error'] ?? '')
                : '';
            abort(409, $message ?: 'This PayMyDine command was rejected.');
        }

        abort(409, 'This PayMyDine command is still being processed.');
    }

    private function findExistingCommand(
        string $commandId,
        string $idempotencyKey,
        bool $lock = false
    ) {
        $query = DB::table('pmd_sync_commands')
            ->where(function ($q) use ($commandId, $idempotencyKey) {
                $q->where('command_id', $commandId)
                    ->orWhere('idempotency_key', $idempotencyKey);
            });

        if ($lock) $query->lockForUpdate();

        return $query->first();
    }

    private function versionKey(array $command): string
    {
        $orderId = (int)($command['payload']['order_id'] ?? 0);
        if ($orderId > 0) return 'order:'.$orderId;

        return $command['aggregate_id'];
    }

    private function lockAggregateVersion(
        int $locationId,
        string $aggregateId
    ): int {
        DB::table('pmd_sync_aggregate_versions')->insertOrIgnore([
            'location_id' => $locationId,
            'aggregate' => 'order',
            'aggregate_id' => $aggregateId,
            'version' => 0,
            'updated_at' => now(),
        ]);

        $row = DB::table('pmd_sync_aggregate_versions')
            ->where('location_id', $locationId)
            ->where('aggregate', 'order')
            ->where('aggregate_id', $aggregateId)
            ->lockForUpdate()
            ->first();

        if (!$row) {
            throw new \RuntimeException(
                'PayMyDine aggregate version could not be locked.'
            );
        }

        return (int)$row->version;
    }

    private function setAggregateVersion(
        int $locationId,
        string $aggregateId,
        int $version
    ): void {
        DB::table('pmd_sync_aggregate_versions')->updateOrInsert(
            [
                'location_id' => $locationId,
                'aggregate' => 'order',
                'aggregate_id' => $aggregateId,
            ],
            [
                'version' => $version,
                'updated_at' => now(),
            ]
        );
    }

    private function assertSchema(): void
    {
        foreach ([
            'pmd_sync_commands',
            'pmd_sync_events',
            'pmd_sync_aggregate_versions',
        ] as $table) {
            if (!Schema::hasTable($table)) {
                abort(503, 'PayMyDine mobile sync storage is not ready.');
            }
        }
    }

    private function validUuid(string $value): bool
    {
        return (bool)preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            $value
        );
    }

    private function uuid(): string
    {
        return (string)\Illuminate\Support\Str::uuid();
    }
}
