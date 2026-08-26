#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_URL="${PMD_FRONTEND_BASE_URL:-https://a.paymydine.com}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_embedded_wallets_r1_4_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_vr_embedded_wallets_r1_4_${STAMP}"
PATCH="scripts/patch-pmd-vr-embedded-wallets-r1-4.py"
CLIENT_REL="app/Services/Payments/VrPaymentApiClient.php"
SERVICE_REL="app/admin/classes/VRPaymentGatewayService.php"
FRONT_CLIENT_REL="src/lib/client-api.ts"
FRONT_RUNTIME_REL="src/runtime/components/RuntimeOverlays.tsx"
INSTALL_STARTED=0
FRONT_ACTIVATED=0

cd "$ROOT"
mkdir -p "$STAGE" "$FRONT_STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT EMBEDDED WALLETS R1.4"
echo " LIGHTBOX WHEN AVAILABLE | PAYMENT PAGE FALLBACK"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo "========== DETECT LIVE FRONTEND V2 =========="
PM2_JSON="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
FRONT_ROOT="$(printf '%s' "$PM2_JSON" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin)
name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("pm_cwd", "")))
        break
')"
if [ -z "$FRONT_ROOT" ] || [ ! -d "$FRONT_ROOT" ]; then
  echo "ERROR: PM2 service $FRONT_SERVICE has no usable pm_cwd"
  exit 2
fi
[ -f "$FRONT_ROOT/package.json" ] || { echo "ERROR: frontend package.json missing"; exit 3; }
[ -d "$FRONT_ROOT/node_modules" ] || { echo "ERROR: frontend node_modules missing"; exit 4; }
[ -f "$ROOT/$CLIENT_REL" ] || { echo "ERROR: live VR API client missing"; exit 5; }
[ -f "$ROOT/$SERVICE_REL" ] || { echo "ERROR: live VR gateway service missing"; exit 6; }
[ -f "$FRONT_ROOT/$FRONT_CLIENT_REL" ] || { echo "ERROR: live frontend client-api.ts missing"; exit 7; }
[ -f "$FRONT_ROOT/$FRONT_RUNTIME_REL" ] || { echo "ERROR: live RuntimeOverlays.tsx missing"; exit 8; }
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"

echo "========== R1.3 CONTRACT PRECHECK =========="
grep -Fq 'PMD_VR_PAYMENT_PAGE_ACCEPT_R1_3' "$ROOT/$CLIENT_REL" || { echo "ERROR: R1.3 Payment Page Accept marker missing"; exit 9; }
grep -Fq 'PMD_VR_METHOD_STATUS_SYNC_R1_3' "$ROOT/$SERVICE_REL" || { echo "ERROR: R1.3 method sync marker missing"; exit 10; }
grep -Fq 'availablePaymentMethodConfigurations' "$ROOT/$CLIENT_REL" || { echo "ERROR: transaction-scoped method discovery missing"; exit 11; }
grep -Fq 'startHostedProviderPayment' "$FRONT_ROOT/$FRONT_CLIENT_REL" || { echo "ERROR: frontend hosted payment authority missing"; exit 12; }
echo "R1_3_CONTRACT=OK"

echo "========== STAGE LIVE AUTHORITIES =========="nmkdir -p "$STAGE/app/Services/Payments" "$STAGE/app/admin/classes" "$STAGE/frontend"
cp "$ROOT/$CLIENT_REL" "$STAGE/$CLIENT_REL"
cp "$ROOT/$SERVICE_REL" "$STAGE/$SERVICE_REL"
cp "$FRONT_ROOT/$FRONT_CLIENT_REL" "$STAGE/frontend/client-api.ts"
cp "$FRONT_ROOT/$FRONT_RUNTIME_REL" "$STAGE/frontend/RuntimeOverlays.tsx"
git show "$REMOTE:$PATCH" > "$STAGE/patch.py"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"

python3 "$STAGE/patch.py" \
  "$STAGE/$CLIENT_REL" \
  "$STAGE/$SERVICE_REL" \
  "$STAGE/frontend/client-api.ts" \
  "$STAGE/frontend/RuntimeOverlays.tsx"

