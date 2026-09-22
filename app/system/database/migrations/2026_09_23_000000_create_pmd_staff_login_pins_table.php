<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdStaffLoginPinsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('pmd_staff_login_pins')) return;

        Schema::create('pmd_staff_login_pins', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->unique();
            $table->unsignedBigInteger('staff_id');
            $table->string('pin_lookup', 64)->unique();
            $table->string('pin_hash', 255);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->timestamps();

            $table->index(
                ['staff_id', 'disabled_at'],
                'pmd_staff_pin_staff_active_idx'
            );
        });
    }

    public function down()
    {
        Schema::dropIfExists('pmd_staff_login_pins');
    }
}
