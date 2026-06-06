<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCashDrawerSetupStateFields extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('cash_drawers')) {
            return;
        }

        Schema::table('cash_drawers', function (Blueprint $table) {
            if (!Schema::hasColumn('cash_drawers', 'setup_state')) {
                $table->string('setup_state', 30)->nullable()->after('last_command_message');
            }
            if (!Schema::hasColumn('cash_drawers', 'setup_message')) {
                $table->text('setup_message')->nullable()->after('setup_state');
            }
            if (!Schema::hasColumn('cash_drawers', 'setup_completed_at')) {
                $table->timestamp('setup_completed_at')->nullable()->after('setup_message');
            }
        });
    }

    public function down()
    {
        if (!Schema::hasTable('cash_drawers')) {
            return;
        }

        Schema::table('cash_drawers', function (Blueprint $table) {
            foreach (['setup_completed_at', 'setup_message', 'setup_state'] as $column) {
                if (Schema::hasColumn('cash_drawers', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
}

