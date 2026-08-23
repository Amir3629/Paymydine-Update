#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
BASE_URL="${PMD_BASE_URL:-https://milano.paymydine.com}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_sandbox_pairing_${STAMP}"
BACKUP="/var/backups/pmd_sumup_sandbox_pairing_${STAMP}"
INSTALL_STARTED=0

FILES=(
  "app/admin/controllers/SumupCloudReaderController.php"
  "routes/terminal-payments.php"
  "app/admin/assets/js/pmd-sumup-self-service-v1.js"
  "app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
)

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
: > "$STAGE/existed.txt"

printf '%s\n' \
  "============================================================" \
  " PAYMYDINE SUMUP SANDBOX PAIRING FINAL" \
  " VERIFY TEST/LIVE MERCHANT + PRESERVE PROVIDER ERRORS" \
  "============================================================"

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo
echo "========== STAGE AUTHORITIES =========="
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
php -l "$STAGE/app/admin/controllers/SumupCloudReaderController.php"
php -l "$STAGE/routes/terminal-payments.php"
node --check "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"

echo
echo "========== PREFLIGHT PRODUCT CONTRACT =========="
grep -Fq "SumupCloudReaderController::class, 'pair'" "$STAGE/routes/terminal-payments.php"
grep -Fq "SumupCloudReaderController::class, 'sync'" "$STAGE/routes/terminal-payments.php"
grep -Fq "'/v1/merchants/'" "$STAGE/app/admin/controllers/SumupCloudReaderController.php"
grep -Fq "Virtual Solo can only pair with a Sandbox Merchant Account" "$STAGE/app/admin/controllers/SumupCloudReaderController.php"
grep -Fq "provider_status" "$STAGE/app/admin/controllers/SumupCloudReaderController.php"
grep -Fq "state.message = error && error.message" "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
grep -Fq '#payment-providers>.pmd-owner-card>.pmd-owner-card__header>.pmd-owner-card__icon{display:none!important}' "$STAGE/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
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
  echo "!!!!! DEPLOY FAILED - RESTORING SUMUP PAIRING FILES !!!!!"

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
php -l "$ROOT/app/admin/controllers/SumupCloudReaderController.php"
php -l "$ROOT/routes/terminal-payments.php"
node --check "$ROOT/app/admin/assets/js/pmd-sumup-self-service-v1.js"
grep -Fq "SumupCloudReaderController::class, 'pair'" "$ROOT/routes/terminal-payments.php"
grep -Fq "Virtual Solo can only pair with a Sandbox Merchant Account" "$ROOT/app/admin/controllers/SumupCloudReaderController.php"
grep -Fq '#payment-providers>.pmd-owner-card>.pmd-owner-card__header>.pmd-owner-card__icon{display:none!important}' "$ROOT/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
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
  code="$(curl -L -sS -o "$output" -w '%{http_code}' "$BASE_URL$path?pmd_sumup_sandbox=$AUDIT_TS" || true)"
  echo "$path HTTP=$code"
  if [ "$code" != "200" ]; then
    echo "ERROR: served asset returned HTTP $code: $path"
    return 1
  fi
  grep -Fq "$pattern" "$output"
}

check_asset "/app/admin/assets/js/pmd-sumup-self-service-v1.js" "Could not verify the SumUp terminal environment" "$STAGE/served-sumup.js"
check_asset "/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css" "#payment-providers>.pmd-owner-card>.pmd-owner-card__header>.pmd-owner-card__icon" "$STAGE/served-provider.css"
echo "SERVED_ASSETS=OK"

INSTALL_STARTED=0
trap - EXIT

echo
echo "============================================================"
echo " SUCCESS - SUMUP SANDBOX PAIRING AUTHORITY INSTALLED"
echo "============================================================"
echo "TEST_ENVIRONMENT=must_be_sumup_sandbox"
echo "PRODUCTION_ENVIRONMENT=must_be_live_merchant"
echo "VIRTUAL_SOLO_SANDBOX_GUARD=enabled"
echo "UPSTREAM_PROVIDER_STATUS=preserved"
echo "RAW_PROVIDER_ERROR_FALLBACK=enabled"
echo "REMOTE_READER_RECONCILIATION=enabled"
echo "DEVICE_PAGE_ENVIRONMENT_ERROR=visible"
echo "PAYMENT_PROVIDER_GRAY_ICON=removed"
echo "DATABASE_MIGRATIONS=none"
echo "NEXT_FRONTEND=untouched"
echo "PM2=untouched"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
