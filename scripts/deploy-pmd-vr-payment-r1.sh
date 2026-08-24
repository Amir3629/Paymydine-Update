#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_payment_r1_${STAMP}"
BACKUP="/var/backups/pmd_vr_payment_r1_${STAMP}"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT R1"
echo " API V2 PAYMENT PAGE + WALLETS/WERO + CLOUD TILL"
echo "============================================================"

cd "$ROOT"
git fetch origin "$BRANCH"
REMOTE="$(git rev-parse "origin/$BRANCH")"
echo "REMOTE=$REMOTE"

mkdir -p "$STAGE/app/Services/Payments" \
         "$STAGE/app/Services/TerminalPayments" \
         "$STAGE/app/admin/classes" \
         "$STAGE/app/admin/controllers/concerns" \
         "$STAGE/app/Services" \
         "$STAGE/app/admin/controllers" \
         "$STAGE/scripts"

# New authorities.
git show "origin/$BRANCH:app/Services/Payments/VrPaymentApiClient.php" > "$STAGE/app/Services/Payments/VrPaymentApiClient.php"
git show "origin/$BRANCH:app/Services/Payments/ProviderCapabilityRegistry.php" > "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
git show "origin/$BRANCH:scripts/vr-payment-r1/files/app/admin/classes/VRPaymentGatewayService.php" > "$STAGE/app/admin/classes/VRPaymentGatewayService.php"
git show "origin/$BRANCH:scripts/vr-payment-r1/files/app/Services/TerminalPayments/VrPaymentTerminalProvider.php" > "$STAGE/app/Services/TerminalPayments/VrPaymentTerminalProvider.php"
git show "origin/$BRANCH:scripts/vr-payment-r1/files/app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php" > "$STAGE/app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php"

# Patch helpers.
git show "origin/$BRANCH:scripts/patch-pmd-vr-payment-r1.py" > "$STAGE/scripts/patch-pmd-vr-payment-r1.py"
git show "origin/$BRANCH:scripts/patch-pmd-terminal-immediate-settlement-r1.py" > "$STAGE/scripts/patch-pmd-terminal-immediate-settlement-r1.py"
git show "origin/$BRANCH:scripts/patch-pmd-vr-payment-doc-contract-r1.py" > "$STAGE/scripts/patch-pmd-vr-payment-doc-contract-r1.py"
chmod 755 "$STAGE/scripts/"*.py
python3 -m py_compile "$STAGE/scripts/"*.py

# Preserve live authorities and patch them instead of replacing from stale GitHub.
cp "$ROOT/app/Services/TerminalPayments/TerminalPaymentService.php" "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
cp "$ROOT/app/Services/PmdTenantProductBaselineR1.php" "$STAGE/app/Services/PmdTenantProductBaselineR1.php"
cp "$ROOT/app/admin/controllers/Payments.php" "$STAGE/app/admin/controllers/Payments.php"

python3 "$STAGE/scripts/patch-pmd-vr-payment-r1.py" \
  "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php" \
  "$STAGE/app/Services/PmdTenantProductBaselineR1.php" \
  "$STAGE/app/admin/controllers/Payments.php"

python3 "$STAGE/scripts/patch-pmd-terminal-immediate-settlement-r1.py" \
  "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"

python3 "$STAGE/scripts/patch-pmd-vr-payment-doc-contract-r1.py" \
  "$STAGE/app/Services/Payments/VrPaymentApiClient.php" \
  "$STAGE/app/admin/classes/VRPaymentGatewayService.php"

echo
echo "========== STATIC PREFLIGHT =========="
for file in \
  "$STAGE/app/Services/Payments/VrPaymentApiClient.php" \
  "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php" \
  "$STAGE/app/admin/classes/VRPaymentGatewayService.php" \
  "$STAGE/app/Services/TerminalPayments/VrPaymentTerminalProvider.php" \
  "$STAGE/app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php" \
  "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php" \
  "$STAGE/app/Services/PmdTenantProductBaselineR1.php" \
  "$STAGE/app/admin/controllers/Payments.php"
do
  php -l "$file"
done

grep -q 'PMD_VR_PAYMENT_API_V2_R1' "$STAGE/app/Services/Payments/VrPaymentApiClient.php"
grep -q 'PMD_VR_PAYMENT_DOC_CONTRACT_R1' "$STAGE/app/Services/Payments/VrPaymentApiClient.php"
grep -q 'PMD_VR_PAYMENT_ONLINE_R1' "$STAGE/app/admin/classes/VRPaymentGatewayService.php"
grep -q 'PMD_VR_PAYMENT_TRANSACTION_METHOD_GATE_R1' "$STAGE/app/admin/classes/VRPaymentGatewayService.php"
grep -q 'PMD_VR_PAYMENT_TERMINAL_R1' "$STAGE/app/Services/TerminalPayments/VrPaymentTerminalProvider.php"
grep -q 'PMD_WAITER_REAL_TERMINALS_R1' "$STAGE/app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php"
grep -q 'PMD_VR_TERMINAL_ROUTING_R1' "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
grep -q 'PMD_TERMINAL_IMMEDIATE_SETTLEMENT_R1' "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
grep -q 'PMD_VR_TERMINAL_SCHEMA_R1' "$STAGE/app/Services/PmdTenantProductBaselineR1.php"
grep -q 'PMD_VR_PAYMENT_ADMIN_R1' "$STAGE/app/admin/controllers/Payments.php"
grep -q "'vr_payment' => \['auth_key'\]" "$STAGE/app/admin/controllers/Payments.php"
grep -q "self::METHOD_WERO" "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
echo "STATIC_PREFLIGHT=OK"

