<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pmd_billing_groups')) {
            Schema::table('pmd_billing_groups', function (Blueprint $table): void {
                if (!Schema::hasColumn('pmd_billing_groups', 'mode')) {
                    $table->string('mode', 32)->default('r36')->after('session_key');
                }
            });
        }

        if (Schema::hasTable('pmd_billing_group_orders')) {
            Schema::table('pmd_billing_group_orders', function (Blueprint $table): void {
                if (!Schema::hasColumn('pmd_billing_group_orders', 'source')) {
                    $table->string('source', 32)->default('unknown')->after('order_id');
                }
                if (!Schema::hasColumn('pmd_billing_group_orders', 'snapshot_version')) {
                    $table->unsignedSmallInteger('snapshot_version')->default(1)->after('source');
                }
            });
        }

        if (Schema::hasTable('pmd_billing_group_payments')) {
            Schema::table('pmd_billing_group_payments', function (Blueprint $table): void {
                if (!Schema::hasColumn('pmd_billing_group_payments', 'payable_cents')) {
                    $table->bigInteger('payable_cents')->default(0)->after('discount_cents');
                }
                if (!Schema::hasColumn('pmd_billing_group_payments', 'coupon_code')) {
                    $table->string('coupon_code', 191)->nullable()->after('payable_cents');
                }
                if (!Schema::hasColumn('pmd_billing_group_payments', 'cash_received_cents')) {
                    $table->bigInteger('cash_received_cents')->nullable()->after('coupon_code');
                }
                if (!Schema::hasColumn('pmd_billing_group_payments', 'change_due_cents')) {
                    $table->bigInteger('change_due_cents')->default(0)->after('cash_received_cents');
                }
                if (!Schema::hasColumn('pmd_billing_group_payments', 'provider_evidence')) {
                    $table->json('provider_evidence')->nullable()->after('allocation_snapshot');
                }
                if (!Schema::hasColumn('pmd_billing_group_payments', 'settlement_attempts')) {
                    $table->unsignedInteger('settlement_attempts')->default(0)->after('provider_evidence');
                }
            });

            if (Schema::hasColumn('pmd_billing_group_payments', 'payable_cents')) {
                DB::table('pmd_billing_group_payments')
                    ->where('payable_cents', 0)
                    ->update([
                        'payable_cents' => DB::raw('GREATEST(0, principal_cents + tip_cents - discount_cents)'),
                    ]);
            }
        }
    }

    public function down(): void
    {
        // Non-destructive financial evidence upgrade. Do not remove columns.
    }
};
