#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PAYMOB_BRANCH:-origin/feature/paymob-oman-r1}"
AUDIT_TENANT="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="app/admin/assets/js/pmd-finance-market-r4.js"
BACKUP_DIR="/var/backups/paymydine/payment-finance-zero-text-r6-$STAMP"
TMP_FILE="/tmp/pmd-finance-market-r6-$STAMP.js"

cd "$APP_DIR"

echo "=== PMD PAYMENT FINANCE ZERO TEXT SWAP R6 ==="
echo "Branch: $BRANCH"
[ -n "$AUDIT_TENANT" ] && echo "Audit tenant: $AUDIT_TENANT"
echo

if [ ! -f app/admin/controllers/Pmdfinance.php ] || ! grep -q "PMD_FINANCE_MARKET_FIRST_PAINT_R5" app/admin/controllers/Pmdfinance.php; then
  echo "ERROR: Finance R5 server-first market render is missing." >&2
  exit 2
fi

git fetch origin feature/paymob-oman-r1
git show "$BRANCH:$TARGET" > "$TMP_FILE"

echo "--- JavaScript preflight ---"
grep -q "PMD_FINANCE_ZERO_TEXT_SWAP_R6" "$TMP_FILE"
grep -q "reload({render:false})" "$TMP_FILE"
grep -q "upgradeServerActions" "$TMP_FILE"
grep -q "version: '4.2.0'" "$TMP_FILE"
if command -v node >/dev/null 2>&1; then
  node --check "$TMP_FILE"
fi
echo "R6 JS invariant markers OK"

sudo mkdir -p "$BACKUP_DIR/$(dirname "$TARGET")"
if [ -e "$TARGET" ]; then
  sudo cp -a "$TARGET" "$BACKUP_DIR/$TARGET"
  OWNER="$(stat -c '%U' "$TARGET")"
  GROUP="$(stat -c '%G' "$TARGET")"
  MODE="$(stat -c '%a' "$TARGET")"
else
  OWNER="$(stat -c '%U' "$(dirname "$TARGET")")"
  GROUP="$(stat -c '%G' "$(dirname "$TARGET")")"
  MODE="644"
fi

sudo install -o "$OWNER" -g "$GROUP" -m "$MODE" "$TMP_FILE" "$TARGET"

echo
echo "--- Installed validation ---"
grep -n "PMD_FINANCE_ZERO_TEXT_SWAP_R6\|reload({render:false})\|version: '4.2.0'" "$TARGET"
if command -v node >/dev/null 2>&1; then
  node --check "$TARGET"
fi

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
echo "PAYMENT FINANCE ZERO TEXT SWAP R6 DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo "- Initial Finance market state fetch no longer replaces visible provider/method rows."
echo "- Initial visible copy remains the server-rendered market copy from R5."
echo "- Existing server Configure/Edit buttons are upgraded in-place without visible DOM changes."
echo "- User-triggered Save/Test may still render new state, as expected."

if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  if [ "$AUDIT_STATUS" -ne 0 ]; then
    echo "ERROR: market isolation audit failed for $AUDIT_TENANT" >&2
    exit 5
  fi
  echo "- Market isolation audit passed for: $AUDIT_TENANT"
fi
