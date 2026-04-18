<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Staff Device Mappings Table
 * Tracks which staff members are enrolled on which devices
 */
class CreateStaffDeviceMappingsTable extends Migration
{
    public function up()
    {
        Schema::create('staff_device_mappings', function (Blueprint $table) {
            $table->bigIncrements('mapping_id');
            $table->unsignedBigInteger('staff_id');
            $table->unsignedBigInteger('device_id');
            $table->integer('device_uid')->nullable(); // UID on the device
            $table->enum('enrollment_type', ['fingerprint', 'rfid', 'face', 'pin'])->default('fingerprint');
            $table->enum('sync_status', ['pending', 'synced', 'failed', 'deleted'])->default('pending');
            $table->text('enrollment_data')->nullable(); // Encrypted biometric data
            $table->timestamp('enrolled_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->foreign('staff_id')
                ->references('staff_id')
                ->on('staffs')
                ->onDelete('cascade');

            $table->foreign('device_id')
                ->references('device_id')
                ->on('finger_devices')
                ->onDelete('cascade');

            $table->unique(['staff_id', 'device_id', 'enrollment_type'], 'staff_device_enrollment_unique');
            $table->index('sync_status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('staff_device_mappings');
    }
}

