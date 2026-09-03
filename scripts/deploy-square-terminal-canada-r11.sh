#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
SHA="${SHA:-}"

if [ -z "$SHA" ]; then
  echo "STOP: set SHA to the exact GitHub commit to deploy."
  exit 1
fi

BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$SHA"
PATCHER_REL="scripts/pmd-square-terminal-canada-r11.py"
PATCHER="/tmp/pmd-square-terminal-canada-r11.py"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-square-terminal-canada-r11-$STAMP"

TARGETS=(
  "app/admin/controllers/TerminalDevices.php"
  "app/admin/views/pmddevices/_inline_modal_form.blade.php"
)

cd "$ROOT"
mkdir -p "$BACKUP"

echo "=========================================="
echo "BACKUP CURRENT LIVE FILES"
echo "=========================================="
for rel in "${TARGETS[@]}"; do
  if [ ! -f "$ROOT/$rel" ]; then
    echo "STOP: missing live file: $rel"
    exit 1
  fi
  mkdir -p "$BACKUP/$(dirname "$rel")"
  sudo cp -a "$ROOT/$rel" "$BACKUP/$rel"
done

echo "Backup: $BACKUP"

rollback() {
  set +e
  echo
  echo "=========================================="
  echo "FAILED - RESTORING PRE-R11 SOURCE"
  echo "=========================================="
  for rel in "${TARGETS[@]}"; do
    if [ -f "$BACKUP/$rel" ]; then
      sudo cp -a "$BACKUP/$rel" "$ROOT/$rel"
    fi
  done
  echo "Rollback complete: $BACKUP"
  echo "PHP-FPM was NOT reloaded by the failed run."
}
trap rollback ERR

echo
echo "=========================================="
echo "DOWNLOAD SQUARE TERMINAL CANADA R11 PATCHER"
echo "SHA: $SHA"
echo "=========================================="
curl -fsSL "$BASE/$PATCHER_REL" -o "$PATCHER"
test -s "$PATCHER"
python3 -m py_compile "$PATCHER"

echo
echo "=========================================="
echo "APPLY R11"
echo "=========================================="
sudo python3 "$PATCHER"

for rel in "${TARGETS[@]}"; do
  sudo chown ubuntu:ubuntu "$ROOT/$rel"
done

echo
echo "=========================================="
echo "VERIFY R11 MARKERS"
echo "=========================================="
grep -n "PMD_SQUARE_TERMINAL_CANADA_R11_INLINE_RECORD_RESOLVER" app/admin/controllers/TerminalDevices.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R11_DISCOVERY_RECORD" app/admin/controllers/TerminalDevices.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R11_TEST_RECORD" app/admin/controllers/TerminalDevices.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R11_RECORD_ID" app/admin/views/pmddevices/_inline_modal_form.blade.php

echo
echo "=========================================="
echo "PHP LINT"
echo "=========================================="
php -l app/admin/controllers/TerminalDevices.php

echo
echo "=========================================="
echo "CONFIRM R10 SQUARE SAFETY STILL PRESENT"
echo "=========================================="
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_READ_ONLY_TEST" app/admin/controllers/TerminalDevices.php
grep -n "388b5a08-a77c-48ef-ad2a-4a790e6f2789" app/admin/controllers/TerminalDevices.php app/admin/views/pmddevices/_inline_modal_form.blade.php
if grep -q "Unable to load this terminal record for discovery\." app/admin/controllers/TerminalDevices.php; then
  echo "STOP: stale R10 discovery failure path remains"
  exit 1
fi
if grep -q "Unable to load this terminal record for testing\." app/admin/controllers/TerminalDevices.php; then
  echo "STOP: stale R10 test failure path remains"
  exit 1
fi

if [ -f frontend/scripts/pmd-square-security-guard.sh ]; then
  bash frontend/scripts/pmd-square-security-guard.sh
fi
if [ -f frontend/scripts/pmd-square-canada-market-guard.sh ]; then
  bash frontend/scripts/pmd-square-canada-market-guard.sh
fi

echo
echo "=========================================="
echo "CLEAR COMPILED VIEWS"
echo "=========================================="
if [ -f artisan ]; then
  php artisan view:clear >/dev/null 2>&1 || true
fi

echo
echo "=========================================="
echo "RELOAD PHP"
echo "=========================================="
sudo systemctl reload php8.3-fpm

trap - ERR

echo
echo "=========================================="
echo "SQUARE TERMINAL CANADA R11 DEPLOYED"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
echo "R11 fixes the 422 Discover/Test failure caused by custom inline handlers calling formGetModel() before FormController edit context is initialized."
echo "NEXT: hard refresh Canada > Settings > Devices, edit the Square terminal, click Discover / load devices, then Test terminal connection."
