<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('vr_payment_sessions')) {
            return;
        }

        Schema::create('vr_payment_sessions', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('provider_code', 50)->default('vr_payment')->index();
            $table->string('method_code', 50)->nullable()->index();
            $table->string('merchant_reference', 191)->nullable()->index();
            $table->string('session_id', 191)->nullable()->unique();
            $table->string('transaction_id', 191)->nullable()->index();
            $table->string('provider_reference', 191)->nullable()->index();
            $table->string('state', 50)->default('pending')->index();
            $table->unsignedInteger('order_id')->nullable()->index();
            $table->decimal('amount', 12, 4)->nullable();
            $table->string('currency', 10)->nullable();
            $table->longText('raw_snapshot')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vr_payment_sessions');
    }
};
