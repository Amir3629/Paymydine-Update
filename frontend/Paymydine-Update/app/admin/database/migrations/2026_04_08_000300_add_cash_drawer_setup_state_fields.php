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

        if (!Schema::hasColumn('cash_drawers', 'setup_state')) {
            Schema::table('cash_drawers', function (Blueprint $table) {
                $column = $table->string('setup_state', 30)->nullable();
                if (Schema::hasColumn('cash_drawers', 'last_command_message')) {
                    $column->after('last_command_message');
                }
            });
        }

        if (!Schema::hasColumn('cash_drawers', 'setup_message')) {
            Schema::table('cash_drawers', function (Blueprint $table) {
                $column = $table->text('setup_message')->nullable();
                if (Schema::hasColumn('cash_drawers', 'setup_state')) {
                    $column->after('setup_state');
                } elseif (Schema::hasColumn('cash_drawers', 'last_command_message')) {
                    $column->after('last_command_message');
                }
            });
        }

        if (!Schema::hasColumn('cash_drawers', 'setup_completed_at')) {
            Schema::table('cash_drawers', function (Blueprint $table) {
                $column = $table->timestamp('setup_completed_at')->nullable();
                if (Schema::hasColumn('cash_drawers', 'setup_message')) {
                    $column->after('setup_message');
                } elseif (Schema::hasColumn('cash_drawers', 'setup_state')) {
                    $column->after('setup_state');
                }
            });
        }
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

