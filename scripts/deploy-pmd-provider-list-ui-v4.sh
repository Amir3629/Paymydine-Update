#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_provider_ui_v4_${STAMP}"
BACKUP="/var/backups/pmd_provider_ui_v4_${STAMP}"

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"

echo "=========================================="
echo " PAYMYDINE PROVIDER UI V4"
echo " LIST UI + SUMUP READINESS AUDIT"
echo "=========================================="

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

FILES=(
  "app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
  "app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
)

rollback() {
  echo
  echo "!!!!! PROVIDER UI V4 DEPLOY FAILED !!!!!"
  if [ -d "$BACKUP/files" ]; then
    sudo cp -a "$BACKUP/files/." "$ROOT/"
  fi
  sudo -u www-data -H php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED FROM: $BACKUP"
}
trap rollback ERR

echo
echo "========== STAGE =========="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git cat-file -e "$REMOTE:$file"
  git show "$REMOTE:$file" > "$STAGE/$file"
  echo "STAGED: $file"
done

echo
echo "========== PREFLIGHT =========="
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
fi
grep -q 'PMDPaymentProviderCatalogueV3' "$STAGE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
grep -q 'captureSumupForm' "$STAGE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
grep -q 'data-provider-configure="sumup"' "$STAGE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
grep -q 'pmd-provider-modal__dialog' "$STAGE/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
grep -q 'pmd-provider-row' "$STAGE/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
echo "PREFLIGHT OK"

echo
echo "========== BACKUP =========="
for file in "${FILES[@]}"; do
  sudo mkdir -p "$BACKUP/files/$(dirname "$file")"
  sudo cp -a "$ROOT/$file" "$BACKUP/files/$file"
done
echo "BACKUP=$BACKUP"

echo
echo "========== INSTALL =========="
for file in "${FILES[@]}"; do
  sudo install -D -m 0644 -o root -g www-data "$STAGE/$file" "$ROOT/$file"
  echo "INSTALLED: $file"
done

echo
echo "========== ASSET REGISTRATION =========="
grep -q 'js/pmd-payment-provider-catalogue-v1.js' app/admin/views/_meta/assets.json
grep -q 'css/pmd-payment-provider-catalogue-v1.css' app/admin/views/_meta/assets.json
echo "ASSETS REGISTERED"

echo
echo "========== SUMUP CODE AUDIT =========="
grep -q "payment-providers/sumup/connection" routes/terminal-payments.php
grep -q "terminal-payments/sumup/callback" routes/terminal-payments.php
grep -q "terminal-payments/attempts" routes/terminal-payments.php
grep -q "pmddevices/sumup/readers/pair" routes/terminal-payments.php
grep -q "function saveConnection" app/admin/controllers/SumupTerminalSettings.php
grep -q "function pairReader" app/admin/controllers/SumupTerminalSettings.php
grep -q "function testReader" app/admin/controllers/SumupTerminalSettings.php
grep -q "function removeReader" app/admin/controllers/SumupTerminalSettings.php
grep -q "function createAttempt" app/Services/TerminalPayments/TerminalPaymentService.php
grep -q "function refreshAttempt" app/Services/TerminalPayments/TerminalPaymentService.php
grep -q "settleSuccessfulAttempt" app/Services/TerminalPayments/TerminalPaymentService.php
grep -q "function handleSumupCallback" app/Services/TerminalPayments/TerminalPaymentService.php
grep -q "checkout" app/Services/TerminalPayments/SumupTerminalProvider.php
grep -q "'successful' => 'paid'" app/Services/TerminalPayments/SumupTerminalProvider.php
grep -q "terminalDeviceId" app/admin/assets/js/pmd-waiter-pos-payment-v3.js
grep -q "Choose terminal" app/admin/assets/js/pmd-waiter-pos-payment-v3.js
grep -q "terminalAttemptRefreshUrl" app/admin/assets/js/pmd-waiter-pos-payment-v3.js
echo "SUMUP CODE PATHS OK"

echo
echo "========== MULTI-TENANT SUMUP READINESS =========="
cat > "$STAGE/audit.php" <<'PHP'
<?php

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$root = getenv('PMD_ROOT') ?: '/var/www/paymydine';
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$base = (array)config('database.connections.mysql');
Config::set('database.connections.pmd_sumup_audit_central', $base);
DB::purge('pmd_sumup_audit_central');
DB::reconnect('pmd_sumup_audit_central');
$central = DB::connection('pmd_sumup_audit_central');

$tenants = $central->table('tenants')
    ->whereNotNull('database')
    ->where('database', '<>', '')
    ->get();

$checked = 0;
$configured = 0;
$failed = 0;

