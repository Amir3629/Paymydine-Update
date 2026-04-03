<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Enhance Staff Attendance Table
 * Add fields for better tracking and audit
 */
class EnhanceStaffAttendanceTable extends Migration
{
    public function up()
    {
        Schema::table('staff_attendance', function (Blueprint $table) {
            // Attendance status and metadata
            $table->enum('status', ['checked_in', 'checked_out', 'abandoned', 'corrected', 'auto_checkout'])->default('checked_in')->after('check_out_time');
            $table->enum('verification_method', ['fingerprint', 'rfid', 'face', 'pin', 'manual', 'mobile'])->default('fingerprint')->after('device_type');
            $table->string('ip_address', 45)->nullable()->after('notes');
            $table->text('user_agent')->nullable()->after('ip_address');
            $table->decimal('hours_worked', 8, 2)->nullable()->after('check_out_time');
            $table->boolean('is_late')->default(false)->after('hours_worked');
            $table->integer('late_minutes')->default(0)->after('is_late');
            $table->boolean('is_overtime')->default(false)->after('late_minutes');
            $table->integer('overtime_minutes')->default(0)->after('is_overtime');
            $table->boolean('is_edited')->default(false)->after('overtime_minutes');
            $table->unsignedBigInteger('edited_by')->nullable()->after('is_edited');
            $table->timestamp('edited_at')->nullable()->after('edited_by');
            $table->string('timezone', 50)->default('UTC')->after('location_id');
            $table->json('metadata')->nullable()->comment('Additional data like GPS, photo, etc.')->after('notes');
            
            // Add unique constraint to prevent duplicate check-ins
            $table->index(['staff_id', 'check_in_time', 'status']);
            $table->index('status');
            $table->index('verification_method');
            $table->index(['is_late', 'is_overtime']);
        });
    }

    public function down()
    {
        Schema::table('staff_attendance', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'verification_method',
                'ip_address',
                'user_agent',
                'hours_worked',
                'is_late',
                'late_minutes',
                'is_overtime',
                'overtime_minutes',
                'is_edited',
                'edited_by',
                'edited_at',
                'timezone',
                'metadata',
            ]);
        });
    }
}

