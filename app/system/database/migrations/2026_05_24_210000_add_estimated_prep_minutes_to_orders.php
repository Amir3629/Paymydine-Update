<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddEstimatedPrepMinutesToOrders extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('orders', 'estimated_prep_minutes')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->unsignedSmallInteger('estimated_prep_minutes')->nullable()->after('order_total');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('orders', 'estimated_prep_minutes')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('estimated_prep_minutes');
            });
        }
    }
}
