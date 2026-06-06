<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('staff_attendance')) {
            return;
        }

        Schema::create('staff_attendance', function (Blueprint $table) {
            $table->bigIncrements('attendance_id');
            $table->unsignedBigInteger('staff_id');
            $table->dateTime('check_in_time');
            $table->dateTime('check_out_time')->nullable();
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
        });

        // Add staff FK only if staffs table exists
        if (Schema::hasTable('staffs')) {
            try {
                Schema::table('staff_attendance', function (Blueprint $table) {
                    $table->foreign('staff_id')
                        ->references('staff_id')
                        ->on('staffs')
                        ->onDelete('cascade');
                });
            } catch (\Throwable $e) {
            }
        }

        // Add device FK only if finger_devices table already exists
        if (Schema::hasTable('finger_devices')) {
            try {
                Schema::table('staff_attendance', function (Blueprint $table) {
                    $table->foreign('device_id')
                        ->references('device_id')
                        ->on('finger_devices')
                        ->onDelete('set null');
                });
            } catch (\Throwable $e) {
            }
        }
    }

    public function down()
    {
        if (!Schema::hasTable('staff_attendance')) {
            return;
        }

        try {
            Schema::table('staff_attendance', function (Blueprint $table) {
                try { $table->dropForeign(['staff_id']); } catch (\Throwable $e) {}
                try { $table->dropForeign(['device_id']); } catch (\Throwable $e) {}
            });
        } catch (\Throwable $e) {
        }

        Schema::dropIfExists('staff_attendance');
    }
};
