<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAvatarPathToPmdOperationalPeople extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_operational_people')) return;
        if (Schema::hasColumn('pmd_operational_people', 'avatar_path')) return;

        Schema::table('pmd_operational_people', function (Blueprint $table) {
            $table->string('avatar_path', 500)->nullable()->after('station_slug');
        });
    }

    public function down()
    {
        if (!Schema::hasTable('pmd_operational_people')) return;
        if (!Schema::hasColumn('pmd_operational_people', 'avatar_path')) return;

        Schema::table('pmd_operational_people', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
    }
}
