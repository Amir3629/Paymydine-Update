<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('reservation_guarantees')) {
            return;
        }

        $addNote = !Schema::hasColumn('reservation_guarantees', 'loss_assessment_note');
        $addStaff = !Schema::hasColumn('reservation_guarantees', 'loss_assessed_by_staff_id');
        $addAt = !Schema::hasColumn('reservation_guarantees', 'loss_assessed_at');

        if (!$addNote && !$addStaff && !$addAt) {
            return;
        }

        Schema::table('reservation_guarantees', function (Blueprint $table) use ($addNote, $addStaff, $addAt) {
            if ($addNote) {
                $table->text('loss_assessment_note')->nullable();
            }
            if ($addStaff) {
                $table->unsignedInteger('loss_assessed_by_staff_id')->nullable();
            }
            if ($addAt) {
                $table->dateTime('loss_assessed_at')->nullable();
            }
        });
    }

    public function down()
    {
        if (!Schema::hasTable('reservation_guarantees')) {
            return;
        }

        $columns = [];
        foreach ([
            'loss_assessment_note',
            'loss_assessed_by_staff_id',
            'loss_assessed_at',
        ] as $column) {
            if (Schema::hasColumn('reservation_guarantees', $column)) {
                $columns[] = $column;
            }
        }

        if ($columns) {
            Schema::table('reservation_guarantees', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
