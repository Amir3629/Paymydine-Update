<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_RECIPE_VERSIONS_R1
 *
 * Recipe quantities are historical evidence. If a restaurant changes a
 * recipe tomorrow, yesterday's sold items must still be calculated with the
 * quantity that was valid yesterday. This migration turns recipe rows into
 * effective-dated versions instead of silently rewriting history.
 */
class AddPmdInventoryRecipeVersionsV1 extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_inventory_recipes')) {
            return;
        }

        if (!Schema::hasColumn('pmd_inventory_recipes', 'effective_from')) {
            Schema::table('pmd_inventory_recipes', function (Blueprint $table) {
                $table->timestamp('effective_from')->nullable()->index();
            });
        }

        if (!Schema::hasColumn('pmd_inventory_recipes', 'effective_to')) {
            Schema::table('pmd_inventory_recipes', function (Blueprint $table) {
                $table->timestamp('effective_to')->nullable()->index();
            });
        }

        DB::table('pmd_inventory_recipes')
            ->whereNull('effective_from')
            ->update([
                'effective_from' => DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)'),
            ]);

        // The original R1 schema allowed only one row per menu/item pair.
        // Versioning intentionally allows many historical rows while the
        // service guarantees that only one current row is active.
        try {
            Schema::table('pmd_inventory_recipes', function (Blueprint $table) {
                $table->dropUnique('pmd_inventory_recipe_unique');
            });
        } catch (\Throwable $ignored) {
            // Safe for a tenant that never had the first R1 unique index.
        }

        try {
            Schema::table('pmd_inventory_recipes', function (Blueprint $table) {
                $table->index(
                    ['location_id', 'menu_id', 'item_id', 'active'],
                    'pmd_inventory_recipe_current_idx'
                );
            });
        } catch (\Throwable $ignored) {
            // Index may already exist on a partially provisioned tenant.
        }
    }

    public function down()
    {
        if (!Schema::hasTable('pmd_inventory_recipes')) {
            return;
        }

        try {
            Schema::table('pmd_inventory_recipes', function (Blueprint $table) {
                $table->dropIndex('pmd_inventory_recipe_current_idx');
            });
        } catch (\Throwable $ignored) {
        }

        // A rollback cannot safely recreate the old unique constraint if
        // multiple historical versions now exist. Keep the history and only
        // remove version columns when explicitly rolling back this migration.
        if (Schema::hasColumn('pmd_inventory_recipes', 'effective_to')) {
            Schema::table('pmd_inventory_recipes', function (Blueprint $table) {
                $table->dropColumn('effective_to');
            });
        }

        if (Schema::hasColumn('pmd_inventory_recipes', 'effective_from')) {
            Schema::table('pmd_inventory_recipes', function (Blueprint $table) {
                $table->dropColumn('effective_from');
            });
        }
    }
}
