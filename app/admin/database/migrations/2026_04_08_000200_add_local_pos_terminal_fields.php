<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddLocalPosTerminalFields extends Migration
{
    public function up()
    {
        if (Schema::hasTable('pos_devices')) {
            Schema::table('pos_devices', function (Blueprint $table) {
                if (!Schema::hasColumn('pos_devices', 'is_local_terminal')) {
                    $table->boolean('is_local_terminal')->default(false)->after('description');
                }
                if (!Schema::hasColumn('pos_devices', 'device_code')) {
                    $table->string('device_code', 100)->nullable()->after('is_local_terminal');
                }
                if (!Schema::hasColumn('pos_devices', 'pairing_token')) {
                    $table->string('pairing_token', 191)->nullable()->after('device_code');
                }
                if (!Schema::hasColumn('pos_devices', 'device_status')) {
                    $table->string('device_status', 20)->nullable()->after('pairing_token');
                }
                if (!Schema::hasColumn('pos_devices', 'last_seen_at')) {
                    $table->timestamp('last_seen_at')->nullable()->after('device_status');
                }
                if (!Schema::hasColumn('pos_devices', 'capabilities')) {
                    $table->text('capabilities')->nullable()->after('last_seen_at');
                }
                if (!Schema::hasColumn('pos_devices', 'platform_info')) {
                    $table->text('platform_info')->nullable()->after('capabilities');
                }
            });
        }

        if (Schema::hasTable('cash_drawers')) {
            Schema::table('cash_drawers', function (Blueprint $table) {
                if (!Schema::hasColumn('cash_drawers', 'local_pos_device_id')) {
                    $table->unsignedBigInteger('local_pos_device_id')->nullable()->after('pos_device_id');
                }
                if (!Schema::hasColumn('cash_drawers', 'local_mapping_invalid')) {
                    $table->boolean('local_mapping_invalid')->default(false)->after('local_pos_device_id');
                }
            });

            $drawers = DB::table('cash_drawers')->select('drawer_id', 'pos_device_id')->get();
            foreach ($drawers as $drawer) {
                if (empty($drawer->pos_device_id)) {
                    continue;
                }

                $device = DB::table('pos_devices')->where('device_id', $drawer->pos_device_id)->first();
                if (!$device) {
                    DB::table('cash_drawers')->where('drawer_id', $drawer->drawer_id)->update([
                        'local_mapping_invalid' => true,
                        'updated_at' => now(),
                    ]);
                    continue;
                }

                if (!empty($device->is_local_terminal)) {
                    DB::table('cash_drawers')->where('drawer_id', $drawer->drawer_id)->update([
                        'local_pos_device_id' => $device->device_id,
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('cash_drawers')->where('drawer_id', $drawer->drawer_id)->update([
                        'local_mapping_invalid' => true,
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down()
    {
        if (Schema::hasTable('cash_drawers')) {
            Schema::table('cash_drawers', function (Blueprint $table) {
                if (Schema::hasColumn('cash_drawers', 'local_mapping_invalid')) {
                    $table->dropColumn('local_mapping_invalid');
                }
                if (Schema::hasColumn('cash_drawers', 'local_pos_device_id')) {
                    $table->dropColumn('local_pos_device_id');
                }
            });
        }

        if (Schema::hasTable('pos_devices')) {
            Schema::table('pos_devices', function (Blueprint $table) {
                foreach (['platform_info', 'capabilities', 'last_seen_at', 'device_status', 'pairing_token', 'device_code', 'is_local_terminal'] as $column) {
                    if (Schema::hasColumn('pos_devices', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
}

