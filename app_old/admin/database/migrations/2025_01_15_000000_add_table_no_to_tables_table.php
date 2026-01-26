<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddTableNoToTablesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('ti_tables', function (Blueprint $table) {
            // Add table_no column after table_id
            $table->integer('table_no')->nullable()->after('table_id');
            
            // Add unique index for table_no
            $table->unique('table_no', 'idx_tables_table_no');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('ti_tables', function (Blueprint $table) {
            // Drop the unique index first
            $table->dropUnique('idx_tables_table_no');
            
            // Drop the column
            $table->dropColumn('table_no');
        });
    }
}