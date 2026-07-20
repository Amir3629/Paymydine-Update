<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateOrderNotesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasTable('order_notes')) {
            Schema::create('order_notes', function (Blueprint $table) {
                $table->increments('note_id');
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->text('note');
                $table->enum('status', ['active', 'archived'])->default('active');
                $table->timestamps();
                
                // Indexes
                $table->index(['order_id', 'status']);
                $table->index('created_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('order_notes');
    }
}

