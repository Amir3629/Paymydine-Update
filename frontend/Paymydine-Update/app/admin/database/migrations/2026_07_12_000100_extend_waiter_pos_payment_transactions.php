<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('order_payment_transactions')) {
            return;
        }

        Schema::table('order_payment_transactions', function (Blueprint $table): void {
            if (!Schema::hasColumn('order_payment_transactions', 'tip_amount')) {
                $table->decimal('tip_amount', 15, 4)->default(0)->after('amount');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'coupon_discount')) {
                $table->decimal('coupon_discount', 15, 4)->default(0)->after('tip_amount');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'coupon_code')) {
                $table->string('coupon_code', 191)->nullable()->after('coupon_discount');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'provider_code')) {
                $table->string('provider_code', 50)->nullable()->after('payment_method');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('payer_label');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'notes')) {
                $table->text('notes')->nullable()->after('created_by');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'cash_received')) {
                $table->decimal('cash_received', 15, 4)->nullable()->after('notes');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'change_due')) {
                $table->decimal('change_due', 15, 4)->default(0)->after('cash_received');
            }
            if (!Schema::hasColumn('order_payment_transactions', 'idempotency_key')) {
                $table->string('idempotency_key', 100)->nullable()->after('payment_reference');
            }
        });

        if (Schema::hasColumn('order_payment_transactions', 'idempotency_key')) {
            try {
                Schema::table('order_payment_transactions', function (Blueprint $table): void {
                    $table->unique('idempotency_key', 'opt_idempotency_unique');
                });
            } catch (\Throwable $ignored) {
                // Existing installations may already have the index.
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('order_payment_transactions')) {
            return;
        }

        Schema::table('order_payment_transactions', function (Blueprint $table): void {
            try {
                $table->dropUnique('opt_idempotency_unique');
            } catch (\Throwable $ignored) {
            }
            foreach ([
                'tip_amount',
                'coupon_discount',
                'coupon_code',
                'provider_code',
                'created_by',
                'notes',
                'cash_received',
                'change_due',
                'idempotency_key',
            ] as $column) {
                if (Schema::hasColumn('order_payment_transactions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
