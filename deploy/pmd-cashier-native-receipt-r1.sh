#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-moon.paymydine.com}"
BRANCH="feature/cashier-desktop-universal-v1"
INVOICE_REL="app/admin/views/orders/customer_invoice.blade.php"
DEVICES_REL="app/admin/views/pmddevices/index.blade.php"
PATCH_REL="deploy/pmd-cashier-native-receipt-r1-patch.py"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview"
RELEASE_FILES=(
  "PayMyDine-Cashier-Setup-1.0.2.exe"
  "PayMyDine-Cashier-1.0.2-mac-arm64.dmg"
  "PayMyDine-Cashier-1.0.2-mac-x64.dmg"
)

cd "$ROOT"
[[ -d .git ]] || { echo "REFUSED: PayMyDine root missing" >&2; exit 1; }
[[ -f "$INVOICE_REL" ]] || { echo "REFUSED: live customer invoice view missing" >&2; exit 1; }
[[ -f "$DEVICES_REL" ]] || { echo "REFUSED: live Devices view missing" >&2; exit 1; }

HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-native-receipt-r1-stage.XXXXXX)"
BACKUP="$(mktemp -d /tmp/pmd-native-receipt-r1-backup.XXXXXX)"
ACTIVATED=0

cleanup() { rm -rf "$STAGE" "$BACKUP"; }
rollback() {
  set +e
  echo "AUTOMATIC PMD CASHIER NATIVE RECEIPT R1 ROLLBACK"
  for rel in "$INVOICE_REL" "$DEVICES_REL"; do
    if [[ -f "$BACKUP/$rel" ]]; then
      cp -a "$BACKUP/$rel" "$ROOT/$rel"
    fi
  done
  php artisan view:clear >/dev/null 2>&1 || true
  echo "PMD CASHIER NATIVE RECEIPT R1 ROLLBACK COMPLETE"
}
on_exit() {
  rc=$?
  if [[ $rc -ne 0 && "$ACTIVATED" == 1 ]]; then rollback; fi
  cleanup
  exit $rc
}
trap on_exit EXIT

health_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || true
}

install_preserve() {
  local src="$1" dst="$2" uid gid mode
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  install -o "$uid" -g "$gid" -m "$mode" "$src" "$dst"
}

echo "============================================================"
echo "PMD CASHIER NATIVE RECEIPT R1"
echo "DESKTOP V1.0.2 + BROWSER FALLBACK"
echo "============================================================"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

