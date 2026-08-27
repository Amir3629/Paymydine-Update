#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
PAYMOB_BRANCH="${PAYMOB_BRANCH:-origin/feature/paymob-oman-r1}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/paymob-r2-$STAMP"
TMP_DIR="/tmp/pmd-paymob-r2-$STAMP"

FILES=(
  "app/Services/Payments/PaymobApiClient.php"
  "app/Services/Payments/PaymentMarketRegistry.php"
  "app/Services/Payments/PaymentMarketContext.php"
  "app/Services/Payments/MoneyMinorUnitConverter.php"
  "app/Services/Payments/PaymobOmanConfigSchema.php"
  "app/Services/Payments/PaymobOmanConnectionService.php"
  "app/Services/Payments/PaymobOmanRuntimeService.php"
  "app/Services/Payments/PaymobOmanTenantCatalogService.php"
  "app/Services/TerminalPayments/PaymobOmanTerminalProvider.php"
  "docs/paymob-oman/BACKEND_R2.md"
)

cd "$APP_DIR"

echo "=== PMD Paymob Oman R2 backend deploy ==="
git fetch origin feature/paymob-oman-r1

mkdir -p "$TMP_DIR"
sudo mkdir -p "$BACKUP_DIR"

# Materialize the exact branch files in /tmp first. No production write yet.
for path in "${FILES[@]}"; do
  mkdir -p "$TMP_DIR/$(dirname "$path")"
  git show "$PAYMOB_BRANCH:$path" > "$TMP_DIR/$path"
done

# Syntax-check every PHP file before the first production write.
for path in "${FILES[@]}"; do
  case "$path" in
    *.php) php -l "$TMP_DIR/$path" ;;
  esac
done

# Back up only files this deploy may replace.
for path in "${FILES[@]}"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

# Install only the declared Paymob R2 files. Do not merge/reset/clean the live tree.
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

# Final syntax pass on the installed PHP files.
for path in "${FILES[@]}"; do
  case "$path" in
    *.php) php -l "$path" ;;
  esac
done

if [ -f artisan ]; then
  php artisan optimize:clear || sudo php artisan optimize:clear || true
fi

echo
echo "=== PAYMOB OMAN R2 BACKEND DEPLOYED ==="
echo "Backup: $BACKUP_DIR"
echo
echo "Regional methods:"
grep -n "METHOD_OM_\|OmanNet (Oman)\|Apple Pay (Oman)\|Google Pay (Oman)" \
  app/Services/Payments/PaymentMarketRegistry.php || true

echo
echo "OMR minor-unit rule:"
grep -n "'OMR' => 3" app/Services/Payments/MoneyMinorUnitConverter.php || true

echo
echo "Paymob API operations:"
grep -n "function createIntention\|function refundTransaction\|function voidTransaction\|function captureTransaction\|function retrieveTransaction\|function verifyTransactionPostHmac" \
  app/Services/Payments/PaymobApiClient.php || true

echo
echo "Terminal safety state:"
grep -n "remote_terminal_api\|pmd_terminal_runtime\|waiting_for_paymob_oman_ecr_terminal_contract" \
  app/Services/Payments/PaymentMarketRegistry.php || true

grep -n "fake terminal success is disabled\|remote terminal charging is disabled" \
  app/Services/TerminalPayments/PaymobOmanTerminalProvider.php || true

echo
echo "NOTE: This deploy installs backend code only. It does not seed a tenant catalogue, save credentials, enable Paymob, or create a payment."
