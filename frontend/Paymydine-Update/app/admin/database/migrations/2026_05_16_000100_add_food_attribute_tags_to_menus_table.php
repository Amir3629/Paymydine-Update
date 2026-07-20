<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFoodAttributeTagsToMenusTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('menus')) {
            return;
        }

        Schema::table('menus', function (Blueprint $table) {
            if (!Schema::hasColumn('menus', 'is_halal')) {
                $table->boolean('is_halal')->default(false)->after('is_stock_out');
            }

            if (!Schema::hasColumn('menus', 'is_vegetarian')) {
                $table->boolean('is_vegetarian')->default(false)->after('is_halal');
            }

            if (!Schema::hasColumn('menus', 'is_vegan')) {
                $table->boolean('is_vegan')->default(false)->after('is_vegetarian');
            }
        });
    }

    public function down()
    {
        if (!Schema::hasTable('menus')) {
            return;
        }

        Schema::table('menus', function (Blueprint $table) {
            if (Schema::hasColumn('menus', 'is_vegan')) {
                $table->dropColumn('is_vegan');
            }

            if (Schema::hasColumn('menus', 'is_vegetarian')) {
                $table->dropColumn('is_vegetarian');
            }

            if (Schema::hasColumn('menus', 'is_halal')) {
                $table->dropColumn('is_halal');
            }
        });
    }
}
