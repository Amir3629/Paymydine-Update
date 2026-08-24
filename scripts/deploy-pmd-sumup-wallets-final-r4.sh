#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_URL="${PMD_FRONTEND_BASE_URL:-https://a.paymydine.com}"
ADMIN_URL="${PMD_ADMIN_BASE_URL:-https://test1.paymydine.com/admin/pmdfinance}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_wallets_final_r4_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_sumup_wallets_final_r4_${STAMP}"
PATCH="scripts/patch-pmd-sumup-wallet-runtime-r4.py"
ADMIN_REL="app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
FRONT_REL="src/runtime/components/SumupInlinePayment.tsx"
STAGED_FRONT_REL="frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
APPLE_ROUTE_REL="app/.well-known/apple-developer-merchantid-domain-association/route.ts"
INSTALL_STARTED=0
FRONT_ACTIVATED=0

cd "$ROOT"
mkdir -p "$STAGE" "$FRONT_STAGE"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE SUMUP WALLETS FINAL R4"
echo " FAIL-CLOSED APPLE/GOOGLE + EXTENSIONLESS APPLE FILE"
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

echo "========== R3 CONTRACT PRECHECK =========="
[ -f "$ROOT/$ADMIN_REL" ] || { echo "ERROR: live SumUp wallet admin asset missing"; exit 5; }
[ -f "$FRONT_ROOT/$FRONT_REL" ] || { echo "ERROR: live SumUp frontend source missing"; exit 6; }
[ -f "$FRONT_ROOT/$APPLE_ROUTE_REL" ] || { echo "ERROR: managed Apple route missing; install R3 first"; exit 7; }
grep -Fq 'data-pmd-sumup-method={props.methodCode}' "$FRONT_ROOT/$FRONT_REL" || { echo "ERROR: strict R3 frontend marker missing"; exit 8; }
grep -Fq 'data-pmd-sumup-apple-domain-file' "$ROOT/$ADMIN_REL" || { echo "ERROR: R3 Apple upload UI missing"; exit 9; }
grep -Fq 'PMD_SUMUP_WALLET_STRICT_R2' "$ROOT/app/Services/Payments/SumupOnlineCheckoutService.php" || { echo "ERROR: strict SumUp backend missing"; exit 10; }
echo "R3_CONTRACT=OK"

echo "========== STAGE R4 PATCH =========="
git cat-file -e "$REMOTE:$PATCH" || { echo "ERROR: remote R4 patch missing"; exit 11; }
mkdir -p "$STAGE/$(dirname "$PATCH")"
git show "$REMOTE:$PATCH" > "$STAGE/$PATCH"
python3 -m py_compile "$STAGE/$PATCH"
echo "STAGED: $PATCH"

echo "========== COPY LIVE AUTHORITIES INTO STAGE =========="
mkdir -p "$STAGE/$(dirname "$ADMIN_REL")"
cp "$ROOT/$ADMIN_REL" "$STAGE/$ADMIN_REL"
mkdir -p "$STAGE/$(dirname "$STAGED_FRONT_REL")"
cp "$FRONT_ROOT/$FRONT_REL" "$STAGE/$STAGED_FRONT_REL"
echo "COPIED: $ADMIN_REL"
echo "COPIED_FRONTEND: $FRONT_REL"

python3 "$STAGE/$PATCH" "$STAGE"

echo "========== STATIC PREFLIGHT =========="
node --check "$STAGE/$ADMIN_REL"
grep -Fq 'PMD_SUMUP_APPLE_DOMAIN_PREFLIGHT_R4' "$STAGE/$STAGED_FRONT_REL"
grep -Fq 'PMD_SUMUP_WALLET_DOM_GUARD_R4' "$STAGE/$STAGED_FRONT_REL"
grep -Fq 'normalizeLoadedSumupMethods(sdkMethods)' "$STAGE/$STAGED_FRONT_REL"
grep -Fq 'showAmount: false' "$STAGE/$STAGED_FRONT_REL"
grep -Fq "data-pmd-extensionless-file', 'allowed'" "$STAGE/$ADMIN_REL"
if grep -Fq "appleFileInput.accept = '.txt,.bin" "$STAGE/$ADMIN_REL"; then
  echo "ERROR: restrictive Apple file accept filter still present"
  exit 12
fi
echo "STATIC_PREFLIGHT=OK"

echo "========== ISOLATED FRONTEND BUILD =========="
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
mkdir -p "$FRONT_STAGE/$(dirname "$FRONT_REL")"
cp "$STAGE/$STAGED_FRONT_REL" "$FRONT_STAGE/$FRONT_REL"
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 13; }
if ! grep -Rsl --binary-files=text 'PMD_SUMUP_APPLE_DOMAIN_PREFLIGHT_R4' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing Apple domain preflight marker"
  exit 14
