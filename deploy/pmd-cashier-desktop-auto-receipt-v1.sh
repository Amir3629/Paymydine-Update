#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-moon.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BRANCH="feature/cashier-desktop-auto-receipt-v1"

FILES=(
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
  "app/admin/assets/js/pmd-cashier-lab-order-center.js"
  "app/admin/views/orders/customer_invoice.blade.php"
  "app/admin/views/pmddevices/index.blade.php"
  "app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php"
)

log() {
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

refuse() {
  echo "PMD CASHIER DESKTOP AUTO RECEIPT V1 REFUSED: $*" >&2
  exit 1
}

http_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

healthy_code() {
  case "$1" in
    2??|3??) return 0 ;;
    *) return 1 ;;
  esac
}

cd "$ROOT" || exit 1
HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"

log "PMD CASHIER DESKTOP AUTO RECEIPT V1\nV1.0.3 - AUTO PRINT + DIRECT REPRINT + SINGLE DRAWER OWNER"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

log "1. PRE-DEPLOY HEALTH"
admin_code="$(http_code "https://${TEST_HOST}/admin")"
root_code="$(http_code "https://${TEST_HOST}/")"
echo "admin=$admin_code root=$root_code"
healthy_code "$admin_code" || refuse "admin unhealthy before deploy ($admin_code)"
healthy_code "$root_code" || refuse "root unhealthy before deploy ($root_code)"

log "2. VERIFY V1.0.3 RELEASE ASSETS EXIST"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview"
for asset in \
  "PayMyDine-Cashier-Setup-1.0.3.exe" \
  "PayMyDine-Cashier-1.0.3-mac-arm64.dmg" \
  "PayMyDine-Cashier-1.0.3-mac-x64.dmg"
do
  echo "CHECK=$asset"
  curl -fsSIL --max-time 30 "$RELEASE_BASE/$asset" >/dev/null \
    || refuse "V1.0.3 release asset is not available yet: $asset"
done

log "3. FETCH REVIEWED BRANCH WITHOUT MOVING LIVE HEAD"
git fetch origin "$BRANCH" || refuse "git fetch failed"
SOURCE_COMMIT="$(git rev-parse FETCH_HEAD)"
echo "SOURCE_COMMIT=$SOURCE_COMMIT"

stage="$(mktemp -d /tmp/pmd-cashier-auto-receipt-stage.XXXXXX)"
backup="/var/backups/pmd-cashier-auto-receipt-v1-$(date +%Y%m%d_%H%M%S)"
patcher="$stage/pmd-cashier-desktop-auto-receipt-v1-patch.py"
activated=0

cleanup() {
  rm -rf "$stage"
}
trap cleanup EXIT

rollback() {
  if [[ "$activated" != "1" ]]; then
    return 0
  fi
  echo "AUTOMATIC PMD CASHIER DESKTOP AUTO RECEIPT V1 ROLLBACK"
  for rel in "${FILES[@]}"; do
    if [[ -f "$backup/$rel" ]]; then
      mkdir -p "$ROOT/$(dirname "$rel")"
      cp -a "$backup/$rel" "$ROOT/$rel"
    fi
  done
  (cd "$ROOT" && php artisan optimize:clear >/dev/null 2>&1 || true)
  systemctl reload "$PHP_FPM" >/dev/null 2>&1 || true
  echo "PMD CASHIER DESKTOP AUTO RECEIPT V1 ROLLBACK COMPLETE"
}

post_fail() {
  echo "PMD CASHIER DESKTOP AUTO RECEIPT V1 REFUSED: $*" >&2
  rollback
  exit 1
}

log "4. STAGE LIVE-AUTHORITY FILES"
for rel in "${FILES[@]}"; do
  [[ -f "$ROOT/$rel" ]] || refuse "live authority missing: $rel"
  mkdir -p "$stage/$(dirname "$rel")"
  cp -a "$ROOT/$rel" "$stage/$rel"
done

git show "FETCH_HEAD:deploy/pmd-cashier-desktop-auto-receipt-v1-patch.py" > "$patcher" \
  || refuse "patcher missing from reviewed branch"
python3 -m py_compile "$patcher" || refuse "patcher syntax failed"

log "5. PATCH STAGED LIVE AUTHORITIES"
python3 "$patcher" "$stage" || refuse "source patch failed"

log "6. CONTRACT + SYNTAX"
node --check "$stage/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" \
  || refuse "payment JS syntax failed"
node --check "$stage/app/admin/assets/js/pmd-cashier-lab-order-center.js" \
  || refuse "order-center JS syntax failed"
php -l "$stage/app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php" \
  || refuse "drawer bridge PHP syntax failed"
php -l "$stage/app/admin/views/orders/customer_invoice.blade.php" \
  || refuse "invoice Blade PHP syntax failed"
php -l "$stage/app/admin/views/pmddevices/index.blade.php" \
  || refuse "devices Blade PHP syntax failed"

grep -q 'PMD_DESKTOP_AUTO_RECEIPT_R1' "$stage/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" \
  || refuse "auto receipt marker missing"
grep -q 'desktop_hardware_managed: !!desktopBridge()' "$stage/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" \
  || refuse "desktop hardware flag missing"
grep -q 'PMD_DESKTOP_DIRECT_PRINT_R1' "$stage/app/admin/assets/js/pmd-cashier-lab-order-center.js" \
  || refuse "direct print marker missing"
