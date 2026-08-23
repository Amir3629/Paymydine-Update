#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
BASE_URL="${PMD_BASE_URL:-https://milano.paymydine.com}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_terminal_final_${STAMP}"
BACKUP="/var/backups/pmd_sumup_terminal_final_${STAMP}"
INSTALL_STARTED=0

FILES=(
  "app/admin/controllers/SumupReaderPairing.php"
  "routes/terminal-payments.php"
  "app/admin/assets/js/pmd-sumup-self-service-v1.js"
  "app/admin/assets/css/pmd-sumup-self-service-v1.css"
  "app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
  "app/admin/views/_partials/pmd_cashier_lab_current_orders_v1.blade.php"
  "app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
  "app/admin/assets/css/pmd-cashier-payment-clean-v1.css"
)

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
: > "$STAGE/existed.txt"

printf '%s\n' \
  "============================================================" \
  " PAYMYDINE SUMUP TERMINAL UX + PAIRING FINAL" \
  " CANONICAL HARDWARE FLOW + CLEAN OWNER UI" \
  "============================================================"

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo
echo "========== STAGE BRANCH AUTHORITIES =========="
for f in "${FILES[@]}"; do
  git cat-file -e "$REMOTE:$f" || {
    echo "ERROR: remote file missing: $f"
    exit 2
  }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done

echo
echo "========== PREFLIGHT SYNTAX =========="
php -l "$STAGE/app/admin/controllers/SumupReaderPairing.php"
php -l "$STAGE/routes/terminal-payments.php"
node --check "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
node --check "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"

echo
echo "========== PREFLIGHT PRODUCT CONTRACT =========="
grep -Fq "SumupReaderPairing::class, 'pair'" "$STAGE/routes/terminal-payments.php"
grep -Fq "SumupReaderPairing::class, 'sync'" "$STAGE/routes/terminal-payments.php"
grep -Fq "Cashiers and Waiters can choose between these terminals" "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
grep -Fq "readers/sync" "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
grep -Fq "pmd-sumup-head-meta" "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
! grep -Fq "pmd-ops-inline-empty-card" "$STAGE/app/admin/views/_partials/pmd_cashier_lab_current_orders_v1.blade.php"
grep -Fq ".pmd-provider-modal__summary{display:none!important}" "$STAGE/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
grep -Fq ".pmd-provider-modal-section.is-compact{display:none!important}" "$STAGE/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
grep -Fq "pmd-payment-is-preparing" "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
grep -Fq "pmd-payment-is-preparing" "$STAGE/app/admin/assets/css/pmd-cashier-payment-clean-v1.css"
grep -Fq "pairing code is no longer active" "$STAGE/app/admin/controllers/SumupReaderPairing.php"
echo "PRODUCT_CONTRACT=OK"

echo
echo "========== BACKUP LIVE TARGETS =========="
for f in "${FILES[@]}"; do
  if [ -e "$ROOT/$f" ]; then
    echo "$f" >> "$STAGE/existed.txt"
    sudo mkdir -p "$BACKUP/files/$(dirname "$f")"
    sudo cp -a "$ROOT/$f" "$BACKUP/files/$f"
  fi
done
sudo cp "$STAGE/existed.txt" "$BACKUP/existed.txt"
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! DEPLOY FAILED - RESTORING SUMUP TERMINAL FILES !!!!!"

  for f in "${FILES[@]}"; do
    if grep -Fxq "$f" "$BACKUP/existed.txt" 2>/dev/null; then
      sudo mkdir -p "$ROOT/$(dirname "$f")"
      sudo cp -a "$BACKUP/files/$f" "$ROOT/$f"
    else
      sudo rm -f "$ROOT/$f"
    fi
  done

  cd "$ROOT"
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}

trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo
echo "========== INSTALL CANONICAL FILES =========="
for f in "${FILES[@]}"; do
  sudo mkdir -p "$ROOT/$(dirname "$f")"
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

echo
echo "========== LIVE STATIC VALIDATION =========="
php -l "$ROOT/app/admin/controllers/SumupReaderPairing.php"
php -l "$ROOT/routes/terminal-payments.php"
node --check "$ROOT/app/admin/assets/js/pmd-sumup-self-service-v1.js"
node --check "$ROOT/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
grep -Fq "SumupReaderPairing::class, 'pair'" "$ROOT/routes/terminal-payments.php"
grep -Fq "Cashiers and Waiters can choose between these terminals" "$ROOT/app/admin/assets/js/pmd-sumup-self-service-v1.js"
! grep -Fq "pmd-ops-inline-empty-card" "$ROOT/app/admin/views/_partials/pmd_cashier_lab_current_orders_v1.blade.php"
grep -Fq "pmd-payment-is-preparing" "$ROOT/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
echo "LIVE_STATIC=OK"

echo
echo "========== CLEAR SERVER CACHE =========="
cd "$ROOT"
if sudo -u www-data php artisan optimize:clear; then
  echo "LARAVEL_CACHE_CLEAR=www-data"
else
  echo "WARN: www-data cache clear failed; trying current user"
  php artisan optimize:clear || true
fi

echo
echo "========== NGINX-SERVED ASSET CHECK =========="
AUDIT_TS="$(date +%s)"
check_asset() {
  local path="$1"
  local pattern="$2"
  local output="$3"
  local code
  code="$(curl -L -sS -o "$output" -w '%{http_code}' "$BASE_URL$path?pmd_sumup_final=$AUDIT_TS" || true)"
  echo "$path HTTP=$code"
  if [ "$code" != "200" ]; then
    echo "ERROR: served asset returned HTTP $code: $path"
    return 1
  fi
  grep -Fq "$pattern" "$output"
}

check_asset "/app/admin/assets/js/pmd-sumup-self-service-v1.js" "Cashiers and Waiters can choose" "$STAGE/served-sumup.js"
check_asset "/app/admin/assets/css/pmd-sumup-self-service-v1.css" "pmd-sumup-head-meta" "$STAGE/served-sumup.css"
check_asset "/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css" ".pmd-provider-modal__summary{display:none!important}" "$STAGE/served-provider.css"
check_asset "/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js" "pmd-payment-is-preparing" "$STAGE/served-policy.js"
check_asset "/app/admin/assets/css/pmd-cashier-payment-clean-v1.css" "pmd-payment-is-preparing" "$STAGE/served-payment.css"
echo "SERVED_ASSETS=OK"

INSTALL_STARTED=0
trap - EXIT

echo
echo "============================================================"
echo " SUCCESS - SUMUP TERMINAL UX + PAIRING FINAL INSTALLED"
echo "============================================================"
echo "CASHIER_NO_ORDERS_CARD=removed"
echo "SUMUP_PROVIDER_MODAL=decluttered"
echo "SUMUP_PROVIDER_FONTS=readable"
echo "SUMUP_DEVICES_CONNECTION_DUPLICATE=removed"
echo "SUMUP_DEVICE_TOP_META=environment+merchant"
echo "TERMINAL_HELPER=Cashiers+Waiters"
echo "PAIRING_CODE_NORMALIZATION=enabled"
echo "REMOTE_READER_RECONCILIATION=enabled"
echo "PAIRING_PROVIDER_ERRORS=actionable"
echo "PAYMENT_OPEN_BLINK=removed"
echo "NEXT_FRONTEND=untouched"
echo "PM2=untouched"
echo "DATABASE_MIGRATIONS=none"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
