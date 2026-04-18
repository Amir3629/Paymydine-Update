<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStaffAttendanceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('staff_attendance', function (Blueprint $table) {
            $table->bigIncrements('attendance_id');
            $table->unsignedBigInteger('staff_id');
            $table->datetime('check_in_time');
            $table->datetime('check_out_time')->nullable();
            $table->integer('location_id')->nullable();
            $table->enum('device_type', ['card', 'fingerprint', 'manual', 'zkteco'])->default('card');
            $table->unsignedBigInteger('device_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('staff_id');
            $table->index('check_in_time');
            $table->index('location_id');
            $table->index(['staff_id', 'check_in_time']);
            $table->index('device_id');

            // Foreign key constraints
            $table->foreign('staff_id')
                ->references('staff_id')
                ->on('staffs')
                ->onDelete('cascade');
            
            $table->foreign('device_id')
                ->references('device_id')
                ->on('finger_devices')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('staff_attendance');
    }
}

