<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdReservationPreferencesTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('pmd_reservation_preferences')) {
            return;
        }

        Schema::create('pmd_reservation_preferences', function (Blueprint $table) {
            $table->unsignedBigInteger('reservation_id')->primary();
            $table->longText('table_features');
        });
    }

    public function down()
    {
        Schema::dropIfExists('pmd_reservation_preferences');
    }
}
