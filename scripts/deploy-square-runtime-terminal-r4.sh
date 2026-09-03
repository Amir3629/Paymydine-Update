#!/usr/bin/env bash
set -Eeuo pipefail

: "${SHA:?Set SHA to the exact Square branch commit before running this script.}"

ROOT="/var/www/paymydine"
V2="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$SHA"

NEW_FILES=(
  "app/Services/Payments/SquareRuntimeService.php"
  "app/Services/TerminalPayments/SquareTerminalProvider.php"
  "routes/square-runtime.php"
  "frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/SquareInlinePayment.tsx"
  "frontend/scripts/pmd-square-security-guard.sh"
  "scripts/pmd-square-runtime-terminal-r1.py"
  "scripts/pmd-square-runtime-terminal-r2.py"
  "scripts/pmd-square-runtime-terminal-r3.py"
  "scripts/pmd-square-runtime-terminal-r4.py"
)

PATCHED_FILES=(
  "app/admin/routes.php"
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/admin/models/Payments_model.php"
  "app/Services/Platform/CountryPlatformProfileRegistry.php"
  "app/admin/controllers/Pmdfinance.php"
  "app/admin/controllers/Payments.php"
  "app/Services/PmdTenantProductBaselineR1.php"
  "app/admin/models/Terminal_devices_model.php"
  "app/admin/controllers/TerminalDevices.php"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php"
  "frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx"
  "routes/qr-pay.php"
)

cd "$ROOT"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-square-r4-$STAMP"
mkdir -p "$BACKUP"

for rel in "${PATCHED_FILES[@]}" "${NEW_FILES[@]}"; do
  src="$ROOT/$rel"
  if [ -f "$src" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    sudo cp -a "$src" "$BACKUP/$rel"
  fi
done

ROLLED_BACK=0
rollback() {
  local status=$?
  trap - ERR
  if [ "$ROLLED_BACK" -eq 0 ]; then
    ROLLED_BACK=1
    echo
    echo "=========================================="
    echo "SQUARE R4 FAILED - RESTORING SOURCE"
    echo "=========================================="
    for rel in "${PATCHED_FILES[@]}" "${NEW_FILES[@]}"; do
      dst="$ROOT/$rel"
      saved="$BACKUP/$rel"
      if [ -f "$saved" ]; then
        sudo mkdir -p "$(dirname "$dst")"
        sudo cp -a "$saved" "$dst"
      else
        sudo rm -f "$dst"
      fi
    done
    echo "Rollback complete: $BACKUP"
    echo "PHP-FPM and PM2 were NOT restarted by this failed run."
  fi
  exit "$status"
}
trap rollback ERR

echo "=========================================="
echo "DOWNLOAD SQUARE R4 FILES"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
for rel in "${NEW_FILES[@]}"; do
  dst="$ROOT/$rel"
  sudo mkdir -p "$(dirname "$dst")"
  sudo curl --fail --location --silent --show-error "$BASE/$rel" -o "$dst"
  test -s "$dst"
done

python3 -m py_compile \
  "$ROOT/scripts/pmd-square-runtime-terminal-r1.py" \
  "$ROOT/scripts/pmd-square-runtime-terminal-r2.py" \
  "$ROOT/scripts/pmd-square-runtime-terminal-r3.py" \
  "$ROOT/scripts/pmd-square-runtime-terminal-r4.py"

echo "=========================================="
echo "APPLY SQUARE R4 PATCH CHAIN"
echo "=========================================="
sudo python3 "$ROOT/scripts/pmd-square-runtime-terminal-r4.py"

echo "=========================================="
echo "VERIFY REQUIRED MARKERS"
echo "=========================================="
grep -q "routes/square-runtime.php" "$ROOT/app/admin/routes.php"
grep -q "Sandbox Application ID" "$ROOT/app/admin/controllers/Pmdfinance.php"
grep -q "SQUARE_PAY_EXISTING_SERVER_VERIFIED_R1" "$ROOT/routes/qr-pay.php"
grep -q "SquareTerminalProvider" "$ROOT/app/Services/TerminalPayments/TerminalPaymentService.php"
grep -q "SquareInlinePayment" "$V2/src/runtime/components/RuntimeOverlays.tsx"
grep -q "square-r1.*order.orderId" "$V2/src/runtime/components/RuntimeOverlays.tsx"
test -s "$ROOT/app/Services/Payments/SquareRuntimeService.php"
test -s "$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"
test -s "$ROOT/routes/square-runtime.php"
test -s "$V2/src/runtime/components/SquareInlinePayment.tsx"

echo "=========================================="
echo "PHP LINT"
echo "=========================================="
PHP_FILES=(
  "app/Services/Payments/SquareRuntimeService.php"
  "app/Services/TerminalPayments/SquareTerminalProvider.php"
  "routes/square-runtime.php"
  "app/admin/routes.php"
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/admin/models/Payments_model.php"
  "app/Services/Platform/CountryPlatformProfileRegistry.php"
  "app/admin/controllers/Pmdfinance.php"
  "app/admin/controllers/Payments.php"
  "app/Services/PmdTenantProductBaselineR1.php"
  "app/admin/models/Terminal_devices_model.php"
  "app/admin/controllers/TerminalDevices.php"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php"
  "routes/qr-pay.php"
)
for rel in "${PHP_FILES[@]}"; do
  php -l "$ROOT/$rel"
done

echo "=========================================="
echo "SQUARE SECURITY GUARD"
echo "=========================================="
bash "$ROOT/frontend/scripts/pmd-square-security-guard.sh"

echo "=========================================="
echo "FRONTEND TYPECHECK + BUILD"
echo "=========================================="
cd "$V2"
npm run typecheck
npm run build

cd "$ROOT"
bash "$ROOT/frontend/scripts/pmd-square-security-guard.sh"

echo "=========================================="
echo "ALL SQUARE R4 VALIDATION PASSED"
echo "=========================================="

trap - ERR

sudo systemctl reload php8.3-fpm
pm2 restart paymydine-frontend-v2 --update-env
pm2 status

echo "=========================================="
echo "SQUARE R4 DEPLOYED"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
