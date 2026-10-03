<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('pmd_admin_presence_sessions')) return;

        Schema::create('pmd_admin_presence_sessions', function (Blueprint $table) {
            $table->bigIncrements('presence_id');
            $table->char('session_hash', 64)->unique();
            $table->unsignedBigInteger('user_id')->index();
            $table->unsignedBigInteger('staff_id')->nullable()->index();
            $table->integer('location_id')->nullable()->index();
            $table->dateTime('login_at')->index();
            $table->dateTime('last_seen_at')->index();
            $table->dateTime('expires_at')->index();
            $table->dateTime('logout_at')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
            $table->index(['location_id', 'logout_at', 'expires_at'], 'pmd_presence_location_online_idx');
        });
    }

    public function down()
    {
        Schema::dropIfExists('pmd_admin_presence_sessions');
    }
};
