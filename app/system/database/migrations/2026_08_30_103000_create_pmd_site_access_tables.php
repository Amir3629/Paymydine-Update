<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdSiteAccessTables extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_site_access_devices')) {
            Schema::create('pmd_site_access_devices', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->string('device_kind', 32); // site_hub | staff_personal
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->unsignedBigInteger('pos_device_id')->nullable();
                $table->string('device_name', 128);
                $table->char('token_hash', 64)->unique();
                $table->text('capabilities')->nullable();
                $table->text('platform_info')->nullable();
                $table->unsignedBigInteger('paired_by_staff_id')->nullable();
                $table->timestamp('paired_at')->nullable();
                $table->timestamp('last_seen_at')->nullable();
                $table->timestamp('revoked_at')->nullable();
                $table->timestamps();

                $table->index(['location_id', 'device_kind', 'revoked_at'], 'pmd_site_devices_location_kind_idx');
                $table->index(['staff_id', 'device_kind', 'revoked_at'], 'pmd_site_devices_staff_kind_idx');
                $table->index(['pos_device_id', 'device_kind'], 'pmd_site_devices_pos_kind_idx');
            });
        }

        if (!Schema::hasTable('pmd_site_access_challenges')) {
            Schema::create('pmd_site_access_challenges', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->uuid('public_id')->unique();
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->string('purpose', 32); // workspace_login | pair_staff_device | elevate_session
                $table->string('status', 24)->default('pending');
                $table->char('code_hash', 64);
                $table->string('requested_device_name', 128)->nullable();
                $table->string('requested_ip', 45)->nullable();
                $table->text('requested_user_agent')->nullable();
                $table->unsignedBigInteger('approved_by_device_id')->nullable();
                $table->unsignedBigInteger('approved_by_staff_id')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('expires_at');
                $table->timestamp('used_at')->nullable();
                $table->unsignedSmallInteger('attempts')->default(0);
                $table->timestamps();

                $table->index(['location_id', 'status', 'expires_at'], 'pmd_site_challenges_location_status_idx');
                $table->index(['user_id', 'status'], 'pmd_site_challenges_user_status_idx');
                $table->index(['staff_id', 'status'], 'pmd_site_challenges_staff_status_idx');
            });
        }

        if (!Schema::hasTable('pmd_site_access_events')) {
            Schema::create('pmd_site_access_events', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->unsignedBigInteger('device_id')->nullable();
                $table->unsignedBigInteger('challenge_id')->nullable();
                $table->string('event_type', 64);
                $table->boolean('success')->default(true);
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->text('metadata')->nullable();
                $table->timestamp('created_at')->nullable();

                $table->index(['location_id', 'created_at'], 'pmd_site_events_location_created_idx');
                $table->index(['staff_id', 'created_at'], 'pmd_site_events_staff_created_idx');
                $table->index(['event_type', 'created_at'], 'pmd_site_events_type_created_idx');
            });
        }

        if (!Schema::hasTable('pmd_site_access_recovery_codes')) {
            Schema::create('pmd_site_access_recovery_codes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('user_id');
                $table->char('code_hash', 64);
                $table->timestamp('used_at')->nullable();
                $table->timestamp('created_at')->nullable();

                $table->index(['location_id', 'user_id', 'used_at'], 'pmd_site_recovery_user_idx');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('pmd_site_access_recovery_codes');
        Schema::dropIfExists('pmd_site_access_events');
        Schema::dropIfExists('pmd_site_access_challenges');
        Schema::dropIfExists('pmd_site_access_devices');
    }
}
