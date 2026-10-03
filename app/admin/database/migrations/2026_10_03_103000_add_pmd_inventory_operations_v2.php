<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_OPERATIONS_V2_R24
 *
 * Additive, tenant-aware operational foundation for:
 * - GS1 / supplier identifiers with package conversion
 * - suppliers + supplier item offers
 * - purchase orders + receiving
 * - storage locations + transfers
 * - lots / expiry
 * - weighted-cost history
 * - preparation / production batches
 * - per-location inventory settings
 *
 * Existing Inventory R1 tables remain the stock authority. This migration only
 * extends them and creates normalized operational metadata around that ledger.
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
        // Operational production data is intentionally additive and retained.
    }

    private function ensureOnTenantDatabases(): void
    {
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_inventory_ops_central', $centralConfig);
            DB::purge('pmd_inventory_ops_central');
            DB::reconnect('pmd_inventory_ops_central');

            $central = DB::connection('pmd_inventory_ops_central');

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
            logger()->warning('Inventory Operations V2 could not enumerate tenants', [
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
                Config::set('database.connections.pmd_inventory_ops_tenant', $runtime);
                DB::purge('pmd_inventory_ops_tenant');
                DB::reconnect('pmd_inventory_ops_tenant');
                $this->ensureOnConnection('pmd_inventory_ops_tenant');
            } catch (\Throwable $error) {
                logger()->error('Inventory Operations V2 migration failed for tenant', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_inventory_ops_tenant');
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

        if (!$schema->hasColumn('pmd_inventory_items', 'safety_stock')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->decimal('safety_stock', 16, 4)->default(0)->after('par_level');
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'default_storage_location_id')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->unsignedBigInteger('default_storage_location_id')->nullable()->after('supplier_name');
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'yield_percent')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->decimal('yield_percent', 7, 2)->default(100)->after('default_storage_location_id');
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'track_expiry')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->boolean('track_expiry')->default(false)->after('yield_percent');
            });
        }

        if ($schema->hasTable('pmd_inventory_receipts')) {
            if (!$schema->hasColumn('pmd_inventory_receipts', 'document_fingerprint')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->string('document_fingerprint', 64)->nullable()->index()->after('mime_type');
                });
            }
            if (!$schema->hasColumn('pmd_inventory_receipts', 'invoice_number')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->string('invoice_number', 120)->nullable()->after('document_fingerprint');
                });
            }
            if (!$schema->hasColumn('pmd_inventory_receipts', 'purchase_order_id')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->unsignedBigInteger('purchase_order_id')->nullable()->index()->after('invoice_number');
                });
            }
            if (!$schema->hasColumn('pmd_inventory_receipts', 'storage_location_id')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->unsignedBigInteger('storage_location_id')->nullable()->index()->after('purchase_order_id');
                });
            }
            if (!$schema->hasColumn('pmd_inventory_receipts', 'reversed_at')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->timestamp('reversed_at')->nullable()->after('confirmed_at');
                });
            }
            if (!$schema->hasColumn('pmd_inventory_receipts', 'reversed_by')) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) {
                    $table->unsignedBigInteger('reversed_by')->nullable()->after('reversed_at');
                });
            }
        }

        if ($schema->hasTable('pmd_inventory_movements')) {
            if (!$schema->hasColumn('pmd_inventory_movements', 'storage_location_id')) {
                $schema->table('pmd_inventory_movements', function (Blueprint $table) {
                    $table->unsignedBigInteger('storage_location_id')->nullable()->index()->after('item_id');
                });
            }
            if (!$schema->hasColumn('pmd_inventory_movements', 'lot_id')) {
                $schema->table('pmd_inventory_movements', function (Blueprint $table) {
                    $table->unsignedBigInteger('lot_id')->nullable()->index()->after('storage_location_id');
                });
            }
            if (!$schema->hasColumn('pmd_inventory_movements', 'purchase_order_line_id')) {
                $schema->table('pmd_inventory_movements', function (Blueprint $table) {
                    $table->unsignedBigInteger('purchase_order_line_id')->nullable()->index()->after('lot_id');
                });
            }
        }

        if (!$schema->hasTable('pmd_inventory_suppliers')) {
            $schema->create('pmd_inventory_suppliers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 190);
                $table->string('account_ref', 120)->nullable();
                $table->string('contact_name', 190)->nullable();
                $table->string('email', 190)->nullable();
                $table->string('phone', 80)->nullable();
                $table->unsignedInteger('lead_time_days')->default(1);
                $table->decimal('min_order_value', 16, 4)->default(0);
                $table->text('delivery_days_json')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(['location_id', 'name'], 'pmd_inv_supplier_location_name_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_identifiers')) {
            $schema->create('pmd_inventory_identifiers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->string('code', 160);
                $table->string('code_type', 30)->default('internal');
                $table->string('package_unit', 30)->default('piece');
                $table->decimal('package_quantity', 16, 4)->default(1);
                $table->decimal('base_quantity', 16, 4)->default(1);
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->string('supplier_item_code', 120)->nullable();
                $table->boolean('is_primary')->default(false);
                $table->string('source', 40)->default('manual');
                $table->timestamp('verified_at')->nullable();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(['location_id', 'code'], 'pmd_inv_identifier_location_code_uq');
                $table->index(['location_id', 'item_id', 'active'], 'pmd_inv_identifier_item_active_idx');
            });
        }

        if (!$schema->hasTable('pmd_inventory_supplier_items')) {
            $schema->create('pmd_inventory_supplier_items', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->string('supplier_sku', 120)->nullable();
                $table->string('purchase_unit', 30)->default('piece');
                $table->decimal('purchase_to_base', 16, 4)->default(1);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->decimal('moq', 16, 4)->default(1);
                $table->decimal('pack_multiple', 16, 4)->default(1);
                $table->unsignedInteger('lead_time_days')->nullable();
                $table->boolean('preferred')->default(false)->index();
                $table->boolean('active')->default(true)->index();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'supplier_id', 'item_id'],
                    'pmd_inv_supplier_item_location_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_storage_locations')) {
            $schema->create('pmd_inventory_storage_locations', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 120);
                $table->string('type', 40)->default('storage');
                $table->boolean('is_default')->default(false)->index();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(['location_id', 'name'], 'pmd_inv_storage_location_name_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_lots')) {
            $schema->create('pmd_inventory_lots', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('storage_location_id')->nullable()->index();
                $table->unsignedBigInteger('receipt_id')->nullable()->index();
                $table->string('lot_code', 120)->nullable();
                $table->date('expiry_date')->nullable()->index();
                $table->timestamp('received_at')->nullable()->index();
                $table->decimal('qty_received', 16, 4)->default(0);
                $table->decimal('qty_remaining', 16, 4)->default(0);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->string('status', 30)->default('open')->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->index(
                    ['location_id', 'item_id', 'status'],
                    'pmd_inv_lot_item_status_idx'
                );
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
                $table->decimal('subtotal', 16, 4)->default(0);
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('closed_at')->nullable();
                $table->timestamps();

                $table->unique(['location_id', 'order_number'], 'pmd_inv_po_location_number_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_purchase_order_lines')) {
            $schema->create('pmd_inventory_purchase_order_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('purchase_order_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_item_id')->nullable()->index();
                $table->decimal('ordered_qty', 16, 4);
                $table->decimal('received_qty', 16, 4)->default(0);
                $table->string('unit', 30)->default('piece');
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->decimal('base_quantity_per_unit', 16, 4)->default(1);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_transfers')) {
            $schema->create('pmd_inventory_transfers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('from_storage_id')->index();
                $table->unsignedBigInteger('to_storage_id')->index();
                $table->string('status', 30)->default('completed')->index();
                $table->text('note')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->timestamp('transferred_at')->index();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_transfer_lines')) {
            $schema->create('pmd_inventory_transfer_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('transfer_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('lot_id')->nullable()->index();
                $table->decimal('qty_base', 16, 4);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_cost_history')) {
            $schema->create('pmd_inventory_cost_history', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->unsignedBigInteger('receipt_id')->nullable()->index();
                $table->decimal('old_unit_cost', 16, 6)->default(0);
                $table->decimal('new_unit_cost', 16, 6)->default(0);
                $table->decimal('purchase_unit_cost', 16, 4)->default(0);
                $table->timestamp('occurred_at')->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_settings')) {
            $schema->create('pmd_inventory_settings', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->unique();
                $table->string('consumption_trigger', 30)->default('paid');
                $table->boolean('blind_counts')->default(true);
                $table->boolean('low_stock_notifications')->default(true);
                $table->unsignedInteger('expiry_warning_days')->default(7);
                $table->unsignedBigInteger('default_storage_id')->nullable();
                $table->boolean('auto_menu_availability')->default(false);
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_preparations')) {
            $schema->create('pmd_inventory_preparations', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 190);
                $table->unsignedBigInteger('output_item_id')->index();
                $table->decimal('output_qty', 16, 4)->default(1);
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(['location_id', 'name'], 'pmd_inv_preparation_location_name_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_preparation_lines')) {
            $schema->create('pmd_inventory_preparation_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('preparation_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('qty_input', 16, 4);
                $table->timestamps();

                $table->unique(
                    ['preparation_id', 'item_id'],
                    'pmd_inv_preparation_line_uq'
                );
            });
        }

        if (!$schema->hasTable('pmd_inventory_production_batches')) {
            $schema->create('pmd_inventory_production_batches', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('preparation_id')->index();
                $table->decimal('output_qty', 16, 4);
                $table->unsignedBigInteger('storage_location_id')->nullable()->index();
                $table->string('lot_code', 120)->nullable();
                $table->date('expiry_date')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->text('note')->nullable();
                $table->timestamp('produced_at')->index();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_production_batch_lines')) {
            $schema->create('pmd_inventory_production_batch_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('production_batch_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('qty_input', 16, 4);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->timestamps();
            });
        }
    }
};
