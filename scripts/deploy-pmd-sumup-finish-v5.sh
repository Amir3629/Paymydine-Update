#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_finish_v5_${STAMP}"
BACKUP="/var/backups/pmd_sumup_finish_v5_${STAMP}"
FRONT_ROOT="$ROOT/frontend"
FRONT_BUILD="$STAGE/frontend-build"
FRONT_SERVICE=""
ACTIVATION_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
sudo touch "$BACKUP/new-files.txt"

echo "=========================================="
echo " PAYMYDINE SUMUP FINISH V5"
echo " CASHIER + GUEST + MULTI-TENANT BRIDGE"
echo "=========================================="

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

FILES=(
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
  "app/admin/assets/css/pmd-cashier-payment-clean-v1.css"
  "app/Services/TerminalPayments/SumupTenantConnectionService.php"
  "app/Services/Payments/SumupHostedCheckoutService.php"
  "app/main/routes_sumup_self_service.php"
  "app/main/routes/sumup.php"
  "frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
  "frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"
  "frontend/components/payment/sumup-hosted-checkout.tsx"
)

echo
echo "========== STAGE FILES =========="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git cat-file -e "$REMOTE:$f" || { echo "REMOTE FILE MISSING: $f"; exit 2; }
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done

echo
echo "========== PREFLIGHT =========="
php -l "$STAGE/app/Services/TerminalPayments/SumupTenantConnectionService.php"
php -l "$STAGE/app/Services/Payments/SumupHostedCheckoutService.php"
php -l "$STAGE/app/main/routes_sumup_self_service.php"
php -l "$STAGE/app/main/routes/sumup.php"
node --check "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"

grep -q "self-service-checkout" "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
grep -q "self-service-status" "$STAGE/frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"
grep -q "Staff checkout is intentionally limited to the two actions" "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"

echo "SOURCE PREFLIGHT OK"

if [ ! -f "$FRONT_ROOT/package.json" ] || [ ! -d "$FRONT_ROOT/node_modules" ]; then
  echo "ERROR: $FRONT_ROOT is not a buildable installed frontend."
  echo "NOTHING DEPLOYED."
  exit 3
fi

if sudo -u ubuntu -H bash -lc 'command -v pm2 >/dev/null 2>&1'; then
  PM2_JSON="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
  FRONT_SERVICE="$(printf '%s' "$PM2_JSON" | FRONT_ROOT="$FRONT_ROOT" php -r '
    $rows=json_decode(stream_get_contents(STDIN), true) ?: [];
    $target=rtrim((string)getenv("FRONT_ROOT"), "/");
    foreach ($rows as $row) {
      $cwd=rtrim((string)($row["pm2_env"]["pm_cwd"] ?? ""), "/");
      if ($cwd === $target) { echo (string)($row["name"] ?? ""); exit; }
    }
  ')"
fi

if [ -z "$FRONT_SERVICE" ]; then
  echo "ERROR: Could not identify the PM2 process whose cwd is $FRONT_ROOT"
  echo "NOTHING DEPLOYED."
  echo "Run: sudo -u ubuntu -H pm2 jlist"
  exit 4
fi

echo "FRONTEND_SERVICE=$FRONT_SERVICE"

echo
echo "========== STAGED FRONTEND BUILD =========="
mkdir -p "$FRONT_BUILD"
rsync -a \
  --exclude='node_modules' \
  --exclude='.next' \
  "$FRONT_ROOT/" "$FRONT_BUILD/"

for f in \
  "features/customer-menu/checkout/paymentModalHostedCheckout.ts" \
  "features/customer-menu/checkout/usePaymentReturnVerification.ts" \
  "components/payment/sumup-hosted-checkout.tsx"; do
  mkdir -p "$FRONT_BUILD/$(dirname "$f")"
  cp "$STAGE/frontend/$f" "$FRONT_BUILD/$f"
done

ln -s "$FRONT_ROOT/node_modules" "$FRONT_BUILD/node_modules"
(
  cd "$FRONT_BUILD"
  npm run build
)

[ -d "$FRONT_BUILD/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 5; }
echo "FRONTEND BUILD OK"

echo
echo "========== BACKUP =========="
for f in "${FILES[@]}"; do
  if [ -e "$ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/files/$(dirname "$f")"
    sudo cp -a "$ROOT/$f" "$BACKUP/files/$f"
  else
    echo "$f" | sudo tee -a "$BACKUP/new-files.txt" >/dev/null
  fi
done

echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! DEPLOY FAILED - RESTORING !!!!!"

  if [ -f "$BACKUP/new-files.txt" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] && sudo rm -f "$ROOT/$f"
    done < "$BACKUP/new-files.txt"
  fi

  if [ -d "$BACKUP/files" ]; then
    sudo cp -a "$BACKUP/files/." "$ROOT/"
  fi

  if [ -d "$BACKUP/frontend-next.previous" ]; then
    sudo rm -rf "$FRONT_ROOT/.next"
    sudo mv "$BACKUP/frontend-next.previous" "$FRONT_ROOT/.next"
  fi

  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  [ -n "$FRONT_SERVICE" ] && sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env >/dev/null 2>&1 || true
  echo "RESTORED FROM: $BACKUP"
  exit "$rc"
}

trap 'rc=$?; if [ "$ACTIVATION_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
ACTIVATION_STARTED=1

echo
echo "========== INSTALL =========="
for f in "${FILES[@]}"; do
  sudo mkdir -p "$ROOT/$(dirname "$f")"
  sudo cp "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

# Swap the already-built Next.js output only after all source preflight has passed.
NEW_NEXT="$FRONT_ROOT/.next.pmd-new-$STAMP"
sudo rm -rf "$NEW_NEXT"
sudo cp -a "$FRONT_BUILD/.next" "$NEW_NEXT"
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo mv "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
sudo mv "$NEW_NEXT" "$FRONT_ROOT/.next"

echo
echo "========== CLEAR CACHE + RESTART =========="ncd "$ROOT"
php artisan optimize:clear || true
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 2

PM2_STATUS="$(sudo -u ubuntu -H pm2 jlist | FRONT_SERVICE="$FRONT_SERVICE" php -r '
  $rows=json_decode(stream_get_contents(STDIN), true) ?: [];
  foreach ($rows as $row) {
    if (($row["name"] ?? "") === getenv("FRONT_SERVICE")) {
      echo (string)($row["pm2_env"]["status"] ?? "unknown");
      exit;
    }
  }
')"

echo "FRONTEND_STATUS=$PM2_STATUS"
[ "$PM2_STATUS" = "online" ] || { echo "ERROR: frontend process is not online"; exit 6; }

echo
echo "========== RUNTIME CODE CHECK =========="ngrep -q "self-service-checkout" app/main/routes_sumup_self_service.php
grep -q "self-service-checkout" frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts
grep -q "name: 'Terminal'" app/admin/assets/js/pmd-waiter-pos-payment-v3.js
grep -q "name: 'Cash'" app/admin/assets/js/pmd-waiter-pos-payment-v3.js

echo "RUNTIME FILES OK"

ACTIVATION_STARTED=0
trap - EXIT

echo
echo "=========================================="
echo " SUCCESS - SUMUP FINISH V5 LIVE"
echo "=========================================="
echo "Cashier: Cash + Terminal only"
echo "Terminal: online selection + pre-charge recheck"
echo "Guest card: tenant SumUp Hosted Checkout"
echo "Test/Production: separate tenant credentials"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
