<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePaymentProvidersTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('payment_providers')) {
            Schema::create('payment_providers', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('code', 50)->unique();
                $table->string('name', 100);
                $table->boolean('status')->default(true);
                $table->enum('mode', ['test', 'live'])->default('test');

                $table->boolean('supports_card')->default(false);
                $table->boolean('supports_apple_pay')->default(false);
                $table->boolean('supports_google_pay')->default(false);
                $table->boolean('supports_paypal')->default(false);
                $table->boolean('supports_cash')->default(false);
                $table->boolean('supports_hosted_checkout')->default(false);

                $table->json('config')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('payment_providers');
    }
}
