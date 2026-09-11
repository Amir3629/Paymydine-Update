#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-tomo.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BRANCH="feature/cashier-printer-compat-v109"

INVOICE="app/admin/views/orders/customer_invoice.blade.php"
BRIDGE="app/admin/assets/js/pmd-desktop-print-bridge-v108.js"
ORDER_CENTER="app/admin/assets/js/pmd-cashier-lab-order-center.js"
PAYMENT="app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
FILES=("$INVOICE" "$BRIDGE" "$ORDER_CENTER" "$PAYMENT")
MARK="PMD_DESKTOP_PRINT_DRIVER_COMPAT_V109"

cd "$PMD_ROOT"
HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-cashier-driver-compat-v109.XXXXXX)"
BACKUP=""
ACTIVATED=0

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

refuse() {
  echo "PMD DRIVER COMPAT HOTFIX REFUSED: $1" >&2
  if [[ "$ACTIVATED" == "1" && -n "$BACKUP" ]]; then
    echo "Rolling back..."
    for relative in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$relative" ]]; then
        install -D \
          -m "$(stat -c '%a' "$BACKUP/$relative")" \
          -o "$(stat -c '%U' "$BACKUP/$relative")" \
          -g "$(stat -c '%G' "$BACKUP/$relative")" \
          "$BACKUP/$relative" "$PMD_ROOT/$relative"
      fi
    done
    php artisan view:clear >/dev/null 2>&1 || true
    systemctl reload "$PHP_FPM" >/dev/null 2>&1 || true
    echo "Rollback complete."
  fi
  exit 1
}

printf '%s\n' '============================================================'
printf '%s\n' 'PMD CASHIER V1.0.7 -> DRIVER COMPAT HOTFIX V1.0.9'
printf '%s\n' '============================================================'
echo "HEAD=$HEAD_BEFORE"
echo "BRANCH=$BRANCH_BEFORE"

ADMIN_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
echo "PRE admin=$ADMIN_CODE root=$ROOT_CODE"
[[ "$ADMIN_CODE" =~ ^[23] ]] || refuse "admin pre-health failed"
[[ "$ROOT_CODE" =~ ^[23] ]] || refuse "root pre-health failed"

for relative in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$relative" ]] || refuse "live file missing: $relative"
  mkdir -p "$STAGE/$(dirname "$relative")"
  cp -p "$PMD_ROOT/$relative" "$STAGE/$relative"
done

git fetch origin "$BRANCH" || refuse "git fetch failed"
git show "FETCH_HEAD:$BRIDGE" > "$STAGE/$BRIDGE" || refuse "could not stage V1.0.9 desktop bridge"

grep -q "$MARK" "$STAGE/$BRIDGE" || refuse "V1.0.9 bridge marker missing"
grep -q 'typeof bridge.printUrl' "$STAGE/$BRIDGE" || refuse "V1.0.7 driver fallback missing"
grep -q 'printerCompatibilityV109' "$STAGE/$BRIDGE" || refuse "V1.0.9 capability switch missing"

python3 - "$STAGE/$INVOICE" "$STAGE/$ORDER_CENTER" "$STAGE/$PAYMENT" <<'PY'
from pathlib import Path
import sys

invoice = Path(sys.argv[1])
order_center = Path(sys.argv[2])
payment = Path(sys.argv[3])

text = invoice.read_text(encoding='utf-8')
if 'pmd-desktop-print-bridge-v108.js?v=109' not in text:
    if 'pmd-desktop-print-bridge-v108.js?v=108' not in text:
        raise SystemExit('invoice desktop bridge cache-key anchor missing')
    text = text.replace(
        'pmd-desktop-print-bridge-v108.js?v=108',
        'pmd-desktop-print-bridge-v108.js?v=109',
        1,
    )
invoice.write_text(text, encoding='utf-8')

text = order_center.read_text(encoding='utf-8')
old = '        var result = await desktop.printReceiptUrl(absoluteUrl);'
new = '''        // PMD_DESKTOP_PRINT_DRIVER_COMPAT_V109\n        // Installed V1.0.7/V1.0.8: prefer the Windows/macOS driver path.\n        // V1.0.9+: let the app choose its verified printer compatibility path.\n        var printCall =\n          desktop.printerCompatibilityV109 === true\n          && typeof desktop.printReceiptUrl === 'function'\n            ? desktop.printReceiptUrl\n            : (\n                typeof desktop.printUrl === 'function'\n                  ? desktop.printUrl\n                  : desktop.printReceiptUrl\n              );\n        var result = await printCall.call(desktop, absoluteUrl);'''
if 'PMD_DESKTOP_PRINT_DRIVER_COMPAT_V109' not in text:
    if old not in text:
        raise SystemExit('order center printReceiptUrl anchor missing')
    text = text.replace(old, new, 1)
