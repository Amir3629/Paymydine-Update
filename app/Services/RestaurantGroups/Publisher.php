<?php

namespace App\Services\RestaurantGroups;

use Illuminate\Support\Str;

final class Publisher
{
    private const TYPES = ['menu', 'coupon', 'setting'];

    private const SAFE_SETTINGS = [
        'default_language',
        'supported_languages',
        'detect_language',
        'pmd_v2_tips_enabled',
        'pmd_v2_coupons_enabled',
        'pmd_v2_social_enabled',
        'pmd_v2_service_charge_enabled',
        'pmd_v2_reservations_enabled',
    ];

    public function __construct(
        private Store $store,
        private Auth $auth,
        private Schema $schema
    ) {
    }

    public function catalog(string $type): array
    {
        $type = $this->type($type);
        $owner = $this->auth->owner(true);
        $tenantId = $this->store->currentTenantId();
        $this->store->access((int)$owner->id, $tenantId, true);
        $db = $this->store->connection($tenantId);

        if ($type === 'menu') {
            return $db->table('menus')
                ->orderBy('menu_name')
                ->get(['menu_id as id', 'menu_name as label'])
                ->map(static fn ($row) => (array)$row)
                ->all();
        }

        if ($type === 'coupon') {
            return $db->table('igniter_coupons')
                ->orderBy('name')
                ->get(['coupon_id as id', 'name as label', 'code'])
                ->map(static function ($row) {
                    $item = (array)$row;
                    $item['label'] = trim((string)$item['label']).' · '.trim((string)$item['code']);
                    unset($item['code']);
                    return $item;
                })
                ->all();
        }

        return array_map(
            static fn ($key) => ['id' => $key, 'label' => $key],
            self::SAFE_SETTINGS
        );
    }

