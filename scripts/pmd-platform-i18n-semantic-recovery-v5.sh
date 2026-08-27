#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
REF="origin/${BRANCH}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-platform-i18n-v5-backups/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP"

echo "============================================================"
echo " PMD PLATFORM I18N SEMANTIC RECOVERY V5"
echo "============================================================"

git fetch origin "$BRANCH"

echo "[1/4] Running live-safe semantic recovery V4..."
git show "$REF:scripts/pmd-platform-i18n-semantic-recovery-v4.sh" | bash

echo "[2/4] Removing the old page-local platform payload include..."
COUPONS_VIEW="app/admin/views/pmdcoupons/index.blade.php"
COMPOSER="app/admin/assets/js/pmd-cashier-order-composer-r51.js"

[ -f "$COMPOSER" ] || { echo "ERROR=Missing $COMPOSER" >&2; exit 30; }
cp -a "$COMPOSER" "$BACKUP/pmd-cashier-order-composer-r51.js.before"
if [ -f "$COUPONS_VIEW" ]; then
  cp -a "$COUPONS_VIEW" "$BACKUP/pmdcoupons-index.blade.php.before"
fi

python3 - "$ROOT" "$TMP" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
tmp = Path(sys.argv[2])

composer = root / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
text = composer.read_text(encoding='utf-8')
if 'PMD_CASHIER_PLATFORM_I18N_V4' not in text:
    raise SystemExit('ERROR=V4 Cashier marker missing')

repls = {
    "'<span class=\"pmd-coc__eyebrow\">CASHIER · ORDER COMPOSER</span>'": "'<span class=\"pmd-coc__eyebrow\">' + esc(pmdT('cashier.order_composer', 'CASHIER · ORDER COMPOSER')) + '</span>'",
    "'<h2 id=\"pmd-coc-title\" data-coc-title>New order</h2>'": "'<h2 id=\"pmd-coc-title\" data-coc-title>' + esc(pmdT('cashier.new_order', 'New order')) + '</h2>'",
    "'<p data-coc-subtitle>Select a table and add items.</p>'": "'<p data-coc-subtitle>' + esc(pmdT('cashier.select_table_add_items', 'Select a table and add items.')) + '</p>'",
    "aria-label=\"Close\"": "aria-label=\"' + esc(pmdT('shared.close', 'Close')) + '\"",
}
for old,new in repls.items():
    if old in text:
        text = text.replace(old,new,1)

candidate = tmp / 'composer.v5.js'
candidate.write_text(text, encoding='utf-8')

coupons = root / 'app/admin/views/pmdcoupons/index.blade.php'
if coupons.is_file():
    ctext = coupons.read_text(encoding='utf-8')
    # Global common-admin payload is now the sole platform-message mount.
    ctext = ctext.replace("@include('admin::_partials.pmd_platform_messages')\n", '', 1)
    (tmp / 'coupons.v5.blade.php').write_text(ctext, encoding='utf-8')
PY

if command -v node >/dev/null 2>&1; then node --check "$TMP/composer.v5.js"; fi

grep -q "cashier.order_composer" "$TMP/composer.v5.js"
grep -q "cashier.new_order" "$TMP/composer.v5.js"
grep -q "cashier.select_table_add_items" "$TMP/composer.v5.js"

# Critical visible raw literals from the user's Cashier screenshots must no longer
# be emitted as raw HTML. Fallback literals inside pmdT(...) are intentionally OK.
for raw in \
  '>New items</' \
  '>Sent items</' \
  '<strong>No new items</strong>' \
  'Choose food from the menu.</span>' \
  'Delivery / no table</option>'
do
  if grep -Fq "$raw" "$TMP/composer.v5.js"; then
    echo "ERROR=Raw Cashier UI literal survived semantic patch: $raw" >&2
    exit 31
  fi
done

if grep -Fq 'placeholder="Add note...' "$TMP/composer.v5.js" || grep -Fq 'placeholder="Add note…' "$TMP/composer.v5.js"; then
  echo "ERROR=Raw Add note placeholder survived semantic patch" >&2
  exit 32
fi

echo "CASHIER_SCREENSHOT_COPY_ASSERTIONS_OK=1"

echo "[3/4] Installing V5 cleanup candidates..."
sudo tee "$COMPOSER" < "$TMP/composer.v5.js" >/dev/null
if [ -f "$TMP/coupons.v5.blade.php" ]; then
  sudo tee "$COUPONS_VIEW" < "$TMP/coupons.v5.blade.php" >/dev/null
fi

if command -v node >/dev/null 2>&1; then node --check "$COMPOSER"; fi
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[4/4] Final single-owner assertions..."
grep -q 'PMD_PLATFORM_MESSAGES_GLOBAL_V1' app/admin/views/_partials/pmd_admin_i18n.blade.php
grep -q 'PMD_CASHIER_PLATFORM_I18N_V4' "$COMPOSER"
grep -q 'PMD_PAYMENT_PLATFORM_I18N_V4' app/admin/assets/js/pmd-waiter-pos-payment-v3.js
grep -q 'PMD_PAYMENT_POLICY_PLATFORM_I18N_V4' app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js
if [ -f "$COUPONS_VIEW" ] && grep -Fq "@include('admin::_partials.pmd_platform_messages')" "$COUPONS_VIEW"; then
  echo "ERROR=Coupons still has a page-local platform payload include" >&2
  exit 33
fi

echo "GLOBAL_PLATFORM_MESSAGES_OK=1"
echo "CASHIER_PLATFORM_I18N_OK=1"
echo "PAYMENT_PLATFORM_I18N_OK=1"
echo "PAGE_LOCAL_PLATFORM_PAYLOAD_REMOVED=1"
echo "SEMANTIC_RECOVERY_V5_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh CashierLab in German. Verify the order card first, then open Payment."
