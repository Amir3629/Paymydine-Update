<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddFoodAttributeTagsToMenusTable extends Migration
{
    /**
     * Add display-only food attribute flags. Allergy tags use the existing
     * allergens/allergenables relationship so old menu/allergen data remains intact.
     */
    public function up()
    {
        Schema::table('menus', function (Blueprint $table) {
            if (!Schema::hasColumn('menus', 'is_halal')) {
                $table->boolean('is_halal')->default(0)->after('menu_status');
            }

            if (!Schema::hasColumn('menus', 'is_vegetarian')) {
                $table->boolean('is_vegetarian')->default(0)->after('is_halal');
            }

            if (!Schema::hasColumn('menus', 'is_vegan')) {
                $table->boolean('is_vegan')->default(0)->after('is_vegetarian');
            }
        });

        $this->seedAllergyPresets();
    }

    public function down()
    {
        Schema::table('menus', function (Blueprint $table) {
            foreach (['is_vegan', 'is_vegetarian', 'is_halal'] as $column) {
                if (Schema::hasColumn('menus', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    protected function seedAllergyPresets(): void
    {
        if (!Schema::hasTable('allergens')) {
            return;
        }

        $presets = [
            'Gluten',
            'Crustaceans',
            'Eggs',
            'Fish',
            'Peanuts',
            'Soy',
            'Milk / Lactose',
            'Nuts',
            'Celery',
            'Mustard',
            'Sesame',
            'Sulphites',
            'Lupin',
            'Molluscs',
        ];

        $hasCreatedAt = Schema::hasColumn('allergens', 'created_at');
        $hasUpdatedAt = Schema::hasColumn('allergens', 'updated_at');
        $now = now();

        foreach ($presets as $name) {
            if (DB::table('allergens')->where('name', $name)->exists()) {
                continue;
            }

            $row = [
                'name' => $name,
                'description' => 'Display tag for restaurant-provided allergy information only.',
                'status' => 1,
            ];

            if ($hasCreatedAt) {
                $row['created_at'] = $now;
            }

            if ($hasUpdatedAt) {
                $row['updated_at'] = $now;
            }

            DB::table('allergens')->insert($row);
        }
    }
}
