#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COUNTRY="$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"
FOUNDATION="$ROOT/app/Services/Platform/TenantRegionalFoundationService.php"
TENANT_PROFILE="$ROOT/app/Services/Platform/TenantPlatformProfileService.php"
MARKET_SETTINGS="$ROOT/app/admin/controllers/PaymentMarketSettings.php"
RUNTIME="$ROOT/app/Services/Payments/SquareRuntimeService.php"
TERMINAL="$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"
PAYMENTS="$ROOT/app/admin/controllers/Payments.php"
OVERLAYS="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx"
DIRECT="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/SquareDirectMethodButton.tsx"

for f in "$COUNTRY" "$FOUNDATION" "$TENANT_PROFILE" "$MARKET_SETTINGS" "$RUNTIME" "$TERMINAL" "$PAYMENTS" "$OVERLAYS" "$DIRECT"; do
  test -s "$f" || { echo "[square-canada] missing: $f"; exit 1; }
done

grep -q "public const CANADA = 'CA'" "$COUNTRY"
grep -q "public const VERSION = '1.2.0'" "$COUNTRY"
grep -q "'country_name' => 'Canada'" "$COUNTRY"
grep -q "'code' => 'CAD'" "$COUNTRY"
grep -q "'timezone' => 'America/Toronto'" "$COUNTRY"
grep -q "'ca_card'" "$COUNTRY"
grep -q "'ca_apple_pay'" "$COUNTRY"
grep -q "'ca_google_pay'" "$COUNTRY"
grep -q "'ca_cash'" "$COUNTRY"

# Germany must not advertise Square after the Canada-only market split.
germany="$(sed -n "/self::GERMANY => \[/,/self::CANADA => \[/p" "$COUNTRY")"
if printf '%s\n' "$germany" | grep -q "'square' =>"; then
  echo "[square-canada] FAIL: Germany still advertises Square"
  exit 1
fi

# Canada payment provider catalogue must contain Square, and no other online provider.
canada="$(sed -n "/self::CANADA => \[/,/self::TURKEY => \[/p" "$COUNTRY")"
printf '%s\n' "$canada" | grep -q "'square' =>"
for provider in stripe worldline sumup vr_payment paymob; do
  if printf '%s\n' "$canada" | grep -q "'$provider' =>"; then
    echo "[square-canada] FAIL: Canada advertises non-Square provider: $provider"
    exit 1
  fi
done

grep -q "'currency_name' => 'Canadian Dollar'" "$FOUNDATION"
grep -q "'iso_numeric' => 124" "$FOUNDATION"
grep -q "PMD_TENANT_PLATFORM_FOREIGN_PAYMENTS_DISABLED_R6" "$TENANT_PROFILE"
grep -q "CountryPlatformProfileRegistry::CANADA" "$MARKET_SETTINGS"

grep -q "PMD_SUPPORTED_COUNTRIES = \['CA'\]" "$RUNTIME"
grep -q "Square is enabled in PayMyDine only for Canada (CA)." "$RUNTIME"
grep -q "Square Terminal is enabled in PayMyDine only for Canada (CA)." "$TERMINAL"
grep -q "Square Canada Terminal checkout currency must be CAD." "$TERMINAL"
grep -q "\$marketOk = \$restaurantCountry === 'CA' && \$squareCountry === 'CA';" "$PAYMENTS"

# R5 wallet ownership must be present: one method tile, no duplicate generic button.
grep -q "SquareDirectMethodButton" "$OVERLAYS"
grep -q "isSquareSingleAction ? null" "$OVERLAYS"
grep -q "data-pmd-square-direct-method" "$DIRECT"

# Square stays token-only in the frontend; secrets/raw card data cannot move into PMD browser code.
if grep -nE "test_access_token|live_access_token|access_token" "$DIRECT"; then
  echo "[square-canada] FAIL: Square access token referenced by direct wallet frontend"
  exit 1
fi

# Current Canada language rollout is intentionally English-only until a complete French pack exists.
printf '%s\n' "$canada" | grep -q "'eligible' => \['en'\]"

# No stale R5 admin variable can survive the Canada connection-test rewrite.
if grep -q '\$liveMarketOk' "$PAYMENTS"; then
  echo "[square-canada] FAIL: stale liveMarketOk variable remains in Payments.php"
  exit 1
fi

echo "[square-canada] PASS"