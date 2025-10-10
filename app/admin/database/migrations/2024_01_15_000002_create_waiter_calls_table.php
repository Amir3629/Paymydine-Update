<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWaiterCallsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('ti_waiter_calls', function (Blueprint $table) {
            $table->id('call_id');
            $table->unsignedBigInteger('table_id');
            $table->text('message');
            $table->enum('status', ['pending', 'acknowledged', 'completed', 'cancelled'])->default('pending');
            $table->timestamps();
            
            // Indexes
            $table->index(['table_id', 'status']);
            $table->index('created_at');
            
            // Foreign keys
            $table->foreign('table_id')->references('table_id')->on('ti_tables')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('ti_waiter_calls');
    }
}