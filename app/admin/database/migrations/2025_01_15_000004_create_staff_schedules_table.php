<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStaffSchedulesTable extends Migration
{
    public function up()
    {
        Schema::create('staff_schedules', function (Blueprint $table) {
            $table->bigIncrements('schedule_id');
            $table->string('name', 255);
            $table->time('time_in');
            $table->time('time_out');
            $table->boolean('status')->default(1);
            $table->timestamps();
        });

        Schema::create('staff_schedule_assignments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('staff_id');
            $table->unsignedBigInteger('schedule_id');
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->index('staff_id');
            $table->index('schedule_id');
            $table->index(['staff_id', 'effective_from']);

            $table->foreign('staff_id')
                ->references('staff_id')
                ->on('staffs')
                ->onDelete('cascade');
            
            $table->foreign('schedule_id')
                ->references('schedule_id')
                ->on('staff_schedules')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('staff_schedule_assignments');
        Schema::dropIfExists('staff_schedules');
    }
}

