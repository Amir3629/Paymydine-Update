#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
MAIN_BRANCH="${PMD_MAIN_BRANCH:-main}"
MAIN_REMOTE="origin/$MAIN_BRANCH"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_lightbox_route_r1_4_1_${STAMP}"
BACKUP="/var/backups/pmd_vr_lightbox_route_r1_4_1_${STAMP}"
PATCH="scripts/patch-pmd-vr-lightbox-route-r1-4-1.py"
ROUTE_REL="routes/admin-app-before.php"
SERVICE_REL="app/admin/classes/VRPaymentGatewayService.php"
FINANCE_REL="app/admin/controllers/Pmdfinance.php"
VIEW_REL="app/admin/views/pmdfinance/index.blade.php"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_PORT="${PMD_FRONTEND_PORT:-3002}"
INSTALL_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT LIGHTBOX ROUTE BRIDGE R1.4.1"
echo " VALIDATED REQUEST BRIDGE | EXACT METHOD MATCH | ADMIN TRUTH"
echo "============================================================"

git fetch origin "$BRANCH"
git fetch origin "$MAIN_BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
MAIN_SHA="$(git rev-parse "$MAIN_REMOTE")"
echo "REMOTE=$REMOTE_SHA"
echo "MAIN_BASELINE=$MAIN_SHA"

echo "========== PRECHECK LIVE R1.4 =========="
for rel in "$ROUTE_REL" "$SERVICE_REL" "$FINANCE_REL" "$VIEW_REL"; do
  [ -f "$ROOT/$rel" ] || { echo "ERROR: live file missing: $rel"; exit 2; }
done
grep -Fq 'PMD_VR_LIGHTBOX_CHECKOUT_R1_4' "$ROOT/$SERVICE_REL" || { echo "ERROR: R1.4 Lightbox service is not installed"; exit 3; }
grep -Fq 'PMD_VR_METHOD_STATUS_SYNC_R1_3' "$ROOT/$SERVICE_REL" || { echo "ERROR: R1.3 method runtime truth marker missing"; exit 4; }
FRONT_ROOT="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin); name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str((row.get("pm2_env", {}) or {}).get("pm_cwd", ""))); break
' 2>/dev/null || true)"
if [ -n "$FRONT_ROOT" ] && [ -f "$FRONT_ROOT/src/lib/client-api.ts" ]; then
  grep -Fq 'PMD_VR_LIGHTBOX_CLIENT_R1_4' "$FRONT_ROOT/src/lib/client-api.ts" || { echo "ERROR: frontend R1.4 Lightbox client marker missing"; exit 5; }
fi
echo "R1_4_LIVE_CONTRACT=OK"

echo "========== STAGE LIVE AUTHORITIES =========="
for rel in "$ROUTE_REL" "$SERVICE_REL" "$FINANCE_REL" "$VIEW_REL"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  cp "$ROOT/$rel" "$STAGE/$rel"
done
git show "$REMOTE:$PATCH" > "$STAGE/patch.py"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
python3 "$STAGE/patch.py" \
  "$STAGE/$ROUTE_REL" \
  "$STAGE/$SERVICE_REL" \
  "$STAGE/$FINANCE_REL" \
  "$STAGE/$VIEW_REL"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/$ROUTE_REL"
php -l "$STAGE/$SERVICE_REL"
php -l "$STAGE/$FINANCE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_ROUTE_BRIDGE_R1_4_1' "$STAGE/$ROUTE_REL"
grep -Fq "integration_preference' => 'nullable|string|in:lightbox,embedded,payment_page'" "$STAGE/$ROUTE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1' "$STAGE/$SERVICE_REL"
grep -Fq '$candidateCode === $method' "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_ADMIN_TRUTH_R1_4_1' "$STAGE/$FINANCE_REL"
grep -Fq "'lightbox' => 'Lightbox (embedded overlay)'" "$STAGE/$FINANCE_REL"
grep -Fq 'PMD_VR_METHOD_RUNTIME_TRUTH_UI_R1_4_1' "$STAGE/$VIEW_REL"
echo "STATIC_PREFLIGHT=OK"

echo "========== BACKUP =========="
for rel in "$ROUTE_REL" "$SERVICE_REL" "$FINANCE_REL" "$VIEW_REL"; do
  sudo mkdir -p "$BACKUP/$(dirname "$rel")"
  sudo cp -a "$ROOT/$rel" "$BACKUP/$rel"
done
echo "BACKUP=$BACKUP"

