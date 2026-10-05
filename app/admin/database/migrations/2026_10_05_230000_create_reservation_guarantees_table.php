<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('reservation_guarantees')) {
            return;
        }

        Schema::create('reservation_guarantees', function (Blueprint $table) {
            $table->bigIncrements('guarantee_id');
            $table->unsignedInteger('reservation_id')->unique();
            $table->unsignedInteger('location_id')->index();
            $table->string('provider', 32)->default('stripe');
            $table->string('status', 32)->default('active')->index();
            $table->unsignedInteger('amount_per_guest_cents')->default(0);
            $table->unsignedInteger('amount_cents')->default(0);
            $table->unsignedInteger('charged_amount_cents')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->string('customer_reference', 191)->nullable();
            $table->string('payment_method_reference', 191)->nullable();
            $table->string('setup_intent_reference', 191)->nullable();
            $table->string('charge_intent_reference', 191)->nullable();
            $table->string('terms_version', 64)->nullable();
            $table->text('terms_text')->nullable();
            $table->string('consent_text_hash', 64)->nullable();
            $table->dateTime('consent_at')->nullable();
            $table->dateTime('cancellation_deadline_at')->nullable()->index();
            $table->dateTime('charge_eligible_at')->nullable()->index();
            $table->dateTime('charged_at')->nullable();
            $table->dateTime('released_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['status', 'charge_eligible_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('reservation_guarantees');
    }
};
