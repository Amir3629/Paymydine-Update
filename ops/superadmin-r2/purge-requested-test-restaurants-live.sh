#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-requested-test-restaurant-purge-$TS"
TMP="$(mktemp -d)"
TARGETS_TSV="$TMP/targets.tsv"
MYSQL_CNF="$TMP/mysql.cnf"
META_TSV="$TMP/meta.tsv"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

cd "$ROOT"

echo "============================================================"
echo " PMD - PERMANENTLY PURGE REQUESTED TEST RESTAURANTS"
echo "============================================================"
echo
echo "Targets:"
echo "  #36 asd.paymydine.com"
echo "  #35 kult.paymydine.com"
echo "  #34 test.paymydine.com"
echo "  #29 persian.paymydine.com"
echo "  #27 paymenttest.paymydine.com"
echo "  #26 testamir.paymydine.com"
echo

echo "1) Checking tools and sudo..."
sudo -n true
command -v php >/dev/null
command -v mysqldump >/dev/null
echo "PASS"

echo
echo "2) Latest create failure evidence - READ ONLY..."
LOG="$ROOT/storage/logs/system.log"
if [ -f "$LOG" ]; then
  grep -E "pmd_superadmin_r2_store_http_failed|pmd_superadmin_r2_tenant_create_failed" "$LOG" | tail -n 12 || true
else
  echo "No system.log found."
fi

echo
echo "3) Verifying exact registry rows and preparing backup metadata - READ ONLY..."
PMD_TARGETS_TSV="$TARGETS_TSV" PMD_MYSQL_CNF="$MYSQL_CNF" PMD_META_TSV="$META_TSV" php <<'PHP'
<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$targets = [
    36 => 'asd.paymydine.com',
    35 => 'kult.paymydine.com',
    34 => 'test.paymydine.com',
    29 => 'persian.paymydine.com',
    27 => 'paymenttest.paymydine.com',
    26 => 'testamir.paymydine.com',
];

$connection = Config::get('database.connections.mysql');
$centralDb = (string)($connection['database'] ?? '');
$prefix = (string)($connection['prefix'] ?? '');
$physicalTenantTable = $prefix.'tenants';

if ($centralDb === '') {
    fwrite(STDERR, "FAIL: central DB name is empty.\n");
    exit(20);
}

$cnf = "[client]\n";
foreach (['host','port','username','password'] as $key) {
    $value = (string)($connection[$key] ?? '');
    $value = str_replace(["\\", "\""], ["\\\\", "\\\""], $value);
    $cnf .= ($key === 'username' ? 'user' : $key).'="'.$value.'"'."\n";
}
file_put_contents(getenv('PMD_MYSQL_CNF'), $cnf);
chmod(getenv('PMD_MYSQL_CNF'), 0600);
file_put_contents(getenv('PMD_META_TSV'), $centralDb."\t".$physicalTenantTable."\n");

$lines = [];
foreach ($targets as $id => $expectedDomain) {
    $row = DB::connection('mysql')->table('tenants')->where('id', $id)->first();
    if (!$row) {
        echo "ALREADY MISSING #{$id} {$expectedDomain}\n";
        continue;
    }

    $actualDomain = strtolower(trim((string)$row->domain));
    $status = strtolower(trim((string)$row->status));
    $database = trim((string)$row->database);

    if ($actualDomain !== $expectedDomain) {
        fwrite(STDERR, "FAIL: #{$id} domain mismatch. Expected {$expectedDomain}; found {$actualDomain}.\n");
        exit(21);
    }
    if ($status === 'active') {
        fwrite(STDERR, "FAIL: #{$id} {$actualDomain} is ACTIVE. Nothing will be deleted.\n");
        exit(22);
    }
    if (!in_array($status, ['disabled','removed'], true)) {
        fwrite(STDERR, "FAIL: #{$id} {$actualDomain} has unexpected status {$status}.\n");
        exit(23);
    }
    if ($database === '' || in_array(strtolower($database), [strtolower($centralDb),'newtenantdb','mysql','information_schema','performance_schema','sys'], true)) {
        fwrite(STDERR, "FAIL: unsafe database value for #{$id}.\n");
        exit(24);
    }

    $schema = DB::connection('mysql')->selectOne(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [$database]
    );

    echo sprintf(
        "READY #%d %-28s status=%-8s db=%s exists=%s\n",
        $id,
        $actualDomain,
        $status,
        $database,
        $schema ? 'yes' : 'no'
    );
    $lines[] = $id."\t".$actualDomain."\t".$database."\t".$status."\n";
}

