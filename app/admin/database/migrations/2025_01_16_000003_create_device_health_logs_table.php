<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Device Health Logs Table
 * Monitors device status, connection, and operational health
 */
class CreateDeviceHealthLogsTable extends Migration
{
    public function up()
    {
        Schema::create('device_health_logs', function (Blueprint $table) {
            $table->bigIncrements('health_log_id');
            $table->unsignedBigInteger('device_id');
            $table->enum('status', ['online', 'offline', 'error', 'maintenance'])->default('offline');
            $table->integer('response_time')->nullable(); // in milliseconds
            $table->integer('users_count')->nullable(); // number of enrolled users
            $table->integer('attendance_count')->nullable(); // number of attendance records
            $table->decimal('memory_usage', 5, 2)->nullable(); // percentage
            $table->decimal('disk_usage', 5, 2)->nullable(); // percentage
            $table->string('firmware_version', 50)->nullable();
            $table->text('error_details')->nullable();
            $table->json('device_info')->nullable();
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->foreign('device_id')
                ->references('device_id')
                ->on('finger_devices')
                ->onDelete('cascade');

            $table->index(['device_id', 'checked_at']);
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('device_health_logs');
    }
}

