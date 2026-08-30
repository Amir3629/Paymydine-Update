<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdStaffChatTables extends Migration
{
    public function up()
    {
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
    }

    public function down()
    {
        Schema::dropIfExists('pmd_staff_chat_messages');
        Schema::dropIfExists('pmd_staff_chat_group_members');
        Schema::dropIfExists('pmd_staff_chat_groups');
    }
}
