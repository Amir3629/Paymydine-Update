<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdPortalMfaTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_portal_mfa')) {
            Schema::create('pmd_portal_mfa', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('user_id');
                // Historical enrollment location only. Portal MFA is user-scoped
                // inside the tenant, so the same personal Authenticator follows a
                // multi-location staff account without a second QR enrollment.
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->unsignedBigInteger('location_id');
                $table->string('mfa_type', 16)->default('totp');
                $table->text('secret_encrypted');
                $table->unsignedBigInteger('last_used_step')->nullable();
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamp('disabled_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'location_id'], 'pmd_portal_mfa_user_location_uq');
                $table->index(['staff_id', 'disabled_at'], 'pmd_portal_mfa_staff_idx');
                $table->index(['user_id', 'disabled_at'], 'pmd_portal_mfa_user_active_idx');
            });
        }

        if (!Schema::hasTable('pmd_portal_mfa_recovery_codes')) {
            Schema::create('pmd_portal_mfa_recovery_codes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('user_id');
                $table->string('code_hash', 64);
                $table->timestamp('used_at')->nullable();
                $table->timestamp('created_at')->nullable();

                $table->unique(['user_id', 'code_hash'], 'pmd_portal_mfa_recovery_user_code_uq');
                $table->index(['user_id', 'used_at'], 'pmd_portal_mfa_recovery_user_used_idx');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('pmd_portal_mfa_recovery_codes');
        Schema::dropIfExists('pmd_portal_mfa');
    }
}
