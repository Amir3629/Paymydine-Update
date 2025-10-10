<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWaiterCallsTableSimple extends Migration
{
    public function up()
    {
        Schema::create('ti_waiter_calls', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('table_id')->unsigned();
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'resolved'])->default('pending');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable();

            $table->index('table_id');
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('ti_waiter_calls');
    }
}