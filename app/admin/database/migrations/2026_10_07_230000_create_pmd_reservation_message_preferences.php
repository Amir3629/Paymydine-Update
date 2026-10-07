<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pmd_reservation_message_preferences')) {
            return;
        }

        Schema::create('pmd_reservation_message_preferences', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('reservation_id')->unique();
            $table->boolean('whatsapp_opt_in')->default(false);
            $table->string('locale', 8)->default('de');
            $table->timestamps();

            $table->index(['whatsapp_opt_in', 'reservation_id'], 'pmd_res_msg_pref_optin_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pmd_reservation_message_preferences');
    }
};
