<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_OWNER_STAFF_HOUR_NOTES_SCHEMA_R11
 * Tenant-local, immutable per-recipient delivery and acknowledgement receipts.
 * Never create tenant tables on an HTTP request.
 */
class CreatePmdOwnerStaffHourNotesR11 extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_owner_staff_hour_notes')) {
            Schema::create('pmd_owner_staff_hour_notes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->date('note_date');
                $table->string('slot_time', 5);
                $table->text('message');
                $table->text('target_roles');
                $table->unsignedBigInteger('created_by_staff_id')->nullable();
                $table->timestamp('deleted_at')->nullable();
                $table->timestamps();
                $table->index(['location_id', 'note_date'], 'pmd_hour_note_location_day_idx');
                $table->index(['location_id', 'created_at'], 'pmd_hour_note_location_created_idx');
            });
        }
        if (!Schema::hasTable('pmd_owner_staff_hour_note_receipts')) {
            Schema::create('pmd_owner_staff_hour_note_receipts', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('note_id');
                $table->unsignedBigInteger('staff_id');
                $table->string('role_code', 80);
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamps();
                $table->unique(['note_id', 'staff_id'], 'pmd_hour_note_recipient_unique');
                $table->index(['location_id', 'staff_id', 'confirmed_at'], 'pmd_hour_note_receipt_staff_idx');
                $table->index(['location_id', 'note_id'], 'pmd_hour_note_receipt_note_idx');
            });
        }
    }

    public function down()
    {
        // Intentionally do not drop staff acknowledgement records on routine
        // application rollback. Data retention should be a separate decision.
    }
}