foreach ($tenants as $tenant) {
    $status = strtolower(trim((string)($tenant->status ?? 'active')));
    if (!in_array($status, ['active','enabled','1','true','yes'], true)) continue;

    $name = trim((string)($tenant->name ?? 'tenant'));
    $database = trim((string)$tenant->database);
    $runtime = $base;
    $runtime['database'] = $database;
    Config::set('database.connections.pmd_sumup_audit_tenant', $runtime);
    DB::purge('pmd_sumup_audit_tenant');

    try {
        DB::reconnect('pmd_sumup_audit_tenant');
        $db = DB::connection('pmd_sumup_audit_tenant');
        $schema = $db->getSchemaBuilder();
        $actual = (string)$db->getDatabaseName();
        $checked++;

        if (strcasecmp($actual, $database) !== 0) {
            throw new RuntimeException("database mismatch: expected {$database}, got {$actual}");
        }
        if (!$schema->hasTable('terminal_provider_configs')) {
            throw new RuntimeException('terminal_provider_configs missing');
        }
        if (!$schema->hasTable('terminal_devices')) {
            throw new RuntimeException('terminal_devices missing');
        }
        if (!$schema->hasColumn('terminal_devices', 'environment')) {
            throw new RuntimeException('terminal_devices.environment missing');
        }

        $sumupRows = $db->table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->get();
        $active = $sumupRows->firstWhere('is_active', 1);

        if (!$active) {
            echo "TENANT={$name} DB={$actual} SUMUP=NOT_CONFIGURED SCHEMA=OK".PHP_EOL;
            continue;
        }

        $configured++;
        $env = strtolower(trim((string)$active->environment));
        $errors = [];

        if (!in_array($env, ['test','production'], true)) $errors[] = 'invalid active environment';
        if (empty($active->access_token_encrypted)) $errors[] = 'secret API key missing';
        if (empty($active->affiliate_key_encrypted)) $errors[] = 'affiliate key missing';
        if (trim((string)$active->merchant_code) === '') $errors[] = 'merchant code missing';
        if ((string)$active->connection_status !== 'connected') $errors[] = 'provider not connected';

        if (!$schema->hasTable('payment_attempts')) $errors[] = 'payment_attempts missing';
        if (!$schema->hasTable('orders')) $errors[] = 'orders missing';

        $terminals = $db->table('terminal_devices')
            ->whereRaw('LOWER(provider_code) = ?', ['sumup'])
            ->where('environment', $env)
            ->where('is_active', 1)
            ->get();

        if ($terminals->isEmpty()) $errors[] = 'no active terminal';

        foreach ($terminals as $terminal) {
            $reader = trim((string)($terminal->reader_id ?? ''));
            $pairing = strtolower(trim((string)($terminal->pairing_state ?? '')));
            if (!str_starts_with($reader, 'rdr_')) $errors[] = 'invalid reader id on terminal #'.($terminal->terminal_device_id ?? '?');
            if ($pairing !== 'paired') $errors[] = 'terminal #'.($terminal->terminal_device_id ?? '?').' not paired';
        }

        if ($errors) {
            $failed++;
            echo "TENANT={$name} DB={$actual} SUMUP=FAIL ENV={$env} ERRORS=".implode(' | ', array_unique($errors)).PHP_EOL;
        } else {
            $online = $terminals->filter(function ($terminal) {
                return strtolower(trim((string)($terminal->terminal_status ?? ''))) === 'online';
            })->count();
            echo "TENANT={$name} DB={$actual} SUMUP=READY ENV={$env} TERMINALS=".$terminals->count()." ONLINE={$online}".PHP_EOL;
        }
    } catch (Throwable $e) {
        $failed++;
        echo "TENANT={$name} DB={$database} AUDIT=FAIL ERROR=".$e->getMessage().PHP_EOL;
    } finally {
        DB::disconnect('pmd_sumup_audit_tenant');
    }
}

echo "TENANTS_CHECKED={$checked}".PHP_EOL;
echo "SUMUP_CONFIGURED_TENANTS={$configured}".PHP_EOL;
echo "AUDIT_FAILED={$failed}".PHP_EOL;

if ($checked === 0 || $failed > 0) exit(1);
PHP

PMD_ROOT="$ROOT" php "$STAGE/audit.php"

echo
echo "========== CLEAR CACHE =========="
sudo -u www-data -H php artisan optimize:clear || php artisan optimize:clear || true

echo
echo "========== FINAL UI CHECK =========="
grep -q 'PMDPaymentProviderCatalogueV3' app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -q 'captureSumupForm' app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
if grep -q 'pmd-provider-feature' app/admin/assets/js/pmd-payment-provider-catalogue-v1.js; then
  echo "ERROR: old expanded provider feature UI still exists"
  exit 1
fi
echo "LIST UI + SUMUP MODAL OK"

trap - ERR

echo
echo "=========================================="
echo " SUCCESS - PROVIDER UI V4 LIVE"
echo " SUMUP READINESS AUDIT PASSED"
echo "=========================================="
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
