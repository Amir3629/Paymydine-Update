<?php
namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use System\Models\Themes_model;

/** Canonical tenant creation. Legacy callers retain create(array)'s behavior. */
class SuperAdminTenantLifecycleService
{
    private const TEMPLATE_DB = 'newtenantdb';
    private const DEFAULT_LOGO_PATH = '/brand/paymydine-logo.svg';
    private const EMPTY_ON_NEW_TENANT = [
        'orders', 'order_menus', 'order_menu_options', 'order_totals', 'order_notes',
        'payment_logs', 'order_payment_transactions', 'order_payment_transaction_items',
        'fiskaly_transactions', 'status_history', 'assignable_logs', 'pmd_table_order_drafts',
        'pmd_billing_groups', 'pmd_billing_group_orders', 'pmd_billing_group_payments',
        'pmd_admin_presence_sessions', 'pmd_site_access_devices', 'pmd_site_access_challenges',
        'pmd_site_access_events', 'pmd_site_access_recovery_codes', 'pmd_owner_mfa',
        'pmd_portal_mfa', 'pmd_portal_mfa_recovery_codes', 'pmd_staff_login_pins',
        'reservations', 'reservation_tables', 'pmd_reservation_preferences', 'tables',
        'table_notes', 'waiter_calls', 'valet_requests', 'menus', 'menu_categories',
        'menu_mealtimes', 'menus_specials', 'menu_images', 'media_attachments', 'menu_prices',
        'menu_item_options', 'menu_item_option_values', 'menu_options', 'menu_option_values',
        'categories', 'mealtimes', 'allergens', 'allergenables', 'stocks', 'stock_history',
        'igniter_coupons', 'coupons_history', 'gift_card_transactions', 'customers',
        'addresses', 'reviews', 'notifications',
    ];

    public function create(array $data): array
    {
        return $this->createInternal($data, null);
    }

    /**
     * Internal group-only entry point. The callback receives (phase, tenant ID,
     * central connection). Registered is called INSIDE the registry transaction.
     * This path never activates a tenant and never deletes a partial database.
     */
    /**
     * Fail before reserving a Business Account when the PayMyDine template is
     * structurally incapable of producing a managed Owner tenant.
     *
     * Multiplicity is allowed here: OwnerLinker normalizes historical extra
     * super-users/locations on the unpublished clone. We only require at least
     * one usable candidate, one location, and one usable role path.
     */
    public function assertGroupTemplateReady(): void
    {
        $db = DB::connection('mysql');
        $database = self::TEMPLATE_DB;
        $required = ['users', 'staffs', 'staff_roles', 'locations'];

        $rows = $db->select(
            'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?,?,?,?)',
            array_merge([$database], $required)
        );

        $present = array_map(
            static fn ($row) => strtolower((string)($row->TABLE_NAME ?? '')),
            $rows
        );

        foreach ($required as $table) {
            if (!in_array($table, $present, true)) {
                throw new \DomainException('Restaurant template is missing required table: '.$table.'.');
            }
        }

        $q = fn (string $table) => $this->quoteIdentifier($database).'.'.$this->quoteIdentifier($table);

        $candidate = $db->selectOne(
            'SELECT u.user_id, u.staff_id, s.staff_role_id, r.staff_role_id AS role_exists, r.code '
            .'FROM '.$q('users').' u '
            .'INNER JOIN '.$q('staffs').' s ON s.staff_id = u.staff_id '
            .'LEFT JOIN '.$q('staff_roles').' r ON r.staff_role_id = s.staff_role_id '
            .'WHERE u.super_user = 1 ORDER BY u.user_id ASC LIMIT 1'
        );

        if (!$candidate) {
            throw new \DomainException('Restaurant template has no usable Owner candidate.');
        }

        $fallbackOwnerRole = $db->selectOne(
            'SELECT staff_role_id FROM '.$q('staff_roles')
            .' WHERE LOWER(TRIM(COALESCE(code, \'\'))) = ? ORDER BY staff_role_id ASC LIMIT 1',
            ['pmd-owner']
        );

        if (empty($candidate->role_exists) && !$fallbackOwnerRole) {
            throw new \DomainException('Restaurant template has no usable Owner role.');
        }

        $location = $db->selectOne(
            'SELECT location_id FROM '.$q('locations')
            .' ORDER BY (location_status = 1) DESC, location_id ASC LIMIT 1'
        );

        if (!$location) {
            throw new \DomainException('Restaurant template has no usable restaurant location.');
        }
    }

