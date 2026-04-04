<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTipsShiftsTable extends Migration
{
    public function up()
    {
        Schema::create('tips_shifts', function (Blueprint $table) {
            $table->bigIncrements('shift_id');
            $table->date('shift_date');
            $table->unsignedInteger('location_id')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['shift_date', 'location_id']);
            $table->unique(['shift_date', 'location_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('tips_shifts');
    }
}

