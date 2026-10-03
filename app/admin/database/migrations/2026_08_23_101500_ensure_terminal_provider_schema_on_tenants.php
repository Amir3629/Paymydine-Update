<?php

use App\Services\Payments\TenantProviderSchemaService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $service = app(TenantProviderSchemaService::class);
        $base = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();

        $databases = collect();

        try {
            Config::set('database.connections.pmd_provider_schema_central', $base);
            DB::purge('pmd_provider_schema_central');
            DB::reconnect('pmd_provider_schema_central');

            $central = DB::connection('pmd_provider_schema_central');
            if ($central->getSchemaBuilder()->hasTable('tenants')) {
                $databases = $central->table('tenants')
                    ->whereNotNull('database')
                    ->where('database', '<>', '')
                    ->where(function ($query): void {
                        $query->where('status', 'active')
                            ->orWhere('status', 'enabled')
                            ->orWhere('status', 1);
                    })
                    ->pluck('database')
                    ->filter()
                    ->unique()
                    ->values();
            }

            $templateExists = (bool)$central->selectOne(
                'SELECT COUNT(*) AS aggregate FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                ['newtenantdb']
            )->aggregate;

            if ($templateExists) {
                $databases->push('newtenantdb');
            }
        } catch (Throwable $e) {
            logger()->warning('Provider schema repair could not enumerate tenant databases', [
                'message' => $e->getMessage(),
            ]);
        }

        foreach ($databases->unique()->values() as $database) {
            $runtime = $base;
            $runtime['database'] = (string)$database;

            try {
                Config::set('database.connections.pmd_provider_schema_tenant', $runtime);
                DB::purge('pmd_provider_schema_tenant');
                DB::reconnect('pmd_provider_schema_tenant');
                $service->ensure('pmd_provider_schema_tenant');
            } catch (Throwable $e) {
                logger()->error('Provider schema repair failed for tenant database', [
                    'database' => (string)$database,
                    'message' => $e->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_provider_schema_tenant');
            }
        }

        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }

    public function down(): void
    {
        // Repair migration only. Never remove provider/payment data from tenants.
    }
};
