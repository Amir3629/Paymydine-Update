<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pmd_billing_groups')) {
            Schema::create('pmd_billing_groups', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->uuid('public_id')->unique();
                $table->string('table_id', 64)->index();
                $table->string('session_key', 191);
                $table->string('mode', 32)->default('r36')->index();
                $table->string('status', 32)->default('open')->index();
                $table->char('currency', 3)->default('EUR');
                $table->bigInteger('subtotal_cents')->default(0);
                $table->bigInteger('service_charge_cents')->default(0);
                $table->bigInteger('discount_cents')->default(0);
                $table->bigInteger('tip_cents')->default(0);
                $table->bigInteger('total_cents')->default(0);
                $table->bigInteger('paid_cents')->default(0);
                $table->json('vat_snapshot')->nullable();
                $table->string('payment_status', 32)->default('unpaid')->index();
                $table->string('fiscal_status', 32)->default('not_required')->index();
                $table->string('invoice_number', 64)->nullable()->unique();
                $table->dateTime('invoiced_at')->nullable();
                $table->uuid('fiskaly_transaction_id')->nullable()->unique();
                $table->json('fiskaly_receipt')->nullable();
                $table->text('reconciliation_reason')->nullable();
                $table->timestamps();

                $table->unique(['table_id', 'session_key'], 'pmd_bg_table_session_uq');
            });
        }

        if (!Schema::hasTable('pmd_billing_group_orders')) {
            Schema::create('pmd_billing_group_orders', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('billing_group_id');
                $table->unsignedBigInteger('order_id')->unique();
                $table->string('source', 32)->default('unknown');
                $table->unsignedSmallInteger('snapshot_version')->default(1);
                $table->json('financial_snapshot');
                $table->timestamps();

                $table->index(['billing_group_id', 'order_id'], 'pmd_bgo_group_order_idx');
            });
        }

        if (!Schema::hasTable('pmd_billing_group_payments')) {
            Schema::create('pmd_billing_group_payments', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('billing_group_id');
                $table->uuid('payment_id')->unique();
                $table->string('idempotency_key', 191)->unique();
                $table->string('provider', 50)->nullable();
                $table->string('provider_reference', 191)->nullable()->unique();
                $table->string('method', 50);
                $table->string('status', 32)->default('reserved')->index();
                $table->bigInteger('principal_cents');
                $table->bigInteger('tip_cents')->default(0);
                $table->bigInteger('discount_cents')->default(0);
                $table->bigInteger('payable_cents');
                $table->string('coupon_code', 191)->nullable();
                $table->bigInteger('cash_received_cents')->nullable();
                $table->bigInteger('change_due_cents')->default(0);
                $table->string('payer_label', 191)->nullable();
                $table->json('allocation_snapshot');
                $table->json('provider_evidence')->nullable();
                $table->unsignedInteger('settlement_attempts')->default(0);
                $table->dateTime('reserved_until')->nullable()->index();
                $table->dateTime('provider_confirmed_at')->nullable();
                $table->dateTime('settled_at')->nullable();
                $table->text('reconciliation_reason')->nullable();
                $table->timestamps();

                $table->index(['billing_group_id', 'status'], 'pmd_bgp_group_status_idx');
            });
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive. These tables are financial evidence.
        // Application rollback must tolerate the additive R36 schema.
    }
};
