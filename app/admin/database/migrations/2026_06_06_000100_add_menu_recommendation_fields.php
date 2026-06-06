<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('menus')) return;

        Schema::table('menus', function (Blueprint $table) {
            if (!Schema::hasColumn('menus', 'is_chef_recommended')) {
                $table->boolean('is_chef_recommended')->default(false)->after('menu_status');
            }
            if (!Schema::hasColumn('menus', 'is_manual_bestseller')) {
                $table->boolean('is_manual_bestseller')->default(false)->after('is_chef_recommended');
            }
            if (!Schema::hasColumn('menus', 'bestseller_override_mode')) {
                $table->string('bestseller_override_mode', 20)->default('auto')->after('is_manual_bestseller');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('menus')) return;

        Schema::table('menus', function (Blueprint $table) {
            foreach (['bestseller_override_mode', 'is_manual_bestseller', 'is_chef_recommended'] as $column) {
                if (Schema::hasColumn('menus', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