# R1.3 made the Payment Page URL endpoint Accept */*. The two VR JavaScript URL
# endpoints are String resources too, so keep the same tolerant transport rule.
python3 - "$STAGE/$CLIENT_REL" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text(encoding='utf-8')
old="            'Accept' => str_ends_with($path, '/payment-page-url') ? '*/*' : 'application/json', // PMD_VR_PAYMENT_PAGE_ACCEPT_R1_3\n"
new="            'Accept' => (str_ends_with($path, '/payment-page-url') || str_ends_with($path, '/lightbox-javascript-url') || str_ends_with($path, '/iframe-javascript-url')) ? '*/*' : 'application/json', // PMD_VR_PAYMENT_PAGE_ACCEPT_R1_3 PMD_VR_STRING_ENDPOINT_ACCEPT_R1_4\n"
if 'PMD_VR_STRING_ENDPOINT_ACCEPT_R1_4' not in s:
    if old not in s:
        raise SystemExit('ERROR: R1.3 Accept anchor not found')
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
PY

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/$CLIENT_REL"
php -l "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_API_R1_4' "$STAGE/$CLIENT_REL"
grep -Fq 'PMD_VR_STRING_ENDPOINT_ACCEPT_R1_4' "$STAGE/$CLIENT_REL"
grep -Fq 'PMD_VR_LIGHTBOX_CHECKOUT_R1_4' "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_CLIENT_R1_4' "$STAGE/frontend/client-api.ts"
grep -Fq 'PMD_VR_LIGHTBOX_RUNTIME_R1_4' "$STAGE/frontend/RuntimeOverlays.tsx"
grep -Fq "integration_preference" "$STAGE/frontend/client-api.ts"
grep -Fq "LightboxCheckoutHandler" "$STAGE/frontend/client-api.ts"
echo "STATIC_PREFLIGHT=OK"

echo "========== ISOLATED FRONTEND BUILD =========="
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
mkdir -p "$FRONT_STAGE/src/lib" "$FRONT_STAGE/src/runtime/components"
cp "$STAGE/frontend/client-api.ts" "$FRONT_STAGE/$FRONT_CLIENT_REL"
cp "$STAGE/frontend/RuntimeOverlays.tsx" "$FRONT_STAGE/$FRONT_RUNTIME_REL"
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 13; }
for marker in PMD_VR_LIGHTBOX_CLIENT_R1_4 PMD_VR_LIGHTBOX_RUNTIME_R1_4; do
  grep -Rsl --binary-files=text "$marker" "$FRONT_STAGE/.next" >/dev/null 2>&1 || { echo "ERROR: compiled frontend missing $marker"; exit 14; }
done
echo "FRONTEND_BUILD=OK"

echo "========== BACKUP =========="
sudo mkdir -p "$BACKUP/backend/$(dirname "$CLIENT_REL")" "$BACKUP/backend/$(dirname "$SERVICE_REL")" "$BACKUP/frontend/src/lib" "$BACKUP/frontend/src/runtime/components"
sudo cp -a "$ROOT/$CLIENT_REL" "$BACKUP/backend/$CLIENT_REL"
sudo cp -a "$ROOT/$SERVICE_REL" "$BACKUP/backend/$SERVICE_REL"
sudo cp -a "$FRONT_ROOT/$FRONT_CLIENT_REL" "$BACKUP/frontend/$FRONT_CLIENT_REL"
sudo cp -a "$FRONT_ROOT/$FRONT_RUNTIME_REL" "$BACKUP/frontend/$FRONT_RUNTIME_REL"
if [ -d "$FRONT_ROOT/.next" ]; then sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"; fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! VR R1.4 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/backend/$CLIENT_REL" "$ROOT/$CLIENT_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/backend/$SERVICE_REL" "$ROOT/$SERVICE_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/frontend/$FRONT_CLIENT_REL" "$FRONT_ROOT/$FRONT_CLIENT_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/frontend/$FRONT_RUNTIME_REL" "$FRONT_ROOT/$FRONT_RUNTIME_REL" 2>/dev/null || true
  if [ "$FRONT_ACTIVATED" = "1" ]; then
    sudo rm -rf "$FRONT_ROOT/.next"
    if [ -d "$BACKUP/frontend-next.previous" ]; then
      sudo cp -a "$BACKUP/frontend-next.previous" "$FRONT_ROOT/.next"
      sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
    fi
    sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env >/dev/null 2>&1 || true
  fi
  cd "$ROOT"
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo "========== INSTALL BACKEND =========="
sudo install -m 0644 "$STAGE/$CLIENT_REL" "$ROOT/$CLIENT_REL"
sudo install -m 0644 "$STAGE/$SERVICE_REL" "$ROOT/$SERVICE_REL"
php -l "$ROOT/$CLIENT_REL"
php -l "$ROOT/$SERVICE_REL"

