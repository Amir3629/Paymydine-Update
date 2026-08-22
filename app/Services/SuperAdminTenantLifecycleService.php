<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use System\Models\Themes_model;

class SuperAdminTenantLifecycleService
{
    private const TEMPLATE_DB = 'newtenantdb';

    public function create(array $data): array
    {
        $database = $this->normalizeDatabaseName($data['database'] ?? '');
        $domain = strtolower(trim((string)($data['domain'] ?? '')));
        $centralDatabase = (string)Config::get('database.connections.mysql.database');
        $createdDatabase = false;
        $insertedTenant = false;

        if (!$this->isValidDatabaseName($database)) {
            return ['ok' => false, 'stage' => 'validation', 'message' => 'Database name may contain only letters, numbers and underscores.'];
        }

        if (!$this->isValidTenantDomain($domain)) {
            return ['ok' => false, 'stage' => 'validation', 'message' => 'Domain must be a tenant subdomain of paymydine.com.'];
        }

        if ($this->schemaExists($database)) {
            return ['ok' => false, 'stage' => 'validation', 'message' => 'Database already exists.'];
        }

        if (!$this->schemaExists(self::TEMPLATE_DB)) {
            return ['ok' => false, 'stage' => 'template', 'message' => 'Template database newtenantdb is not available.'];
        }

        try {
            DB::connection('mysql')->table('tenants')->insert([
                'name' => $data['name'],
                'domain' => $domain,
                'database' => $database,
                'email' => $data['email'],
                'phone' => $data['phone'],
                'start' => $data['start'],
                'end' => $data['end'],
                'type' => $data['type'],
                'country' => $data['country'],
                'description' => $data['description'] ?? null,
                'status' => 'provisioning',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $insertedTenant = true;

            DB::connection('mysql')->statement('CREATE DATABASE '.$this->quoteIdentifier($database).' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            $createdDatabase = true;

            $this->cloneTemplateDatabase(self::TEMPLATE_DB, $database);
            $this->finalizeTenantDatabase($database, $centralDatabase);

            $provision = app(SuperAdminTenantDomainProvisioner::class)->provision($domain);

            DB::connection('mysql')->table('tenants')
                ->where('database', $database)
                ->update([
                    'status' => $provision['ok'] ? 'active' : 'provisioning',
                    'updated_at' => now(),
                ]);

            return [
                'ok' => (bool)$provision['ok'],
                'stage' => $provision['ok'] ? 'ready' : 'domain',
                'message' => $provision['ok']
                    ? 'Restaurant created and provisioned successfully.'
                    : 'Restaurant data and database are ready, but domain/TLS provisioning is pending: '.$provision['message'],
                'database' => $database,
                'domain' => $domain,
                'provisioning' => $provision,
            ];
        } catch (\Throwable $e) {
            Log::error('pmd_superadmin_r2_tenant_create_failed', [
                'database' => $database,
                'domain' => $domain,
                'error' => $e->getMessage(),
            ]);

            if ($createdDatabase) {
                try {
                    DB::connection('mysql')->statement('DROP DATABASE IF EXISTS '.$this->quoteIdentifier($database));
                } catch (\Throwable $rollbackError) {
                    Log::error('pmd_superadmin_r2_database_rollback_failed', [
                        'database' => $database,
                        'error' => $rollbackError->getMessage(),
                    ]);
                }
            }

            if ($insertedTenant) {
                try {
                    DB::connection('mysql')->table('tenants')->where('database', $database)->delete();
                } catch (\Throwable $rollbackError) {
                    Log::error('pmd_superadmin_r2_tenant_row_rollback_failed', [
                        'database' => $database,
                        'error' => $rollbackError->getMessage(),
                    ]);
                }
            }

            return [
                'ok' => false,
                'stage' => 'database',
                'message' => 'Tenant creation failed before completion. Partial database/registry state was rolled back where possible.',
            ];
        } finally {
            Config::set('database.connections.mysql.database', $centralDatabase);
            DB::purge('mysql');
            DB::reconnect('mysql');
        }
    }

    private function cloneTemplateDatabase(string $source, string $target): void
    {
        $tables = DB::connection('mysql')->select('SHOW TABLES FROM '.$this->quoteIdentifier($source));

        foreach ($tables as $table) {
            $tableName = array_values((array)$table)[0] ?? null;
            if (!$tableName) {
                continue;
            }

            $create = DB::connection('mysql')->select(
                'SHOW CREATE TABLE '.$this->quoteIdentifier($source).'.'.$this->quoteIdentifier($tableName)
            );

            if (!$create) {
                throw new \RuntimeException('Unable to read table definition for '.$tableName);
            }

            $createSql = $create[0]->{'Create Table'};
            DB::connection('mysql')->statement('USE '.$this->quoteIdentifier($target));
            DB::connection('mysql')->statement($createSql);

            $rowCount = (int)(DB::connection('mysql')->selectOne(
                'SELECT COUNT(*) AS aggregate FROM '.$this->quoteIdentifier($source).'.'.$this->quoteIdentifier($tableName)
            )->aggregate ?? 0);

            if ($rowCount > 0) {
                DB::connection('mysql')->statement(
                    'INSERT INTO '.$this->quoteIdentifier($target).'.'.$this->quoteIdentifier($tableName).
                    ' SELECT * FROM '.$this->quoteIdentifier($source).'.'.$this->quoteIdentifier($tableName)
                );
            }
        }
    }

    private function finalizeTenantDatabase(string $database, string $centralDatabase): void
    {
        try {
            Config::set('database.connections.mysql.database', $database);
            DB::purge('mysql');
            DB::reconnect('mysql');

            if (Schema::connection('mysql')->hasTable('tables')) {
                $existing = DB::connection('mysql')->table('tables')->where('table_name', 'Cashier')->first();
                if (!$existing) {
                    $cashierId = DB::connection('mysql')->table('tables')->insertGetId([
                        'table_name' => 'Cashier',
                        'min_capacity' => 1,
                        'max_capacity' => 1,
                        'table_status' => 1,
                        'extra_capacity' => 0,
                        'is_joinable' => 0,
                        'priority' => 999,
                        'qr_code' => 'cashier',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    if (Schema::connection('mysql')->hasTable('locationables')) {
                        DB::connection('mysql')->table('locationables')->insert([
                            'location_id' => 1,
                            'locationable_id' => $cashierId,
                            'locationable_type' => 'tables',
                            'options' => null,
                        ]);
                    }
                }
            }

            try {
                Themes_model::syncAll();
                Themes_model::activateTheme('frontend-theme');
            } catch (\Throwable $themeError) {
                Log::warning('pmd_superadmin_r2_theme_finalize_warning', [
                    'database' => $database,
                    'error' => $themeError->getMessage(),
                ]);
            }
        } finally {
            Config::set('database.connections.mysql.database', $centralDatabase);
            DB::purge('mysql');
            DB::reconnect('mysql');
        }
    }

    private function schemaExists(string $schema): bool
    {
        return (bool)DB::connection('mysql')->selectOne(
            'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
            [$schema]
        );
    }

    private function normalizeDatabaseName(string $database): string
    {
        return trim(str_replace([' ', '-'], '_', $database));
    }

    private function isValidDatabaseName(string $database): bool
    {
        return (bool)preg_match('/^[A-Za-z0-9_]{1,64}$/', $database);
    }

    private function isValidTenantDomain(string $domain): bool
    {
        return (bool)preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)
            && !in_array($domain, ['www.paymydine.com'], true);
    }

    private function quoteIdentifier(string $identifier): string
    {
        return '`'.str_replace('`', '``', $identifier).'`';
    }
}
