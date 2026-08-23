#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_pos_clean_v5_${STAMP}"
BACKUP="/var/backups/pmd_sumup_pos_clean_v5_${STAMP}"

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

git fetch origin sumup-terminal-e2e

echo "=========================================="
echo " PMD SUMUP POS CLEAN V5"
echo " CASH + TERMINAL STAFF FLOW"
echo "=========================================="
echo "REMOTE=$(git rev-parse "$REMOTE")"

FILES=(
  "app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
  "app/admin/assets/css/pmd-payment-simple-v1.css"
  "app/admin/views/_meta/assets.json"
)

for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  if [ -f "$f" ]; then
    sudo mkdir -p "$BACKUP/$(dirname "$f")"
    sudo cp "$f" "$BACKUP/$f"
  fi
  echo "STAGED: $f"
done

node --check "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
php -r '$j=json_decode(file_get_contents($argv[1]), true); if (!is_array($j)) { fwrite(STDERR, "Invalid assets JSON\n"); exit(2); } echo "ASSETS JSON OK\n";' \
  "$STAGE/app/admin/views/_meta/assets.json"

grep -q 'pmd-waiter-pos-payment-policy-v2.js' "$STAGE/app/admin/views/_meta/assets.json"
grep -q 'pmd-payment-simple-v1.css' "$STAGE/app/admin/views/_meta/assets.json"

echo
echo "========== INSTALL =========="
for f in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$ROOT/$f")"
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

echo
echo "========== SAFETY CHECK =========="
if grep -RniE 'mimoza\.paymydine\.com|database[^A-Za-z0-9_]+mimoza' \
  app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js \
  app/admin/assets/css/pmd-payment-simple-v1.css \
  >/tmp/pmd_sumup_pos_clean_v5_hardcode.txt 2>/dev/null; then
  echo "ERROR: tenant-specific hardcode detected"
  cat /tmp/pmd_sumup_pos_clean_v5_hardcode.txt
  exit 3
else
  echo "MULTI-TENANT UI CHECK OK"
fi

php artisan optimize:clear || true

echo
echo "=========================================="
echo " SUCCESS - SIMPLE PAYMENT UI LIVE"
echo " Waiter/Cashier: Cash + Terminal only"
echo " Multiple terminals remain selectable"
echo " Offline selected terminal blocks Charge"
echo "=========================================="
echo "BACKUP=$BACKUP"