fi
if ! grep -Rsl --binary-files=text 'PMD_SUMUP_WALLET_DOM_GUARD_R4' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing wallet DOM guard marker"
  exit 15
fi
echo "FRONTEND_BUILD=OK"

echo "========== BACKUP =========="
sudo mkdir -p "$BACKUP/$(dirname "$ADMIN_REL")"
sudo cp -a "$ROOT/$ADMIN_REL" "$BACKUP/$ADMIN_REL"
sudo mkdir -p "$BACKUP/frontend/$(dirname "$FRONT_REL")"
sudo cp -a "$FRONT_ROOT/$FRONT_REL" "$BACKUP/frontend/$FRONT_REL"
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! SUMUP WALLETS FINAL R4 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/$ADMIN_REL" "$ROOT/$ADMIN_REL" 2>/dev/null || true
  sudo cp -a "$BACKUP/frontend/$FRONT_REL" "$FRONT_ROOT/$FRONT_REL" 2>/dev/null || true
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

echo "========== INSTALL R4 AUTHORITIES =========="
sudo install -m 0644 "$STAGE/$ADMIN_REL" "$ROOT/$ADMIN_REL"
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/$STAGED_FRONT_REL" "$FRONT_ROOT/$FRONT_REL"
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1
echo "INSTALLED: $ADMIN_REL"
echo "INSTALLED_FRONTEND_SOURCE: $FRONT_REL"

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
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 16; }
echo "FRONTEND_STATUS=$STATUS"

echo "========== HTTP SMOKE =========="
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$FRONT_URL" || true)"
ADMIN_HEADERS="$STAGE/admin.headers"
ADMIN_HTTP="$(curl -ksS -D "$ADMIN_HEADERS" -o /dev/null -w '%{http_code}' "$ADMIN_URL" || true)"
APPLE_HEADERS="$STAGE/apple.headers"
APPLE_HTTP="$(curl -ksS -D "$APPLE_HEADERS" -o /dev/null -w '%{http_code}' "${FRONT_URL%/}/.well-known/apple-developer-merchantid-domain-association" || true)"
echo "FRONTEND_HTTP=$FRONT_HTTP"
echo "ADMIN_HTTP=$ADMIN_HTTP"
echo "APPLE_ROUTE_HTTP=$APPLE_HTTP"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 17; }
if [ "$ADMIN_HTTP" != "200" ] && [ "$ADMIN_HTTP" != "302" ]; then
  echo "ERROR: admin smoke failed"
  exit 18
fi
if [ "$ADMIN_HTTP" = "302" ]; then
  ADMIN_LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/{sub(/\r$/,""); print $2; exit}' "$ADMIN_HEADERS")"
  echo "ADMIN_LOCATION=$ADMIN_LOCATION"
  case "$ADMIN_LOCATION" in
    *"/admin/login"*) echo "ADMIN_SMOKE=protected_route_redirect_ok" ;;
    *) echo "ERROR: unexpected admin redirect"; exit 19 ;;
  esac
fi
if [ "$APPLE_HTTP" != "200" ] && [ "$APPLE_HTTP" != "404" ]; then
  echo "ERROR: Apple domain route returned unexpected HTTP $APPLE_HTTP"
  exit 20
fi
grep -qi '^X-PMD-Wallet-Authority: apple-pay-domain-managed-r3' "$APPLE_HEADERS" || {
  echo "ERROR: Apple route authority header missing"
  exit 21
}
if [ "$APPLE_HTTP" = "200" ]; then
  echo "APPLE_DOMAIN_FILE=HOSTED"
else
  echo "APPLE_DOMAIN_FILE=NOT_UPLOADED_YET"
fi

trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP WALLETS FINAL R4 INSTALLED"
echo "============================================================"
echo "APPLE_FILE_PICKER=extensionless_files_allowed"
echo "APPLE_DOMAIN_PREFLIGHT=required_before_widget_mount"
echo "APPLE_CARD_FALLBACK=blocked"
echo "GOOGLE_CARD_FALLBACK=blocked"
echo "SDK_CLIENT_METHOD_GUARD=enabled"
echo "WALLET_DOM_CARD_GUARD=enabled"
echo "SUMUP_DEPRECATED_AMOUNT_CONFIG=removed"
echo "CARD_WALLET=unchanged"
echo "APPLE_NEXT_EXTERNAL_STEP=register_exact_tenant_domain_in_SumUp_after_file_upload"
echo "GOOGLE_NEXT_EXTERNAL_STEP=Google_web_approval_plus_merchant_id"
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
