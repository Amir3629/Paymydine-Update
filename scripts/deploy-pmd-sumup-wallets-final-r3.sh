#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_URL="${PMD_FRONTEND_BASE_URL:-https://test2.paymydine.com}"
ADMIN_URL="${PMD_ADMIN_BASE_URL:-https://test1.paymydine.com/admin/pmdfinance}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_wallets_final_r3_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_sumup_wallets_final_r3_${STAMP}"
STRICT_PATCH="scripts/patch-pmd-sumup-wallet-strict-r2.py"
APPLE_PATCH="scripts/patch-pmd-sumup-apple-domain-managed-r3.py"
APPLE_ROUTE_REPO="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/app/.well-known/apple-developer-merchantid-domain-association/route.ts"
APPLE_ROUTE_REL="app/.well-known/apple-developer-merchantid-domain-association/route.ts"
INSTALL_STARTED=0
FRONT_ACTIVATED=0

BACKEND_TARGETS=(
  "app/Services/Payments/SumupOnlineCheckoutService.php"
  "app/main/routes_sumup_self_service.php"
  "app/admin/controllers/SumupTerminalSettings.php"
  "app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
  "routes/terminal-payments.php"
)
FRONT_TARGETS=(
  "src/runtime/components/SumupInlinePayment.tsx"
)

cd "$ROOT"
mkdir -p "$STAGE" "$FRONT_STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"

echo "============================================================"
echo " PAYMYDINE SUMUP WALLETS FINAL R3"
echo " STRICT APPLE/GOOGLE + PMD-MANAGED APPLE DOMAIN FILE"
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

echo "========== STAGE PATCHES + NEXT APPLE ROUTE =========="
for f in "$STRICT_PATCH" "$APPLE_PATCH" "$APPLE_ROUTE_REPO"; do
  git cat-file -e "$REMOTE:$f" || { echo "ERROR: remote file missing: $f"; exit 5; }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done
python3 -m py_compile "$STAGE/$STRICT_PATCH" "$STAGE/$APPLE_PATCH"
if grep -Fq 'ASSOCIATION_GZIP_BASE64' "$STAGE/$APPLE_ROUTE_REPO"; then
  echo "ERROR: obsolete embedded Apple gzip payload is still present"
  exit 6
fi
grep -Fq 'apple-pay-domain-managed-r3' "$STAGE/$APPLE_ROUTE_REPO"
grep -Fq "storage', 'app', 'pmd-wallets', 'apple-pay'" "$STAGE/$APPLE_ROUTE_REPO"
echo "APPLE_ROUTE_SOURCE=tenant_managed"

echo "========== COPY LIVE AUTHORITIES INTO STAGE =========="
for f in "${BACKEND_TARGETS[@]}"; do
  [ -f "$ROOT/$f" ] || { echo "ERROR: live backend target missing: $f"; exit 7; }
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$ROOT/$f" "$STAGE/$f"
  echo "COPIED: $f"
done
for f in "${FRONT_TARGETS[@]}"; do
  [ -f "$FRONT_ROOT/$f" ] || { echo "ERROR: live frontend target missing: $f"; exit 8; }
  mkdir -p "$STAGE/frontend-v2/$(dirname "$f")"
  cp "$FRONT_ROOT/$f" "$STAGE/frontend-v2/$f"
  echo "COPIED_FRONTEND: $f"
done

python3 "$STAGE/$STRICT_PATCH" "$STAGE"
python3 "$STAGE/$APPLE_PATCH" "$STAGE"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/app/Services/Payments/SumupOnlineCheckoutService.php"
php -l "$STAGE/app/main/routes_sumup_self_service.php"
php -l "$STAGE/app/admin/controllers/SumupTerminalSettings.php"
php -l "$STAGE/routes/terminal-payments.php"
grep -Fq 'PMD_SUMUP_WALLET_STRICT_R2' "$STAGE/app/Services/Payments/SumupOnlineCheckoutService.php"
grep -Fq "'payment_method' => ['nullable', 'string', 'in:card,apple_pay,google_pay']" "$STAGE/app/main/routes_sumup_self_service.php"
grep -Fq 'payment_method: props.methodCode' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'const requestedMethods = requestedSumupMethods(props.methodCode)' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'data-pmd-sumup-method={props.methodCode}' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'public function saveApplePayDomainFile' "$STAGE/app/admin/controllers/SumupTerminalSettings.php"
grep -Fq 'sumup/apple-pay-domain-file' "$STAGE/routes/terminal-payments.php"
grep -Fq 'Upload & verify Apple Pay file' "$STAGE/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
echo "STATIC_PREFLIGHT=OK"

echo "========== ISOLATED FRONTEND BUILD =========="
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
for f in "${FRONT_TARGETS[@]}"; do
  mkdir -p "$FRONT_STAGE/$(dirname "$f")"
  cp "$STAGE/frontend-v2/$f" "$FRONT_STAGE/$f"
done
mkdir -p "$FRONT_STAGE/$(dirname "$APPLE_ROUTE_REL")"
cp "$STAGE/$APPLE_ROUTE_REPO" "$FRONT_STAGE/$APPLE_ROUTE_REL"
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 9; }
if ! grep -Rsl --binary-files=text 'data-pmd-sumup-method' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing strict SumUp wallet marker"
  exit 10
fi
if ! grep -Rsl --binary-files=text 'apple-pay-domain-managed-r3' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing managed Apple domain route"
  exit 11
fi
echo "FRONTEND_BUILD=OK"

