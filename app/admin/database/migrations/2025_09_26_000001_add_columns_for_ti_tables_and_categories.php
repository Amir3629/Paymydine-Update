<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn('ti_categories','frontend_visible')) {
            DB::statement("ALTER TABLE ti_categories
                ADD COLUMN frontend_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER description");
        }
        if (!Schema::hasColumn('ti_tables','table_no')) {
            DB::statement("ALTER TABLE ti_tables
                ADD COLUMN table_no BIGINT NULL AFTER table_id");
        }
        // Unique index, but only after de-duplicating
        if (Schema::hasColumn('ti_tables','table_no')) {
            // de-dupe safely (ignore if none)
            DB::statement("
                WITH d AS (
                  SELECT table_no, table_id,
                         ROW_NUMBER() OVER (PARTITION BY table_no ORDER BY table_id) rn
                  FROM ti_tables
                  WHERE table_no IS NOT NULL
                )
                UPDATE ti_tables t
                JOIN d ON d.table_id = t.table_id
                SET t.table_no = NULL
                WHERE d.rn > 1
            ");
            // add unique index if missing
            $exists = DB::select("SHOW INDEX FROM ti_tables WHERE Key_name='idx_tables_table_no'");
            if (empty($exists)) {
                DB::statement("ALTER TABLE ti_tables ADD UNIQUE INDEX idx_tables_table_no (table_no)");
            }
        }
    }

    public function down(): void {
        // no-op: do not drop prod columns
    }
};