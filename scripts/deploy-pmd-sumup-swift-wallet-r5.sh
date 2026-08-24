#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_URL="${PMD_FRONTEND_BASE_URL:-https://a.paymydine.com}"
ADMIN_URL="${PMD_ADMIN_BASE_URL:-https://test1.paymydine.com/admin/pmdfinance}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_swift_wallet_r5_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_sumup_swift_wallet_r5_${STAMP}"
PATCH="scripts/patch-pmd-sumup-swift-wallet-r5.py"
SWIFT_REPO="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/SumupSwiftWalletPayment.tsx"
SWIFT_REL="src/runtime/components/SumupSwiftWalletPayment.tsx"
SUMUP_REL="src/runtime/components/SumupInlinePayment.tsx"
STAGED_SUMUP_REL="frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
SERVICE="app/Services/Payments/SumupOnlineCheckoutService.php"
ROUTES="app/main/routes_sumup_self_service.php"
CONTROLLER="app/admin/controllers/SumupTerminalSettings.php"
ADMIN_JS="app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
INSTALL_STARTED=0
FRONT_ACTIVATED=0

cd "$ROOT"
mkdir -p "$STAGE" "$FRONT_STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"

echo "============================================================"
echo " PAYMYDINE SUMUP SWIFT WALLETS R5"
echo " CARD=WIDGET | APPLE+GOOGLE=DEDICATED SWIFT CHECKOUT"
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
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"

echo "========== R4.1 CONTRACT PRECHECK =========="
[ -f "$ROOT/$SERVICE" ] || { echo "ERROR: SumUp service missing"; exit 5; }
[ -f "$ROOT/$ROUTES" ] || { echo "ERROR: SumUp routes missing"; exit 6; }
[ -f "$ROOT/$CONTROLLER" ] || { echo "ERROR: SumUp controller missing"; exit 7; }
[ -f "$ROOT/$ADMIN_JS" ] || { echo "ERROR: SumUp admin asset missing"; exit 8; }
[ -f "$FRONT_ROOT/$SUMUP_REL" ] || { echo "ERROR: SumUp frontend component missing"; exit 9; }
grep -Fq 'PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4' "$ROOT/$SERVICE" || { echo "ERROR: R4.1 backend discovery marker missing"; exit 10; }
grep -Fq 'PMD_SUMUP_WALLET_RUNTIME_R4' "$ROOT/$ADMIN_JS" 2>/dev/null || true
grep -Fq 'PMD_SUMUP_APPLE_DOMAIN_PREFLIGHT_R4' "$FRONT_ROOT/$SUMUP_REL" || { echo "ERROR: R4 frontend marker missing"; exit 11; }
grep -Fq 'PMD_SUMUP_WIDGET_THEME_R1' "$FRONT_ROOT/src/runtime/components/RuntimeOverlays.module.css" || { echo "ERROR: SumUp theme contract missing"; exit 12; }
echo "R4_1_CONTRACT=OK"

echo "========== STAGE R5 AUTHORITIES =========="
for f in "$PATCH" "$SWIFT_REPO"; do
  git cat-file -e "$REMOTE:$f" || { echo "ERROR: remote R5 file missing: $f"; exit 13; }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done
python3 -m py_compile "$STAGE/$PATCH"

for f in "$SERVICE" "$ROUTES" "$CONTROLLER" "$ADMIN_JS"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$ROOT/$f" "$STAGE/$f"
  echo "COPIED_LIVE: $f"
done
mkdir -p "$STAGE/$(dirname "$STAGED_SUMUP_REL")"
cp "$FRONT_ROOT/$SUMUP_REL" "$STAGE/$STAGED_SUMUP_REL"
echo "COPIED_LIVE_FRONTEND: $SUMUP_REL"

