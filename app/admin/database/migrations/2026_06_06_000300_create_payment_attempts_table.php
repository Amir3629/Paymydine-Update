<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payment_attempts')) return;
        Schema::create('payment_attempts', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id')->index();
            $table->string('provider_code', 50)->index();
            $table->string('terminal_id', 120)->nullable();
            $table->decimal('amount', 14, 4)->default(0);
            $table->string('currency', 3)->default('EUR');
            $table->string('status', 30)->default('pending')->index();
            $table->string('provider_reference', 190)->nullable()->index();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_attempts');
    }
};
