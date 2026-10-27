<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_OWNER_STAFF_NOTES_TENANT_SCHEMA_R13
 *
 * Tenant creation/backfill ONLY. Never called from a regular HTTP owner or staff
 * request. Schema installation is idempotent and never copies note/receipt data.
 */
final class PmdOwnerStaffNotesTenantSchemaR13
{
    private const MIGRATION = 'app/system/database/migrations/2026_10_26_170000_create_pmd_owner_staff_hour_notes_r11.php';

    public function ensureCurrentTenant(string $expectedDatabase): array
    {
        $connectionName = DB::getDefaultConnection();
        if (!in_array($connectionName, ['mysql', 'tenant'], true)) {
            throw new \RuntimeException('Unexpected database connection for Staff Notes provisioning.');
        }
        $expectedDatabase = trim($expectedDatabase);
        $actualDatabase = (string)DB::connection($connectionName)->getDatabaseName();
        if ($expectedDatabase === '' || $actualDatabase !== $expectedDatabase
            || !preg_match('/^[A-Za-z0-9_]{1,64}$/D', $expectedDatabase)) {
            throw new \RuntimeException('Refusing Staff Notes schema installation: tenant database mismatch.');
        }
        if ($connectionName === 'tenant'
            && $actualDatabase === (string)DB::connection('mysql')->getDatabaseName()) {
            throw new \RuntimeException('Refusing to install Staff Notes into the central database.');
        }

        $schema = Schema::connection($connectionName);
        if (!$schema->hasTable('locations')) {
            throw new \RuntimeException('Tenant locations table is missing.');
        }
        $required = [
            'pmd_owner_staff_hour_notes' => [
                'id', 'location_id', 'note_date', 'slot_time',
                'message', 'target_roles', 'created_by_staff_id', 'deleted_at',
            ],
            'pmd_owner_staff_hour_note_receipts' => [
                'id', 'location_id', 'note_id', 'staff_id', 'role_code', 'confirmed_at',
            ],
        ];
        $missing = [];
        foreach (array_keys($required) as $table) {
            if (!$schema->hasTable($table)) $missing[] = $table;
        }
        if ($missing) {
            $path = base_path(self::MIGRATION);
            if (!is_file($path)) throw new \RuntimeException('Staff Notes migration file missing.');
            require_once $path;
            (new \System\Database\Migrations\CreatePmdOwnerStaffHourNotesR11())->up();
        }
        foreach ($required as $table => $columns) {
            if (!$schema->hasTable($table)) throw new \RuntimeException('Missing Staff Notes table: '.$table);
            foreach ($columns as $column) {
                if (!$schema->hasColumn($table, $column)) {
                    throw new \RuntimeException('Incomplete Staff Notes schema: '.$table.'.'.$column);
                }
            }
        }
        return ['ok' => true, 'database' => $actualDatabase, 'created' => $missing];
    }

    /**
     * For the legacy create endpoint or a one-time registry-authorized backfill.
     * The target is taken from the central tenant record, never browser input.
     */
    public function ensureTenantRecord($tenant): array
    {
        $database = trim((string)($tenant->database ?? ''));
        if (!preg_match('/^[A-Za-z0-9_]{1,64}$/D', $database)) {
            throw new \RuntimeException('Invalid tenant database in registry.');
        }
        $originalDefault = DB::getDefaultConnection();
        $central = (string)DB::connection('mysql')->getDatabaseName();
        if ($database === $central || $database === 'newtenantdb') {
            throw new \RuntimeException('Refusing to provision central or template database.');
        }
        $previousConfig = Config::get('database.connections.tenant');
        $runtime = (array)$previousConfig;
        $runtime['database'] = $database;
        foreach (['host'=>'db_host', 'port'=>'db_port', 'username'=>'db_user', 'password'=>'db_pass'] as $config => $field) {
            if (isset($tenant->{$field}) && $tenant->{$field} !== '') {
                $runtime[$config] = $tenant->{$field};
            }
        }

        try {
            Config::set('database.connections.tenant', $runtime);
            DB::purge('tenant');
            DB::reconnect('tenant');
            DB::setDefaultConnection('tenant');
            return $this->ensureCurrentTenant($database);
        } finally {
            DB::setDefaultConnection($originalDefault);
            Config::set('database.connections.tenant', $previousConfig);
            DB::purge('tenant');
        }
    }
}