echo
echo "========== BACKUP =========="
sudo mkdir -p "$BACKUP/app/Services/Payments" \
  "$BACKUP/app/Services/TerminalPayments" \
  "$BACKUP/app/admin/classes" \
  "$BACKUP/app/admin/controllers/concerns" \
  "$BACKUP/app/Services" \
  "$BACKUP/app/admin/controllers"

for rel in \
  app/Services/Payments/VrPaymentApiClient.php \
  app/Services/Payments/ProviderCapabilityRegistry.php \
  app/admin/classes/VRPaymentGatewayService.php \
  app/Services/TerminalPayments/VrPaymentTerminalProvider.php \
  app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php \
  app/Services/TerminalPayments/TerminalPaymentService.php \
  app/Services/PmdTenantProductBaselineR1.php \
  app/admin/controllers/Payments.php
do
  if [[ -f "$ROOT/$rel" ]]; then
    sudo cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done
echo "BACKUP=$BACKUP"

echo
echo "========== INSTALL =========="
for rel in \
  app/Services/Payments/VrPaymentApiClient.php \
  app/Services/Payments/ProviderCapabilityRegistry.php \
  app/admin/classes/VRPaymentGatewayService.php \
  app/Services/TerminalPayments/VrPaymentTerminalProvider.php \
  app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php \
  app/Services/TerminalPayments/TerminalPaymentService.php \
  app/Services/PmdTenantProductBaselineR1.php \
  app/admin/controllers/Payments.php
do
  sudo cp "$STAGE/$rel" "$ROOT/$rel"
  echo "INSTALLED: $rel"
done

for file in \
  app/Services/Payments/VrPaymentApiClient.php \
  app/Services/Payments/ProviderCapabilityRegistry.php \
  app/admin/classes/VRPaymentGatewayService.php \
  app/Services/TerminalPayments/VrPaymentTerminalProvider.php \
  app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php \
  app/Services/TerminalPayments/TerminalPaymentService.php \
  app/Services/PmdTenantProductBaselineR1.php \
  app/admin/controllers/Payments.php
do
  php -l "$ROOT/$file"
done

echo
echo "========== TENANT BASELINE =========="
php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Services\PmdTenantProductBaselineR1;

$tenants = DB::connection('mysql')->table('tenants')->whereNotNull('database')->get();
$ok = 0; $warnings = 0;
foreach ($tenants as $tenant) {
    $database = trim((string)($tenant->database ?? ''));
    if ($database === '') continue;
    try {
        $report = app(PmdTenantProductBaselineR1::class)->repairTenantRecord($tenant, ['payments', 'pos']);
        $step = (array)($report['steps']['vr_terminal_device_fields']['result'] ?? []);
        echo 'TENANT='.$database
            .' OK='.(($report['ok'] ?? false) ? 'YES' : 'NO')
            .' VR_TERMINAL_COLUMNS='.json_encode($step['columns_added'] ?? [], JSON_UNESCAPED_SLASHES)
            .PHP_EOL;
        if ($report['ok'] ?? false) $ok++; else $warnings++;
    } catch (Throwable $e) {
        $warnings++;
        echo 'TENANT='.$database.' ERROR='.$e->getMessage().PHP_EOL;
    }
}
echo 'TENANTS_OK='.$ok.PHP_EOL;
echo 'TENANTS_WITH_WARNINGS='.$warnings.PHP_EOL;
if ($warnings > 0) exit(2);
PHP

echo
echo "========== CLEAR CACHES =========="
php artisan event:clear || true
php artisan view:clear || true
php artisan route:clear || true
php artisan config:clear || true
php artisan clear-compiled || true
php artisan cache:clear || true

echo
echo "========== RUNTIME CONTRACT =========="
php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\Payments\ProviderCapabilityRegistry;
use App\Services\TerminalPayments\VrPaymentTerminalProvider;

$registry = app(ProviderCapabilityRegistry::class);
$vr = $registry->provider('vr_payment');
echo 'BASELINE_VERSION='.App\Services\PmdTenantProductBaselineR1::VERSION.PHP_EOL;
echo 'VR_IMPLEMENTED_CAPABILITIES='.json_encode($vr['implemented_capabilities'] ?? []).PHP_EOL;
echo 'VR_IMPLEMENTED_METHODS='.json_encode($vr['implemented_payment_methods'] ?? []).PHP_EOL;
echo 'VR_TERMINAL_PROVIDER_CLASS='.get_class(app(VrPaymentTerminalProvider::class)).PHP_EOL;
echo 'VR_TERMINAL_PROVIDER_CODE='.app(VrPaymentTerminalProvider::class)->code().PHP_EOL;
PHP

echo
echo "============================================================"
echo " SUCCESS - VR PAYMENT R1 INSTALLED"
echo "============================================================"
echo "VR_API=V2_JWT_HS256"
echo "VR_ONLINE=PAYMENT_PAGE"
echo "VR_METHOD_DISCOVERY=TRANSACTION_SCOPED"
echo "VR_CARD=RUNTIME_GATED"
echo "VR_APPLE_PAY=RUNTIME_GATED"
echo "VR_GOOGLE_PAY=RUNTIME_GATED"
echo "VR_WERO=RUNTIME_GATED"
echo "VR_PAYPAL=RUNTIME_GATED"
echo "VR_TERMINAL=CLOUD_TILL_REAL_DEVICE_ONLY"
echo "VR_WEBHOOK=ECDSA_SHA256"
echo "FAKE_TERMINAL_SUCCESS=DISABLED"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE"
