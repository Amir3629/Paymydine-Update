<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureCurrentConnection();
        $this->ensureActiveTenantConnections();
    }

    public function down(): void
    {
        // Non-destructive repair migration. Financial/fiscal evidence must survive rollback.
    }

    private function ensureCurrentConnection(): void
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
                $table->dateTime('closed_at')->nullable();
                $table->unsignedBigInteger('closed_by')->nullable();
                $table->uuid('fiskaly_transaction_id')->nullable()->unique();
                $table->json('fiskaly_receipt')->nullable();
                $table->unsignedSmallInteger('fiscal_revision')->default(0);
                $table->unsignedInteger('fiscal_attempts')->default(0);
                $table->text('fiscal_error')->nullable();
                $table->json('fiscal_policy_snapshot')->nullable();
                $table->dateTime('fiscalized_at')->nullable();
                $table->text('reconciliation_reason')->nullable();
                $table->timestamps();
                $table->unique(['table_id', 'session_key'], 'pmd_bg_table_session_uq');
            });
        } else {
            $this->ensureGroupColumns();
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
        } else {
            Schema::table('pmd_billing_group_orders', function (Blueprint $table): void {
                if (!Schema::hasColumn('pmd_billing_group_orders', 'source')) {
                    $table->string('source', 32)->default('unknown')->after('order_id');
                }
                if (!Schema::hasColumn('pmd_billing_group_orders', 'snapshot_version')) {
                    $table->unsignedSmallInteger('snapshot_version')->default(1)->after('source');
                }
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
        } else {
            $this->ensurePaymentColumns();
        }
    }

    private function ensureGroupColumns(): void
    {
        Schema::table('pmd_billing_groups', function (Blueprint $table): void {
            if (!Schema::hasColumn('pmd_billing_groups', 'mode')) $table->string('mode', 32)->default('r36')->after('session_key');
            if (!Schema::hasColumn('pmd_billing_groups', 'closed_at')) $table->dateTime('closed_at')->nullable()->after('invoiced_at');
            if (!Schema::hasColumn('pmd_billing_groups', 'closed_by')) $table->unsignedBigInteger('closed_by')->nullable()->after('closed_at');
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_revision')) $table->unsignedSmallInteger('fiscal_revision')->default(0)->after('fiskaly_receipt');
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_attempts')) $table->unsignedInteger('fiscal_attempts')->default(0)->after('fiscal_revision');
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_error')) $table->text('fiscal_error')->nullable()->after('fiscal_attempts');
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscal_policy_snapshot')) $table->json('fiscal_policy_snapshot')->nullable()->after('fiscal_error');
            if (!Schema::hasColumn('pmd_billing_groups', 'fiscalized_at')) $table->dateTime('fiscalized_at')->nullable()->after('fiscal_policy_snapshot');
        });
    }

    private function ensurePaymentColumns(): void
    {
        Schema::table('pmd_billing_group_payments', function (Blueprint $table): void {
            if (!Schema::hasColumn('pmd_billing_group_payments', 'payable_cents')) $table->bigInteger('payable_cents')->default(0)->after('discount_cents');
            if (!Schema::hasColumn('pmd_billing_group_payments', 'coupon_code')) $table->string('coupon_code', 191)->nullable()->after('payable_cents');
            if (!Schema::hasColumn('pmd_billing_group_payments', 'cash_received_cents')) $table->bigInteger('cash_received_cents')->nullable()->after('coupon_code');
            if (!Schema::hasColumn('pmd_billing_group_payments', 'change_due_cents')) $table->bigInteger('change_due_cents')->default(0)->after('cash_received_cents');
            if (!Schema::hasColumn('pmd_billing_group_payments', 'provider_evidence')) $table->json('provider_evidence')->nullable()->after('allocation_snapshot');
            if (!Schema::hasColumn('pmd_billing_group_payments', 'settlement_attempts')) $table->unsignedInteger('settlement_attempts')->default(0)->after('provider_evidence');
        });

        if (Schema::hasColumn('pmd_billing_group_payments', 'payable_cents')) {
            DB::table('pmd_billing_group_payments')
                ->where('payable_cents', 0)
                ->update(['payable_cents' => DB::raw('GREATEST(0, principal_cents + tip_cents - discount_cents)')]);
        }
    }

    private function ensureActiveTenantConnections(): void
    {
        try {
            $mysql = DB::connection('mysql');
            if (!$mysql->getSchemaBuilder()->hasTable('tenants')) return;
            $tenantDatabases = $mysql->table('tenants')
                ->where('status', 'active')
                ->whereNotNull('database')
                ->where('database', '!=', '')
                ->pluck('database')
                ->unique()
                ->values();
        } catch (\Throwable $e) {
            throw new \RuntimeException('R36 could not enumerate active tenant databases.', 0, $e);
        }

        $originalDefault = DB::getDefaultConnection();
        $originalTenantDatabase = Config::get('database.connections.tenant.database');
        $failures = [];

        foreach ($tenantDatabases as $database) {
            try {
                Config::set('database.connections.tenant.database', $database);
                DB::purge('tenant');
                DB::reconnect('tenant');
                DB::setDefaultConnection('tenant');
                $this->ensureCurrentConnection();
            } catch (\Throwable $e) {
                $failures[] = (string)$database.': '.$e->getMessage();
            }
        }

        Config::set('database.connections.tenant.database', $originalTenantDatabase);
        DB::purge('tenant');
        DB::setDefaultConnection($originalDefault ?: 'mysql');

        if ($failures) {
            throw new \RuntimeException('R36 tenant schema repair failed: '.implode(' | ', $failures));
        }
    }
};
