<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_OPERATIONS_V24
 *
 * Additive restaurant inventory operations layer:
 * - normalized barcode / GTIN identifiers with package conversion
 * - supplier master and supplier-specific purchase packs
 * - purchase orders and receiving progress
 * - storage locations, transfers, lots and expiry metadata
 * - cost history and operational settings
 *
 * This migration is tenant-aware and also provisions newtenantdb.
 * It never removes existing inventory data.
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
        // Additive operational schema. Never delete restaurant inventory data.
    }

    private function ensureOnTenantDatabases(): void
    {
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_inventory_v24_central', $centralConfig);
            DB::purge('pmd_inventory_v24_central');
            DB::reconnect('pmd_inventory_v24_central');
            $central = DB::connection('pmd_inventory_v24_central');

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
            logger()->warning('Inventory V24 could not enumerate tenant databases', [
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
                Config::set('database.connections.pmd_inventory_v24_tenant', $runtime);
                DB::purge('pmd_inventory_v24_tenant');
                DB::reconnect('pmd_inventory_v24_tenant');
                $this->ensureOnConnection('pmd_inventory_v24_tenant');
            } catch (\Throwable $error) {
                logger()->error('Inventory V24 migration failed for tenant', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_inventory_v24_tenant');
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
            $schema->create('pmd_inventory_suppliers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 190);
                $table->string('account_code', 120)->nullable();
                $table->string('email', 190)->nullable();
                $table->string('phone', 80)->nullable();
                $table->string('order_email', 190)->nullable();
                $table->unsignedInteger('lead_time_days')->default(1);
                $table->decimal('min_order_value', 16, 4)->default(0);
                $table->text('notes')->nullable();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'name'], 'pmd_inv_sup_loc_name_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_supplier_items')) {
            $schema->create('pmd_inventory_supplier_items', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->string('supplier_sku', 160)->nullable();
                $table->string('pack_unit', 40)->default('piece');
                $table->decimal('pack_to_base', 16, 4)->default(1);
                $table->decimal('pack_cost', 16, 4)->default(0);
                $table->decimal('min_order_qty', 16, 4)->default(0);
                $table->decimal('order_multiple', 16, 4)->default(1);
                $table->boolean('is_primary')->default(false)->index();
                $table->boolean('active')->default(true)->index();
                $table->timestamps();
                $table->index(['location_id', 'item_id', 'active'], 'pmd_inv_sup_item_loc_idx');
            });
        }

        if (!$schema->hasTable('pmd_inventory_item_identifiers')) {
            $schema->create('pmd_inventory_item_identifiers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->string('code', 190);
                $table->string('normalized_code', 190);
                $table->string('code_type', 30)->default('unknown');
                $table->string('package_unit', 40)->default('piece');
                $table->decimal('package_to_base', 16, 4)->default(1);
                $table->boolean('is_primary')->default(false)->index();
                $table->timestamp('verified_at')->nullable();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'normalized_code'], 'pmd_inv_identifier_code_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_storage_locations')) {
            $schema->create('pmd_inventory_storage_locations', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 160);
                $table->string('type', 50)->default('storage');
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'name'], 'pmd_inv_storage_loc_name_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_lots')) {
            $schema->create('pmd_inventory_lots', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('storage_location_id')->nullable()->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->unsignedBigInteger('receipt_id')->nullable()->index();
                $table->string('lot_code', 160)->nullable();
                $table->date('expiry_date')->nullable()->index();
                $table->decimal('qty_received', 16, 4)->default(0);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->boolean('active')->default(true)->index();
                $table->timestamps();
                $table->index(['location_id', 'item_id', 'expiry_date'], 'pmd_inv_lot_item_exp_idx');
            });
        }

        if (!$schema->hasTable('pmd_inventory_purchase_orders')) {
            $schema->create('pmd_inventory_purchase_orders', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->string('order_number', 80);
                $table->string('status', 30)->default('draft')->index();
                $table->date('ordered_at')->nullable();
                $table->date('expected_at')->nullable();
                $table->timestamp('received_at')->nullable();
                $table->string('currency', 3)->default('EUR');
                $table->decimal('subtotal', 16, 4)->default(0);
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'order_number'], 'pmd_inv_po_number_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_purchase_order_lines')) {
            $schema->create('pmd_inventory_purchase_order_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('purchase_order_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_item_id')->nullable()->index();
                $table->decimal('ordered_qty', 16, 4)->default(0);
                $table->decimal('received_qty', 16, 4)->default(0);
                $table->string('unit', 40)->default('piece');
                $table->decimal('pack_to_base', 16, 4)->default(1);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->timestamps();
                $table->index(['purchase_order_id', 'item_id'], 'pmd_inv_po_line_item_idx');
            });
        }

        if (!$schema->hasTable('pmd_inventory_cost_history')) {
            $schema->create('pmd_inventory_cost_history', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->unsignedBigInteger('receipt_id')->nullable()->index();
                $table->decimal('base_unit_cost', 16, 6)->default(0);
                $table->decimal('purchase_unit_cost', 16, 4)->default(0);
                $table->string('purchase_unit', 40)->nullable();
                $table->date('purchased_at')->nullable()->index();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_settings')) {
            $schema->create('pmd_inventory_settings', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->unique();
                $table->string('consumption_trigger', 30)->default('paid');
                $table->unsignedBigInteger('default_storage_location_id')->nullable();
                $table->unsignedInteger('expiry_warning_days')->default(7);
                $table->boolean('blind_count')->default(false);
                $table->boolean('low_stock_notifications')->default(true);
                $table->boolean('menu_availability_guard')->default(false);
                $table->timestamps();
            });
        }

        if (!$schema->hasColumn('pmd_inventory_items', 'safety_stock')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->decimal('safety_stock', 16, 4)->default(0)->after('par_level');
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'preferred_supplier_id')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->unsignedBigInteger('preferred_supplier_id')->nullable()->index()->after('supplier_name');
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'image_url')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->string('image_url', 500)->nullable()->after('preferred_supplier_id');
            });
        }

        if ($schema->hasTable('pmd_inventory_receipts')) {
            foreach ([
                'supplier_id' => 'supplier_id',
                'purchase_order_id' => 'purchase_order_id',
            ] as $column => $label) {
                if (!$schema->hasColumn('pmd_inventory_receipts', $column)) {
                    $schema->table('pmd_inventory_receipts', function (Blueprint $table) use ($column) {
                        $table->unsignedBigInteger($column)->nullable()->index();
                    });
                }
            }
            if (!$schema->hasColumn('pmd_inventory_receipts', 'supplier_invoice_number')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->string('supplier_invoice_number', 120)->nullable()->index();
                });
            }
            if (!$schema->hasColumn('pmd_inventory_receipts', 'document_hash')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->string('document_hash', 64)->nullable()->index();
                });
            }
        }

        if ($schema->hasTable('pmd_inventory_movements')) {
            foreach (['storage_location_id', 'to_storage_location_id', 'lot_id', 'reversal_of_id'] as $column) {
                if (!$schema->hasColumn('pmd_inventory_movements', $column)) {
                    $schema->table('pmd_inventory_movements', function (Blueprint $table) use ($column) {
                        $table->unsignedBigInteger($column)->nullable()->index();
                    });
                }
            }
            if (!$schema->hasColumn('pmd_inventory_movements', 'metadata_json')) {
                $schema->table('pmd_inventory_movements', function (Blueprint $table) {
                    $table->text('metadata_json')->nullable();
                });
            }
        }

        if ($schema->hasTable('pmd_inventory_counts')) {
            if (!$schema->hasColumn('pmd_inventory_counts', 'scope_json')) {
                $schema->table('pmd_inventory_counts', function (Blueprint $table) {
                    $table->text('scope_json')->nullable();
                });
            }
            if (!$schema->hasColumn('pmd_inventory_counts', 'approved_by')) {
                $schema->table('pmd_inventory_counts', function (Blueprint $table) {
                    $table->unsignedBigInteger('approved_by')->nullable();
                    $table->timestamp('approved_at')->nullable();
                });
            }
        }

        $db = DB::connection($connection);

        if ($schema->hasTable('pmd_inventory_storage_locations')) {
            $hasStorage = $db->table('pmd_inventory_storage_locations')->exists();
            if (!$hasStorage) {
                $now = now();
                foreach ([
                    ['name' => 'Main storage', 'type' => 'storage'],
                    ['name' => 'Kitchen', 'type' => 'kitchen'],
                    ['name' => 'Bar', 'type' => 'bar'],
                    ['name' => 'Fridge', 'type' => 'fridge'],
                    ['name' => 'Freezer', 'type' => 'freezer'],
                ] as $row) {
                    // Location-specific defaults are created lazily by the service.
                    // Do not guess a location_id during a tenant-wide migration.
                }
            }
        }
    }
};
