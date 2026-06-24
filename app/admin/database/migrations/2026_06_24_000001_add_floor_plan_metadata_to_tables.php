<?php namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFloorPlanMetadataToTables extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('tables')) {
            return;
        }

        Schema::table('tables', function (Blueprint $table) {
            if (!Schema::hasColumn('tables', 'min_capacity')) {
                $table->integer('min_capacity')->nullable();
            }

            if (!Schema::hasColumn('tables', 'max_capacity')) {
                $table->integer('max_capacity')->nullable();
            }

            if (!Schema::hasColumn('tables', 'extra_capacity')) {
                $table->integer('extra_capacity')->nullable();
            }

            if (!Schema::hasColumn('tables', 'floor_x')) {
                $table->decimal('floor_x', 8, 2)->nullable();
            }

            if (!Schema::hasColumn('tables', 'floor_y')) {
                $table->decimal('floor_y', 8, 2)->nullable();
            }

            if (!Schema::hasColumn('tables', 'floor_width')) {
                $table->decimal('floor_width', 8, 2)->nullable();
            }

            if (!Schema::hasColumn('tables', 'floor_height')) {
                $table->decimal('floor_height', 8, 2)->nullable();
            }

            if (!Schema::hasColumn('tables', 'floor_shape')) {
                $table->string('floor_shape', 40)->nullable()->default('rectangle');
            }

            if (!Schema::hasColumn('tables', 'table_section')) {
                $table->string('table_section', 120)->nullable();
            }

            if (!Schema::hasColumn('tables', 'preferred_capacity')) {
                $table->integer('preferred_capacity')->nullable();
            }

            if (!Schema::hasColumn('tables', 'table_features')) {
                $table->text('table_features')->nullable();
            }

            if (!Schema::hasColumn('tables', 'floor_notes')) {
                $table->text('floor_notes')->nullable();
            }

            if (!Schema::hasColumn('tables', 'reservable')) {
                $table->boolean('reservable')->default(true);
            }

            if (!Schema::hasColumn('tables', 'reservation_priority')) {
                $table->integer('reservation_priority')->default(0);
            }

            if (!Schema::hasColumn('tables', 'visible_on_floor_plan')) {
                $table->boolean('visible_on_floor_plan')->default(true);
            }
        });
    }

    public function down()
    {
        // Safe no-op. We do not drop live restaurant table metadata automatically.
    }
}
