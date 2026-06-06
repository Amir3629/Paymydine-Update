<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateKdsStationsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('kds_stations')) {
            return;
        }

        Schema::create('kds_stations', function (Blueprint $table) {
            $table->id('station_id');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('location_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('location_id');
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('kds_stations');
    }
}
