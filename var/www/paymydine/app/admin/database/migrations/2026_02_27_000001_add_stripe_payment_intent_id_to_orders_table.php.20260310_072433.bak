<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add stripe_payment_intent_id to orders table for Stripe PaymentIntent flow
 */
class AddStripePaymentIntentIdToOrdersTable extends Migration
{
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('stripe_payment_intent_id', 255)->nullable()->after('payment');
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('stripe_payment_intent_id');
        });
    }
}