order_center.write_text(text, encoding='utf-8')

text = payment.read_text(encoding='utf-8')
old = '''          await bridge.printReceiptUrl(\n            desktopAbsoluteUrl(receiptUrl)\n          );'''
new = '''          // PMD_DESKTOP_PRINT_DRIVER_COMPAT_V109\n          var printCall =\n            bridge.printerCompatibilityV109 === true\n            && typeof bridge.printReceiptUrl === 'function'\n              ? bridge.printReceiptUrl\n              : (\n                  typeof bridge.printUrl === 'function'\n                    ? bridge.printUrl\n                    : bridge.printReceiptUrl\n                );\n          await printCall.call(\n            bridge,\n            desktopAbsoluteUrl(receiptUrl)\n          );'''
if 'PMD_DESKTOP_PRINT_DRIVER_COMPAT_V109' not in text:
    if old not in text:
        raise SystemExit('payment auto-print anchor missing')
    text = text.replace(old, new, 1)
payment.write_text(text, encoding='utf-8')
PY

php -l "$STAGE/$INVOICE" || refuse "invoice PHP syntax failed"
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/$BRIDGE" || refuse "bridge JS syntax failed"
  node --check "$STAGE/$ORDER_CENTER" || refuse "order center JS syntax failed"
  node --check "$STAGE/$PAYMENT" || refuse "payment JS syntax failed"
fi

grep -q 'pmd-desktop-print-bridge-v108.js?v=109' "$STAGE/$INVOICE" || refuse "invoice cache key was not updated"
grep -q "$MARK" "$STAGE/$ORDER_CENTER" || refuse "order center compatibility routing missing"
grep -q "$MARK" "$STAGE/$PAYMENT" || refuse "payment compatibility routing missing"

BACKUP="$PMD_ROOT/storage/app/pmd-backups/cashier-driver-compat-v109-$(date +%Y%m%d-%H%M%S)"
for relative in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$relative")"
  cp -p "$PMD_ROOT/$relative" "$BACKUP/$relative" || refuse "backup failed: $relative"
done

for relative in "${FILES[@]}"; do
  MODE="$(stat -c '%a' "$PMD_ROOT/$relative")"
  OWNER="$(stat -c '%U' "$PMD_ROOT/$relative")"
  GROUP="$(stat -c '%G' "$PMD_ROOT/$relative")"
  install -D -m "$MODE" -o "$OWNER" -g "$GROUP" \
    "$STAGE/$relative" "$PMD_ROOT/$relative" || refuse "activation failed: $relative"
done
ACTIVATED=1

php artisan view:clear >/dev/null 2>&1 || refuse "view cache clear failed"
systemctl reload "$PHP_FPM" >/dev/null 2>&1 || refuse "$PHP_FPM reload failed"

for relative in "${FILES[@]}"; do
  STAGE_SHA="$(sha256sum "$STAGE/$relative" | awk '{print $1}')"
  LIVE_SHA="$(sha256sum "$PMD_ROOT/$relative" | awk '{print $1}')"
  [[ "$STAGE_SHA" == "$LIVE_SHA" ]] || refuse "live bytes mismatch: $relative"
done

[[ "$(git rev-parse HEAD)" == "$HEAD_BEFORE" ]] || refuse "live Git HEAD moved"
[[ "$(git branch --show-current)" == "$BRANCH_BEFORE" ]] || refuse "live Git branch changed"

ADMIN_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
echo "POST admin=$ADMIN_AFTER root=$ROOT_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23] ]] || refuse "admin post-health failed"
[[ "$ROOT_AFTER" =~ ^[23] ]] || refuse "root post-health failed"

printf '%s\n' '============================================================'
printf '%s\n' 'PMD CASHIER DRIVER COMPAT HOTFIX DEPLOYED'
printf '%s\n' '============================================================'
echo "CURRENT_DESKTOP_V107_V108_DRIVER_PATH=YES"
echo "STANDALONE_INVOICE_DRIVER_PATH=YES"
echo "ORDER_CENTER_PRINT_DRIVER_PATH=YES"
echo "AUTO_RECEIPT_DRIVER_PATH=YES"
echo "V109_CAPABILITY_SWITCH_READY=YES"
echo "CASH_DRAWER_LOGIC_CHANGED=NO"
echo "PAYMENT_BACKEND_CHANGED=NO"
echo "DB_CHANGES=NO"
echo "LIVE_GIT_HEAD_MOVED=NO"
echo "BACKUP=$BACKUP"
