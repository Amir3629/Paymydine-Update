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
        if (!Schema::hasTable('categories')) {
            return;
        }

        if (Schema::hasColumn('categories', 'pmd_kind')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->dropColumn('pmd_kind');
            });
        }
    }

    private function ensureColumnsOnCurrentConnection(): void
    {
        if (!Schema::hasTable('categories')) {
            return;
        }

        if (!Schema::hasColumn('categories', 'pmd_kind')) {
            Schema::table('categories', function (Blueprint $table) {
                $column = $table->string('pmd_kind', 24)->default('regular');

                if (Schema::hasColumn('categories', 'frontend_visible')) {
                    $column->after('frontend_visible');
                } elseif (Schema::hasColumn('categories', 'status')) {
                    $column->after('status');
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
        } catch (\Throwable $error) {
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
            } catch (\Throwable $error) {
                // Keep migrations safe when one tenant is temporarily unavailable.
            }
        }

        Config::set('database.connections.tenant.database', $originalTenantDatabase);
        DB::purge('tenant');
        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }
};
