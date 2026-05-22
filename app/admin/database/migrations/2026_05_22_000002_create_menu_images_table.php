<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('menu_images', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedInteger('menu_id');
            $table->string('image_path');
            $table->unsignedInteger('sort_order')->default(1);
            $table->timestamps();

            $table->index(['menu_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_images');
    }
};

