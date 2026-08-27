#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PAYMOB_BRANCH:-origin/feature/paymob-oman-r1}"
AUDIT_TENANT="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/payment-finance-first-paint-r5-$STAMP"
TMP_DIR="/tmp/pmd-payment-finance-first-paint-r5-$STAMP"

FILES=(
  "app/admin/controllers/Pmdfinance.php"
  "app/admin/assets/css/pmd-finance-first-paint-r5.css"
  "app/admin/views/_meta/assets.json"
)

cd "$APP_DIR"

echo "=== PMD PAYMENT FINANCE FIRST PAINT R5 ==="
echo "Branch: $BRANCH"
if [ -n "$AUDIT_TENANT" ]; then
  echo "Audit tenant: $AUDIT_TENANT"
fi
echo

for required in \
  app/Services/Platform/LocationPlatformContext.php \
  app/Services/Platform/CountryPlatformProfileRegistry.php \
  app/admin/assets/css/pmd-finance-market-r4.css \
  app/admin/assets/js/pmd-finance-market-r4.js; do
  if [ ! -f "$required" ]; then
    echo "ERROR: required R4 foundation file is missing: $required" >&2
    exit 2
  fi
done

git fetch origin feature/paymob-oman-r1

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
sudo mkdir -p "$BACKUP_DIR"

for path in "${FILES[@]}"; do
  mkdir -p "$TMP_DIR/$(dirname "$path")"
  git show "$BRANCH:$path" > "$TMP_DIR/$path"
done

echo "--- PHP preflight ---"
php -l "$TMP_DIR/app/admin/controllers/Pmdfinance.php"

echo
echo "--- JSON preflight ---"
php -r '
$path=$argv[1];
try {
    json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    echo "JSON OK: {$path}\n";
} catch (Throwable $e) {
    fwrite(STDERR, "JSON FAILED: {$e->getMessage()}\n");
    exit(1);
}
' "$TMP_DIR/app/admin/views/_meta/assets.json"

echo
echo "--- R5 invariant markers ---"
grep -q "PMD_FINANCE_MARKET_FIRST_PAINT_R5" "$TMP_DIR/app/admin/controllers/Pmdfinance.php"
grep -q "LocationPlatformContext" "$TMP_DIR/app/admin/controllers/Pmdfinance.php"
grep -q "pmd-finance-market-om" "$TMP_DIR/app/admin/controllers/Pmdfinance.php"
grep -q "pmd-finance-first-paint-r5.css" "$TMP_DIR/app/admin/views/_meta/assets.json"
grep -q "pmd-settings-family-notif-slot-v18::before" "$TMP_DIR/app/admin/assets/css/pmd-finance-first-paint-r5.css"
grep -q "#pmd-finance-page #payment-providers" "$TMP_DIR/app/admin/assets/css/pmd-finance-first-paint-r5.css"
echo "R5 invariant markers OK"

echo
echo "--- Backup target files ---"
for path in "${FILES[@]}"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

echo
echo "--- Install R5 files ---"
for path in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$path")"

  if [ -e "$path" ]; then
    OWNER="$(stat -c '%U' "$path")"
    GROUP="$(stat -c '%G' "$path")"
    MODE="$(stat -c '%a' "$path")"
  else
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
echo "--- Installed validation ---"
php -l app/admin/controllers/Pmdfinance.php
php -r 'json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR); echo "Installed JSON OK\n";' app/admin/views/_meta/assets.json

echo
echo "--- Installed R5 wiring ---"
grep -n "PMD_FINANCE_MARKET_FIRST_PAINT_R5\|pmd-finance-market-om" app/admin/controllers/Pmdfinance.php | head -10
grep -n "pmd-finance-first-paint-r5" app/admin/views/_meta/assets.json
grep -n "NOTIFICATION\|notif-slot-v18\|payment-providers" app/admin/assets/css/pmd-finance-first-paint-r5.css | head -20

if [ -f artisan ]; then
  echo
echo "--- Clear Laravel/TastyIgniter caches ---"
  sudo php artisan optimize:clear || php artisan optimize:clear || true
fi

AUDIT_STATUS=0
if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  echo
echo "--- Re-check tenant market isolation ---"
  set +e
  php scripts/audit-location-market-r4.php "$AUDIT_TENANT"
  AUDIT_STATUS=$?
  set -e
fi

echo
echo "=============================================="
echo "PAYMENT FINANCE FIRST PAINT R5 DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo "- Finance initial HTML is location-market aware."
echo "- Oman no longer reserves the hidden Germany/global provider list during refresh."
echo "- Provider/method bodies stay visible while API state enriches readiness details."
echo "- Germany keeps its existing canonical payment runtime."
echo "- Germany-only Fiskaly section does not first-paint on Oman Finance."
echo "- Finance notification divider line is removed; the bell button remains."

if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  if [ "$AUDIT_STATUS" -ne 0 ]; then
    echo "ERROR: market isolation audit failed for $AUDIT_TENANT" >&2
    exit 5
  fi
  echo "- Market isolation audit passed for: $AUDIT_TENANT"
fi
