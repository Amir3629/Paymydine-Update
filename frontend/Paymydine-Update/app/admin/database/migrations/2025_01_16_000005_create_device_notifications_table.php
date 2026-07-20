<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Device Notifications Table
 * Stores notifications and alerts for device events
 */
class CreateDeviceNotificationsTable extends Migration
{
    public function up()
    {
        Schema::create('device_notifications', function (Blueprint $table) {
            $table->bigIncrements('notification_id');
            $table->unsignedBigInteger('device_id')->nullable();
            $table->enum('type', [
                'device_online',
                'device_offline',
                'device_error',
                'sync_failed',
                'enrollment_success',
                'enrollment_failed',
                'missing_checkout',
                'device_maintenance',
                'low_storage'
            ])->default('device_offline');
            $table->string('title');
            $table->text('message');
            $table->enum('severity', ['info', 'warning', 'error', 'critical'])->default('info');
            $table->json('metadata')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('device_id')
                ->references('device_id')
                ->on('finger_devices')
                ->onDelete('cascade');

            $table->index(['device_id', 'is_read']);
            $table->index(['type', 'severity']);
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('device_notifications');
    }
}

