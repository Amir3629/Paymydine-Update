<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_PRO_R24
 *
 * Additive professional inventory foundation:
 * - real product identifiers / GTIN package mappings
 * - supplier master + supplier product catalogue
 * - purchase orders and partial receiving
 * - storage locations, internal movements, lots and expiry
 * - supplier price history
 * - inventory operating settings
 * - duplicate supplier document fingerprinting
 *
 * Existing R1/R23 stock, movement, recipe, count and waste tables stay the
 * accounting authority. These tables extend them without rewriting history.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->ensureOnConnection(DB::getDefaultConnection());
        $this->ensureOnTenantDatabases();
    }

    public function down(): void
    {
        // Operational inventory history is intentionally additive.
        // Never destroy tenant purchase/lot/identifier history automatically.
    }

    private function ensureOnTenantDatabases(): void
    {
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_inventory_r24_central', $centralConfig);
            DB::purge('pmd_inventory_r24_central');
            DB::reconnect('pmd_inventory_r24_central');

            $central = DB::connection('pmd_inventory_r24_central');

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
                $databases->push(array_merge($centralConfig, ['database' => 'newtenantdb']));
            }
        } catch (\Throwable $error) {
            logger()->warning('Inventory R24 migration could not enumerate tenants', [
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
                if (array_key_exists($key, $tenantConfig) && $tenantConfig[$key] !== null) {
                    $runtime[$key] = $tenantConfig[$key];
                }
            }

            try {
                Config::set('database.connections.pmd_inventory_r24_tenant', $runtime);
                DB::purge('pmd_inventory_r24_tenant');
                DB::reconnect('pmd_inventory_r24_tenant');
                $this->ensureOnConnection('pmd_inventory_r24_tenant');
            } catch (\Throwable $error) {
                logger()->error('Inventory R24 tenant migration failed', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_inventory_r24_tenant');
            }
        }

        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }

    private function ensureOnConnection(string $connection): void
    {
        $schema = Schema::connection($connection);

        if (!$schema->hasTable('pmd_inventory_items')) {
            return;
        }

        if (!$schema->hasTable('pmd_inventory_suppliers')) {
            $schema->create('pmd_inventory_suppliers', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 190);
                $table->string('supplier_code', 100)->nullable();
                $table->string('email', 190)->nullable();
                $table->string('phone', 80)->nullable();
                $table->string('order_email', 190)->nullable();
                $table->unsignedSmallInteger('lead_time_days')->default(1);
                $table->decimal('min_order_value', 16, 4)->default(0);
                $table->string('currency', 12)->default('EUR');
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'name'],
                    'pmd_inv_sup_location_name_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_supplier_items')) {
            $schema->create('pmd_inventory_supplier_items', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->string('supplier_sku', 120)->nullable();
                $table->string('gtin', 190)->nullable();
                $table->string('package_unit', 30)->default('piece');
                $table->decimal('package_quantity', 16, 4)->default(1);
                $table->decimal('base_quantity', 16, 4)->default(1);
                $table->decimal('unit_price', 16, 4)->default(0);
                $table->decimal('min_order_qty', 16, 4)->default(1);
                $table->decimal('order_multiple', 16, 4)->default(1);
                $table->string('currency', 12)->default('EUR');
                $table->boolean('is_preferred')->default(false)->index();
                $table->boolean('active')->default(true)->index();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'supplier_id', 'item_id', 'supplier_sku'],
                    'pmd_inv_sup_item_sku_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_item_identifiers')) {
            $schema->create('pmd_inventory_item_identifiers', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->unsignedBigInteger('supplier_item_id')->nullable()->index();
                $table->string('code', 190);
                $table->string('code_type', 30)->default('INTERNAL');
                $table->string('package_unit', 30)->default('piece');
                $table->decimal('package_quantity', 16, 4)->default(1);
                $table->decimal('base_quantity', 16, 4)->default(1);
                $table->decimal('unit_price', 16, 4)->default(0);
                $table->string('currency', 12)->nullable();
                $table->string('source', 30)->default('manual');
                $table->boolean('is_primary')->default(false)->index();
                $table->boolean('active')->default(true)->index();
                $table->timestamp('verified_at')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'code'],
                    'pmd_inv_identifier_location_code_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_storage_locations')) {
            $schema->create('pmd_inventory_storage_locations', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 140);
                $table->string('kind', 40)->default('storage');
                $table->boolean('is_default')->default(false)->index();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'name'],
                    'pmd_inv_storage_location_name_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_storage_movements')) {
            $schema->create('pmd_inventory_storage_movements', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('storage_location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('qty_delta', 16, 4);
                $table->string('movement_type', 40)->index();
                $table->string('reference_type', 80)->nullable();
                $table->unsignedBigInteger('reference_id')->nullable();
                $table->text('note')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable()->index();
                $table->timestamp('occurred_at')->index();
                $table->timestamps();

                $table->index(
                    ['location_id', 'item_id', 'storage_location_id'],
                    'pmd_inv_storage_item_idx'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_lots')) {
            $schema->create('pmd_inventory_lots', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->unsignedBigInteger('identifier_id')->nullable()->index();
                $table->unsignedBigInteger('storage_location_id')->nullable()->index();
                $table->unsignedBigInteger('receipt_id')->nullable()->index();
                $table->unsignedBigInteger('purchase_order_id')->nullable()->index();
                $table->string('lot_code', 120)->nullable();
                $table->date('expires_at')->nullable()->index();
                $table->date('received_at')->nullable()->index();
                $table->decimal('qty_received', 16, 4)->default(0);
                $table->decimal('qty_remaining', 16, 4)->default(0);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->boolean('active')->default(true)->index();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_purchase_orders')) {
            $schema->create('pmd_inventory_purchase_orders', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->string('order_number', 80);
                $table->string('status', 30)->default('draft')->index();
                $table->dateTime('ordered_at')->nullable();
                $table->dateTime('expected_at')->nullable();
                $table->dateTime('received_at')->nullable();
                $table->string('currency', 12)->default('EUR');
                $table->decimal('estimated_total', 16, 4)->default(0);
                $table->text('note')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'order_number'],
                    'pmd_inv_po_location_number_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_purchase_order_lines')) {
            $schema->create('pmd_inventory_purchase_order_lines', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('purchase_order_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('identifier_id')->nullable()->index();
                $table->string('description', 190)->nullable();
                $table->decimal('quantity_ordered', 16, 4)->default(0);
                $table->decimal('quantity_received', 16, 4)->default(0);
                $table->string('package_unit', 30)->default('piece');
                $table->decimal('base_quantity_per_package', 16, 4)->default(1);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_price_history')) {
            $schema->create('pmd_inventory_price_history', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->unsignedBigInteger('identifier_id')->nullable()->index();
                $table->string('purchase_unit', 30)->default('piece');
                $table->decimal('base_quantity', 16, 4)->default(1);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->string('currency', 12)->default('EUR');
                $table->string('source', 30)->default('purchase');
                $table->timestamp('recorded_at')->index();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_alert_states')) {
            $schema->create('pmd_inventory_alert_states', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('alert_key', 190);
                $table->string('status', 40)->default('clear')->index();
                $table->timestamp('last_notified_at')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'alert_key'],
                    'pmd_inv_alert_state_key_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_settings')) {
            $schema->create('pmd_inventory_settings', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->unique();
                $table->string('consumption_event', 30)->default('paid');
                $table->unsignedSmallInteger('expiry_alert_days')->default(5);
                $table->decimal('safety_stock_days', 8, 2)->default(1.5);
                $table->boolean('blind_counts')->default(false);
                $table->boolean('allow_negative_stock')->default(false);
                $table->timestamps();
            });
        }

        if ($schema->hasTable('pmd_inventory_receipts')) {
            if (!$schema->hasColumn('pmd_inventory_receipts', 'document_hash')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table): void {
                    $table->string('document_hash', 64)->nullable()->index();
                });
            }

            if (!$schema->hasColumn('pmd_inventory_receipts', 'invoice_number')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table): void {
                    $table->string('invoice_number', 120)->nullable()->index();
                });
            }
        }
    }
};