echo
echo "== PRE-DEPLOY HEALTH =="
ADMIN_BEFORE="$(health_code "https://$TEST_HOST/admin")"
ROOT_BEFORE="$(health_code "https://$TEST_HOST/")"
echo "admin=$ADMIN_BEFORE root=$ROOT_BEFORE"
[[ "$ADMIN_BEFORE" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: admin pre-health failed" >&2; exit 1; }
[[ "$ROOT_BEFORE" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: root pre-health failed" >&2; exit 1; }

echo
echo "== REQUIRE PUBLISHED V1.0.2 RELEASE FILES =="
for name in "${RELEASE_FILES[@]}"; do
  code="$(curl -L -sS -o /dev/null -w '%{http_code}' "$RELEASE_BASE/$name" || true)"
  echo "$name HTTP=$code"
  [[ "$code" == "200" ]] || { echo "REFUSED: V1.0.2 release asset is not ready: $name" >&2; exit 1; }
done

echo
echo "== FETCH REVIEWED PATCH WITHOUT MOVING LIVE HEAD =="
git fetch origin "$BRANCH"
mkdir -p "$STAGE/$(dirname "$PATCH_REL")" "$STAGE/$(dirname "$INVOICE_REL")" "$STAGE/$(dirname "$DEVICES_REL")"
git show "FETCH_HEAD:$PATCH_REL" > "$STAGE/$PATCH_REL"
cp -a "$INVOICE_REL" "$STAGE/$INVOICE_REL"
cp -a "$DEVICES_REL" "$STAGE/$DEVICES_REL"

echo
echo "== PATCH LIVE-AUTHORITY VIEWS =="
python3 "$STAGE/$PATCH_REL" "$STAGE/$INVOICE_REL" "$STAGE/$DEVICES_REL"

echo
echo "== CONTRACT + SYNTAX =="
python3 -m py_compile "$STAGE/$PATCH_REL"
php -l "$STAGE/$INVOICE_REL"
php -l "$STAGE/$DEVICES_REL"
grep -q 'PMD_CASHIER_NATIVE_RECEIPT_R1' "$STAGE/$INVOICE_REL"
grep -q 'printReceiptUrl' "$STAGE/$INVOICE_REL"
grep -q 'window.print()' "$STAGE/$INVOICE_REL"
grep -q 'PayMyDine-Cashier-Setup-1.0.2.exe' "$STAGE/$DEVICES_REL"
grep -q 'PayMyDine-Cashier-1.0.2-mac-arm64.dmg' "$STAGE/$DEVICES_REL"
grep -q 'PayMyDine-Cashier-1.0.2-mac-x64.dmg' "$STAGE/$DEVICES_REL"

INVOICE_STAGE_SHA="$(sha256sum "$STAGE/$INVOICE_REL" | awk '{print $1}')"
DEVICES_STAGE_SHA="$(sha256sum "$STAGE/$DEVICES_REL" | awk '{print $1}')"
echo "INVOICE_STAGE_SHA=$INVOICE_STAGE_SHA"
echo "DEVICES_STAGE_SHA=$DEVICES_STAGE_SHA"

echo
echo "== BACKUP LIVE VIEWS =="
for rel in "$INVOICE_REL" "$DEVICES_REL"; do
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp -a "$rel" "$BACKUP/$rel"
done

echo
echo "== ACTIVATE TWO VIEW FILES ONLY =="
install_preserve "$STAGE/$INVOICE_REL" "$INVOICE_REL"
install_preserve "$STAGE/$DEVICES_REL" "$DEVICES_REL"
ACTIVATED=1
php artisan view:clear >/dev/null

echo
echo "== POST-DEPLOY FILE PROOF =="
INVOICE_LIVE_SHA="$(sha256sum "$INVOICE_REL" | awk '{print $1}')"
DEVICES_LIVE_SHA="$(sha256sum "$DEVICES_REL" | awk '{print $1}')"
echo "INVOICE_LIVE_SHA=$INVOICE_LIVE_SHA"
echo "DEVICES_LIVE_SHA=$DEVICES_LIVE_SHA"
[[ "$INVOICE_LIVE_SHA" == "$INVOICE_STAGE_SHA" ]] || { echo "REFUSED: live invoice view differs from staged bytes" >&2; exit 1; }
[[ "$DEVICES_LIVE_SHA" == "$DEVICES_STAGE_SHA" ]] || { echo "REFUSED: live Devices view differs from staged bytes" >&2; exit 1; }

grep -q 'PMD_CASHIER_NATIVE_RECEIPT_R1' "$INVOICE_REL"
grep -q 'printReceiptUrl' "$INVOICE_REL"
grep -q 'PayMyDine-Cashier-Setup-1.0.2.exe' "$DEVICES_REL"

echo
echo "== POST-DEPLOY HEALTH =="
ADMIN_AFTER="$(health_code "https://$TEST_HOST/admin")"
ROOT_AFTER="$(health_code "https://$TEST_HOST/")"
echo "admin=$ADMIN_AFTER root=$ROOT_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: admin post-health failed" >&2; exit 1; }
[[ "$ROOT_AFTER" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: root post-health failed" >&2; exit 1; }

HEAD_AFTER="$(git rev-parse HEAD)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || { echo "REFUSED: live Git HEAD moved" >&2; exit 1; }

echo "FILES_CHANGED=2_VIEWS_ONLY"
echo "DB_CHANGES=NO"
echo "PAYMENT_BACKEND_CHANGES=NO"
echo "CASH_DRAWER_CHANGES=NO"
echo "BROWSER_PRINT_FALLBACK=PRESERVED"
echo "DESKTOP_NATIVE_RECEIPT_API=printReceiptUrl"
echo "DOWNLOAD_VERSION=1.0.2"
echo "============================================================"
echo "PMD CASHIER NATIVE RECEIPT R1 DEPLOYED"
echo "============================================================"
ACTIVATED=0
