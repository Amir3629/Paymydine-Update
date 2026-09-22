<?php

namespace App\Services\PmdMobileSync;

use Admin\Controllers\KitchenDisplay;
use Admin\Controllers\PmdQuickPosV1;
use Admin\Controllers\PmdWaiterPosV1;
use Admin\Controllers\PmdWaiterTableStateV154;
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
            $transactionResult = DB::transaction(function () use ($identity, $command) {
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
                    $command['aggregate'],
                    $versionKey
                );

                if ($currentVersion !== $command['base_version']) {
                    $rejection = [
                        'ok' => false,
                        'error' => 'aggregate_version_conflict',
                        'message' =>
                            ucfirst($command['aggregate']).
                            ' changed on another device. Refresh before sending.',
                        'expected_version' => $currentVersion,
                        'received_version' => $command['base_version'],
                    ];

                    DB::table('pmd_sync_commands')
                        ->where('id', (int)$ledger->id)
                        ->update([
                            'status' => 'REJECTED',
                            'error_code' => 'aggregate_version_conflict',
                            'result_payload' => json_encode(
                                $rejection,
                                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                            ),
                            'rejected_at' => now(),
                            'updated_at' => now(),
                        ]);

                    // Return from the transaction so the rejection ledger row
                    // commits. The HTTP 409 is raised only after commit.
                    return $rejection + ['__http_status' => 409];
                }

                $result = $this->applyCommand($identity, $command);
                $newVersion = $currentVersion + 1;
                $canonicalAggregateId =
                    $command['aggregate'] === 'table'
                        ? 'table:'.(int)(
                            $result['table_id']
                            ?? $command['payload']['table_id']
                            ?? $command['payload']['source_table_id']
                            ?? 0
                        )
                        : 'order:'.(int)$result['order_id'];

                if (
                    $canonicalAggregateId === 'table:0'
                    || $canonicalAggregateId === 'order:0'
                ) {
                    throw new \RuntimeException(
                        'Canonical aggregate identity is unavailable.'
                    );
                }

                $this->setAggregateVersion(
                    $command['location_id'],
                    $command['aggregate'],
                    $versionKey,
                    $newVersion
                );
                $this->setAggregateVersion(
                    $command['location_id'],
                    $command['aggregate'],
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
                    'aggregate' => $command['aggregate'],
                    'aggregate_id' => $canonicalAggregateId,
                    'aggregate_version' => $newVersion,
                    'event_type' => match ($command['command_type']) {
                        'ORDER_HOLD_V1' => 'ORDER_HELD_V1',
                        'KDS_STATUS_V1' => 'KDS_STATUS_CHANGED_V1',
                        'CASH_PAYMENT_V1' => 'PAYMENT_CASH_RECORDED_V1',
                        'TABLE_STATE_V1' => 'TABLE_STATE_CHANGED_V1',
                        'TABLE_MOVE_V1' => 'TABLE_MOVED_V1',
                        default => 'ORDER_SENT_V1',
                    },
                    'payload' => json_encode([
                        'command_id' => $command['command_id'],
                        'client_aggregate_id' => $command['client_aggregate_id'],
                        $command['aggregate'] => $result,
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
                    'aggregate' => $command['aggregate'],
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

            if ((int)($transactionResult['__http_status'] ?? 0) > 0) {
                $status = (int)$transactionResult['__http_status'];
                $message = (string)($transactionResult['message'] ?? '');
                abort($status, $message ?: 'The PayMyDine command was rejected.');
            }

            return $transactionResult;
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

        if ($command['command_type'] === 'CASH_PAYMENT_V1') {
            return $this->applyCashPaymentCommand($identity, $command);
        }

        if ($command['command_type'] === 'TABLE_STATE_V1') {
            return $this->applyTableStateCommand($identity, $command);
        }

        if ($command['command_type'] === 'TABLE_MOVE_V1') {
            return $this->applyTableMoveCommand($identity, $command);
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

    /**
     * PMD_MOBILE_OFFLINE_CASH_PAYMENT_V17
     *
     * The tablet records only the business intent while disconnected. When an
     * authority is reachable, the intent is replayed through the exact
     * canonical settlement endpoint with the verified mobile identity.
     *
     * No card/provider approval is synthesized offline.
     */
    private function applyCashPaymentCommand(
        array $identity,
        array $command
    ): array {
        $payload = (array)$command['payload'];
        $orderId = (int)($payload['order_id'] ?? 0);
        if ($orderId < 1) {
            throw ValidationException::withMessages([
                'order_id' => 'A canonical order is required for offline cash.',
            ]);
        }

        $payload['payment_method'] = 'cash';
        $payload['idempotency_key'] = $command['idempotency_key'];
        $payload['quick_pos_fast'] = true;
        unset(
            $payload['external_confirmed'],
            $payload['provider_code'],
            $payload['payment_reference']
        );

        /** @var PmdWaiterPosV1 $pos */
        $pos = app(PmdWaiterPosV1::class);
        $pos->pmdUseMobileIdentity($identity);
        $pos->pmdUseMobilePayload($payload);

        $response = $pos->settlePayment($orderId);
        $status = method_exists($response, 'getStatusCode')
            ? (int)$response->getStatusCode()
            : 500;
        $data = method_exists($response, 'getData')
            ? (array)$response->getData(true)
            : [];

        if ($status >= 400 || empty($data['ok'])) {
            throw ValidationException::withMessages([
                'payment' => (string)(
                    $data['message']
                    ?? 'Offline cash payment could not be reconciled.'
                ),
            ]);
        }

        $summary = (array)($data['summary'] ?? []);
        $settlement = (array)($summary['settlement'] ?? []);
        $order = (array)($summary['order'] ?? []);

        return [
            'order_id' => $orderId,
            'table_id' => (int)($payload['table_id'] ?? 0),
            'order_total' => (float)(
                $settlement['order_total']
                ?? $payload['expected_remaining']
                ?? 0
            ),
            'settled_amount' => (float)(
                $settlement['settled_amount']
                ?? $data['settled_base_amount']
                ?? 0
            ),
            'remaining_amount' => (float)(
                $settlement['remaining_amount']
                ?? $data['remaining_amount']
                ?? 0
            ),
            'settlement_status' => (string)(
                $settlement['status']
                ?? $data['settlement_status']
                ?? ''
            ),
            'updated_at' => (string)($order['updated_at'] ?? ''),
            'transaction_id' => (int)($data['transaction_id'] ?? 0),
            'paid_amount' => (float)($data['paid_amount'] ?? 0),
            'cash_received' => (float)($data['cash_received'] ?? 0),
            'change_due' => (float)($data['change_due'] ?? 0),
        ];
    }

    /**
     * PMD_MOBILE_OFFLINE_TABLE_ACTIONS_V17
     *
     * Replay table lifecycle and move intents through the existing canonical
     * controllers. The mobile command ledger supplies durable idempotent
     * transport; controller business rules remain authoritative.
     */
    private function applyTableStateCommand(
        array $identity,
        array $command
    ): array {
        $payload = (array)$command['payload'];
        $tableId = (int)($payload['table_id'] ?? 0);
        if ($tableId < 1) {
            throw ValidationException::withMessages([
                'table_id' => 'A restaurant table is required.',
            ]);
        }

        $this->assertTableLocation(
            $tableId,
            (int)$identity['location_id']
        );

        /** @var PmdWaiterTableStateV154 $controller */
        $controller = app(PmdWaiterTableStateV154::class);
        $controller->pmdUseMobileContext($identity, $payload);
        $data = $this->responseData(
            $controller->update($tableId)
        );

        return array_merge($data, ['table_id' => $tableId]);
    }

    private function applyTableMoveCommand(
        array $identity,
        array $command
    ): array {
        $payload = (array)$command['payload'];
        $sourceId = (int)($payload['source_table_id'] ?? 0);
        $targetId = (int)($payload['target_table_id'] ?? 0);
        if ($sourceId < 1 || $targetId < 1) {
            throw ValidationException::withMessages([
                'table_id' => 'Source and destination tables are required.',
            ]);
        }

        $this->assertTableLocation(
            $sourceId,
            (int)$identity['location_id']
        );
        $this->assertTableLocation(
            $targetId,
            (int)$identity['location_id']
        );

        /** @var PmdQuickPosV1 $pos */
        $pos = app(PmdQuickPosV1::class);
        $pos->pmdUseMobileIdentity($identity);
        $pos->pmdUseMobilePayload($payload);
        $data = $this->responseData($pos->transfer());

        return array_merge(
            $data,
            [
                'table_id' => $sourceId,
                'source_table_id' => $sourceId,
                'target_table_id' => $targetId,
                'scope' => (string)($payload['scope'] ?? 'order'),
                'order_id' => (int)($payload['order_id'] ?? 0),
            ]
        );
    }

    private function responseData($response): array
    {
        $status = is_object($response)
            && method_exists($response, 'getStatusCode')
                ? (int)$response->getStatusCode()
                : 500;
        $data = is_object($response)
            && method_exists($response, 'getData')
                ? (array)$response->getData(true)
                : [];

        if ($status >= 400 || empty($data['ok'])) {
            throw ValidationException::withMessages([
                'operation' => (string)(
                    $data['message']
                    ?? 'PayMyDine operation could not be reconciled.'
                ),
            ]);
        }

        return $data;
    }

    private function assertTableLocation(
        int $tableId,
        int $locationId
    ): void {
        if (
            $tableId < 1
            || $locationId < 1
            || !Schema::hasTable('tables')
        ) {
            abort(403, 'Restaurant table authority is unavailable.');
        }

        $columns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $columns, true)
            ? 'table_id'
            : (in_array('id', $columns, true) ? 'id' : null);
        if (!$pk) {
            abort(403, 'Restaurant table authority is unavailable.');
        }

        if (in_array('location_id', $columns, true)) {
            if (
                !DB::table('tables')
                    ->where($pk, $tableId)
                    ->where('location_id', $locationId)
                    ->exists()
            ) {
                abort(403, 'This table belongs to another restaurant.');
            }
            return;
        }

        if (
            Schema::hasTable('locationables')
            && Schema::hasColumn('locationables', 'location_id')
            && Schema::hasColumn('locationables', 'locationable_id')
            && Schema::hasColumn('locationables', 'locationable_type')
        ) {
            $matches = DB::table('locationables')
                ->where('locationable_id', $tableId)
                ->where('location_id', $locationId)
                ->whereIn(
                    'locationable_type',
                    ['tables', 'Admin\\Models\\Tables_model']
                )
                ->exists();

            if ($matches) {
                return;
            }
        }

        abort(403, 'This table has no verified restaurant location.');
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
        $clientAggregateId = trim((string)(
            $input['client_aggregate_id'] ?? $aggregateId
        ));
        $commandType = strtoupper(trim((string)($input['command_type'] ?? '')));
        $baseVersion = max(0, (int)($input['base_version'] ?? 0));
        $clientBaseVersion = max(0, (int)(
            $input['client_base_version'] ?? $baseVersion
        ));
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
        if (!in_array($aggregate, ['order', 'table'], true)) {
            throw ValidationException::withMessages([
                'aggregate' => 'Mobile sync accepts order or table aggregates.',
            ]);
        }
        if ($aggregateId === '' || strlen($aggregateId) > 128) {
            throw ValidationException::withMessages([
                'aggregate_id' => 'A valid order aggregate id is required.',
            ]);
        }
        if (
            $clientAggregateId === ''
            || strlen($clientAggregateId) > 128
        ) {
            throw ValidationException::withMessages([
                'client_aggregate_id' =>
                    'A valid client order aggregate id is required.',
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
            'client_aggregate_id' => $clientAggregateId,
            'base_version' => $baseVersion,
            'client_base_version' => $clientBaseVersion,
            'command_type' => $commandType,
            'payload' => $payload,
        ];

        // Restaurant Edge may rewrite transport-routing fields only for
        // local order SEND/HOLD commands after a provisional bill receives its
        // canonical Cloud id/version. For cash, KDS and table operations,
        // order_id is business intent and MUST stay inside the idempotency hash.
        $intentPayload = $payload;
        if (
            $aggregate === 'order'
            && in_array(
                $commandType,
                ['ORDER_SEND_V1', 'ORDER_HOLD_V1'],
                true
            )
        ) {
            unset(
                $intentPayload['order_id'],
                $intentPayload['expected_updated_at'],
                $intentPayload['order_ref']
            );
        }

        $intent = [
            'command_id' => $commandId,
            'idempotency_key' => $idempotencyKey,
            'location_id' => (int)$identity['location_id'],
            'device_id' => (int)$identity['device_id'],
            'user_id' => (int)$identity['user_id'],
            'staff_id' => (int)$identity['staff_id'],
            'aggregate' => $aggregate,
            'client_aggregate_id' => $clientAggregateId,
            'client_base_version' => $clientBaseVersion,
            'command_type' => $commandType,
            'payload' => $this->canonicalizeForHash($intentPayload),
        ];

        $normalized['request_hash'] = hash(
            'sha256',
            json_encode(
                $this->canonicalizeForHash($intent),
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            )
        );

        return $normalized;
    }

    private function canonicalizeForHash($value)
    {
        if (!is_array($value)) return $value;

        $isList = $value === []
            || array_keys($value) === range(0, count($value) - 1);

        if (!$isList) {
            ksort($value, SORT_STRING);
        }

        foreach ($value as $key => $item) {
            $value[$key] = $this->canonicalizeForHash($item);
        }

        return $value;
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
        if ($command['aggregate'] === 'table') {
            return $command['aggregate_id'];
        }

        $orderId = (int)($command['payload']['order_id'] ?? 0);
        if ($orderId > 0) return 'order:'.$orderId;

        return $command['aggregate_id'];
    }

    private function lockAggregateVersion(
        int $locationId,
        string $aggregate,
        string $aggregateId
    ): int {
        DB::table('pmd_sync_aggregate_versions')->insertOrIgnore([
            'location_id' => $locationId,
            'aggregate' => $aggregate,
            'aggregate_id' => $aggregateId,
            'version' => 0,
            'updated_at' => now(),
        ]);

        $row = DB::table('pmd_sync_aggregate_versions')
            ->where('location_id', $locationId)
            ->where('aggregate', $aggregate)
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
        string $aggregate,
        string $aggregateId,
        int $version
    ): void {
        DB::table('pmd_sync_aggregate_versions')->updateOrInsert(
            [
                'location_id' => $locationId,
                'aggregate' => $aggregate,
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
