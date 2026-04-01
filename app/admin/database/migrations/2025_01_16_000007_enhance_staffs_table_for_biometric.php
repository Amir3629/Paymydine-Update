<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Enhance Staffs Table for Biometric
 * Add fields for biometric enrollment and RFID support
 */
class EnhanceStaffsTableForBiometric extends Migration
{
    public function up()
    {
        Schema::table('staffs', function (Blueprint $table) {
            // Check if columns don't exist before adding
            if (!Schema::hasColumn('staffs', 'card_id')) {
                $table->string('card_id', 50)->nullable()->unique()->after('staff_email');
            }
            
            if (!Schema::hasColumn('staffs', 'fingerprint_template')) {
                $table->text('fingerprint_template')->nullable()->after('card_id');
            }
            
            if (!Schema::hasColumn('staffs', 'biometric_enabled')) {
                $table->boolean('biometric_enabled')->default(false)->after('fingerprint_template');
            }
            
            // Additional biometric fields
            $table->string('rfid_card_uid', 100)->nullable()->unique()->after('card_id');
            $table->text('face_template')->nullable()->after('fingerprint_template');
            $table->string('pin_code', 255)->nullable()->after('face_template');
            $table->enum('enrollment_status', ['not_enrolled', 'enrolled', 'pending', 'failed'])->default('not_enrolled')->after('biometric_enabled');
            $table->timestamp('enrolled_at')->nullable()->after('enrollment_status');
            $table->unsignedBigInteger('enrolled_by')->nullable()->after('enrolled_at');
            $table->json('enrolled_devices')->nullable()->comment('List of device IDs where staff is enrolled')->after('enrolled_by');
            
            $table->index('enrollment_status');
            $table->index('biometric_enabled');
        });
    }

    public function down()
    {
        Schema::table('staffs', function (Blueprint $table) {
            $table->dropColumn([
                'rfid_card_uid',
                'face_template',
                'pin_code',
                'enrollment_status',
                'enrolled_at',
                'enrolled_by',
                'enrolled_devices',
            ]);
        });
    }
}

