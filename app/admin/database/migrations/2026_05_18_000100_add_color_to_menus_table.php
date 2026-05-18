<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddColorToMenusTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('menus')) {
            return;
        }

        Schema::table('menus', function (Blueprint $table) {
            if (!Schema::hasColumn('menus', 'color')) {
                $table->string('color', 40)->nullable()->after('serving_size');
            }
        });
    }

    public function down()
    {
        if (!Schema::hasTable('menus')) {
            return;
        }

        Schema::table('menus', function (Blueprint $table) {
            if (Schema::hasColumn('menus', 'color')) {
                $table->dropColumn('color');
            }
        });
    }
}
