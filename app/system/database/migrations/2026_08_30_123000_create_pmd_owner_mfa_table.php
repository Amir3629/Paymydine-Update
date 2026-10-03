<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdOwnerMfaTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pmd_owner_mfa')) {
            Schema::create('pmd_owner_mfa', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('user_id')->unique();
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->string('mfa_type', 16)->default('totp');
                $table->text('secret_encrypted');
                $table->unsignedBigInteger('last_used_step')->nullable();
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamp('disabled_at')->nullable();
                $table->timestamps();

                $table->index(['staff_id', 'disabled_at'], 'pmd_owner_mfa_staff_idx');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('pmd_owner_mfa');
    }
}
