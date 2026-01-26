<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Attendance Audit Logs Table
 * Tracks all changes made to attendance records for compliance
 */
class CreateAttendanceAuditLogsTable extends Migration
{
    public function up()
    {
        Schema::create('attendance_audit_logs', function (Blueprint $table) {
            $table->bigIncrements('audit_id');
            $table->unsignedBigInteger('attendance_id');
            $table->enum('action', ['created', 'updated', 'deleted', 'corrected', 'auto_checkout'])->default('created');
            $table->unsignedBigInteger('changed_by')->nullable(); // staff_id who made change
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('reason')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->foreign('attendance_id')
                ->references('attendance_id')
                ->on('staff_attendance')
                ->onDelete('cascade');

            $table->foreign('changed_by')
                ->references('staff_id')
                ->on('staffs')
                ->onDelete('set null');

            $table->index(['attendance_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down()
    {
        Schema::dropIfExists('attendance_audit_logs');
    }
}

