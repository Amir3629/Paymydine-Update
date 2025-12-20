<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStaffLeavesTable extends Migration
{
    public function up()
    {
        Schema::create('staff_leaves', function (Blueprint $table) {
            $table->bigIncrements('leave_id');
            $table->unsignedBigInteger('staff_id');
            $table->date('leave_date');
            $table->time('leave_time')->nullable();
            $table->enum('leave_type', ['full_day', 'half_day', 'early_leave', 'late_arrival'])->default('full_day');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('staff_id');
            $table->index('leave_date');
            $table->index(['staff_id', 'leave_date']);

            $table->foreign('staff_id')
                ->references('staff_id')
                ->on('staffs')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('staff_leaves');
    }
}

