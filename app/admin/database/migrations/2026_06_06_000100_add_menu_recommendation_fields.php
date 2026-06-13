<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureColumnsOnCurrentConnection();
        $this->ensureColumnsOnActiveTenantConnections();
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

    private function ensureColumnsOnCurrentConnection(): void
    {
        if (!Schema::hasTable('menus')) return;

        if (!Schema::hasColumn('menus', 'is_chef_recommended')) {
            Schema::table('menus', function (Blueprint $table) {
                $column = $table->boolean('is_chef_recommended')->default(false);
                if (Schema::hasColumn('menus', 'menu_status')) {
                    $column->after('menu_status');
                }
            });
        }

        if (!Schema::hasColumn('menus', 'is_manual_bestseller')) {
            Schema::table('menus', function (Blueprint $table) {
                $column = $table->boolean('is_manual_bestseller')->default(false);
                if (Schema::hasColumn('menus', 'is_chef_recommended')) {
                    $column->after('is_chef_recommended');
                }
            });
        }

        if (!Schema::hasColumn('menus', 'bestseller_override_mode')) {
            Schema::table('menus', function (Blueprint $table) {
                $column = $table->string('bestseller_override_mode', 20)->default('auto');
                if (Schema::hasColumn('menus', 'is_manual_bestseller')) {
                    $column->after('is_manual_bestseller');
                }
            });
        }
    }

    private function ensureColumnsOnActiveTenantConnections(): void
    {
        try {
            if (!DB::connection('mysql')->getSchemaBuilder()->hasTable('tenants')) {
                return;
            }

            $tenantDatabases = DB::connection('mysql')
                ->table('tenants')
                ->where('status', 'active')
                ->whereNotNull('database')
                ->where('database', '!=', '')
                ->pluck('database')
                ->unique()
                ->values();
        } catch (\Throwable $e) {
            return;
        }

        $originalDefault = DB::getDefaultConnection();
        $originalTenantDatabase = Config::get('database.connections.tenant.database');

        foreach ($tenantDatabases as $database) {
            try {
                Config::set('database.connections.tenant.database', $database);
                DB::purge('tenant');
                DB::reconnect('tenant');
                DB::setDefaultConnection('tenant');
                $this->ensureColumnsOnCurrentConnection();
            } catch (\Throwable $e) {
                // Keep igniter:up safe for tenants that are unavailable; the current tenant
                // request guard prevents stale schemas from breaking admin saves.
            }
        }

        Config::set('database.connections.tenant.database', $originalTenantDatabase);
        DB::purge('tenant');
        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }
};
