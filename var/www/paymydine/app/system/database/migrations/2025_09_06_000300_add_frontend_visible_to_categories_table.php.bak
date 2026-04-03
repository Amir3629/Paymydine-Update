<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFrontendVisibleToCategoriesTable extends Migration
{
    public function up()
    {
        Schema::table('ti_categories', function (Blueprint $table) {
            $table->boolean('frontend_visible')->default(1)->after('status');
        });
    }

    public function down()
    {
        Schema::table('ti_categories', function (Blueprint $table) {
            $table->dropColumn('frontend_visible');
        });
    }
}