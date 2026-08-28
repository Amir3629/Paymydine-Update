<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdStaffRequests extends Migration
{
    public function up()
    {
        if (Schema::hasTable('pmd_staff_requests')) return;

        Schema::create('pmd_staff_requests', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('location_id');
            $table->unsignedBigInteger('staff_id');
            $table->unsignedBigInteger('person_id')->nullable();
            $table->string('request_type', 32);
            $table->unsignedBigInteger('shift_id')->nullable();
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->text('message')->nullable();
            $table->string('status', 24)->default('pending');
            $table->text('manager_reply')->nullable();
            $table->unsignedBigInteger('handled_by_staff_id')->nullable();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();
            $table->index(['location_id', 'status'], 'pmd_staff_requests_location_status_idx');
            $table->index(['staff_id', 'status'], 'pmd_staff_requests_staff_status_idx');
            $table->index(['person_id', 'created_at'], 'pmd_staff_requests_person_created_idx');
        });
    }

    public function down()
    {
        Schema::dropIfExists('pmd_staff_requests');
    }
}
