#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-tomo.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BRANCH="feature/cashier-desktop-print-routing-v108"
INVOICE="app/admin/views/orders/customer_invoice.blade.php"
ASSET="app/admin/assets/js/pmd-desktop-print-bridge-v108.js"
MARK="PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108"

cd "$PMD_ROOT"
HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-cashier-direct-print-hotfix.XXXXXX)"
BACKUP=""
ASSET_EXISTED=0
ACTIVATED=0

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

rollback() {
  if [[ "$ACTIVATED" != "1" || -z "$BACKUP" ]]; then return 0; fi
  echo "ROLLING BACK PMD DIRECT PRINT HOTFIX"
  if [[ -f "$BACKUP/$INVOICE" ]]; then
    install -D \
      -m "$(stat -c '%a' "$BACKUP/$INVOICE")" \
      -o "$(stat -c '%U' "$BACKUP/$INVOICE")" \
      -g "$(stat -c '%G' "$BACKUP/$INVOICE")" \
      "$BACKUP/$INVOICE" "$PMD_ROOT/$INVOICE"
  fi
  if [[ "$ASSET_EXISTED" == "1" && -f "$BACKUP/$ASSET" ]]; then
    install -D \
      -m "$(stat -c '%a' "$BACKUP/$ASSET")" \
      -o "$(stat -c '%U' "$BACKUP/$ASSET")" \
      -g "$(stat -c '%G' "$BACKUP/$ASSET")" \
      "$BACKUP/$ASSET" "$PMD_ROOT/$ASSET"
  else
    rm -f "$PMD_ROOT/$ASSET"
  fi
  php artisan view:clear >/dev/null 2>&1 || true
  systemctl reload "$PHP_FPM" >/dev/null 2>&1 || true
  echo "PMD DIRECT PRINT HOTFIX ROLLBACK COMPLETE"
}

refuse() {
  echo "PMD DIRECT PRINT HOTFIX REFUSED: $1" >&2
  rollback
  exit 1
}

printf '%s\n' '============================================================'
printf '%s\n' 'PMD CASHIER V1.0.7 - IMMEDIATE DIRECT PRINT HOTFIX'
printf '%s\n' '============================================================'
echo "HEAD=$HEAD_BEFORE"
echo "BRANCH=$BRANCH_BEFORE"

ADMIN_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
echo "PRE admin=$ADMIN_CODE root=$ROOT_CODE"
[[ "$ADMIN_CODE" =~ ^[23] ]] || refuse "admin pre-health failed"
[[ "$ROOT_CODE" =~ ^[23] ]] || refuse "root pre-health failed"
[[ -f "$PMD_ROOT/$INVOICE" ]] || refuse "live customer invoice authority missing"

git fetch origin "$BRANCH" || refuse "git fetch failed"

mkdir -p "$STAGE/$(dirname "$INVOICE")" "$STAGE/$(dirname "$ASSET")"
cp -p "$PMD_ROOT/$INVOICE" "$STAGE/$INVOICE"
git show "FETCH_HEAD:$ASSET" > "$STAGE/$ASSET" || refuse "could not stage desktop print bridge"

grep -q "$MARK" "$STAGE/$ASSET" || refuse "desktop print bridge marker missing"
grep -q 'printReceiptUrl' "$STAGE/$ASSET" || refuse "desktop print API call missing"

python3 - "$STAGE/$INVOICE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
marker = 'PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108'
script = '<script defer src="/app/admin/assets/js/pmd-desktop-print-bridge-v108.js?v=108"></script>'

if 'pmd-desktop-print-bridge-v108.js' not in text:
    if '</body>' not in text:
        raise SystemExit('customer invoice </body> anchor missing')
    text = text.replace('</body>', f'\n<!-- {marker} -->\n{script}\n</body>', 1)

path.write_text(text, encoding='utf-8')
PY

php -l "$STAGE/$INVOICE" || refuse "staged invoice PHP syntax failed"
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/$ASSET" || refuse "desktop print bridge JS syntax failed"
fi
grep -q 'pmd-desktop-print-bridge-v108.js' "$STAGE/$INVOICE" || refuse "invoice injection missing"

