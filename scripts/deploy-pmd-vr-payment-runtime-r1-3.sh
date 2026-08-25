#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_payment_runtime_r1_3_${STAMP}"
BACKUP="/var/backups/pmd_vr_payment_runtime_r1_3_${STAMP}"
HELPER="$STAGE/patch.py"

CLIENT="$ROOT/app/Services/Payments/VrPaymentApiClient.php"
SERVICE="$ROOT/app/admin/classes/VRPaymentGatewayService.php"
PAYMENTS="$ROOT/app/admin/controllers/Payments.php"

mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

cd "$ROOT"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT RUNTIME R1.3"
echo " PAYMENT PAGE ACCEPT + METHOD STATUS SYNC"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE="$(git rev-parse "origin/$BRANCH")"
echo "REMOTE=$REMOTE"

git show "origin/$BRANCH:scripts/patch-pmd-vr-payment-runtime-r1-3.py" > "$HELPER"
chmod 755 "$HELPER"
python3 -m py_compile "$HELPER"
echo "PATCH_HELPER=OK"

for f in "$CLIENT" "$SERVICE" "$PAYMENTS"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: live target missing: $f" >&2
    exit 1
  fi
done

cp "$CLIENT" "$STAGE/VrPaymentApiClient.php"
cp "$SERVICE" "$STAGE/VRPaymentGatewayService.php"
cp "$PAYMENTS" "$STAGE/Payments.php"

sudo cp -a "$CLIENT" "$BACKUP/VrPaymentApiClient.php"
sudo cp -a "$SERVICE" "$BACKUP/VRPaymentGatewayService.php"
sudo cp -a "$PAYMENTS" "$BACKUP/Payments.php"
echo "BACKUP=$BACKUP"

python3 "$HELPER" \
  "$STAGE/VrPaymentApiClient.php" \
  "$STAGE/VRPaymentGatewayService.php" \
  "$STAGE/Payments.php"

for f in "$STAGE/VrPaymentApiClient.php" "$STAGE/VRPaymentGatewayService.php" "$STAGE/Payments.php"; do
  php -l "$f"
done

grep -q 'PMD_VR_PAYMENT_PAGE_ACCEPT_R1_3' "$STAGE/VrPaymentApiClient.php"
grep -q 'PMD_VR_METHOD_STATUS_SYNC_R1_3' "$STAGE/VRPaymentGatewayService.php"
grep -q 'PMD_VR_METHOD_RUNTIME_ENABLEMENT_R1_3' "$STAGE/Payments.php"
echo "STATIC_CONTRACT=OK"

sudo install -m 0644 "$STAGE/VrPaymentApiClient.php" "$CLIENT"
sudo install -m 0644 "$STAGE/VRPaymentGatewayService.php" "$SERVICE"
sudo install -m 0644 "$STAGE/Payments.php" "$PAYMENTS"

echo "INSTALLED=3_FILES"
php -l "$CLIENT"
php -l "$SERVICE"
php -l "$PAYMENTS"

php artisan optimize:clear || true

echo
echo "========== MOON VR RECONCILE =========="
php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Admin\Models\Payments_model;
use Admin\Classes\VRPaymentGatewayService;

$tenant = DB::connection('mysql')->table('tenants')
    ->where('domain', 'moon.paymydine.com')
    ->first();

if (!$tenant || empty($tenant->database)) {
    echo "MOON_TENANT=NOT_FOUND\n";
    exit(0);
}

$cfg = config('database.connections.mysql');
$cfg['database'] = (string)$tenant->database;
Config::set('database.connections.pmd_vr_r13', $cfg);
DB::purge('pmd_vr_r13');
DB::reconnect('pmd_vr_r13');
Config::set('database.default', 'pmd_vr_r13');
DB::setDefaultConnection('pmd_vr_r13');

$service = new VRPaymentGatewayService();
$result = $service->probeConnectivity();

echo 'MOON_DATABASE='.DB::connection()->getDatabaseName().PHP_EOL;
echo 'MOON_CONNECTED='.(($result['connected'] ?? false) ? 'YES' : 'NO').PHP_EOL;
echo 'MOON_METHODS='.json_encode($result['available_method_codes'] ?? [], JSON_UNESCAPED_SLASHES).PHP_EOL;
echo 'MOON_TERMINAL_COUNT='.(int)($result['terminal_count'] ?? 0).PHP_EOL;
echo 'MOON_METHOD_SYNC='.json_encode($result['method_sync'] ?? null, JSON_UNESCAPED_SLASHES).PHP_EOL;

foreach (['card','wero','apple_pay','google_pay','paypal'] as $code) {
    $row = Payments_model::query()->where('code', $code)->first();
    if (!$row) {
        echo strtoupper($code).'=MISSING'.PHP_EOL;
        continue;
    }
    $data = method_exists($row, 'getConfigData') ? (array)$row->getConfigData() : (array)$row->data;
    $provider = strtolower(trim((string)($row->provider_code ?? $data['provider_code'] ?? '')));
    echo strtoupper($code).'_PROVIDER='.($provider ?: '-').PHP_EOL;
    echo strtoupper($code).'_STATUS='.(int)$row->status.PHP_EOL;
}
PHP

echo
echo "============================================================"
echo " SUCCESS - VR PAYMENT RUNTIME R1.3 INSTALLED"
echo "============================================================"
echo "PAYMENT_PAGE_ACCEPT=WILDCARD_FOR_STRING_ENDPOINT"
echo "VR_METHOD_STATUS=RUNTIME_DISCOVERY_SYNC"
echo "UNAVAILABLE_VR_WALLETS=DISABLED"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE"
