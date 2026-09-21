<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_MOBILE_SYNC_V1
 *
 * Tenant-scoped durable command/event ledger for native local-first clients.
 * This migration intentionally creates transport/audit primitives only; it does
 * not bypass the existing POS/payment business authorities.
 */
class CreatePmdMobileSyncTables extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_sync_commands')) {
            Schema::create('pmd_sync_commands', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->uuid('command_id');
                $table->string('idempotency_key', 96);
                $table->char('request_hash', 64);
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('device_id');
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->string('aggregate', 64);
                $table->string('aggregate_id', 128);
                $table->unsignedBigInteger('base_version')->default(0);
                $table->string('command_type', 96);
                $table->longText('payload');
                $table->string('status', 24)->default('RECEIVED');
                $table->longText('result_payload')->nullable();
                $table->string('error_code', 96)->nullable();
                $table->timestamp('received_at')->nullable();
                $table->timestamp('applied_at')->nullable();
                $table->timestamp('rejected_at')->nullable();
                $table->timestamps();

                $table->unique('command_id', 'pmd_sync_cmd_command_uidx');
                $table->unique('idempotency_key', 'pmd_sync_cmd_idem_uidx');
                $table->index(['location_id', 'status', 'id'], 'pmd_sync_cmd_loc_status_idx');
                $table->index(['aggregate', 'aggregate_id', 'id'], 'pmd_sync_cmd_aggregate_idx');
                $table->index(['device_id', 'id'], 'pmd_sync_cmd_device_idx');
            });
        }

        if (
            Schema::hasTable('pmd_sync_commands')
            && !Schema::hasColumn('pmd_sync_commands', 'request_hash')
        ) {
            Schema::table('pmd_sync_commands', function (Blueprint $table) {
                $table->char('request_hash', 64)->nullable()->after('idempotency_key');
            });
        }

        if (!Schema::hasTable('pmd_sync_events')) {
            Schema::create('pmd_sync_events', function (Blueprint $table) {
                // Sequence is monotonic inside each tenant database.
                $table->bigIncrements('sequence');
                $table->uuid('event_id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('device_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->string('aggregate', 64);
                $table->string('aggregate_id', 128);
                $table->unsignedBigInteger('aggregate_version')->default(0);
                $table->string('event_type', 96);
                $table->longText('payload');
                $table->timestamp('occurred_at')->nullable();
                $table->timestamps();

                $table->unique('event_id', 'pmd_sync_evt_event_uidx');
                $table->index(['location_id', 'sequence'], 'pmd_sync_evt_loc_seq_idx');
                $table->index(
                    ['aggregate', 'aggregate_id', 'aggregate_version'],
                    'pmd_sync_evt_aggregate_idx'
                );
            });
        }

        if (!Schema::hasTable('pmd_sync_aggregate_versions')) {
            Schema::create('pmd_sync_aggregate_versions', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->string('aggregate', 64);
                $table->string('aggregate_id', 128);
                $table->unsignedBigInteger('version')->default(0);
                $table->timestamp('updated_at')->nullable();

                $table->unique(
                    ['location_id', 'aggregate', 'aggregate_id'],
                    'pmd_sync_ver_aggregate_uidx'
                );
            });
        }

        if (!Schema::hasTable('pmd_mobile_edges')) {
            Schema::create('pmd_mobile_edges', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('device_id');
                $table->char('fingerprint_sha256', 64);
                $table->unsignedInteger('port')->default(8443);
                $table->string('protocol', 32)->default('pmd-edge-v1');
                $table->boolean('is_active')->default(true);
                $table->timestamp('last_seen_at')->nullable();
                $table->timestamps();

                $table->unique('location_id', 'pmd_mobile_edge_location_uidx');
                $table->index(['device_id', 'is_active'], 'pmd_mobile_edge_device_idx');
            });
        }

        if (!Schema::hasTable('pmd_mobile_pair_requests')) {
            Schema::create('pmd_mobile_pair_requests', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->uuid('pair_request');
                $table->unsignedBigInteger('challenge_id');
                $table->char('code_challenge', 43);
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('staff_id');
                $table->string('device_name', 128)->default('PayMyDine Android');
                $table->string('status', 24)->default('pending');
                $table->unsignedBigInteger('device_id')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('expires_at');
                $table->timestamps();

                $table->unique('pair_request', 'pmd_mobile_pair_request_uidx');
                $table->unique('challenge_id', 'pmd_mobile_pair_challenge_uidx');
                $table->index(
                    ['location_id', 'status', 'expires_at'],
                    'pmd_mobile_pair_loc_status_idx'
                );
            });
        }

        if (!Schema::hasTable('pmd_mobile_pair_exchanges')) {
            Schema::create('pmd_mobile_pair_exchanges', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->uuid('public_id');
                $table->char('exchange_hash', 64);
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('device_id');
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->timestamp('expires_at');
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->unique('public_id', 'pmd_mobile_pair_public_uidx');
                $table->unique('exchange_hash', 'pmd_mobile_pair_hash_uidx');
                $table->index(['device_id', 'expires_at'], 'pmd_mobile_pair_device_idx');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('pmd_mobile_pair_exchanges');
        Schema::dropIfExists('pmd_mobile_pair_requests');
        Schema::dropIfExists('pmd_mobile_edges');
        Schema::dropIfExists('pmd_sync_aggregate_versions');
        Schema::dropIfExists('pmd_sync_events');
        Schema::dropIfExists('pmd_sync_commands');
    }
}
