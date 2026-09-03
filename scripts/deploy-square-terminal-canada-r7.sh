#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
SHA="${SHA:-}"

if [ -z "$SHA" ]; then
  echo "STOP: set SHA to the exact GitHub commit to deploy."
  exit 1
fi

BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$SHA"
PATCHER_REL="scripts/pmd-square-terminal-canada-r7.py"
PATCHER="/tmp/pmd-square-terminal-canada-r7.py"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-square-terminal-canada-r7-$STAMP"

TARGETS=(
  "app/admin/requests/TerminalDevices.php"
  "app/admin/controllers/Pmddevices.php"
  "app/admin/views/pmddevices/index.blade.php"
  "app/admin/views/pmddevices/_inline_modal_form.blade.php"
  "app/admin/controllers/TerminalDevices.php"
  "app/admin/assets/js/pmd-device-inline-v6.js"
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
  echo "FAILED - RESTORING PRE-R7 SOURCE"
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
echo "DOWNLOAD SQUARE TERMINAL CANADA R7 PATCHER"
echo "SHA: $SHA"
echo "=========================================="
curl -fsSL "$BASE/$PATCHER_REL" -o "$PATCHER"
test -s "$PATCHER"
python3 -m py_compile "$PATCHER"

echo
echo "=========================================="
echo "APPLY R7"
echo "=========================================="
sudo python3 "$PATCHER"

# Keep the source tree editable by the deploy user after root-assisted patching.
for rel in "${TARGETS[@]}"; do
  sudo chown ubuntu:ubuntu "$ROOT/$rel"
done

echo
echo "=========================================="
echo "VERIFY R7 MARKERS"
echo "=========================================="
grep -n "PMD_SQUARE_TERMINAL_CANADA_R7_REQUEST" app/admin/requests/TerminalDevices.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R7_OVERVIEW" app/admin/controllers/Pmddevices.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R7_VIEW" app/admin/views/pmddevices/index.blade.php
grep -n "array_key_first(\$providerOptions)" app/admin/views/pmddevices/_inline_modal_form.blade.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY" app/admin/controllers/TerminalDevices.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY_AUTOFILL" app/admin/assets/js/pmd-device-inline-v6.js

echo
echo "=========================================="
echo "PHP LINT"
echo "=========================================="
php -l app/admin/requests/TerminalDevices.php
php -l app/admin/controllers/Pmddevices.php
php -l app/admin/controllers/TerminalDevices.php

echo
echo "=========================================="
echo "ADMIN JS SYNTAX"
echo "=========================================="
node --check app/admin/assets/js/pmd-device-inline-v6.js

echo
echo "=========================================="
echo "SQUARE SECURITY GUARDS"
echo "=========================================="
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
echo "SQUARE TERMINAL CANADA R7 DEPLOYED"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
echo "Canada Devices now shows Square Terminal API as the active market provider."
echo "Old SumUp rows remain archived in the database but are hidden from the Canada active view."
echo "For Sandbox: Add terminal -> Discover / load devices -> first simulator ID auto-fills -> Save -> Test terminal connection."
