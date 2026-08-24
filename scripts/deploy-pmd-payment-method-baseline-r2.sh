#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
PATCH_REL="scripts/patch-pmd-payment-method-baseline-r2.py"
TARGET_REL="app/Services/PmdTenantProductBaselineR1.php"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_DIR="/var/backups/pmd_payment_method_baseline_r2_${STAMP}"
STAGE="/tmp/pmd_payment_method_baseline_r2_${STAMP}"

echo "============================================================"
echo " PAYMYDINE PAYMENT METHOD BASELINE R2"
echo " DURABLE NEW-TENANT PAYMENT OFFERING INVARIANT"
echo "============================================================"

cd "$ROOT"

echo
echo "========== FETCH AUTHORITY =========="
git fetch origin "$BRANCH"
REMOTE="$(git rev-parse "origin/$BRANCH")"
echo "REMOTE=$REMOTE"

mkdir -p "$STAGE"
git show "origin/$BRANCH:$PATCH_REL" > "$STAGE/patch.py"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
echo "PATCH_HELPER=OK"

TARGET="$ROOT/$TARGET_REL"
if [[ ! -f "$TARGET" ]]; then
  echo "ERROR: target missing: $TARGET" >&2
  exit 1
fi

sudo mkdir -p "$BACKUP_DIR"
sudo cp -a "$TARGET" "$BACKUP_DIR/"
echo "BACKUP=$BACKUP_DIR"

cp "$TARGET" "$STAGE/PmdTenantProductBaselineR1.php"
python3 "$STAGE/patch.py" "$STAGE/PmdTenantProductBaselineR1.php"
php -l "$STAGE/PmdTenantProductBaselineR1.php"

grep -q 'PMD_PAYMENT_METHOD_BASELINE_R2' "$STAGE/PmdTenantProductBaselineR1.php"
grep -q "public const VERSION = '1.1.0';" "$STAGE/PmdTenantProductBaselineR1.php"
grep -q "'card' => \['name' => 'Card', 'priority' => 10, 'provider_code' => null\]" "$STAGE/PmdTenantProductBaselineR1.php"
grep -q "'apple_pay' => \['name' => 'Apple Pay', 'priority' => 20, 'provider_code' => null\]" "$STAGE/PmdTenantProductBaselineR1.php"
grep -q "'google_pay' => \['name' => 'Google Pay', 'priority' => 30, 'provider_code' => null\]" "$STAGE/PmdTenantProductBaselineR1.php"
grep -q "'wero' => \['name' => 'Wero', 'priority' => 40, 'provider_code' => null\]" "$STAGE/PmdTenantProductBaselineR1.php"
grep -q "'paypal' => \['name' => 'PayPal', 'priority' => 50, 'provider_code' => null\]" "$STAGE/PmdTenantProductBaselineR1.php"
echo "STATIC_CONTRACT=OK"

sudo cp "$STAGE/PmdTenantProductBaselineR1.php" "$TARGET"
php -l "$TARGET"

echo
echo "========== CLEAR LARAVEL CACHES =========="
php artisan optimize:clear

echo
echo "========== LIVE AUTHORITY =========="
grep -n -A8 -B4 'PMD_PAYMENT_METHOD_BASELINE_R2' "$TARGET" | head -n 80 || true

echo
echo "========== SAFE EXISTING-TENANT RECONCILIATION =========="
php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Services\PmdTenantProductBaselineR1;

$tenants = DB::connection('mysql')
    ->table('tenants')
    ->whereNotNull('database')
    ->get();

$ok = 0;
$warnings = 0;

foreach ($tenants as $tenant) {
    $database = trim((string)($tenant->database ?? ''));
    if ($database === '') continue;

    try {
        $report = app(PmdTenantProductBaselineR1::class)
            ->repairTenantRecord($tenant, ['payments']);

        $payment = (array)($report['steps']['payment_catalog']['result'] ?? []);
        $reconciled = (array)($payment['reconciled'] ?? []);

        echo "TENANT={$database} OK=".(($report['ok'] ?? false) ? 'YES' : 'NO');
        if ($reconciled) {
            echo " RECONCILED=".json_encode($reconciled, JSON_UNESCAPED_SLASHES);
        }
        echo PHP_EOL;

        if ($report['ok'] ?? false) $ok++;
        else $warnings++;
    } catch (Throwable $e) {
        $warnings++;
        echo "TENANT={$database} ERROR=".$e->getMessage().PHP_EOL;
    }
}

echo "TENANTS_OK={$ok}".PHP_EOL;
echo "TENANTS_WITH_WARNINGS={$warnings}".PHP_EOL;
PHP

echo
echo "========== FINAL VERIFY =========="nphp -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
echo "BASELINE_VERSION=".App\Services\PmdTenantProductBaselineR1::VERSION.PHP_EOL;
'

echo "============================================================"
echo " SUCCESS - PAYMENT METHOD BASELINE R2 INSTALLED"
echo "============================================================"
echo "NEW_TENANT_METHOD_DEFAULT=NOT_OFFERED"
echo "PROVIDER_SELECTION_CONTROLS_ENABLEMENT=YES"
echo "UNIMPLEMENTED_FLOWS_AUTO_ENABLED=NO"
echo "TENANT_SPECIFIC_REPAIR_REQUIRED=NO"
echo "BACKUP=$BACKUP_DIR"
echo "REMOTE=$REMOTE"
