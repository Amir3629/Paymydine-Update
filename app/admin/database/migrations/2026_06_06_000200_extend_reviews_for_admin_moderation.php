<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reviews')) return;

        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('reviews', 'order_id')) $table->unsignedInteger('order_id')->nullable()->index()->after('review_id');
            if (!Schema::hasColumn('reviews', 'menu_id')) $table->unsignedInteger('menu_id')->nullable()->index()->after('order_id');
            if (!Schema::hasColumn('reviews', 'customer_name')) $table->string('customer_name', 120)->nullable()->after('menu_id');
            if (!Schema::hasColumn('reviews', 'rating')) $table->unsignedTinyInteger('rating')->default(0)->after('customer_name');
            if (!Schema::hasColumn('reviews', 'comment')) $table->text('comment')->nullable()->after('rating');
            if (!Schema::hasColumn('reviews', 'status')) $table->string('status', 20)->default('pending')->index()->after('comment');
            if (!Schema::hasColumn('reviews', 'source')) $table->string('source', 30)->default('frontend')->after('status');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('reviews')) return;

        Schema::table('reviews', function (Blueprint $table) {
            foreach (['source', 'status', 'comment', 'rating', 'customer_name', 'menu_id', 'order_id'] as $column) {
                if (Schema::hasColumn('reviews', $column)) $table->dropColumn($column);
            }
        });
    }
};
