<?php

namespace App\Services\Turkey;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Materializes Turkey-only platform domains inside the CURRENT tenant DB.
 *
 * This service must only be called after the tenant DB has been selected and
 * TurkeyTenantContext has confirmed TR. It intentionally does not touch other
 * country tenants.
 */
final class TurkeyTenantProvisioningService
{
    public function __construct(
        private ?TurkeyTenantContext $context = null,
        private ?TurkeyIntegrationRegistry $registry = null
    ) {
        $this->context = $context ?: new TurkeyTenantContext();
        $this->registry = $registry ?: new TurkeyIntegrationRegistry();
    }

    public function ensure(?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $this->ensureIntegrationTables();
        $this->ensureFiscalTables();
        $this->ensureMarketplaceTables();
        $this->ensureInventoryTables();
        $this->ensureCustomerTables();
        $this->ensureEdgeTables();
        $this->seedIntegrationCatalogue((int)($state['location_id'] ?? 0));

        return [
            'ok' => true,
            'country_code' => 'TR',
            'location_id' => $state['location_id'] ?? null,
            'schema_version' => '1.0.0',
            'tables' => $this->requiredTables(),
        ];
    }

    public function requiredTables(): array
    {
        return [
            'pmd_tr_integrations',
            'pmd_tr_fiscal_transactions',
            'pmd_tr_marketplace_orders',
            'pmd_tr_marketplace_settlements',
            'pmd_tr_ingredients',
            'pmd_tr_recipes',
            'pmd_tr_recipe_lines',
            'pmd_tr_stock_movements',
            'pmd_tr_inventory_counts',
            'pmd_tr_inventory_count_lines',
            'pmd_tr_waste_events',
            'pmd_tr_customers',
            'pmd_tr_loyalty_accounts',
            'pmd_tr_loyalty_points',
            'pmd_tr_communication_consents',
            'pmd_tr_identity_challenges',
            'pmd_tr_edge_events',
        ];
    }

