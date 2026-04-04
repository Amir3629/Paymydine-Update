<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Enhance Finger Devices Table
 * Add fields for device type detection, connection tracking, and advanced features
 */
class EnhanceFingerDevicesTable extends Migration
{
    public function up()
    {
        Schema::table('finger_devices', function (Blueprint $table) {
            // Device type and connection
            $table->enum('device_type', ['fingerprint', 'rfid', 'face', 'hybrid', 'zkteco'])->default('zkteco')->after('name');
            $table->enum('connection_type', ['usb', 'ethernet', 'wifi', 'serial'])->default('ethernet')->after('device_type');
            $table->string('usb_vendor_id', 20)->nullable()->after('connection_type');
            $table->string('usb_product_id', 20)->nullable()->after('usb_vendor_id');
            
            // Connection tracking
            $table->enum('connection_status', ['online', 'offline', 'error', 'unknown'])->default('unknown')->after('status');
            $table->timestamp('last_connected_at')->nullable()->after('connection_status');
            $table->timestamp('last_sync_at')->nullable()->after('last_connected_at');
            $table->integer('failed_connection_attempts')->default(0)->after('last_sync_at');
            
            // Device capabilities
            $table->boolean('supports_fingerprint')->default(true)->after('failed_connection_attempts');
            $table->boolean('supports_rfid')->default(false)->after('supports_fingerprint');
            $table->boolean('supports_face')->default(false)->after('supports_rfid');
            $table->boolean('supports_pin')->default(false)->after('supports_face');
            
            // Auto-sync settings
            $table->boolean('auto_sync_enabled')->default(true)->after('supports_pin');
            $table->integer('sync_interval')->default(15)->comment('minutes')->after('auto_sync_enabled');
            $table->boolean('auto_enroll_enabled')->default(false)->after('sync_interval');
            
            // Device information
            $table->string('firmware_version', 50)->nullable()->after('serial_number');
            $table->string('model', 100)->nullable()->after('firmware_version');
            $table->string('manufacturer', 100)->default('ZKTeco')->after('model');
            $table->integer('max_users')->default(3000)->after('manufacturer');
            $table->integer('max_fingerprints')->default(9000)->after('max_users');
            $table->integer('max_attendance_records')->default(100000)->after('max_fingerprints');
            
            // Add indexes
            $table->index('connection_status');
            $table->index('device_type');
            $table->index('connection_type');
            $table->index(['auto_sync_enabled', 'status']);
        });
    }

    public function down()
    {
        Schema::table('finger_devices', function (Blueprint $table) {
            $table->dropColumn([
                'device_type',
                'connection_type',
                'usb_vendor_id',
                'usb_product_id',
                'connection_status',
                'last_connected_at',
                'last_sync_at',
                'failed_connection_attempts',
                'supports_fingerprint',
                'supports_rfid',
                'supports_face',
                'supports_pin',
                'auto_sync_enabled',
                'sync_interval',
                'auto_enroll_enabled',
                'firmware_version',
                'model',
                'manufacturer',
                'max_users',
                'max_fingerprints',
                'max_attendance_records',
            ]);
        });
    }
}

