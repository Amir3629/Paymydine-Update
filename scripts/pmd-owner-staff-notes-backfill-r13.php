#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * R13 one-time backfill for existing ACTIVE PayMyDine tenants.
 *
 * Read-only preview: php scripts/pmd-owner-staff-notes-backfill-r13.php
 * Schema only:       php scripts/pmd-owner-staff-notes-backfill-r13.php --apply
 *
 * New tenants are automatically initialized in SuperAdminTenantLifecycleService
 * or the legacy tenant creation finalizer. Do not schedule this script.
 */
if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}
$args = getopt('', ['apply', 'help']);
if (isset($args['help'])) {
    echo "Usage: php scripts/pmd-owner-staff-notes-backfill-r13.php [--apply]\n";
    exit(0);
}
$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\PmdOwnerStaffNotesTenantSchemaR13;
use Illuminate\Support\Facades\DB;

$central = DB::connection('mysql');
$centralName = (string)$central->getDatabaseName();
$tenants = $central->table('tenants')->where('status', 'active')
    ->orderBy('id')->get();
$seen = [];
$failures = 0;
$eligible = [];
foreach ($tenants as $tenant) {
    $database = trim((string)($tenant->database ?? ''));
    $domain = strtolower(trim((string)($tenant->domain ?? '')));
    if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/D', $domain)
        || !preg_match('/^[A-Za-z0-9_]{1,64}$/D', $database)
        || $database === $centralName
        || $database === 'newtenantdb'
        || isset($seen[strtolower($database)])) {
        echo "SKIP: unsafe/duplicate tenant mapping (ID ".(int)$tenant->id.").\n";
        continue;
    }
    $seen[strtolower($database)] = true;
    $eligible[] = $tenant;
}
echo "Active tenant databases eligible for R13: ".count($eligible)."\n";
if (!isset($args['apply'])) {
    foreach ($eligible as $tenant) {
        echo "PREVIEW: ".$tenant->domain." (".$tenant->database.")\n";
    }
    echo "DRY RUN: no database connection reconfigured, no schema changes.\n";
    exit(0);
}
$service = app(PmdOwnerStaffNotesTenantSchemaR13::class);
foreach ($eligible as $tenant) {
    try {
        $report = $service->ensureTenantRecord($tenant);
        $created = $report['created'] ?? [];
        echo "PASS: ".$tenant->domain.": ".($created ? implode(', ', $created) : 'already ready')."\n";
    } catch (\Throwable $error) {
        ++$failures;
        echo "FAIL: ".$tenant->domain.": ".$error->getMessage()."\n";
    }
}
echo "R13 BACKFILL: ".(count($eligible)-$failures)." passed; ".$failures." failed.\n";
exit($failures ? 1 : 0);
