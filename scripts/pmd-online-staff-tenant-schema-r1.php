#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * PMD_ADMIN_PRESENCE_TENANT_SCHEMA_R1
 *
 * Read-only by default; --apply runs ONLY the existing admin presence
 * migration in the explicitly named tenant database. No tenant-wide migrate,
 * no alteration to staff, orders, attendance or central tenant records.
 *
 * php scripts/pmd-online-staff-tenant-schema-r1.php --tenant=tomo
 * php scripts/pmd-online-staff-tenant-schema-r1.php --tenant=tomo --apply
 */
if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

$options = getopt('', ['tenant:', 'apply', 'help']);
if (isset($options['help']) || empty($options['tenant'])) {
    echo "Usage: php scripts/pmd-online-staff-tenant-schema-r1.php --tenant=tomo [--apply]\n";
    exit(isset($options['help']) ? 0 : 2);
}
$domain = strtolower(trim((string)$options['tenant']));
if (!str_contains($domain, '.')) $domain .= '.paymydine.com';
if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)) {
    fwrite(STDERR, "Invalid tenant domain.\n");
    exit(3);
}

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$central = (string)Config::get('database.connections.mysql.database');
$originalDefault = DB::getDefaultConnection();
$migration = 'app/admin/database/migrations/2026_08_14_210000_create_pmd_admin_presence_sessions_table.php';

try {
    $tenant = DB::connection('mysql')->table('tenants')
        ->whereRaw('LOWER(domain) = ?', [$domain])->first();
    if (!$tenant) throw new \RuntimeException('Tenant not found.');

    $database = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
    if (!preg_match('/^[A-Za-z0-9_]{1,64}$/', $database)) {
        throw new \RuntimeException('Tenant database identifier invalid.');
    }
    if ($database === $central) {
        throw new \RuntimeException('Refusing to change central database.');
    }
    if (!is_file($root.'/'.$migration)) {
        throw new \RuntimeException('Presence migration file missing.');
    }

    Config::set('database.connections.mysql.database', $database);
    DB::purge('mysql');
    DB::setDefaultConnection('mysql');
    DB::reconnect('mysql');

    $exists = Schema::connection('mysql')
        ->hasTable('pmd_admin_presence_sessions');
    echo "Tenant: ".$domain."\n";
    echo "Presence table: ".($exists ? 'READY' : 'MISSING')."\n";

    if (!$exists && !isset($options['apply'])) {
        echo "DRY RUN: no changes. Re-run with --apply to run ONLY the presence migration.\n";
        exit(0);
    }

    if (!$exists) {
        echo "Applying the single presence table migration...\n";
        $code = Artisan::call('migrate', [
            '--database' => 'mysql',
            '--path' => $migration,
            '--force' => true,
            '--no-interaction' => true,
        ]);
        if ($code !== 0) {
            throw new \RuntimeException('Migration command failed (exit '.$code.').');
        }
    }

    if (!Schema::connection('mysql')->hasTable('pmd_admin_presence_sessions')) {
        throw new \RuntimeException('Presence table still missing after migration.');
    }

    echo "PASS: presence table is ready for ".$domain."\n";
    echo "Existing signed-in staff will register on their next authenticated request.\n";
} catch (\Throwable $error) {
    fwrite(STDERR, "ERROR: ".$error->getMessage()."\n");
    exit(1);
} finally {
    Config::set('database.connections.mysql.database', $central);
    DB::purge('mysql');
    DB::setDefaultConnection($originalDefault);
    DB::reconnect('mysql');
}
