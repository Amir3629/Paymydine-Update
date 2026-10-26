#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * PMD_OWNER_STAFF_HOUR_NOTES_TENANT_SCHEMA_CLI_R11
 *
 * Safe tenant-scoped installer. No global DB migration command is used:
 * this TastyIgniter build does not expose normal Laravel artisan migrate.
 *
 * Dry-run: php scripts/pmd-owner-staff-hour-notes-schema-r11.php --tenant=tomo
 * Apply:   php scripts/pmd-owner-staff-hour-notes-schema-r11.php --tenant=tomo --apply
 */
if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}
$args = getopt('', ['tenant:', 'apply', 'help']);
if (isset($args['help']) || empty($args['tenant'])) {
    echo "Usage: php scripts/pmd-owner-staff-hour-notes-schema-r11.php --tenant=RESTAURANT [--apply]\n";
    exit(isset($args['help']) ? 0 : 2);
}
$domain = strtolower(trim((string)$args['tenant']));
if (!str_contains($domain, '.')) $domain .= '.paymydine.com';
if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)) {
    fwrite(STDERR, "STOP: tenant domain invalid.\n");
    exit(2);
}
$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$originalDefault = DB::getDefaultConnection();
$originalTenant = Config::get('database.connections.tenant');
$central = (string)DB::connection('mysql')->getDatabaseName();
$migration = $root.'/app/system/database/migrations/2026_10_26_170000_create_pmd_owner_staff_hour_notes_r11.php';

try {
    if (!is_file($migration)) throw new \RuntimeException('R11 schema file is missing.');
    // Exact active tenant lookup, as in pmd-staff-tenant-location-audit-v1.
    // Never reconfigure the central mysql connection or guess a database.
    $tenant = DB::connection('mysql')->table('tenants')
        ->where('domain', $domain)
        ->where('status', 'active')
        ->first();
    if (!$tenant) throw new \RuntimeException('No ACTIVE tenant is registered for '.$domain);
    $database = trim((string)($tenant->database ?? ''));
    if (!preg_match('/^[A-Za-z0-9_]{1,64}$/D', $database)) {
        throw new \RuntimeException('Tenant database identifier is invalid.');
    }
    if ($database === $central) {
        throw new \RuntimeException('Refusing to modify the central database.');
    }

    // Match the canonical HTTP tenant middleware host/port/user/password.
    Config::set('database.connections.tenant.database', $database);
    Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
    Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
    Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
    Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
    DB::purge('tenant');
    DB::reconnect('tenant');
    DB::setDefaultConnection('tenant');

    if ((string)DB::connection('tenant')->getDatabaseName() !== $database) {
        throw new \RuntimeException('Connected tenant DB does not match the registry.');
    }
    if (!Schema::connection('tenant')->hasTable('locations')) {
        throw new \RuntimeException('Target tenant has no locations table.');
    }

    $names = ['pmd_owner_staff_hour_notes', 'pmd_owner_staff_hour_note_receipts'];
    $missing = array_values(array_filter($names, fn ($name) => !Schema::connection('tenant')->hasTable($name)));
    echo "Restaurant: ".$domain."\n";
    echo "Tenant database: ".$database."\n";
    echo "Missing R11 tables: ".($missing ? implode(', ', $missing) : 'none')."\n";

    // Strictly read-only dry-run: no migrations and no writes.
    if (!isset($args['apply'])) {
        echo "DRY RUN: no tables created. Use --apply to install for THIS tenant only.\n";
        exit(0);
    }

    if ($missing) {
        require_once $migration;
        $instance = new \System\Database\Migrations\CreatePmdOwnerStaffHourNotesR11();
        $instance->up();
    }

    foreach ([
        'pmd_owner_staff_hour_notes' => ['id','location_id','note_date','slot_time','message','target_roles','deleted_at'],
        'pmd_owner_staff_hour_note_receipts' => ['id','location_id','note_id','staff_id','role_code','confirmed_at'],
    ] as $table => $columns) {
        if (!Schema::connection('tenant')->hasTable($table)) {
            throw new \RuntimeException('Required table missing after migration: '.$table);
        }
        foreach ($columns as $column) {
            if (!Schema::connection('tenant')->hasColumn($table, $column)) {
                throw new \RuntimeException('Schema missing: '.$table.'.'.$column);
            }
        }
    }
    echo "PASS: Staff Hour Notes schema ready for ".$domain."\n";
} catch (\Throwable $error) {
    fwrite(STDERR, "ERROR: ".$error->getMessage()."\n");
    exit(1);
} finally {
    // Restore original CLI app state. The central registry remains untouched.
    Config::set('database.connections.tenant', $originalTenant);
    DB::purge('tenant');
    DB::setDefaultConnection($originalDefault);
}
