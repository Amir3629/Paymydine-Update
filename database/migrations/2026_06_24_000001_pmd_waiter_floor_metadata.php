<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $p = DB::connection()->getTablePrefix();
        $columns = [
            'preferred_capacity' => "INT NULL AFTER extra_capacity",
            'floor_name' => "VARCHAR(120) NULL DEFAULT 'Main Floor' AFTER preferred_capacity",
            'floor_sort' => "INT NOT NULL DEFAULT 0 AFTER floor_name",
            'table_section' => "VARCHAR(120) NULL DEFAULT 'Main' AFTER floor_sort",
            'table_zone' => "VARCHAR(120) NULL AFTER table_section",
            'floor_x' => "DECIMAL(10,2) NULL AFTER table_zone",
            'floor_y' => "DECIMAL(10,2) NULL AFTER floor_x",
            'floor_width' => "DECIMAL(10,2) NULL AFTER floor_y",
            'floor_height' => "DECIMAL(10,2) NULL AFTER floor_width",
            'floor_shape' => "VARCHAR(40) NULL DEFAULT 'rectangle' AFTER floor_height",
            'floor_notes' => "TEXT NULL AFTER floor_shape",
            'visible_on_floor_plan' => "TINYINT(1) NOT NULL DEFAULT 1 AFTER floor_notes",
        ];
        foreach ($columns as $col => $definition) {
            if (!Schema::hasColumn('tables', $col)) {
                DB::statement("ALTER TABLE {$p}tables ADD COLUMN {$col} {$definition}");
            }
        }
    }

    public function down(): void
    {
        // Non-destructive rollback: leave production metadata columns in place.
    }
};
