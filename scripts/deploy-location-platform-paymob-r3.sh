#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PAYMOB_BRANCH:-origin/feature/paymob-oman-r1}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/location-platform-paymob-r3-$STAMP"
TMP_DIR="/tmp/pmd-location-platform-r3-$STAMP"

FILES=(
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/Services/Payments/PaymobApiClient.php"
  "app/Services/Payments/MoneyMinorUnitConverter.php"
  "app/Services/Payments/PaymobOmanConfigSchema.php"
  "app/Services/Payments/PaymobOmanConnectionService.php"
  "app/Services/Payments/PaymobOmanRuntimeService.php"
  "app/Services/Payments/PaymobOmanTenantCatalogService.php"
  "app/Services/Payments/PaymentMarketRegistry.php"
  "app/Services/Payments/PaymentMarketContext.php"
  "app/Services/TerminalPayments/PaymobOmanTerminalProvider.php"
  "app/Services/Platform/CountryPlatformProfileRegistry.php"
  "app/Services/Platform/LocationPlatformContext.php"
  "app/Services/Platform/TenantRegionalFoundationService.php"
  "app/Services/Platform/TenantRegionalPaymentCatalogService.php"
  "app/Services/Platform/TenantPlatformProfileService.php"
  "app/Services/Platform/SuperAdminTenantMarketService.php"
  "app/Http/Middleware/ApplySuperAdminTenantCountryProfile.php"
  "routes/pmd-superadmin-r2.php"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "docs/paymob-oman/INTEGRATION_R1.md"
  "docs/paymob-oman/BACKEND_R2.md"
  "docs/platform/LOCATION_COUNTRY_PLATFORM_R3.md"
  "scripts/location-platform-r3-selftest.php"
)

cd "$APP_DIR"

echo "=== PMD LOCATION PLATFORM + PAYMOB OMAN R3 ==="
echo "Branch: $BRANCH"
echo

git fetch origin feature/paymob-oman-r1

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
sudo mkdir -p "$BACKUP_DIR"

# ------------------------------------------------------------
# PREPARE: materialize exact branch files outside production.
# ------------------------------------------------------------
for path in "${FILES[@]}"; do
  mkdir -p "$TMP_DIR/$(dirname "$path")"
  git show "$BRANCH:$path" > "$TMP_DIR/$path"
done

# ------------------------------------------------------------
# PREFLIGHT: every PHP file must parse before first live write.
# Blade templates are not passed to php -l because Blade syntax is compiled.
# ------------------------------------------------------------
echo "--- PHP preflight ---"
for path in "${FILES[@]}"; do
  case "$path" in
    *.php)
      case "$path" in
        *.blade.php) ;;
        *) php -l "$TMP_DIR/$path" ;;
      esac
      ;;
  esac
done

# Run pure-code invariants from the staged R3 tree by temporarily pointing the
# selftest at production vendor/autoload while loading staged classes first is
# not reliable with Composer classmaps. The installed selftest runs after copy;
# preflight above guarantees PHP syntax before any write.

# ------------------------------------------------------------
# BACKUP: only files R3 may replace.
# ------------------------------------------------------------
echo
echo "--- Backup target files ---"
for path in "${FILES[@]}"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

# ------------------------------------------------------------
# INSTALL: selective files only. NO merge/reset/clean/pull.
# ------------------------------------------------------------
echo
echo "--- Install R3 files ---"
for path in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$path")"

  if [ -e "$path" ]; then
    OWNER="$(stat -c '%U' "$path")"
    GROUP="$(stat -c '%G' "$path")"
    MODE="$(stat -c '%a' "$path")"
  else
    OWNER="root"
    GROUP="root"
    MODE="644"
  fi

  sudo install -o "$OWNER" -g "$GROUP" -m "$MODE" "$TMP_DIR/$path" "$path"
done

# ------------------------------------------------------------
# VERIFY installed code.
# ------------------------------------------------------------
echo
echo "--- Installed PHP syntax ---"
for path in "${FILES[@]}"; do
  case "$path" in
    *.php)
      case "$path" in
        *.blade.php) ;;
        *) php -l "$path" ;;
      esac
      ;;
  esac
done

echo
echo "--- R3 selftest ---"
php scripts/location-platform-r3-selftest.php

echo
echo "--- Superadmin wiring ---"
grep -n "ApplySuperAdminTenantCountryProfile" routes/pmd-superadmin-r2.php
grep -n "Country / platform market\|data-pmd-market-preview" app/admin/views/superadmin_r2/restaurants.blade.php | head -12

echo
echo "--- Platform profile markers ---"
grep -n "Europe/Berlin\|Asia/Muscat\|OMR\|om_omannet\|om_apple_pay\|om_google_pay" \
  app/Services/Platform/CountryPlatformProfileRegistry.php | head -30

echo
echo "--- OMR foundation marker ---"
grep -n "Omani Rial\|iso_numeric.*512\|decimal_position.*3" \
  app/Services/Platform/TenantRegionalFoundationService.php

echo
echo "--- Terminal fail-closed marker ---"
grep -n "waiting_for_paymob_oman_ecr_terminal_contract\|pmd_remote_runtime.*false" \
  app/Services/Platform/CountryPlatformProfileRegistry.php | head -10

# Clear compiled/cache state using root first because this VPS has previously
# reported write permission issues for the ubuntu user.
if [ -f artisan ]; then
  echo
  echo "--- Clear Laravel/TastyIgniter caches ---"
  sudo php artisan optimize:clear || php artisan optimize:clear || true
fi

echo
echo "=============================================="
echo "LOCATION PLATFORM + PAYMOB OMAN R3 DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo
echo "IMPORTANT:"
echo "- Existing tenant countries were NOT bulk-changed by this deploy."
echo "- Open /superadmin/new and Create/Edit + Save a restaurant to apply its country profile."
echo "- Oman Save applies OM + Asia/Muscat + OMR(3) + regional method catalogue."
echo "- Arabic is eligible but is enabled only when a real Arabic language pack exists."
echo "- Paymob methods remain disabled until merchant credentials/Integration IDs are ready."
echo "- Paymob remote terminal charging remains blocked until Paymob supplies its ECR/Cloud Terminal contract."
