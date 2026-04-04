<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFiskalyTransactionsTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('fiskaly_transactions')) {
            Schema::create('fiskaly_transactions', function (Blueprint $table) {
                $table->bigIncrements('fiskaly_transaction_id');
                $table->unsignedInteger('order_id')->index();
                $table->unsignedInteger('location_id')->default(1)->index();

                $table->string('payment_method', 50)->nullable();
                $table->string('payment_reference', 191)->nullable()->index();

                $table->string('tss_id', 100)->nullable()->index();
                $table->string('client_id', 100)->nullable()->index();
                $table->string('tx_id', 100)->nullable()->index();

                $table->string('tx_revision', 100)->nullable();
                $table->string('tx_state', 50)->nullable();
                $table->string('tx_number', 100)->nullable();
                $table->string('signature_counter', 100)->nullable();
                $table->string('signature_algorithm', 100)->nullable();
                $table->text('signature_value')->nullable();
                $table->string('serial_number', 191)->nullable();
                $table->text('qr_code_data')->nullable();

                $table->decimal('amount_total', 15, 4)->nullable();
                $table->string('currency', 10)->nullable();

                $table->timestamp('started_at')->nullable();
                $table->timestamp('finished_at')->nullable();

                $table->string('status', 50)->default('pending')->index(); // pending|started|finished|failed|skipped
                $table->text('error_message')->nullable();

                $table->json('request_payload')->nullable();
                $table->json('response_payload')->nullable();
                $table->json('meta')->nullable();

                $table->timestamps();

                $table->unique(['order_id'], 'uq_fiskaly_transactions_order');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('fiskaly_transactions');
    }
}
