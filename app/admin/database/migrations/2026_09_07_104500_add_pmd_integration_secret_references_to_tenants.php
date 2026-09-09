<?php

use App\Services\Integrations\TenantIntegrationSecretSchemaService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $service = app(TenantIntegrationSecretSchemaService::class);
        $base = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_secret_ref_central', $base);
            DB::purge('pmd_secret_ref_central');
            DB::reconnect('pmd_secret_ref_central');
            $central = DB::connection('pmd_secret_ref_central');

            if ($central->getSchemaBuilder()->hasTable('tenants')) {
                $databases = $central->table('tenants')
                    ->whereNotNull('database')
                    ->where('database', '<>', '')
                    ->pluck('database')
                    ->filter()
                    ->unique()
                    ->values();
            }

            $template = $central->selectOne(
                'SELECT COUNT(*) AS aggregate FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                ['newtenantdb']
            );
            if ($template && (int)$template->aggregate > 0) $databases->push('newtenantdb');
        } catch (Throwable $error) {
            logger()->warning('Secret-reference schema could not enumerate tenants', [
                'message' => $error->getMessage(),
            ]);
        }

        foreach ($databases->unique()->values() as $database) {
            $runtime = $base;
            $runtime['database'] = (string)$database;

            try {
                Config::set('database.connections.pmd_secret_ref_tenant', $runtime);
                DB::purge('pmd_secret_ref_tenant');
                DB::reconnect('pmd_secret_ref_tenant');
                $service->ensure('pmd_secret_ref_tenant');
            } catch (Throwable $error) {
                logger()->error('Secret-reference schema failed for tenant', [
                    'database' => (string)$database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_secret_ref_tenant');
            }
        }

        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }

    public function down(): void
    {
        // Additive security migration. Never remove tenant credential metadata.
    }
};
