#!/usr/bin/env bash
set -euo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-owner-simple-r1"
INLINE="app/admin/views/pmddevices/_inline_modal_form.blade.php"
PARTIAL="app/admin/views/pmddevices/_cash_drawer_simple_form.blade.php"
STAMP="$(date +%Y%m%d_%H%M%S)"

cd "$PMD_ROOT"

echo "============================================================"
echo "PMD CASH DRAWER OWNER SIMPLE R1"
echo "VIEW-ONLY DEPLOY"
echo "============================================================"
echo "HEAD: $(git rev-parse HEAD)"
echo

echo "== FETCH REVIEWED UI =="
git fetch origin "$BRANCH"
git show "FETCH_HEAD:$PARTIAL" > /tmp/pmd-cash-drawer-simple-form.blade.php
git show "FETCH_HEAD:deploy/pmd-cash-drawer-owner-simple-r1.py" > /tmp/pmd-cash-drawer-owner-simple-r1.py
python3 -m py_compile /tmp/pmd-cash-drawer-owner-simple-r1.py

echo
echo "== STAGE LIVE-AUTHORITY INLINE MODAL =="
cp "$INLINE" /tmp/pmd-inline-modal-form.blade.php
python3 /tmp/pmd-cash-drawer-owner-simple-r1.py /tmp/pmd-inline-modal-form.blade.php

grep -q 'PMD_CASH_DRAWER_OWNER_SIMPLE_R1_INCLUDE' /tmp/pmd-inline-modal-form.blade.php
grep -q 'PMD_CASH_DRAWER_OWNER_SIMPLE_R1' /tmp/pmd-cash-drawer-simple-form.blade.php

echo
echo "== VERIFY OWNER UI CONTRACT =="
if grep -q 'Legacy POS device mapping' /tmp/pmd-inline-modal-form.blade.php; then
  echo "REFUSED: legacy POS field is still visible in inline modal"
  exit 1
fi
if grep -q 'USB vendor ID' /tmp/pmd-inline-modal-form.blade.php; then
  echo "REFUSED: USB vendor field is still visible in inline modal"
  exit 1
fi
if grep -q '<h3>Technical connection</h3>' /tmp/pmd-inline-modal-form.blade.php; then
  echo "REFUSED: technical connection card is still visible in inline modal"
  exit 1
fi

grep -q 'Open automatically for cash payments' /tmp/pmd-cash-drawer-simple-form.blade.php
grep -q 'Download Windows connector' /tmp/pmd-cash-drawer-simple-form.blade.php
grep -q 'Find printers' /tmp/pmd-cash-drawer-simple-form.blade.php
grep -q 'Test drawer' /tmp/pmd-cash-drawer-simple-form.blade.php

echo "OWNER_UI_CONTRACT=PASS"

echo
echo "== BACKUP =="
sudo cp -a "$INLINE" "${INLINE}.before-owner-simple-r1-${STAMP}.bak"
if [ -f "$PARTIAL" ]; then
  sudo cp -a "$PARTIAL" "${PARTIAL}.before-owner-simple-r1-${STAMP}.bak"
fi

INLINE_OWNER="$(stat -c '%U' "$INLINE")"
INLINE_GROUP="$(stat -c '%G' "$INLINE")"
INLINE_MODE="$(stat -c '%a' "$INLINE")"
PARTIAL_DIR="$(dirname "$PARTIAL")"

rollback() {
  echo "AUTOMATIC OWNER UI ROLLBACK"
  sudo cp -a "${INLINE}.before-owner-simple-r1-${STAMP}.bak" "$INLINE" || true
  if [ -f "${PARTIAL}.before-owner-simple-r1-${STAMP}.bak" ]; then
    sudo cp -a "${PARTIAL}.before-owner-simple-r1-${STAMP}.bak" "$PARTIAL" || true
  else
    sudo rm -f "$PARTIAL" || true
  fi
  php artisan view:clear >/dev/null 2>&1 || true
}
trap rollback ERR

echo
echo "== INSTALL VIEW-ONLY CHANGE =="
sudo install -o "$INLINE_OWNER" -g "$INLINE_GROUP" -m "$INLINE_MODE" /tmp/pmd-inline-modal-form.blade.php "$INLINE"
sudo install -o "$INLINE_OWNER" -g "$INLINE_GROUP" -m "$INLINE_MODE" /tmp/pmd-cash-drawer-simple-form.blade.php "$PARTIAL"
php artisan view:clear >/dev/null

echo
echo "== FINAL VERIFY =="
grep -n 'PMD_CASH_DRAWER_OWNER_SIMPLE_R1_INCLUDE' "$INLINE"
grep -n 'PMD_CASH_DRAWER_OWNER_SIMPLE_R1' "$PARTIAL"

HEAD_AFTER="$(git rev-parse HEAD)"
echo "HEAD_AFTER=$HEAD_AFTER"
echo "NO_DB_CHANGES=YES"
echo "NO_AGENT_CHANGES=YES"
echo "NO_PAYMENT_CHANGES=YES"

trap - ERR

echo "============================================================"
echo "PMD CASH DRAWER OWNER SIMPLE R1 DEPLOYED"
echo "============================================================"
echo "Hard-refresh /admin/pmddevices and reopen Edit cash drawer."
