<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePosHardwareCommandsTable extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('pos_hardware_commands')) {
            Schema::create('pos_hardware_commands', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('drawer_id')->nullable();
                $table->unsignedBigInteger('pos_device_id')->nullable();
                $table->unsignedBigInteger('location_id')->nullable();
                $table->string('command_type', 50);
                $table->text('payload')->nullable();
                $table->enum('status', ['pending', 'processing', 'success', 'failed', 'cancelled'])->default('pending');
                $table->text('result_message')->nullable();
                $table->text('result_payload')->nullable();
                $table->timestamp('queued_at')->nullable();
                $table->timestamp('picked_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(['status', 'pos_device_id']);
                $table->index('queued_at');
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('pos_hardware_commands');
    }
}

