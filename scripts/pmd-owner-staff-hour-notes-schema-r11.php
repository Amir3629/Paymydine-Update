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
$central = (string)Config::get('database.connections.mysql.database');
$migration = $root.'/app/system/database/migrations/2026_10_26_170000_create_pmd_owner_staff_hour_notes_r11.php';

try {
    if (!is_file($migration)) throw new \RuntimeException('R11 schema file is missing.');
    $tenant = DB::connection('mysql')->table('tenants')
        ->whereRaw('LOWER(domain) = ?', [$domain])->first();
    if (!$tenant) throw new \RuntimeException('No tenant is registered for '.$domain);
    $database = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
    if (!preg_match('/^[A-Za-z0-9_]{1,64}$/', $database)) {
        throw new \RuntimeException('Tenant database identifier is invalid.');
    }
    if ($database === $central) {
        throw new \RuntimeException('Refusing to modify the central database.');
    }

    Config::set('database.connections.mysql.database', $database);
    DB::purge('mysql');
    DB::setDefaultConnection('mysql');
    DB::reconnect('mysql');

    $names = ['pmd_owner_staff_hour_notes', 'pmd_owner_staff_hour_note_receipts'];
    $missing = array_values(array_filter($names, fn ($name) => !Schema::connection('mysql')->hasTable($name)));
    echo "Restaurant: ".$domain."\n";
    echo "Missing R11 tables: ".($missing ? implode(', ', $missing) : 'none')."\n";
    if ($missing && !isset($args['apply'])) {
        echo "DRY RUN: no tables created. Run again with --apply for this one tenant.\n";
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
        if (!Schema::connection('mysql')->hasTable($table)) {
            throw new \RuntimeException('Required table missing after migration: '.$table);
        }
        foreach ($columns as $column) {
            if (!Schema::connection('mysql')->hasColumn($table, $column)) {
                throw new \RuntimeException('Schema missing: '.$table.'.'.$column);
            }
        }
    }
    echo "PASS: Staff Hour Notes schema ready for ".$domain."\n";
} catch (\Throwable $error) {
    fwrite(STDERR, "ERROR: ".$error->getMessage()."\n");
    exit(1);
} finally {
    Config::set('database.connections.mysql.database', $central);
    DB::purge('mysql');
    DB::setDefaultConnection($originalDefault);
    DB::reconnect('mysql');
}
