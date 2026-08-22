<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use System\Models\Themes_model;

class SuperAdminTenantLifecycleService
{
    private const TEMPLATE_DB = 'newtenantdb';

    /*
     * The template is an application/runtime baseline, NOT sample restaurant data.
     * These logical tables must start empty for every new tenant. Keeping this
     * list here also makes the rule explicit and testable instead of relying on
     * whatever data happens to exist in newtenantdb on a given day.
     */
    private const EMPTY_ON_NEW_TENANT = [
        // Orders, receipts and payment history
        'orders',
        'order_menus',
        'order_menu_options',
        'order_totals',
        'order_notes',
        'payment_logs',
        'order_payment_transactions',
        'order_payment_transaction_items',
        'fiskaly_transactions',
        'status_history',
        'assignable_logs',

        // Reservations / floor / service activity
        'reservations',
        'reservation_tables',
        'tables',
        'table_notes',
        'waiter_calls',
        'valet_requests',

        // Menu/catalog content
        'menus',
        'menu_categories',
        'menu_mealtimes',
        'menus_specials',
        'menu_images',
        'menu_prices',
        'menu_item_options',
        'menu_item_option_values',
        'menu_options',
        'menu_option_values',
        'categories',
        'mealtimes',
        'allergens',
        'allergenables',
        'stocks',
        'stock_history',

        // Promotions / gift-card activity
        'igniter_coupons',
        'coupons_history',
        'gift_card_transactions',

        // Guest/customer/demo activity
        'customers',
        'addresses',
        'reviews',
        'notifications',
    ];

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
                'status' => 'disabled',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $insertedTenant = true;

            DB::connection('mysql')->statement(
                'CREATE DATABASE '.$this->quoteIdentifier($database).' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
            );
            $createdDatabase = true;

            $this->cloneTemplateDatabase(self::TEMPLATE_DB, $database);
            $this->finalizeTenantDatabase($database, $centralDatabase, $data);

            $provision = app(SuperAdminTenantDomainProvisioner::class)->provision($domain);

            $this->restoreCentralConnection($centralDatabase);

            DB::connection('mysql')->table('tenants')
                ->where('database', $database)
                ->update([
                    'status' => $provision['ok'] ? 'active' : 'disabled',
                    'updated_at' => now(),
                ]);

            return [
                'ok' => (bool)$provision['ok'],
                'stage' => $provision['ok'] ? 'ready' : 'domain',
                'message' => $provision['ok']
                    ? 'Restaurant created with a clean tenant database and provisioned successfully.'
                    : 'Restaurant database is clean and ready, but the tenant remains disabled until domain/TLS provisioning succeeds: '.$provision['message'],
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

            $this->restoreCentralConnection($centralDatabase);

            if ($createdDatabase) {
                try {
                    DB::connection('mysql')->statement(
                        'DROP DATABASE IF EXISTS '.$this->quoteIdentifier($database)
                    );
                } catch (\Throwable $rollbackError) {
                    Log::error('pmd_superadmin_r2_database_rollback_failed', [
                        'database' => $database,
                        'error' => $rollbackError->getMessage(),
                    ]);
                }
            }

            $this->restoreCentralConnection($centralDatabase);

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
            $this->restoreCentralConnection($centralDatabase);
        }
    }

    private function cloneTemplateDatabase(string $source, string $target): void
    {
        $tables = DB::connection('mysql')->select('SHOW TABLES FROM '.$this->quoteIdentifier($source));

        foreach ($tables as $table) {
            $tableName = array_values((array)$table)[0] ?? null;
            if (!$tableName) continue;

            $create = DB::connection('mysql')->select(
                'SHOW CREATE TABLE '.$this->quoteIdentifier($source).'.'.$this->quoteIdentifier($tableName)
            );

            if (!$create) {
                throw new \RuntimeException('Unable to read table definition for '.$tableName);
            }

            $createSql = $create[0]->{'Create Table'};
            DB::connection('mysql')->statement('USE '.$this->quoteIdentifier($target));
            DB::connection('mysql')->statement($createSql);

            // Never clone tenant-specific/demo rows. The schema is still cloned
            // so every product capability exists, but business content starts at 0.
            if ($this->mustStartEmpty($tableName)) {
                continue;
            }

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

    private function finalizeTenantDatabase(string $database, string $centralDatabase, array $data): void
    {
        try {
            Config::set('database.connections.mysql.database', $database);
            DB::purge('mysql');
            DB::reconnect('mysql');

            // Defense in depth: even if the template changes or an old copy path
            // reappears, visible restaurant/business data is removed before READY.
            $this->sanitizeTenantBusinessData();
            $this->applyTenantIdentity($data);

            // Intentionally DO NOT create a default Cashier/floor table. A new
            // restaurant must start with zero floor tables and create its own.

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
            $this->restoreCentralConnection($centralDatabase);
        }
    }

    private function sanitizeTenantBusinessData(): void
    {
        DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            foreach (self::EMPTY_ON_NEW_TENANT as $table) {
                if (!Schema::connection('mysql')->hasTable($table)) continue;
                DB::connection('mysql')->table($table)->truncate();
            }

            // locationables also contains staff/location baseline links, so do
            // not truncate it. Remove only links belonging to content we emptied.
            if (Schema::connection('mysql')->hasTable('locationables')) {
                DB::connection('mysql')->table('locationables')
                    ->whereIn('locationable_type', [
                        'tables', 'menus', 'categories', 'coupons', 'igniter_coupons',
                        'menu_options', 'allergens',
                    ])
                    ->delete();
            }
        } finally {
            DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    private function applyTenantIdentity(array $data): void
    {
        $domain = strtolower(trim((string)($data['domain'] ?? '')));
        $name = trim((string)($data['name'] ?? ''));
        $domainLabel = $domain !== '' ? explode('.', $domain)[0] : '';
        $displayName = $name !== '' ? $name : ($domainLabel !== '' ? $domainLabel : 'PayMyDine');

        if (Schema::connection('mysql')->hasTable('settings')) {
            $settings = DB::connection('mysql')->table('settings');
            if ($settings->where('item', 'site_name')->exists()) {
                $settings->where('item', 'site_name')->update(['value' => $displayName]);
            }
        }

        if (
            Schema::connection('mysql')->hasTable('locations')
            && Schema::connection('mysql')->hasColumn('locations', 'location_name')
        ) {
            $location = DB::connection('mysql')->table('locations')->orderBy('location_id')->first();
            if ($location) {
                $update = ['location_name' => $displayName];
                if (Schema::connection('mysql')->hasColumn('locations', 'permalink_slug')) {
                    $update['permalink_slug'] = Str::slug($domainLabel !== '' ? $domainLabel : $displayName);
                }
                DB::connection('mysql')->table('locations')->where('location_id', $location->location_id)->update($update);
            }
        }
    }

    private function mustStartEmpty(string $physicalTable): bool
    {
        $prefix = (string)Config::get('database.connections.mysql.prefix', '');
        $logical = ($prefix !== '' && str_starts_with($physicalTable, $prefix))
            ? substr($physicalTable, strlen($prefix))
            : $physicalTable;

        return in_array($logical, self::EMPTY_ON_NEW_TENANT, true);
    }

    private function restoreCentralConnection(string $centralDatabase): void
    {
        Config::set('database.connections.mysql.database', $centralDatabase);
        DB::purge('mysql');
        DB::reconnect('mysql');
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
