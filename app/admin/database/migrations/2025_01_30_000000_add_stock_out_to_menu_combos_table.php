<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddStockOutToMenuCombosTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('menu_combos', function (Blueprint $table) {
            if (!Schema::hasColumn('menu_combos', 'is_stock_out')) {
                $table->boolean('is_stock_out')->default(0)->after('combo_status');
                $table->index('is_stock_out');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('menu_combos', function (Blueprint $table) {
            if (Schema::hasColumn('menu_combos', 'is_stock_out')) {
                $table->dropIndex(['is_stock_out']);
                $table->dropColumn('is_stock_out');
            }
        });
    }
}
