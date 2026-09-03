#!/usr/bin/env bash
set -Eeuo pipefail

: "${SHA:?Set SHA to the exact Square Canada R6 branch commit before running this script.}"

ROOT="/var/www/paymydine"
V2="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$SHA"

# Direct assets are downloaded from the exact reviewed branch head. Host files
# that may contain newer VPS hotfixes are patched in-place by the idempotent
# R4 -> repaired R5 -> R6 -> R6A -> R6B chain instead of being blindly replaced.
DOWNLOAD_FILES=(
  "app/Services/Payments/SquareRuntimeService.php"
  "app/Services/TerminalPayments/SquareTerminalProvider.php"
  "routes/square-runtime.php"
  "frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/SquareInlinePayment.tsx"
  "frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/SquareDirectMethodButton.tsx"
  "frontend/scripts/pmd-square-security-guard.sh"
  "frontend/scripts/pmd-square-canada-market-guard.sh"
  "scripts/pmd-square-runtime-terminal-r1.py"
  "scripts/pmd-square-runtime-terminal-r2.py"
  "scripts/pmd-square-runtime-terminal-r3.py"
  "scripts/pmd-square-runtime-terminal-r4.py"
  "scripts/pmd-square-ui-runtime-r5.py"
  "scripts/pmd-square-canada-market-r6.py"
  "scripts/pmd-square-canada-finance-r6a.py"
  "scripts/pmd-square-canada-terminal-market-r6b.py"
)

