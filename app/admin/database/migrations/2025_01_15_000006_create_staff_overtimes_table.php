<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStaffOvertimesTable extends Migration
{
    public function up()
    {
        Schema::create('staff_overtimes', function (Blueprint $table) {
            $table->bigIncrements('overtime_id');
            $table->unsignedBigInteger('staff_id');
            $table->unsignedBigInteger('attendance_id');
            $table->time('duration');
            $table->date('overtime_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('staff_id');
            $table->index('overtime_date');
            $table->index(['staff_id', 'overtime_date']);

            $table->foreign('staff_id')
                ->references('staff_id')
                ->on('staffs')
                ->onDelete('cascade');
            
            $table->foreign('attendance_id')
                ->references('attendance_id')
                ->on('staff_attendance')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('staff_overtimes');
    }
}

