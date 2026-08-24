#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_wallets_final_r2_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_sumup_wallets_final_r2_${STAMP}"
PATCH="scripts/patch-pmd-sumup-wallet-strict-r2.py"
APPLE_ROUTE_REPO="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/app/.well-known/apple-developer-merchantid-domain-association/route.ts"
APPLE_ROUTE_REL="app/.well-known/apple-developer-merchantid-domain-association/route.ts"
EXPECTED_APPLE_SHA="8a333e6c0f02b6d3639325da1096b0ee1b4dbde4d33422441203eeb5c8c10735"
INSTALL_STARTED=0
FRONT_ACTIVATED=0

BACKEND_TARGETS=(
  "app/Services/Payments/SumupOnlineCheckoutService.php"
  "app/main/routes_sumup_self_service.php"
  "app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
)
FRONT_TARGETS=(
  "src/runtime/components/SumupInlinePayment.tsx"
)

cd "$ROOT"
mkdir -p "$STAGE" "$FRONT_STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"

echo "============================================================"
echo " PAYMYDINE SUMUP WALLETS FINAL R2"
echo " APPLE PAY STRICT + GOOGLE PAY STRICT + PLATFORM DOMAIN FILE"
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
[ -d "$FRONT_ROOT/node_modules" ] || { echo "ERROR: frontend node_modules missing"; exit 3; }
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"

echo "========== STAGE PATCH + APPLE AUTHORITY =========="
for f in "$PATCH" "$APPLE_ROUTE_REPO"; do
  git cat-file -e "$REMOTE:$f" || { echo "ERROR: remote file missing: $f"; exit 4; }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done
python3 -m py_compile "$STAGE/$PATCH"

DECODED_APPLE_SHA="$(node - "$STAGE/$APPLE_ROUTE_REPO" <<'NODE'
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const src = fs.readFileSync(process.argv[2], 'utf8');
const m = src.match(/ASSOCIATION_GZIP_BASE64\s*=\s*'([^']+)'/);
if (!m) process.exit(12);
const body = zlib.gunzipSync(Buffer.from(m[1], 'base64'));
process.stdout.write(crypto.createHash('sha256').update(body).digest('hex'));
NODE
)"
[ "$DECODED_APPLE_SHA" = "$EXPECTED_APPLE_SHA" ] || {
  echo "ERROR: embedded Apple association payload mismatch"
  echo "EXPECTED=$EXPECTED_APPLE_SHA"
  echo "ACTUAL=$DECODED_APPLE_SHA"
  exit 5
}
echo "APPLE_ASSOCIATION_PAYLOAD_SHA256=$DECODED_APPLE_SHA"

echo "========== COPY LIVE AUTHORITIES INTO STAGE =========="
for f in "${BACKEND_TARGETS[@]}"; do
  [ -f "$ROOT/$f" ] || { echo "ERROR: live target missing: $f"; exit 6; }
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$ROOT/$f" "$STAGE/$f"
  echo "COPIED: $f"
done
for f in "${FRONT_TARGETS[@]}"; do
  [ -f "$FRONT_ROOT/$f" ] || { echo "ERROR: live frontend target missing: $f"; exit 7; }
  mkdir -p "$STAGE/frontend-v2/$(dirname "$f")"
  cp "$FRONT_ROOT/$f" "$STAGE/frontend-v2/$f"
  echo "COPIED_FRONTEND: $f"
done

python3 "$STAGE/$PATCH" "$STAGE"

echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/app/Services/Payments/SumupOnlineCheckoutService.php"
php -l "$STAGE/app/main/routes_sumup_self_service.php"
grep -Fq 'PMD_SUMUP_WALLET_STRICT_R2' "$STAGE/app/Services/Payments/SumupOnlineCheckoutService.php"
grep -Fq "'payment_method' => ['nullable', 'string', 'in:card,apple_pay,google_pay']" "$STAGE/app/main/routes_sumup_self_service.php"
grep -Fq 'payment_method: props.methodCode' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'const requestedMethods = requestedSumupMethods(props.methodCode)' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'data-pmd-sumup-method={props.methodCode}' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'PayMyDine hosts the Apple verification file automatically' "$STAGE/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
echo "STRICT_WALLET_PREFLIGHT=OK"

echo "========== ISOLATED FRONTEND BUILD =========="
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
mkdir -p "$FRONT_STAGE/$(dirname "$APPLE_ROUTE_REL")"
cp "$STAGE/$APPLE_ROUTE_REPO" "$FRONT_STAGE/$APPLE_ROUTE_REL"
for f in "${FRONT_TARGETS[@]}"; do
  mkdir -p "$FRONT_STAGE/$(dirname "$f")"
  cp "$STAGE/frontend-v2/$f" "$FRONT_STAGE/$f"
done
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 8; }
if ! grep -Rsl --binary-files=text 'data-pmd-sumup-method' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing strict SumUp method marker"
  exit 9
fi
if ! grep -Rsl --binary-files=text 'apple-pay-domain-platform-r1' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing Apple domain route"
  exit 10
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
  echo "!!!!! SUMUP WALLETS FINAL R2 FAILED - RESTORING !!!!!"
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

echo "========== INSTALL FRONTEND + APPLE ROUTE =========="
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
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 11; }
echo "FRONTEND_STATUS=$STATUS"

check_apple_host() {
  local host="$1"
  local url="https://${host}/.well-known/apple-developer-merchantid-domain-association"
  local body="$STAGE/${host}.apple.body"
  local headers="$STAGE/${host}.apple.headers"
  local code sha
  code="$(curl -ksS --max-time 20 -D "$headers" -o "$body" -w '%{http_code}' "$url")"
  echo "${host}_APPLE_HTTP=$code"
  [ "$code" = "200" ] || return 1
  sha="$(sha256sum "$body" | awk '{print $1}')"
  echo "${host}_APPLE_SHA256=$sha"
  [ "$sha" = "$EXPECTED_APPLE_SHA" ] || return 1
  grep -qi '^X-PMD-Wallet-Authority: apple-pay-domain-platform-r1' "$headers" || return 1
}

echo "========== HTTP + WALLET AUTHORITY SMOKE =========="n
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' https://test2.paymydine.com || true)"
echo "FRONTEND_HTTP=$FRONT_HTTP"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 12; }
check_apple_host "test2.paymydine.com" || { echo "ERROR: test2 Apple domain file failed"; exit 13; }
check_apple_host "a.paymydine.com" || { echo "ERROR: a.paymydine.com Apple domain file failed"; exit 14; }

trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP WALLETS FINAL R2 INSTALLED"
echo "============================================================"
echo "CARD_WALLET=eligible_SumUp_methods_combined"
echo "STANDALONE_APPLE_PAY=apple_pay_only_no_card_fallback"
echo "STANDALONE_GOOGLE_PAY=google_pay_only_no_card_fallback"
echo "APPLE_DOMAIN_FILE=platform_managed"
echo "APPLE_OWNER_FILE_UPLOAD=not_required"
echo "GOOGLE_PAY_CODE=ready"
echo "GOOGLE_PAY_PRODUCTION=requires_Google_web_approval_and_merchant_id"
echo "WERO_SUMUP=not_supported"
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "DATABASE_MIGRATIONS=none"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
