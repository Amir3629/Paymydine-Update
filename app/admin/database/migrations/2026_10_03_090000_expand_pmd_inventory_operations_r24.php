<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_OPERATIONS_R24
 *
 * Production inventory foundation on top of R1/R23:
 * - real product identifiers / GTIN / barcode package conversions
 * - supplier master + supplier-specific packaging/pricing
 * - storage locations, lots/batches and expiry dates
 * - purchase orders + partial receiving
 * - transfer / production / reversal traceability
 * - operational settings and richer count metadata
 *
 * Tenant-aware: applies to the current connection, active tenant databases,
 * and the newtenantdb template when available.
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
        // Operational history is intentionally additive and not destructively
        // removed from tenant databases.
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
                logger()->error('Inventory R24 migration failed for tenant', [
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

        $this->ensureItemColumns($schema);
        $this->ensureReceiptColumns($schema);
        $this->ensureMovementColumns($schema);
        $this->ensureCountColumns($schema);
        $this->ensureOperationsTables($schema);
        $this->seedDefaults($connection);
    }

    private function ensureItemColumns($schema): void
    {
        if (!$schema->hasColumn('pmd_inventory_items', 'preferred_supplier_id')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->unsignedBigInteger('preferred_supplier_id')->nullable()->index();
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'default_storage_location_id')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->unsignedBigInteger('default_storage_location_id')->nullable()->index();
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'safety_stock')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->decimal('safety_stock', 16, 4)->default(0);
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'lead_time_days')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->unsignedSmallInteger('lead_time_days')->default(0);
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'minimum_order_qty')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->decimal('minimum_order_qty', 16, 4)->default(0);
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'order_multiple')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->decimal('order_multiple', 16, 4)->default(1);
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'expiry_tracking')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->boolean('expiry_tracking')->default(false);
            });
        }
        if (!$schema->hasColumn('pmd_inventory_items', 'costing_method')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->string('costing_method', 30)->default('weighted_average');
            });
        }
    }

    private function ensureReceiptColumns($schema): void
    {
        if (!$schema->hasTable('pmd_inventory_receipts')) {
            return;
        }
        $columns = [
            'supplier_id' => fn (Blueprint $table) => $table->unsignedBigInteger('supplier_id')->nullable()->index(),
            'invoice_number' => fn (Blueprint $table) => $table->string('invoice_number', 120)->nullable()->index(),
            'invoice_hash' => fn (Blueprint $table) => $table->string('invoice_hash', 64)->nullable()->index(),
            'delivery_note_number' => fn (Blueprint $table) => $table->string('delivery_note_number', 120)->nullable(),
            'purchase_order_id' => fn (Blueprint $table) => $table->unsignedBigInteger('purchase_order_id')->nullable()->index(),
            'status' => fn (Blueprint $table) => $table->string('status', 30)->default('confirmed')->index(),
            'received_at' => fn (Blueprint $table) => $table->timestamp('received_at')->nullable(),
            'reversed_at' => fn (Blueprint $table) => $table->timestamp('reversed_at')->nullable(),
            'reversed_by' => fn (Blueprint $table) => $table->unsignedBigInteger('reversed_by')->nullable(),
        ];

        foreach ($columns as $name => $definition) {
            if (!$schema->hasColumn('pmd_inventory_receipts', $name)) {
                $schema->table('pmd_inventory_receipts', function (Blueprint $table) use ($definition) {
                    $definition($table);
                });
            }
        }
    }

    private function ensureMovementColumns($schema): void
    {
        if (!$schema->hasTable('pmd_inventory_movements')) {
            return;
        }
        $columns = [
            'storage_location_id' => fn (Blueprint $table) => $table->unsignedBigInteger('storage_location_id')->nullable()->index(),
            'batch_id' => fn (Blueprint $table) => $table->unsignedBigInteger('batch_id')->nullable()->index(),
            'reversal_of_movement_id' => fn (Blueprint $table) => $table->unsignedBigInteger('reversal_of_movement_id')->nullable()->index(),
            'metadata_json' => fn (Blueprint $table) => $table->text('metadata_json')->nullable(),
        ];

        foreach ($columns as $name => $definition) {
            if (!$schema->hasColumn('pmd_inventory_movements', $name)) {
                $schema->table('pmd_inventory_movements', function (Blueprint $table) use ($definition) {
                    $definition($table);
                });
            }
        }
    }

    private function ensureCountColumns($schema): void
    {
        if ($schema->hasTable('pmd_inventory_counts')) {
            if (!$schema->hasColumn('pmd_inventory_counts', 'scope_json')) {
                $schema->table('pmd_inventory_counts', function (Blueprint $table) {
                    $table->text('scope_json')->nullable();
                });
            }
            if (!$schema->hasColumn('pmd_inventory_counts', 'blind_count')) {
                $schema->table('pmd_inventory_counts', function (Blueprint $table) {
                    $table->boolean('blind_count')->default(true);
                });
            }
            if (!$schema->hasColumn('pmd_inventory_counts', 'approved_by')) {
                $schema->table('pmd_inventory_counts', function (Blueprint $table) {
                    $table->unsignedBigInteger('approved_by')->nullable();
                });
            }
            if (!$schema->hasColumn('pmd_inventory_counts', 'approved_at')) {
                $schema->table('pmd_inventory_counts', function (Blueprint $table) {
                    $table->timestamp('approved_at')->nullable();
                });
            }
        }

        if ($schema->hasTable('pmd_inventory_count_lines')) {
            if (!$schema->hasColumn('pmd_inventory_count_lines', 'storage_location_id')) {
                $schema->table('pmd_inventory_count_lines', function (Blueprint $table) {
                    $table->unsignedBigInteger('storage_location_id')->nullable()->index();
                });
            }
            if (!$schema->hasColumn('pmd_inventory_count_lines', 'batch_id')) {
                $schema->table('pmd_inventory_count_lines', function (Blueprint $table) {
                    $table->unsignedBigInteger('batch_id')->nullable()->index();
                });
            }
        }
    }

    private function ensureOperationsTables($schema): void
    {
        if (!$schema->hasTable('pmd_inventory_suppliers')) {
            $schema->create('pmd_inventory_suppliers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 190);
                $table->string('contact_name', 190)->nullable();
                $table->string('email', 190)->nullable();
                $table->string('phone', 80)->nullable();
                $table->string('order_email', 190)->nullable();
                $table->unsignedSmallInteger('lead_time_days')->default(0);
                $table->decimal('minimum_order_value', 16, 4)->default(0);
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'name'], 'pmd_inv_supplier_location_name_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_storage_locations')) {
            $schema->create('pmd_inventory_storage_locations', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 120);
                $table->string('code', 60);
                $table->string('kind', 40)->default('storage');
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'code'], 'pmd_inv_storage_location_code_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_item_identifiers')) {
            $schema->create('pmd_inventory_item_identifiers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->string('code', 190);
                $table->string('code_type', 40)->default('unknown');
                $table->string('package_unit', 30)->default('piece');
                $table->decimal('package_quantity', 16, 4)->default(1);
                $table->decimal('base_quantity', 16, 4)->default(1);
                $table->boolean('is_primary')->default(false);
                $table->string('source', 40)->default('manual');
                $table->timestamp('verified_at')->nullable();
                $table->boolean('active')->default(true)->index();
                $table->timestamps();
                $table->unique(['location_id', 'code'], 'pmd_inv_identifier_location_code_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_supplier_items')) {
            $schema->create('pmd_inventory_supplier_items', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->string('supplier_sku', 120)->nullable()->index();
                $table->string('package_unit', 30)->default('piece');
                $table->decimal('package_quantity', 16, 4)->default(1);
                $table->decimal('base_quantity', 16, 4)->default(1);
                $table->decimal('price', 16, 4)->default(0);
                $table->string('currency', 3)->default('EUR');
                $table->decimal('minimum_order_qty', 16, 4)->default(0);
                $table->decimal('order_multiple', 16, 4)->default(1);
                $table->boolean('is_preferred')->default(false);
                $table->timestamp('last_price_at')->nullable();
                $table->boolean('active')->default(true)->index();
                $table->timestamps();
                $table->index(['supplier_id', 'item_id'], 'pmd_inv_supplier_item_idx');
            });
        }

        if (!$schema->hasTable('pmd_inventory_supplier_price_history')) {
            $schema->create('pmd_inventory_supplier_price_history', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_item_id')->index();
                $table->unsignedBigInteger('receipt_id')->nullable()->index();
                $table->decimal('price', 16, 4);
                $table->string('currency', 3)->default('EUR');
                $table->string('source', 40)->default('purchase');
                $table->timestamp('occurred_at')->index();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_purchase_orders')) {
            $schema->create('pmd_inventory_purchase_orders', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->string('po_number', 60);
                $table->string('status', 30)->default('draft')->index();
                $table->date('ordered_at')->nullable();
                $table->date('expected_at')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('received_at')->nullable();
                $table->decimal('subtotal', 16, 4)->default(0);
                $table->decimal('total', 16, 4)->default(0);
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'po_number'], 'pmd_inv_po_location_number_uq');
            });
        }

        if (!$schema->hasTable('pmd_inventory_purchase_order_lines')) {
            $schema->create('pmd_inventory_purchase_order_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('purchase_order_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('supplier_item_id')->nullable()->index();
                $table->string('description', 190);
                $table->decimal('quantity_ordered', 16, 4)->default(0);
                $table->decimal('quantity_received', 16, 4)->default(0);
                $table->string('package_unit', 30)->default('piece');
                $table->decimal('base_quantity', 16, 4)->default(1);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->decimal('line_total', 16, 4)->default(0);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_batches')) {
            $schema->create('pmd_inventory_batches', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('storage_location_id')->nullable()->index();
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->unsignedBigInteger('receipt_id')->nullable()->index();
                $table->string('lot_code', 120)->nullable()->index();
                $table->date('expiry_date')->nullable()->index();
                $table->timestamp('received_at')->nullable();
                $table->decimal('qty_received', 16, 4)->default(0);
                $table->decimal('qty_remaining', 16, 4)->default(0);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->string('status', 30)->default('open')->index();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_transfers')) {
            $schema->create('pmd_inventory_transfers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->unsignedBigInteger('from_storage_location_id')->nullable()->index();
                $table->unsignedBigInteger('to_storage_location_id')->nullable()->index();
                $table->decimal('quantity_base', 16, 4);
                $table->string('status', 30)->default('completed')->index();
                $table->timestamp('occurred_at')->index();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_production_batches')) {
            $schema->create('pmd_inventory_production_batches', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('output_item_id')->index();
                $table->decimal('quantity_output', 16, 4);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->string('status', 30)->default('completed')->index();
                $table->timestamp('produced_at')->index();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_production_inputs')) {
            $schema->create('pmd_inventory_production_inputs', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('production_batch_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('qty_base', 16, 4);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_inventory_settings')) {
            $schema->create('pmd_inventory_settings', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->unique();
                $table->string('consumption_event', 30)->default('paid');
                $table->string('valuation_method', 30)->default('weighted_average');
                $table->decimal('default_safety_days', 8, 2)->default(2);
                $table->unsignedSmallInteger('expiry_alert_days')->default(3);
                $table->boolean('notifications_enabled')->default(true);
                $table->timestamps();
            });
        }
    }

    private function seedDefaults(string $connection): void
    {
        $db = DB::connection($connection);
        $schema = $db->getSchemaBuilder();

        if (!$schema->hasTable('pmd_inventory_items')) {
            return;
        }

        $locationIds = $db->table('pmd_inventory_items')
            ->select('location_id')
            ->distinct()
            ->pluck('location_id')
            ->map(static fn ($id) => (int)$id)
            ->filter();

        foreach ($locationIds as $locationId) {
            if ($schema->hasTable('pmd_inventory_storage_locations')) {
                $storageId = (int)$db->table('pmd_inventory_storage_locations')
                    ->where('location_id', $locationId)
                    ->where('code', 'MAIN')
                    ->value('id');

                if ($storageId < 1) {
                    $storageId = (int)$db->table('pmd_inventory_storage_locations')->insertGetId([
                        'location_id' => $locationId,
                        'name' => 'Main storage',
                        'code' => 'MAIN',
                        'kind' => 'storage',
                        'active' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $db->table('pmd_inventory_items')
                    ->where('location_id', $locationId)
                    ->whereNull('default_storage_location_id')
                    ->update([
                        'default_storage_location_id' => $storageId,
                        'updated_at' => now(),
                    ]);
            }

            if ($schema->hasTable('pmd_inventory_settings')) {
                $exists = $db->table('pmd_inventory_settings')
                    ->where('location_id', $locationId)
                    ->exists();
                if (!$exists) {
                    $db->table('pmd_inventory_settings')->insert([
                        'location_id' => $locationId,
                        'consumption_event' => 'paid',
                        'valuation_method' => 'weighted_average',
                        'default_safety_days' => 2,
                        'expiry_alert_days' => 3,
                        'notifications_enabled' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        if ($schema->hasTable('pmd_inventory_item_identifiers')) {
            $items = $db->table('pmd_inventory_items')
                ->where('active', 1)
                ->whereNotNull('sku')
                ->where('sku', '<>', '')
                ->get(['id', 'location_id', 'sku', 'purchase_unit', 'purchase_to_base']);

            foreach ($items as $item) {
                $codes = preg_split('/[\\s,;|]+/', trim((string)$item->sku)) ?: [];
                foreach ($codes as $code) {
                    $code = trim((string)$code);
                    if ($code === '') {
                        continue;
                    }

                    $exists = $db->table('pmd_inventory_item_identifiers')
                        ->where('location_id', (int)$item->location_id)
                        ->where('code', $code)
                        ->exists();
                    if ($exists) {
                        continue;
                    }

                    $db->table('pmd_inventory_item_identifiers')->insert([
                        'location_id' => (int)$item->location_id,
                        'item_id' => (int)$item->id,
                        'supplier_id' => null,
                        'code' => mb_substr($code, 0, 190),
                        'code_type' => $this->guessCodeType($code),
                        'package_unit' => (string)($item->purchase_unit ?: 'piece'),
                        'package_quantity' => 1,
                        'base_quantity' => max(0.0001, (float)($item->purchase_to_base ?? 1)),
                        'is_primary' => 0,
                        'source' => 'legacy_sku',
                        'verified_at' => null,
                        'active' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    private function guessCodeType(string $code): string
    {
        $digits = preg_replace('/\\D+/', '', $code);
        if ($digits === $code) {
            return match (strlen($digits)) {
                8 => 'ean8',
                12 => 'upca',
                13 => 'ean13',
                14 => 'gtin14',
                default => 'numeric',
            };
        }

        if (str_starts_with(strtolower($code), 'http://') || str_starts_with(strtolower($code), 'https://')) {
            return 'qr_url';
        }

        return 'code';
    }
};
