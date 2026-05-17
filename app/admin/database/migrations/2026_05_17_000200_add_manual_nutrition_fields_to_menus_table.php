<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddManualNutritionFieldsToMenusTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('menus')) {
            return;
        }

        Schema::table('menus', function (Blueprint $table) {
            if (!Schema::hasColumn('menus', 'calories')) {
                $table->unsignedInteger('calories')->nullable()->after('is_vegan');
            }

            if (!Schema::hasColumn('menus', 'protein')) {
                $table->decimal('protein', 8, 2)->nullable()->after('calories');
            }

            if (!Schema::hasColumn('menus', 'carbs')) {
                $table->decimal('carbs', 8, 2)->nullable()->after('protein');
            }

            if (!Schema::hasColumn('menus', 'fat')) {
                $table->decimal('fat', 8, 2)->nullable()->after('carbs');
            }

            if (!Schema::hasColumn('menus', 'sugar')) {
                $table->decimal('sugar', 8, 2)->nullable()->after('fat');
            }

            if (!Schema::hasColumn('menus', 'serving_size')) {
                $table->string('serving_size', 64)->nullable()->after('sugar');
            }
        });
    }

    public function down()
    {
        if (!Schema::hasTable('menus')) {
            return;
        }

        Schema::table('menus', function (Blueprint $table) {
            foreach (['serving_size', 'sugar', 'fat', 'carbs', 'protein', 'calories'] as $column) {
                if (Schema::hasColumn('menus', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
}
