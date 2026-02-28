<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddStripePaymentIntentIdToOrdersTable extends Migration
{
    public function up()
    {
        if (Schema::hasColumn('orders', 'stripe_payment_intent_id')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->string('stripe_payment_intent_id', 255)->nullable()->unique()->after('payment');
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['stripe_payment_intent_id']);
            $table->dropColumn('stripe_payment_intent_id');
        });
    }
}
