<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('order_payment_transactions')) {
            Schema::create('order_payment_transactions', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('order_id');
                $table->string('payment_method', 50);
                $table->string('payment_reference')->nullable();
                $table->decimal('amount', 15, 4);
                $table->string('settlement_status', 20)->default('partial');
                $table->string('payer_label', 191)->nullable();
                $table->unsignedBigInteger('invoice_id')->nullable();
                $table->dateTime('paid_at')->nullable();
                $table->timestamps();

                $table->index(['order_id', 'created_at'], 'opt_order_created_idx');
                $table->index(['order_id', 'settlement_status'], 'opt_order_status_idx');
            });
        }

        if (!Schema::hasTable('order_payment_transaction_items')) {
            Schema::create('order_payment_transaction_items', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('transaction_id');
                $table->unsignedBigInteger('order_menu_id');
                $table->decimal('quantity_paid', 10, 3);
                $table->decimal('unit_price', 15, 4);
                $table->decimal('line_total', 15, 4);
                $table->timestamps();

                $table->index(['transaction_id', 'order_menu_id'], 'opti_txn_menu_idx');
                $table->index(['order_menu_id'], 'opti_menu_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payment_transaction_items');
        Schema::dropIfExists('order_payment_transactions');
    }
};
