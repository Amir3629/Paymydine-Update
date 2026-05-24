<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPrepTimeMinutesToMenusTable extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('menus', 'prep_time_minutes')) {
            Schema::table('menus', function (Blueprint $table) {
                $table->unsignedSmallInteger('prep_time_minutes')->default(15)->after('menu_priority');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('menus', 'prep_time_minutes')) {
            Schema::table('menus', function (Blueprint $table) {
                $table->dropColumn('prep_time_minutes');
            });
        }
    }
}