python3 "$STAGE/$PATCH" "$STAGE"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/$SERVICE"
php -l "$STAGE/$ROUTES"
php -l "$STAGE/$CONTROLLER"
node --check "$STAGE/$ADMIN_JS"
grep -Fq 'PMD_SUMUP_SWIFT_CONFIG_R5' "$STAGE/$SERVICE"
grep -Fq "Route::get('/payments/sumup/swift/config'" "$STAGE/$ROUTES"
grep -Fq "'sumup_wallet_public_key'" "$STAGE/$CONTROLLER"
grep -Fq 'SumUp Wallet Public Key' "$STAGE/$ADMIN_JS"
grep -Fq 'PMD_SUMUP_SWIFT_ROUTER_R5' "$STAGE/$STAGED_SUMUP_REL"
grep -Fq "return <SumupSwiftWalletPayment {...props} />" "$STAGE/$STAGED_SUMUP_REL"
grep -Fq 'PMD_SUMUP_SWIFT_WALLET_R5' "$STAGE/$SWIFT_REPO"
if grep -Fq "return <SumupCardWidgetPayment {...props} />" "$STAGE/$STAGED_SUMUP_REL"; then
  echo "CARD_WIDGET_ROUTE=OK"
else
  echo "ERROR: card widget route missing"
  exit 14
fi
echo "STATIC_PREFLIGHT=OK"

echo "========== ISOLATED FRONTEND BUILD =========="
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
mkdir -p "$FRONT_STAGE/$(dirname "$SUMUP_REL")"
cp "$STAGE/$STAGED_SUMUP_REL" "$FRONT_STAGE/$SUMUP_REL"
cp "$STAGE/$SWIFT_REPO" "$FRONT_STAGE/$SWIFT_REL"
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 15; }
if ! grep -Rsl --binary-files=text 'PMD_SUMUP_SWIFT_WALLET_R5' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing Swift wallet component"
  exit 16
fi
if ! grep -Rsl --binary-files=text 'PMD_SUMUP_SWIFT_ROUTER_R5' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing Swift wallet router"
  exit 17
fi
echo "FRONTEND_BUILD=OK"

echo "========== BACKUP =========="
for f in "$SERVICE" "$ROUTES" "$CONTROLLER" "$ADMIN_JS"; do
  sudo mkdir -p "$BACKUP/backend/$(dirname "$f")"
  sudo cp -a "$ROOT/$f" "$BACKUP/backend/$f"
done
sudo mkdir -p "$BACKUP/frontend/$(dirname "$SUMUP_REL")"
sudo cp -a "$FRONT_ROOT/$SUMUP_REL" "$BACKUP/frontend/$SUMUP_REL"
if [ -f "$FRONT_ROOT/$SWIFT_REL" ]; then
  sudo cp -a "$FRONT_ROOT/$SWIFT_REL" "$BACKUP/frontend/$SWIFT_REL"
  echo 1 | sudo tee "$BACKUP/had_swift_component" >/dev/null
else
  echo 0 | sudo tee "$BACKUP/had_swift_component" >/dev/null
fi
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! SUMUP SWIFT WALLETS R5 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/backend/." "$ROOT/" 2>/dev/null || true
  sudo cp -a "$BACKUP/frontend/$SUMUP_REL" "$FRONT_ROOT/$SUMUP_REL" 2>/dev/null || true
  if [ "$(cat "$BACKUP/had_swift_component" 2>/dev/null || echo 0)" = "1" ]; then
    sudo cp -a "$BACKUP/frontend/$SWIFT_REL" "$FRONT_ROOT/$SWIFT_REL" 2>/dev/null || true
  else
    sudo rm -f "$FRONT_ROOT/$SWIFT_REL"
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

echo "========== INSTALL BACKEND + ADMIN R5 =========="
for f in "$SERVICE" "$ROUTES" "$CONTROLLER" "$ADMIN_JS"; do
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done
php -l "$ROOT/$SERVICE"
php -l "$ROOT/$ROUTES"
php -l "$ROOT/$CONTROLLER"