reload_php() {
  if systemctl list-unit-files 2>/dev/null | grep -Fq 'php8.3-fpm.service'; then
    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
  fi
}

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! VR R1.4.1 FAILED - RESTORING !!!!!"
  for rel in "$ROUTE_REL" "$SERVICE_REL" "$FINANCE_REL" "$VIEW_REL"; do
    sudo cp -a "$BACKUP/$rel" "$ROOT/$rel" 2>/dev/null || true
  done
  cd "$ROOT"
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  reload_php
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo "========== INSTALL R1.4.1 =========="
sudo install -m 0644 "$STAGE/$ROUTE_REL" "$ROOT/$ROUTE_REL"
sudo install -m 0644 "$STAGE/$SERVICE_REL" "$ROOT/$SERVICE_REL"
sudo install -m 0644 "$STAGE/$FINANCE_REL" "$ROOT/$FINANCE_REL"
sudo install -m 0644 "$STAGE/$VIEW_REL" "$ROOT/$VIEW_REL"
php -l "$ROOT/$ROUTE_REL"
php -l "$ROOT/$SERVICE_REL"
php -l "$ROOT/$FINANCE_REL"

cd "$ROOT"
sudo -u www-data php artisan optimize:clear
reload_php

echo "========== LIVE MARKERS =========="
grep -Fq 'PMD_VR_LIGHTBOX_ROUTE_BRIDGE_R1_4_1' "$ROOT/$ROUTE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1' "$ROOT/$SERVICE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_ADMIN_TRUTH_R1_4_1' "$ROOT/$FINANCE_REL"
grep -Fq 'PMD_VR_METHOD_RUNTIME_TRUTH_UI_R1_4_1' "$ROOT/$VIEW_REL"
echo "LIVE_MARKERS=OK"

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
Config::set('database.connections.pmd_vr_r141',$cfg); DB::purge('pmd_vr_r141'); DB::reconnect('pmd_vr_r141');
Config::set('database.default','pmd_vr_r141'); DB::setDefaultConnection('pmd_vr_r141');
$result=(new VRPaymentGatewayService())->probeConnectivity();
echo 'MOON_DATABASE='.DB::connection()->getDatabaseName().PHP_EOL;
echo 'MOON_CONNECTED='.(($result['connected']??false)?'YES':'NO').PHP_EOL;
echo 'MOON_METHODS='.json_encode($result['available_method_codes']??[],JSON_UNESCAPED_SLASHES).PHP_EOL;
echo 'MOON_TERMINAL_COUNT='.(int)($result['terminal_count']??0).PHP_EOL;
foreach(['card','wero','apple_pay','google_pay'] as $code){
  $row=Payments_model::query()->where('code',$code)->first();
  if(!$row){echo strtoupper($code).'=MISSING'.PHP_EOL; continue;}
  echo strtoupper($code).'_PROVIDER='.strtolower(trim((string)($row->provider_code??''))).PHP_EOL;
  echo strtoupper($code).'_STATUS='.(int)$row->status.PHP_EOL;
}
PHP

echo "========== FRONTEND HEALTH =========="
FRONT_STATUS="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin); name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str((row.get("pm2_env", {}) or {}).get("status", ""))); break
' 2>/dev/null || true)"
echo "FRONTEND_STATUS=$FRONT_STATUS"
[ "$FRONT_STATUS" = "online" ] || { echo "ERROR: frontend is not online"; exit 20; }
HEALTH_FILE="$STAGE/health.json"
HEALTH_HTTP="$(curl -sS --max-time 10 -o "$HEALTH_FILE" -w '%{http_code}' "http://127.0.0.1:${FRONT_PORT}/api/health" || true)"
echo "FRONTEND_HEALTH_HTTP=$HEALTH_HTTP"
[ "$HEALTH_HTTP" = "200" ] || { echo "ERROR: frontend health failed"; exit 21; }

echo "========== APPLE PAY DOMAIN FILE CHECK =========="
APPLE_FILE="$ROOT/storage/app/pmd-wallets/apple-pay/moon.paymydine.com.bin"
if [ -s "$APPLE_FILE" ]; then
  echo "MOON_APPLE_DOMAIN_FILE=PRESENT"
else
  echo "MOON_APPLE_DOMAIN_FILE=MISSING_OR_EMPTY"
fi

trap - EXIT
echo "============================================================"
echo " SUCCESS - VR PAYMENT LIGHTBOX ROUTE BRIDGE R1.4.1 INSTALLED"
echo "============================================================"
echo "VR_LIGHTBOX_REQUEST_FIELD=PRESERVED_BY_ROUTE_VALIDATION"
echo "VR_LIGHTBOX_METHOD_SELECTION=EXACT_METHOD_ONLY"
echo "VR_CARD=LIGHTBOX_REQUESTED"
echo "VR_WERO=LIGHTBOX_REQUESTED"
echo "VR_APPLE_PAY=REAL_SPACE_DISCOVERY_ONLY"
echo "VR_GOOGLE_PAY=REAL_SPACE_DISCOVERY_ONLY"
echo "VR_TERMINAL=REAL_DISCOVERED_DEVICE_ONLY"
echo "NEXT_TEST_LOG='grep -E VR_PAYMENT_LIGHTBOX_(READY|FALLBACK) storage/logs/laravel.log | tail -20'"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
echo "MAIN_BASELINE=$MAIN_SHA"
