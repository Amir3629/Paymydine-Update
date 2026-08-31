<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_STAFF_PORTAL_STORAGE_REPAIR_V1
 *
 * Repairs Staff Portal storage on installations where historical migrations
 * are recorded as completed but one or more physical tables are missing.
 * Every operation is additive/idempotent and never drops existing data.
 */
class RepairPmdStaffPortalStorage extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_staff_requests')) {
            Schema::create('pmd_staff_requests', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('staff_id');
                $table->unsignedBigInteger('person_id')->nullable();
                $table->string('request_type', 32);
                $table->unsignedBigInteger('shift_id')->nullable();
                $table->date('date_from')->nullable();
                $table->date('date_to')->nullable();
                $table->text('message')->nullable();
                $table->string('status', 24)->default('pending');
                $table->text('manager_reply')->nullable();
                $table->unsignedBigInteger('handled_by_staff_id')->nullable();
                $table->timestamp('handled_at')->nullable();
                $table->timestamps();
                $table->index(['location_id', 'status'], 'pmd_staff_requests_location_status_idx');
                $table->index(['staff_id', 'status'], 'pmd_staff_requests_staff_status_idx');
                $table->index(['person_id', 'created_at'], 'pmd_staff_requests_person_created_idx');
            });
        }

        if (!Schema::hasTable('pmd_staff_chat_groups')) {
            Schema::create('pmd_staff_chat_groups', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->string('name', 96);
                $table->string('group_type', 24)->default('custom');
                $table->unsignedBigInteger('created_by_staff_id')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->index(['location_id', 'is_active'], 'pmd_staff_chat_groups_location_active_idx');
            });
        }

        if (!Schema::hasTable('pmd_staff_chat_group_members')) {
            Schema::create('pmd_staff_chat_group_members', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('group_id');
                $table->unsignedBigInteger('staff_id');
                $table->string('member_role', 24)->default('member');
                $table->timestamps();
                $table->unique(['group_id', 'staff_id'], 'pmd_staff_chat_group_member_unique');
                $table->index(['staff_id', 'group_id'], 'pmd_staff_chat_member_staff_group_idx');
            });
        }

        if (!Schema::hasTable('pmd_staff_chat_messages')) {
            Schema::create('pmd_staff_chat_messages', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('group_id');
                $table->unsignedBigInteger('staff_id');
                $table->text('message');
                $table->timestamps();
                $table->index(['group_id', 'created_at'], 'pmd_staff_chat_messages_group_created_idx');
                $table->index(['location_id', 'created_at'], 'pmd_staff_chat_messages_location_created_idx');
            });
        }

        if (!Schema::hasTable('staff_attendance')) {
            Schema::create('staff_attendance', function (Blueprint $table) {
                $table->bigIncrements('attendance_id');
                $table->unsignedBigInteger('staff_id');
                $table->unsignedBigInteger('location_id')->nullable();
                $table->timestamp('check_in_time');
                $table->timestamp('check_out_time')->nullable();
                $table->decimal('hours_worked', 8, 2)->nullable();
                $table->text('metadata')->nullable();
                $table->timestamps();
                $table->index(['staff_id', 'check_out_time'], 'staff_attendance_staff_open_idx');
                $table->index(['location_id', 'check_in_time'], 'staff_attendance_location_checkin_idx');
            });
        }
    }

    public function down()
    {
        // Repair migration intentionally has no destructive rollback. These
        // tables may contain live staff messages, requests, or attendance.
    }
}
