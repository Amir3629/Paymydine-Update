<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('orders') || Schema::hasColumn('orders', 'guest_count')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedTinyInteger('guest_count')
                ->nullable()
                ->after('total_items');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('orders') || !Schema::hasColumn('orders', 'guest_count')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('guest_count');
        });
    }
};
