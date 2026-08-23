#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
BASE_URL="${PMD_FRONTEND_BASE_URL:-https://test2.paymydine.com}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_guest_v2_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_sumup_guest_v2_${STAMP}"
INSTALL_STARTED=0
FRONTEND_ACTIVATED=0
FRONT_ROOT=""

BACKEND_FILES=(
  "app/Services/Payments/SumupHostedCheckoutService.php"
  "app/main/routes_sumup_self_service.php"
  "app/main/routes/sumup.php"
)

FRONTEND_FILES=(
  "features/customer-menu/checkout/paymentModalHostedCheckout.ts"
  "features/customer-menu/checkout/usePaymentReturnVerification.ts"
  "components/payment/sumup-hosted-checkout.tsx"
)

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"
: > "$STAGE/backend-new.txt"
: > "$STAGE/frontend-new.txt"

printf '%s\n' \
  "============================================================" \
  " PAYMYDINE SUMUP GUEST ONLINE FINAL - FRONTEND V2" \
  " CARD/WALLET -> SUMUP HOSTED CHECKOUT" \
  "============================================================"

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo
echo "========== STAGE CANONICAL BACKEND =========="
for f in "${BACKEND_FILES[@]}"; do
  git cat-file -e "$REMOTE:$f" || {
    echo "ERROR: remote backend file missing: $f"
    exit 2
  }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done

echo
echo "========== STAGE CANONICAL FRONTEND =========="
for f in "${FRONTEND_FILES[@]}"; do
  remote_path="frontend/$f"
  git cat-file -e "$REMOTE:$remote_path" || {
    echo "ERROR: remote frontend file missing: $remote_path"
    exit 3
  }
  mkdir -p "$STAGE/frontend/$f"
  rmdir "$STAGE/frontend/$f" 2>/dev/null || true
  mkdir -p "$STAGE/frontend/$(dirname "$f")"
  git show "$REMOTE:$remote_path" > "$STAGE/frontend/$f"
  echo "STAGED: $remote_path"
done

echo
echo "========== SOURCE PREFLIGHT =========="
php -l "$STAGE/app/Services/Payments/SumupHostedCheckoutService.php"
php -l "$STAGE/app/main/routes_sumup_self_service.php"
php -l "$STAGE/app/main/routes/sumup.php"
grep -Fq '/api/v1/payments/sumup/self-service-checkout' "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
grep -Fq 'providerCode === "sumup"' "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
grep -Fq '/api/v1/payments/sumup/self-service-status' "$STAGE/frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"
grep -Fq 'pmd_sumup_pending_checkout' "$STAGE/frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"
grep -Fq 'available_payment_methods' "$STAGE/app/Services/Payments/SumupHostedCheckoutService.php"
grep -Fq 'wallets_presented_by' "$STAGE/app/Services/Payments/SumupHostedCheckoutService.php"
grep -Fq "routes_sumup_self_service.php" "$STAGE/app/main/routes/sumup.php"
grep -Fq "routes/sumup.php" "$ROOT/app/main/routes.php"
echo "SOURCE_PREFLIGHT=OK"

echo
echo "========== DETECT ACTIVE FRONTEND V2 =========="
if ! sudo -u ubuntu -H bash -lc 'command -v pm2 >/dev/null 2>&1'; then
  echo "ERROR: PM2 is not available for ubuntu"
  exit 4
fi

PM2_JSON="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
FRONT_ROOT="$(printf '%s' "$PM2_JSON" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows = json.load(sys.stdin)
name = os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("pm_cwd", "")))
        break
')"

if [ -z "$FRONT_ROOT" ] || [ ! -d "$FRONT_ROOT" ]; then
  echo "ERROR: PM2 service $FRONT_SERVICE has no usable pm_cwd"
  exit 5
fi

FRONT_STATUS_BEFORE="$(printf '%s' "$PM2_JSON" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows = json.load(sys.stdin)
name = os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", "unknown")))
        break
')"

echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"
echo "FRONTEND_STATUS_BEFORE=$FRONT_STATUS_BEFORE"

[ -f "$FRONT_ROOT/package.json" ] || {
  echo "ERROR: package.json missing at $FRONT_ROOT"
  exit 6
}
[ -d "$FRONT_ROOT/node_modules" ] || {
  echo "ERROR: node_modules missing at $FRONT_ROOT"
  exit 7
}
[ -d "$FRONT_ROOT/features/customer-menu/checkout" ] || {
  echo "ERROR: expected customer-menu checkout source tree missing in $FRONT_ROOT"
  exit 8
}

echo
echo "========== ISOLATED FRONTEND V2 BUILD =========="
mkdir -p "$FRONT_STAGE"
tar -C "$FRONT_ROOT" \
  --exclude='./node_modules' \
  --exclude='./.next' \
  -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"

for f in "${FRONTEND_FILES[@]}"; do
  mkdir -p "$FRONT_STAGE/$(dirname "$f")"
  cp "$STAGE/frontend/$f" "$FRONT_STAGE/$f"
done

sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'

[ -d "$FRONT_STAGE/.next" ] || {
  echo "ERROR: frontend-v2 build produced no .next"
  exit 9
}

if ! grep -Rsl --binary-files=text '/api/v1/payments/sumup/self-service-checkout' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend-v2 does not contain canonical SumUp checkout endpoint"
  exit 10
fi