PATCHED_FILES=(
  "app/admin/routes.php"
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/admin/models/Payments_model.php"
  "app/Services/Platform/CountryPlatformProfileRegistry.php"
  "app/Services/Platform/TenantRegionalFoundationService.php"
  "app/Services/Platform/TenantPlatformProfileService.php"
  "app/admin/controllers/PaymentMarketSettings.php"
  "app/admin/controllers/Pmdfinance.php"
  "app/admin/controllers/Payments.php"
  "app/admin/assets/js/pmd-finance-market-r4.js"
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
BACKUP="$HOME/pmd-square-canada-r6-$STAMP"
mkdir -p "$BACKUP"

for rel in "${PATCHED_FILES[@]}" "${DOWNLOAD_FILES[@]}"; do
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
    echo "SQUARE CANADA R6 FAILED - RESTORING SOURCE"
    echo "=========================================="
    for rel in "${PATCHED_FILES[@]}" "${DOWNLOAD_FILES[@]}"; do
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
echo "DOWNLOAD SQUARE CANADA R6 FILES"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
for rel in "${DOWNLOAD_FILES[@]}"; do
  dst="$ROOT/$rel"
  sudo mkdir -p "$(dirname "$dst")"
  sudo curl --fail --location --silent --show-error "$BASE/$rel" -o "$dst"
  test -s "$dst"
done

python3 -m py_compile \
  "$ROOT/scripts/pmd-square-runtime-terminal-r1.py" \
  "$ROOT/scripts/pmd-square-runtime-terminal-r2.py" \
  "$ROOT/scripts/pmd-square-runtime-terminal-r3.py" \
  "$ROOT/scripts/pmd-square-runtime-terminal-r4.py" \
  "$ROOT/scripts/pmd-square-ui-runtime-r5.py" \
  "$ROOT/scripts/pmd-square-canada-market-r6.py" \
  "$ROOT/scripts/pmd-square-canada-finance-r6a.py" \
  "$ROOT/scripts/pmd-square-canada-terminal-market-r6b.py"

echo "=========================================="
echo "APPLY R4 -> REPAIRED R5 -> CANADA R6 -> FINANCE R6A -> TERMINALS R6B"
echo "=========================================="
sudo python3 "$ROOT/scripts/pmd-square-canada-market-r6.py"
sudo python3 "$ROOT/scripts/pmd-square-canada-finance-r6a.py"
sudo python3 "$ROOT/scripts/pmd-square-canada-terminal-market-r6b.py"

echo "=========================================="
echo "VERIFY CANADA SUPERADMIN MARKET"
echo "=========================================="
grep -n "public const CANADA = 'CA'" "$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"
grep -n "'country_name' => 'Canada'" "$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"
grep -n "'code' => 'CAD'" "$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"
grep -n "'timezone' => 'America/Toronto'" "$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"
grep -n "'ca_card'\|'ca_apple_pay'\|'ca_google_pay'\|'ca_cash'" "$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"

php -r '
require "vendor/autoload.php";
$p = new App\Services\Platform\CountryPlatformProfileRegistry();
$c = $p->requireProfile("Canada");
if (($c["country_code"] ?? null) !== "CA") { fwrite(STDERR, "Canada profile did not resolve to CA\n"); exit(1); }
if (($c["currency"]["code"] ?? null) !== "CAD") { fwrite(STDERR, "Canada profile did not resolve to CAD\n"); exit(1); }
if (($c["timezone"] ?? null) !== "America/Toronto") { fwrite(STDERR, "Canada timezone mismatch\n"); exit(1); }
$providers = array_keys((array)($c["payments"]["providers"] ?? []));
if ($providers !== ["square"]) { fwrite(STDERR, "Canada provider list must be Square only\n"); exit(1); }
$terminals = array_keys((array)($c["terminals"]["providers"] ?? []));
if ($terminals !== ["square"]) { fwrite(STDERR, "Canada terminal list must be Square only\n"); exit(1); }
if (!isset($p->countryOptions()["CA"])) { fwrite(STDERR, "Canada is missing from SuperAdmin countryOptions\n"); exit(1); }
echo "PASS: SuperAdmin registry resolves Canada -> CA / CAD / America/Toronto / Square only\n";
'

echo "=========================================="
echo "VERIFY CANADA PAYMENTS & FINANCE FIRST PAINT"
echo "=========================================="
grep -n "PMD_CANADA_FINANCE_FIRST_PAINT_R6" "$ROOT/app/admin/controllers/Pmdfinance.php"
grep -n "\$providerCodes = \['square'\]" "$ROOT/app/admin/controllers/Pmdfinance.php"
grep -n "Canada · CAD · America/Toronto · Square" "$ROOT/app/admin/assets/js/pmd-finance-market-r4.js"
node --check "$ROOT/app/admin/assets/js/pmd-finance-market-r4.js"

echo "=========================================="
echo "VERIFY TERMINAL MARKET ISOLATION"
echo "=========================================="
grep -n "PMD_TENANT_PLATFORM_FOREIGN_TERMINALS_DISABLED_R6B" "$ROOT/app/Services/Platform/TenantPlatformProfileService.php"
grep -n "PMD_TERMINAL_DEVICE_MARKET_OPTIONS_R6B" "$ROOT/app/admin/models/Terminal_devices_model.php"
grep -n "'square' => 'Square Terminal API'" "$ROOT/app/admin/models/Terminal_devices_model.php"

echo "=========================================="
echo "VERIFY SQUARE CANADA-ONLY RUNTIME"
echo "=========================================="
grep -n "PMD_SUPPORTED_COUNTRIES = \['CA'\]" "$ROOT/app/Services/Payments/SquareRuntimeService.php"
grep -n "Square is enabled in PayMyDine only for Canada" "$ROOT/app/Services/Payments/SquareRuntimeService.php" "$ROOT/app/admin/controllers/Payments.php"
grep -n "Square Terminal is enabled in PayMyDine only for Canada" "$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -n "Square Canada Terminal checkout currency must be CAD" "$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"

echo "=========================================="
echo "VERIFY REPAIRED R5 FRONTEND OWNERSHIP"
echo "=========================================="
grep -n "SquareDirectMethodButton" "$V2/src/runtime/components/RuntimeOverlays.tsx"
grep -n "isSquareSingleAction ? null" "$V2/src/runtime/components/RuntimeOverlays.tsx"
grep -n "selectedProvider === 'square' && selectedCode === 'card'" "$V2/src/runtime/components/RuntimeOverlays.tsx"
grep -n "data-pmd-square-direct-method" "$V2/src/runtime/components/SquareDirectMethodButton.tsx"
grep -n "payments.card({ style: PMD_SQUARE_CARD_STYLE })" "$V2/src/runtime/components/SquareInlinePayment.tsx"

echo "=========================================="
echo "PHP LINT"
echo "=========================================="
PHP_FILES=(
  "app/Services/Payments/SquareRuntimeService.php"
  "app/Services/TerminalPayments/SquareTerminalProvider.php"
  "routes/square-runtime.php"
  "app/Services/Platform/CountryPlatformProfileRegistry.php"
  "app/Services/Platform/TenantRegionalFoundationService.php"
  "app/Services/Platform/TenantPlatformProfileService.php"
  "app/admin/controllers/PaymentMarketSettings.php"
  "app/admin/controllers/Pmdfinance.php"
  "app/admin/controllers/Payments.php"
  "app/admin/models/Terminal_devices_model.php"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/admin/controllers/TerminalDevices.php"
  "routes/qr-pay.php"
)
for rel in "${PHP_FILES[@]}"; do
  php -l "$ROOT/$rel"
done

echo "=========================================="
echo "SQUARE SECURITY GUARDS"
echo "=========================================="
bash "$ROOT/frontend/scripts/pmd-square-security-guard.sh"
bash "$ROOT/frontend/scripts/pmd-square-canada-market-guard.sh"

echo "=========================================="
echo "FRONTEND TYPECHECK + BUILD"
echo "=========================================="
cd "$V2"
npm run typecheck
npm run build

cd "$ROOT"
bash "$ROOT/frontend/scripts/pmd-square-security-guard.sh"
bash "$ROOT/frontend/scripts/pmd-square-canada-market-guard.sh"

echo "=========================================="
echo "ALL SQUARE CANADA R6 VALIDATION PASSED"
echo "=========================================="

trap - ERR

sudo systemctl reload php8.3-fpm
pm2 restart paymydine-frontend-v2 --update-env
pm2 status

echo "=========================================="
echo "SQUARE CANADA R6 DEPLOYED"
echo "SHA: $SHA"
echo "BACKUP: $BACKUP"
echo "=========================================="
echo "NEXT: SuperAdmin > Restaurants > Create/Edit > Country = Canada"
echo "NEXT: use a Canadian Square Sandbox account/location (CA + CAD), not the default US/USD sandbox account"
