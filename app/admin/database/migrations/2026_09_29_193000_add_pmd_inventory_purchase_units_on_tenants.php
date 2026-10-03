<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_INVENTORY_PURCHASE_UNITS_R5
 *
 * Adds the small but important bridge between "how stock is tracked" and
 * "how suppliers sell it". Example: track water in ml, buy it by bottle,
 * 1 bottle = 750 ml. The migration is tenant-aware and also updates the
 * new-tenant template database.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->ensureOnConnection(DB::getDefaultConnection());
        $this->ensureOnTenantDatabases();
    }

    public function down(): void
    {
        // Additive operational metadata. Do not remove from tenant databases.
    }

    private function ensureOnTenantDatabases(): void
    {
        $centralConfig = (array)config('database.connections.mysql');
        $originalDefault = DB::getDefaultConnection();
        $databases = collect();

        try {
            Config::set('database.connections.pmd_inventory_units_central', $centralConfig);
            DB::purge('pmd_inventory_units_central');
            DB::reconnect('pmd_inventory_units_central');

            $central = DB::connection('pmd_inventory_units_central');

            if ($central->getSchemaBuilder()->hasTable('tenants')) {
                $rows = $central->table('tenants')
                    ->whereNotNull('database')
                    ->where('database', '<>', '')
                    ->where(function ($query): void {
                        $query->where('status', 'active')
                            ->orWhere('status', 'enabled')
                            ->orWhere('status', 1)
                            ->orWhere('status', 'new');
                    })
                    ->get();

                foreach ($rows as $row) {
                    $databases->push([
                        'database' => (string)$row->database,
                        'host' => $row->db_host ?? $centralConfig['host'] ?? null,
                        'port' => $row->db_port ?? $centralConfig['port'] ?? null,
                        'username' => $row->db_user ?? $centralConfig['username'] ?? null,
                        'password' => $row->db_pass ?? $centralConfig['password'] ?? null,
                    ]);
                }
            }

            $templateExists = (bool)$central->selectOne(
                'SELECT COUNT(*) AS aggregate FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                ['newtenantdb']
            )->aggregate;

            if ($templateExists) {
                $databases->push(array_merge($centralConfig, ['database' => 'newtenantdb']));
            }
        } catch (\Throwable $error) {
            logger()->warning('Inventory purchase-unit migration could not enumerate tenants', [
                'message' => $error->getMessage(),
            ]);
        }

        $seen = [];
        foreach ($databases as $tenantConfig) {
            $database = trim((string)($tenantConfig['database'] ?? ''));
            if ($database === '' || isset($seen[$database])) {
                continue;
            }
            $seen[$database] = true;

            $runtime = $centralConfig;
            foreach (['database', 'host', 'port', 'username', 'password'] as $key) {
                if (array_key_exists($key, $tenantConfig) && $tenantConfig[$key] !== null) {
                    $runtime[$key] = $tenantConfig[$key];
                }
            }

            try {
                Config::set('database.connections.pmd_inventory_units_tenant', $runtime);
                DB::purge('pmd_inventory_units_tenant');
                DB::reconnect('pmd_inventory_units_tenant');
                $this->ensureOnConnection('pmd_inventory_units_tenant');
            } catch (\Throwable $error) {
                logger()->error('Inventory purchase-unit migration failed for tenant', [
                    'database' => $database,
                    'message' => $error->getMessage(),
                ]);
            } finally {
                DB::disconnect('pmd_inventory_units_tenant');
            }
        }

        DB::setDefaultConnection($originalDefault ?: 'mysql');
    }

    private function ensureOnConnection(string $connection): void
    {
        $schema = Schema::connection($connection);
        if (!$schema->hasTable('pmd_inventory_items')) {
            return;
        }

        if (!$schema->hasColumn('pmd_inventory_items', 'purchase_unit')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->string('purchase_unit', 30)->nullable()->after('base_unit');
            });
        }

        if (!$schema->hasColumn('pmd_inventory_items', 'purchase_to_base')) {
            $schema->table('pmd_inventory_items', function (Blueprint $table) {
                $table->decimal('purchase_to_base', 16, 4)
                    ->default(1)
                    ->after('purchase_unit');
            });
        }

        $db = DB::connection($connection);
        $db->table('pmd_inventory_items')
            ->whereNull('purchase_unit')
            ->update([
                'purchase_unit' => DB::raw('base_unit'),
                'purchase_to_base' => 1,
            ]);

        $db->table('pmd_inventory_items')
            ->where('purchase_to_base', '<=', 0)
            ->update(['purchase_to_base' => 1]);
    }
};