echo "========== INSTALL FRONTEND V2 =========="
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend/client-api.ts" "$FRONT_ROOT/$FRONT_CLIENT_REL"
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend/RuntimeOverlays.tsx" "$FRONT_ROOT/$FRONT_RUNTIME_REL"
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1

echo "========== CLEAR CACHE + RESTART =========="
cd "$ROOT"
sudo -u www-data php artisan optimize:clear
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 3
STATUS="$(sudo -u ubuntu -H pm2 jlist | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin); name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", ""))); break
')"
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 15; }
echo "FRONTEND_STATUS=$STATUS"

echo "========== MOON VR TRUTH CHECK =========="
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
$tenant = DB::connection('mysql')->table('tenants')->where('domain','moon.paymydine.com')->first();
if (!$tenant || empty($tenant->database)) { echo "MOON_TENANT=NOT_FOUND\n"; exit(2); }
$cfg=config('database.connections.mysql'); $cfg['database']=(string)$tenant->database;
Config::set('database.connections.pmd_vr_r14',$cfg); DB::purge('pmd_vr_r14'); DB::reconnect('pmd_vr_r14');
Config::set('database.default','pmd_vr_r14'); DB::setDefaultConnection('pmd_vr_r14');
$service=new VRPaymentGatewayService();
$result=$service->probeConnectivity();
echo 'MOON_DATABASE='.DB::connection()->getDatabaseName().PHP_EOL;
echo 'MOON_CONNECTED='.(($result['connected']??false)?'YES':'NO').PHP_EOL;
echo 'MOON_METHODS='.json_encode($result['available_method_codes']??[],JSON_UNESCAPED_SLASHES).PHP_EOL;
echo 'MOON_TERMINAL_COUNT='.(int)($result['terminal_count']??0).PHP_EOL;
foreach(['card','wero','apple_pay','google_pay'] as $code){
  $row=Payments_model::query()->where('code',$code)->first();
  if(!$row){echo strtoupper($code).'=MISSING'.PHP_EOL; continue;}
  $data=method_exists($row,'getConfigData')?(array)$row->getConfigData():(array)$row->data;
  $provider=strtolower(trim((string)($row->provider_code??$data['provider_code']??'')));
  echo strtoupper($code).'_PROVIDER='.($provider?:'-').PHP_EOL;
  echo strtoupper($code).'_STATUS='.(int)$row->status.PHP_EOL;
}
PHP

echo "========== HTTP SMOKE =========="
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$FRONT_URL" || true)"
echo "FRONTEND_HTTP=$FRONT_HTTP"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 16; }

trap - EXIT

echo "============================================================"
echo " SUCCESS - VR PAYMENT EMBEDDED WALLETS R1.4 INSTALLED"
echo "============================================================"
echo "VR_CARD=LIGHTBOX_WHEN_AVAILABLE__PAYMENT_PAGE_FALLBACK"
echo "VR_WERO=LIGHTBOX_WHEN_AVAILABLE__PAYMENT_PAGE_FALLBACK"
echo "VR_APPLE_PAY=RUNTIME_GATED_BY_REAL_SPACE"
echo "VR_GOOGLE_PAY=RUNTIME_GATED_BY_REAL_SPACE"
echo "VR_SETTLEMENT=BACKEND_VERIFIED_EXISTING_AUTHORITY"
echo "FAKE_WALLETS=DISABLED"
echo "SHARED_LEGACY_CHECKOUT=HOSTED_REDIRECT_UNCHANGED"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
