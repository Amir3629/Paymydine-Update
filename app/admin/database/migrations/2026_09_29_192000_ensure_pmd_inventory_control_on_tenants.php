<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_TENANT_SCHEMA_R3
 *
 * The first Inventory migrations run in the Admin migration stream. In this
 * multi-tenant installation that does not guarantee the physical inventory
 * tables exist inside every restaurant database. This additive repair mirrors
 * the proven PMD tenant-schema migrations and provisions Inventory Control on
 * every active/enabled/new tenant plus the new-tenant template database.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->ensureOnCurrentConnection();
        $this->ensureOnTenantDatabases();
    }

    public function down(): void
    {
        // Repair-only migration. Never delete restaurant inventory data.
    }

    private function ensureOnCurrentConnection(): void
    {
        try {
            $this->ensureTables(DB::getDefaultConnection());
        } catch (\Throwable $error) {
            logger()->warning('Inventory schema repair failed on current connection', [
                'connection' => (string)DB::getDefaultConnection(),
                'message' => $error->getMessage(),
            ]);
        }
    }

    private function ensureOnTenantDatabases(): void
    {
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_inventory_schema_central', $centralConfig);
            DB::purge('pmd_inventory_schema_central');
            DB::reconnect('pmd_inventory_schema_central');

            $central = DB::connection('pmd_inventory_schema_central');

            if ($central->getSchemaBuilder()->hasTable('tenants')) {
                $rows = $central->table('tenants')
                    ->whereNotNull('database')
                    ->where('database', '<>', '')
                    ->where(function ($query): void {
                        $query->where('status', 'active')
                            ->orWhere('status', 'enabled')
                            ->orWhere('status', 1)
                            ->orWhere('status', 'new');
                    })
                    ->get();

                foreach ($rows as $row) {
                    $databases->push([
                        'database' => (string)$row->database,
                        'host' => $row->db_host ?? $centralConfig['host'] ?? null,
                        'port' => $row->db_port ?? $centralConfig['port'] ?? null,
                        'username' => $row->db_user ?? $centralConfig['username'] ?? null,
                        'password' => $row->db_pass ?? $centralConfig['password'] ?? null,
                    ]);
                }
            }

            $templateExists = (bool)$central->selectOne(
                'SELECT COUNT(*) AS aggregate FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                ['newtenantdb']
            )->aggregate;

            if ($templateExists) {
                $databases->push(array_merge($centralConfig, [
                    'database' => 'newtenantdb',
                ]));
            }
        } catch (\Throwable $error) {
            logger()->warning('Inventory schema repair could not enumerate tenant databases', [
                'message' => $error->getMessage(),
            ]);
        }

        $seen = [];

        foreach ($databases as $tenantConfig) {
            $database = trim((string)($tenantConfig['database'] ?? ''));
            if ($database === '' || isset($seen[$database])) {
                continue;
            }
            $seen[$database] = true;

            $runtime = $centralConfig;
            foreach (['database', 'host', 'port', 'username', 'password'] as $key) {
                if (
                    array_key_exists($key, $tenantConfig)
                    && $tenantConfig[$key] !== null
                ) {
                    $runtime[$key] = $tenantConfig[$key];
                }
            }

            try {
                Config::set('database.connections.pmd_inventory_schema_tenant', $runtime);
                DB::purge('pmd_inventory_schema_tenant');
                DB::reconnect('pmd_inventory_schema_tenant');

                $this->ensureTables('pmd_inventory_schema_tenant');

                logger()->info('Inventory schema ensured for tenant', [
                    'database' => $database,
                ]);
            } catch (\Throwable $error) {
                logger()->error('Inventory schema repair failed for tenant', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_inventory_schema_tenant');
            }
        }

        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }

    private function ensureTables(string $connection): void
    {
        $schema = Schema::connection($connection);
        $db = DB::connection($connection);

        if (!$schema->hasTable('pmd_inventory_items')) {
            $schema->create('pmd_inventory_items', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 190);
                $table->string('sku', 120)->nullable();
                $table->string('category', 100)->nullable();
                $table->string('base_unit', 30)->default('piece');
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->decimal('reorder_point', 16, 4)->default(0);
                $table->decimal('par_level', 16, 4)->default(0);
                $table->string('supplier_name', 190)->nullable();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->index(
                    ['location_id', 'active'],
                    'pmd_inventory_items_location_active_idx'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_receipts')) {
            $schema->create('pmd_inventory_receipts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('supplier_name', 190)->nullable();
                $table->date('purchased_at')->nullable();
                $table->string('source', 40)->default('manual');
                $table->string('file_path', 500)->nullable();
                $table->string('original_name', 255)->nullable();
                $table->string('mime_type', 100)->nullable();
                $table->string('ai_status', 40)->default('not_requested')->index();
                $table->text('ai_payload_json')->nullable();
                $table->decimal('total_amount', 16, 4)->default(0);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_movements')) {
            $schema->create('pmd_inventory_movements', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->string('movement_type', 40)->index();
                $table->decimal('qty_delta', 16, 4);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->string('reference_type', 80)->nullable();
                $table->unsignedBigInteger('reference_id')->nullable();
                $table->string('reason', 160)->nullable();
                $table->text('note')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable()->index();
                $table->timestamp('occurred_at')->index();
                $table->timestamps();

                $table->index(
                    ['location_id', 'item_id', 'occurred_at'],
                    'pmd_inventory_movements_item_time_idx'
                );
                $table->index(
                    ['reference_type', 'reference_id'],
                    'pmd_inventory_movements_reference_idx'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_recipes')) {
            $schema->create('pmd_inventory_recipes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('menu_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('qty_per_sale', 16, 4);
                $table->boolean('active')->default(true);
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamp('effective_from')->nullable()->index();
                $table->timestamp('effective_to')->nullable()->index();
                $table->timestamps();

                $table->index(
                    ['location_id', 'menu_id', 'item_id', 'active'],
                    'pmd_inventory_recipe_current_idx'
                );
            });
        } else {
            if (!$schema->hasColumn('pmd_inventory_recipes', 'effective_from')) {
                $schema->table('pmd_inventory_recipes', function (Blueprint $table) {
                    $table->timestamp('effective_from')->nullable()->index();
                });
            }

            if (!$schema->hasColumn('pmd_inventory_recipes', 'effective_to')) {
                $schema->table('pmd_inventory_recipes', function (Blueprint $table) {
                    $table->timestamp('effective_to')->nullable()->index();
                });
            }

            $db->table('pmd_inventory_recipes')
                ->whereNull('effective_from')
                ->update([
                    'effective_from' => DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)'),
                ]);

            try {
                $schema->table('pmd_inventory_recipes', function (Blueprint $table) {
                    $table->dropUnique('pmd_inventory_recipe_unique');
                });
            } catch (\Throwable $ignored) {
            }

            try {
                $schema->table('pmd_inventory_recipes', function (Blueprint $table) {
                    $table->index(
                        ['location_id', 'menu_id', 'item_id', 'active'],
                        'pmd_inventory_recipe_current_idx'
                    );
                });
            } catch (\Throwable $ignored) {
            }
        }

        if (!$schema->hasTable('pmd_inventory_counts')) {
            $schema->create('pmd_inventory_counts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('status', 30)->default('completed')->index();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->timestamp('counted_at')->index();
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_count_lines')) {
            $schema->create('pmd_inventory_count_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('count_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('expected_qty', 16, 4)->default(0);
                $table->decimal('counted_qty', 16, 4)->default(0);
                $table->decimal('variance_qty', 16, 4)->default(0);
                $table->decimal('unit_cost_snapshot', 16, 4)->default(0);
                $table->timestamps();

                $table->unique(
                    ['count_id', 'item_id'],
                    'pmd_inventory_count_line_unique'
                );
            });
        }
    }
};