    private function ensureIntegrationTables(): void
    {
        if (!Schema::hasTable('pmd_tr_integrations')) {
            Schema::create('pmd_tr_integrations', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->nullable()->index();
                $table->string('code', 80);
                $table->string('provider', 120)->nullable();
                $table->string('kind', 60);
                $table->string('status', 80)->default('not_configured');
                $table->boolean('enabled')->default(false);
                $table->boolean('production_ready')->default(false);
                $table->text('config_json')->nullable();
                $table->text('credential_reference')->nullable();
                $table->text('contract_reference')->nullable();
                $table->text('certification_reference')->nullable();
                $table->text('last_error')->nullable();
                $table->timestamp('last_verified_at')->nullable();
                $table->timestamps();
                $table->unique(['location_id', 'code'], 'pmd_tr_integration_location_code_uq');
            });
        }
    }

    private function ensureFiscalTables(): void
    {
        if (!Schema::hasTable('pmd_tr_fiscal_transactions')) {
            Schema::create('pmd_tr_fiscal_transactions', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('order_id')->index();
                $table->unsignedInteger('location_id')->index();
                $table->string('fiscal_provider', 100)->nullable();
                $table->string('fiscal_device_id', 160)->nullable();
                $table->string('fiscal_unique_id', 190)->nullable()->index();
                $table->string('yn_okc_serial', 160)->nullable();
                $table->string('transaction_state', 80)->default('ORDER_OPEN')->index();
                $table->string('fiscal_document_type', 80)->nullable();
                $table->string('fiscal_document_number', 160)->nullable();
                $table->string('external_order_number', 160)->nullable();
                $table->decimal('gross', 15, 2)->default(0);
                $table->text('vat_breakdown_json')->nullable();
                $table->text('payment_allocation_json')->nullable();
                $table->text('fiscal_references_json')->nullable();
                $table->text('reversal_refund_json')->nullable();
                $table->timestamp('fiscalized_at')->nullable();
                $table->timestamps();
                $table->index(['location_id', 'transaction_state'], 'pmd_tr_fiscal_state_idx');
            });
        }
    }

    private function ensureMarketplaceTables(): void
    {
        if (!Schema::hasTable('pmd_tr_marketplace_orders')) {
            Schema::create('pmd_tr_marketplace_orders', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->index();
                $table->string('provider', 80)->index();
                $table->string('external_order_id', 190);
                $table->string('external_store_id', 190)->nullable();
                $table->unsignedBigInteger('order_id')->nullable()->index();
                $table->string('channel', 80)->nullable();
                $table->string('status', 80)->index();
                $table->string('fulfillment_mode', 80)->nullable();
                $table->string('courier_mode', 80)->nullable();
                $table->decimal('gross_amount', 15, 2)->default(0);
                $table->decimal('platform_discount', 15, 2)->default(0);
                $table->decimal('restaurant_discount', 15, 2)->default(0);
                $table->decimal('delivery_fee', 15, 2)->default(0);
                $table->decimal('commission_estimate', 15, 2)->default(0);
                $table->string('payment_method', 100)->nullable();
                $table->string('fiscal_order_id', 190)->nullable();
                $table->string('customer_reference', 190)->nullable();
                $table->timestamp('order_created_at')->nullable();
                $table->timestamp('accepted_at')->nullable();
                $table->timestamp('promised_at')->nullable();
                $table->text('raw_payload_hash')->nullable();
                $table->timestamps();
                $table->unique(['provider', 'external_order_id'], 'pmd_tr_marketplace_order_uq');
            });
        }

        if (!Schema::hasTable('pmd_tr_marketplace_settlements')) {
            Schema::create('pmd_tr_marketplace_settlements', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->index();
                $table->string('provider', 80)->index();
                $table->string('external_order_id', 190)->index();
                $table->string('fee_type', 100);
                $table->decimal('gross', 15, 2)->default(0);
                $table->decimal('tax', 15, 2)->default(0);
                $table->decimal('net', 15, 2)->default(0);
                $table->string('payment_batch', 190)->nullable();
                $table->date('settlement_date')->nullable();
                $table->string('source_reference', 190)->nullable();
                $table->timestamps();
            });
        }
    }

    private function ensureInventoryTables(): void
    {
        if (!Schema::hasTable('pmd_tr_ingredients')) {
            Schema::create('pmd_tr_ingredients', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('name', 190);
                $table->string('base_unit', 30);
                $table->decimal('default_yield', 8, 4)->default(1);
                $table->text('allergen_json')->nullable();
                $table->text('nutrition_json')->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_tr_recipes')) {
            Schema::create('pmd_tr_recipes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('menu_item_id')->index();
                $table->unsignedInteger('version')->default(1);
                $table->decimal('yield_quantity', 12, 4)->default(1);
                $table->dateTime('effective_from')->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
                $table->unique(['menu_item_id', 'version'], 'pmd_tr_recipe_version_uq');
            });
        }

        if (!Schema::hasTable('pmd_tr_recipe_lines')) {
            Schema::create('pmd_tr_recipe_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('recipe_id')->index();
                $table->unsignedBigInteger('ingredient_id')->index();
                $table->decimal('gross_qty', 15, 4);
                $table->decimal('yield_percentage', 8, 4)->default(100);
                $table->decimal('net_qty', 15, 4);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_tr_stock_movements')) {
            Schema::create('pmd_tr_stock_movements', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->index();
                $table->unsignedBigInteger('ingredient_id')->index();
                $table->string('stock_location', 120)->nullable();
                $table->decimal('qty', 16, 4);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->string('movement_type', 80)->index();
                $table->string('reference_type', 80)->nullable();
                $table->string('reference_id', 190)->nullable();
                $table->string('idempotency_key', 190)->unique();
                $table->timestamp('occurred_at')->nullable();
                $table->text('metadata_json')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_tr_inventory_counts')) {
            Schema::create('pmd_tr_inventory_counts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->index();
                $table->string('stock_location', 120)->nullable();
                $table->string('status', 40)->default('OPEN');
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->unsignedInteger('started_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_tr_inventory_count_lines')) {
            Schema::create('pmd_tr_inventory_count_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('count_id')->index();
                $table->unsignedBigInteger('ingredient_id')->index();
                $table->decimal('counted_qty', 16, 4);
                $table->decimal('system_qty_snapshot', 16, 4)->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_tr_waste_events')) {
            Schema::create('pmd_tr_waste_events', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->index();
                $table->unsignedBigInteger('ingredient_id')->index();
                $table->decimal('qty', 16, 4);
                $table->string('reason', 120)->nullable();
                $table->string('idempotency_key', 190)->unique();
                $table->timestamp('occurred_at')->nullable();
                $table->timestamps();
            });
        }
    }

    private function ensureCustomerTables(): void
    {
        if (!Schema::hasTable('pmd_tr_customers')) {
            Schema::create('pmd_tr_customers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('normalized_phone', 40)->nullable()->index();
                $table->string('verified_phone_hash', 190)->nullable();
                $table->string('email', 190)->nullable()->index();
                $table->string('locale', 20)->default('tr');
                $table->string('birthday_month_day', 5)->nullable();
                $table->timestamp('first_seen_at')->nullable();
                $table->timestamp('last_seen_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_tr_loyalty_accounts')) {
            Schema::create('pmd_tr_loyalty_accounts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('customer_id')->index();
                $table->string('program_code', 80)->default('default');
                $table->string('tier', 80)->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
                $table->unique(['customer_id', 'program_code'], 'pmd_tr_loyalty_account_uq');
            });
        }

        if (!Schema::hasTable('pmd_tr_loyalty_points')) {
            Schema::create('pmd_tr_loyalty_points', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('account_id')->index();
                $table->decimal('delta', 15, 2);
                $table->string('reason', 100);
                $table->unsignedBigInteger('order_id')->nullable()->index();
                $table->string('idempotency_key', 190)->unique();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_tr_communication_consents')) {
            Schema::create('pmd_tr_communication_consents', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('customer_id')->index();
                $table->string('brand_legal_entity', 190);
                $table->string('channel', 30);
                $table->string('purpose', 60)->default('MARKETING');
                $table->string('status', 30)->default('PENDING');
                $table->text('evidence')->nullable();
                $table->string('source', 80)->nullable();
                $table->string('iys_status', 40)->nullable();
                $table->timestamp('obtained_at')->nullable();
                $table->timestamp('iys_synced_at')->nullable();
                $table->timestamp('revoked_at')->nullable();
                $table->timestamps();
                $table->index(['customer_id', 'channel', 'purpose'], 'pmd_tr_consent_lookup_idx');
            });
        }

        if (!Schema::hasTable('pmd_tr_identity_challenges')) {
            Schema::create('pmd_tr_identity_challenges', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('customer_id')->index();
                $table->string('method', 40);
                $table->string('challenge_hash', 190);
                $table->timestamp('expires_at');
                $table->timestamp('consumed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    private function ensureEdgeTables(): void
    {
        if (!Schema::hasTable('pmd_tr_edge_events')) {
            Schema::create('pmd_tr_edge_events', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('event_id', 190)->unique();
                $table->unsignedInteger('location_id')->index();
                $table->string('aggregate', 80)->index();
                $table->string('aggregate_id', 190)->index();
                $table->unsignedInteger('aggregate_version')->default(0);
                $table->string('event_type', 120)->index();
                $table->string('device_id', 190)->nullable();
                $table->string('idempotency_key', 190)->unique();
                $table->text('payload_json')->nullable();
                $table->string('sync_status', 40)->default('PENDING')->index();
                $table->unsignedInteger('retry_count')->default(0);
                $table->timestamp('created_at_local')->nullable();
                $table->timestamp('acked_at')->nullable();
                $table->timestamp('updated_at')->nullable();
            });
        }
    }

    private function seedIntegrationCatalogue(int $locationId): void
    {
        if (!Schema::hasTable('pmd_tr_integrations')) return;

        foreach ($this->registry->integrations() as $code => $definition) {
            DB::table('pmd_tr_integrations')->updateOrInsert(
                ['location_id' => $locationId ?: null, 'code' => $code],
                [
                    'kind' => (string)$definition['kind'],
                    'status' => (string)$definition['default_status'],
                    'enabled' => 0,
                    'production_ready' => 0,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
