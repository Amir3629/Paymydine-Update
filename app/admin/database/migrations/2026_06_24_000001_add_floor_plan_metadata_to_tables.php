<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddFloorPlanMetadataToTables extends Migration
{
    public function up()
    {
        $add = function ($column, $sql) {
            if (!Schema::hasColumn('tables', $column)) DB::statement($sql);
        };
        $add('floor_x', "ALTER TABLE `tables` ADD `floor_x` DECIMAL(8,2) NULL AFTER `extra_capacity`");
        $add('floor_y', "ALTER TABLE `tables` ADD `floor_y` DECIMAL(8,2) NULL AFTER `floor_x`");
        $add('floor_width', "ALTER TABLE `tables` ADD `floor_width` DECIMAL(8,2) NULL DEFAULT 140 AFTER `floor_y`");
        $add('floor_height', "ALTER TABLE `tables` ADD `floor_height` DECIMAL(8,2) NULL DEFAULT 90 AFTER `floor_width`");
        $add('floor_shape', "ALTER TABLE `tables` ADD `floor_shape` VARCHAR(32) NOT NULL DEFAULT 'rectangle' AFTER `floor_height`");
        $add('table_section', "ALTER TABLE `tables` ADD `table_section` VARCHAR(64) NULL AFTER `floor_shape`");
        $add('preferred_capacity', "ALTER TABLE `tables` ADD `preferred_capacity` INT NULL AFTER `table_section`");
        $add('table_features', "ALTER TABLE `tables` ADD `table_features` JSON NULL AFTER `preferred_capacity`");
        $add('floor_notes', "ALTER TABLE `tables` ADD `floor_notes` TEXT NULL AFTER `table_features`");
        $add('reservable', "ALTER TABLE `tables` ADD `reservable` TINYINT(1) NOT NULL DEFAULT 1 AFTER `floor_notes`");
        $add('reservation_priority', "ALTER TABLE `tables` ADD `reservation_priority` INT NULL AFTER `reservable`");
        $add('visible_on_floor_plan', "ALTER TABLE `tables` ADD `visible_on_floor_plan` TINYINT(1) NOT NULL DEFAULT 1 AFTER `reservation_priority`");
    }
    public function down() {}
}
