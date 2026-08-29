<?php

use App\Services\PmdKitchenOperationsSchemaService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $service = app(PmdKitchenOperationsSchemaService::class);
        $base = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_kitchen_schema_central', $base);
            DB::purge('pmd_kitchen_schema_central');
            DB::reconnect('pmd_kitchen_schema_central');

            $central = DB::connection('pmd_kitchen_schema_central');
            if ($central->getSchemaBuilder()->hasTable('tenants')) {
                $databases = $central->table('tenants')
                    ->whereNotNull('database')
                    ->where('database', '<>', '')
                    ->where(function ($query): void {
                        $query->where('status', 'active')
                            ->orWhere('status', 'enabled')
                            ->orWhere('status', 1)
                            ->orWhere('status', 'new');
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
        } catch (Throwable $error) {
            logger()->warning('Kitchen Operations schema repair could not enumerate tenant databases', [
                'message' => $error->getMessage(),
            ]);
        }

        foreach ($databases->unique()->values() as $database) {
            $runtime = $base;
            $runtime['database'] = (string)$database;

            try {
                Config::set('database.connections.pmd_kitchen_schema_tenant', $runtime);
                DB::purge('pmd_kitchen_schema_tenant');
                DB::reconnect('pmd_kitchen_schema_tenant');
                $service->ensure('pmd_kitchen_schema_tenant');
            } catch (Throwable $error) {
                logger()->error('Kitchen Operations schema repair failed for tenant database', [
                    'database' => (string)$database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_kitchen_schema_tenant');
            }
        }

        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }

    public function down(): void
    {
        // Additive repair only. Never remove restaurant roster, shift or ETA data.
    }
};
