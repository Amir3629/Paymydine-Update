#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
PAYMOB_BRANCH="${PAYMOB_BRANCH:-origin/feature/paymob-oman-r1}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="app/Services/Payments/PaymobApiClient.php"
TMP="/tmp/PaymobApiClient.${STAMP}.php"
BACKUP_DIR="/var/backups/paymydine/paymob-${STAMP}"

cd "$APP_DIR"

echo "=== PMD Paymob Oman R1-B API client deploy ==="

git fetch origin feature/paymob-oman-r1

git show "$PAYMOB_BRANCH:$TARGET" > "$TMP"
php -l "$TMP"

sudo mkdir -p "$BACKUP_DIR"
if [ -f "$TARGET" ]; then
  sudo cp -a "$TARGET" "$BACKUP_DIR/PaymobApiClient.php"
fi

sudo mkdir -p "$(dirname "$TARGET")"

OWNER="root"
GROUP="root"
MODE="0644"
if [ -f app/Services/Payments/ProviderCapabilityRegistry.php ]; then
  OWNER="$(stat -c '%U' app/Services/Payments/ProviderCapabilityRegistry.php)"
  GROUP="$(stat -c '%G' app/Services/Payments/ProviderCapabilityRegistry.php)"
  MODE="$(stat -c '%a' app/Services/Payments/ProviderCapabilityRegistry.php)"
fi

sudo install -o "$OWNER" -g "$GROUP" -m "$MODE" "$TMP" "$TARGET"
php -l "$TARGET"

if [ -f artisan ]; then
  php artisan optimize:clear || sudo -u "$OWNER" php artisan optimize:clear || true
fi

echo
echo "=== PAYMOB R1-B DEPLOYED ==="
echo "File: $TARGET"
echo "Backup: $BACKUP_DIR"
echo
grep -n "OMAN_BASE_URL\|function testConnection\|function createIntention\|function verifyTransactionPostHmac" "$TARGET" || true
