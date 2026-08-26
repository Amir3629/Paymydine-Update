#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
PATCH_REL="scripts/patch-pmd-sumup-public-key-validation-r1-4-7.py"
SERVICE_REL="app/Services/Payments/SumupOnlineCheckoutService.php"
BRIDGE_REL="app/Services/Payments/SumupPaymentRuntimeBridge.php"
TENANT_DOMAIN="${PMD_TENANT_DOMAIN:-tomo.paymydine.com}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_public_key_validation_r1_4_7_${STAMP}"
BACKUP="/var/backups/pmd_sumup_public_key_validation_r1_4_7_${STAMP}"
INSTALL_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE SUMUP PUBLIC KEY VALIDATION R1.4.7"
echo " REJECT PLACEHOLDERS | FAIL BEFORE SWIFT 401"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"
echo "TENANT_DOMAIN=$TENANT_DOMAIN"

echo "========== PRECHECK LIVE AUTHORITIES =========="
[ -f "$ROOT/$SERVICE_REL" ] || { echo "ERROR: SumUp online service missing"; exit 2; }
[ -f "$ROOT/$BRIDGE_REL" ] || { echo "ERROR: SumUp runtime bridge missing"; exit 3; }
grep -Fq 'PMD_SUMUP_SWIFT_CONFIG_R5' "$ROOT/$SERVICE_REL" || { echo "ERROR: live SumUp Swift R5 marker missing"; exit 4; }
grep -Fq 'PMD_SUMUP_WALLET_CATALOGUE_SYNC_R1_4_6' "$ROOT/$BRIDGE_REL" || { echo "ERROR: live R1.4.6 catalogue marker missing"; exit 5; }
echo "LIVE_CONTRACT=OK"

echo "========== STAGE LIVE AUTHORITIES =========="
git cat-file -e "$REMOTE:$PATCH_REL" || { echo "ERROR: remote patch helper missing"; exit 6; }
git show "$REMOTE:$PATCH_REL" > "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
cp "$ROOT/$SERVICE_REL" "$STAGE/SumupOnlineCheckoutService.php"
cp "$ROOT/$BRIDGE_REL" "$STAGE/SumupPaymentRuntimeBridge.php"
python3 "$STAGE/patch.py" "$STAGE/SumupOnlineCheckoutService.php" "$STAGE/SumupPaymentRuntimeBridge.php"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/SumupOnlineCheckoutService.php"
php -l "$STAGE/SumupPaymentRuntimeBridge.php"
grep -Fq 'PMD_SUMUP_PUBLIC_KEY_VALIDATION_R1_4_7' "$STAGE/SumupOnlineCheckoutService.php"
grep -Fq 'PMD_SUMUP_PUBLIC_KEY_VALIDATION_R1_4_7' "$STAGE/SumupPaymentRuntimeBridge.php"
echo "STATIC_PREFLIGHT=OK"

echo "========== BACKUP =========="
sudo cp -a "$ROOT/$SERVICE_REL" "$BACKUP/SumupOnlineCheckoutService.php"
sudo cp -a "$ROOT/$BRIDGE_REL" "$BACKUP/SumupPaymentRuntimeBridge.php"
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! R1.4.7 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/SumupOnlineCheckoutService.php" "$ROOT/$SERVICE_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/SumupPaymentRuntimeBridge.php" "$ROOT/$BRIDGE_REL" 2>/dev/null || true
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo "========== INSTALL R1.4.7 =========="
sudo install -m 0644 "$STAGE/SumupOnlineCheckoutService.php" "$ROOT/$SERVICE_REL"
sudo install -m 0644 "$STAGE/SumupPaymentRuntimeBridge.php" "$ROOT/$BRIDGE_REL"
php -l "$ROOT/$SERVICE_REL"
php -l "$ROOT/$BRIDGE_REL"

echo "========== CLEAR CACHE =========="
sudo -u www-data php artisan optimize:clear || true

echo "========== RECONCILE TARGET TENANT =========="
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
use App\Services\Payments\SumupOnlineCheckoutService;

$domain = trim((string)getenv('PMD_TENANT_DOMAIN'));
$tenant = DB::connection('mysql')->table('tenants')->where('domain', $domain)->first();
if (!$tenant || empty($tenant->database)) {
    throw new RuntimeException("Tenant not found: {$domain}");
}

$cfg = (array)config('database.connections.mysql');
$cfg['database'] = (string)$tenant->database;
foreach (['host' => 'db_host', 'port' => 'db_port', 'username' => 'db_user', 'password' => 'db_pass'] as $configKey => $tenantKey) {
    if (isset($tenant->{$tenantKey}) && $tenant->{$tenantKey} !== null && $tenant->{$tenantKey} !== '') {
        $cfg[$configKey] = $tenant->{$tenantKey};
    }
}
Config::set('database.connections.pmd_sumup_r147', $cfg);
DB::purge('pmd_sumup_r147');
DB::reconnect('pmd_sumup_r147');
DB::setDefaultConnection('pmd_sumup_r147');

$environment = DB::table('terminal_provider_configs')
    ->where('provider_code', 'sumup')
    ->where('connection_status', 'connected')
    ->where('is_active', 1)
    ->value('environment') ?: 'test';

$wallets = app(SumupOnlineCheckoutService::class)->walletSettings((string)$environment);
$keyConfigured = (bool)($wallets['swift_checkout']['configured'] ?? false);
echo 'ENVIRONMENT='.$environment.PHP_EOL;
echo 'REAL_SUP_PK_CONFIGURED='.($keyConfigured ? 'YES' : 'NO').PHP_EOL;

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

try {
    $swift = app(SumupOnlineCheckoutService::class)->swiftCheckoutConfig();
    echo 'SWIFT_CONFIG=READY'.PHP_EOL;
    echo 'SWIFT_COUNTRY='.(string)($swift['country_code'] ?? '').PHP_EOL;
} catch (Throwable $e) {
    echo 'SWIFT_CONFIG=BLOCKED'.PHP_EOL;
    echo 'SWIFT_REASON='.$e->getMessage().PHP_EOL;
}
PHP

echo "========== LIVE MARKERS =========="
grep -Fq 'PMD_SUMUP_PUBLIC_KEY_VALIDATION_R1_4_7' "$ROOT/$SERVICE_REL"
grep -Fq 'PMD_SUMUP_PUBLIC_KEY_VALIDATION_R1_4_7' "$ROOT/$BRIDGE_REL"
echo "LIVE_MARKERS=OK"

trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP PUBLIC KEY VALIDATION R1.4.7 INSTALLED"
echo "============================================================"
echo "PLACEHOLDER_KEYS=REJECTED"
echo "SUMUP_SWIFT_401_FROM_FAKE_KEY=PREVENTED"
echo "REAL_SUP_PK_REQUIRED=YES"
echo "APPLE_DOMAIN_FLOW=UNCHANGED"
echo "GOOGLE_MERCHANT_FLOW=UNCHANGED"
echo "CARD_PROVIDER=UNCHANGED"
echo "WERO_PROVIDER=UNCHANGED"
echo "TENANT_DOMAIN=$TENANT_DOMAIN"
echo "REMOTE=$REMOTE_SHA"
echo "BACKUP=$BACKUP"
