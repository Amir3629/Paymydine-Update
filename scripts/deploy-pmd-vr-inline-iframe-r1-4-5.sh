#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_inline_iframe_r1_4_5_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_vr_inline_iframe_r1_4_5_${STAMP}"
PATCH="scripts/patch-pmd-vr-inline-iframe-r1-4-5.py"
COMPONENT_SOURCE="scripts/vr-payment-r1/VrPaymentInlineR145.tsx"
ROUTE_REL="routes/admin-app-before.php"
SERVICE_REL="app/admin/classes/VRPaymentGatewayService.php"
FRONT_CLIENT_REL="src/lib/client-api.ts"
FRONT_RUNTIME_REL="src/runtime/components/RuntimeOverlays.tsx"
FRONT_COMPONENT_REL="src/runtime/components/VrPaymentInline.tsx"
INSTALL_STARTED=0
FRONT_ACTIVATED=0
COMPONENT_EXISTED=0

cd "$ROOT"
mkdir -p "$STAGE" "$FRONT_STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"

echo "============================================================"
echo " PAYMYDINE VR INLINE IFRAME R1.4.5"
echo " CARD/WERO INSIDE DIGITAL MENU | NO LIGHTBOX ON SELECTION"
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
FRONT_PORT="$(printf '%s' "$PM2_JSON" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin)
name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        env=row.get("pm2_env", {}) or {}
        nested=env.get("env", {}) or {}
        value=env.get("PORT") or nested.get("PORT") or ""
        print(str(value))
        break
')"
case "$FRONT_PORT" in
  ''|*[!0-9]*) FRONT_PORT=3002 ;;
esac
LOCAL_HEALTH_URL="http://127.0.0.1:${FRONT_PORT}/api/health"

[ -n "$FRONT_ROOT" ] && [ -d "$FRONT_ROOT" ] || { echo "ERROR: PM2 frontend root not found"; exit 2; }
[ -f "$FRONT_ROOT/package.json" ] || { echo "ERROR: frontend package.json missing"; exit 3; }
[ -d "$FRONT_ROOT/node_modules" ] || { echo "ERROR: frontend node_modules missing"; exit 4; }
[ -f "$ROOT/$ROUTE_REL" ] || { echo "ERROR: VR route authority missing"; exit 5; }
[ -f "$ROOT/$SERVICE_REL" ] || { echo "ERROR: VR gateway service missing"; exit 6; }
[ -f "$FRONT_ROOT/$FRONT_CLIENT_REL" ] || { echo "ERROR: frontend client-api.ts missing"; exit 7; }
[ -f "$FRONT_ROOT/$FRONT_RUNTIME_REL" ] || { echo "ERROR: frontend RuntimeOverlays.tsx missing"; exit 8; }

echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"
echo "FRONTEND_PORT=$FRONT_PORT"

echo "========== PRECHECK CURRENT VR AUTHORITY =========="
grep -Fq 'PMD_VR_CREATE_SESSION_VALIDATION_R1_4_2' "$ROOT/$ROUTE_REL" || { echo "ERROR: live R1.4.2 route authority missing"; exit 9; }
grep -Fq 'PMD_VR_TARGET_MODE_SELECTION_R1_4_3' "$ROOT/$SERVICE_REL" || { echo "ERROR: live R1.4.3 target-mode authority missing"; exit 10; }
grep -Fq 'PMD_VR_CONFIG_ID_INTERSECTION_R1_4_3' "$ROOT/$SERVICE_REL" || { echo "ERROR: live R1.4.3 method-ID authority missing"; exit 11; }
grep -Fq 'PMD_VR_LIGHTBOX_CLIENT_R1_4' "$FRONT_ROOT/$FRONT_CLIENT_REL" || { echo "ERROR: live R1.4 frontend client authority missing"; exit 12; }
grep -Fq 'PMD_VR_LIGHTBOX_RUNTIME_R1_4' "$FRONT_ROOT/$FRONT_RUNTIME_REL" || { echo "ERROR: live R1.4 frontend runtime authority missing"; exit 13; }
grep -Fq 'iframeJavascriptUrl' "$ROOT/app/Services/Payments/VrPaymentApiClient.php" || { echo "ERROR: VR iframe JavaScript API method missing"; exit 14; }
echo "CURRENT_VR_AUTHORITY=OK"