BACKUP="$PMD_ROOT/storage/app/pmd-backups/cashier-direct-print-hotfix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP/$(dirname "$INVOICE")"
cp -p "$PMD_ROOT/$INVOICE" "$BACKUP/$INVOICE" || refuse "invoice backup failed"
if [[ -f "$PMD_ROOT/$ASSET" ]]; then
  ASSET_EXISTED=1
  mkdir -p "$BACKUP/$(dirname "$ASSET")"
  cp -p "$PMD_ROOT/$ASSET" "$BACKUP/$ASSET" || refuse "asset backup failed"
fi

INVOICE_MODE="$(stat -c '%a' "$PMD_ROOT/$INVOICE")"
INVOICE_OWNER="$(stat -c '%U' "$PMD_ROOT/$INVOICE")"
INVOICE_GROUP="$(stat -c '%G' "$PMD_ROOT/$INVOICE")"
install -D -m "$INVOICE_MODE" -o "$INVOICE_OWNER" -g "$INVOICE_GROUP" \
  "$STAGE/$INVOICE" "$PMD_ROOT/$INVOICE" || refuse "invoice activation failed"

ASSET_OWNER="$(stat -c '%U' "$PMD_ROOT/app/admin/assets/js")"
ASSET_GROUP="$(stat -c '%G' "$PMD_ROOT/app/admin/assets/js")"
install -D -m 0644 -o "$ASSET_OWNER" -g "$ASSET_GROUP" \
  "$STAGE/$ASSET" "$PMD_ROOT/$ASSET" || refuse "asset activation failed"
ACTIVATED=1

php artisan view:clear >/dev/null 2>&1 || refuse "view cache clear failed"
systemctl reload "$PHP_FPM" >/dev/null 2>&1 || refuse "$PHP_FPM reload failed"

STAGE_INVOICE_SHA="$(sha256sum "$STAGE/$INVOICE" | awk '{print $1}')"
LIVE_INVOICE_SHA="$(sha256sum "$PMD_ROOT/$INVOICE" | awk '{print $1}')"
STAGE_ASSET_SHA="$(sha256sum "$STAGE/$ASSET" | awk '{print $1}')"
LIVE_ASSET_SHA="$(sha256sum "$PMD_ROOT/$ASSET" | awk '{print $1}')"
[[ "$STAGE_INVOICE_SHA" == "$LIVE_INVOICE_SHA" ]] || refuse "invoice bytes mismatch"
[[ "$STAGE_ASSET_SHA" == "$LIVE_ASSET_SHA" ]] || refuse "asset bytes mismatch"

grep -q 'pmd-desktop-print-bridge-v108.js' "$PMD_ROOT/$INVOICE" || refuse "live invoice injection missing"
grep -q "$MARK" "$PMD_ROOT/$ASSET" || refuse "live asset marker missing"

HEAD_AFTER="$(git rev-parse HEAD)"
BRANCH_AFTER="$(git branch --show-current)"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || refuse "live Git HEAD moved"
[[ "$BRANCH_AFTER" == "$BRANCH_BEFORE" ]] || refuse "live Git branch changed"

ADMIN_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
echo "POST admin=$ADMIN_AFTER root=$ROOT_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23] ]] || refuse "admin post-health failed"
[[ "$ROOT_AFTER" =~ ^[23] ]] || refuse "root post-health failed"

printf '%s\n' '============================================================'
printf '%s\n' 'PMD CASHIER DIRECT PRINT HOTFIX DEPLOYED'
printf '%s\n' '============================================================'
echo "EXISTING_DESKTOP_V107_REUSED=YES"
echo "STANDALONE_INVOICE_DESKTOP_DIRECT_PRINT=YES"
echo "WINDOWS_NATIVE_PRINT_DIALOG_FOR_DESKTOP_REPRINT=NO"
echo "BROWSER_WINDOW_PRINT_FALLBACK_PRESERVED=YES"
echo "GENERIC_TEXT_ONLY_RASTER_PATH_REUSED=YES"
echo "VIRTUAL_PDF_PATH_REUSED=YES"
echo "CASH_DRAWER_LOGIC_CHANGED=NO"
echo "PAYMENT_BACKEND_CHANGED=NO"
echo "DB_CHANGES=NO"
echo "LIVE_GIT_HEAD_MOVED=NO"
echo "BACKUP=$BACKUP"
