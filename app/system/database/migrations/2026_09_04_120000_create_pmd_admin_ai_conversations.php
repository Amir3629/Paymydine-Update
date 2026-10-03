<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pmd_admin_ai_conversations')) return;

        Schema::create('pmd_admin_ai_conversations', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('location_id');
            $table->unsignedBigInteger('admin_user_id');
            $table->date('conversation_date');
            $table->string('role', 16);
            $table->longText('content');
            $table->string('run_id', 64)->nullable();
            $table->timestamps();
            $table->index(['location_id', 'admin_user_id', 'id'], 'pmd_admin_ai_scope_idx');
            $table->index(
                ['location_id', 'admin_user_id', 'conversation_date', 'id'],
                'pmd_admin_ai_day_scope_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pmd_admin_ai_conversations');
    }
};
