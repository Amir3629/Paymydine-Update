<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_CONTROL_R1
 *
 * Restaurant-level ingredient / bottle inventory foundation.
 * This is intentionally separate from the legacy menu-item stock counter:
 * menu stock answers "can I sell this item?", while this ledger answers
 * "what physical stock should I have, what was bought/wasted/counted, and
 * what did recipes theoretically consume?".
 */
class CreatePmdInventoryControlV1 extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_inventory_items')) {
            Schema::create('pmd_inventory_items', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('name', 190);
                $table->string('sku', 120)->nullable();
                $table->string('category', 100)->nullable();
                $table->string('base_unit', 30)->default('piece');
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->decimal('reorder_point', 16, 4)->default(0);
                $table->decimal('par_level', 16, 4)->default(0);
                $table->string('supplier_name', 190)->nullable();
                $table->boolean('active')->default(true)->index();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->index(['location_id', 'active'], 'pmd_inventory_items_location_active_idx');
            });
        }

        if (!Schema::hasTable('pmd_inventory_receipts')) {
            Schema::create('pmd_inventory_receipts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('supplier_name', 190)->nullable();
                $table->date('purchased_at')->nullable();
                $table->string('source', 40)->default('manual');
                $table->string('file_path', 500)->nullable();
                $table->string('original_name', 255)->nullable();
                $table->string('mime_type', 100)->nullable();
                $table->string('ai_status', 40)->default('not_requested')->index();
                $table->text('ai_payload_json')->nullable();
                $table->decimal('total_amount', 16, 4)->default(0);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_inventory_movements')) {
            Schema::create('pmd_inventory_movements', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->string('movement_type', 40)->index();
                $table->decimal('qty_delta', 16, 4);
                $table->decimal('unit_cost', 16, 4)->default(0);
                $table->string('reference_type', 80)->nullable();
                $table->unsignedBigInteger('reference_id')->nullable();
                $table->string('reason', 160)->nullable();
                $table->text('note')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable()->index();
                $table->timestamp('occurred_at')->index();
                $table->timestamps();

                $table->index(
                    ['location_id', 'item_id', 'occurred_at'],
                    'pmd_inventory_movements_item_time_idx'
                );
                $table->index(
                    ['reference_type', 'reference_id'],
                    'pmd_inventory_movements_reference_idx'
                );
            });
        }

        if (!Schema::hasTable('pmd_inventory_recipes')) {
            Schema::create('pmd_inventory_recipes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('menu_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('qty_per_sale', 16, 4);
                $table->boolean('active')->default(true);
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamps();

                $table->unique(
                    ['location_id', 'menu_id', 'item_id'],
                    'pmd_inventory_recipe_unique'
                );
            });
        }

        if (!Schema::hasTable('pmd_inventory_counts')) {
            Schema::create('pmd_inventory_counts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->string('status', 30)->default('completed')->index();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->timestamp('counted_at')->index();
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_inventory_count_lines')) {
            Schema::create('pmd_inventory_count_lines', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('count_id')->index();
                $table->unsignedBigInteger('item_id')->index();
                $table->decimal('expected_qty', 16, 4)->default(0);
                $table->decimal('counted_qty', 16, 4)->default(0);
                $table->decimal('variance_qty', 16, 4)->default(0);
                $table->decimal('unit_cost_snapshot', 16, 4)->default(0);
                $table->timestamps();

                $table->unique(['count_id', 'item_id'], 'pmd_inventory_count_line_unique');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('pmd_inventory_count_lines');
        Schema::dropIfExists('pmd_inventory_counts');
        Schema::dropIfExists('pmd_inventory_recipes');
        Schema::dropIfExists('pmd_inventory_movements');
        Schema::dropIfExists('pmd_inventory_receipts');
        Schema::dropIfExists('pmd_inventory_items');
    }
}