grep -q 'printCurrentDocument: printDocument' "$stage/app/admin/assets/js/pmd-cashier-lab-order-center.js" \
  || refuse "manual reprint API missing"
grep -q 'PMD_DESKTOP_INVOICE_REPRINT_R1' "$stage/app/admin/views/orders/customer_invoice.blade.php" \
  || refuse "invoice desktop reprint marker missing"
grep -q 'window.print();' "$stage/app/admin/views/orders/customer_invoice.blade.php" \
  || refuse "browser print fallback missing"
grep -q 'PMD_DESKTOP_HARDWARE_OWNER_R1' "$stage/app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php" \
  || refuse "single drawer owner marker missing"
grep -q "skipped('desktop_hardware_managed')" "$stage/app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php" \
  || refuse "server drawer skip missing"
grep -q 'PMD_CASHIER_DESKTOP_DOWNLOADS_V103' "$stage/app/admin/views/pmddevices/index.blade.php" \
  || refuse "V1.0.3 download marker missing"
grep -q 'PayMyDine-Cashier-Setup-1.0.3.exe' "$stage/app/admin/views/pmddevices/index.blade.php" \
  || refuse "V1.0.3 Windows download missing"

echo "AUTO_PRINT_CONTRACT=PASS"
echo "DIRECT_REPRINT_CONTRACT=PASS"
echo "SINGLE_DRAWER_OWNER_CONTRACT=PASS"
echo "BROWSER_PRINT_FALLBACK=PASS"
echo "V103_DOWNLOAD_CONTRACT=PASS"

log "7. BACKUP LIVE FILES"
mkdir -p "$backup"
for rel in "${FILES[@]}"; do
  mkdir -p "$backup/$(dirname "$rel")"
  cp -a "$ROOT/$rel" "$backup/$rel"
done
echo "BACKUP=$backup"

log "8. ACTIVATE REVIEWED FILES"
for rel in "${FILES[@]}"; do
  cp -a "$stage/$rel" "$ROOT/$rel"
done
activated=1

(cd "$ROOT" && php artisan optimize:clear >/dev/null) \
  || post_fail "artisan optimize:clear failed"
systemctl reload "$PHP_FPM" \
  || post_fail "${PHP_FPM} reload failed"

log "9. POST-DEPLOY STATIC ASSET BYTE PROOF"
for rel in \
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js" \
  "app/admin/assets/js/pmd-cashier-lab-order-center.js"
do
  local_sha="$(sha256sum "$ROOT/$rel" | awk '{print $1}')"
  served_file="$(mktemp /tmp/pmd-served.XXXXXX)"
  url="https://${TEST_HOST}/${rel}?pmdautoreceipt=$(date +%s%N)"
  if ! curl -k -fsSL --max-time 30 "$url" -o "$served_file"; then
    rm -f "$served_file"
    post_fail "could not fetch served asset: $rel"
  fi
  served_sha="$(sha256sum "$served_file" | awk '{print $1}')"
  rm -f "$served_file"
  echo "$rel"
  echo "LOCAL : $local_sha"
  echo "SERVED: $served_sha"
  [[ "$local_sha" == "$served_sha" ]] \
    || post_fail "served bytes do not match live file: $rel"
done

log "10. POST-DEPLOY CORE + FILE CONTRACT"
admin_after="$(http_code "https://${TEST_HOST}/admin")"
root_after="$(http_code "https://${TEST_HOST}/")"
echo "admin=$admin_after root=$root_after"
healthy_code "$admin_after" || post_fail "admin unhealthy after deploy ($admin_after)"
healthy_code "$root_after" || post_fail "root unhealthy after deploy ($root_after)"

grep -q 'PMD_DESKTOP_AUTO_RECEIPT_R1' "$ROOT/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" \
  || post_fail "live auto receipt marker missing"
grep -q 'PMD_DESKTOP_DIRECT_PRINT_R1' "$ROOT/app/admin/assets/js/pmd-cashier-lab-order-center.js" \
  || post_fail "live direct print marker missing"
grep -q 'PMD_DESKTOP_INVOICE_REPRINT_R1' "$ROOT/app/admin/views/orders/customer_invoice.blade.php" \
  || post_fail "live invoice reprint marker missing"
grep -q 'PMD_DESKTOP_HARDWARE_OWNER_R1' "$ROOT/app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php" \
  || post_fail "live hardware owner marker missing"
grep -q 'PayMyDine-Cashier-Setup-1.0.3.exe' "$ROOT/app/admin/views/pmddevices/index.blade.php" \
  || post_fail "live V1.0.3 download link missing"

HEAD_AFTER="$(git rev-parse HEAD)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] \
  || post_fail "live Git HEAD moved"

activated=0

log "PMD CASHIER DESKTOP AUTO RECEIPT V1 DEPLOYED"
echo "DESKTOP_APP_VERSION=1.0.3"
echo "AUTO_PRINT_AFTER_SUCCESS=YES"
echo "CASH_PAYMENT=PRINT_ONCE_PLUS_DRAWER_ONCE"
echo "CARD_PAYMENT=PRINT_ONCE_NO_DRAWER"
echo "MANUAL_PRINT_REPRINT=YES"
echo "BROWSER_PRINT_DIALOG_FALLBACK=YES"
echo "SERVER_LEGACY_DRAWER_QUEUE_IN_DESKTOP=SKIPPED"
echo "DB_CHANGES=NO"
echo "ROUTE_CHANGES=NO"
echo "LIVE_GIT_HEAD_MOVED=NO"
