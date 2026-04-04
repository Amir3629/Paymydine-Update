<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('ti_tables')) {
            return;
        }

        if (Schema::hasColumn('ti_tables', 'table_no')) {
            return;
        }

        Schema::table('ti_tables', function (Blueprint $table) {
            $table->integer('table_no')->nullable()->after('table_id');
            $table->unique('table_no', 'idx_tables_table_no');
        });
    }

    public function down()
    {
        if (!Schema::hasTable('ti_tables')) {
            return;
        }

        if (!Schema::hasColumn('ti_tables', 'table_no')) {
            return;
        }

        Schema::table('ti_tables', function (Blueprint $table) {
            try {
                $table->dropUnique('idx_tables_table_no');
            } catch (\Throwable $e) {
            }

            $table->dropColumn('table_no');
        });
    }
};
