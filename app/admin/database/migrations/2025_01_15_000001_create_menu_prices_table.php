<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMenuPricesTable extends Migration
{
    public function up()
    {
        Schema::create('menu_prices', function (Blueprint $table) {
            $table->increments('price_id');
            $table->unsignedInteger('menu_id');
            $table->string('price_type', 50); // 'bar', 'dining_room', 'room_service', 'happy_hour', 'default'
            $table->decimal('price', 10, 2);
            $table->boolean('is_active')->default(1);
            $table->time('time_from')->nullable(); // For time-based pricing (happy hour)
            $table->time('time_to')->nullable(); // For time-based pricing (happy hour)
            $table->string('days_of_week', 20)->nullable(); // Comma-separated: 'Mon,Tue,Wed' or null for all days
            $table->integer('priority')->default(0); // For ordering
            $table->timestamps();

            $table->index('menu_id');
            $table->index(['price_type', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('menu_prices');
    }
}

