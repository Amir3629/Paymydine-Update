<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWaiterRequestsTable extends Migration
{
    public function up()
    {
        Schema::create('waiter_requests', function (Blueprint $table) {
            $table->id();
            $table->integer('location_id');
            $table->integer('table_number');
            $table->text('note')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
            
            $table->index('location_id');
            $table->index(['location_id', 'table_number']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('waiter_requests');
    }
} 