echo "========== INSTALL FRONTEND R5 =========="
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/$STAGED_SUMUP_REL" "$FRONT_ROOT/$SUMUP_REL"
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/$SWIFT_REPO" "$FRONT_ROOT/$SWIFT_REL"
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1
echo "INSTALLED_FRONTEND_SOURCE: $SUMUP_REL"
echo "INSTALLED_FRONTEND_SOURCE: $SWIFT_REL"

echo "========== CLEAR CACHE + RESTART FRONTEND V2 =========="
cd "$ROOT"
sudo -u www-data php artisan optimize:clear
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 3
STATUS="$(sudo -u ubuntu -H pm2 jlist | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin)
name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", "")))
        break
')"
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 18; }
echo "FRONTEND_STATUS=$STATUS"

echo "========== HTTP SMOKE =========="
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$FRONT_URL" || true)"
ADMIN_HEADERS="$STAGE/admin.headers"
ADMIN_HTTP="$(curl -ksS -D "$ADMIN_HEADERS" -o /dev/null -w '%{http_code}' "$ADMIN_URL" || true)"
SWIFT_HTTP="$(curl -ksS -o "$STAGE/swift-config.json" -w '%{http_code}' "${FRONT_URL%/}/api/v1/payments/sumup/swift/config" || true)"
echo "FRONTEND_HTTP=$FRONT_HTTP"
echo "ADMIN_HTTP=$ADMIN_HTTP"
echo "SWIFT_CONFIG_HTTP=$SWIFT_HTTP"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 19; }
if [ "$ADMIN_HTTP" != "200" ] && [ "$ADMIN_HTTP" != "302" ]; then
  echo "ERROR: admin smoke failed"
  exit 20
fi
if [ "$ADMIN_HTTP" = "302" ]; then
  ADMIN_LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/{sub(/\r$/,""); print $2; exit}' "$ADMIN_HEADERS")"
  echo "ADMIN_LOCATION=$ADMIN_LOCATION"
  case "$ADMIN_LOCATION" in
    *"/admin/login"*) echo "ADMIN_SMOKE=protected_route_redirect_ok" ;;
    *) echo "ERROR: unexpected admin redirect"; exit 21 ;;
  esac
fi
# Before the restaurant saves sup_pk_, 422 is expected. After it is configured,
# this endpoint becomes 200. Any 404/500 here means the R5 route is broken.
if [ "$SWIFT_HTTP" != "200" ] && [ "$SWIFT_HTTP" != "422" ]; then
  echo "ERROR: Swift config route returned unexpected HTTP $SWIFT_HTTP"
  cat "$STAGE/swift-config.json" || true
  exit 22
fi
if [ "$SWIFT_HTTP" = "200" ]; then
  echo "SUMUP_WALLET_PUBLIC_KEY=CONFIGURED"
else
  echo "SUMUP_WALLET_PUBLIC_KEY=NEEDS_SUP_PK_IN_PMD"
fi

trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP SWIFT WALLETS R5 INSTALLED"
echo "============================================================"
echo "CARD_WALLET_ENGINE=SumUp_Payment_Widget"
echo "APPLE_PAY_ENGINE=SumUp_Swift_Checkout"
echo "GOOGLE_PAY_ENGINE=SumUp_Swift_Checkout"
echo "APPLE_PAY_CARD_FIELDS=IMPOSSIBLE_BY_ROUTING"
echo "GOOGLE_PAY_CARD_FIELDS=IMPOSSIBLE_BY_ROUTING"
echo "SWIFT_SDK=https://js.sumup.com/swift-checkout/v1/sdk.js"
echo "SWIFT_CONFIG_ENDPOINT=/api/v1/payments/sumup/swift/config"
echo "WALLET_AVAILABILITY=canMakePayment+availablePaymentMethods"
echo "WALLET_PUBLIC_KEY=restaurant_sup_pk_required"
echo "APPLE_DOMAIN_FILE=existing_PMD_managed_flow_kept"
echo "GOOGLE_MERCHANT_INFO=existing_PMD_fields_kept"
echo "DATABASE_MIGRATIONS=none"
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
