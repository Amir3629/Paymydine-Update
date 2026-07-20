<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_groups', function (Blueprint $table) {
            $table->bigIncrements('table_group_id');
            $table->unsignedBigInteger('location_id')->index();
            $table->string('name', 255);
            $table->string('status', 20)->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('table_group_tables', function (Blueprint $table) {
            $table->bigIncrements('table_group_table_id');
            $table->unsignedBigInteger('table_group_id')->index();
            $table->unsignedBigInteger('table_id')->index();
            $table->timestamps();
            $table->unique(['table_group_id', 'table_id']);
            $table->unique(['table_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_group_tables');
        Schema::dropIfExists('table_groups');
    }
};