file_put_contents(getenv('PMD_TARGETS_TSV'), implode('', $lines));
PHP

echo
echo "4) Creating recovery backups BEFORE deletion..."
sudo -n mkdir -p "$BACKUP/databases"
sudo -n chown -R "$(id -u):$(id -g)" "$BACKUP"
IFS=$'\t' read -r CENTRAL_DB TENANTS_TABLE < "$META_TSV"
MYSQL_PWD='' mysqldump --defaults-extra-file="$MYSQL_CNF" --single-transaction --skip-lock-tables --no-create-info "$CENTRAL_DB" "$TENANTS_TABLE" --where="id IN (36,35,34,29,27,26)" > "$BACKUP/central-restaurant-rows.sql"
cp "$TARGETS_TSV" "$BACKUP/targets.tsv"

while IFS=$'\t' read -r id domain database status; do
  [ -n "${id:-}" ] || continue
  safe="$(printf '%s' "$domain" | tr -c 'A-Za-z0-9._-' '_')"
  echo "BACKUP DB #$id $database"
  mysqldump --defaults-extra-file="$MYSQL_CNF" --single-transaction --skip-lock-tables --routines --triggers --events --databases "$database" > "$BACKUP/databases/${id}-${safe}.sql"
done < "$TARGETS_TSV"

echo "Backup: $BACKUP"

echo
echo "5) PERMANENT deletion: dropping only verified test DBs and deleting their central rows..."
php <<'PHP'
<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$targets = [
    36 => 'asd.paymydine.com',
    35 => 'kult.paymydine.com',
    34 => 'test.paymydine.com',
    29 => 'persian.paymydine.com',
    27 => 'paymenttest.paymydine.com',
    26 => 'testamir.paymydine.com',
];
$centralDb = (string)Config::get('database.connections.mysql.database');

$verified = [];
foreach ($targets as $id => $expectedDomain) {
    $row = DB::connection('mysql')->table('tenants')->where('id', $id)->first();
    if (!$row) continue;

    $domain = strtolower(trim((string)$row->domain));
    $status = strtolower(trim((string)$row->status));
    $database = trim((string)$row->database);

    if ($domain !== $expectedDomain || !in_array($status, ['disabled','removed'], true)) {
        throw new RuntimeException("Safety re-check failed for restaurant #{$id}.");
    }
    if ($database === '' || in_array(strtolower($database), [strtolower($centralDb),'newtenantdb','mysql','information_schema','performance_schema','sys'], true)) {
        throw new RuntimeException("Unsafe database value for restaurant #{$id}.");
    }

    $verified[] = [$id, $domain, $database];
}

foreach ($verified as [$id, $domain, $database]) {
    $quoted = '`'.str_replace('`', '``', $database).'`';
    DB::connection('mysql')->statement('DROP DATABASE IF EXISTS '.$quoted);
    DB::connection('mysql')->table('tenants')->where('id', $id)->whereRaw('LOWER(domain) = ?', [$domain])->delete();
    echo "DELETED #{$id} {$domain} db={$database}\n";
}
PHP

echo
echo "6) Verifying requested rows/databases are gone - READ ONLY..."
php <<'PHP'
<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$ids = [36,35,34,29,27,26];
$left = DB::connection('mysql')->table('tenants')->whereIn('id', $ids)->get();
if ($left->count() > 0) {
    foreach ($left as $row) echo "FAIL ROW STILL EXISTS #{$row->id} {$row->domain}\n";
    exit(31);
}

echo "PASS: all six central restaurant rows are gone.\n";
$remaining = DB::connection('mysql')->table('tenants')->orderBy('id')->get(['id','name','domain','status']);
foreach ($remaining as $row) {
    echo sprintf("KEEP #%d %-20s %-30s %s\n", $row->id, $row->name, $row->domain, $row->status);
}
PHP

echo
echo "============================================================"
echo " REQUESTED TEST RESTAURANTS PURGED"
echo "============================================================"
echo "Recovery backup: $BACKUP"
echo
echo "Intentionally NOT touched:"
echo " - Milano / Mimoza / Rosana or any restaurant not in the exact target IDs"
echo " - Nginx vhost files"
echo " - TLS certificates"
echo " - DNS"
echo " - Git checkout"
echo
echo "Because the registry rows are gone, the existing tenant access gate will fail closed for those old hostnames and redirect browser traffic away from restaurant content."
