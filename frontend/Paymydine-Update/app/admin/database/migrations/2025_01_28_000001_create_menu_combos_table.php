<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMenuCombosTable extends Migration
{
    public function up()
    {
        Schema::create('menu_combos', function (Blueprint $table) {
            $table->bigIncrements('combo_id');
            $table->string('combo_name', 128);
            $table->text('combo_description')->nullable();
            $table->decimal('combo_price', 15, 4);
            $table->unsignedInteger('location_id')->nullable();
            $table->boolean('combo_status')->default(1);
            $table->integer('combo_priority')->default(0);
            $table->string('thumb')->nullable();
            $table->timestamps();
            
            $table->index(['combo_status', 'combo_priority']);
        });
        
        Schema::create('menu_combo_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('combo_id');
            $table->unsignedBigInteger('menu_id');
            $table->integer('quantity')->default(1);
            $table->timestamps();
            
            $table->foreign('combo_id')->references('combo_id')->on('menu_combos')->onDelete('cascade');
            $table->foreign('menu_id')->references('menu_id')->on('menus')->onDelete('cascade');
            $table->index(['combo_id', 'menu_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('menu_combo_items');
        Schema::dropIfExists('menu_combos');
    }
}

