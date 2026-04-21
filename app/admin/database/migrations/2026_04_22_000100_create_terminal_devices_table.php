<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('terminal_devices')) {
            return;
        }

        Schema::create('terminal_devices', function (Blueprint $table): void {
            $table->bigIncrements('terminal_device_id');
            $table->string('provider_code', 50)->index();
            $table->unsignedInteger('location_id')->nullable()->index();
            $table->string('affiliate_key', 191)->nullable();
            $table->string('reader_id', 191)->nullable()->index();
            $table->string('reader_label', 191)->nullable();
            $table->string('pairing_state', 50)->nullable();
            $table->string('terminal_status', 191)->nullable();
            $table->longText('metadata')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terminal_devices');
    }
};
