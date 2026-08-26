#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
PATCH_REL="scripts/patch-pmd-sumup-wallet-catalogue-r1-4-6.py"
MODEL_REL="app/admin/models/Payments_model.php"
BRIDGE_REL="app/Services/Payments/SumupPaymentRuntimeBridge.php"
SUMUP_SERVICE_REL="app/Services/Payments/SumupOnlineCheckoutService.php"
SUMUP_CONTROLLER_REL="app/admin/controllers/SumupTerminalSettings.php"
TENANT_DOMAIN="${PMD_TENANT_DOMAIN:-tomo.paymydine.com}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_wallet_catalogue_r1_4_6_${STAMP}"
BACKUP="/var/backups/pmd_sumup_wallet_catalogue_r1_4_6_${STAMP}"
INSTALL_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE SUMUP WALLET CATALOGUE R1.4.6"
echo " APPLE/GOOGLE READINESS -> METHOD ENABLEMENT"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"
echo "TENANT_DOMAIN=$TENANT_DOMAIN"

echo "========== PRECHECK LIVE SUMUP WALLET AUTHORITY =========="
for f in "$MODEL_REL" "$BRIDGE_REL" "$SUMUP_SERVICE_REL" "$SUMUP_CONTROLLER_REL"; do
  [ -f "$ROOT/$f" ] || { echo "ERROR: missing live authority: $f"; exit 2; }
done
# R5 is already live on the VPS and owns the public sup_pk_ + Swift config path.
# R1.4.5 failed before install, so we deliberately patch LIVE authorities rather
# than replacing them with older branch snapshots.
grep -Fq 'PMD_SUMUP_SWIFT_CONFIG_R5' "$ROOT/$SUMUP_SERVICE_REL" || { echo "ERROR: live SumUp Swift R5 service marker missing"; exit 3; }
grep -Fq "'sumup_wallet_public_key'" "$ROOT/$SUMUP_CONTROLLER_REL" || { echo "ERROR: live SumUp wallet public-key save path missing"; exit 4; }
grep -Fq 'class SumupPaymentRuntimeBridge' "$ROOT/$BRIDGE_REL" || { echo "ERROR: SumUp runtime bridge contract missing"; exit 5; }
echo "LIVE_SUMUP_SWIFT_R5=OK"

echo "========== STAGE LIVE AUTHORITIES =========="
git cat-file -e "$REMOTE:$PATCH_REL" || { echo "ERROR: remote patch helper missing"; exit 6; }
git show "$REMOTE:$PATCH_REL" > "$STAGE/patch.py"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
cp "$ROOT/$MODEL_REL" "$STAGE/Payments_model.php"
cp "$ROOT/$BRIDGE_REL" "$STAGE/SumupPaymentRuntimeBridge.php"
python3 "$STAGE/patch.py" "$STAGE/Payments_model.php" "$STAGE/SumupPaymentRuntimeBridge.php"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/Payments_model.php"
php -l "$STAGE/SumupPaymentRuntimeBridge.php"
grep -Fq "'apple_pay' => ['stripe', 'sumup', 'vr_payment']" "$STAGE/Payments_model.php"
grep -Fq "'google_pay' => ['stripe', 'sumup', 'vr_payment']" "$STAGE/Payments_model.php"
grep -Fq 'PMD_SUMUP_WALLET_CATALOGUE_SYNC_R1_4_6' "$STAGE/SumupPaymentRuntimeBridge.php"
echo "STATIC_PREFLIGHT=OK"

echo "========== BACKUP =========="
sudo cp -a "$ROOT/$MODEL_REL" "$BACKUP/Payments_model.php"
sudo cp -a "$ROOT/$BRIDGE_REL" "$BACKUP/SumupPaymentRuntimeBridge.php"
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! R1.4.6 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/Payments_model.php" "$ROOT/$MODEL_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/SumupPaymentRuntimeBridge.php" "$ROOT/$BRIDGE_REL" 2>/dev/null || true
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo "========== INSTALL R1.4.6 =========="
sudo install -m 0644 "$STAGE/Payments_model.php" "$ROOT/$MODEL_REL"
sudo install -m 0644 "$STAGE/SumupPaymentRuntimeBridge.php" "$ROOT/$BRIDGE_REL"
php -l "$ROOT/$MODEL_REL"
php -l "$ROOT/$BRIDGE_REL"

