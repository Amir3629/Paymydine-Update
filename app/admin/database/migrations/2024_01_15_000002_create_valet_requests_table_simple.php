<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateValetRequestsTableSimple extends Migration
{
    public function up()
    {
        Schema::create('ti_valet_requests', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('table_id')->unsigned();
            $table->string('customer_name');
            $table->string('car_make');
            $table->string('license_plate');
            $table->enum('status', ['pending', 'resolved'])->default('pending');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable();

            $table->index('table_id');
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('ti_valet_requests');
    }
}