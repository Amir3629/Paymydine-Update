#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
MAIN_BRANCH="${PMD_MAIN_BRANCH:-main}"
MAIN_REMOTE="origin/$MAIN_BRANCH"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_lightbox_route_r1_4_2_${STAMP}"
BACKUP="/var/backups/pmd_vr_lightbox_route_r1_4_2_${STAMP}"
PATCH="scripts/patch-pmd-vr-lightbox-route-r1-4-2.py"
ROUTE_REL="routes/admin-app-before.php"
SERVICE_REL="app/admin/classes/VRPaymentGatewayService.php"
UI_REL="app/admin/views/pmdfinance/_inline_provider_form_v1.blade.php"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_PORT="${PMD_FRONTEND_PORT:-3002}"
INSTALL_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT LIGHTBOX ROUTE BRIDGE R1.4.2"
echo " REAL FORWARDING | 422 STAGE DIAGNOSTICS | ID-SAFE LIGHTBOX"
echo "============================================================"

git fetch origin "$BRANCH"
git fetch origin "$MAIN_BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
MAIN_SHA="$(git rev-parse "$MAIN_REMOTE")"
echo "REMOTE=$REMOTE_SHA"
echo "MAIN_BASELINE=$MAIN_SHA"

echo "========== PRECHECK LIVE R1.4.1 =========="
for rel in "$ROUTE_REL" "$SERVICE_REL" "$UI_REL"; do
  [ -f "$ROOT/$rel" ] || { echo "ERROR: live file missing: $rel"; exit 2; }
done
grep -Fq 'PMD_VR_LIGHTBOX_ROUTE_BRIDGE_R1_4_1' "$ROOT/$ROUTE_REL" || { echo "ERROR: R1.4.1 route bridge marker missing"; exit 3; }
grep -Fq 'PMD_VR_LIGHTBOX_CHECKOUT_R1_4' "$ROOT/$SERVICE_REL" || { echo "ERROR: R1.4 Lightbox service marker missing"; exit 4; }
grep -Fq 'PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1' "$ROOT/$SERVICE_REL" || { echo "ERROR: R1.4.1 method match marker missing"; exit 5; }
echo "R1_4_1_LIVE_CONTRACT=OK"

echo "========== STAGE LIVE AUTHORITIES =========="
for rel in "$ROUTE_REL" "$SERVICE_REL" "$UI_REL"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  cp "$ROOT/$rel" "$STAGE/$rel"
done
git show "$REMOTE:$PATCH" > "$STAGE/patch.py"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
python3 "$STAGE/patch.py" \
  "$STAGE/$ROUTE_REL" \
  "$STAGE/$SERVICE_REL" \
  "$STAGE/$UI_REL"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/$ROUTE_REL"
php -l "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_CREATE_SESSION_VALIDATION_R1_4_2' "$STAGE/$ROUTE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_ROUTE_FORWARD_R1_4_2' "$STAGE/$ROUTE_REL"
grep -Fq "'integration_preference' => (string)(\$payload['integration_preference'] ?? 'payment_page')" "$STAGE/$ROUTE_REL"
grep -Fq 'VR_PAYMENT_CREATE_SESSION_VALIDATION_FAILED_R1_4_2' "$STAGE/$ROUTE_REL"
grep -Fq 'VR_PAYMENT_CREATE_SESSION_SERVICE_FAILED_R1_4_2' "$STAGE/$ROUTE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_METHOD_ID_MATCH_R1_4_2' "$STAGE/$SERVICE_REL"
grep -Fq 'candidateMatchesSelectedMethod' "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2' "$STAGE/$UI_REL"
echo "STATIC_PREFLIGHT=OK"

echo "========== BACKUP =========="
for rel in "$ROUTE_REL" "$SERVICE_REL" "$UI_REL"; do
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
  echo "!!!!! VR R1.4.2 FAILED - RESTORING !!!!!"
  for rel in "$ROUTE_REL" "$SERVICE_REL" "$UI_REL"; do
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

echo "========== INSTALL R1.4.2 =========="
sudo install -m 0644 "$STAGE/$ROUTE_REL" "$ROOT/$ROUTE_REL"
sudo install -m 0644 "$STAGE/$SERVICE_REL" "$ROOT/$SERVICE_REL"
sudo install -m 0644 "$STAGE/$UI_REL" "$ROOT/$UI_REL"
php -l "$ROOT/$ROUTE_REL"
php -l "$ROOT/$SERVICE_REL"

cd "$ROOT"
sudo -u www-data php artisan optimize:clear
reload_php

echo "========== LIVE MARKERS =========="
grep -Fq 'PMD_VR_CREATE_SESSION_VALIDATION_R1_4_2' "$ROOT/$ROUTE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_ROUTE_FORWARD_R1_4_2' "$ROOT/$ROUTE_REL"
grep -Fq 'PMD_VR_LIGHTBOX_METHOD_ID_MATCH_R1_4_2' "$ROOT/$SERVICE_REL"
grep -Fq 'PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2' "$ROOT/$UI_REL"
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
Config::set('database.connections.pmd_vr_r142',$cfg); DB::purge('pmd_vr_r142'); DB::reconnect('pmd_vr_r142');
Config::set('database.default','pmd_vr_r142'); DB::setDefaultConnection('pmd_vr_r142');
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

trap - EXIT
echo "============================================================"
echo " SUCCESS - VR PAYMENT LIGHTBOX ROUTE BRIDGE R1.4.2 INSTALLED"
echo "============================================================"
echo "VR_LIGHTBOX_REQUEST_FIELD=FORWARDED_TO_SERVICE"
echo "VR_422=STAGE_DIAGNOSTICS_ENABLED"
echo "VR_LIGHTBOX_METHOD_SELECTION=SELECTED_METHOD_ID_ALLOWLIST"
echo "VR_CARD=LIGHTBOX_FIRST__HOSTED_FALLBACK"
echo "VR_WERO=LIGHTBOX_FIRST__HOSTED_FALLBACK"
echo "VR_APPLE_PAY=REAL_SPACE_DISCOVERY_ONLY"
echo "VR_GOOGLE_PAY=REAL_SPACE_DISCOVERY_ONLY"
echo "VR_TERMINAL=REAL_DISCOVERED_DEVICE_ONLY"
echo "NEXT_TEST_LOG=grep -E 'VR_PAYMENT_CREATE_SESSION_(REQUEST|VALIDATION_FAILED|SERVICE_FAILED)_R1_4_2|VR_PAYMENT_LIGHTBOX_(READY|FALLBACK)' storage/logs/laravel.log | tail -50"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
echo "MAIN_BASELINE=$MAIN_SHA"
