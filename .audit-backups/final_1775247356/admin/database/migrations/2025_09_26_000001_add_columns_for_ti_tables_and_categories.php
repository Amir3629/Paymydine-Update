<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        $p = DB::connection()->getTablePrefix();
        if (!Schema::hasColumn('categories','frontend_visible')) {
            DB::statement("ALTER TABLE {$p}categories
                ADD COLUMN frontend_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER description");
        }
        if (!Schema::hasColumn('tables','table_no')) {
            DB::statement("ALTER TABLE {$p}tables
                ADD COLUMN table_no BIGINT NULL AFTER table_id");
        }
        // Unique index, but only after de-duplicating
        if (Schema::hasColumn('tables','table_no')) {
            // de-dupe safely (ignore if none)
            DB::statement(<<<'SQL'
UPDATE ti_tables t
JOIN (
    SELECT t1.table_id
    FROM ti_tables t1
    JOIN ti_tables t2
      ON t1.table_no = t2.table_no
     AND t1.table_no IS NOT NULL
     AND t1.table_id > t2.table_id
) dup ON dup.table_id = t.table_id
SET t.table_no = NULL
SQL
);
            // add unique index if missing
            $exists = DB::select("SHOW INDEX FROM {$p}tables WHERE Key_name='idx_tables_table_no'");
            if (empty($exists)) {
                DB::statement("ALTER TABLE {$p}tables ADD UNIQUE INDEX idx_tables_table_no (table_no)");
            }
        }
    }

    public function down(): void {
        // no-op: do not drop prod columns
    }
};