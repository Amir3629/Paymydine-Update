<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddStockOutToMenusTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('menus', function (Blueprint $table) {
            // Add stock_out field (boolean, default false)
            // This is separate from menu_status (enable/disable)
            // menu_status = 0 means item is disabled (not visible)
            // is_stock_out = 1 means item is out of stock (visible but not orderable)
            if (!Schema::hasColumn('menus', 'is_stock_out')) {
                $table->boolean('is_stock_out')->default(0)->after('menu_status');
            }
            
            // Add index for faster queries
            $table->index('is_stock_out');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('menus', function (Blueprint $table) {
            if (Schema::hasColumn('menus', 'is_stock_out')) {
                $table->dropIndex(['is_stock_out']);
                $table->dropColumn('is_stock_out');
            }
        });
    }
}

