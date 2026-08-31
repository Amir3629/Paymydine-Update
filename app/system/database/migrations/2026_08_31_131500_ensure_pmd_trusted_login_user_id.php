<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** PMD_TRUSTED_LOGIN_USER_ID_REPAIR_V14 */
class EnsurePmdTrustedLoginUserId extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_site_access_devices')) return;
        if (Schema::hasColumn('pmd_site_access_devices', 'user_id')) return;

        Schema::table('pmd_site_access_devices', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('location_id');
            $table->index(
                ['user_id', 'location_id', 'device_kind', 'revoked_at'],
                'pmd_site_devices_user_location_kind_idx'
            );
        });
    }

    public function down()
    {
        // Intentionally non-destructive. Trusted-device rows may already exist.
    }
}
