#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
SHA="${SHA:-}"

if [ -z "$SHA" ]; then
  echo "STOP: set SHA to the exact GitHub commit to deploy."
  exit 1
fi

BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$SHA"
PATCHER_REL="scripts/pmd-square-terminal-canada-r10.py"
PATCHER="/tmp/pmd-square-terminal-canada-r10.py"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-square-terminal-canada-r10-$STAMP"

TARGETS=(
  "app/admin/controllers/TerminalDevices.php"
  "app/admin/views/pmddevices/_inline_modal_form.blade.php"
  "app/admin/assets/js/pmd-device-inline-v6.js"
  "app/Services/TerminalPayments/SquareTerminalProvider.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
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
  echo "FAILED - RESTORING PRE-R10 SOURCE"
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
echo "DOWNLOAD SQUARE TERMINAL CANADA R10 PATCHER"
echo "SHA: $SHA"
echo "=========================================="
curl -fsSL "$BASE/$PATCHER_REL" -o "$PATCHER"
test -s "$PATCHER"
python3 -m py_compile "$PATCHER"

echo
echo "=========================================="
echo "APPLY R10"
echo "=========================================="
sudo python3 "$PATCHER"

for rel in "${TARGETS[@]}"; do
  sudo chown ubuntu:ubuntu "$ROOT/$rel"
done

echo
echo "=========================================="
echo "VERIFY R10 MARKERS"
echo "=========================================="
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_SIMULATORS" app/Services/TerminalPayments/SquareTerminalProvider.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_READ_ONLY_TEST" app/admin/controllers/TerminalDevices.php
grep -n "388b5a08-a77c-48ef-ad2a-4a790e6f2789" app/admin/controllers/TerminalDevices.php app/admin/views/pmddevices/_inline_modal_form.blade.php app/Services/TerminalPayments/SquareTerminalProvider.php
grep -n "data-pmd-terminal-sumup-only" app/admin/views/pmddevices/_inline_modal_form.blade.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_TEST_RESULT_SYNC" app/admin/assets/js/pmd-device-inline-v6.js
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_WAITER_ENDPOINT" app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_INVENTORY" app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_GUARD" app/Services/TerminalPayments/TerminalPaymentService.php
grep -n "PMD_SQUARE_TERMINAL_CANADA_R10_READINESS" app/admin/assets/js/pmd-waiter-pos-payment-v3.js

echo
echo "=========================================="
echo "PHP LINT"
echo "=========================================="
php -l app/admin/controllers/TerminalDevices.php
php -l app/Services/TerminalPayments/SquareTerminalProvider.php
php -l app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php
php -l app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php
php -l app/Services/TerminalPayments/TerminalPaymentService.php

echo
echo "=========================================="
echo "ADMIN JS SYNTAX"
echo "=========================================="
node --check app/admin/assets/js/pmd-device-inline-v6.js
node --check app/admin/assets/js/pmd-waiter-pos-payment-v3.js

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
echo "VERIFY NO SETTLEMENT WEAKENING"
echo "=========================================="
grep -n "verifyPayment(" app/Services/TerminalPayments/SquareTerminalProvider.php
grep -n "payment_ids" app/Services/TerminalPayments/SquareTerminalProvider.php
grep -n "reconciliation_required" app/Services/TerminalPayments/SquareTerminalProvider.php

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
echo "SQUARE TERMINAL CANADA R10 DEPLOYED"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
echo "R10 fixes the generic 500 path in Test terminal connection, removes the accidental Square affiliate-key field, uses Canada/CAD sandbox simulator IDs, and enables Square in the Waiter direct-terminal endpoint."
echo "NEXT: Canada > Settings > Devices > edit Square terminal > Discover / load devices > choose the first CAD success simulator > Test terminal connection > Save."
echo "NEXT E2E: create a small CAD order (for example CAD 10.00) in Waiter POS, choose Direct terminal > Square Sandbox Canada, then pay."