echo "========== STAGE LIVE AUTHORITIES =========="
mkdir -p "$STAGE/$(dirname "$ROUTE_REL")" "$STAGE/$(dirname "$SERVICE_REL")" "$STAGE/frontend/src/lib" "$STAGE/frontend/src/runtime/components"
cp "$ROOT/$ROUTE_REL" "$STAGE/$ROUTE_REL"
cp "$ROOT/$SERVICE_REL" "$STAGE/$SERVICE_REL"
cp "$FRONT_ROOT/$FRONT_CLIENT_REL" "$STAGE/frontend/$FRONT_CLIENT_REL"
cp "$FRONT_ROOT/$FRONT_RUNTIME_REL" "$STAGE/frontend/$FRONT_RUNTIME_REL"
git show "$REMOTE:$PATCH" > "$STAGE/patch.py"
git show "$REMOTE:$COMPONENT_SOURCE" > "$STAGE/frontend/$FRONT_COMPONENT_REL"
chmod 755 "$STAGE/patch.py"
python3 -m py_compile "$STAGE/patch.py"
python3 "$STAGE/patch.py" \
  "$STAGE/$ROUTE_REL" \
  "$STAGE/$SERVICE_REL" \
  "$STAGE/frontend/$FRONT_CLIENT_REL" \
  "$STAGE/frontend/$FRONT_RUNTIME_REL"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/$ROUTE_REL"
php -l "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_IFRAME_ROUTE_R1_4_5' "$STAGE/$ROUTE_REL"
grep -Fq 'PMD_VR_IFRAME_SERVICE_R1_4_5' "$STAGE/$SERVICE_REL"
grep -Fq 'PMD_VR_IFRAME_CLIENT_R1_4_5' "$STAGE/frontend/$FRONT_CLIENT_REL"
grep -Fq 'PMD_VR_IFRAME_RUNTIME_R1_4_5' "$STAGE/frontend/$FRONT_RUNTIME_REL"
grep -Fq 'PMD_VR_IFRAME_COMPONENT_R1_4_5' "$STAGE/frontend/$FRONT_COMPONENT_REL"
grep -Fq "'flow' => 'iframe'" "$STAGE/$SERVICE_REL"
grep -Fq "integration_preference: requestedProvider" "$STAGE/frontend/$FRONT_CLIENT_REL"
echo "STATIC_PREFLIGHT=OK"

echo "========== ISOLATED FRONTEND BUILD =========="
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
mkdir -p "$FRONT_STAGE/src/lib" "$FRONT_STAGE/src/runtime/components"
cp "$STAGE/frontend/$FRONT_CLIENT_REL" "$FRONT_STAGE/$FRONT_CLIENT_REL"
cp "$STAGE/frontend/$FRONT_RUNTIME_REL" "$FRONT_STAGE/$FRONT_RUNTIME_REL"
cp "$STAGE/frontend/$FRONT_COMPONENT_REL" "$FRONT_STAGE/$FRONT_COMPONENT_REL"
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 15; }
grep -Rsl --binary-files=text 'PMD_VR_IFRAME_COMPONENT_R1_4_5' "$FRONT_STAGE/.next" >/dev/null 2>&1 || { echo "ERROR: compiled frontend missing VR iframe component"; exit 16; }
grep -Rsl --binary-files=text 'IframeCheckoutHandler' "$FRONT_STAGE/.next" >/dev/null 2>&1 || { echo "ERROR: compiled frontend missing VR iframe handler"; exit 17; }
echo "FRONTEND_BUILD=OK"

echo "========== BACKUP =========="
sudo mkdir -p "$BACKUP/backend/$(dirname "$ROUTE_REL")" "$BACKUP/backend/$(dirname "$SERVICE_REL")" "$BACKUP/frontend/src/lib" "$BACKUP/frontend/src/runtime/components"
sudo cp -a "$ROOT/$ROUTE_REL" "$BACKUP/backend/$ROUTE_REL"
sudo cp -a "$ROOT/$SERVICE_REL" "$BACKUP/backend/$SERVICE_REL"
sudo cp -a "$FRONT_ROOT/$FRONT_CLIENT_REL" "$BACKUP/frontend/$FRONT_CLIENT_REL"
sudo cp -a "$FRONT_ROOT/$FRONT_RUNTIME_REL" "$BACKUP/frontend/$FRONT_RUNTIME_REL"
if [ -f "$FRONT_ROOT/$FRONT_COMPONENT_REL" ]; then
  COMPONENT_EXISTED=1
  sudo cp -a "$FRONT_ROOT/$FRONT_COMPONENT_REL" "$BACKUP/frontend/$FRONT_COMPONENT_REL"
