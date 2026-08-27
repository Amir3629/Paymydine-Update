#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PAYMOB_BRANCH:-origin/feature/paymob-oman-r1}"
AUDIT_TENANT="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/payment-market-r4-$STAMP"
TMP_DIR="/tmp/pmd-payment-market-r4-$STAMP"

FILES=(
  "app/Services/Payments/PaymobOmanConfigSchema.php"
  "app/admin/controllers/PaymentMarketSettings.php"
  "app/admin/controllers/PaymentProviders.php"
  "routes/terminal-payments.php"
  "app/admin/views/_meta/assets.json"
  "app/admin/assets/css/pmd-finance-market-r4.css"
  "app/admin/assets/js/pmd-finance-market-r4.js"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "scripts/audit-location-market-r4.php"
)

cd "$APP_DIR"

echo "=== PMD PAYMENT MARKET R4 ==="
echo "Branch: $BRANCH"
if [ -n "$AUDIT_TENANT" ]; then
  echo "Audit tenant: $AUDIT_TENANT"
fi
echo

# R4 is an incremental deploy on top of the successfully deployed R3 location
# platform. Fail before writes if that foundation is missing.
for required in \
  app/Services/Platform/CountryPlatformProfileRegistry.php \
  app/Services/Platform/LocationPlatformContext.php \
  app/Services/Platform/TenantPlatformProfileService.php \
  app/Services/Payments/PaymobOmanRuntimeService.php; do
  if [ ! -f "$required" ]; then
    echo "ERROR: R3 foundation file is missing: $required" >&2
    exit 2
  fi
done

git fetch origin feature/paymob-oman-r1

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
sudo mkdir -p "$BACKUP_DIR"

# Materialize exact branch files outside production first.
for path in "${FILES[@]}"; do
  mkdir -p "$TMP_DIR/$(dirname "$path")"
  git show "$BRANCH:$path" > "$TMP_DIR/$path"
done

echo "--- PHP preflight ---"
for path in \
  app/Services/Payments/PaymobOmanConfigSchema.php \
  app/admin/controllers/PaymentMarketSettings.php \
  app/admin/controllers/PaymentProviders.php \
  routes/terminal-payments.php \
  scripts/audit-location-market-r4.php; do
  php -l "$TMP_DIR/$path"
done

echo
echo "--- JSON preflight ---"
php -r '
$path=$argv[1];
try { json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR); echo "JSON OK: {$path}\n"; }
catch (Throwable $e) { fwrite(STDERR, "JSON FAILED: {$e->getMessage()}\n"); exit(1); }
' "$TMP_DIR/app/admin/views/_meta/assets.json"

if command -v node >/dev/null 2>&1; then
  echo
echo "--- JavaScript preflight ---"
  node --check "$TMP_DIR/app/admin/assets/js/pmd-finance-market-r4.js"
else
  echo
echo "--- JavaScript preflight ---"
  echo "node not installed; skipped node --check"
fi

echo
echo "--- R4 invariant markers ---"
grep -q "PAYMOB_GUEST_RUNTIME_READY = false" "$TMP_DIR/app/admin/controllers/PaymentMarketSettings.php"
grep -q "payment-market/state" "$TMP_DIR/routes/terminal-payments.php"
grep -q "pmd-finance-market-r4.js" "$TMP_DIR/app/admin/views/_meta/assets.json"
grep -q "pmd-finance-market-r4.css" "$TMP_DIR/app/admin/views/_meta/assets.json"
grep -q "pmd-finance-market-r4-ready" "$TMP_DIR/app/admin/assets/js/pmd-finance-market-r4.js"

# User-requested Superadmin cleanup must stay removed.
if grep -q "Terminal policy" "$TMP_DIR/app/admin/views/superadmin_r2/restaurants.blade.php"; then
  echo "ERROR: Superadmin still contains Terminal policy copy." >&2
  exit 3
fi
if grep -q "Country controls regional platform defaults" "$TMP_DIR/app/admin/views/superadmin_r2/restaurants.blade.php"; then
  echo "ERROR: Superadmin still contains removed market disclaimer." >&2
  exit 3
