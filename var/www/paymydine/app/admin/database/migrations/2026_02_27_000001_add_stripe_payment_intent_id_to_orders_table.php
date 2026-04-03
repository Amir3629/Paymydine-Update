<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        if (!Schema::hasColumn('orders', 'stripe_payment_intent_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('stripe_payment_intent_id', 255)->nullable()->after('payment');
            });
        }

        // Optional index if not already present
        try {
            $sm = Schema::getConnection()->getDoctrineSchemaManager();
        } catch (\Throwable $e) {
            $sm = null;
        }

        try {
            Schema::table('orders', function (Blueprint $table) {
                // if index already exists this may fail; ignore
                $table->index('stripe_payment_intent_id', 'idx_orders_stripe_payment_intent_id');
            });
        } catch (\Throwable $e) {
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        if (!Schema::hasColumn('orders', 'stripe_payment_intent_id')) {
            return;
        }

        try {
            Schema::table('orders', function (Blueprint $table) {
                try { $table->dropIndex('idx_orders_stripe_payment_intent_id'); } catch (\Throwable $e) {}
            });
        } catch (\Throwable $e) {
        }

        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('stripe_payment_intent_id');
            });
        } catch (\Throwable $e) {
        }
    }
};
