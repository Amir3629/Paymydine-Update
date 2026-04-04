<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Device Sync Logs Table
 * Tracks all device sync operations for monitoring and debugging
 */
class CreateDeviceSyncLogsTable extends Migration
{
    public function up()
    {
        Schema::create('device_sync_logs', function (Blueprint $table) {
            $table->bigIncrements('sync_log_id');
            $table->unsignedBigInteger('device_id');
            $table->enum('sync_type', ['staff_sync', 'attendance_sync', 'health_check'])->default('attendance_sync');
            $table->integer('records_synced')->default(0);
            $table->integer('records_failed')->default(0);
            $table->enum('status', ['success', 'failed', 'partial', 'in_progress'])->default('in_progress');
            $table->text('error_message')->nullable();
            $table->json('sync_details')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('device_id')
                ->references('device_id')
                ->on('finger_devices')
                ->onDelete('cascade');

            $table->index(['device_id', 'created_at']);
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('device_sync_logs');
    }
}