echo "========== BACKUP =========="
for f in "${BACKEND_TARGETS[@]}"; do
  sudo mkdir -p "$BACKUP/backend/$(dirname "$f")"
  sudo cp -a "$ROOT/$f" "$BACKUP/backend/$f"
done
for f in "${FRONT_TARGETS[@]}"; do
  sudo mkdir -p "$BACKUP/frontend/$(dirname "$f")"
  sudo cp -a "$FRONT_ROOT/$f" "$BACKUP/frontend/$f"
done
LIVE_APPLE_ROUTE="$FRONT_ROOT/$APPLE_ROUTE_REL"
if [ -f "$LIVE_APPLE_ROUTE" ]; then
  sudo mkdir -p "$BACKUP/frontend/$(dirname "$APPLE_ROUTE_REL")"
  sudo cp -a "$LIVE_APPLE_ROUTE" "$BACKUP/frontend/$APPLE_ROUTE_REL"
  echo 1 | sudo tee "$BACKUP/had_apple_route" >/dev/null
else
  echo 0 | sudo tee "$BACKUP/had_apple_route" >/dev/null
fi
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! SUMUP WALLETS FINAL R3 FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/backend/." "$ROOT/" 2>/dev/null || true
  sudo cp -a "$BACKUP/frontend/." "$FRONT_ROOT/" 2>/dev/null || true
  if [ "$(cat "$BACKUP/had_apple_route" 2>/dev/null || echo 0)" = "0" ]; then
    sudo rm -f "$LIVE_APPLE_ROUTE"
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

echo "========== INSTALL BACKEND + ADMIN =========="
for f in "${BACKEND_TARGETS[@]}"; do
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done
php -l "$ROOT/app/Services/Payments/SumupOnlineCheckoutService.php"
php -l "$ROOT/app/main/routes_sumup_self_service.php"
php -l "$ROOT/app/admin/controllers/SumupTerminalSettings.php"
php -l "$ROOT/routes/terminal-payments.php"

echo "========== INSTALL FRONTEND + MANAGED APPLE ROUTE =========="
for f in "${FRONT_TARGETS[@]}"; do
  sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend-v2/$f" "$FRONT_ROOT/$f"
  echo "INSTALLED_FRONTEND_SOURCE: $f"
done
sudo mkdir -p "$(dirname "$LIVE_APPLE_ROUTE")"
sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/$APPLE_ROUTE_REPO" "$LIVE_APPLE_ROUTE"
echo "INSTALLED_APPLE_ROUTE=$LIVE_APPLE_ROUTE"
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1

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
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 12; }
echo "FRONTEND_STATUS=$STATUS"

echo "========== HTTP SMOKE =========="
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$FRONT_URL" || true)"
ADMIN_HEADERS="$STAGE/admin.headers"
ADMIN_HTTP="$(curl -ksS -D "$ADMIN_HEADERS" -o /dev/null -w '%{http_code}' "$ADMIN_URL" || true)"
echo "FRONTEND_HTTP=$FRONT_HTTP"
echo "ADMIN_HTTP=$ADMIN_HTTP"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 13; }
if [ "$ADMIN_HTTP" != "200" ] && [ "$ADMIN_HTTP" != "302" ]; then
  echo "ERROR: admin smoke failed"
  exit 14
fi
if [ "$ADMIN_HTTP" = "302" ]; then
  ADMIN_LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/{sub(/\r$/,""); print $2; exit}' "$ADMIN_HEADERS")"
  echo "ADMIN_LOCATION=$ADMIN_LOCATION"
  case "$ADMIN_LOCATION" in
    *"/admin/login"*) echo "ADMIN_SMOKE=protected_route_redirect_ok" ;;
    *) echo "ERROR: unexpected admin redirect"; exit 15 ;;
  esac
fi

APPLE_HEADERS="$STAGE/apple.headers"
APPLE_BODY="$STAGE/apple.body"
APPLE_HTTP="$(curl -ksS -D "$APPLE_HEADERS" -o "$APPLE_BODY" -w '%{http_code}' "${FRONT_URL%/}/.well-known/apple-developer-merchantid-domain-association" || true)"
echo "APPLE_ROUTE_HTTP=$APPLE_HTTP"
if [ "$APPLE_HTTP" != "200" ] && [ "$APPLE_HTTP" != "404" ]; then
  echo "ERROR: managed Apple route returned unexpected HTTP $APPLE_HTTP"
  exit 16
fi
grep -qi '^X-PMD-Wallet-Authority: apple-pay-domain-managed-r3' "$APPLE_HEADERS" || {
  echo "ERROR: managed Apple route authority header missing"
  exit 17
}
if [ "$APPLE_HTTP" = "200" ]; then
  echo "APPLE_DOMAIN_FILE=already_configured"
else
  echo "APPLE_DOMAIN_FILE=awaiting_owner_upload_in_PMD"
fi

trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP WALLETS FINAL R3 INSTALLED"
echo "============================================================"
echo "STANDALONE_APPLE_PAY=apple_pay_only_no_card_fallback"
echo "STANDALONE_GOOGLE_PAY=google_pay_only_no_card_fallback"
echo "CARD_WALLET=eligible_SumUp_methods_combined"
echo "APPLE_DOMAIN_FILE_OWNER_WORKFLOW=upload_inside_PMD"
echo "APPLE_VPS_UPLOAD=not_required"
echo "APPLE_PUBLIC_ROUTE=/.well-known/apple-developer-merchantid-domain-association"
echo "GOOGLE_PAY_CODE=ready"
echo "GOOGLE_PAY_PRODUCTION=requires_Google_web_approval_and_merchant_id"
echo "WERO_SUMUP=not_supported"
echo "DATABASE_MIGRATIONS=none"
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
