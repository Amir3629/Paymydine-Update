<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdDevicePlatformV1 extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pmd_device_runtime')) {
            Schema::create('pmd_device_runtime', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('device_id')->unique();
                $table->unsignedBigInteger('location_id')->index();
                $table->string('device_kind', 40)->index();
                $table->string('device_mode', 40)->nullable()->index();
                $table->string('app_version', 80)->nullable();
                $table->string('os_version', 80)->nullable();
                $table->string('manufacturer', 120)->nullable();
                $table->string('model', 160)->nullable();
                $table->string('screen_state', 24)->default('awake')->index();
                $table->unsignedTinyInteger('brightness')->nullable();
                $table->unsignedTinyInteger('battery_level')->nullable();
                $table->boolean('is_charging')->nullable();
                $table->string('network_type', 32)->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->string('last_command_id', 64)->nullable();
                $table->string('override_screen_state', 24)->nullable();
                $table->unsignedTinyInteger('override_brightness')->nullable();
                $table->timestamp('override_until')->nullable()->index();
                $table->text('metadata')->nullable();
                $table->timestamp('last_boot_at')->nullable();
                $table->timestamp('last_seen_at')->nullable()->index();
                $table->timestamps();

                $table->index(
                    ['location_id', 'device_kind', 'last_seen_at'],
                    'pmd_device_runtime_location_kind_seen_idx'
                );
            });
        }

        if (!Schema::hasTable('pmd_device_commands')) {
            Schema::create('pmd_device_commands', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->uuid('command_id')->unique();
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('device_id')->index();
                $table->string('device_kind', 40)->nullable()->index();
                $table->string('command', 48)->index();
                $table->text('payload')->nullable();
                $table->string('status', 24)->default('pending')->index();
                $table->unsignedBigInteger('requested_by_staff_id')->nullable();
                $table->timestamp('requested_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamp('delivered_at')->nullable();
                $table->timestamp('acknowledged_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->text('result_payload')->nullable();
                $table->timestamps();

                $table->index(
                    ['device_id', 'status', 'expires_at'],
                    'pmd_device_commands_device_status_idx'
                );
            });
        }

        if (!Schema::hasTable('pmd_device_logs')) {
            Schema::create('pmd_device_logs', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('device_id')->index();
                $table->string('level', 16)->default('info')->index();
                $table->string('event', 80)->index();
                $table->text('message');
                $table->text('context')->nullable();
                $table->timestamp('occurred_at')->nullable()->index();
                $table->timestamp('created_at')->nullable();

                $table->index(
                    ['device_id', 'occurred_at'],
                    'pmd_device_logs_device_time_idx'
                );
                $table->index(
                    ['location_id', 'level', 'occurred_at'],
                    'pmd_device_logs_location_level_idx'
                );
            });
        }

        if (!Schema::hasTable('pmd_device_deployment_sessions')) {
            Schema::create('pmd_device_deployment_sessions', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->uuid('public_id')->unique();
                $table->unsignedBigInteger('location_id')->index();
                $table->string('device_kind', 40)->default('table_display')->index();
                $table->char('code_hash', 64)->index();
                $table->text('code_ciphertext');
                $table->unsignedSmallInteger('expected_count')->default(1);
                $table->unsignedSmallInteger('paired_count')->default(0);
                $table->string('status', 24)->default('active')->index();
                $table->unsignedBigInteger('created_by_staff_id')->nullable();
                $table->timestamp('expires_at')->index();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(
                    ['location_id', 'device_kind', 'status', 'expires_at'],
                    'pmd_device_deploy_location_kind_idx'
                );
            });
        }

        if (!Schema::hasTable('pmd_device_policies')) {
            Schema::create('pmd_device_policies', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->unique();
                $table->boolean('schedule_enabled')->default(true);
                $table->string('manual_mode', 24)->default('auto');
                $table->timestamp('manual_until')->nullable();
                $table->unsignedSmallInteger('wake_before_minutes')->default(30);
                $table->unsignedSmallInteger('sleep_after_minutes')->default(30);
                $table->unsignedTinyInteger('open_brightness')->default(80);
                $table->unsignedTinyInteger('closed_brightness')->default(1);
                $table->boolean('table_display_enabled')->default(true);
                $table->boolean('kds_enabled')->default(true);
                $table->boolean('pos_enabled')->default(false);
                $table->boolean('customer_display_enabled')->default(true);
                $table->boolean('kiosk_enabled')->default(true);
                $table->unsignedBigInteger('updated_by_staff_id')->nullable();
                $table->text('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pmd_device_logs');
        Schema::dropIfExists('pmd_device_commands');
        Schema::dropIfExists('pmd_device_deployment_sessions');
        Schema::dropIfExists('pmd_device_runtime');
        Schema::dropIfExists('pmd_device_policies');
    }
}
