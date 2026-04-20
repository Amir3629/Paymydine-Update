<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('vr_payment_webhook_events')) {
            return;
        }

        Schema::create('vr_payment_webhook_events', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('event_id', 191)->unique();
            $table->string('event_type', 100)->nullable()->index();
            $table->string('session_id', 191)->nullable()->index();
            $table->string('transaction_id', 191)->nullable()->index();
            $table->string('provider_reference', 191)->nullable()->index();
            $table->string('state', 50)->nullable()->index();
            $table->timestamp('processed_at')->nullable()->index();
            $table->longText('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vr_payment_webhook_events');
    }
};