echo "FRONTEND_BUILD=OK"
echo "COMPILED_SUMUP_ENDPOINT=present"

echo
echo "========== BACKUP =========="
for f in "${BACKEND_FILES[@]}"; do
  if [ -e "$ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/backend/$(dirname "$f")"
    sudo cp -a "$ROOT/$f" "$BACKUP/backend/$f"
  else
    echo "$f" >> "$STAGE/backend-new.txt"
  fi
done

for f in "${FRONTEND_FILES[@]}"; do
  if [ -e "$FRONT_ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/frontend/$(dirname "$f")"
    sudo cp -a "$FRONT_ROOT/$f" "$BACKUP/frontend/$f"
  else
    echo "$f" >> "$STAGE/frontend-new.txt"
  fi
done

if [ -d "$FRONT_ROOT/.next" ]; then
  sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
sudo cp "$STAGE/backend-new.txt" "$BACKUP/backend-new.txt"
sudo cp "$STAGE/frontend-new.txt" "$BACKUP/frontend-new.txt"
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! SUMUP GUEST V2 DEPLOY FAILED - RESTORING !!!!!"

  if [ -f "$BACKUP/backend-new.txt" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] && sudo rm -f "$ROOT/$f"
    done < "$BACKUP/backend-new.txt"
  fi
  if [ -d "$BACKUP/backend" ]; then
    sudo cp -a "$BACKUP/backend/." "$ROOT/"
  fi

  if [ -f "$BACKUP/frontend-new.txt" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] && sudo rm -f "$FRONT_ROOT/$f"
    done < "$BACKUP/frontend-new.txt"
  fi
  if [ -d "$BACKUP/frontend" ]; then
    sudo cp -a "$BACKUP/frontend/." "$FRONT_ROOT/"
  fi

  if [ "$FRONTEND_ACTIVATED" = "1" ]; then
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

echo
echo "========== INSTALL CANONICAL BACKEND =========="
for f in "${BACKEND_FILES[@]}"; do
  sudo mkdir -p "$ROOT/$(dirname "$f")"
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

php -l "$ROOT/app/Services/Payments/SumupHostedCheckoutService.php"
php -l "$ROOT/app/main/routes_sumup_self_service.php"
php -l "$ROOT/app/main/routes/sumup.php"

echo
echo "========== INSTALL FRONTEND V2 SOURCE =========="
for f in "${FRONTEND_FILES[@]}"; do
  sudo mkdir -p "$FRONT_ROOT/$(dirname "$f")"
  sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend/$f" "$FRONT_ROOT/$f"
  echo "INSTALLED_FRONTEND_V2: $f"
done

echo
echo "========== ACTIVATE FRONTEND V2 BUILD =========="
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONTEND_ACTIVATED=1

if ! grep -Rsl --binary-files=text '/api/v1/payments/sumup/self-service-checkout' "$FRONT_ROOT/.next" >/dev/null 2>&1; then
  echo "ERROR: activated .next does not contain canonical SumUp endpoint"
  exit 11
fi

echo
echo "========== CLEAR LARAVEL CACHE =========="
cd "$ROOT"
sudo -u www-data php artisan optimize:clear

echo
echo "========== RESTART ONLY FRONTEND V2 =========="
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 3

PM2_AFTER="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
FRONT_STATUS_AFTER="$(printf '%s' "$PM2_AFTER" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows = json.load(sys.stdin)
name = os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", "unknown")))
        break
')"
FRONT_CWD_AFTER="$(printf '%s' "$PM2_AFTER" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows = json.load(sys.stdin)
name = os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("pm_cwd", "")))
        break
')"

echo "FRONTEND_STATUS_AFTER=$FRONT_STATUS_AFTER"
echo "FRONTEND_CWD_AFTER=$FRONT_CWD_AFTER"

[ "$FRONT_STATUS_AFTER" = "online" ] || {
  echo "ERROR: $FRONT_SERVICE is not online after restart"
  exit 12
}
[ "$FRONT_CWD_AFTER" = "$FRONT_ROOT" ] || {
  echo "ERROR: $FRONT_SERVICE cwd changed unexpectedly"
  exit 13
}

echo
echo "========== HTTP SMOKE =========="nHTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$BASE_URL/?pmd_sumup_guest_v2=$STAMP" || true)"
echo "FRONTEND_HTTP=$HTTP_CODE"
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
  echo "ERROR: $BASE_URL did not return a healthy HTTP response"
  exit 14
fi

INSTALL_STARTED=0
trap - EXIT

echo
echo "============================================================"
echo " SUCCESS - SUMUP GUEST ONLINE FRONTEND V2 INSTALLED"
echo "============================================================"
echo "GUEST_METHOD=Card/Wallet"
echo "GUEST_PROVIDER=SumUp"
echo "CHECKOUT_ENDPOINT=/api/v1/payments/sumup/self-service-checkout"
echo "RETURN_VERIFY_ENDPOINT=/api/v1/payments/sumup/self-service-status"
echo "SUMUP_SECRET_SOURCE=terminal_provider_configs"
echo "LEGACY_SECRET_MIRROR=no"
echo "HOSTED_WALLETS=SumUp_eligibility"
echo "AVAILABLE_METHOD_DISCOVERY=enabled"
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"
echo "OTHER_PM2_SERVICES=untouched"
echo "DATABASE_MIGRATIONS=none"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
