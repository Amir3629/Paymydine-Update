<?php

namespace App\Services\RestaurantGroups;

use Illuminate\Database\Schema\Blueprint;

final class Schema
{
    public const VERSION = 3;

    public function installCentral(Store $store): void
    {
        $schema = $store->central()->getSchemaBuilder();

        $this->ensureCentralTenantRegistryIsTransactional($store);

        if (!$schema->hasTable('pmd_group_schema')) {
            $schema->create('pmd_group_schema', function (Blueprint $table) {
                $table->string('name', 64)->primary();
                $table->unsignedInteger('version');
                $table->timestamp('updated_at')->nullable();
            });
        }

        if (!$schema->hasTable('pmd_group_owners')) {
            $schema->create('pmd_group_owners', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->uuid('uuid')->unique();
                $table->string('username', 100)->unique();
                $table->string('email', 191);
                $table->string('name', 191);
                $table->string('password', 255);
                $table->string('status', 20)->default('active');
                $table->unsignedInteger('auth_version')->default(1);
                $table->text('secret_encrypted')->nullable();
                $table->timestamp('confirmed_at')->nullable();
                $table->unsignedBigInteger('last_used_step')->nullable();
                $table->timestamp('mfa_reset_at')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_groups')) {
            $schema->create('pmd_groups', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->uuid('uuid')->unique();
                $table->string('name', 191);
                $table->string('type', 30)->default('independent');
                $table->string('status', 20)->default('active');
                $table->unsignedBigInteger('owner_id')->nullable()->index();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_group_sites')) {
            $schema->create('pmd_group_sites', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('group_id')->index();
                $table->unsignedBigInteger('tenant_id')->nullable()->unique();
                $table->unsignedBigInteger('location_id')->nullable();
                $table->string('label', 191);
                $table->string('slug', 63)->unique();
                $table->string('database_name', 64)->unique();
                $table->string('state', 30)->default('pending');
                $table->longText('payload')->nullable();
                $table->string('last_error', 500)->nullable();
                $table->longText('queue_config')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_group_access')) {
            $schema->create('pmd_group_access', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('owner_id')->index();
                $table->unsignedBigInteger('tenant_id')->index();
                $table->unsignedBigInteger('user_id');
                $table->boolean('can_publish')->default(true);
                $table->timestamp('revoked_at')->nullable();
                $table->unique(['owner_id', 'tenant_id']);
                $table->unique(['tenant_id', 'user_id']);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_group_operations')) {
            $schema->create('pmd_group_operations', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->uuid('uuid')->unique();
                $table->unsignedBigInteger('group_id')->index();
                $table->unsignedBigInteger('owner_id');
                $table->unsignedBigInteger('source_tenant_id');
                $table->string('entity_type', 40);
                $table->string('entity_key', 191);
                $table->longText('payload');
                $table->char('digest', 64);
                $table->string('state', 30)->default('preview');
                $table->timestamp('expires_at');
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_group_operation_targets')) {
            $schema->create('pmd_group_operation_targets', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('operation_id')->index();
                $table->unsignedBigInteger('tenant_id');
                $table->string('state', 30)->default('pending');
                $table->char('expected_digest', 64)->nullable();
                $table->string('last_error', 500)->nullable();
                $table->unique(['operation_id', 'tenant_id']);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_group_audit')) {
            $schema->create('pmd_group_audit', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('group_id')->nullable()->index();
                $table->string('actor_type', 30);
                $table->unsignedBigInteger('actor_id');
                $table->string('action', 100);
                $table->longText('details');
                $table->timestamp('created_at');
            });
        }

        if (!$schema->hasTable('pmd_group_displays')) {
            $schema->create('pmd_group_displays', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('group_id')->index();
                $table->unsignedBigInteger('owner_id');
                $table->char('token_hash', 64)->unique();
                $table->longText('tenant_ids');
                $table->timestamp('expires_at');
                $table->timestamp('revoked_at')->nullable();
                $table->timestamps();
            });
        }

        $this->disableIncompleteGroupTenants($store);

        $store->central()->table('pmd_group_schema')->updateOrInsert(
            ['name' => 'restaurant-groups'],
            ['version' => self::VERSION, 'updated_at' => now()]
        );
    }

    private function disableIncompleteGroupTenants(Store $store): void
    {
        $db = $store->central();

        if (
            !$db->getSchemaBuilder()->hasTable('pmd_group_sites')
            || !$db->getSchemaBuilder()->hasTable('tenants')
        ) {
            return;
        }

        $tenantIds = $db->table('pmd_group_sites')
            ->whereNotNull('tenant_id')
            ->where('state', '!=', 'ready')
            ->pluck('tenant_id')
            ->map(static fn ($id) => (int)$id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (!$tenantIds) {
            return;
        }

        $db->table('tenants')
            ->whereIn('id', $tenantIds)
            ->where('status', '!=', 'removed')
            ->update([
                'status' => 'disabled',
                'updated_at' => now(),
            ]);
    }

    private function ensureCentralTenantRegistryIsTransactional(Store $store): void
    {
        $db = $store->central();
        $physical = $db->getTablePrefix().'tenants';

        if (!preg_match('/^[A-Za-z0-9_]+$/D', $physical)) {
            throw new \RuntimeException('Central tenant registry table name is invalid.');
        }

        $row = $db->selectOne(
            'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [$db->getDatabaseName(), $physical]
        );

        if (!$row) {
            throw new \RuntimeException('Central tenants table is missing.');
        }

        if (strtolower((string)$row->ENGINE) !== 'innodb') {
            $db->statement('ALTER TABLE `'.$physical.'` ENGINE=InnoDB');

            $row = $db->selectOne(
                'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
                [$db->getDatabaseName(), $physical]
            );
        }

        if (!$row || strtolower((string)$row->ENGINE) !== 'innodb') {
            throw new \RuntimeException(
                'Central tenants table must use InnoDB before multi-location provisioning can run.'
            );
        }
    }


    public function installTenant($db): void
    {
        $schema = $db->getSchemaBuilder();

        if (!$schema->hasTable('pmd_group_identity')) {
            $schema->create('pmd_group_identity', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->unsignedBigInteger('user_id')->primary();
                $table->uuid('owner_uuid');
                $table->timestamp('linked_at');
            });
        }

        if (!$schema->hasTable('pmd_group_entities')) {
            $schema->create('pmd_group_entities', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->uuid('group_uuid');
                $table->string('entity_key', 191);
                $table->string('entity_type', 40);
                $table->unsignedBigInteger('local_id');
                $table->char('last_digest', 64)->nullable();
                $table->unique(['group_uuid', 'entity_key']);
                $table->unique(
                    ['group_uuid', 'entity_type', 'local_id'],
                    'pmd_group_entity_local_unique'
                );
            });
        }

        if (!$schema->hasTable('pmd_group_receipts')) {
            $schema->create('pmd_group_receipts', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->uuid('operation_uuid')->primary();
                $table->char('digest', 64);
                $table->timestamp('applied_at');
            });
        }
    }
}