fi
if [ -d "$FRONT_ROOT/.next" ]; then sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"; fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! VR INLINE IFRAME R1.4.5 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/backend/$ROUTE_REL" "$ROOT/$ROUTE_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/backend/$SERVICE_REL" "$ROOT/$SERVICE_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/frontend/$FRONT_CLIENT_REL" "$FRONT_ROOT/$FRONT_CLIENT_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/frontend/$FRONT_RUNTIME_REL" "$FRONT_ROOT/$FRONT_RUNTIME_REL" 2>/dev/null || true
  if [ "$COMPONENT_EXISTED" = "1" ]; then
    sudo cp -a "$BACKUP/frontend/$FRONT_COMPONENT_REL" "$FRONT_ROOT/$FRONT_COMPONENT_REL" 2>/dev/null || true
  else
    sudo rm -f "$FRONT_ROOT/$FRONT_COMPONENT_REL"
  fi
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
sudo install -m 0644 "$STAGE/$ROUTE_REL" "$ROOT/$ROUTE_REL"
sudo install -m 0644 "$STAGE/$SERVICE_REL" "$ROOT/$SERVICE_REL"
php -l "$ROOT/$ROUTE_REL"
php -l "$ROOT/$SERVICE_REL"

echo "========== INSTALL FRONTEND V2 =========="
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend/$FRONT_CLIENT_REL" "$FRONT_ROOT/$FRONT_CLIENT_REL"
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend/$FRONT_RUNTIME_REL" "$FRONT_ROOT/$FRONT_RUNTIME_REL"
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend/$FRONT_COMPONENT_REL" "$FRONT_ROOT/$FRONT_COMPONENT_REL"
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1

echo "========== CLEAR CACHE + RESTART =========="
cd "$ROOT"
sudo -u www-data php artisan optimize:clear || true
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 3
STATUS="$(sudo -u ubuntu -H pm2 jlist | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin); name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", ""))); break
')"
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 18; }
HTTP="$(curl -sS --max-time 10 -o "$STAGE/health.json" -w '%{http_code}' "$LOCAL_HEALTH_URL" || true)"
[ "$HTTP" = "200" ] || { echo "ERROR: local frontend health HTTP=$HTTP"; exit 19; }

echo "FRONTEND_STATUS=$STATUS"
echo "FRONTEND_LOCAL_HEALTH_HTTP=$HTTP"

echo "========== LIVE MARKERS =========="
grep -Fq 'PMD_VR_IFRAME_ROUTE_R1_4_5' "$ROOT/$ROUTE_REL"
grep -Fq 'PMD_VR_IFRAME_SERVICE_R1_4_5' "$ROOT/$SERVICE_REL"
grep -Fq 'PMD_VR_IFRAME_CLIENT_R1_4_5' "$FRONT_ROOT/$FRONT_CLIENT_REL"
grep -Fq 'PMD_VR_IFRAME_RUNTIME_R1_4_5' "$FRONT_ROOT/$FRONT_RUNTIME_REL"
grep -Fq 'PMD_VR_IFRAME_COMPONENT_R1_4_5' "$FRONT_ROOT/$FRONT_COMPONENT_REL"
echo "LIVE_MARKERS=OK"

trap - EXIT

echo "============================================================"
echo " SUCCESS - VR INLINE IFRAME R1.4.5 INSTALLED"
echo "============================================================"
echo "VR_CARD=INLINE_IFRAME_INSIDE_PMD"
echo "VR_WERO=INLINE_IFRAME_IF_PROVIDER_EXPOSES_IT"
echo "VR_CARD_LIGHTBOX_ON_SELECTION=DISABLED"
echo "VR_WERO_LIGHTBOX_ON_SELECTION=DISABLED"
echo "VR_PAYMENT_RETURN_R1_4_4=PRESERVED"
echo "VR_SETTLEMENT_AUTHORITY=UNCHANGED"
echo "REMOTE=$REMOTE_SHA"
echo "BACKUP=$BACKUP"