echo "========== CLEAR CACHE =========="
sudo -u www-data php artisan optimize:clear || true

echo "========== RECONCILE TARGET TENANT NOW =========="
PMD_TENANT_DOMAIN="$TENANT_DOMAIN" php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Admin\Models\Payments_model;
use App\Services\Payments\SumupPaymentRuntimeBridge;

$domain = trim((string)getenv('PMD_TENANT_DOMAIN'));
$tenant = DB::connection('mysql')->table('tenants')->where('domain', $domain)->first();
if (!$tenant || empty($tenant->database)) {
    throw new RuntimeException("Tenant not found for domain: {$domain}");
}

$cfg = (array)config('database.connections.mysql');
$cfg['database'] = (string)$tenant->database;
foreach (['host' => 'db_host', 'port' => 'db_port', 'username' => 'db_user', 'password' => 'db_pass'] as $configKey => $tenantKey) {
    if (isset($tenant->{$tenantKey}) && $tenant->{$tenantKey} !== null && $tenant->{$tenantKey} !== '') {
        $cfg[$configKey] = $tenant->{$tenantKey};
    }
}

Config::set('database.connections.pmd_sumup_wallet_r146', $cfg);
DB::purge('pmd_sumup_wallet_r146');
DB::reconnect('pmd_sumup_wallet_r146');
Config::set('database.default', 'pmd_sumup_wallet_r146');
DB::setDefaultConnection('pmd_sumup_wallet_r146');

$environment = DB::table('terminal_provider_configs')
    ->where('provider_code', 'sumup')
    ->where('connection_status', 'connected')
    ->where('is_active', 1)
    ->value('environment');
if (!$environment) {
    $environment = DB::table('terminal_provider_configs')
        ->where('provider_code', 'sumup')
        ->where('connection_status', 'connected')
        ->orderByRaw("CASE WHEN environment = 'test' THEN 0 ELSE 1 END")
        ->value('environment');
}
if (!$environment) {
    throw new RuntimeException('No connected SumUp environment exists for this tenant.');
}

$result = app(SumupPaymentRuntimeBridge::class)->syncCatalogue((string)$environment);
echo 'SYNC_RESULT='.json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL;

foreach (['apple_pay', 'google_pay', 'card', 'wero'] as $code) {
    $row = Payments_model::query()->where('code', $code)->first();
    if (!$row) {
        echo "METHOD={$code} MISSING".PHP_EOL;
        continue;
    }
    echo 'METHOD='.$code
        .' PROVIDER='.strtolower(trim((string)($row->provider_code ?? '')))
        .' ENABLED='.(($row->status ?? false) ? 'YES' : 'NO')
        .PHP_EOL;
}
PHP

echo "========== LIVE MARKERS =========="
grep -Fq "'apple_pay' => ['stripe', 'sumup', 'vr_payment']" "$ROOT/$MODEL_REL"
grep -Fq "'google_pay' => ['stripe', 'sumup', 'vr_payment']" "$ROOT/$MODEL_REL"
grep -Fq 'PMD_SUMUP_WALLET_CATALOGUE_SYNC_R1_4_6' "$ROOT/$BRIDGE_REL"
echo "LIVE_MARKERS=OK"

trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP WALLET CATALOGUE R1.4.6 INSTALLED"
echo "============================================================"
echo "APPLE_PAY=ENABLED_WHEN_SUMUP_SUP_PK_CONFIGURED"
echo "GOOGLE_PAY=ENABLED_WHEN_SUP_PK_AND_GOOGLE_MERCHANT_METADATA_CONFIGURED"
echo "APPLE_DOMAIN=SUMUP_SWIFT_RUNTIME_AUTHORITY"
echo "DEVICE_BROWSER_CAPABILITY=SUMUP_SWIFT_RUNTIME_AUTHORITY"
echo "CARD_PROVIDER=UNCHANGED_IF_ALREADY_VR_PAYMENT"
echo "WERO_PROVIDER=UNCHANGED"
echo "VR_R1_4_5=NOT_DEPLOYED_BY_THIS_SCRIPT"
echo "TENANT_DOMAIN=$TENANT_DOMAIN"
echo "REMOTE=$REMOTE_SHA"
echo "BACKUP=$BACKUP"
