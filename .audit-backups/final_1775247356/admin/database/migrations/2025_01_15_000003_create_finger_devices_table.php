<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFingerDevicesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('finger_devices', function (Blueprint $table) {
            $table->bigIncrements('device_id');
            $table->string('name', 255);
            $table->ipAddress('ip');
            $table->integer('port')->default(4370);
            $table->string('serial_number', 255)->nullable()->unique();
            $table->text('description')->nullable();
            $table->boolean('status')->default(1);
            $table->integer('location_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('ip');
            $table->index('status');
            $table->index('location_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('finger_devices');
    }
}