    public function createDeferred(array $data, callable $checkpoint): array
    {
        if (DB::getDefaultConnection() !== 'mysql') {
            throw new \DomainException('Group provisioning must start in the central database context.');
        }
        return $this->createInternal($data, $checkpoint);
    }

    private function createInternal(array $data, ?callable $checkpoint): array
    {
        $database = $this->normalizeDatabaseName($data['database'] ?? '');
        $domain = strtolower(trim((string)($data['domain'] ?? '')));
        $centralDatabase = (string)Config::get('database.connections.mysql.database');
        $createdDatabase = false;
        $insertedTenant = false;
        $tenantId = 0;
        if (!$this->isValidDatabaseName($database)) {
            return ['ok' => false, 'stage' => 'validation', 'message' => 'Database name may contain only letters, numbers and underscores.'];
        }
        if (!$this->isValidTenantDomain($domain)) {
            return ['ok' => false, 'stage' => 'validation', 'message' => 'Domain must be a tenant subdomain of paymydine.com.'];
        }

        if ($checkpoint === null) {
            $ownerUsername = strtolower(trim((string)($data['owner_username'] ?? '')));
            $ownerPassword = (string)($data['owner_password'] ?? '');

            if (!preg_match('/^[a-z0-9._@-]{3,100}$/D', $ownerUsername)) {
                return ['ok' => false, 'stage' => 'validation', 'message' => 'Choose a valid Owner username using letters, numbers, dot, dash, underscore or @.'];
            }

            if (strlen($ownerPassword) < 14 || strlen($ownerPassword) > 128) {
                return ['ok' => false, 'stage' => 'validation', 'message' => 'Owner password must contain 14 to 128 characters.'];
            }

            $data['owner_username'] = $ownerUsername;
        }

        if ($this->schemaExists($database)) {
            return ['ok' => false, 'stage' => 'validation', 'message' => 'Database already exists.'];
        }
        if (!$this->schemaExists(self::TEMPLATE_DB)) {
            return ['ok' => false, 'stage' => 'template', 'message' => 'Template database newtenantdb is not available.'];
        }
        $domainLabel = explode('.', $domain)[0] ?? '';
        $displayName = $domainLabel !== '' ? $domainLabel : 'PayMyDine';
        $data['name'] = $displayName;
        $data['domain'] = $domain;
        $data['database'] = $database;
        try {
            $central = DB::connection('mysql');
            $tenantId = (int)$central->transaction(function () use ($central, $data, $database, $domain, $displayName, $checkpoint) {
                if ($central->table('tenants')->where('domain', $domain)->exists()
                    || $central->table('tenants')->where('database', $database)->exists()) {
                    throw new \DomainException('Tenant domain or database is already registered.');
                }
                $id = (int)$central->table('tenants')->insertGetId([
                    'name' => $displayName, 'domain' => $domain, 'database' => $database,
                    'email' => $data['email'], 'phone' => $data['phone'], 'start' => $data['start'],
                    'end' => $data['end'], 'type' => $data['type'], 'country' => $data['country'],
                    'description' => $data['description'] ?? null, 'status' => 'disabled',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                if ($checkpoint) $checkpoint('registered', $id, $central);
                return $id;
            });
            $insertedTenant = true;
            DB::connection('mysql')->statement('CREATE DATABASE '.$this->quoteIdentifier($database).' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            $createdDatabase = true;
            $this->cloneTemplateDatabase(self::TEMPLATE_DB, $database, $checkpoint !== null);
            $this->finalizeTenantDatabase($database, $centralDatabase, $data, $checkpoint !== null);
            $this->restoreCentralConnection($centralDatabase);
            if ($checkpoint) {
                $checkpoint('prepared', $tenantId, DB::connection('mysql'));
                return [
                    'ok' => true, 'stage' => 'prepared', 'tenant_id' => $tenantId,
                    'database' => $database, 'domain' => $domain,
                    'message' => 'Tenant database prepared. Owner linking and explicit activation are still required.',
                ];
            }
            $provision = app(SuperAdminTenantDomainProvisioner::class)->provision($domain);
            $this->restoreCentralConnection($centralDatabase);
            DB::connection('mysql')->table('tenants')->where('id', $tenantId)->update([
                'name' => $displayName, 'status' => $provision['ok'] ? 'active' : 'disabled', 'updated_at' => now(),
            ]);
            return [
                'ok' => (bool)$provision['ok'], 'stage' => $provision['ok'] ? 'ready' : 'domain',
                'message' => $provision['ok']
                    ? 'Restaurant created with a clean tenant database, canonical PayMyDine identity and successful provisioning.'
                    : 'Restaurant database is clean and ready, but the tenant remains disabled until domain/TLS provisioning succeeds: '.$provision['message'],
                'tenant_id' => $tenantId, 'database' => $database, 'domain' => $domain, 'provisioning' => $provision,
            ];
        } catch (\Throwable $error) {
            Log::error('pmd_superadmin_r2_tenant_create_failed', ['database' => $database, 'domain' => $domain, 'error' => $error->getMessage()]);
            $this->restoreCentralConnection($centralDatabase);
            if ($checkpoint) {
                // Preserve our checkpoint and disabled registry row. A failure
                // after a DDL step must never turn into an automatic DROP/reclone.
                return ['ok' => false, 'stage' => 'database', 'tenant_id' => $tenantId,
                    'message' => 'Database preparation stopped. Any reserved tenant remains disabled for review.'];
            }
            if ($createdDatabase) {
                try { DB::connection('mysql')->statement('DROP DATABASE IF EXISTS '.$this->quoteIdentifier($database)); }
                catch (\Throwable $rollbackError) {
                    Log::error('pmd_superadmin_r2_database_rollback_failed', ['database' => $database, 'error' => $rollbackError->getMessage()]);
                }
            }
            $this->restoreCentralConnection($centralDatabase);
            if ($insertedTenant) {
                try { DB::connection('mysql')->table('tenants')->where('id', $tenantId)->delete(); }
                catch (\Throwable $rollbackError) {
                    Log::error('pmd_superadmin_r2_tenant_row_rollback_failed', ['database' => $database, 'error' => $rollbackError->getMessage()]);
                }
            }
            return ['ok' => false, 'stage' => 'database', 'message' => 'Tenant creation failed before completion. Partial database/registry state was rolled back where possible.'];
        } finally {
            $this->restoreCentralConnection($centralDatabase);
        }
    }

    protected function cloneTemplateDatabase(string $source, string $target, bool $group = false): void
    {
        $tables = DB::connection('mysql')->select('SHOW TABLES FROM '.$this->quoteIdentifier($source));
        foreach ($tables as $table) {
            $tableName = array_values((array)$table)[0] ?? null;
            if (!$tableName) continue;
            $create = DB::connection('mysql')->select('SHOW CREATE TABLE '.$this->quoteIdentifier($source).'.'.$this->quoteIdentifier($tableName));
            if (!$create) throw new \RuntimeException('Unable to read table definition for '.$tableName);
            $createSql = $create[0]->{'Create Table'};
            DB::connection('mysql')->statement('USE '.$this->quoteIdentifier($target));
            DB::connection('mysql')->statement($createSql);
            if ($this->mustStartEmpty($tableName, $group)) continue;
            $rowCount = (int)(DB::connection('mysql')->selectOne(
                'SELECT COUNT(*) AS aggregate FROM '.$this->quoteIdentifier($source).'.'.$this->quoteIdentifier($tableName)
            )->aggregate ?? 0);
            if ($rowCount > 0) {
                DB::connection('mysql')->statement('INSERT INTO '.$this->quoteIdentifier($target).'.'.$this->quoteIdentifier($tableName).
                    ' SELECT * FROM '.$this->quoteIdentifier($source).'.'.$this->quoteIdentifier($tableName));
            }
        }
    }

    protected function finalizeTenantDatabase(string $database, string $centralDatabase, array $data, bool $group = false): void
    {
        try {
            Config::set('database.connections.mysql.database', $database);
            DB::purge('mysql');
            DB::reconnect('mysql');
            $this->ensureWorkplaceSecuritySchema();
            $this->ensureMobileSyncSchema();
            $this->sanitizeTenantBusinessData($group);

            if (!$group) {
                $this->applyIndependentOwnerAccess($data);
            }

            // Do not create a default Cashier or floor table.
            try {
                Themes_model::syncAll();
                Themes_model::activateTheme('frontend-theme');
            } catch (\Throwable $themeError) {
                Log::warning('pmd_superadmin_r2_theme_finalize_warning', ['database' => $database, 'error' => $themeError->getMessage()]);
            }
            $this->applyTenantIdentity($data);
        } finally {
            $this->restoreCentralConnection($centralDatabase);
        }
    }

    private function ensureWorkplaceSecuritySchema(): void
    {
        $migrations = [
            '2026_08_30_103000_create_pmd_site_access_tables.php' => 'CreatePmdSiteAccessTables',
            '2026_08_31_010000_add_user_id_to_pmd_site_access_devices.php' => 'AddUserIdToPmdSiteAccessDevices',
            '2026_08_30_123000_create_pmd_owner_mfa_table.php' => 'CreatePmdOwnerMfaTable',
            '2026_09_01_000000_create_pmd_portal_mfa_table.php' => 'CreatePmdPortalMfaTable',
            '2026_09_23_000000_create_pmd_staff_login_pins_table.php' => 'CreatePmdStaffLoginPinsTable',
        ];
        foreach ($migrations as $file => $class) {
            $path = base_path('app/system/database/migrations/'.$file);
            if (!is_file($path)) throw new \RuntimeException('Workplace security migration file is missing: '.$file);
            require_once $path;
            $class = '\\System\\Database\\Migrations\\'.$class;
            (new $class())->up();
        }
        foreach (['pmd_site_access_devices', 'pmd_site_access_challenges', 'pmd_site_access_events',
            'pmd_site_access_recovery_codes', 'pmd_owner_mfa', 'pmd_portal_mfa', 'pmd_portal_mfa_recovery_codes', 'pmd_staff_login_pins'] as $table) {
            if (!Schema::connection('mysql')->hasTable($table)) throw new \RuntimeException('New tenant security schema missing table: '.$table);
        }
        if (!Schema::connection('mysql')->hasColumn('pmd_site_access_devices', 'user_id')) {
            throw new \RuntimeException('New tenant trusted-login schema missing user_id.');
        }
    }

    private function ensureMobileSyncSchema(): void
    {
        $migration = base_path('app/system/database/migrations/2026_09_20_190000_create_pmd_mobile_sync_tables.php');
        if (!is_file($migration)) throw new \RuntimeException('PayMyDine mobile sync migration file is missing.');
        require_once $migration;
        (new \System\Database\Migrations\CreatePmdMobileSyncTables())->up();
        foreach (['pmd_sync_commands', 'pmd_sync_events', 'pmd_sync_aggregate_versions', 'pmd_mobile_edges', 'pmd_mobile_pair_exchanges'] as $table) {
            if (!Schema::connection('mysql')->hasTable($table)) throw new \RuntimeException('New tenant mobile sync schema missing table: '.$table);
        }
    }

    private function sanitizeTenantBusinessData(bool $group = false): void
    {
        DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            foreach (self::EMPTY_ON_NEW_TENANT as $table) {
                if (!Schema::connection('mysql')->hasTable($table)) continue;
                DB::connection('mysql')->table($table)->truncate();
            }
            if ($group) {
                foreach (DB::connection('mysql')->select('SHOW TABLES') as $row) {
                    $physical = (string)array_values((array)$row)[0];
                    if ($this->mustStartEmpty($physical, true)) {
                        DB::connection('mysql')->statement('TRUNCATE TABLE '.$this->quoteIdentifier($physical));
                    }
                }
            }
            if (Schema::connection('mysql')->hasTable('locationables')) {
                DB::connection('mysql')->table('locationables')->whereIn('locationable_type', [
                    'tables', 'menus', 'categories', 'coupons', 'igniter_coupons', 'menu_options', 'allergens',
                    'Admin\\Models\\Tables_model', 'Admin\\Models\\Menus_model', 'Admin\\Models\\Categories_model',
                    'Admin\\Models\\Coupons_model', 'Admin\\Models\\Menu_options_model',
                ])->delete();
            }
        } finally {
            DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    /**
     * Replace every credential inherited from newtenantdb before a standalone
     * restaurant can be activated. The selected super-user remains the only
     * Owner login; all other inherited users are made non-super and receive
     * random passwords.
     */
    private function applyIndependentOwnerAccess(array $data): void
    {
        $db = DB::connection('mysql');
        $schema = Schema::connection('mysql');

        foreach (['users', 'staffs'] as $table) {
            if (!$schema->hasTable($table)) {
                throw new \RuntimeException('Owner login could not be prepared because '.$table.' is missing.');
            }
        }

        $username = strtolower(trim((string)($data['owner_username'] ?? '')));
        $password = (string)($data['owner_password'] ?? '');

        if (!preg_match('/^[a-z0-9._@-]{3,100}$/D', $username) || strlen($password) < 14 || strlen($password) > 128) {
            throw new \DomainException('Owner credentials are invalid.');
        }

        $users = $db->table('users')->orderBy('user_id')->lockForUpdate()->get();
        $selected = null;

        foreach ($users as $candidate) {
            if ((int)($candidate->super_user ?? 0) !== 1) continue;
            if (!$db->table('staffs')->where('staff_id', (int)$candidate->staff_id)->exists()) continue;
            $selected = $candidate;
            break;
        }

        if (!$selected) {
            throw new \RuntimeException('The tenant template has no usable Owner account.');
        }

        $ownerUserId = (int)$selected->user_id;
        $ownerStaffId = (int)$selected->staff_id;

        foreach ($users as $inherited) {
            $changes = ['password' => Hash::make(Str::random(64))];

            foreach (['reset_code', 'reset_password_code', 'remember_token', 'persist_code', 'activation_code'] as $column) {
                if ($schema->hasColumn('users', $column)) {
                    $changes[$column] = '';
                }
            }

            if ($schema->hasColumn('users', 'super_user')) {
                $changes['super_user'] = 0;
            }

            $db->table('users')->where('user_id', (int)$inherited->user_id)->update($changes);
        }

        foreach ($db->table('users')->whereRaw('LOWER(username) = ?', [$username])->get() as $conflict) {
            if ((int)$conflict->user_id === $ownerUserId) continue;

            $db->table('users')->where('user_id', (int)$conflict->user_id)->update([
                'username' => 'pmd-disabled-'.(int)$conflict->user_id.'-'.substr(hash('sha256', $username.'|'.(int)$conflict->user_id), 0, 8),
                'super_user' => 0,
            ]);
        }

        $ownerUpdate = [
            'username' => $username,
            'password' => Hash::make($password),
            'super_user' => 1,
        ];

        if ($schema->hasColumn('users', 'is_activated')) {
            $ownerUpdate['is_activated'] = 1;
        }

        if ($schema->hasColumn('users', 'date_activated')) {
            $ownerUpdate['date_activated'] = now()->toDateString();
        }

        $db->table('users')->where('user_id', $ownerUserId)->update($ownerUpdate);

        if ($schema->hasColumn('staffs', 'staff_status')) {
            $db->table('staffs')->update(['staff_status' => 0]);
            $db->table('staffs')->where('staff_id', $ownerStaffId)->update(['staff_status' => 1]);
        }

        $staffUpdate = [];
        if ($schema->hasColumn('staffs', 'staff_email') && !empty($data['email'])) {
            $staffUpdate['staff_email'] = (string)$data['email'];
        }
        if ($schema->hasColumn('staffs', 'staff_name')) {
            $staffUpdate['staff_name'] = trim((string)($data['name'] ?? '')) ?: $username;
        }

        if ($staffUpdate) {
            $db->table('staffs')->where('staff_id', $ownerStaffId)->update($staffUpdate);
        }

        $saved = $db->table('users')->where('user_id', $ownerUserId)->first();

        if (
            !$saved
            || strtolower((string)$saved->username) !== $username
            || (int)($saved->super_user ?? 0) !== 1
            || !Hash::check($password, (string)$saved->password)
        ) {
            throw new \RuntimeException('Owner credential verification failed.');
        }

        if ($db->table('users')->where('user_id', '!=', $ownerUserId)->where('super_user', 1)->exists()) {
            throw new \RuntimeException('An inherited super-user remained enabled.');
        }
    }

    private function applyTenantIdentity(array $data): void
    {
        $domain = strtolower(trim((string)($data['domain'] ?? '')));
        $domainLabel = $domain !== '' ? (explode('.', $domain)[0] ?? '') : '';
        $displayName = $domainLabel !== '' ? $domainLabel : 'PayMyDine';
        $logoUrl = $domain !== '' ? 'https://'.$domain.self::DEFAULT_LOGO_PATH : self::DEFAULT_LOGO_PATH;
        try {
            setting()->set(['site_name' => $displayName, 'site_logo' => $logoUrl]);
            setting()->save();
        } catch (\Throwable $error) {
            Log::warning('pmd_superadmin_r2_identity_setting_manager_warning', ['domain' => $domain, 'error' => $error->getMessage()]);
        }
        if (Schema::connection('mysql')->hasTable('settings')) {
            foreach (['site_name' => $displayName, 'site_logo' => $logoUrl] as $item => $value) {
                DB::connection('mysql')->table('settings')->updateOrInsert(['item' => $item], ['value' => $value]);
            }
        }
        if (Schema::connection('mysql')->hasTable('locations') && Schema::connection('mysql')->hasColumn('locations', 'location_name')) {
            $location = DB::connection('mysql')->table('locations')->orderBy('location_id')->first();
            if ($location) {
                $update = ['location_name' => $displayName];
                if (Schema::connection('mysql')->hasColumn('locations', 'permalink_slug')) $update['permalink_slug'] = Str::slug($domainLabel ?: $displayName);
                DB::connection('mysql')->table('locations')->where('location_id', $location->location_id)->update($update);
            }
        }
        $siteName = (string)(DB::connection('mysql')->table('settings')->where('item', 'site_name')->value('value') ?? '');
        $siteLogo = (string)(DB::connection('mysql')->table('settings')->where('item', 'site_logo')->value('value') ?? '');
        if ($siteName !== $displayName || $siteLogo !== $logoUrl) throw new \RuntimeException('Canonical tenant identity verification failed.');
    }

    protected function mustStartEmpty(string $physicalTable, bool $group = false): bool
    {
        $prefix = (string)Config::get('database.connections.mysql.prefix', '');
        $logical = ($prefix !== '' && str_starts_with($physicalTable, $prefix)) ? substr($physicalTable, strlen($prefix)) : $physicalTable;
        if (in_array($logical, self::EMPTY_ON_NEW_TENANT, true)) return true;
        if (!$group) return false;
        if (in_array($logical, ['sessions', 'jobs', 'failed_jobs', 'password_resets'], true)) return true;
        foreach (['pmd_group_', 'pmd_mobile_', 'pmd_sync_', 'pmd_device_'] as $securityPrefix) {
            if (str_starts_with($logical, $securityPrefix)) return true;
        }
        return false;
    }

    protected function restoreCentralConnection(string $database): void
    {
        Config::set('database.connections.mysql.database', $database);
        DB::purge('mysql');
        DB::reconnect('mysql');
    }

    protected function schemaExists(string $schema): bool
    {
        return (bool)DB::connection('mysql')->selectOne('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', [$schema]);
    }

    private function normalizeDatabaseName(string $database): string { return trim(str_replace([' ', '-'], '_', $database)); }
    private function isValidDatabaseName(string $database): bool { return (bool)preg_match('/^[A-Za-z0-9_]{1,64}$/D', $database); }
    private function isValidTenantDomain(string $domain): bool
    {
        return (bool)preg_match('/^[a-z0-9-]+\.paymydine\.com$/D', $domain) && !in_array($domain, ['www.paymydine.com'], true);
    }
    private function quoteIdentifier(string $identifier): string { return '`'.str_replace('`', '``', $identifier).'`'; }
}
