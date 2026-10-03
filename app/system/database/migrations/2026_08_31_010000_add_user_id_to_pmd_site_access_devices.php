<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** PMD_TRUSTED_LOGIN_DEVICE_USER_BINDING_V1 */
class AddUserIdToPmdSiteAccessDevices extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_site_access_devices')) return;

        if (!Schema::hasColumn('pmd_site_access_devices', 'user_id')) {
            Schema::table('pmd_site_access_devices', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('location_id');
                $table->index(
                    ['user_id', 'location_id', 'device_kind', 'revoked_at'],
                    'pmd_site_devices_user_location_kind_idx'
                );
            });
        }

        // Existing personal-device rows were historically staff-bound only.
        // Bind them to the matching PMD user when that relationship is unambiguous.
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'staff_id')) {
            DB::table('pmd_site_access_devices')
                ->whereNull('user_id')
                ->whereNotNull('staff_id')
                ->orderBy('id')
                ->chunkById(200, function ($devices) {
                    foreach ($devices as $device) {
                        $userId = (int)DB::table('users')
                            ->where('staff_id', (int)$device->staff_id)
                            ->orderBy('user_id')
                            ->value('user_id');

                        if ($userId > 0) {
                            DB::table('pmd_site_access_devices')
                                ->where('id', (int)$device->id)
                                ->whereNull('user_id')
                                ->update([
                                    'user_id' => $userId,
                                    'updated_at' => now(),
                                ]);
                        }
                    }
                }, 'id');
        }
    }

    public function down()
    {
        if (
            !Schema::hasTable('pmd_site_access_devices')
            || !Schema::hasColumn('pmd_site_access_devices', 'user_id')
        ) {
            return;
        }

        Schema::table('pmd_site_access_devices', function (Blueprint $table) {
            try {
                $table->dropIndex('pmd_site_devices_user_location_kind_idx');
            } catch (\Throwable $error) {
            }
            $table->dropColumn('user_id');
        });
    }
}