fi

echo "R4 invariant markers OK"

# Backup only files this deploy may replace.
echo
echo "--- Backup target files ---"
for path in "${FILES[@]}"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

# Selective install only: no pull/merge/reset/clean.
echo
echo "--- Install R4 files ---"
for path in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$path")"

  if [ -e "$path" ]; then
    OWNER="$(stat -c '%U' "$path")"
    GROUP="$(stat -c '%G' "$path")"
    MODE="$(stat -c '%a' "$path")"
  else
    # Match the application tree when possible rather than creating root-only
    # runtime assets/controllers.
    parent="$(dirname "$path")"
    if [ -e "$parent" ]; then
      OWNER="$(stat -c '%U' "$parent")"
      GROUP="$(stat -c '%G' "$parent")"
    else
      OWNER="root"
      GROUP="root"
    fi
    MODE="644"
  fi

  sudo install -o "$OWNER" -g "$GROUP" -m "$MODE" "$TMP_DIR/$path" "$path"
done

echo
echo "--- Installed PHP syntax ---"
for path in \
  app/Services/Payments/PaymobOmanConfigSchema.php \
  app/admin/controllers/PaymentMarketSettings.php \
  app/admin/controllers/PaymentProviders.php \
  routes/terminal-payments.php \
  scripts/audit-location-market-r4.php; do
  php -l "$path"
done

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-finance-market-r4.js
fi

echo
echo "--- Existing location platform selftest ---"
php scripts/location-platform-r3-selftest.php

echo
echo "--- R4 wiring ---"
grep -n "payment-market/" routes/terminal-payments.php
grep -n "LocationPlatformContext" app/admin/controllers/PaymentProviders.php | head -5
grep -n "PAYMOB_GUEST_RUNTIME_READY" app/admin/controllers/PaymentMarketSettings.php | head -10
grep -n "pmd-finance-market-r4" app/admin/views/_meta/assets.json

echo
echo "--- Superadmin copy removal ---"
if grep -n "Terminal policy\|Country controls regional platform defaults" app/admin/views/superadmin_r2/restaurants.blade.php; then
  echo "ERROR: removed Superadmin copy reappeared." >&2
  exit 4
else
  echo "Removed copy is absent."
fi

if [ -f artisan ]; then
  echo
echo "--- Clear Laravel/TastyIgniter caches ---"
  sudo php artisan optimize:clear || php artisan optimize:clear || true
fi

# Route list is diagnostic because this legacy application has mixed route
# registration styles. Source wiring above is the hard invariant.
if [ -f artisan ]; then
  echo
echo "--- Route diagnostics ---"
  (sudo php artisan route:list 2>/dev/null || php artisan route:list 2>/dev/null || true) \
    | grep -E "payment-market|payment-providers/state" \
    | head -20 || true
fi

AUDIT_STATUS=0
if [ -n "$AUDIT_TENANT" ]; then
  echo
echo "--- Tenant market audit (no secret values are printed) ---"
  set +e
  php scripts/audit-location-market-r4.php "$AUDIT_TENANT"
  AUDIT_STATUS=$?
  set -e
fi

echo
echo "=============================================="
echo "PAYMENT MARKET R4 DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo "- Oman Finance resolves only Oman provider/method catalogue."
echo "- Germany keeps its mature canonical payment runtime and market-filtered providers."
echo "- Paymob credentials are encrypted at rest when saved through the R4 admin bridge."
echo "- Paymob API connection can be tested without creating a payment."
echo "- Paymob guest offering is FAIL-CLOSED until checkout/callback settlement runtime is completed and sandbox-verified."
echo "- The requested Superadmin Terminal Policy/disclaimer copy is removed."

if [ -n "$AUDIT_TENANT" ]; then
  if [ "$AUDIT_STATUS" -eq 0 ]; then
    echo "- Market audit passed for: $AUDIT_TENANT"
  else
    echo "- WARNING: market audit needs review for: $AUDIT_TENANT (exit $AUDIT_STATUS)"
  fi
else
  echo "- Optional audit: php scripts/audit-location-market-r4.php omantest.paymydine.com"
fi
