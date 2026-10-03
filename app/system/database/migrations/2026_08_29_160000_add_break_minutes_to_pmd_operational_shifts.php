<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBreakMinutesToPmdOperationalShifts extends Migration
{
    public function up()
    {
        if (Schema::hasTable('pmd_operational_shifts') && !Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
            Schema::table('pmd_operational_shifts', function (Blueprint $table) {
                // Historical rows remain 0. New Shifts UI explicitly defaults to 30.
                $table->unsignedSmallInteger('break_minutes')->default(0)->after('ends_at');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('pmd_operational_shifts') && Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {
            Schema::table('pmd_operational_shifts', function (Blueprint $table) {
                $table->dropColumn('break_minutes');
            });
        }
    }
}
