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
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        Config::set(
            'database.connections.pmd_guarantee_method_central',
            $centralConfig
        );
        DB::purge('pmd_guarantee_method_central');
        DB::reconnect('pmd_guarantee_method_central');

        $central = DB::connection('pmd_guarantee_method_central');

        if ($central->getSchemaBuilder()->hasTable('tenants')) {
            $rows = $central->table('tenants')
                ->whereNotNull('database')
                ->where('database', '<>', '')
                ->where(function ($query): void {
                    $query->where('status', 'active')
                        ->orWhere('status', 'enabled')
                        ->orWhere('status', 1);
                })
                ->get();

            foreach ($rows as $row) {
                $databases->push([
                    'database' => (string)$row->database,
                    'host' => $row->db_host
                        ?? $centralConfig['host']
                        ?? null,
                    'port' => $row->db_port
                        ?? $centralConfig['port']
                        ?? null,
                    'username' => $row->db_user
                        ?? $centralConfig['username']
                        ?? null,
                    'password' => $row->db_pass
                        ?? $centralConfig['password']
                        ?? null,
                ]);
            }
        }

        $templateExists = (bool)$central->selectOne(
            'SELECT COUNT(*) AS aggregate
             FROM INFORMATION_SCHEMA.SCHEMATA
             WHERE SCHEMA_NAME = ?',
            ['newtenantdb']
        )->aggregate;

        if ($templateExists) {
            $databases->push(array_merge(
                $centralConfig,
                ['database' => 'newtenantdb']
            ));
        }

        $seen = [];

        try {
            foreach ($databases as $config) {
                $database = trim((string)($config['database'] ?? ''));
                if ($database === '' || isset($seen[$database])) {
                    continue;
                }
                $seen[$database] = true;

                $runtime = $centralConfig;
                foreach (
                    ['database', 'host', 'port', 'username', 'password']
                    as $key
                ) {
                    if (
                        array_key_exists($key, $config)
                        && $config[$key] !== null
                    ) {
                        $runtime[$key] = $config[$key];
                    }
                }

                Config::set(
                    'database.connections.pmd_guarantee_method_tenant',
                    $runtime
                );
                DB::purge('pmd_guarantee_method_tenant');
                DB::reconnect('pmd_guarantee_method_tenant');

                $schema = Schema::connection(
                    'pmd_guarantee_method_tenant'
                );
                if (
                    $schema->hasTable('reservation_guarantees')
                    && !$schema->hasColumn(
                        'reservation_guarantees',
                        'payment_method_code'
                    )
                ) {
                    $schema->table(
                        'reservation_guarantees',
                        function (Blueprint $table): void {
                            $table->string(
                                'payment_method_code',
                                32
                            )->nullable()->after('provider_mode');
                        }
                    );
                }

                DB::disconnect('pmd_guarantee_method_tenant');
            }
        } finally {
            DB::setDefaultConnection($originalDefault ?: 'mysql');
        }
    }

    public function down(): void
    {
        // Evidence-preserving migration: never remove guarantee columns.
    }
};