    public function preview(
        string $type,
        string $entityId,
        array $requestedTargets
    ): array {
        $type = $this->type($type);
        $owner = $this->auth->owner(true);
        $sourceTenantId = $this->store->currentTenantId();
        $sourceSite = $this->store->site($sourceTenantId);
        $group = $this->store->group((int)$sourceSite->group_id);

        $sites = array_values(array_filter(
            $this->store->sitesForOwner((int)$owner->id),
            static fn ($site) => (int)$site['group_id'] === (int)$group->id
                && !empty($site['can_publish'])
        ));

        $allowed = array_map('intval', array_column($sites, 'tenant_id'));
        $targets = Policy::targets($requestedTargets, $allowed);
        $targets = array_values(array_filter(
            $targets,
            static fn ($id) => $id !== $sourceTenantId
        ));

        if (!$targets) {
            throw new \InvalidArgumentException('Choose at least one other location.');
        }

        $this->store->access((int)$owner->id, $sourceTenantId, true);
        $sourceDb = $this->store->connection($sourceTenantId);
        $this->schema->installTenant($sourceDb);

        $payload = $this->export($sourceDb, $type, $entityId);
        $digest = Policy::digest($payload);
        $entityKey = $this->entityKey(
            $sourceDb,
            (string)$group->uuid,
            $type,
            $entityId
        );

        $operationUuid = (string)Str::uuid();
        $operationId = $this->store->central()->table('pmd_group_operations')->insertGetId([
            'uuid' => $operationUuid,
            'group_id' => (int)$group->id,
            'owner_id' => (int)$owner->id,
            'source_tenant_id' => $sourceTenantId,
            'entity_type' => $type,
            'entity_key' => $entityKey,
            'payload' => Policy::canonical($payload),
            'digest' => $digest,
            'state' => 'preview',
            'expires_at' => now()->addMinutes(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $previewTargets = [];

        foreach ($targets as $tenantId) {
            $this->store->access((int)$owner->id, $tenantId, true);
            $db = $this->store->connection($tenantId);
            $this->schema->installTenant($db);

            $mapping = null;
            $expected = null;
            $targetExisting = false;

            if ($type === 'setting') {
                try {
                    $current = $this->export($db, $type, $entityId);
                    $expected = Policy::digest($current);
                    $targetExisting = true;
                } catch (\Throwable $ignored) {
                    $expected = null;
                    $targetExisting = false;
                }
            } else {
                $mapping = $db->table('pmd_group_entities')
                    ->where('group_uuid', (string)$group->uuid)
                    ->where('entity_key', $entityKey)
                    ->first();

                if ($mapping) {
                    try {
                        $current = $this->export($db, $type, (string)$mapping->local_id);
                        $expected = Policy::digest($current);
                        $targetExisting = true;
                    } catch (\Throwable $ignored) {
                        $expected = null;
                    }
                }
            }

            $this->store->central()->table('pmd_group_operation_targets')->insert([
                'operation_id' => $operationId,
                'tenant_id' => $tenantId,
                'state' => 'pending',
                'expected_digest' => $expected,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $site = $this->store->site($tenantId);
            $previewTargets[] = [
                'tenant_id' => $tenantId,
                'label' => (string)$site->label,
                'existing' => $targetExisting,
                'conflict_guard' => $expected !== null,
            ];
        }

        $this->store->audit(
            'owner',
            (int)$owner->id,
            'publish_preview',
            (int)$group->id,
            [
                'operation' => $operationUuid,
                'type' => $type,
                'source_tenant_id' => $sourceTenantId,
                'targets' => $targets,
            ]
        );

        return [
            'ok' => true,
            'operation' => $operationUuid,
            'entity_type' => $type,
            'entity_key' => $entityKey,
            'source_digest' => $digest,
            'targets' => $previewTargets,
            'expires_at' => now()->addMinutes(20)->toIso8601String(),
        ];
    }

    public function apply(string $operationUuid, bool $overwrite = false): array
    {
        $owner = $this->auth->owner(true);
        $operation = $this->store->central()->table('pmd_group_operations')
            ->where('uuid', $operationUuid)
            ->first();

        if (
            !$operation
            || (int)$operation->owner_id !== (int)$owner->id
            || !in_array($operation->state, ['preview', 'partial'], true)
            || now()->greaterThan($operation->expires_at)
        ) {
            throw new \DomainException('This publish preview expired. Create a new preview.');
        }

        $sourceDb = $this->store->connection((int)$operation->source_tenant_id);
        $payload = json_decode((string)$operation->payload, true);
        if (!is_array($payload)) throw new \RuntimeException('Publish payload is invalid.');

        $sourceMapping = null;
        if ((string)$operation->entity_type === 'setting') {
            $sourceIdentifier = (string)($payload['key'] ?? '');
            if ($sourceIdentifier === '') {
                throw new \RuntimeException('Setting publish payload is invalid.');
            }
        } else {
            $sourceMapping = $sourceDb->table('pmd_group_entities')
                ->where(
                    'group_uuid',
                    (string)$this->store->group((int)$operation->group_id)->uuid
                )
                ->where('entity_key', (string)$operation->entity_key)
                ->first();

            if (!$sourceMapping) {
                throw new \DomainException('The source item mapping is missing.');
            }

            $sourceIdentifier = (string)$sourceMapping->local_id;
        }

        $sourceCurrent = $this->export(
            $sourceDb,
            (string)$operation->entity_type,
            $sourceIdentifier
        );

        if (!hash_equals((string)$operation->digest, Policy::digest($sourceCurrent))) {
            throw new \DomainException(
                'The source changed after preview. Review the locations again before publishing.'
            );
        }

        $group = $this->store->group((int)$operation->group_id);
        $targets = $this->store->central()->table('pmd_group_operation_targets')
            ->where('operation_id', $operation->id)
            ->orderBy('id')
            ->get();

        $results = [];

        foreach ($targets as $target) {
            try {
                $this->store->access((int)$owner->id, (int)$target->tenant_id, true);
                $db = $this->store->connection((int)$target->tenant_id);
                $this->schema->installTenant($db);

                $receipt = $db->table('pmd_group_receipts')
                    ->where('operation_uuid', $operationUuid)
                    ->first();

                if ($receipt && hash_equals((string)$receipt->digest, (string)$operation->digest)) {
                    $results[] = [
                        'tenant_id' => (int)$target->tenant_id,
                        'ok' => true,
                        'state' => 'already_applied',
                    ];
                    continue;
                }

                $mapping = null;
                $targetIdentifier = null;

                if ((string)$operation->entity_type === 'setting') {
                    $targetIdentifier = (string)($payload['key'] ?? '');
                } else {
                    $mapping = $db->table('pmd_group_entities')
                        ->where('group_uuid', (string)$group->uuid)
                        ->where('entity_key', (string)$operation->entity_key)
                        ->first();

                    if ($mapping) {
                        $targetIdentifier = (string)$mapping->local_id;
                    }
                }

                if ($target->expected_digest && $targetIdentifier !== null) {
                    $current = $this->export(
                        $db,
                        (string)$operation->entity_type,
                        $targetIdentifier
                    );
                    $currentDigest = Policy::digest($current);

                    if (
                        !hash_equals((string)$target->expected_digest, $currentDigest)
                        && !$overwrite
                    ) {
                        throw new \DomainException(
                            'This location changed after preview. Review it again or explicitly overwrite it.'
                        );
                    }
                }

                $localId = $db->transaction(function () use (
                    $db,
                    $payload,
                    $operation,
                    $operationUuid,
                    $group,
                    $mapping
                ) {
                    $localId = $this->import(
                        $db,
                        (string)$operation->entity_type,
                        $payload,
                        $mapping ? (string)$mapping->local_id : null,
                        (int)$this->store->site((int)$this->tenantIdForConnection($db))->location_id
                    );

                    if ((string)$operation->entity_type !== 'setting') {
                        $db->table('pmd_group_entities')->updateOrInsert(
                            [
                                'group_uuid' => (string)$group->uuid,
                                'entity_key' => (string)$operation->entity_key,
                            ],
                            [
                                'entity_type' => (string)$operation->entity_type,
                                'local_id' => (string)$localId,
                                'last_digest' => (string)$operation->digest,
                            ]
                        );
                    }

                    $db->table('pmd_group_receipts')->updateOrInsert(
                        ['operation_uuid' => $operationUuid],
                        [
                            'digest' => (string)$operation->digest,
                            'applied_at' => now(),
                        ]
                    );

                    return $localId;
                });

                $this->store->central()->table('pmd_group_operation_targets')
                    ->where('id', $target->id)
                    ->update([
                        'state' => 'applied',
                        'last_error' => null,
                        'updated_at' => now(),
                    ]);

                $results[] = [
                    'tenant_id' => (int)$target->tenant_id,
                    'ok' => true,
                    'state' => 'applied',
                    'local_id' => (int)$localId,
                ];
            } catch (\Throwable $error) {
                $this->store->central()->table('pmd_group_operation_targets')
                    ->where('id', $target->id)
                    ->update([
                        'state' => 'failed',
                        'last_error' => substr($error->getMessage(), 0, 500),
                        'updated_at' => now(),
                    ]);

                $results[] = [
                    'tenant_id' => (int)$target->tenant_id,
                    'ok' => false,
                    'state' => 'failed',
                    'message' => $error->getMessage(),
                ];
            }
        }

        $failed = array_values(array_filter($results, static fn ($row) => empty($row['ok'])));

        $this->store->central()->table('pmd_group_operations')
            ->where('id', $operation->id)
            ->update([
                'state' => $failed ? 'partial' : 'complete',
                'updated_at' => now(),
            ]);

        $this->store->audit(
            'owner',
            (int)$owner->id,
            'publish_apply',
            (int)$operation->group_id,
            [
                'operation' => $operationUuid,
                'overwrite' => $overwrite,
                'results' => $results,
            ]
        );

        return [
            'ok' => !$failed,
            'operation' => $operationUuid,
            'results' => $results,
        ];
    }

    private function type(string $type): string
    {
        $type = strtolower(trim($type));
        if (!in_array($type, self::TYPES, true)) {
            throw new \InvalidArgumentException('Only Menu, Discount and approved Settings can be shared.');
        }
        return $type;
    }

    private function entityKey($db, string $groupUuid, string $type, string $localId): string
    {
        if ($type === 'setting') return 'setting:'.$localId;

        $existing = $db->table('pmd_group_entities')
            ->where('group_uuid', $groupUuid)
            ->where('entity_type', $type)
            ->where('local_id', (int)$localId)
            ->first();

        if ($existing) return (string)$existing->entity_key;

        $key = $type.':'.(string)Str::uuid();
        $payload = $this->export($db, $type, $localId);

        $db->table('pmd_group_entities')->insert([
            'group_uuid' => $groupUuid,
            'entity_key' => $key,
            'entity_type' => $type,
            'local_id' => (int)$localId,
            'last_digest' => Policy::digest($payload),
        ]);

        return $key;
    }

    private function export($db, string $type, string $id): array
    {
        return match ($type) {
            'menu' => $this->exportMenu($db, (int)$id),
            'coupon' => $this->exportCoupon($db, (int)$id),
            'setting' => $this->exportSetting($db, $id),
            default => throw new \InvalidArgumentException('Unsupported publish type.'),
        };
    }

    private function import(
        $db,
        string $type,
        array $payload,
        ?string $localId,
        int $locationId
    ): string {
        return match ($type) {
            'menu' => (string)$this->importMenu($db, $payload, $localId ? (int)$localId : null, $locationId),
            'coupon' => (string)$this->importCoupon($db, $payload, $localId ? (int)$localId : null, $locationId),
            'setting' => $this->importSetting($db, $payload),
            default => throw new \InvalidArgumentException('Unsupported publish type.'),
        };
    }

    private function exportMenu($db, int $id): array
    {
        return app(MenuReplicator::class)->export($db, $id);
    }

    private function importMenu($db, array $payload, ?int $id, int $locationId): int
    {
        return app(MenuReplicator::class)->import($db, $payload, $id, $locationId);
    }

    private function exportCoupon($db, int $id): array
    {
        $row = $db->table('igniter_coupons')->where('coupon_id', $id)->first();
        if (!$row) throw new \DomainException('Discount not found.');

        $data = (array)$row;
        if (($data['card_type'] ?? 'coupon') === 'gift_card') {
            throw new \DomainException(
                'Gift-card balances are location-owned and cannot be published between restaurants.'
            );
        }

        return ['coupon' => $this->only($data, [
            'name', 'code', 'type', 'discount', 'min_total', 'redemptions',
            'customer_redemptions', 'validity', 'fixed_date', 'fixed_from_time',
            'fixed_to_time', 'period_start_date', 'period_end_date',
            'recurring_every', 'recurring_from_time', 'recurring_to_time',
            'order_restriction', 'status', 'card_type', 'max_discount_cap',
        ])];
    }

    private function importCoupon($db, array $payload, ?int $id, int $locationId): int
    {
        $coupon = (array)($payload['coupon'] ?? []);
        if (!$coupon || empty($coupon['code'])) throw new \RuntimeException('Discount payload is incomplete.');

        $data = $this->columns($db, 'igniter_coupons', $coupon);
        $now = now();

        if ($id && $db->table('igniter_coupons')->where('coupon_id', $id)->exists()) {
            if ($db->getSchemaBuilder()->hasColumn('igniter_coupons', 'updated_at')) $data['updated_at'] = $now;
            $db->table('igniter_coupons')->where('coupon_id', $id)->update($data);
        } else {
            $conflict = $db->table('igniter_coupons')
                ->whereRaw('LOWER(code) = ?', [strtolower((string)$coupon['code'])])
                ->first();

            if ($conflict) {
                $id = (int)$conflict->coupon_id;
                $db->table('igniter_coupons')->where('coupon_id', $id)->update($data);
            } else {
                if ($db->getSchemaBuilder()->hasColumn('igniter_coupons', 'created_at')) $data['created_at'] = $now;
                if ($db->getSchemaBuilder()->hasColumn('igniter_coupons', 'updated_at')) $data['updated_at'] = $now;
                $id = (int)$db->table('igniter_coupons')->insertGetId($data);
            }
        }

        $this->bindLocation($db, 'coupons', $id, $locationId);
        return $id;
    }

    private function exportSetting($db, string $key): array
    {
        if (!in_array($key, self::SAFE_SETTINGS, true)) {
            throw new \DomainException('This setting is location-specific and cannot be shared.');
        }

        $row = $db->table('settings')->where('item', $key)->first();
        if (!$row) throw new \DomainException('Setting not found.');

        return ['key' => $key, 'value' => $row->value];
    }

    private function importSetting($db, array $payload): string
    {
        $key = (string)($payload['key'] ?? '');
        if (!in_array($key, self::SAFE_SETTINGS, true)) {
            throw new \DomainException('This setting is location-specific and cannot be shared.');
        }

        $db->table('settings')->updateOrInsert(
            ['item' => $key],
            ['value' => $payload['value'] ?? null]
        );

        return $key;
    }

    private function bindLocation($db, string $type, int $id, int $locationId): void
    {
        if (!$db->getSchemaBuilder()->hasTable('locationables')) return;

        $exists = $db->table('locationables')
            ->where('location_id', $locationId)
            ->where('locationable_id', $id)
            ->where('locationable_type', $type)
            ->exists();

        if (!$exists) {
            $db->table('locationables')->insert([
                'location_id' => $locationId,
                'locationable_id' => $id,
                'locationable_type' => $type,
                'options' => serialize([]),
            ]);
        }
    }

    private function only(array $row, array $keys): array
    {
        $result = [];
        foreach ($keys as $key) {
            if (array_key_exists($key, $row)) $result[$key] = $row[$key];
        }
        return $result;
    }

    private function columns($db, string $table, array $data): array
    {
        $columns = array_flip($db->getSchemaBuilder()->getColumnListing($table));
        return array_intersect_key($data, $columns);
    }

    private function tenantIdForConnection($db): int
    {
        $database = (string)$db->getDatabaseName();
        return (int)$this->store->central()->table('tenants')
            ->where('database', $database)
            ->value('id');
    }
}
